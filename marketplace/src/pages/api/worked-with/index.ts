import { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionToken = req.cookies.valueskins_session;
  const session = await queryOne('SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()', [sessionToken || '']);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user_id;

  if (req.method === 'GET') {
    const { role } = req.query;
    if (role === 'brand') {
      try {
        const result = await query(
          `SELECT ww.creator_id, u.display_name, u.username, u.avatar_url, ww.deal_id, ww.completed_at
           FROM worked_with ww JOIN users u ON u.id = ww.creator_id
           WHERE ww.brand_id = $1 ORDER BY ww.completed_at DESC`,
          [userId]
        );
        return res.status(200).json({ workedWith: result.rows });
      } catch { return res.status(500).json({ error: 'Failed to fetch' }); }
    }

    if (role === 'creator') {
      try {
        const result = await query(
          `SELECT ww.brand_id, u.display_name, u.username, u.avatar_url, ww.deal_id, ww.completed_at
           FROM worked_with ww JOIN users u ON u.id = ww.brand_id
           WHERE ww.creator_id = $1 ORDER BY ww.completed_at DESC`,
          [userId]
        );
        return res.status(200).json({ workedWith: result.rows });
      } catch { return res.status(500).json({ error: 'Failed to fetch' }); }
    }

    return res.status(400).json({ error: 'role query param required (brand or creator)' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
