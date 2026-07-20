/**
 * ESCROW ENGINE V3 - LIABILITY FREE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * CRITICAL: ValueSkins has ZERO liability for fund transfers.
 *
 * Architecture:
 * - ValueSkins decides WHEN to release (business logic only)
 * - Creator CONFIRMS before Razorpay executes (explicit action)
 * - Razorpay EXECUTES and owns the liability (via webhook confirmation)
 *
 * This file replaces escrow-engine.ts entirely.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { query, transaction } from '@/lib/db-pool';
import {
  createOrder,
  verifySignature,
  createPayoutLink as createPayoutLinkRazorpay,
  fetchPayoutLink,
  refundPayment,
} from '@/lib/razorpay';
import { VALUESKIN_PRICE_CENTS, CURRENCY } from '@/lib/pricing';
import crypto from 'crypto';

// ── Types ──

export interface EscrowDealInput {
  dealId: string;
  totalAmountCents: number;
  advancePct: number;
  milestonePcts: number[];
  finalPct: number;
  reviewPeriodDays: number;
}

export interface PayoutLinkInput {
  dealId: string;
  creatorId: string;
  creatorEmail: string;
  creatorPhone: string;
  creatorName: string;
  milestoneType: 'advance' | 'milestone' | 'final';
  amountCents: number;
}

// ── Internal: Helpers ──

async function notify(userId: string, title: string, message: string, type: string = 'deal_update') {
  query(
    `INSERT INTO notifications (user_id, title, message, type, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [userId, title, message, type]
  ).catch((err: any) => console.error('notify DB insert failed', err));

  try {
    const { sendPushNotification } = await import('@/lib/push');
    sendPushNotification(Number(userId), title, message).catch(() => {});
  } catch {}
}

async function logAudit(
  dealId: string,
  userId: string | null,
  actor: 'system' | 'brand' | 'creator' | 'razorpay',
  action: string,
  details: Record<string, any>
) {
  await query(
    `INSERT INTO escrow_audit_log (deal_id, user_id, actor, action, details, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [dealId, userId, actor, action, JSON.stringify(details)]
  ).catch((err: any) => console.error('audit log failed', err));
}

function generateIdempotencyKey(dealId: string, milestoneType: string, timestamp: number): string {
  return crypto
    .createHash('sha256')
    .update(`${dealId}|${milestoneType}|${timestamp}`)
    .digest('hex');
}

// ── Deal Creation ──

export async function createDeal(input: EscrowDealInput) {
  const totalPct = input.advancePct +
    input.milestonePcts.reduce((a, b) => a + b, 0) +
    input.finalPct;
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`Milestone percentages must sum to 100 (got ${totalPct})`);
  }

  await transaction(async (client) => {
    await client.query(
      `UPDATE deals SET advance_pct = $2, review_period_days = $3 WHERE id = $1`,
      [input.dealId, input.advancePct, input.reviewPeriodDays]
    );

    await client.query(
      `INSERT INTO deal_milestone_templates (deal_id, advance_pct, milestone_pcts, final_pct, created_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW())`,
      [input.dealId, input.advancePct, JSON.stringify(input.milestonePcts), input.finalPct]
    );

    if (input.advancePct > 0) {
      const advanceCents = Math.round(input.totalAmountCents * (input.advancePct / 100));
      await client.query(
        `INSERT INTO milestone_releases (deal_id, milestone_type, milestone_index, amount_cents, status, created_at)
         VALUES ($1, 'advance', 0, $2, 'pending', NOW())`,
        [input.dealId, advanceCents]
      );
    }

    for (let i = 0; i < input.milestonePcts.length; i++) {
      const pct = input.milestonePcts[i];
      const milestoneCents = Math.round(input.totalAmountCents * (pct / 100));
      await client.query(
        `INSERT INTO milestone_releases (deal_id, milestone_type, milestone_index, amount_cents, status, created_at)
         VALUES ($1, 'milestone', $2, $3, 'pending', NOW())`,
        [input.dealId, i, milestoneCents]
      );
    }

    if (input.finalPct > 0) {
      const finalCents = Math.round(input.totalAmountCents * (input.finalPct / 100));
      await client.query(
        `INSERT INTO milestone_releases (deal_id, milestone_type, milestone_index, amount_cents, status, created_at)
         VALUES ($1, 'final', 0, $2, 'pending', NOW())`,
        [input.dealId, finalCents]
      );
    }
  });

  await logAudit(input.dealId, null, 'system', 'deal_created', {
    totalAmountCents: input.totalAmountCents,
    advancePct: input.advancePct,
    finalPct: input.finalPct,
    message: 'Deal created with milestone structure'
  });
}

// ── ESCROW FUNDING (Brand pays, money held by Razorpay) ──

export async function fundEscrow(dealId: string, amountCents: number): Promise<string> {
  const deal = await query(
    'SELECT brand_id, creator_id FROM deals WHERE id = $1',
    [dealId]
  );
  if (!deal.rows[0]) throw new Error('Deal not found');

  const existing = await query(
    'SELECT status FROM deal_escrow WHERE deal_id = $1',
    [dealId]
  );
  if (existing.rows[0]?.status === 'funded') {
    throw new Error('Escrow already funded');
  }

  // CREATE RAZORPAY ORDER (money held by Razorpay, not us)
  const order = await createOrder({
    amount: amountCents,
    currency: CURRENCY,
    receipt: `escrow_${dealId}_${Date.now()}`,
    notes: {
      dealId,
      purpose: 'deal_escrow',
      message: 'Funds held by Razorpay. ValueSkins has zero custody.'
    },
  });

  if (!order.success) throw new Error('Failed to create Razorpay order');

  await transaction(async (client) => {
    await client.query(
      `INSERT INTO deal_escrow (deal_id, razorpay_order_id, total_amount_cents, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       ON CONFLICT (deal_id) DO UPDATE SET
         razorpay_order_id = $2,
         total_amount_cents = $3,
         status = 'pending'`,
      [dealId, order.data.id, amountCents]
    );
  });

  await logAudit(dealId, deal.rows[0].brand_id, 'brand', 'escrow_order_created', {
    amountCents,
    razorpayOrderId: order.data.id,
    message: 'Razorpay is holding the funds, not ValueSkins'
  });

  return order.data.id;
}

export async function confirmEscrowFunding(
  dealId: string,
  orderId: string,
  paymentId: string,
  signature: string
): Promise<void> {
  // VERIFY PAYMENT SIGNATURE (Razorpay confirms)
  const valid = await verifySignature(orderId, paymentId, signature);
  if (!valid) throw new Error('Payment signature verification failed');

  await transaction(async (client) => {
    const escrow = await client.query(
      `SELECT status FROM deal_escrow WHERE deal_id = $1 FOR UPDATE`,
      [dealId]
    );
    if (!escrow.rows[0]) throw new Error('Escrow not found');

    // Mark escrow as funded (Razorpay confirmed payment)
    await client.query(
      `UPDATE deal_escrow
       SET status = 'funded', razorpay_payment_id = $2, funded_at = NOW()
       WHERE deal_id = $1`,
      [dealId, paymentId]
    );

    // Update deal status
    await client.query(
      `UPDATE deals SET phase = 'funded' WHERE id = $1`,
      [dealId]
    );

    // DO NOT TRANSFER ADVANCE HERE
    // Instead, create payout link for creator to confirm
    const advanceRelease = await client.query(
      `SELECT id, amount_cents FROM milestone_releases
       WHERE deal_id = $1 AND milestone_type = 'advance' AND status = 'pending'
       LIMIT 1`,
      [dealId]
    );

    if (advanceRelease.rows.length > 0) {
      const release = advanceRelease.rows[0];

      // Mark as awaiting_payout_creation (will trigger payout link creation)
      await client.query(
        `UPDATE milestone_releases SET status = 'awaiting_payout_creation' WHERE id = $1`,
        [release.id]
      );
    }
  });

  const deal = await query(
    'SELECT creator_id FROM deals WHERE id = $1',
    [dealId]
  );

  await logAudit(dealId, deal.rows[0].creator_id, 'razorpay', 'payment_confirmed', {
    paymentId,
    message: 'Razorpay confirmed payment. Funds now in escrow. Payout link will be created.',
    liability: 'Razorpay owns the funds and liability'
  });
}

// ── PAYOUT LINK CREATION (Creator must confirm before Razorpay transfers) ──
// THIS IS THE LIABILITY SHIFT: Creator explicitly authorizes the payout

export async function createPayoutLink(input: PayoutLinkInput): Promise<{
  payoutLinkId: string;
  shortUrl: string;
  message: string
}> {
  // Check milestone exists and is ready for payout
  const release = await query(
    `SELECT id, amount_cents, status FROM milestone_releases
     WHERE deal_id = $1 AND milestone_type = $2 AND status IN ('awaiting_payout_creation', 'payout_link_expired')
     LIMIT 1`,
    [input.dealId, input.milestoneType]
  );

  if (!release.rows[0]) {
    throw new Error(`No eligible ${input.milestoneType} milestone for payout link creation`);
  }

  // Generate idempotency key (prevents duplicate payout links)
  const idempotencyKey = generateIdempotencyKey(
    input.dealId,
    input.milestoneType,
    Math.floor(Date.now() / 1000)
  );

  let payoutLinkId: string;
  let shortUrl: string;

  try {
    await transaction(async (client) => {
      // Check if payout link already exists (idempotency)
      const existing = await client.query(
        `SELECT razorpay_payout_link_id FROM payout_links
         WHERE deal_id = $1 AND milestone_type = $2 AND status = 'awaiting_creator_confirmation'
         LIMIT 1`,
        [input.dealId, input.milestoneType]
      );

      if (existing.rows[0]) {
        payoutLinkId = existing.rows[0].razorpay_payout_link_id;
        shortUrl = `https://rzp.io/i/${payoutLinkId}`;
        await logAudit(input.dealId, input.creatorId, 'system', 'payout_link_already_exists', {
          payoutLinkId,
          milestoneType: input.milestoneType,
          message: 'Payout link already exists, returning cached link'
        });
        return;
      }

      // CREATE PAYOUT LINK via Razorpay
      const result = await createPayoutLinkRazorpay({
        amount: input.amountCents,
        currency: CURRENCY,
        accept_partial: false,
        first_min_partial_amount: input.amountCents,
        reference_id: `deal_${input.dealId}_${input.milestoneType}`,
        recipient: {
          name: input.creatorName,
          email: input.creatorEmail,
          contact: input.creatorPhone,
        },
        notify: {
          sms: true,
          email: true,
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://valueskins.com'}/api/deals/escrow-v3-liability-free/webhook/razorpay-settlement`,
        callback_method: 'post',
        notes: {
          dealId: input.dealId,
          creatorId: input.creatorId,
          milestoneType: input.milestoneType,
          message: 'Creator must confirm. Razorpay will transfer when confirmed.'
        },
        idempotency_key: idempotencyKey,
      });

      if (!result.success) {
        // Create retry entry for later
        await client.query(
          `INSERT INTO payout_link_creation_failures
           (deal_id, milestone_type, creator_id, amount_cents, error_reason, retry_count, created_at, last_retry_at)
           VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW())`,
          [input.dealId, input.milestoneType, input.creatorId, input.amountCents, JSON.stringify(result.error)]
        );

        throw new Error(`Failed to create Razorpay payout link: ${JSON.stringify(result.error)}`);
      }

      payoutLinkId = result.data.id;
      shortUrl = result.data.short_url;

      // Store payout link in DB
      await client.query(
        `INSERT INTO payout_links
         (deal_id, milestone_type, creator_id, amount_cents, razorpay_payout_link_id, status, created_at, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, 'awaiting_creator_confirmation', NOW(), $6)`,
        [input.dealId, input.milestoneType, input.creatorId, input.amountCents, payoutLinkId, idempotencyKey]
      );

      // Update milestone status
      await client.query(
        `UPDATE milestone_releases SET status = 'payout_link_created'
         WHERE deal_id = $1 AND milestone_type = $2`,
        [input.dealId, input.milestoneType]
      );
    });

    await logAudit(input.dealId, input.creatorId, 'system', 'payout_link_created', {
      payoutLinkId,
      milestoneType: input.milestoneType,
      amountCents: input.amountCents,
      idempotencyKey,
      message: 'Payout link created. Creator must confirm to authorize Razorpay to transfer.',
      liability: 'Razorpay will process when creator confirms. ValueSkins has zero liability.'
    });

    return {
      payoutLinkId,
      shortUrl,
      message: 'Payout link sent to your email/SMS. Click to confirm and authorize payment.'
    };
  } catch (error: any) {
    await logAudit(input.dealId, input.creatorId, 'system', 'payout_link_creation_failed', {
      milestone_type: input.milestoneType,
      error: error.message,
      message: 'Failed to create payout link. Retry will be attempted.'
    });

    throw error;
  }
}

// ── RETRY FAILED PAYOUT LINK CREATIONS ──

export async function retryFailedPayoutLinkCreations(): Promise<void> {
  try {
    const failures = await query(
      `SELECT deal_id, milestone_type, creator_id, amount_cents, retry_count, id
       FROM payout_link_creation_failures
       WHERE retry_count < 3 AND last_retry_at < NOW() - INTERVAL '5 minutes'
       ORDER BY created_at ASC
       LIMIT 20`
    );

    console.log(`[Payout Retry] Retrying ${failures.rows.length} failed payout link creations`);

    for (const failure of failures.rows) {
      try {
        // Get creator details
        const creator = await query(
          `SELECT email, phone, name FROM users WHERE id = $1`,
          [failure.creator_id]
        );

        if (!creator.rows[0]) {
          console.warn(`[Payout Retry] Creator not found: ${failure.creator_id}`);
          continue;
        }

        await createPayoutLink({
          dealId: failure.deal_id,
          creatorId: failure.creator_id,
          creatorEmail: creator.rows[0].email,
          creatorPhone: creator.rows[0].phone,
          creatorName: creator.rows[0].name,
          milestoneType: failure.milestone_type as 'advance' | 'milestone' | 'final',
          amountCents: failure.amount_cents,
        });

        // Success, delete from failures table
        await query(
          `DELETE FROM payout_link_creation_failures WHERE id = $1`,
          [failure.id]
        );

        await logAudit(failure.deal_id, failure.creator_id, 'system', 'payout_link_retry_success', {
          milestone_type: failure.milestone_type,
          retry_count: failure.retry_count,
          message: 'Successfully retried payout link creation'
        });
      } catch (error: any) {
        // Still failing, increment retry count
        await query(
          `UPDATE payout_link_creation_failures
           SET retry_count = retry_count + 1, last_retry_at = NOW()
           WHERE id = $1`,
          [failure.id]
        );

        console.error(`[Payout Retry] Still failing for deal ${failure.deal_id}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`[Payout Retry] Error in batch retry:`, error);
  }
}

// ── CREATOR CONFIRMS PAYOUT (This is where creator's explicit action shifts liability) ──

export async function creatorConfirmedPayout(
  dealId: string,
  creatorId: string,
  payoutLinkId: string,
  razorpayWebhookData?: Record<string, any>
): Promise<void> {
  await transaction(async (client) => {
    const payout = await client.query(
      `SELECT id, milestone_type, amount_cents, status FROM payout_links
       WHERE deal_id = $1 AND razorpay_payout_link_id = $2 AND creator_id = $3 FOR UPDATE`,
      [dealId, payoutLinkId, creatorId]
    );

    if (!payout.rows[0]) {
      throw new Error('Payout link not found or does not belong to this creator');
    }

    if (payout.rows[0].status !== 'awaiting_creator_confirmation') {
      throw new Error(`Payout link in invalid state: ${payout.rows[0].status}`);
    }

    // CRITICAL AUDIT POINT: Creator has explicitly confirmed
    await client.query(
      `UPDATE payout_links
       SET status = 'creator_confirmed', creator_confirmed_at = NOW()
       WHERE id = $1`,
      [payout.rows[0].id]
    );

    await logAudit(dealId, creatorId, 'creator', 'payout_confirmed', {
      payoutLinkId,
      milestoneType: payout.rows[0].milestone_type,
      amountCents: payout.rows[0].amount_cents,
      message: 'CREATOR HAS EXPLICITLY AUTHORIZED THIS PAYOUT. Razorpay now owns execution liability.',
      webhookData: razorpayWebhookData || null
    });
  });
}

// ── WEBHOOK: Razorpay Settlement Confirmation (Proves Razorpay did the work) ──

function mapRazorpayStatusToOurs(razorpayStatus: string): string {
  const map: Record<string, string> = {
    'issued': 'awaiting_creator_confirmation',
    'accepted': 'creator_confirmed',
    'processed': 'settled',
    'expired': 'payout_link_expired',
    'failed': 'failed',
  };
  return map[razorpayStatus] || 'unknown';
}

export async function handlePayoutSettledWebhook(webhookData: {
  id: string;
  event: string;
  payload: {
    payout: {
      id: string;
      entity: string;
      fund_account_id?: string;
      amount: number;
      currency: string;
      status: string;
      reference_id?: string;
    }
  }
}): Promise<void> {
  const payout = webhookData.payload.payout;
  const webhookId = webhookData.id;

  if (payout.status !== 'processed') {
    console.log(`[Razorpay Webhook] Payout ${payout.id} status: ${payout.status} (not settled yet)`);
    return;
  }

  // IDEMPOTENCY: Check if we already processed this webhook
  const existingWebhook = await query(
    `SELECT id FROM escrow_audit_log
     WHERE details->>'razorpay_webhook_id' = $1
     AND action = 'payout_settled_webhook'
     LIMIT 1`,
    [webhookId]
  );

  if (existingWebhook.rows[0]) {
    console.log(`[Razorpay Webhook] Webhook ${webhookId} already processed, ignoring duplicate`);
    return;
  }

  // VALIDATION: Parse reference_id safely
  const parts = (payout.reference_id || '').split('_');
  if (parts.length < 3 || parts[0] !== 'deal') {
    console.error(`[Razorpay Webhook] Invalid reference_id format: ${payout.reference_id}`);
    await logAudit('unknown', null, 'razorpay', 'payout_settled_webhook_invalid_reference', {
      razorpay_webhook_id: webhookId,
      reference_id: payout.reference_id,
      message: 'Invalid reference_id, could not process webhook'
    });
    return;
  }

  const dealId = parts[1];
  const milestoneType = parts[2];

  await transaction(async (client) => {
    // STATE CHECK: Verify payout_link exists and is in right state
    const payoutLink = await client.query(
      `SELECT id, creator_id, amount_cents, status FROM payout_links
       WHERE deal_id = $1 AND razorpay_payout_id = $2
       FOR UPDATE`,
      [dealId, payout.id]
    );

    if (!payoutLink.rows[0]) {
      console.warn(`[Razorpay Webhook] Payout link not found for Razorpay payout ${payout.id}`);
      return;
    }

    if (payoutLink.rows[0].status !== 'creator_confirmed') {
      console.warn(
        `[Razorpay Webhook] Payout ${payout.id} in wrong state: ${payoutLink.rows[0].status}. Expected creator_confirmed.`
      );
      return;
    }

    // SAFE TO UPDATE: Now we know it's real, idempotent, and in right state
    await client.query(
      `UPDATE payout_links
       SET status = 'settled', settled_at = NOW()
       WHERE razorpay_payout_id = $1`,
      [payout.id]
    );

    await client.query(
      `UPDATE milestone_releases
       SET status = 'settled', razorpay_payout_id = $1, completed_at = NOW()
       WHERE deal_id = $2 AND milestone_type = $3`,
      [payout.id, dealId, milestoneType]
    );

    await logAudit(dealId, payoutLink.rows[0].creator_id, 'razorpay', 'payout_settled_webhook', {
      razorpay_webhook_id: webhookId,
      razorpay_payout_id: payout.id,
      reference_id: payout.reference_id,
      amount_cents: payout.amount,
      milestone_type: milestoneType,
      message: 'RAZORPAY CONFIRMS: Payout processed and settlement confirmed via webhook.',
      liability: 'Razorpay executed and confirms settlement. ValueSkins zero liability.'
    });
  });
}

// ── WEBHOOK: Razorpay Payout Failed (Razorpay owns the failure) ──

export async function handlePayoutFailedWebhook(webhookData: {
  event: string;
  payload: {
    payout: {
      id: string;
      status: string;
      failure_reason?: string;
      reference_id?: string;
    }
  }
}): Promise<void> {
  const payout = webhookData.payload.payout;

  if (payout.status !== 'failed') {
    return;
  }

  const parts = payout.reference_id?.split('_') || [];
  const dealId = parts[1];

  if (!dealId) {
    console.error(`[Razorpay Webhook] Invalid reference_id: ${payout.reference_id}`);
    return;
  }

  await transaction(async (client) => {
    const payoutLink = await client.query(
      `SELECT id, creator_id, milestone_type FROM payout_links
       WHERE deal_id = $1 AND razorpay_payout_id = $2 FOR UPDATE`,
      [dealId, payout.id]
    );

    if (!payoutLink.rows[0]) {
      console.warn(`[Razorpay Webhook] Payout link not found for failed payout ${payout.id}`);
      return;
    }

    const link = payoutLink.rows[0];

    // Mark as failed (Razorpay failed, not ValueSkins)
    await client.query(
      `UPDATE payout_links
       SET status = 'failed', failure_reason = $1, failed_at = NOW()
       WHERE id = $2`,
      [payout.failure_reason || 'Unknown failure', link.id]
    );

    // Mark milestone as failed
    await client.query(
      `UPDATE milestone_releases
       SET status = 'payout_failed', failure_reason = $1
       WHERE deal_id = $2 AND milestone_type = $3`,
      [payout.failure_reason || 'Razorpay payout failed', dealId, link.milestone_type]
    );

    await logAudit(dealId, link.creator_id, 'razorpay', 'payout_failed_webhook', {
      payoutId: payout.id,
      failureReason: payout.failure_reason,
      message: 'Razorpay failed to process payout. Razorpay owns this failure.',
      liability: 'Razorpay executed and failed. Razorpay is liable, not ValueSkins.'
    });

    // Notify creator
    await notify(
      link.creator_id,
      'Payout Failed',
      `Your ${link.milestone_type} payout of failed: ${payout.failure_reason}. Razorpay is investigating.`
    );
  });
}

// ── PAYOUT LINK STATUS SYNC (Verify status with Razorpay) ──

export async function syncPayoutLinkStatus(payoutLinkId: string): Promise<void> {
  try {
    // Fetch current status from Razorpay
    const result = await fetchPayoutLink(payoutLinkId);

    if (!result.success) {
      console.error(`[Payout Sync] Failed to fetch payout link ${payoutLinkId}`);
      return;
    }

    const razorpayStatus = result.data.status;
    const ourStatus = mapRazorpayStatusToOurs(razorpayStatus);

    // Find deal_id from payout link
    const payoutLink = await query(
      `SELECT id, deal_id, creator_id, status FROM payout_links
       WHERE razorpay_payout_link_id = $1`,
      [payoutLinkId]
    );

    if (!payoutLink.rows[0]) {
      console.warn(`[Payout Sync] Payout link not found in DB: ${payoutLinkId}`);
      return;
    }

    const dealId = payoutLink.rows[0].deal_id;
    const creatorId = payoutLink.rows[0].creator_id;

    // Update our DB to match Razorpay's truth
    await query(
      `UPDATE payout_links SET status = $1, updated_at = NOW()
       WHERE razorpay_payout_link_id = $2`,
      [ourStatus, payoutLinkId]
    );

    await logAudit(dealId, creatorId, 'system', 'payout_link_synced', {
      payoutLinkId,
      razorpay_status: razorpayStatus,
      our_status: ourStatus,
      message: 'Synced payout link status with Razorpay'
    });

    // If expired, notify creator
    if (razorpayStatus === 'expired') {
      await notify(
        creatorId,
        'Payout Link Expired',
        `Your payout link for ${dealId} has expired. A new one will be created.`
      );
    }
  } catch (error) {
    console.error(`[Payout Sync] Error syncing payout link ${payoutLinkId}:`, error);
  }
}

export async function syncAllPendingPayoutLinks(): Promise<void> {
  try {
    const pending = await query(
      `SELECT razorpay_payout_link_id FROM payout_links
       WHERE status IN ('awaiting_creator_confirmation', 'creator_confirmed')
       AND updated_at < NOW() - INTERVAL '5 minutes'
       LIMIT 100`
    );

    console.log(`[Payout Sync] Syncing ${pending.rows.length} pending payout links`);

    for (const row of pending.rows) {
      await syncPayoutLinkStatus(row.razorpay_payout_link_id);
    }
  } catch (error) {
    console.error(`[Payout Sync] Error in batch sync:`, error);
  }
}

// ── STATUS CHECK ──

export async function getDealEscrowStatus(dealId: string) {
  const [escrow, milestones, payouts] = await Promise.all([
    query(
      `SELECT status, total_amount_cents, funded_at, razorpay_order_id
       FROM deal_escrow WHERE deal_id = $1`,
      [dealId]
    ),
    query(
      `SELECT id, milestone_type, amount_cents, status, completed_at
       FROM milestone_releases WHERE deal_id = $1
       ORDER BY milestone_index`,
      [dealId]
    ),
    query(
      `SELECT id, milestone_type, status, amount_cents, created_at, creator_confirmed_at, settled_at
       FROM payout_links WHERE deal_id = $1
       ORDER BY created_at DESC`,
      [dealId]
    ),
  ]);

  return {
    dealId,
    escrow: escrow.rows[0] || null,
    milestones: milestones.rows,
    payouts: payouts.rows,
  };
}

// ── AUDIT LOG RETRIEVAL ──

export async function getAuditLog(dealId: string, limit: number = 50, offset: number = 0) {
  const result = await query(
    `SELECT id, deal_id, user_id, actor, action, details, created_at
     FROM escrow_audit_log WHERE deal_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [dealId, limit, offset]
  );

  return result.rows;
}
