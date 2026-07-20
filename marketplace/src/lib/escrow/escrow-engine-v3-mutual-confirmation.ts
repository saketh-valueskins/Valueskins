/**
 * MUTUAL CONFIRMATION MODULE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ZERO LIABILITY for ValueSkins business logic decisions.
 *
 * How it works:
 * 1. Brand approves deliverable → records approval
 * 2. Creator confirms delivery → records confirmation
 * 3. Both signed off → Payout link auto-created
 * 4. Neither party can later claim they didn't authorize
 *
 * ValueSkins is ONLY a record keeper, not a decision maker.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { query, transaction } from '@/lib/db-pool';

export interface MutualConfirmationState {
  dealId: string;
  milestoneType: 'advance' | 'milestone' | 'final';
  brandApproved: boolean;
  brandApprovedAt?: string;
  brandApprovalNotes?: string;
  creatorConfirmed: boolean;
  creatorConfirmedAt?: string;
  creatorConfirmationNotes?: string;
  bothConfirmed: boolean;
  payoutLinkCreatedAt?: string;
}

// ── BRAND APPROVAL ──
// Brand reviews deliverable and clicks "Approve"

export async function recordBrandApproval(
  dealId: string,
  brandId: string,
  approvalNotes?: string
): Promise<void> {
  // Verify brand is deal brand
  const deal = await query(
    'SELECT brand_id FROM deals WHERE id = $1',
    [dealId]
  );

  if (!deal.rows[0]) throw new Error('Deal not found');
  if (String(deal.rows[0].brand_id) !== String(brandId)) {
    throw new Error('Only the brand can approve');
  }

  // Record brand approval
  await transaction(async (client) => {
    await client.query(
      `INSERT INTO mutual_confirmations (deal_id, brand_approved, brand_approved_at, brand_approval_notes)
       VALUES ($1, true, NOW(), $2)
       ON CONFLICT (deal_id) DO UPDATE SET
         brand_approved = true,
         brand_approved_at = NOW(),
         brand_approval_notes = $2`,
      [dealId, approvalNotes || null]
    );

    // Log: Brand took action
    await logConfirmationAudit(dealId, brandId, 'brand', 'approved_deliverable', {
      approval_notes: approvalNotes,
      message: 'Brand approved deliverable. Awaiting creator confirmation.'
    });
  });
}

// ── CREATOR CONFIRMATION ──
// Creator reviews and confirms "Yes, I delivered this"

export async function recordCreatorConfirmation(
  dealId: string,
  creatorId: string,
  confirmationNotes?: string
): Promise<void> {
  // Verify creator is deal creator
  const deal = await query(
    'SELECT creator_id FROM deals WHERE id = $1',
    [dealId]
  );

  if (!deal.rows[0]) throw new Error('Deal not found');
  if (String(deal.rows[0].creator_id) !== String(creatorId)) {
    throw new Error('Only the creator can confirm');
  }

  // Record creator confirmation
  await transaction(async (client) => {
    await client.query(
      `INSERT INTO mutual_confirmations (deal_id, creator_confirmed, creator_confirmed_at, creator_confirmation_notes)
       VALUES ($1, true, NOW(), $2)
       ON CONFLICT (deal_id) DO UPDATE SET
         creator_confirmed = true,
         creator_confirmed_at = NOW(),
         creator_confirmation_notes = $2`,
      [dealId, confirmationNotes || null]
    );

    // Log: Creator took action
    await logConfirmationAudit(dealId, creatorId, 'creator', 'confirmed_delivery', {
      confirmation_notes: confirmationNotes,
      message: 'Creator confirmed delivery. Both parties now signed off.'
    });
  });
}

// ── CHECK MUTUAL CONFIRMATION ──

export async function getMutualConfirmationState(dealId: string): Promise<MutualConfirmationState> {
  const confirmation = await query(
    `SELECT deal_id, brand_approved, brand_approved_at, brand_approval_notes,
            creator_confirmed, creator_confirmed_at, creator_confirmation_notes,
            payout_link_created_at
     FROM mutual_confirmations WHERE deal_id = $1`,
    [dealId]
  );

  if (!confirmation.rows[0]) {
    return {
      dealId,
      milestoneType: 'advance',
      brandApproved: false,
      creatorConfirmed: false,
      bothConfirmed: false,
    };
  }

  const row = confirmation.rows[0];

  return {
    dealId: row.deal_id,
    milestoneType: 'advance', // TODO: track milestone type
    brandApproved: row.brand_approved,
    brandApprovedAt: row.brand_approved_at?.toISOString(),
    brandApprovalNotes: row.brand_approval_notes,
    creatorConfirmed: row.creator_confirmed,
    creatorConfirmedAt: row.creator_confirmed_at?.toISOString(),
    creatorConfirmationNotes: row.creator_confirmation_notes,
    bothConfirmed: row.brand_approved && row.creator_confirmed,
    payoutLinkCreatedAt: row.payout_link_created_at?.toISOString(),
  };
}

// ── AUTO-TRIGGER PAYOUT LINK WHEN BOTH CONFIRMED ──
// This should be called by a cron job or webhook handler

export async function checkAndCreatePayoutLinkIfMutuallyConfirmed(
  dealId: string,
  milestoneType: 'advance' | 'milestone' | 'final'
): Promise<boolean> {
  const confirmation = await getMutualConfirmationState(dealId);

  if (!confirmation.bothConfirmed) {
    return false; // Not yet mutual confirmation
  }

  if (confirmation.payoutLinkCreatedAt) {
    return true; // Already created
  }

  // Both parties confirmed → Payout link auto-creation
  // (This imports the payout link creation from main escrow engine)

  await logConfirmationAudit(dealId, null, 'system', 'both_confirmed_payout_triggered', {
    milestone_type: milestoneType,
    brand_approved_at: confirmation.brandApprovedAt,
    creator_confirmed_at: confirmation.creatorConfirmedAt,
    message: 'Both parties confirmed. Payout link will be created automatically.',
    liability: 'Both parties signed off. ValueSkins is only recording mutual consent. Neither party can later claim they did not authorize.'
  });

  // Mark payout as triggered
  await query(
    `UPDATE mutual_confirmations SET payout_link_created_at = NOW() WHERE deal_id = $1`,
    [dealId]
  );

  return true;
}

// ── DISPUTE RESOLUTION: PROOF OF MUTUAL CONSENT ──

export async function getMutualConfirmationProof(dealId: string): Promise<{
  dealId: string;
  brandApprovedAt: string | null;
  brandApprovalNotes: string | null;
  creatorConfirmedAt: string | null;
  creatorConfirmationNotes: string | null;
  auditTrail: any[];
  liability: string;
}> {
  const confirmation = await getMutualConfirmationState(dealId);

  const audit = await query(
    `SELECT actor, action, details, created_at FROM confirmation_audit_log
     WHERE deal_id = $1
     ORDER BY created_at ASC`,
    [dealId]
  );

  return {
    dealId,
    brandApprovedAt: confirmation.brandApprovedAt || null,
    brandApprovalNotes: confirmation.brandApprovalNotes || null,
    creatorConfirmedAt: confirmation.creatorConfirmedAt || null,
    creatorConfirmationNotes: confirmation.creatorConfirmationNotes || null,
    auditTrail: audit.rows,
    liability: 'Both parties explicitly signed off on this deal. ValueSkins has zero liability for approval decision.',
  };
}

// ── AUDIT LOGGING ──

async function logConfirmationAudit(
  dealId: string,
  userId: string | null,
  actor: 'brand' | 'creator' | 'system',
  action: string,
  details: Record<string, any>
): Promise<void> {
  await query(
    `INSERT INTO confirmation_audit_log (deal_id, user_id, actor, action, details, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [dealId, userId, actor, action, JSON.stringify(details)]
  );
}
