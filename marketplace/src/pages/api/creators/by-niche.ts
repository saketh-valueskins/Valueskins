import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * POST /api/creators/by-niche
 * Get all creators with a specific niche/profession
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { niche } = req.body;

    if (!niche) {
      return res.status(400).json({ error: 'Niche is required' });
    }

    const result = await query(
      `SELECT id, display_name, niche FROM users
       WHERE role = 'creator'
       AND (niche = $1 OR niche ILIKE $2)
       AND is_active = true
       ORDER BY created_at DESC`,
      [niche, `%${niche}%`]
    );

    return res.status(200).json({
      niche,
      creators: result.rows || [],
      count: result.rows?.length || 0,
    });
  } catch (err: any) {
    console.error('Error fetching creators by niche:', err);
    return res.status(500).json({ error: 'Failed to fetch creators' });
  }
}
