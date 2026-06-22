import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getAccountId } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getAccountId(req.headers.cookie || '');
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const r = await query(
      `SELECT DISTINCT d.creator_id, a.display_name as creator_name, a.username as creator_username,
        a.avatar_url as creator_avatar, d.title as last_deal_title, d.updated_at as last_interaction
       FROM deals d
       JOIN accounts a ON d.creator_id = a.id
       WHERE d.brand_id = $1 AND d.deal_state = 'completed'
       ORDER BY d.updated_at DESC`,
      [userId]
    );

    return res.json({ pastCreators: r.rows });
  } catch (err: any) {
    console.error('Past creators error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
