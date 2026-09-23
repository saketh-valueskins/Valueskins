import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { setupCors } from '@/lib/cors';
import { query } from '@/lib/db-pool';
import { requireUser } from '@/lib/auth/require-user';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sessionUserId = await requireUser(req, res);
    if (!sessionUserId) return;

    const { notificationId } = req.body;
    if (!notificationId) return res.status(400).json({ error: 'Notification ID required' });

    await query(
      'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2',
      [notificationId, sessionUserId]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
}

export default withApiHandler(handler);
