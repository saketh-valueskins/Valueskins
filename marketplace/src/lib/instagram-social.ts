import { query } from '@/lib/db';

let migrated = false;

/**
 * Ensures the social_media_accounts table exists with all columns the
 * Instagram OAuth flow and sync/snapshot endpoints depend on. Safe to call
 * on every request; idempotent, and never drops existing data.
 */
export async function ensureSocialAccountsTable() {
  if (migrated) return;
  await query(`
    CREATE TABLE IF NOT EXISTS social_media_accounts (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform TEXT NOT NULL DEFAULT 'instagram',
      platform_user_id TEXT NOT NULL,
      username TEXT DEFAULT '',
      account_type TEXT DEFAULT '',
      followers_count INTEGER DEFAULT 0,
      media_count INTEGER DEFAULT 0,
      access_token TEXT DEFAULT '',
      token_expires_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      follower_count_last_synced_at TIMESTAMPTZ,
      UNIQUE(user_id, platform)
    )
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_social_media_accounts_user ON social_media_accounts(user_id)`
  );
  await query(`ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT ''`);
  await query(`ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`);
  await query(`ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS profile_picture_url TEXT DEFAULT ''`);
  // Instagram Graph API user-insights (instagram_business_manage_insights):
  // reach/impressions/profile_views are daily counts; engagement is a rate
  // (accounts_engaged / reach), computed in the sync endpoint.
  await query(`ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS insights_reach INTEGER DEFAULT 0`);
  await query(`ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS insights_impressions INTEGER DEFAULT 0`);
  await query(`ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS insights_profile_views INTEGER DEFAULT 0`);
  await query(`ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS insights_engagement FLOAT DEFAULT 0`);
  await query(`ALTER TABLE social_media_accounts ADD COLUMN IF NOT EXISTS insights_synced_at TIMESTAMPTZ`);
  migrated = true;
}