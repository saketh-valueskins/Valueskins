-- ============================================================
-- Escrow & Automated Payout System — Full Migration
-- ============================================================
-- This migration builds the complete escrow infrastructure:
--   • Creator payout accounts (no raw bank details stored)
--   • Deal milestones with percentage splits
--   • Deliverable submissions with versioning
--   • Dispute management
--   • Immutable audit log
--   • Enhanced escrow table with multi-stage release
-- ============================================================

BEGIN;

-- ── CREATOR PAYOUT ACCOUNTS ──
-- ValueSkins stores ONLY references from the payment provider.
-- No bank account numbers, IFSC codes, or sensitive data.
CREATE TABLE IF NOT EXISTS creator_payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_provider VARCHAR(50) NOT NULL DEFAULT 'razorpay',
  payout_account_id VARCHAR(255) NOT NULL,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  last_four_digits VARCHAR(4),
  beneficiary_name VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, payout_account_id)
);

CREATE INDEX IF NOT EXISTS idx_payout_accounts_creator ON creator_payout_accounts(creator_id);

-- ── DEAL MILESTONE TEMPLATES ──
-- Defines the % split for a deal: advance, milestones, final
-- Stored per-deal so each deal can have its own structure
CREATE TABLE IF NOT EXISTS deal_milestone_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  advance_pct DECIMAL(5,2) NOT NULL CHECK (advance_pct >= 0 AND advance_pct <= 100),
  milestone_pcts JSONB DEFAULT '[]'::jsonb,
  final_pct DECIMAL(5,2) NOT NULL CHECK (final_pct >= 0 AND final_pct <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_split CHECK (
    COALESCE(advance_pct, 0) +
    COALESCE((SELECT SUM(value::decimal) FROM jsonb_array_elements_text(COALESCE(milestone_pcts, '[]'::jsonb))), 0) +
    COALESCE(final_pct, 0) = 100
  )
);

CREATE INDEX IF NOT EXISTS idx_milestone_templates_deal ON deal_milestone_templates(deal_id);

-- ── MILESTONE RELEASES ──
-- Tracks each milestone release (advance, milestones, final)
CREATE TABLE IF NOT EXISTS milestone_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  milestone_type VARCHAR(50) NOT NULL CHECK (milestone_type IN ('advance', 'milestone', 'final')),
  milestone_index INT DEFAULT 0,
  amount_cents BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  razorpay_transfer_id VARCHAR(255),
  released_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestone_releases_deal ON milestone_releases(deal_id);
CREATE INDEX IF NOT EXISTS idx_milestone_releases_status ON milestone_releases(status);

-- ── DELIVERABLES ──
-- Each row = one deliverable submission with file metadata
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size_bytes BIGINT,
  version INT NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'revision_requested', 'revision_submitted')),
  reviewer_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deliverables_deal ON deliverables(deal_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(deal_id, status);

-- ── DEAL REVIEW PERIODS ──
-- Tracks review windows and auto-approval deadlines
CREATE TABLE IF NOT EXISTS deal_review_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  milestone_release_id UUID REFERENCES milestone_releases(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  deadline_at TIMESTAMPTZ NOT NULL,
  auto_approved BOOLEAN DEFAULT FALSE,
  auto_approved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'revision_requested', 'disputed', 'auto_approved', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_review_periods_deal ON deal_review_periods(deal_id);
CREATE INDEX IF NOT EXISTS idx_review_periods_deadline ON deal_review_periods(deadline_at) WHERE status = 'open';

-- ── DEAL DISPUTES ──
CREATE TABLE IF NOT EXISTS deal_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  raised_by UUID NOT NULL REFERENCES users(id),
  reason VARCHAR(50) NOT NULL CHECK (reason IN (
    'deliverable_not_as_agreed', 'missed_deadline', 'quality_issues',
    'scope_disagreement', 'communication_breakdown', 'other'
  )),
  description TEXT NOT NULL,
  evidence_urls JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_creator', 'resolved_brand', 'resolved_split', 'dismissed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  payout_adjustment_pct DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_deal ON deal_disputes(deal_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON deal_disputes(status);

-- ── DEAL AUDIT LOG ──
-- Immutable log of every action taken on a deal
CREATE TABLE IF NOT EXISTS deal_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  actor_id UUID REFERENCES users(id),
  actor_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_deal ON deal_audit_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON deal_audit_logs(created_at DESC);

-- ── PAYOUT FAILURE LOG ──
-- Tracks retry attempts for failed payouts
CREATE TABLE IF NOT EXISTS payout_retry_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_release_id UUID NOT NULL REFERENCES milestone_releases(id),
  attempt INT NOT NULL,
  error_message TEXT,
  error_code VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retry_log_release ON payout_retry_log(milestone_release_id);

-- ── ENHANCE EXISTING DEAL_ESCROW ──
-- Add columns for full-amount escrow with staged release
ALTER TABLE deal_escrow ADD COLUMN IF NOT EXISTS total_amount_cents BIGINT;
ALTER TABLE deal_escrow ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ;
ALTER TABLE deal_escrow ADD COLUMN IF NOT EXISTS dispute_frozen BOOLEAN DEFAULT FALSE;
ALTER TABLE deal_escrow ADD COLUMN IF NOT EXISTS dispute_frozen_at TIMESTAMPTZ;

-- ── ENHANCE DEALS TABLE ──
ALTER TABLE deals ADD COLUMN IF NOT EXISTS advance_pct DECIMAL(5,2) DEFAULT 30;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS review_period_days INT DEFAULT 7;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS current_deliverable_version INT DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS dispute_id UUID REFERENCES deal_disputes(id);

COMMIT;
