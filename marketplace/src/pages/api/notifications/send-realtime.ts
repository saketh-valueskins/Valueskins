import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/notifications/send-realtime
 * Send real-time notification via Render WebSocket
 * Broadcasts to connected WebSocket clients via Render backend
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { creatorId, notification } = req.body;

    if (!creatorId || !notification) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send notification via Render WebSocket
    // Backend Rust server broadcasts to all connected clients in creator's room
    try {
      const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      await fetch(`${wsUrl}/api/notifications/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: creatorId,
          event: 'notification',
          data: notification,
        }),
      });
    } catch (wsError) {
      console.warn('WebSocket broadcast failed, continuing:', wsError);
    }

    // Log the notification
    console.log(`[Realtime Notification] Creator ${creatorId}: ${notification.dealTitle} from ${notification.brandName}`);

    return res.status(200).json({
      success: true,
      message: 'Notification sent',
      creatorId,
      dealId: notification.dealId,
    });
  } catch (err: any) {
    console.error('Error sending realtime notification:', err);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
