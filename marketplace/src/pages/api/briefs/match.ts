import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getAccountId } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getAccountId(req.headers.cookie || '');
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const briefId = req.query.briefId ? parseInt(req.query.briefId as string) : null;
  if (!briefId) return res.status(400).json({ error: 'briefId required' });

  try {
    const brief = await query('SELECT * FROM briefs WHERE id = $1 AND brand_id = $2', [briefId, userId]);
    if (!brief.rows[0]) return res.status(404).json({ error: 'Brief not found' });

    const b = brief.rows[0];
    const conditions: string[] = [`EXISTS (SELECT 1 FROM account_modules am WHERE am.user_id = u.id AND am.module_code = 'valueskin' AND am.is_active = true)`];
    const params: any[] = [];
    let p = 1;

    if (b.required_niches?.length > 0) {
      conditions.push(`(${b.required_niches.map((n: string) => `u.niche ILIKE $${p++}`).join(' OR ')})`);
      b.required_niches.forEach((n: string) => params.push(`%${n}%`));
    }

    if (b.required_platforms?.length > 0) {
      const platformCols = b.required_platforms.map((pl: string) => {
        const col = pl === 'twitter' ? 'twitter_handle' : pl === 'linkedin' ? 'linkedin_handle' : `${pl}_handle`;
        return `${col} IS NOT NULL AND ${col} != ''`;
      });
      conditions.push(`(${platformCols.join(' OR ')})`);
    }

    if (b.budget_range) {
      const min = parseInt(b.budget_range.replace(/[^0-9]/g, ''));
      if (!isNaN(min)) {
        conditions.push(`(u.min_deal_value IS NULL OR u.min_deal_value <= $${p++})`);
        params.push(min);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const results = await query(`
      SELECT u.id, u.display_name, u.username, u.avatar_url, u.bio, u.niche, u.location, u.country,
        u.followers_count, u.engagement_rate, u.min_deal_value,
        COALESCE(ur.deals_completed, 0) as deals_completed,
        COALESCE(cr.overall_score, 0) as algo_score, cr.reach_tier
      FROM users u
      LEFT JOIN user_reputation ur ON u.account_id = ur.account_id
      LEFT JOIN creator_ratings cr ON u.id = cr.user_id
      ${whereClause}
      ORDER BY cr.overall_score DESC NULLS LAST, u.followers_count DESC
      LIMIT 50`, params);

    return res.json({ brief: b, matches: results.rows });
  } catch (err: any) {
    console.error('Brief match error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
