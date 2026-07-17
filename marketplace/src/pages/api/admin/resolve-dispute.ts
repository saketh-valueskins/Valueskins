import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db-pool';
import { verifyAdminSession } from './login';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin session
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_session=([^;]+)/);
  const sessionToken = match ? match[1] : '';

  const isValidSession = await verifyAdminSession(sessionToken);
  if (!isValidSession) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { disputeId, dealId, resolution, notes, payoutAdjustmentPct } = req.body;

    if (!disputeId || !dealId || !resolution || !notes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Start transaction
    const client = await query('BEGIN');

    try {
      // Update dispute status
      const resolutionStatus =
        resolution === 'creator' ? 'resolved_creator' :
        resolution === 'brand' ? 'resolved_brand' :
        resolution === 'split' ? 'resolved_split' :
        'dismissed';

      await query(
        `UPDATE deal_disputes
         SET status = $1, resolved_at = NOW(), admin_notes = $2
         WHERE id = $3`,
        [resolutionStatus, notes, disputeId]
      );

      // If banning, update user status
      if (resolution === 'ban-creator' || resolution === 'ban-brand') {
        const dealResult = await query('SELECT creator_id, brand_id FROM deals WHERE id = $1', [dealId]);
        const deal = dealResult.rows[0];

        const userToBan = resolution === 'ban-creator' ? deal.creator_id : deal.brand_id;

        await query(
          `UPDATE users SET status = 'banned', banned_at = NOW(), ban_reason = $1 WHERE id = $2`,
          [notes, userToBan]
        );
      }

      // Update deal status and payout
      if (resolution === 'creator' || resolution === 'brand' || resolution === 'split') {
        // Move deal to completed
        await query(
          `UPDATE deals SET phase = 'completed', resolved_at = NOW() WHERE id = $1`,
          [dealId]
        );

        // Create payout record based on resolution
        const dealResult = await query('SELECT creator_id, amount, currency FROM deals WHERE id = $1', [dealId]);
        const deal = dealResult.rows[0];

        const payoutAmount =
          resolution === 'creator' ? deal.amount :
          resolution === 'brand' ? 0 :
          (deal.amount * payoutAdjustmentPct) / 100;

        if (payoutAmount > 0) {
          await query(
            `INSERT INTO deal_payouts (deal_id, creator_id, amount, currency, status, created_at)
             VALUES ($1, $2, $3, $4, 'pending', NOW())`,
            [dealId, deal.creator_id, payoutAmount, deal.currency]
          );
        }
      }

      // Log in audit trail
      await query(
        `INSERT INTO deal_audit_logs (deal_id, action, action_by, details, created_at)
         VALUES ($1, 'dispute_resolved', 'admin', $2, NOW())`,
        [dealId, JSON.stringify({ resolution, notes })]
      );

      await query('COMMIT');

      return res.status(200).json({ success: true, message: 'Dispute resolved' });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    console.error('Error resolving dispute:', error);
    return res.status(500).json({ error: error.message || 'Failed to resolve dispute' });
  }
}
