-- ==========================================================================
-- Security & Scalability: RLS policies, audit trail, account lockout, idempotency
-- ==========================================================================

-- ──────────────────────────────────────────────────────────────
-- 1. AUDIT LOG (immutable, append-only for compliance)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name      TEXT NOT NULL,
    operation       TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id       TEXT,
    old_values      JSONB,
    new_values      JSONB,
    account_id      BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    ip_address      INET,
    user_agent      TEXT,
    correlation_id  UUID,
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_op ON audit_log(table_name, operation, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_account ON audit_log(account_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON audit_log(performed_at DESC);

-- ──────────────────────────────────────────────────────────────
-- 2. IDEMPOTENCY CACHE (prevent duplicate payment processing)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idempotency_cache (
    idempotency_key UUID PRIMARY KEY,
    request_hash    BYTEA NOT NULL,
    response        JSONB NOT NULL,
    status_code     INT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_cache(expires_at);

-- ──────────────────────────────────────────────────────────────
-- 3. ACCOUNT LOCKOUT TRACKING
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
    id              BIGSERIAL PRIMARY KEY,
    email           TEXT NOT NULL,
    account_id      BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    ip_address      INET NOT NULL,
    attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success         BOOLEAN NOT NULL,
    failure_reason  TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_account ON login_attempts(account_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at DESC);

-- Add login attempt tracking columns to accounts (if not exist)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS lock_reason TEXT;

-- ──────────────────────────────────────────────────────────────
-- 3b. AUTH SESSIONS (short-lived with idle timeout)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_sessions (
    id              TEXT PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at      TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_activity ON auth_sessions(last_activity_at);

-- ──────────────────────────────────────────────────────────────
-- 4. API KEYS (service-to-service auth)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_prefix      TEXT NOT NULL UNIQUE,
    key_hash        TEXT NOT NULL,
    name            TEXT NOT NULL,
    account_id      BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    tier            TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
    permissions     TEXT[] NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limit_rpm  INT NOT NULL DEFAULT 100,
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix) WHERE is_active = TRUE AND revoked_at IS NULL;

-- ──────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY POLICIES
-- ──────────────────────────────────────────────────────────────

-- Helper function to get current account ID from session
CREATE OR REPLACE FUNCTION auth.account_id() RETURNS BIGINT
    LANGUAGE SQL STABLE SECURITY DEFINER
    SET search_path = public
AS $$
    SELECT NULLIF(current_setting('app.current_account_id', TRUE), '')::BIGINT;
$$;

-- Helper function to check if current user has admin role
CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN
    LANGUAGE SQL STABLE SECURITY DEFINER
    SET search_path = public
AS $$
    SELECT current_setting('app.current_role', TRUE) = 'admin';
$$;

-- Helper function for audit triggers
CREATE OR REPLACE FUNCTION log_audit_event() RETURNS TRIGGER
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
AS $$
DECLARE
    _account_id BIGINT;
    _old JSONB;
    _new JSONB;
BEGIN
    _account_id := NULLIF(current_setting('app.current_account_id', TRUE), '')::BIGINT;

    IF TG_OP = 'DELETE' THEN
        _old := to_jsonb(OLD);
        INSERT INTO audit_log (table_name, operation, record_id, old_values, account_id)
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id::TEXT, _old, _account_id);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        _old := to_jsonb(OLD);
        _new := to_jsonb(NEW);
        IF _old IS DISTINCT FROM _new THEN
            INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values, account_id)
            VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id::TEXT, _old, _new, _account_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        _new := to_jsonb(NEW);
        INSERT INTO audit_log (table_name, operation, record_id, new_values, account_id)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id::TEXT, _new, _account_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- ENABLE RLS ON ALL SENSITIVE TABLES
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_valueskins ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_valueskins ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ACCOUNTS: users can only see their own account
CREATE POLICY account_isolation ON accounts
    FOR ALL
    USING (id = auth.account_id() OR auth.is_admin());

-- SESSIONS: users can only see their own sessions
CREATE POLICY session_isolation ON sessions
    FOR ALL
    USING (account_id = auth.account_id() OR auth.is_admin());

-- USER_MODULES: users can see their own modules
CREATE POLICY module_isolation ON user_modules
    FOR ALL
    USING (account_id = auth.account_id() OR auth.is_admin());

-- USERS: users can see their own legacy profile
CREATE POLICY user_isolation ON users
    FOR SELECT
    USING (id = (SELECT legacy_user_id FROM accounts WHERE id = auth.account_id()) OR auth.is_admin());

-- PERSONAS: owners can manage, others can read public
CREATE POLICY persona_select ON personas
    FOR SELECT
    USING (exists = TRUE);

CREATE POLICY persona_manage ON personas
    FOR ALL
    USING (owner_user_id = (SELECT legacy_user_id FROM accounts WHERE id = auth.account_id()) OR auth.is_admin());

-- PERSONA PROFESSIONS: owners can manage, others can read public
CREATE POLICY persona_professions_select ON persona_professions
    FOR SELECT
    USING (TRUE);

CREATE POLICY persona_professions_manage ON persona_professions
    FOR ALL
    USING (persona_id IN (
        SELECT id FROM personas WHERE owner_user_id = (SELECT legacy_user_id FROM accounts WHERE id = auth.account_id())
    ) OR auth.is_admin());

-- POSTS: owners can manage, others can read public
CREATE POLICY posts_select ON posts
    FOR SELECT
    USING (TRUE);

CREATE POLICY posts_manage ON posts
    FOR ALL
    USING (author_persona_id IN (
        SELECT id FROM personas WHERE owner_user_id = (SELECT legacy_user_id FROM accounts WHERE id = auth.account_id())
    ) OR auth.is_admin());

-- DEAL ROOMS: participants only
CREATE POLICY deal_rooms_select ON deal_rooms
    FOR SELECT
    USING (creator_id = auth.account_id() OR brand_id = auth.account_id() OR auth.is_admin());

CREATE POLICY deal_rooms_manage ON deal_rooms
    FOR ALL
    USING (creator_id = auth.account_id() OR brand_id = auth.account_id() OR auth.is_admin());

-- DEAL ROOM MESSAGES: participants only
CREATE POLICY deal_room_messages_select ON deal_room_messages
    FOR SELECT
    USING (deal_room_id IN (
        SELECT id FROM deal_rooms WHERE creator_id = auth.account_id() OR brand_id = auth.account_id()
    ) OR auth.is_admin());

CREATE POLICY deal_room_messages_insert ON deal_room_messages
    FOR INSERT
    WITH CHECK (sender_id = auth.account_id());

-- NOTIFICATIONS: recipient only
CREATE POLICY notifications_isolation ON notifications
    FOR ALL
    USING (user_id = auth.account_id() OR user_id = (SELECT legacy_user_id FROM accounts WHERE id = auth.account_id()) OR auth.is_admin());

-- AUDIT LOG: admins only (append-only for regular users via trigger)
CREATE POLICY audit_log_admin ON audit_log
    FOR SELECT
    USING (auth.is_admin());

CREATE POLICY audit_log_insert ON audit_log
    FOR INSERT
    WITH CHECK (auth.is_admin() OR current_setting('app.current_account_id', TRUE) = '');

-- ──────────────────────────────────────────────────────────────
-- 6. AUDIT TRIGGERS ON SENSITIVE TABLES
-- ──────────────────────────────────────────────────────────────
CREATE TRIGGER audit_accounts AFTER INSERT OR UPDATE OR DELETE ON accounts
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_sessions AFTER INSERT OR UPDATE OR DELETE ON sessions
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_deals AFTER INSERT OR UPDATE OR DELETE ON deals
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_contracts AFTER INSERT OR UPDATE OR DELETE ON contracts
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_disputes AFTER INSERT OR UPDATE OR DELETE ON disputes
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ──────────────────────────────────────────────────────────────
-- 7. SESSION CLEANUP (auto-expire old sessions)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at) WHERE is_active = TRUE;

-- Helper: cleanup expired sessions (call via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS BIGINT
    LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    deleted_count BIGINT;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW() AND is_active = TRUE;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 8. ACCOUNT LOCKOUT HELPER
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_account_lockout(p_account_id BIGINT) RETURNS TABLE (
    is_locked BOOLEAN,
    locked_until TIMESTAMPTZ,
    remaining_attempts INT
)
    LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    _locked_until TIMESTAMPTZ;
    _failed_attempts INT;
    _lockout_threshold INT := 5;
    _lockout_duration INTERVAL := INTERVAL '15 minutes';
BEGIN
    SELECT a.locked_until, a.failed_login_attempts
    INTO _locked_until, _failed_attempts
    FROM accounts a WHERE a.id = p_account_id;

    IF _locked_until IS NOT NULL AND _locked_until > NOW() THEN
        RETURN QUERY SELECT TRUE, _locked_until, 0;
        RETURN;
    END IF;

    IF _locked_until IS NOT NULL AND _locked_until <= NOW() THEN
        UPDATE accounts SET locked_until = NULL, lock_reason = NULL, failed_login_attempts = 0
        WHERE id = p_account_id;
        _failed_attempts := 0;
    END IF;

    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, GREATEST(_lockout_threshold - _failed_attempts, 0);
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 9. DATA RETENTION CLEANUP (GDPR)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS BIGINT
    LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    total BIGINT := 0;
BEGIN
    -- Expired idempotency keys (keep 24h)
    DELETE FROM idempotency_cache WHERE expires_at < NOW();
    total := total + 1;

    -- Login attempts older than 90 days
    DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '90 days';
    total := total + 1;

    RETURN total;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 10. HOT-PATH INDEXES FOR 100k CONCURRENT USERS
-- ──────────────────────────────────────────────────────────────

-- Events: quick lookups by status + date range
CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, start_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_event_registrations_user ON event_registrations(user_id, event_id);

-- Deals: active deals by participant
CREATE INDEX IF NOT EXISTS idx_deals_participants ON deals(creator_id, brand_id, status) WHERE status NOT IN ('completed', 'cancelled');

-- Notifications: pending notifications for user
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notifications(user_id, is_read, created_at DESC) WHERE NOT is_read;

-- Messages: recent messages per deal room
CREATE INDEX IF NOT EXISTS idx_deal_room_messages_recent ON deal_room_messages(deal_room_id, created_at DESC);

-- User profiles: active users lookup
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, last_login_at DESC) WHERE is_active = TRUE;

-- Referral codes: quick validation
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(code) WHERE is_active = TRUE AND expires_at > NOW();

-- ──────────────────────────────────────────────────────────────
-- 11. DATA RETENTION POLICIES FOR NEW TABLES
-- ──────────────────────────────────────────────────────────────

INSERT INTO data_retention_policies (table_name, retention_days, cleanup_column) VALUES
    ('idempotency_cache', 2, 'expires_at'),
    ('auth_sessions', 1, 'expires_at'),
    ('login_attempts', 90, 'attempted_at'),
    ('audit_log', 365, 'timestamp')
ON CONFLICT (table_name) DO NOTHING
