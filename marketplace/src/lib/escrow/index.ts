export {
  createDeal,
  fundEscrow,
  confirmEscrowFunding,
  submitDeliverable,
  approveDeliverables,
  submitAnalytics,
  approveAnalytics,
  requestRevision,
  submitRevision,
  raiseDispute,
  resolveDispute,
  getDealEscrowStatus,
  getAuditLog,
  savePayoutAccountReference,
  autoReleaseExpiredReviewPeriods,
  logAudit,
} from './escrow-engine';

export type {
  EscrowDealInput,
  EscrowDealState,
  MilestoneRelease,
  DeliverableInput,
} from './escrow-engine';
