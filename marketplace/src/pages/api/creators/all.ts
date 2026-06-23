import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { setupCors } from '@/lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const creators = await query(`
      SELECT DISTINCT ON (u.id)
        u.id,
        u.display_name as name,
        u.username as handle,
        uv.value_skin as value_skin,
        u.followers_count,
        u.engagement_rate,
        u.min_deal_value as rate,
        u.location,
        u.country,
        u.bio,
        u.response_time,
        u.availability,
        u.niche,
        u.languages
      FROM users u
      JOIN user_value_skins uv ON uv.user_id = u.id
      WHERE u.is_deleted = FALSE
      ORDER BY u.id, uv.value_skin
      LIMIT 500
    `);

    const mapped = creators.rows.map((c: any) => ({
      name: c.name || 'Creator',
      handle: c.handle || `creator${c.id}`,
      valueSkin: c.value_skin || 'Creator',
      followers: c.followers_count?.toString() || '0',
      engagement: c.engagement_rate?.toString() || '0',
      rate: c.rate?.toString() || '0',
      niche: c.niche || '',
      country: c.country || '',
      audienceLocation: c.location || c.country || '',
      responseTimeHrs: c.response_time ? parseInt(c.response_time) : undefined,
      languages: c.languages ? (typeof c.languages === 'string' ? JSON.parse(c.languages) : c.languages) : undefined,
    }));

    return res.status(200).json({ creators: mapped });
  } catch (error) {
    console.error('Failed to fetch all creators:', error);
    return res.status(500).json({ error: 'Failed to fetch creators' });
  }
}
