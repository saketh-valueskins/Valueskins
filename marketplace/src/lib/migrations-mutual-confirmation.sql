-- MUTUAL CONFIRMATION TABLES
-- ══════════════════════════════════════════════════════════════════════════════
--
-- ZERO LIABILITY for ValueSkins business logic decisions.
-- Both parties must explicitly confirm before payout link created.
-- ValueSkins is only a record keeper, not a decision maker.
--
-- ══════════════════════════════════════════════════════════════════════════════

-- Track mutual confirmations
CREATE TABLE IF NOT EXISTS mutual_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL UNIQUE,

  -- Brand approval
  brand_approved BOOLEAN DEFAULT false,
  brand_approved_at TIMESTAMP,
  brand_approval_notes TEXT,

  -- Creator confirmation
  creator_confirmed BOOLEAN DEFAULT false,
  creator_confirmed_at TIMESTAMP,
  creator_confirmation_notes TEXT,

  -- Payout trigger
  payout_link_created_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT at_least_one_confirmation CHECK (
    brand_approved OR creator_confirmed
  )
);

CREATE INDEX IF NOT EXISTS idx_mutual_confirmations_deal_id ON mutual_confirmations(deal_id);
CREATE INDEX IF NOT EXISTS idx_mutual_confirmations_both_confirmed
  ON mutual_confirmations(brand_approved, creator_confirmed)
  WHERE brand_approved = true AND creator_confirmed = true;

-- Audit trail for mutual confirmations
CREATE TABLE IF NOT EXISTS confirmation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  user_id UUID,

  -- Actor: 'brand', 'creator', 'system'
  actor TEXT NOT NULL,

  -- Action: 'approved_deliverable', 'confirmed_delivery', 'both_confirmed_payout_triggered'
  action TEXT NOT NULL,

  -- Full details (JSON)
  details JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_actor CHECK (actor IN ('brand', 'creator', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_confirmation_audit_deal_id ON confirmation_audit_log(deal_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_audit_actor ON confirmation_audit_log(actor);
CREATE INDEX IF NOT EXISTS idx_confirmation_audit_action ON confirmation_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_confirmation_audit_created_at ON confirmation_audit_log(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- WORKFLOW WITH ZERO BUSINESS LOGIC LIABILITY
-- ══════════════════════════════════════════════════════════════════════════════
--
-- BEFORE:
-- 1. Brand approves → ValueSkins decides "payout now"
-- 2. ValueSkins transfers → ValueSkins liable if decision wrong
--
-- AFTER:
-- 1. Brand approves → Records: mutual_confirmations(brand_approved=true)
-- 2. Creator confirms → Records: mutual_confirmations(creator_confirmed=true)
-- 3. Both signed off → Auto-trigger payout link creation
-- 4. Both parties on-chain in audit log
-- 5. Neither can claim they didn't authorize
--
-- RESULT:
-- ✓ ValueSkins is only a record keeper
-- ✓ Both parties explicitly signed off
-- ✓ Audit trail proves mutual consent
-- ✓ ValueSkins has ZERO liability for approval decision
-- ✓ Only liable for: accurately recording mutual consent
--
-- ══════════════════════════════════════════════════════════════════════════════

-- View: Proof of mutual consent
CREATE OR REPLACE VIEW mutual_confirmation_proof AS
SELECT
  mc.deal_id,
  mc.brand_approved,
  mc.brand_approved_at,
  mc.brand_approval_notes,
  mc.creator_confirmed,
  mc.creator_confirmed_at,
  mc.creator_confirmation_notes,
  mc.payout_link_created_at,
  CASE
    WHEN mc.brand_approved AND mc.creator_confirmed THEN 'BOTH_CONFIRMED'
    WHEN mc.brand_approved THEN 'BRAND_APPROVED_ONLY'
    WHEN mc.creator_confirmed THEN 'CREATOR_CONFIRMED_ONLY'
    ELSE 'NO_CONFIRMATION'
  END AS confirmation_status,
  'Both parties explicitly signed off. ValueSkins zero liability for decision.' AS liability_note
FROM mutual_confirmations mc;
