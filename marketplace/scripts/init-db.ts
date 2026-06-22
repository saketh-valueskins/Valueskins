import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // ============================================================
    // CORE TABLES
    // ============================================================

    // Users (from migrations.ts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        display_name VARCHAR(255),
        avatar_url TEXT,
        google_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMPTZ
      );
    `);

    // Auth sessions (from migrations.ts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
        last_activity_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Accounts (from migrations.ts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        website VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Sessions (separate from auth_sessions, used by my-deals.ts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_token TEXT PRIMARY KEY,
        account_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ============================================================
    // DEALS CORE
    // ============================================================

    // Deals (MISSING from all migrations!)
    await client.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        brand_id UUID REFERENCES users(id),
        creator_id UUID REFERENCES users(id),
        status TEXT DEFAULT 'negotiation',
        phase TEXT DEFAULT 'awaiting_response',
        deal_state TEXT DEFAULT 'pending',
        offer_amount DECIMAL(10,2) DEFAULT 0,
        budget DECIMAL(10,2) DEFAULT 0,
        value_skin VARCHAR(100),
        delivery_type TEXT,
        content_type TEXT,
        deliverables JSONB DEFAULT '[]'::jsonb,
        usage_rights_days INT DEFAULT 0,
        exclusive BOOLEAN DEFAULT FALSE,
        exclusivity_days INT DEFAULT 0,
        advance_pct DECIMAL(5,2) DEFAULT 30,
        review_period_days INT DEFAULT 7,
        current_deliverable_version INT DEFAULT 0,
        dispute_id UUID,
        qa_status TEXT,
        qa_reviewed_at TIMESTAMPTZ,
        qa_issues JSONB,
        qa_notes TEXT,
        total_views INT DEFAULT 0,
        analytics_screenshot_link TEXT,
        analytics_status TEXT DEFAULT 'pending',
        analytics_approved_at TIMESTAMPTZ,
        analytics_window_start TIMESTAMPTZ,
        license_expiration_date TIMESTAMPTZ,
        contract_html TEXT,
        contract_generated_at TIMESTAMPTZ,
        content_due_date TIMESTAMPTZ,
        archived BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMPTZ,
        phase_updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Deal messages (from migrations-2.ts addEscrowMigrations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ============================================================
    // DEAL ROOMS & RELATED
    // ============================================================

    // Deal rooms (from workflow-extensions.ts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_rooms (
        id TEXT PRIMARY KEY,
        brand_user_id UUID REFERENCES users(id),
        creator_user_id UUID REFERENCES users(id),
        phase TEXT DEFAULT 'pending',
        status TEXT DEFAULT 'active',
        shoot_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Deal contracts
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_contracts (
        id TEXT PRIMARY KEY,
        deal_id TEXT NOT NULL,
        file_url TEXT,
        terms_text TEXT,
        status TEXT DEFAULT 'pending_review',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Deal deliverables
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_deliverables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id TEXT NOT NULL,
        deliverables_json JSONB DEFAULT '[]'::jsonb,
        revisions_remaining INT DEFAULT 3,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Deal invoices
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id TEXT NOT NULL,
        creator_id UUID REFERENCES users(id),
        brand_id UUID REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        due_date TIMESTAMPTZ,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Deal ratings
    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id TEXT NOT NULL,
        brand_user_id UUID REFERENCES users(id),
        rating INT DEFAULT 5,
        review TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ============================================================
    // DATA REQUESTS, EMAIL VERIFICATION, ETC.
    // ============================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS data_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        request_type VARCHAR(50) NOT NULL,
        token TEXT NOT NULL UNIQUE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        UNIQUE(email, request_type)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS deletion_queue (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        deletion_deadline TIMESTAMPTZ NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        completed_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operation VARCHAR(50) NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        user_id UUID,
        resource_id TEXT,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS campaign_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id TEXT,
        creator_id UUID REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        deal_id TEXT
      );
    `);

    // ============================================================
    // ESCROW & PAYOUT TABLES
    // ============================================================

    await client.query(`
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
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_date TIMESTAMPTZ,
        status VARCHAR(50),
        transaction_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS brand_verification (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_id TEXT NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        domain VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        verified_at TIMESTAMPTZ,
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS brand_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id TEXT NOT NULL UNIQUE,
        parent_brand_id TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(100),
        balance DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_value_skins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        value_skin VARCHAR(100) NOT NULL,
        purchased_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, value_skin)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id TEXT NOT NULL,
        reviewer_id TEXT NOT NULL,
        rating INT DEFAULT 5,
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
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
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_files (
        id UUID PRIMARY KEY,
        deal_id TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50),
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_consents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        consent_type VARCHAR(100) NOT NULL,
        granted BOOLEAN NOT NULL DEFAULT TRUE,
        version VARCHAR(20),
        ip_address INET,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, consent_type)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS shared_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ============================================================
    // ESCROW V2 TABLES
    // ============================================================

    await client.query(`
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
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS deal_milestone_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id TEXT NOT NULL,
        advance_pct DECIMAL(5,2) NOT NULL CHECK (advance_pct >= 0 AND advance_pct <= 100),
        milestone_pcts JSONB DEFAULT '[]'::jsonb,
        final_pct DECIMAL(5,2) NOT NULL CHECK (final_pct >= 0 AND final_pct <= 100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
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
    `);

    await client.query(`
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
    `);

    await client.query(`
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
    `);

    await client.query(`
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
    `);

    await client.query(`
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
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payout_retry_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        milestone_release_id UUID NOT NULL REFERENCES milestone_releases(id),
        attempt INT NOT NULL,
        error_message TEXT,
        error_code VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ============================================================
    // INDEXES
    // ============================================================

    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    // google_id index moved after ALTER TABLE section where column is added
    await client.query('CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_auth_sessions_lookup ON auth_sessions(id, is_active, expires_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deals_creator_id ON deals(creator_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deals_brand_id ON deals(brand_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deals_creator_created ON deals(creator_id, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deals_brand_created ON deals(brand_id, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deal_messages_deal_created ON deal_messages(deal_id, created_at ASC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deal_escrow_deal ON deal_escrow(deal_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deal_reviews_deal ON deal_reviews(deal_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_milestone_releases_deal ON milestone_releases(deal_id, milestone_type, status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deal_audit_logs_deal ON deal_audit_logs(deal_id, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator ON creator_payout_accounts(creator_id, verification_status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deal_review_periods_status ON deal_review_periods(status, deadline_at) WHERE status = \'open\'');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deal_disputes_deal ON deal_disputes(deal_id, status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_data_requests_email ON data_requests(email)');

    // ============================================================
    // ALTER EXISTING TABLES (columns that may have been added later)
    // ============================================================

    // User onboarding columns
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_stage TEXT DEFAULT 'complete'`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_handle TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tiktok_handle TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_handle TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_handle TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_handle TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS niche TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS engagement_rate DECIMAL DEFAULT 0`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS open_for_work BOOLEAN DEFAULT true`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS min_deal_value INTEGER DEFAULT 500`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_deal_types JSONB DEFAULT '["paid"]'::jsonb`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'available'`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS response_time TEXT DEFAULT '24'`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pitch_video_url TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pitch_text TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_items JSONB DEFAULT '[]'::jsonb`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_user_id TEXT`);

    // Deal message hash-chain columns
    await client.query(`ALTER TABLE deal_messages ADD COLUMN IF NOT EXISTS prev_hash TEXT`);
    await client.query(`ALTER TABLE deal_messages ADD COLUMN IF NOT EXISTS hash TEXT`);
    await client.query(`ALTER TABLE deal_messages ADD COLUMN IF NOT EXISTS wal_position TEXT`);
    await client.query(`ALTER TABLE deal_messages ADD COLUMN IF NOT EXISTS consent_logged BOOLEAN DEFAULT FALSE`);

    // Deal escrow enhancements
    await client.query(`ALTER TABLE deal_escrow ADD COLUMN IF NOT EXISTS total_amount_cents BIGINT`);
    await client.query(`ALTER TABLE deal_escrow ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ`);
    await client.query(`ALTER TABLE deal_escrow ADD COLUMN IF NOT EXISTS dispute_frozen BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE deal_escrow ADD COLUMN IF NOT EXISTS dispute_frozen_at TIMESTAMPTZ`);

    // Deal value_skin and archived
    await client.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS value_skin VARCHAR(100)`);
    await client.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE`);

    // Content due date
    await client.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS content_due_date TIMESTAMPTZ`);
    await client.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS advance_pct DECIMAL(5,2) DEFAULT 30`);
    await client.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS review_period_days INT DEFAULT 7`);
    await client.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS current_deliverable_version INT DEFAULT 0`);
    await client.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS dispute_id UUID REFERENCES deal_disputes(id)`);

    console.log('ALL MIGRATIONS COMPLETED SUCCESSFULLY');
  } catch (err) {
    console.error('MIGRATION FAILED:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
