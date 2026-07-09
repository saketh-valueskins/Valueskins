import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { setupCors } from '@/lib/cors';
import { queryOne, transaction } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sessionToken = req.cookies.valueskins_session;
    if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });

    const session = await queryOne(
      'SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = TRUE AND expires_at > NOW()',
      [sessionToken]
    );
    if (!session) return res.status(401).json({ error: 'Session expired' });

    const userId = session.user_id;

    await transaction(async (client) => {
      const existing = await client.query(
        `SELECT id FROM deletion_queue
         WHERE user_id = $1 AND status = 'pending' AND cancelled_at IS NULL`,
        [userId]
      );

      if (existing.rows.length === 0) {
        throw new Error('No pending deletion request found');
      }

      await client.query(
        `UPDATE deletion_queue
         SET status = 'cancelled', cancelled_at = NOW()
         WHERE user_id = $1 AND status = 'pending'`,
        [userId]
      );

      await client.query(
        `INSERT INTO audit_logs (table_name, operation, user_id, new_values)
         VALUES ('users', 'DELETE_CANCELLED', $1, $2)`,
        [userId, JSON.stringify({ action: 'deletion_cancelled_by_user' })]
      );
    });

    return res.status(200).json({
      success: true,
      message: 'Deletion request cancelled. Your account is safe.',
    });
  } catch (error: any) {
    if (error.message === 'No pending deletion request found') {
      return res.status(404).json({ error: 'No pending deletion request found' });
    }
    console.error('Cancel deletion error:', error);
    return res.status(500).json({ error: 'Failed to cancel deletion' });
  }
}

export default withApiHandler(handler, {
  allowedMethods: ['POST'],
  rateLimit: { maxRequests: 5, windowMs: 24 * 60 * 60 * 1000 },
});
