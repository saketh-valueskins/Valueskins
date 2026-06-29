-- Migration 004: Shared Infrastructure Tables
-- Converts in-memory API stores to PostgreSQL tables
-- Ensures payments, loyalty, and business-profiles data survives restarts and is shared across environments

-- ── Platform Fee Configuration ──
CREATE TABLE IF NOT EXISTS platform_fee_config (
  id TEXT PRIMARY KEY,
  fee_type TEXT NOT NULL DEFAULT 'percentage',
  flat_fee_cents INTEGER,
  percentage_rate NUMERIC NOT NULL DEFAULT 2.0,
  min_fee_cents INTEGER,
  max_fee_cents INTEGER,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Provider Fee Overrides ──
CREATE TABLE IF NOT EXISTS provider_fee_overrides (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  fee_type TEXT,
  flat_fee_cents INTEGER,
  percentage_rate NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Platform Fee Records ──
CREATE TABLE IF NOT EXISTS platform_fee_records (
  id TEXT PRIMARY KEY,
  transaction_id TEXT,
  provider TEXT NOT NULL DEFAULT 'stripe',
  gross_amount_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  net_amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'collected',
  payer_id TEXT,
  payee_id TEXT,
  event_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  collected_at TIMESTAMPTZ DEFAULT now()
);

-- ── Transaction Ledger ──
CREATE TABLE IF NOT EXISTS transaction_ledger (
  id TEXT PRIMARY KEY,
  external_id TEXT,
  provider TEXT NOT NULL DEFAULT 'stripe',
  type TEXT DEFAULT 'payment',
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  gross_amount_cents INTEGER,
  fee_cents INTEGER DEFAULT 0,
  net_amount_cents INTEGER,
  status TEXT DEFAULT 'succeeded',
  payer_id TEXT,
  payee_id TEXT,
  event_id TEXT,
  idempotency_key TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Loyalty Points ──
CREATE TABLE IF NOT EXISTS loyalty_points (
  account_id INTEGER PRIMARY KEY,
  balance INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_points_history (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES loyalty_points(account_id),
  points INTEGER NOT NULL,
  reason TEXT,
  reference_type TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── VIP Tiers ──
CREATE TABLE IF NOT EXISTS vip_tiers (
  account_id INTEGER PRIMARY KEY,
  tier TEXT DEFAULT 'bronze',
  points_threshold INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Badges ──
CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  awarded_at TIMESTAMPTZ DEFAULT now()
);

-- ── Business Profiles ──
CREATE TABLE IF NOT EXISTS business_profiles (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  logo_url TEXT,
  cover_image_url TEXT,
  description TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  country TEXT DEFAULT '',
  google_maps_url TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  social_links JSONB DEFAULT '[]',
  venue_photos JSONB DEFAULT '[]',
  capacity INTEGER DEFAULT 0,
  parking_info TEXT DEFAULT '',
  amenities JSONB DEFAULT '[]',
  dress_code_default TEXT DEFAULT '',
  age_restriction_default INTEGER DEFAULT 0,
  venue_policies TEXT DEFAULT '',
  music_preferences JSONB DEFAULT '[]',
  default_tags JSONB DEFAULT '[]',
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Event Templates ──
CREATE TABLE IF NOT EXISTS event_templates (
  id TEXT PRIMARY KEY,
  business_profile_id TEXT NOT NULL REFERENCES business_profiles(id),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_type TEXT DEFAULT '',
  recurrence_config JSONB DEFAULT '{}',
  template_data JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Promoters ──
CREATE TABLE IF NOT EXISTS promoters (
  id TEXT PRIMARY KEY,
  business_profile_id TEXT NOT NULL REFERENCES business_profiles(id),
  account_id TEXT,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  promoter_type TEXT DEFAULT 'individual',
  status TEXT DEFAULT 'active',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Commissions ──
CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY,
  promoter_id TEXT NOT NULL REFERENCES promoters(id),
  event_id TEXT,
  commission_type TEXT DEFAULT 'percentage',
  fixed_amount_cents INTEGER DEFAULT 0,
  percentage_rate NUMERIC DEFAULT 0,
  tier_config JSONB DEFAULT '[]',
  max_payout_cents INTEGER DEFAULT 0,
  requires_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Referral Links ──
CREATE TABLE IF NOT EXISTS referral_links (
  id TEXT PRIMARY KEY,
  promoter_id TEXT NOT NULL REFERENCES promoters(id),
  event_id TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  referral_url TEXT,
  promo_code TEXT DEFAULT '',
  qr_code_url TEXT,
  unique_clicks INTEGER DEFAULT 0,
  ticket_sales INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  refunds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Payouts ──
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  business_profile_id TEXT NOT NULL REFERENCES business_profiles(id),
  event_id TEXT,
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER DEFAULT 0,
  promoter_commission_cents INTEGER DEFAULT 0,
  net_amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_ref TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Default fee config (one row) ──
INSERT INTO platform_fee_config (id, fee_type, flat_fee_cents, percentage_rate, description)
VALUES ('fee-cfg-default', 'percentage', 0, 2.0, 'Default platform fee: 2% of every ticket transaction')
ON CONFLICT (id) DO NOTHING;

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_payer ON transaction_ledger(payer_id);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_payee ON transaction_ledger(payee_id);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_event ON transaction_ledger(event_id);
CREATE INDEX IF NOT EXISTS idx_platform_fee_records_event ON platform_fee_records(event_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_history_account ON loyalty_points_history(account_id);
CREATE INDEX IF NOT EXISTS idx_badges_account ON badges(account_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_account ON business_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_event_templates_profile ON event_templates(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_promoters_profile ON promoters(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_commissions_promoter ON commissions(promoter_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_promoter ON referral_links(promoter_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_code ON referral_links(referral_code);
CREATE INDEX IF NOT EXISTS idx_payouts_profile ON payouts(business_profile_id);
