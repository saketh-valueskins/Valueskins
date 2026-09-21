export interface PaymentWorkflowState {
  deal_id: string;
  status: string;
  commission_paid: boolean;
  advance_paid: boolean;
  final_paid: boolean;
  adp_generated: boolean;
}

export const DEAL_STATUSES = {
  PENDING_COMMISSION: 'pending_commission_payment',
  COMMISSION_PAID: 'commission_paid',
  CREATOR_ACCEPTED: 'creator_accepted',
  ADVANCE_INITIATED: 'advance_initiated',
  ADVANCE_PAID: 'advance_paid',
  IN_PROGRESS: 'in_progress',
  WORK_SUBMITTED: 'work_submitted',
  WORK_APPROVED: 'work_approved',
  FINAL_INITIATED: 'final_initiated',
  FINAL_PAID: 'final_paid',
  COMPLETED: 'completed',
};

export function calculateCommission(totalBudget: number): {
  base: number;
  gst: number;
  total: number;
} {
  const base = 750;
  const gst = base * 0.18;
  const total = base + gst;

  return {
    base: Math.round(base * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function calculateCreatorPayout(
  totalBudget: number,
  commission: number
): {
  total: number;
  advance: number;
  final: number;
} {
  const creatorTotal = totalBudget - commission;
  const advance = creatorTotal * 0.3;
  const final = creatorTotal * 0.7;

  return {
    total: Math.round(creatorTotal * 100) / 100,
    advance: Math.round(advance * 100) / 100,
    final: Math.round(final * 100) / 100,
  };
}

export function calculateRazorpayFees(amount: number): {
  paymentFee: number;
  payoutFee: number;
  totalFees: number;
} {
  // Razorpay payment gateway: 2% + 30 paise per transaction
  const paymentFee = amount * 0.02 + 0.30;

  // Razorpay payouts: 0.3% on UPI, 0.5% on bank transfers
  const payoutFee = amount * 0.003;

  return {
    paymentFee: Math.round(paymentFee * 100) / 100,
    payoutFee: Math.round(payoutFee * 100) / 100,
    totalFees: Math.round((paymentFee + payoutFee) * 100) / 100,
  };
}

export function getNextWorkflowStatus(
  currentStatus: string,
  action: string
): string {
  const transitions: Record<string, Record<string, string>> = {
    [DEAL_STATUSES.PENDING_COMMISSION]: {
      'commission_paid': DEAL_STATUSES.COMMISSION_PAID,
    },
    [DEAL_STATUSES.COMMISSION_PAID]: {
      'creator_accepted': DEAL_STATUSES.CREATOR_ACCEPTED,
    },
    [DEAL_STATUSES.CREATOR_ACCEPTED]: {
      'advance_initiated': DEAL_STATUSES.ADVANCE_INITIATED,
    },
    [DEAL_STATUSES.ADVANCE_INITIATED]: {
      'advance_paid': DEAL_STATUSES.ADVANCE_PAID,
    },
    [DEAL_STATUSES.ADVANCE_PAID]: {
      'work_started': DEAL_STATUSES.IN_PROGRESS,
    },
    [DEAL_STATUSES.IN_PROGRESS]: {
      'work_submitted': DEAL_STATUSES.WORK_SUBMITTED,
    },
    [DEAL_STATUSES.WORK_SUBMITTED]: {
      'work_approved': DEAL_STATUSES.WORK_APPROVED,
    },
    [DEAL_STATUSES.WORK_APPROVED]: {
      'final_initiated': DEAL_STATUSES.FINAL_INITIATED,
    },
    [DEAL_STATUSES.FINAL_INITIATED]: {
      'final_paid': DEAL_STATUSES.FINAL_PAID,
    },
    [DEAL_STATUSES.FINAL_PAID]: {
      'complete': DEAL_STATUSES.COMPLETED,
    },
  };

  return transitions[currentStatus]?.[action] || currentStatus;
}

export async function validatePaymentDetails(
  amount: number,
  currency: string = 'INR'
): Promise<{ valid: boolean; error?: string }> {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (amount > 100000000) {
    // 10 crore max per transaction
    return { valid: false, error: 'Amount exceeds maximum limit' };
  }

  if (currency !== 'INR') {
    return { valid: false, error: 'Only INR currency supported' };
  }

  return { valid: true };
}
