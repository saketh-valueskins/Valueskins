/**
 * CALCULATION RECONCILIATION MODULE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Ensures payout calculations are EXACT — no rounding errors, no stranded cents.
 *
 * Problem: Independent rounding of (advance + milestones + final) can result in
 * sum ≠ total. Example: ₹100 split 33.33/33.33/33.34 → 33+33+33 = 99 (short 1₹).
 *
 * Solution: "Last bucket absorbs residual" algorithm:
 * 1. Round first N-1 buckets
 * 2. Final bucket = total - sum(first N-1)
 * 3. Guarantees: advance_cents + Σ(milestone_cents) + final_cents === total_cents
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { query, transaction } from '@/lib/db-pool';

export interface MilestoneCalculation {
  advanceCents: number;
  milestoneCents: number[];
  finalCents: number;
  totalCents: number;
  // Verification fields
  sumCents: number;
  isValid: boolean;
  residualCents: number; // How many cents were "lost" due to rounding (should be 0)
}

/**
 * CORE ALGORITHM: Split total into buckets with guaranteed exactness
 *
 * Example:
 * totalCents = 10001 (₹100.01)
 * advancePct = 30, milestonePcts = [50], finalPct = 20
 *
 * advanceCents = Math.round(10001 * 0.30) = Math.round(3000.3) = 3000
 * milestoneCents = [Math.round(10001 * 0.50)] = [Math.round(5000.5)] = [5001]
 * finalCents = 10001 - 3000 - 5001 = 2000 (exact, absorbs any residual)
 *
 * Sum = 3000 + 5001 + 2000 = 10001 ✓
 */
export function calculateMilestonePayouts(
  totalAmountCents: number,
  advancePct: number,
  milestonePcts: number[],
  finalPct: number
): MilestoneCalculation {
  if (totalAmountCents <= 0) {
    throw new Error('Total amount must be positive');
  }

  const totalPct = advancePct + milestonePcts.reduce((a, b) => a + b, 0) + finalPct;
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100 (got ${totalPct})`);
  }

  // Round first N-1 buckets
  const advanceCents = advancePct > 0 ? Math.round(totalAmountCents * (advancePct / 100)) : 0;
  const milestoneCents: number[] = milestonePcts.map((pct) =>
    pct > 0 ? Math.round(totalAmountCents * (pct / 100)) : 0
  );

  // Final bucket absorbs residual to guarantee exact sum
  const sumBeforeFinal = advanceCents + milestoneCents.reduce((a, b) => a + b, 0);
  const finalCents = Math.max(0, totalAmountCents - sumBeforeFinal);

  // Verification
  const sumCents = advanceCents + milestoneCents.reduce((a, b) => a + b, 0) + finalCents;
  const residualCents = totalAmountCents - sumCents;
  const isValid = residualCents === 0;

  if (!isValid) {
    throw new Error(
      `Calculation error: sum ${sumCents} ≠ total ${totalAmountCents} (residual: ${residualCents} cents)`
    );
  }

  return {
    advanceCents,
    milestoneCents,
    finalCents,
    totalCents: totalAmountCents,
    sumCents,
    isValid,
    residualCents,
  };
}

/**
 * Verify that stored milestone_releases match the total in deal_escrow
 * Run at deal creation (post-write check) and periodically (reconciliation cron)
 */
export async function verifyMilestoneReconciliation(dealId: string): Promise<{
  dealId: string;
  totalEscrowed: number;
  totalScheduled: number;
  mismatchCents: number;
  isReconciled: boolean;
  details: Array<{
    milestoneType: string;
    milestoneIndex: number;
    amountCents: number;
  }>;
}> {
  // Get escrow total
  const escrowResult = await query(
    `SELECT total_amount_cents FROM deal_escrow WHERE deal_id = $1`,
    [dealId]
  );

  const totalEscrowed = escrowResult.rows[0]?.total_amount_cents || 0;

  // Get all milestone releases
  const releasesResult = await query(
    `SELECT milestone_type, milestone_index, amount_cents
     FROM milestone_releases
     WHERE deal_id = $1
     ORDER BY
       CASE milestone_type
         WHEN 'advance' THEN 1
         WHEN 'milestone' THEN 2
         WHEN 'final' THEN 3
       END,
       milestone_index`,
    [dealId]
  );

  const releases = releasesResult.rows;
  const totalScheduled = releases.reduce((sum, r) => sum + r.amount_cents, 0);
  const mismatchCents = totalEscrowed - totalScheduled;
  const isReconciled = mismatchCents === 0;

  return {
    dealId,
    totalEscrowed,
    totalScheduled,
    mismatchCents,
    isReconciled,
    details: releases.map((r) => ({
      milestoneType: r.milestone_type,
      milestoneIndex: r.milestone_index,
      amountCents: r.amount_cents,
    })),
  };
}

/**
 * Log a reconciliation check to audit trail
 * Called after verifyMilestoneReconciliation if mismatch found
 */
export async function logReconciliationMismatch(
  dealId: string,
  totalEscrowed: number,
  totalScheduled: number,
  mismatchCents: number
): Promise<void> {
  await query(
    `INSERT INTO escrow_audit_log (deal_id, actor, action, details, created_at)
     VALUES ($1, 'system', 'reconciliation_mismatch_detected', $2, NOW())`,
    [
      dealId,
      JSON.stringify({
        totalEscrowed,
        totalScheduled,
        mismatchCents,
        message:
          mismatchCents > 0
            ? `WARNING: Escrow has ${mismatchCents} more cents than scheduled releases (stranded money)`
            : `ERROR: Releases sum to ${-mismatchCents} more cents than escrow (over-committed)`,
      }),
    ]
  );
}

/**
 * Get summary of all deals with calculation issues
 * Used by admin dashboard or monitoring system
 */
export async function findMismatchedDeals(): Promise<
  Array<{
    dealId: string;
    totalEscrowed: number;
    totalScheduled: number;
    mismatchCents: number;
    dealStatus: string;
    createdAt: string;
  }>
> {
  const result = await query(
    `SELECT
       de.deal_id,
       de.total_amount_cents,
       COALESCE(SUM(mr.amount_cents), 0) as total_scheduled,
       de.total_amount_cents - COALESCE(SUM(mr.amount_cents), 0) as mismatch_cents,
       d.status,
       de.created_at
     FROM deal_escrow de
     LEFT JOIN milestone_releases mr ON de.deal_id = mr.deal_id
     LEFT JOIN deals d ON de.deal_id = d.id
     WHERE de.total_amount_cents != COALESCE(SUM(mr.amount_cents), 0)
     GROUP BY de.deal_id, de.total_amount_cents, d.status, de.created_at
     ORDER BY de.created_at DESC`,
    []
  );

  return result.rows.map((row) => ({
    dealId: row.deal_id,
    totalEscrowed: row.total_amount_cents,
    totalScheduled: row.total_scheduled,
    mismatchCents: row.mismatch_cents,
    dealStatus: row.status,
    createdAt: row.created_at?.toISOString(),
  }));
}
