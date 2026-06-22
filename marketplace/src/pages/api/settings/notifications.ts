import { NextApiRequest, NextApiResponse } from 'next';
import { setupCors } from '@/lib/cors';
import { query, queryOne } from '@/lib/db-pool';
import { getAccountId } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = await getAccountId(req.headers.cookie || '');
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      await query(
        `INSERT INTO user_email_preferences (user_id, marketing, notifications, product_updates)
         VALUES ($1, FALSE, TRUE, TRUE)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      const prefs = await queryOne(
        'SELECT marketing, notifications, product_updates, updated_at FROM user_email_preferences WHERE user_id = $1',
        [userId]
      );

      return res.status(200).json({
        preferences: prefs || { marketing: false, notifications: true, product_updates: true },
      });
    }

    const { marketing, notifications, product_updates } = req.body;

    await query(
      `INSERT INTO user_email_preferences (user_id, marketing, notifications, product_updates, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         marketing = COALESCE($2, user_email_preferences.marketing),
         notifications = COALESCE($3, user_email_preferences.notifications),
         product_updates = COALESCE($4, user_email_preferences.product_updates),
         updated_at = NOW()`,
      [userId,
       marketing !== undefined ? marketing : null,
       notifications !== undefined ? notifications : null,
       product_updates !== undefined ? product_updates : null]
    );

    return res.status(200).json({ updated: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed' });
  }
}
