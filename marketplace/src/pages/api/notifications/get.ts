import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { setupCors } from '@/lib/cors';
import { query } from '@/lib/db-pool';
import { requireUser } from '@/lib/auth/require-user';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sessionUserId = await requireUser(req, res);
    if (!sessionUserId) return;

    // Always the session user's notifications; a ?userId= param is ignored.
    const userId = sessionUserId;
    const { unreadOnly = false } = req.query;

    let sql = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: any[] = [userId];

    if (unreadOnly === 'true') {
      sql += ' AND read_at IS NULL';
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';

    const result = await query(sql, params);
    return res.status(200).json({ notifications: result.rows });
  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
}

export default withApiHandler(handler);
