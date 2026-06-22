import { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionToken = req.cookies.valueskins_session;
  const session = await queryOne('SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()', [sessionToken || '']);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user_id;

  const resolveBlockedId = async (body: any) => {
    if (body.blocked_id) return body.blocked_id;
    if (body.blocked_account_id) {
      const user = await queryOne('SELECT id FROM users WHERE account_id = $1', [body.blocked_account_id]);
      return user?.id || null;
    }
    return null;
  };

  const { method } = req;

  if (method === 'POST') {
    const blocked_id = await resolveBlockedId(req.body);
    const blocker_role = req.body.blocker_role || 'creator';
    if (!blocked_id) return res.status(400).json({ error: 'blocked_id or blocked_account_id required' });
    if (blocked_id === userId) return res.status(400).json({ error: 'Cannot block yourself' });

    try {
      await query(
        `INSERT INTO blocked_users (blocker_id, blocked_id, blocker_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [userId, blocked_id, blocker_role]
      );
      return res.status(200).json({ success: true });
    } catch { return res.status(500).json({ error: 'Failed to block user' }); }
  }

  if (method === 'DELETE') {
    const blocked_id = await resolveBlockedId(req.body);
    if (!blocked_id) return res.status(400).json({ error: 'blocked_id or blocked_account_id required' });

    try {
      await query('DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2', [userId, blocked_id]);
      return res.status(200).json({ success: true });
    } catch { return res.status(500).json({ error: 'Failed to unblock' }); }
  }

  if (method === 'GET') {
    try {
      const result = await query(
        `SELECT bu.blocked_id, u.display_name, u.username, u.avatar_url, bu.created_at, u.account_id
         FROM blocked_users bu JOIN users u ON u.id = bu.blocked_id
         WHERE bu.blocker_id = $1 ORDER BY bu.created_at DESC`,
        [userId]
      );
      return res.status(200).json({ blocked: result.rows });
    } catch { return res.status(500).json({ error: 'Failed to fetch blocked users' }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
