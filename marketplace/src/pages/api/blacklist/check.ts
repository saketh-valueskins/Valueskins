import { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sessionToken = req.cookies.valueskins_session;
  const session = await queryOne('SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()', [sessionToken || '']);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const blockerId = session.user_id;

  const { user_id, account_id } = req.query;
  let targetUserId = user_id as string;
  if (account_id && !user_id) {
    const user = await queryOne('SELECT id FROM users WHERE account_id = $1', [account_id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    targetUserId = user.id;
  }
  if (!targetUserId) return res.status(400).json({ error: 'user_id or account_id required' });

  try {
    const blocked = await queryOne(
      'SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, targetUserId]
    );
    return res.status(200).json({ blocked: !!blocked });
  } catch { return res.status(500).json({ error: 'Failed' }); }
}
