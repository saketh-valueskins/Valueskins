-- ESCROW V3 - LIABILITY FREE MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
--
-- New tables for liability-free escrow system:
-- 1. payout_links - Creator confirms payout here (explicit action = liability shift)
-- 2. escrow_audit_log - Full audit trail (includes Razorpay webhook confirmations)
--
-- Razorpay now owns all fund transfers and liability.
-- ══════════════════════════════════════════════════════════════════════════════

-- Payout Links Table
-- This is where creator explicitly authorizes transfers
-- No transfer happens without creator confirmation on a payout link
CREATE TABLE IF NOT EXISTS payout_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  milestone_type TEXT NOT NULL, -- 'advance', 'milestone', 'final'
  creator_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,

  -- Razorpay Payout Link ID (from createPayoutLink API)
  razorpay_payout_link_id TEXT UNIQUE,

  -- Razorpay Payout ID (from settlement webhook)
  razorpay_payout_id TEXT UNIQUE,

  -- Status progression:
  -- awaiting_creator_confirmation → creator_confirmed → settled (via webhook) OR failed
  status TEXT NOT NULL DEFAULT 'awaiting_creator_confirmation',

  -- Creator explicitly confirmed via link click
  creator_confirmed_at TIMESTAMP,

  -- Razorpay webhook confirmed settlement
  settled_at TIMESTAMP,

  -- Razorpay webhook confirmed failure
  failed_at TIMESTAMP,
  failure_reason TEXT,

  -- Idempotency key (prevents duplicate payout links)
  idempotency_key TEXT UNIQUE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_milestone_type CHECK (milestone_type IN ('advance', 'milestone', 'final')),
  CONSTRAINT valid_status CHECK (status IN (
    'awaiting_creator_confirmation',
    'creator_confirmed',
    'settled',
    'failed',
    'payout_link_expired'
  ))
);

CREATE INDEX IF NOT EXISTS idx_payout_links_deal_id ON payout_links(deal_id);
CREATE INDEX IF NOT EXISTS idx_payout_links_creator_id ON payout_links(creator_id);
CREATE INDEX IF NOT EXISTS idx_payout_links_status ON payout_links(status);
CREATE INDEX IF NOT EXISTS idx_payout_links_razorpay_payout_id ON payout_links(razorpay_payout_id);

-- Escrow Audit Log
-- Full trail of every action (ValueSkins + Razorpay webhooks)
-- This proves liability transfer to Razorpay
CREATE TABLE IF NOT EXISTS escrow_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  user_id UUID, -- Who performed the action (or NULL for webhooks)

  -- Actor: 'system', 'brand', 'creator', 'razorpay'
  actor TEXT NOT NULL,

  -- Action: 'deal_created', 'escrow_order_created', 'payment_confirmed',
  --         'payout_link_created', 'payout_confirmed', 'payout_settled_webhook', etc.
  action TEXT NOT NULL,

  -- Full details (JSON)
  details JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_actor CHECK (actor IN ('system', 'brand', 'creator', 'razorpay'))
);

CREATE INDEX IF NOT EXISTS idx_audit_deal_id ON escrow_audit_log(deal_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON escrow_audit_log(actor);
CREATE INDEX IF NOT EXISTS idx_audit_action ON escrow_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON escrow_audit_log(created_at DESC);

-- Update milestone_releases to support payout links
-- Add razorpay_payout_id to track which payout link caused settlement
ALTER TABLE milestone_releases ADD COLUMN IF NOT EXISTS razorpay_payout_id TEXT;
ALTER TABLE milestone_releases ADD COLUMN IF NOT EXISTS payout_link_created_at TIMESTAMP;

-- Modify deal_escrow to clarify that Razorpay holds the funds
-- Add note to comment field
ALTER TABLE deal_escrow ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT 'Razorpay holds all funds. ValueSkins has zero custody.';

-- Create view for quick liability verification
-- Shows which actions are Razorpay-confirmed (webhook) vs ValueSkins-recorded
CREATE OR REPLACE VIEW escrow_liability_trail AS
SELECT
  audit.deal_id,
  audit.created_at,
  audit.actor,
  audit.action,
  CASE
    WHEN audit.actor = 'razorpay' THEN 'RAZORPAY CONFIRMS - Razorpay is liable'
    WHEN audit.action = 'payout_confirmed' THEN 'CREATOR AUTHORIZED - Via payout link confirmation'
    WHEN audit.action LIKE 'payout_settled%' THEN 'RAZORPAY EXECUTED - Razorpay is liable'
    WHEN audit.action LIKE 'payout_failed%' THEN 'RAZORPAY FAILED - Razorpay is liable'
    ELSE 'ValueSkins recorded'
  END AS liability_note,
  audit.details
FROM escrow_audit_log audit
ORDER BY audit.deal_id, audit.created_at;

-- Grant permissions
-- (Adjust based on your user roles)
-- GRANT SELECT ON payout_links TO app_user;
-- GRANT INSERT, UPDATE ON payout_links TO app_user;
-- GRANT SELECT, INSERT ON escrow_audit_log TO app_user;
-- GRANT SELECT ON escrow_liability_trail TO app_user;

-- Payout Link Creation Failures Table (for retry logic)
CREATE TABLE IF NOT EXISTS payout_link_creation_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  milestone_type TEXT NOT NULL,
  creator_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  error_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_retry_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_milestone_type_failures CHECK (milestone_type IN ('advance', 'milestone', 'final'))
);

CREATE INDEX IF NOT EXISTS idx_payout_failures_retry ON payout_link_creation_failures(retry_count, last_retry_at);
CREATE INDEX IF NOT EXISTS idx_payout_failures_deal_id ON payout_link_creation_failures(deal_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- FINAL NOTE
-- ══════════════════════════════════════════════════════════════════════════════
--
-- With these tables, the flow is:
-- 1. Brand funds → Razorpay order created (money held by Razorpay)
-- 2. Brand pays → Razorpay payment confirmed
-- 3. Deliverable approved → ValueSkins creates payout link
-- 4. Creator confirms link → Explicit authorization recorded
-- 5. Razorpay processes → Settlement webhook received
-- 6. Audit trail shows Razorpay executed → Razorpay liable, not ValueSkins
--
-- LIABILITY DISTRIBUTION:
-- ✓ Razorpay holds funds
-- ✓ Creator explicitly authorizes each payout
-- ✓ Razorpay confirms settlement via webhook
-- ✓ Audit trail proves who did what
-- ✓ ValueSkins has ZERO LIABILITY for fund transfers
--
-- AUTOMATION:
-- ✓ Payout links synced with Razorpay every 5 minutes (cron)
-- ✓ Failed creations retried automatically
-- ✓ Webhook signatures verified (only real Razorpay webhooks accepted)
-- ✓ Idempotency prevents duplicate processing
--
-- ══════════════════════════════════════════════════════════════════════════════
