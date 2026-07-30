-- Migration 000: Base schema for empty database
-- Created: 2026-07-25
-- Purpose: All tables the app expects on first boot

-- ── Accounts (parent entity for brands/creators) ──
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  display_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  user_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users (core auth + profile) ──
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  instagram_user_id TEXT DEFAULT '',
  email TEXT DEFAULT '',
  username TEXT DEFAULT '',
  display_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  role VARCHAR(20) DEFAULT 'creator',
  onboarding_stage TEXT DEFAULT 'complete',
  account_id BIGINT REFERENCES accounts(id),
  password_hash TEXT DEFAULT '',
  email_verified BOOLEAN DEFAULT FALSE,

  -- Creator profile columns
  bio TEXT DEFAULT '',
  location TEXT DEFAULT '',
  country TEXT DEFAULT '',
  niche TEXT DEFAULT '',
  website TEXT DEFAULT '',
  instagram_handle TEXT DEFAULT '',
  tiktok_handle TEXT DEFAULT '',
  youtube_handle TEXT DEFAULT '',
  twitter_handle TEXT DEFAULT '',
  linkedin_handle TEXT DEFAULT '',
  followers_count INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  languages JSONB DEFAULT '[]'::jsonb,
  open_for_work BOOLEAN DEFAULT TRUE,
  min_deal_value INTEGER DEFAULT 500,
  preferred_deal_types JSONB DEFAULT '["paid","barter"]'::jsonb,
  availability TEXT DEFAULT 'available',
  response_time TEXT DEFAULT '24',
  pitch_video_url TEXT DEFAULT '',
  pitch_text TEXT DEFAULT '',
  portfolio_items JSONB DEFAULT '[]',
  modules JSONB DEFAULT '[]',

  -- Safety / retention
  retention_country VARCHAR(2) DEFAULT 'US',
  is_anonymized BOOLEAN DEFAULT FALSE,
  anonymized_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,
  agency_settings JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_users_instagram ON users(instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_account ON users(account_id);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);

-- ── Auth Sessions ──
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

-- ── Deals ──
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id BIGINT,
  creator_id BIGINT,
  partner_id BIGINT,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  phase TEXT DEFAULT 'proposed',
  amount DECIMAL(10,2) DEFAULT 0,
  value_skin VARCHAR(100),
  archived BOOLEAN DEFAULT FALSE,
  content_due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Deal Messages (with hash chain) ──
CREATE TABLE IF NOT EXISTS deal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  prev_hash TEXT,
  hash TEXT,
  wal_position TEXT,
  consent_logged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_messages_deal_id ON deal_messages(deal_id);

-- ── Deal Reviews ──
CREATE TABLE IF NOT EXISTS deal_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  rating INT DEFAULT 5,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_reviews_deal_id ON deal_reviews(deal_id);

-- ── Deal Escrow ──
CREATE TABLE IF NOT EXISTS deal_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL UNIQUE,
  razorpay_order_id VARCHAR(255) NOT NULL UNIQUE,
  razorpay_payment_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_deal_escrow_deal_id ON deal_escrow(deal_id);

-- ── Deal Payments ──
CREATE TABLE IF NOT EXISTS deal_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMPTZ,
  status VARCHAR(50),
  transaction_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_payments_deal_id ON deal_payments(deal_id);

-- ── Deal Reminders ──
CREATE TABLE IF NOT EXISTS deal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  reminder_date TIMESTAMPTZ NOT NULL,
  reminded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, deal_id, type)
);

-- ── Deal Files ──
CREATE TABLE IF NOT EXISTS deal_files (
  id UUID PRIMARY KEY,
  deal_id TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Deal Milestones ──
CREATE TABLE IF NOT EXISTS deal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliverable_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL,
  reviewer_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Brand Verification ──
CREATE TABLE IF NOT EXISTS brand_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Brand Locations ──
CREATE TABLE IF NOT EXISTS brand_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL UNIQUE,
  parent_brand_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  balance DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Brand Registrations ──
CREATE TABLE IF NOT EXISTS brand_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  brand_name TEXT NOT NULL,
  industry TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Value Skins ──
CREATE TABLE IF NOT EXISTS user_value_skins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  value_skin VARCHAR(100) NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, value_skin)
);
CREATE INDEX IF NOT EXISTS idx_user_value_skins ON user_value_skins(user_id);

-- ── User ValueSkins (alternate table name) ──
CREATE TABLE IF NOT EXISTS user_valueskins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  profession TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, profession)
);

-- ── Creator Skins ──
CREATE TABLE IF NOT EXISTS creator_skins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  value_skin VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, value_skin)
);

-- ── Notifications ──
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ── Campaigns ──
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  brand_id TEXT,
  brand_name TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  budget NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_invites (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  creator_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Campaign Bids ──
CREATE TABLE IF NOT EXISTS campaign_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  creator_id BIGINT NOT NULL,
  amount NUMERIC NOT NULL,
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Briefs ──
CREATE TABLE IF NOT EXISTS briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Shared State (realtime sync) ──
CREATE TABLE IF NOT EXISTS shared_state (
  id TEXT PRIMARY KEY DEFAULT 'global',
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Delivery Tracking ──
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Email Verifications ──
CREATE TABLE IF NOT EXISTS email_verifications (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Email Preferences ──
CREATE TABLE IF NOT EXISTS user_email_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  marketing BOOLEAN DEFAULT FALSE,
  notifications BOOLEAN DEFAULT TRUE,
  product_updates BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Locations ──
CREATE TABLE IF NOT EXISTS user_locations (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  city TEXT DEFAULT '',
  country TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Consents (GDPR) ──
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  version VARCHAR(20),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);
CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id);

-- ── Deletion Queue ──
CREATE TABLE IF NOT EXISTS deletion_queue (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  deletion_deadline TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  export_id UUID,
  retention_months INT DEFAULT 0,
  cancelled_at TIMESTAMPTZ
);

-- ── Pending Deletion Exports ──
CREATE TABLE IF NOT EXISTS pending_deletion_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  history_pdf_base64 TEXT NOT NULL,
  compliance_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- ── Audit Logs ──
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation VARCHAR(50) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  user_id BIGINT,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- ── Data Requests (GDPR) ──
CREATE TABLE IF NOT EXISTS data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ── Creator Ratings ──
CREATE TABLE IF NOT EXISTS creator_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id BIGINT NOT NULL,
  rater_id BIGINT NOT NULL,
  rating INT DEFAULT 5,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Creator Social Stats ──
CREATE TABLE IF NOT EXISTS creator_social_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id BIGINT NOT NULL,
  platform TEXT NOT NULL,
  followers INTEGER DEFAULT 0,
  engagement NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Platform Fee Config ──
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

-- ── Loyalty Points ──
CREATE TABLE IF NOT EXISTS loyalty_points (
  account_id BIGINT PRIMARY KEY,
  balance INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_points_history (
  id SERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES loyalty_points(account_id),
  points INTEGER NOT NULL,
  reason TEXT,
  reference_type TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Badges ──
CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  awarded_at TIMESTAMPTZ DEFAULT now()
);

-- ── Financial Config ──
CREATE TABLE IF NOT EXISTS financial_config (
  id TEXT PRIMARY KEY,
  config JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Blacklist ──
CREATE TABLE IF NOT EXISTS blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_account_id BIGINT NOT NULL,
  blocked_account_id BIGINT NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_account_id, blocked_account_id)
);

-- Default platform fee
INSERT INTO platform_fee_config (id, fee_type, flat_fee_cents, percentage_rate, description)
VALUES ('fee-cfg-default', 'percentage', 0, 2.0, 'Default platform fee: 2%')
ON CONFLICT (id) DO NOTHING;
