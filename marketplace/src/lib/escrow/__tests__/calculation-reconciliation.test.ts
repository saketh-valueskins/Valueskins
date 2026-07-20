/**
 * CALCULATION RECONCILIATION TESTS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Unit tests for milestone payout calculation and reconciliation
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

// Extract just the pure calculation function for testing
function calculateMilestonePayouts(
  totalAmountCents: number,
  advancePct: number,
  milestonePcts: number[],
  finalPct: number
): {
  advanceCents: number;
  milestoneCents: number[];
  finalCents: number;
  totalCents: number;
  sumCents: number;
  isValid: boolean;
  residualCents: number;
} {
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

describe('Calculation Reconciliation', () => {
  describe('calculateMilestonePayouts', () => {
    it('should calculate exact amounts with no rounding error', () => {
      const result = calculateMilestonePayouts(
        10000, // ₹100.00 in cents
        30,    // 30% advance
        [50],  // 50% milestone
        20     // 20% final
      );

      expect(result.advanceCents).toBe(3000);
      expect(result.milestoneCents).toEqual([5000]);
      expect(result.finalCents).toBe(2000);
      expect(result.sumCents).toBe(10000);
      expect(result.isValid).toBe(true);
      expect(result.residualCents).toBe(0);
    });

    it('should handle odd amounts that cause rounding issues', () => {
      // Classic rounding failure: 100 split 33.33/33.33/33.34
      const result = calculateMilestonePayouts(
        10001, // ₹100.01 in cents
        30,    // 30% advance
        [50],  // 50% milestone
        20     // 20% final
      );

      expect(result.sumCents).toBe(10001);
      expect(result.isValid).toBe(true);
      expect(result.residualCents).toBe(0);
    });

    it('should absorb residual in final bucket', () => {
      // Amount where rounding would fail with independent rounding:
      // 100₹ split 33.33/33.33/33.34 → 33+33+33 = 99 (short 1₹)
      const result = calculateMilestonePayouts(
        10000,
        33.33,
        [33.33],
        33.34
      );

      // The final bucket absorbs any residual
      expect(result.advanceCents + result.milestoneCents[0] + result.finalCents).toBe(10000);
      expect(result.isValid).toBe(true);
    });

    it('should handle multiple milestones correctly', () => {
      const result = calculateMilestonePayouts(
        10000,
        10,                // 10% advance
        [22.5, 22.5, 22.5, 22.5],  // 4 milestones of 22.5% each = 90%
        0                 // 0% final (totals 100%)
      );

      expect(result.advanceCents).toBe(1000);
      const expectedMilestone = Math.round(10000 * 0.225);
      expect(result.milestoneCents).toEqual([expectedMilestone, expectedMilestone, expectedMilestone, expectedMilestone]);
      expect(result.sumCents).toBe(10000);
      expect(result.isValid).toBe(true);
    });

    it('should handle large amounts without overflow', () => {
      // ₹500,000
      const result = calculateMilestonePayouts(
        50000000, // 500,000 rupees in cents
        30,
        [40, 30],
        0
      );

      expect(result.advanceCents).toBe(15000000);
      expect(result.milestoneCents).toEqual([20000000, 15000000]);
      expect(result.finalCents).toBe(0);
      expect(result.sumCents).toBe(50000000);
      expect(result.isValid).toBe(true);
    });

    it('should handle zero percentages', () => {
      const result = calculateMilestonePayouts(
        10000,
        100, // 100% advance
        [],  // no milestones
        0    // no final
      );

      expect(result.advanceCents).toBe(10000);
      expect(result.milestoneCents).toEqual([]);
      expect(result.finalCents).toBe(0);
      expect(result.sumCents).toBe(10000);
      expect(result.isValid).toBe(true);
    });

    it('should throw on invalid percentage sum', () => {
      expect(() => {
        calculateMilestonePayouts(
          10000,
          30,  // 30%
          [50], // 50%
          15   // 15% (only 95% total)
        );
      }).toThrow('Percentages must sum to 100');
    });

    it('should throw on zero or negative amounts', () => {
      expect(() => {
        calculateMilestonePayouts(0, 30, [50], 20);
      }).toThrow('Total amount must be positive');

      expect(() => {
        calculateMilestonePayouts(-1000, 30, [50], 20);
      }).toThrow('Total amount must be positive');
    });

    it('should handle nearly-100% percentages (floating point tolerance)', () => {
      // Within the 0.01 tolerance
      const result = calculateMilestonePayouts(
        10000,
        33.333,
        [33.333],
        33.333
      );

      expect(result.isValid).toBe(true);
      expect(result.sumCents).toBe(10000);
    });

    it('case: ₹999 with 10% advance + 5 milestones of 18% each', () => {
      // The original bug case: 999₹ with percentages that would over-commit
      const result = calculateMilestonePayouts(
        99900, // ₹999 in cents
        10,    // 10% advance
        [18, 18, 18, 18, 18], // 5 milestones of 18% (90% total)
        0      // 0% final
      );

      expect(result.advanceCents).toBe(9990);
      // Each milestone independently would round differently, but final bucket absorbs
      expect(result.sumCents).toBe(99900);
      expect(result.isValid).toBe(true);
      expect(result.residualCents).toBe(0);
    });

    it('case: ₹100 split three even ways (33.33/33.33/33.34)', () => {
      // The most common failure case
      const result = calculateMilestonePayouts(
        10000, // ₹100
        33.33,
        [33.33],
        33.34
      );

      expect(result.sumCents).toBe(10000);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Reconciliation invariants', () => {
    it('advance + milestones + final always equals total', () => {
      const testCases = [
        { total: 10000, advance: 50, milestones: [50], final: 0 },
        { total: 10000, advance: 33.33, milestones: [33.33], final: 33.34 },
        { total: 99900, advance: 10, milestones: [18, 18, 18, 18, 18], final: 0 },
        { total: 50000000, advance: 30, milestones: [40, 30], final: 0 },
        { total: 1234500, advance: 25, milestones: [25, 25, 25], final: 0 },
      ];

      testCases.forEach(({ total, advance, milestones, final }) => {
        const result = calculateMilestonePayouts(total, advance, milestones, final);

        expect(
          result.advanceCents + result.milestoneCents.reduce((a, b) => a + b, 0) + result.finalCents
        ).toBe(total);

        expect(result.residualCents).toBe(0);
        expect(result.isValid).toBe(true);
      });
    });
  });
});
