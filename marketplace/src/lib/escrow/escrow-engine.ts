import { query, transaction } from '@/lib/db-pool';
import { createOrder, createTransfer, verifySignature } from '@/lib/razorpay';
import { VALUESKIN_PRICE_CENTS, CURRENCY } from '@/lib/pricing';

// ── Types ──

export interface EscrowDealInput {
  dealId: string;
  totalAmountCents: number;
  advancePct: number;
  milestonePcts: number[];
  finalPct: number;
  reviewPeriodDays: number;
}

export interface EscrowDealState {
  dealId: string;
  totalAmountCents: number;
  advancePct: number;
  finalPct: number;
  escrowStatus: string;
  totalReleasedCents: number;
  pendingReleaseCents: number;
  currentPhase: string;
  disputeActive: boolean;
  milestones: MilestoneRelease[];
}

export interface MilestoneRelease {
  id: string;
  milestoneType: 'advance' | 'milestone' | 'final';
  amountCents: number;
  status: string;
  releasedAt: string | null;
}

export interface DeliverableInput {
  dealId: string;
  creatorId: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType?: string;
  fileSizeBytes?: number;
}

// ── Internal: get deal parties ──

const PARTIES_SQL = `SELECT creator_id, brand_id, phase, dispute_id FROM deals WHERE id = $1`;

async function getDealParties(dealId: string) {
  const r = await query(PARTIES_SQL, [dealId]);
  return r.rows[0] || null;
}

function assertIsBrand(deal: any, userId: string) {
  if (!deal) throw new Error('Deal not found');
  if (String(deal.brand_id) !== String(userId)) {
    throw new Error('Only the brand can perform this action');
  }
}

function assertIsCreator(deal: any, userId: string) {
  if (!deal) throw new Error('Deal not found');
  if (String(deal.creator_id) !== String(userId)) {
    throw new Error('Only the creator can perform this action');
  }
}

function assertIsAdmin(userId: string) {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (adminIds.length === 0) {
    throw new Error('No admin IDs configured — cannot perform admin action');
  }
  if (!adminIds.includes(String(userId))) {
    throw new Error('Only admins can perform this action');
  }
}

// ── Internal: notification helper ──

async function notify(userId: string, title: string, message: string, type: string = 'deal_update') {
  query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, $4)`,
    [userId, title, message, type]
  ).catch((err: any) => console.error('notify DB insert failed', err));

  try {
    const { sendPushNotification } = await import('@/lib/push');
    sendPushNotification(Number(userId), title, message).catch(() => {});
  } catch {}
}

// ── Internal: transfer to creator (shared by advance + final) ──

async function transferToCreator(
  client: any,
  dealId: string,
  releaseId: string,
  amountCents: number,
  milestoneType: string,
): Promise<boolean> {
  const payout = await client.query(
    `SELECT payout_account_id FROM creator_payout_accounts
     WHERE creator_id = (SELECT creator_id FROM deals WHERE id = $1 FOR UPDATE)
       AND verification_status = 'verified'
     LIMIT 1`,
    [dealId]
  );

  if (payout.rows.length === 0) {
    await client.query(
      `UPDATE milestone_releases SET status = 'pending' WHERE id = $1`,
      [releaseId]
    );
    return false;
  }

  await client.query(
    `UPDATE milestone_releases SET status = 'processing', released_at = NOW() WHERE id = $1`,
    [releaseId]
  );

  const orderRow = await client.query(
    'SELECT razorpay_order_id FROM deal_escrow WHERE deal_id = $1 FOR UPDATE',
    [dealId]
  );

  const transfer = await createTransfer(
    orderRow.rows[0]?.razorpay_order_id,
    [{
      account: payout.rows[0].payout_account_id,
      amount: amountCents,
      currency: CURRENCY,
    }]
  );

  if (transfer.success) {
    await client.query(
      `UPDATE milestone_releases SET status = 'completed', completed_at = NOW(), razorpay_transfer_id = $2
       WHERE id = $1`,
      [releaseId, transfer.data?.id || 'unknown']
    );
    return true;
  }

  await client.query(
    `UPDATE milestone_releases SET status = 'failed', failure_reason = $2, retry_count = retry_count + 1
     WHERE id = $1`,
    [releaseId, transfer.error?.message || 'Unknown transfer error']
  );
  return false;
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
      `INSERT INTO deal_milestone_templates (deal_id, advance_pct, milestone_pcts, final_pct)
       VALUES ($1, $2, $3::jsonb, $4)`,
      [input.dealId, input.advancePct, JSON.stringify(input.milestonePcts), input.finalPct]
    );

    if (input.advancePct > 0) {
      const advanceCents = Math.round(input.totalAmountCents * (input.advancePct / 100));
      await client.query(
        `INSERT INTO milestone_releases (deal_id, milestone_type, milestone_index, amount_cents, status)
         VALUES ($1, 'advance', 0, $2, 'pending')`,
        [input.dealId, advanceCents]
      );
    }

    for (let i = 0; i < input.milestonePcts.length; i++) {
      const pct = input.milestonePcts[i];
      const milestoneCents = Math.round(input.totalAmountCents * (pct / 100));
      await client.query(
        `INSERT INTO milestone_releases (deal_id, milestone_type, milestone_index, amount_cents, status)
         VALUES ($1, 'milestone', $2, $3, 'pending')`,
        [input.dealId, i, milestoneCents]
      );
    }

    if (input.finalPct > 0) {
      const finalCents = Math.round(input.totalAmountCents * (input.finalPct / 100));
      await client.query(
        `INSERT INTO milestone_releases (deal_id, milestone_type, milestone_index, amount_cents, status)
         VALUES ($1, 'final', 0, $2, 'pending')`,
        [input.dealId, finalCents]
      );
    }
  });

  await logAudit(input.dealId, null, 'system', 'deal_created', {
    totalAmountCents: input.totalAmountCents,
    advancePct: input.advancePct,
    finalPct: input.finalPct,
    reviewPeriodDays: input.reviewPeriodDays,
  });
}

// ── Escrow Funding ──

export async function fundEscrow(dealId: string, amountCents: number): Promise<string> {
  const deal = await getDealParties(dealId);
  if (!deal) throw new Error('Deal not found');

  const existing = await query(
    'SELECT status, razorpay_order_id FROM deal_escrow WHERE deal_id = $1',
    [dealId]
  );
  if (existing.rows[0]?.status === 'completed' || existing.rows[0]?.status === 'pending') {
    throw new Error('Escrow already funded or funding in progress');
  }

  const order = await createOrder({
    amount: amountCents,
    currency: CURRENCY,
    receipt: `escrow_full_${dealId}_${Date.now()}`,
    notes: { dealId, purpose: 'escrow_full_funding' },
  });

  if (!order.success) throw new Error('Failed to create Razorpay order for escrow funding');

  await transaction(async (client) => {
    await client.query(
      `UPDATE deal_escrow SET total_amount_cents = $2, razorpay_order_id = $3, status = 'pending'
       WHERE deal_id = $1`,
      [dealId, amountCents, order.data.id]
    );
  });

  await logAudit(dealId, null, 'brand', 'escrow_funding_initiated', {
    amountCents,
    razorpayOrderId: order.data.id,
  });

  return order.data.id;
}

export async function confirmEscrowFunding(
  dealId: string,
  orderId: string,
  paymentId: string,
  signature: string
): Promise<{ advanceReleased: boolean }> {
  const valid = await verifySignature(orderId, paymentId, signature);
  if (!valid) throw new Error('Payment signature verification failed');

  let advanceReleased = false;

  await transaction(async (client) => {
    const escrowRow = await client.query(
      `SELECT status FROM deal_escrow WHERE deal_id = $1 AND razorpay_order_id = $2 FOR UPDATE`,
      [dealId, orderId]
    );
    if (!escrowRow.rows[0]) throw new Error('Escrow record not found');
    if (escrowRow.rows[0].status === 'completed') {
      advanceReleased = true;
      return;
    }
    if (escrowRow.rows[0].status !== 'pending') {
      throw new Error(`Escrow in unexpected state: ${escrowRow.rows[0].status}`);
    }

    await client.query(
      `UPDATE deal_escrow SET status = 'completed', razorpay_payment_id = $2, funded_at = NOW()
       WHERE deal_id = $1`,
      [dealId, paymentId]
    );

    await client.query(
      `UPDATE deals SET phase = 'funded' WHERE id = $1 AND phase = 'agreed'`,
      [dealId]
    );

    // Auto-release advance within the same transaction
    const advanceRelease = await client.query(
      `SELECT id, amount_cents FROM milestone_releases
       WHERE deal_id = $1 AND milestone_type = 'advance' AND status = 'pending'
       LIMIT 1 FOR UPDATE`,
      [dealId]
    );

    if (advanceRelease.rows.length > 0) {
      const release = advanceRelease.rows[0];
      const ok = await transferToCreator(client, dealId, release.id, release.amount_cents, 'advance');
      advanceReleased = ok;
      if (!ok) {
        console.warn(`[Escrow] Advance release failed silently for deal ${dealId} — creator may need payout account`);
      }
    }
  });

  const deal = await getDealParties(dealId);

  await logAudit(dealId, null, 'brand', 'escrow_funded', { orderId, paymentId, advanceReleased });

  if (deal) {
    await notify(deal.brand_id, 'Escrow Funded', `Funds secured for deal #${dealId}. Advance released to creator.`);
    if (deal.creator_id) {
      await notify(deal.creator_id, 'Escrow Funded', `Brand funded escrow for deal #${dealId}.${advanceReleased ? ' Advance payment sent.' : ''}`);
    }
  }

  return { advanceReleased };
}

// ── Deliverables ──

export async function submitDeliverable(input: DeliverableInput) {
  let deliverableId: string;

  await transaction(async (client) => {
    const deal = await client.query(
      `SELECT current_deliverable_version, creator_id, brand_id, phase FROM deals WHERE id = $1 FOR UPDATE`,
      [input.dealId]
    );
    if (!deal.rows[0]) throw new Error('Deal not found');
    assertIsCreator(deal.rows[0], input.creatorId);

    const phase = deal.rows[0].phase;
    if (phase === 'completed' || phase === 'disputed') {
      throw new Error(`Cannot submit deliverables when deal is in '${phase}' phase`);
    }

    const currentVersion = (deal.rows[0]?.current_deliverable_version || 0) + 1;

    const result = await client.query(
      `INSERT INTO deliverables (deal_id, creator_id, title, description, file_url, file_type, file_size_bytes, version, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted')
       RETURNING id`,
      [input.dealId, input.creatorId, input.title, input.description || null,
       input.fileUrl, input.fileType || null, input.fileSizeBytes || null, currentVersion]
    );
    deliverableId = result.rows[0].id;

    await client.query(
      `UPDATE deals SET current_deliverable_version = $2, phase = 'review' WHERE id = $1`,
      [input.dealId, currentVersion]
    );

    const reviewDays = deal.rows[0].review_period_days || 7;

    await client.query(
      `INSERT INTO deal_review_periods (deal_id, deadline_at, status)
       VALUES ($1, NOW() + ($2 || ' days')::INTERVAL, 'open')`,
      [input.dealId, reviewDays]
    );
  });

  if (!deliverableId) throw new Error('Deliverable creation failed — transaction did not produce an ID');

  const deal = await getDealParties(input.dealId);

  await logAudit(input.dealId, input.creatorId, 'creator', 'deliverable_submitted', {
    deliverableId,
    title: input.title,
  });

  if (deal) {
    await notify(deal.brand_id, 'Deliverable Submitted', `Creator submitted "${input.title}" for deal #${input.dealId}. Review period started.`);
  }

  return deliverableId;
}

// ── Approval ──

export async function approveDeliverables(dealId: string, userId: string) {
  await transaction(async (client) => {
    const deal = await client.query(
      `SELECT brand_id FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId]
    );
    assertIsBrand(deal.rows[0], userId);

    await client.query(
      `UPDATE deliverables SET status = 'approved', reviewed_at = NOW()
       WHERE deal_id = $1 AND status IN ('submitted', 'revision_submitted')`,
      [dealId]
    );

    await client.query(
      `UPDATE deal_review_periods SET status = 'approved', closed_at = NOW()
       WHERE deal_id = $1 AND status = 'open'`,
      [dealId]
    );

    await client.query(
      `UPDATE deals SET phase = 'analytics', analytics_window_start = NOW() + INTERVAL '7 days', analytics_status = 'pending' WHERE id = $1`,
      [dealId]
    );

    // Release milestone (upload) payment — advance was already released on funding
    const milestoneRelease = await client.query(
      `SELECT id, amount_cents FROM milestone_releases
       WHERE deal_id = $1 AND milestone_type = 'milestone' AND status = 'pending'
       ORDER BY milestone_index ASC LIMIT 1 FOR UPDATE`,
      [dealId]
    );

    if (milestoneRelease.rows.length > 0) {
      const release = milestoneRelease.rows[0];
      await transferToCreator(client, dealId, release.id, release.amount_cents, 'milestone');
    }
  });

  const deal = await getDealParties(dealId);

  await logAudit(dealId, userId, 'brand', 'deliverables_approved', {});

  if (deal) {
    await notify(deal.creator_id, 'Deliverables Approved', `Brand approved deliverables for deal #${dealId}. Analytics phase started. 7-day timer is now running.`);
  }
}

export async function submitAnalytics(
  dealId: string,
  creatorId: string,
  totalViews: number,
  screenshotLink: string
) {
  await transaction(async (client) => {
    const deal = await client.query(
      `SELECT creator_id, phase, analytics_window_start, analytics_status FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId]
    );
    if (!deal.rows[0]) throw new Error('Deal not found');
    assertIsCreator(deal.rows[0], creatorId);

    const phase = deal.rows[0].phase;
    if (phase !== 'analytics') throw new Error(`Analytics submission is only available during the analytics phase (current: ${phase})`);

    const windowStart = deal.rows[0].analytics_window_start;
    if (windowStart && new Date() < new Date(windowStart)) {
      const daysLeft = Math.ceil((new Date(windowStart).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      throw new Error(`Analytics submission opens in ${daysLeft} day(s). Please wait for the 7-day analytics window.`);
    }

    const currentStatus = deal.rows[0].analytics_status;
    if (currentStatus === 'approved') throw new Error('Analytics already approved for this deal');

    if (!Number.isInteger(totalViews) || totalViews < 0) throw new Error('total_views must be a non-negative integer');
    if (typeof screenshotLink !== 'string' || screenshotLink.length < 1 || screenshotLink.length > 2000) {
      throw new Error('analytics_screenshot_link is required (max 2000 chars)');
    }

    await client.query(
      `UPDATE deals SET total_views = $2, analytics_screenshot_link = $3, analytics_status = 'submitted' WHERE id = $1`,
      [dealId, totalViews, screenshotLink]
    );
  });

  await logAudit(dealId, creatorId, 'creator', 'analytics_submitted', { totalViews, screenshotLink });

  const deal = await getDealParties(dealId);
  if (deal) {
    await notify(deal.brand_id, 'Analytics Submitted', `Creator submitted 7-day analytics for deal #${dealId}. Review and approve to release final payment.`);
  }
}

export async function approveAnalytics(dealId: string, userId: string) {
  await transaction(async (client) => {
    const deal = await client.query(
      `SELECT brand_id, usage_rights_days FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId]
    );
    assertIsBrand(deal.rows[0], userId);

    const statusRow = await client.query(
      `SELECT analytics_status FROM deals WHERE id = $1`,
      [dealId]
    );
    if (statusRow.rows[0]?.analytics_status !== 'submitted') {
      throw new Error('Analytics have not been submitted yet or are already approved');
    }

    await client.query(
      `UPDATE deals SET analytics_status = 'approved', analytics_approved_at = NOW(), phase = 'completed', completed_at = NOW() WHERE id = $1`,
      [dealId]
    );

    await client.query(
      `UPDATE user_reputation
       SET deals_completed = deals_completed + 1
       WHERE account_id = (SELECT creator_id FROM deals WHERE id = $1)`,
      [dealId]
    );

    // Compute license expiration if usage_rights_days is set
    const usageDays = deal.rows[0]?.usage_rights_days;
    if (usageDays && usageDays > 0) {
      await client.query(
        `UPDATE deals SET license_expiration_date = NOW() + ($2 || ' days')::INTERVAL WHERE id = $1`,
        [dealId, usageDays]
      );
    }

    // Release final payment within the transaction
    const finalRelease = await client.query(
      `SELECT id, amount_cents FROM milestone_releases
       WHERE deal_id = $1 AND milestone_type = 'final' AND status = 'pending'
       LIMIT 1 FOR UPDATE`,
      [dealId]
    );

    if (finalRelease.rows.length > 0) {
      const release = finalRelease.rows[0];
      const ok = await transferToCreator(client, dealId, release.id, release.amount_cents, 'final');

      if (ok) {
        await client.query(
          'UPDATE deal_escrow SET status = \'released\', released_at = NOW() WHERE deal_id = $1',
          [dealId]
        );
      }
    }
  });

  const deal = await getDealParties(dealId);

  await logAudit(dealId, userId, 'brand', 'analytics_approved', {});

  if (deal) {
    await notify(deal.creator_id, 'Analytics Approved', `Brand approved analytics for deal #${dealId}. Final payment released.`);
  }
}

// ── Revisions ──

export async function requestRevision(dealId: string, userId: string, notes: string) {
  await transaction(async (client) => {
    const deal = await client.query(
      `SELECT brand_id, phase FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId]
    );
    assertIsBrand(deal.rows[0], userId);

    const phase = deal.rows[0].phase;
    if (phase === 'completed' || phase === 'disputed') {
      throw new Error(`Cannot request revision when deal is in '${phase}' phase`);
    }

    await client.query(
      `UPDATE deliverables SET status = 'revision_requested', reviewer_notes = $2
       WHERE deal_id = $1 AND status IN ('submitted', 'revision_submitted')`,
      [dealId, notes]
    );

    await client.query(
      `UPDATE deal_review_periods SET status = 'revision_requested', closed_at = NOW()
       WHERE deal_id = $1 AND status = 'open'`,
      [dealId]
    );

    await client.query(
      `UPDATE deals SET phase = 'revision' WHERE id = $1`,
      [dealId]
    );
  });

  const deal = await getDealParties(dealId);

  await logAudit(dealId, userId, 'brand', 'revision_requested', { notes });

  if (deal) {
    await notify(deal.creator_id, 'Revision Requested', `Brand requested revisions on deal #${dealId}. Notes: ${notes.substring(0, 200)}`);
  }
}

export async function submitRevision(
  dealId: string,
  creatorId: string,
  fileUrl: string,
  notes?: string
) {
  await transaction(async (client) => {
    const deal = await client.query(
      `SELECT current_deliverable_version, creator_id FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId]
    );
    assertIsCreator(deal.rows[0], creatorId);

    const version = (deal.rows[0]?.current_deliverable_version || 0) + 1;

    await client.query(
      `UPDATE deliverables SET version = $2, status = 'revision_submitted', submitted_at = NOW()
       WHERE deal_id = $1 AND status = 'revision_requested'`,
      [dealId, version]
    );

    await client.query(
      `UPDATE deals SET current_deliverable_version = $2, phase = 'review' WHERE id = $1`,
      [dealId, version]
    );

    const reviewDays = deal.rows[0].review_period_days || 7;

    await client.query(
      `INSERT INTO deal_review_periods (deal_id, deadline_at, status)
       VALUES ($1, NOW() + ($2 || ' days')::INTERVAL, 'open')`,
      [dealId, reviewDays]
    );
  });

  const deal = await getDealParties(dealId);

  await logAudit(dealId, creatorId, 'creator', 'revision_submitted', { fileUrl, notes });

  if (deal) {
    await notify(deal.brand_id, 'Revision Submitted', `Creator submitted revision for deal #${dealId}. Review period restarted.`);
  }
}

// ── Disputes ──

export async function raiseDispute(
  dealId: string,
  userId: string,
  reason: string,
  description: string,
  evidenceUrls?: string[]
) {
  let disputeId: string;

  await transaction(async (client) => {
    const deal = await client.query(
      `SELECT creator_id, brand_id FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId]
    );
    if (!deal.rows[0]) throw new Error('Deal not found');
    const partyId = String(deal.rows[0].creator_id) === String(userId) ||
      String(deal.rows[0].brand_id) === String(userId);
    if (!partyId) throw new Error('Only deal participants can raise a dispute');

    const result = await client.query(
      `INSERT INTO deal_disputes (deal_id, raised_by, reason, description, evidence_urls, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, 'open')
       RETURNING id`,
      [dealId, userId, reason, description, JSON.stringify(evidenceUrls || [])]
    );
    disputeId = result.rows[0].id;

    await client.query(
      `UPDATE deal_escrow SET dispute_frozen = TRUE, dispute_frozen_at = NOW() WHERE deal_id = $1`,
      [dealId]
    );

    await client.query(
      `UPDATE deals SET dispute_id = $2, phase = 'disputed' WHERE id = $1`,
      [dealId, disputeId]
    );
  });

  if (!disputeId) throw new Error('Dispute creation failed — transaction did not produce an ID');

  const deal = await getDealParties(dealId);

  await logAudit(dealId, userId, 'user', 'dispute_raised', {
    disputeId, reason, description,
  });

  if (deal) {
    const otherParty = String(deal.creator_id) === String(userId) ? deal.brand_id : deal.creator_id;
    await notify(otherParty, 'Dispute Raised', `A dispute has been raised on deal #${dealId}. Reason: ${reason}. Escrow frozen pending resolution.`);
  }

  return disputeId;
}

export async function resolveDispute(
  disputeId: string,
  resolvedBy: string,
  resolution: 'resolved_creator' | 'resolved_brand' | 'resolved_split' | 'dismissed',
  notes: string,
  payoutAdjustmentPct?: number
) {
  await transaction(async (client) => {
    assertIsAdmin(resolvedBy);

    const dispute = await client.query(
      'SELECT deal_id FROM deal_disputes WHERE id = $1 FOR UPDATE',
      [disputeId]
    );
    if (dispute.rows.length === 0) throw new Error('Dispute not found');
    const dealId = dispute.rows[0].deal_id;

    await client.query(
      `UPDATE deal_disputes SET status = $2, resolution_notes = $3, resolved_by = $4,
       payout_adjustment_pct = $5, resolved_at = NOW()
       WHERE id = $1`,
      [disputeId, resolution, notes, resolvedBy, payoutAdjustmentPct || null]
    );

    await client.query(
      `UPDATE deal_escrow SET dispute_frozen = FALSE, dispute_frozen_at = NULL WHERE deal_id = $1`,
      [dealId]
    );

    const usageRow = await client.query(
      `SELECT usage_rights_days FROM deals WHERE id = $1`,
      [dealId]
    );
    const usageDays = usageRow.rows[0]?.usage_rights_days;

    await client.query(
      `UPDATE deals SET phase = 'completed', completed_at = NOW() WHERE id = $1`,
      [dealId]
    );

    await client.query(
      `UPDATE user_reputation
       SET deals_completed = deals_completed + 1
       WHERE account_id = (SELECT creator_id FROM deals WHERE id = $1)`,
      [dealId]
    );

    if (usageDays && usageDays > 0) {
      await client.query(
        `UPDATE deals SET license_expiration_date = NOW() + ($2 || ' days')::INTERVAL WHERE id = $1`,
        [dealId, usageDays]
      );
    }

    // Release final payment (can be inside transaction since it's idempotent)
    const finalRelease = await client.query(
      `SELECT id, amount_cents FROM milestone_releases
       WHERE deal_id = $1 AND milestone_type = 'final' AND status = 'pending'
       LIMIT 1 FOR UPDATE`,
      [dealId]
    );

    if (finalRelease.rows.length > 0) {
      const release = finalRelease.rows[0];
      const adjustedAmount = payoutAdjustmentPct
        ? Math.round(release.amount_cents * (payoutAdjustmentPct / 100))
        : release.amount_cents;

      const ok = await transferToCreator(client, dealId, release.id, adjustedAmount, 'final');

      if (ok) {
        await client.query(
          'UPDATE deal_escrow SET status = \'released\', released_at = NOW() WHERE deal_id = $1',
          [dealId]
        );
      }
    }
  });

  await logAudit(disputeId, resolvedBy, 'admin', 'dispute_resolved', {
    disputeId, resolution, notes, payoutAdjustmentPct,
  });
}

// ── Deal Status ──

export async function getDealEscrowStatus(dealId: string): Promise<EscrowDealState> {
  const [dealResult, escrowResult, releases, disputeResult] = await Promise.all([
    query('SELECT id, phase, advance_pct, final_pct, dispute_id FROM deals WHERE id = $1', [dealId]),
    query('SELECT status, total_amount_cents FROM deal_escrow WHERE deal_id = $1', [dealId]),
    query(
      `SELECT id, milestone_type, amount_cents, status, released_at
       FROM milestone_releases WHERE deal_id = $1 ORDER BY created_at`,
      [dealId]
    ),
    query(`SELECT id FROM deal_disputes WHERE deal_id = $1 AND status = 'open'`, [dealId]),
  ]);

  const deal = dealResult.rows[0];
  const escrow = escrowResult.rows[0];

  const totalReleased = releases.rows
    .filter((r: any) => r.status === 'completed')
    .reduce((sum: number, r: any) => sum + Number(r.amount_cents), 0);

  const totalPending = releases.rows
    .filter((r: any) => r.status === 'pending')
    .reduce((sum: number, r: any) => sum + Number(r.amount_cents), 0);

  return {
    dealId,
    totalAmountCents: Number(escrow?.total_amount_cents || 0),
    advancePct: Number(deal?.advance_pct || 0),
    finalPct: Number(deal?.final_pct || 0),
    escrowStatus: escrow?.status || 'not_funded',
    totalReleasedCents: totalReleased,
    pendingReleaseCents: totalPending,
    currentPhase: deal?.phase || 'unknown',
    disputeActive: disputeResult.rows.length > 0,
    milestones: releases.rows.map((r: any) => ({
      id: r.id,
      milestoneType: r.milestone_type as 'advance' | 'milestone' | 'final',
      amountCents: Number(r.amount_cents),
      status: r.status,
      releasedAt: r.released_at,
    })),
  };
}

// ── Audit Log ──

export async function logAudit(
  dealId: string,
  actorId: string | null,
  actorRole: string | null,
  action: string,
  details: Record<string, any>
) {
  try {
    await query(
      `INSERT INTO deal_audit_logs (deal_id, actor_id, actor_role, action, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [dealId, actorId, actorRole, action, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('logAudit failed (non-fatal):', err);
  }
}

export async function getAuditLog(dealId: string, limit: number = 50, offset: number = 0) {
  const [rows, countResult] = await Promise.all([
    query(
      `SELECT id, deal_id, actor_id, actor_role, action, details, created_at
       FROM deal_audit_logs WHERE deal_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [dealId, limit, offset]
    ),
    query(
      `SELECT COUNT(*) as total FROM deal_audit_logs WHERE deal_id = $1`,
      [dealId]
    ),
  ]);
  return { rows: rows.rows, total: parseInt(countResult.rows[0]?.total || '0') };
}

// ── Payout Account ──

export async function savePayoutAccountReference(params: {
  creatorId: string;
  paymentProvider: string;
  payoutAccountId: string;
  verificationStatus: string;
  lastFourDigits?: string;
  beneficiaryName?: string;
}) {
  await query(
    `INSERT INTO creator_payout_accounts (creator_id, payment_provider, payout_account_id, verification_status, last_four_digits, beneficiary_name)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (creator_id, payout_account_id) DO UPDATE SET
       verification_status = EXCLUDED.verification_status,
       updated_at = NOW()`,
    [
      params.creatorId,
      params.paymentProvider,
      params.payoutAccountId,
      params.verificationStatus,
      params.lastFourDigits || null,
      params.beneficiaryName || null,
    ]
  );
}

// ── Auto-Expiry Checker (call via cron) ──

export async function autoReleaseExpiredReviewPeriods() {
  const expired = await query(
    `SELECT id, deal_id FROM deal_review_periods
     WHERE status = 'open' AND deadline_at <= NOW()
     LIMIT 50`,
    []
  );

  let count = 0;

  for (const row of expired.rows) {
    try {
      let brandId: string | null = null;
      let creatorId: string | null = null;

      await transaction(async (client) => {
        const rp = await client.query(
          `SELECT status FROM deal_review_periods WHERE id = $1 FOR UPDATE`,
          [row.id]
        );
        if (!rp.rows[0] || rp.rows[0].status !== 'open') return;

        const dealRow = await client.query(
          `SELECT creator_id, brand_id FROM deals WHERE id = $1 FOR UPDATE`,
          [row.deal_id]
        );
        if (!dealRow.rows[0]) return;

        brandId = dealRow.rows[0].brand_id;
        creatorId = dealRow.rows[0].creator_id;

        await client.query(
          `UPDATE deal_review_periods SET status = 'auto_approved', auto_approved = TRUE, auto_approved_at = NOW(), closed_at = NOW()
           WHERE id = $1`,
          [row.id]
        );

        await client.query(
          `UPDATE deliverables SET status = 'approved', reviewed_at = NOW()
           WHERE deal_id = $1 AND status = 'submitted'`,
          [row.deal_id]
        );

        await client.query(
          `UPDATE deals SET phase = 'analytics', analytics_window_start = NOW() + INTERVAL '7 days', analytics_status = 'pending' WHERE id = $1`,
          [row.deal_id]
        );

        // Release milestone (upload) payment on auto-approval
        const milestoneRelease = await client.query(
          `SELECT id, amount_cents FROM milestone_releases
           WHERE deal_id = $1 AND milestone_type = 'milestone' AND status = 'pending'
           ORDER BY milestone_index ASC LIMIT 1 FOR UPDATE`,
          [row.deal_id]
        );

        if (milestoneRelease.rows.length > 0) {
          const release = milestoneRelease.rows[0];
          await transferToCreator(client, row.deal_id, release.id, release.amount_cents, 'milestone');
        }
      });

      await logAudit(row.deal_id, null, 'system', 'auto_approved_expired', { reviewPeriodId: row.id });
      count++;

      if (brandId) {
        await notify(brandId, 'Review Period Expired', `Review period expired for deal #${row.deal_id}. Deliverables auto-approved. Payment released.`);
      }
      if (creatorId) {
        await notify(creatorId, 'Review Period Expired', `Review period expired for deal #${row.deal_id}. Payment auto-released.`);
      }
    } catch (err) {
      console.error(`auto-release failed for review period ${row.id}:`, err);
    }
  }

  return count;
}
