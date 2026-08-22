import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';

/**
 * PUT /api/notifications/[id]/read
 * Mark notification as read
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookie = req.headers.cookie || '';
    const userId = await getSessionUserId(cookie);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    const result = await query(
      `UPDATE notifications SET read = true WHERE id = $1 AND creator_id = $2 RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}
