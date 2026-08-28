-- Add Google Calendar sync columns to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS calendar_synced_at TIMESTAMP;

-- Add Google OAuth tokens to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deals_google_calendar_event_id ON deals(google_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_accounts_google_access_token ON accounts(google_access_token);
