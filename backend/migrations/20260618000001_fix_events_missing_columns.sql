-- V1 Readiness: Fix all schema gaps blocking launch
-- ===========================================================================

-- 1. ADD MISSING COLUMNS TO events TABLE
--    formToDbColumns() inserts 9 columns that never had ALTER TABLE ADD

ALTER TABLE events ADD COLUMN IF NOT EXISTS parking_car_capacity INT NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS parking_bike_capacity INT NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS parking_capacity INT NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS parking_at_owners_risk BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS parking_details TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS valet_capacity INT NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS valet_details TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS transport_details TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS refund_allowed BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. FIX upgraded_prohibited_items TYPE: TEXT[] -> JSONB
--    Code expects JSONB but efficiency migration created it as TEXT[]

ALTER TABLE events ADD COLUMN IF NOT EXISTS upgraded_prohibited_items_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE events SET upgraded_prohibited_items_jsonb = COALESCE(upgraded_prohibited_items::text::jsonb, '[]'::jsonb) WHERE upgraded_prohibited_items IS NOT NULL;
ALTER TABLE events DROP COLUMN IF EXISTS upgraded_prohibited_items;
ALTER TABLE events RENAME COLUMN upgraded_prohibited_items_jsonb TO upgraded_prohibited_items;

-- 3. ADD MISSING COLUMNS TO users TABLE
--    signup.ts, login.ts, email verification flow all depend on these

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 4. DROP OBSOLETE COLUMNS from old event schema
ALTER TABLE events DROP COLUMN IF EXISTS event_name_display;

-- schema_versions already exists from 20240309000000; do not re-create
