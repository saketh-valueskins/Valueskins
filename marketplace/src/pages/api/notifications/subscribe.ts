import { NextApiRequest, NextApiResponse } from 'next';
import { setupCors } from '@/lib/cors';
import { query, queryOne } from '@/lib/db-pool';
import { getAccountId } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;

  try {
    const userId = await getAccountId(req.headers.cookie || '');

    if (req.method === 'POST') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { subscription } = req.body;
      if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });

      await query(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = NOW()`,
        [userId, subscription.endpoint, subscription.keys?.p256dh || '', subscription.keys?.auth || '']
      );

      return res.status(200).json({ subscribed: true });
    }

    if (req.method === 'DELETE') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { endpoint } = req.body;
      if (endpoint) {
        await query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [endpoint, userId]);
      } else {
        await query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
      }
      return res.status(200).json({ unsubscribed: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed' });
  }
}
