/**
 * ESCROW API V3 - LIABILITY FREE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * All endpoints in this file transfer liability to Razorpay via explicit creator action.
 *
 * Endpoints:
 * - POST /api/deals/escrow-v3-liability-free/create-deal - Setup deal milestones
 * - POST /api/deals/escrow-v3-liability-free/fund - Brand funds deal (Razorpay holds)
 * - POST /api/deals/escrow-v3-liability-free/confirm-funding - Verify brand payment
 * - POST /api/deals/escrow-v3-liability-free/create-payout-link - Generate link for creator
 * - POST /api/deals/escrow-v3-liability-free/confirm-payout - Creator confirms payout
 * - POST /api/deals/escrow-v3-liability-free/webhook/razorpay - Razorpay settlement webhook
 * - GET  /api/deals/escrow-v3-liability-free/status - Check escrow status
 * - GET  /api/deals/escrow-v3-liability-free/audit - Get audit trail
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { setupCors } from '@/lib/cors';
import { query } from '@/lib/db-pool';
import { verifyWebhookSignature } from '@/lib/razorpay';
import {
  createDeal,
  fundEscrow,
  confirmEscrowFunding,
  createPayoutLink,
  creatorConfirmedPayout,
  handlePayoutSettledWebhook,
  handlePayoutFailedWebhook,
  getDealEscrowStatus,
  getAuditLog,
  syncPayoutLinkStatus,
  syncAllPendingPayoutLinks,
  retryFailedPayoutLinkCreations,
} from '@/lib/escrow/escrow-engine-v3-liability-free';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;

  const { action } = req.query;
  const act = Array.isArray(action) ? action[0] : action;

  const sessionToken = req.cookies.valueskins_session;
  const userId = req.headers['x-user-id'] as string;

  try {
    // ── CREATE DEAL ──
    if (act === 'create-deal' && req.method === 'POST') {
      if (!sessionToken || !userId) return res.status(401).json({ error: 'Unauthorized' });

      const { dealId, totalAmountRupees, advancePct, milestonePcts, finalPct, reviewPeriodDays } = req.body;

      if (!dealId || typeof totalAmountRupees !== 'number' || totalAmountRupees <= 0) {
        return res.status(400).json({ error: 'dealId and totalAmountRupees (positive number) required' });
      }

      const totalCents = Math.round(totalAmountRupees * 100);
      if (totalCents > 50000000) {
        return res.status(400).json({ error: 'Amount exceeds maximum (₹500,000)' });
      }

      const mPcts = Array.isArray(milestonePcts) ? milestonePcts : [];

      await createDeal({
        dealId,
        totalAmountCents: totalCents,
        advancePct: typeof advancePct === 'number' ? advancePct : 30,
        milestonePcts: mPcts,
        finalPct: typeof finalPct === 'number'
          ? finalPct
          : (100 - (advancePct || 30) - mPcts.reduce((a: number, b: number) => a + b, 0)),
        reviewPeriodDays: typeof reviewPeriodDays === 'number' ? reviewPeriodDays : 7,
      });

      return res.status(200).json({ success: true, message: 'Deal created with liability-free milestones' });
    }

    // ── FUND ESCROW (Brand pays, Razorpay holds) ──
    if (act === 'fund' && req.method === 'POST') {
      if (!sessionToken || !userId) return res.status(401).json({ error: 'Unauthorized' });

      const { dealId } = req.body;
      if (!dealId) return res.status(400).json({ error: 'dealId required' });

      const deal = await query(
        'SELECT brand_id, offer_amount FROM deals WHERE id = $1',
        [dealId]
      );
      if (!deal.rows[0]) return res.status(404).json({ error: 'Deal not found' });
      if (String(deal.rows[0].brand_id) !== String(userId)) {
        return res.status(403).json({ error: 'Only the brand can fund escrow' });
      }

      const totalCents = Math.round(Number(deal.rows[0].offer_amount) * 100);
      const orderId = await fundEscrow(dealId, totalCents);

      return res.status(200).json({
        keyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        orderId,
        amount: totalCents,
        currency: 'INR',
        message: 'Razorpay is holding the funds. Brand must complete payment.'
      });
    }

    // ── CONFIRM FUNDING (Razorpay confirms payment) ──
    if (act === 'confirm-funding' && req.method === 'POST') {
      if (!sessionToken || !userId) return res.status(401).json({ error: 'Unauthorized' });

      const { dealId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      if (!dealId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment verification fields' });
      }

      await confirmEscrowFunding(dealId, razorpay_order_id, razorpay_payment_id, razorpay_signature);

      return res.status(200).json({
        success: true,
        message: 'Escrow funded. Payout link will be created for advance payment. Creator must confirm to receive funds.'
      });
    }

    // ── CREATE PAYOUT LINK (Creator must confirm before Razorpay transfers) ──
    if (act === 'create-payout-link' && req.method === 'POST') {
      if (!sessionToken || !userId) return res.status(401).json({ error: 'Unauthorized' });

      const { dealId, milestoneType } = req.body;
      if (!dealId || !milestoneType) {
        return res.status(400).json({ error: 'dealId and milestoneType required' });
      }

      // Get creator and deal details
      const deal = await query(
        'SELECT creator_id FROM deals WHERE id = $1',
        [dealId]
      );
      if (!deal.rows[0]) return res.status(404).json({ error: 'Deal not found' });

      const creator = await query(
        'SELECT id, email, phone, name FROM users WHERE id = $1',
        [deal.rows[0].creator_id]
      );
      if (!creator.rows[0]) return res.status(404).json({ error: 'Creator not found' });

      const milestone = await query(
        `SELECT amount_cents FROM milestone_releases
         WHERE deal_id = $1 AND milestone_type = $2 AND status IN ('awaiting_payout_creation', 'payout_link_expired')
         LIMIT 1`,
        [dealId, milestoneType]
      );
      if (!milestone.rows[0]) {
        return res.status(400).json({ error: `No eligible ${milestoneType} milestone` });
      }

      const payoutLink = await createPayoutLink({
        dealId,
        creatorId: creator.rows[0].id,
        creatorEmail: creator.rows[0].email,
        creatorPhone: creator.rows[0].phone,
        creatorName: creator.rows[0].name,
        milestoneType,
        amountCents: milestone.rows[0].amount_cents,
      });

      return res.status(200).json({
        success: true,
        payoutLink,
        message: 'Payout link created. Creator receives SMS/email to confirm. Razorpay will transfer once confirmed.'
      });
    }

    // ── CREATOR CONFIRMS PAYOUT ──
    if (act === 'confirm-payout' && req.method === 'POST') {
      if (!sessionToken || !userId) return res.status(401).json({ error: 'Unauthorized' });

      const { dealId, payoutLinkId } = req.body;
      if (!dealId || !payoutLinkId) {
        return res.status(400).json({ error: 'dealId and payoutLinkId required' });
      }

      await creatorConfirmedPayout(dealId, userId, payoutLinkId);

      return res.status(200).json({
        success: true,
        message: 'Payout confirmed! Razorpay will process the transfer. You will receive funds in 2-3 business days.'
      });
    }

    // ── RAZORPAY WEBHOOK (Proves Razorpay executed) ──
    if (act === 'webhook' && req.method === 'POST') {
      const { rest } = req.query;
      const webhookAction = Array.isArray(rest) ? rest[0] : rest;

      if (webhookAction === 'razorpay-settlement') {
        // VERIFY WEBHOOK SIGNATURE (only Razorpay can sign this)
        const body = JSON.stringify(req.body);
        const signature = req.headers['x-razorpay-signature'] as string;

        const isValid = verifyWebhookSignature(
          body,
          signature,
          process.env.RAZORPAY_WEBHOOK_SECRET || ''
        );

        if (!isValid) {
          console.error('[Webhook] Invalid Razorpay webhook signature');
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }

        const webhookData = req.body;

        try {
          if (webhookData.event === 'payout.processed') {
            await handlePayoutSettledWebhook(webhookData);
          } else if (webhookData.event === 'payout.failed') {
            await handlePayoutFailedWebhook(webhookData);
          }
        } catch (error: any) {
          console.error('[Webhook] Error handling webhook:', error);
          // Still return 200 to Razorpay (don't want them retrying)
        }

        // Always return 200 to Razorpay (they just need acknowledgment)
        return res.status(200).json({ received: true });
      }

      return res.status(400).json({ error: 'Unknown webhook action' });
    }

    // ── STATUS ──
    if (act === 'status' && req.method === 'GET') {
      const { dealId } = req.query;
      if (!dealId || Array.isArray(dealId)) {
        return res.status(400).json({ error: 'dealId required' });
      }

      // Verify user has access to this deal
      const deal = await query(
        'SELECT brand_id, creator_id FROM deals WHERE id = $1',
        [dealId]
      );
      if (!deal.rows[0]) return res.status(404).json({ error: 'Deal not found' });

      if (sessionToken && userId) {
        const isParty = String(deal.rows[0].brand_id) === String(userId) ||
                        String(deal.rows[0].creator_id) === String(userId);
        if (!isParty) return res.status(403).json({ error: 'Unauthorized' });
      }

      const status = await getDealEscrowStatus(dealId);
      return res.status(200).json(status);
    }

    // ── AUDIT LOG ──
    if (act === 'audit' && req.method === 'GET') {
      const { dealId, limit, offset } = req.query;
      if (!dealId || Array.isArray(dealId)) {
        return res.status(400).json({ error: 'dealId required' });
      }

      // Verify access
      const deal = await query(
        'SELECT brand_id, creator_id FROM deals WHERE id = $1',
        [dealId]
      );
      if (!deal.rows[0]) return res.status(404).json({ error: 'Deal not found' });

      if (sessionToken && userId) {
        const isParty = String(deal.rows[0].brand_id) === String(userId) ||
                        String(deal.rows[0].creator_id) === String(userId);
        if (!isParty) return res.status(403).json({ error: 'Unauthorized' });
      }

      const l = Math.min(Math.max(parseInt(limit as string) || 50, 1), 200);
      const o = Math.max(parseInt(offset as string) || 0, 0);

      const audit = await getAuditLog(dealId, l, o);
      return res.status(200).json({
        dealId,
        audit,
        message: 'This audit trail includes both ValueSkins actions and Razorpay webhook confirmations. Proof of liability transfer.'
      });
    }

    // ── SYNC PAYOUT LINK STATUS (Admin/cron) ──
    if (act === 'sync-payout-status' && req.method === 'POST') {
      const { payoutLinkId } = req.body;
      if (!payoutLinkId) return res.status(400).json({ error: 'payoutLinkId required' });

      await syncPayoutLinkStatus(payoutLinkId);
      return res.status(200).json({
        success: true,
        message: 'Payout link status synced with Razorpay'
      });
    }

    // ── SYNC ALL PENDING PAYOUT LINKS (Cron job) ──
    if (act === 'sync-all-pending' && req.method === 'POST') {
      // Verify this is a cron call (optional: check cron secret)
      const cronSecret = req.headers['x-cron-secret'];
      if (cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await syncAllPendingPayoutLinks();
      return res.status(200).json({
        success: true,
        message: 'All pending payout links synced'
      });
    }

    // ── RETRY FAILED PAYOUT CREATIONS (Cron job) ──
    if (act === 'retry-failed-payouts' && req.method === 'POST') {
      // Verify this is a cron call
      const cronSecret = req.headers['x-cron-secret'];
      if (cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await retryFailedPayoutLinkCreations();
      return res.status(200).json({
        success: true,
        message: 'Retried failed payout link creations'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error(`Escrow v3 [${act}] error:`, error);
    return res.status(500).json({
      error: error.message || 'Escrow operation failed',
      liability: 'If this was a transfer error, Razorpay is liable'
    });
  }
}

export default withApiHandler(handler, {
  rateLimit: { maxRequests: 60, windowMs: 60000 }
});
