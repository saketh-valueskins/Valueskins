import { query } from './db-pool';

const indexMigrations = [
  {
    name: 'index_sessions_token',
    sql: `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)`,
  },
  {
    name: 'index_deals_creator',
    sql: `CREATE INDEX IF NOT EXISTS idx_deals_creator_id ON deals(creator_id)`,
  },
  {
    name: 'index_deals_brand',
    sql: `CREATE INDEX IF NOT EXISTS idx_deals_brand_id ON deals(brand_id)`,
  },
  {
    name: 'index_deals_creator_created',
    sql: `CREATE INDEX IF NOT EXISTS idx_deals_creator_created ON deals(creator_id, created_at DESC)`,
  },
  {
    name: 'index_deals_brand_created',
    sql: `CREATE INDEX IF NOT EXISTS idx_deals_brand_created ON deals(brand_id, created_at DESC)`,
  },
  {
    name: 'index_deal_messages_deal',
    sql: `CREATE INDEX IF NOT EXISTS idx_deal_messages_deal_created ON deal_messages(deal_id, created_at ASC)`,
  },
  {
    name: 'index_deal_escrow_deal',
    sql: `CREATE INDEX IF NOT EXISTS idx_deal_escrow_deal ON deal_escrow(deal_id)`,
  },
  {
    name: 'index_deal_reviews_deal',
    sql: `CREATE INDEX IF NOT EXISTS idx_deal_reviews_deal ON deal_reviews(deal_id)`,
  },
  {
    name: 'index_user_reputation_account',
    sql: `CREATE INDEX IF NOT EXISTS idx_user_reputation_account ON user_reputation(account_id)`,
  },
  {
    name: 'index_user_reputation_deals',
    sql: `CREATE INDEX IF NOT EXISTS idx_user_reputation_deals ON user_reputation(deals_completed DESC)`,
  },
  {
    name: 'index_auth_sessions_lookup',
    sql: `CREATE INDEX IF NOT EXISTS idx_auth_sessions_lookup ON auth_sessions(id, is_active, expires_at)`,
  },
  {
    name: 'index_notifications_user',
    sql: `CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)`,
  },
  {
    name: 'index_milestone_releases_deal',
    sql: `CREATE INDEX IF NOT EXISTS idx_milestone_releases_deal ON milestone_releases(deal_id, milestone_type, status)`,
  },
  {
    name: 'index_deal_audit_logs_deal',
    sql: `CREATE INDEX IF NOT EXISTS idx_deal_audit_logs_deal ON deal_audit_logs(deal_id, created_at DESC)`,
  },
  {
    name: 'index_creator_payouts_creator',
    sql: `CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator ON creator_payout_accounts(creator_id, verification_status)`,
  },
  {
    name: 'index_deal_review_periods_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_deal_review_periods_status ON deal_review_periods(status, deadline_at) WHERE status = 'open'`,
  },
  {
    name: 'index_deal_disputes_deal',
    sql: `CREATE INDEX IF NOT EXISTS idx_deal_disputes_deal ON deal_disputes(deal_id, status)`,
  },
];

export async function runIndexMigrations() {
  for (const migration of indexMigrations) {
    try {
      await query(migration.sql);
      console.log(`[Index Migration] Applied: ${migration.name}`);
    } catch (err) {
      console.error(`[Index Migration] Failed: ${migration.name}`, err);
    }
  }
  console.log('[Index Migration] All indexes applied');
}
