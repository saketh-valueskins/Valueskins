import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for logged-in user
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookie = req.headers.cookie || '';
    const userId = await getSessionUserId(cookie);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE creator_id = $1 AND read = false`,
      [userId]
    );

    const count = parseInt(result.rows[0]?.count || '0');

    return res.status(200).json({ count, userId });
  } catch (err: any) {
    console.error('Error fetching unread count:', err);
    return res.status(500).json({ error: 'Failed to fetch unread count' });
  }
}
