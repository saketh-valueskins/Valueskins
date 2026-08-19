-- Event Store Indexes
-- For efficient querying and performance optimization

-- Primary event log indexes
CREATE INDEX IF NOT EXISTS idx_events_log_aggregate_id
ON events_log(aggregate_id);

CREATE INDEX IF NOT EXISTS idx_events_log_aggregate_type
ON events_log(aggregate_type);

CREATE INDEX IF NOT EXISTS idx_events_log_event_type
ON events_log(event_type);

CREATE INDEX IF NOT EXISTS idx_events_log_actor_id
ON events_log(actor_id);

CREATE INDEX IF NOT EXISTS idx_events_log_occurred_at
ON events_log(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_log_correlation_id
ON events_log(correlation_id);

CREATE INDEX IF NOT EXISTS idx_events_log_idempotency_key
ON events_log(idempotency_key);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_log_aggregate_type_occurred
ON events_log(aggregate_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_log_aggregate_id_event_type
ON events_log(aggregate_id, event_type);

-- Realtime support indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_channel
ON subscriptions(channel_type, channel_id);

CREATE INDEX IF NOT EXISTS idx_user_event_pointers_user_id
ON user_event_pointers(user_id);

-- Snapshots index
CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate_id
ON snapshots(aggregate_id);

CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate_type
ON snapshots(aggregate_type);

-- Partial indexes for active records (better selectivity)
CREATE INDEX IF NOT EXISTS idx_campaigns_view_active
ON campaigns_view(brand_id)
WHERE status != 'closed';

CREATE INDEX IF NOT EXISTS idx_deals_view_active
ON deals_view(status)
WHERE status NOT IN ('completed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_deals_view_brand
ON deals_view(brand_id)
WHERE status NOT IN ('completed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_deals_view_creator
ON deals_view(creator_id)
WHERE status NOT IN ('completed', 'cancelled');
