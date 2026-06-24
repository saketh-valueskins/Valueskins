import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { setupCors } from '@/lib/cors';
import { creatorCache } from '@/lib/cache';

const CACHE_TTL = 30_000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const forceRefresh = req.query.refresh === 'true';
  const cacheKey = 'all_creators';

  if (!forceRefresh) {
    const cached = creatorCache.get(cacheKey);
    if (cached) return res.status(200).json({ creators: cached, cached: true });
  }

  try {
    const creators = await query(`
      SELECT DISTINCT ON (u.id)
        u.id,
        u.display_name as name,
        u.username as handle,
        COALESCE(uvs.value_skin, uv.profession, u.niche, 'Creator') as value_skin,
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
      LEFT JOIN user_value_skins uvs ON uvs.user_id = u.id
      LEFT JOIN user_valueskins uv ON uv.user_id = u.id
      WHERE u.is_deleted = FALSE
        AND (uvs.id IS NOT NULL OR uv.id IS NOT NULL)
      ORDER BY u.id, COALESCE(uvs.value_skin, uv.profession, u.niche, 'Creator')
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

    creatorCache.set(cacheKey, mapped, CACHE_TTL);

    return res.status(200).json({ creators: mapped, cached: false });
  } catch (error) {
    console.error('Failed to fetch all creators:', error);
    return res.status(500).json({ error: 'Failed to fetch creators' });
  }
}
