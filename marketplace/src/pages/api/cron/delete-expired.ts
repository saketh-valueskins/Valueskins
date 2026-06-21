import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { query } from '@/lib/db-pool';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not set — delete-expired cron disabled');
    return res.status(500).json({ error: 'Cron not configured' });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  console.log(`[delete-expired cron] triggered from ${ip} at ${new Date().toISOString()}`);

  try {
    const deleted: Record<string, number> = {};

    // 1. Process deletion_queue: delete users whose deadline has passed
    const expiredDeletions = await query(
      `SELECT user_id FROM deletion_queue
       WHERE deletion_deadline <= NOW() AND status = 'pending'`
    );

    for (const row of expiredDeletions.rows) {
      const uid = row.user_id;
      await query('BEGIN');

      try {
        await query('DELETE FROM deal_messages WHERE sender_id = $1', [uid]);

        await query('DELETE FROM notifications WHERE user_id = $1', [uid]);

        await query('DELETE FROM user_consents WHERE user_id = $1', [uid]);

        await query('UPDATE audit_logs SET user_id = NULL WHERE user_id = $1', [uid]);

        await query('DELETE FROM auth_sessions WHERE user_id = $1', [uid]);

        await query('DELETE FROM users WHERE id = $1', [uid]);

        await query(
          `UPDATE deletion_queue SET status = 'completed', completed_at = NOW() WHERE user_id = $1`,
          [uid]
        );

        await query('COMMIT');
        deleted.users = (deleted.users || 0) + 1;
      } catch (err) {
        await query('ROLLBACK');
        console.error(`[delete-expired cron] Failed to delete user ${uid}:`, err);
      }
    }

    // 2. Anonymize audit_logs older than 90 days (remove PII from old_values / new_values)
    const anonymizedAudit = await query(
      `UPDATE audit_logs
       SET old_values = '{}'::jsonb, new_values = '{}'::jsonb
       WHERE created_at < NOW() - INTERVAL '90 days'
         AND (old_values != '{}'::jsonb OR new_values != '{}'::jsonb)`
    );
    deleted.anonymizedAuditLogs = anonymizedAudit.rowCount || 0;

    // 3. Clean up completed deletion_queue entries older than 90 days
    const cleanedQueue = await query(
      `DELETE FROM deletion_queue
       WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '90 days'`
    );
    deleted.cleanedQueueEntries = cleanedQueue.rowCount || 0;

    return res.status(200).json({
      success: true,
      deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[delete-expired cron] Error:', error);
    return res.status(500).json({ error: error.message || 'Cron failed' });
  }
}

export default withApiHandler(handler);
