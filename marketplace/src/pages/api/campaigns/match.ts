import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getAccountId } from '@/lib/session';
import { autoMatchCreators, type AutoMatchResult } from '@/lib/autoMatch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getAccountId(req.headers.cookie || '');
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : null;
  if (!campaignId) return res.status(400).json({ error: 'campaignId required' });

  try {
    const campaign = await query('SELECT * FROM campaigns WHERE id = $1 AND brand_id = $2', [campaignId, userId]);
    if (!campaign.rows[0]) return res.status(404).json({ error: 'Campaign not found' });

    const c = campaign.rows[0];
    const requiredProfessions: string[] = [];
    if (c.required_niches) {
      try {
        const niches = typeof c.required_niches === 'string' ? JSON.parse(c.required_niches) : c.required_niches;
        if (Array.isArray(niches)) requiredProfessions.push(...niches);
      } catch {}
    }

    const creators = await query(`
      SELECT u.id, u.display_name as name, u.username as handle, u.niche as value_skin,
        u.followers_count, u.engagement_rate, u.min_deal_value as rate,
        u.location, u.country, u.bio
      FROM users u
      WHERE EXISTS (SELECT 1 FROM account_modules am WHERE am.user_id = u.id AND am.module_code = 'valueskin' AND am.is_active = true)
        AND u.id != $1
      LIMIT 200
    `, [userId]);

    const autoMatchInput = {
      id: c.id,
      title: c.title,
      description: c.description || '',
      budget: Number(c.budget_per_creator) || 0,
      deadline: c.deadline ? new Date(c.deadline).toISOString() : '',
      requiredProfessions: requiredProfessions.length > 0 ? requiredProfessions : ['Creator'],
      compensationType: 'paid',
      status: 'open' as const,
    };

    const creatorInputs = creators.rows.map((cr: any) => ({
      name: cr.name || `Creator-${cr.id}`,
      handle: cr.handle || `creator${cr.id}`,
      valueSkin: cr.value_skin || 'Creator',
      followers: cr.followers_count?.toString() || '0',
      engagement: cr.engagement_rate?.toString() || '0',
      rate: cr.rate?.toString() || '0',
      niche: cr.niche || '',
      audienceLocation: cr.location || cr.country || '',
    }));

    const matched = autoMatchCreators(autoMatchInput, creatorInputs);

    const enriched = matched.map((m: AutoMatchResult) => {
      const creator = creators.rows.find((cr: any) =>
        (cr.handle === m.creatorHandle) || (cr.name === m.creatorName)
      );
      return {
        ...m,
        creator_id: creator?.id || null,
        handle: m.creatorHandle,
        avatar_url: null,
      };
    });

    return res.json({
      campaign: c,
      matches: enriched,
      total_matches: enriched.length,
    });
  } catch (err: any) {
    console.error('Campaign match error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
