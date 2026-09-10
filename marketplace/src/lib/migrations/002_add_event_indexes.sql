-- Event Store Indexes
-- For efficient querying and performance optimization
--
-- Every table indexed here belongs to the event-sourcing schema that shipped
-- with the old Rust services (events_log, subscriptions, user_event_pointers,
-- snapshots, campaigns_view, deals_view). None of them are created by the
-- migrations in this directory, and no application code references them.
--
-- Unguarded, this file aborted the whole migration run against a clean database
-- with 'relation "events_log" does not exist', which is why production had no
-- schema at all. Each block is now conditional: it indexes what exists and is a
-- no-op otherwise, so the file is safe on both a fresh database and a legacy one
-- that still carries these tables.

DO $$
BEGIN
  IF to_regclass('public.events_log') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_events_log_aggregate_id ON events_log(aggregate_id);
    CREATE INDEX IF NOT EXISTS idx_events_log_aggregate_type ON events_log(aggregate_type);
    CREATE INDEX IF NOT EXISTS idx_events_log_event_type ON events_log(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_log_actor_id ON events_log(actor_id);
    CREATE INDEX IF NOT EXISTS idx_events_log_occurred_at ON events_log(occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_log_correlation_id ON events_log(correlation_id);
    CREATE INDEX IF NOT EXISTS idx_events_log_idempotency_key ON events_log(idempotency_key);

    -- Composite indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_events_log_aggregate_type_occurred
      ON events_log(aggregate_type, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_log_aggregate_id_event_type
      ON events_log(aggregate_id, event_type);
  END IF;
END $$;

-- Realtime support indexes
DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_channel ON subscriptions(channel_type, channel_id);
  END IF;

  IF to_regclass('public.user_event_pointers') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_user_event_pointers_user_id ON user_event_pointers(user_id);
  END IF;
END $$;

-- Snapshots indexes
DO $$
BEGIN
  IF to_regclass('public.snapshots') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate_id ON snapshots(aggregate_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate_type ON snapshots(aggregate_type);
  END IF;
END $$;

-- Partial indexes for active records (better selectivity)
DO $$
BEGIN
  IF to_regclass('public.campaigns_view') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_campaigns_view_active
      ON campaigns_view(brand_id)
      WHERE status != 'closed';
  END IF;

  IF to_regclass('public.deals_view') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_deals_view_active
      ON deals_view(status)
      WHERE status NOT IN ('completed', 'cancelled');
    CREATE INDEX IF NOT EXISTS idx_deals_view_brand
      ON deals_view(brand_id)
      WHERE status NOT IN ('completed', 'cancelled');
    CREATE INDEX IF NOT EXISTS idx_deals_view_creator
      ON deals_view(creator_id)
      WHERE status NOT IN ('completed', 'cancelled');
  END IF;
END $$;
