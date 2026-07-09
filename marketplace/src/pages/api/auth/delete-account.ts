import type { NextApiRequest, NextApiResponse } from 'next';
import { queryOne, transaction } from '@/lib/db-pool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionToken = req.cookies.valueskins_session;
    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const session = await queryOne(
      'SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = TRUE',
      [sessionToken]
    );

    if (!session) {
      return res.status(401).json({ error: 'Session invalid' });
    }

    const userId = session.user_id;

    // Queue for deletion with 30-day grace period (not immediate hard delete)
    const existing = await transaction(async (client) => {
      const check = await client.query(
        'SELECT * FROM deletion_queue WHERE user_id = $1',
        [userId]
      );

      if (check.rows.length === 0) {
        await client.query(
          `INSERT INTO deletion_queue (user_id, requested_at, deletion_deadline, status)
           VALUES ($1, NOW(), NOW() + INTERVAL '30 days', 'pending')`,
          [userId]
        );

        await client.query(
          'UPDATE auth_sessions SET is_active = FALSE WHERE user_id = $1',
          [userId]
        );

        await client.query(
          `INSERT INTO audit_logs (table_name, operation, user_id, new_values)
           VALUES ('users', 'DELETE_REQUESTED', $1, $2)`,
          [userId, JSON.stringify({ deletion_deadline: '30 days', source: 'auth/delete-account' })]
        );
      }

      return check.rows.length > 0;
    });

    // Clear session cookie
    res.setHeader('Set-Cookie', 'valueskins_session=; HttpOnly; Path=/; Max-Age=0');

    if (existing) {
      return res.status(409).json({ error: 'Deletion already requested' });
    }

    return res.status(200).json({
      success: true,
      message: 'Deletion scheduled. You have 30 days to cancel. Login again to cancel.',
      cancellation_link: '/account/cancel-deletion',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
}
