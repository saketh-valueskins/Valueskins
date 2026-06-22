import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db-pool';
import { logAudit } from '@/lib/escrow';
import { verifyWebhookSignature, isKnownRazorpayIp } from '@/lib/razorpay';

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify webhook signature
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not set — webhook disabled');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const rawBody = JSON.stringify(req.body);
  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    console.error('Razorpay webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Optional: IP whitelist check (in production, enable this)
  if (process.env.RAZORPAY_WEBHOOK_IP_CHECK === 'true') {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress || '';
    if (!isKnownRazorpayIp(ip)) {
      console.error(`Webhook from unknown IP: ${ip}`);
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const event = req.body?.event;
  const payload = req.body?.payload;

  if (!event || !payload) return res.status(400).json({ error: 'Missing event or payload' });

  try {
    // Payout completed
    if (event === 'payout.processed') {
      const transferId = payload.payout?.id;
      if (transferId) {
        await query(
          `UPDATE milestone_releases SET status = 'completed', completed_at = NOW()
           WHERE razorpay_transfer_id = $1 AND status = 'processing'`,
          [transferId]
        );

        const release = await query(
          'SELECT deal_id FROM milestone_releases WHERE razorpay_transfer_id = $1',
          [transferId]
        );
        if (release.rows[0]) {
          await logAudit(release.rows[0].deal_id, null, 'system', 'payout_completed', {
            transferId, status: 'completed',
          });
        }
      }
    }

    // Payout failed
    if (event === 'payout.failed') {
      const transferId = payload.payout?.id;
      const errorMsg = payload.payout?.failure_reason || 'Unknown failure';
      const errorCode = payload.payout?.failure_code || 'UNKNOWN';

      if (transferId) {
        const release = await query(
          `UPDATE milestone_releases SET status = 'failed', failure_reason = $2, retry_count = retry_count + 1
           WHERE razorpay_transfer_id = $1 RETURNING deal_id`,
          [transferId, errorMsg]
        );

        await query(
          `INSERT INTO payout_retry_log (milestone_release_id, attempt, error_message, error_code)
           SELECT id, retry_count, $2, $3 FROM milestone_releases WHERE razorpay_transfer_id = $1`,
          [transferId, errorMsg, errorCode]
        );

        if (release.rows[0]) {
          await logAudit(release.rows[0].deal_id, null, 'system', 'payout_failed', {
            transferId, error: errorMsg, errorCode,
          });
        }
      }
    }

    // Payment captured — only used as fallback; primary flow is client-side confirmEscrowFunding
    if (event === 'payment.captured') {
      const orderId = payload.payment?.order_id;
      const paymentId = payload.payment?.id;

      if (orderId && paymentId) {
        const escrow = await query(
          `SELECT deal_id FROM deal_escrow WHERE razorpay_order_id = $1 AND status = 'pending'`,
          [orderId]
        );

        if (escrow.rows[0]) {
          const dealId = escrow.rows[0].deal_id;
          await query(
            `UPDATE deal_escrow SET razorpay_payment_id = $2, status = 'completed', funded_at = NOW()
             WHERE razorpay_order_id = $1`,
            [orderId, paymentId]
          );

          await logAudit(dealId, null, 'system', 'escrow_funded_webhook', { orderId, paymentId });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Razorpay webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
