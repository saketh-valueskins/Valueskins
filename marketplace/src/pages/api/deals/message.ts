import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { setupCors } from '@/lib/cors';
import { query, transaction } from '@/lib/db-pool';
import { computeMessageHash } from '@/lib/proof-signing';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sessionToken = req.cookies.valueskins_session;
    if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });

    const { dealId, message } = req.body;
    if (!dealId || !message) return res.status(400).json({ error: 'Missing fields' });

    const session = await query(
      'SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = TRUE',
      [sessionToken]
    );
    if (!session.rows[0]) return res.status(401).json({ error: 'Session expired' });
    const userId = session.rows[0].user_id;

    // Validate message length
    if (message.length > 10000) return res.status(400).json({ error: 'Message too long (max 10000 chars)' });
    if (message.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty' });

    let newMsgId: string | null = null;

    // Single transaction: advisory lock prevents race conditions on hash chain per-deal
    await transaction(async (client) => {
      // Advisory lock — serializes hash chain operations for this deal
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [dealId]);

      const insertResult = await client.query(
        `INSERT INTO deal_messages (deal_id, sender_id, message, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, created_at`,
        [dealId, userId, message]
      );

      newMsgId = insertResult.rows[0]?.id;
      const createdAt = insertResult.rows[0]?.created_at?.toISOString?.() || new Date().toISOString();

      // Hash chain
      const lastMsg = await client.query(
        `SELECT hash FROM deal_messages WHERE deal_id = $1 AND id != $2 ORDER BY created_at DESC LIMIT 1`,
        [dealId, newMsgId]
      );
      const prevHash: string | null = lastMsg.rows[0]?.hash || null;
      const hash = computeMessageHash(prevHash, newMsgId, userId, message, createdAt);

      let walPosition: string | null = null;
      try {
        const walResult = await client.query(`SELECT pg_current_wal_lsn() AS wal_pos`);
        walPosition = walResult.rows[0]?.wal_pos || null;
      } catch {
        // WAL position may not be available (e.g. read replica)
      }

      await client.query(
        `UPDATE deal_messages SET prev_hash = $1, hash = $2, wal_position = $3 WHERE id = $4`,
        [prevHash, hash, walPosition, newMsgId]
      );
    });

    // Recording consent (fire-and-forget, no need to block message delivery)
    if (newMsgId) {
      try {
        const existing = await query(
          `SELECT id FROM user_consents WHERE user_id = $1 AND consent_type = 'deal_recording'`,
          [userId]
        );
        if (!existing.rows[0]) {
          await query(
            `INSERT INTO user_consents (user_id, consent_type, granted, version, ip_address)
             VALUES ($1, 'deal_recording', TRUE, '1.0', $2)
             ON CONFLICT (user_id, consent_type) DO NOTHING`,
            [userId, req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown']
          );
        }
      } catch {
        // Non-fatal
      }
    }

    return res.status(200).json({ success: true, messageId: newMsgId });
  } catch (error) {
    console.error('Message error:', error);
    return res.status(500).json({ error: 'Failed' });
  }
}

export default withApiHandler(handler, {
  rateLimit: { maxRequests: 60, windowMs: 60_000 },
});
