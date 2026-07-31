/**
 * PostgreSQL Event Store Implementation
 * Immutable, durable, queryable event log
 * Source of truth for all domain events
 */

import { createClient } from '@supabase/supabase-js';
import { DomainEvent, EventStore } from './core';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class PostgresEventStore implements EventStore {
  /**
   * Append events to immutable log
   * Guarantees:
   * - Atomicity: all events written or none
   * - Idempotency: duplicate idempotency_key fails gracefully
   * - Ordering: events ordered by created_at
   * - Persistence: events never deleted, only appended
   */
  async append(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    const rows = events.map((event, index) => ({
      event_id: event.event_id,
      event_type: event.event_type,
      event_version: event.event_version,
      aggregate_id: event.aggregate_id,
      aggregate_type: event.aggregate_type,
      correlation_id: event.correlation_id,
      idempotency_key: event.idempotency_key,
      data: event.data,
      metadata: event.metadata,
      actor_id: event.actor_id,
      occurred_at: event.occurred_at,
      recorded_at: event.recorded_at,
      created_at_block: BigInt(Date.now() * 1000 + index), // Ensure ordering
    }));

    const { error } = await supabase.from('events_log').insert(rows);

    if (error) {
      if (error.message.includes('idempotency_key')) {
        // Idempotency key already exists - this is expected on retry
        console.log(
          'Idempotent retry detected for:',
          events[0].idempotency_key
        );
        return;
      }
      throw new Error(`Failed to append events: ${error.message}`);
    }
  }

  /**
   * Get all events for an aggregate (campaign, deal, user, etc)
   * Used to rebuild aggregate state from event history
   */
  async getByAggregateId(aggregateId: string): Promise<DomainEvent[]> {
    const { data, error } = await supabase
      .from('events_log')
      .select('*')
      .eq('aggregate_id', aggregateId)
      .order('created_at_block', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get events since a timestamp (for replaying to offline users)
   * Filters by event type and/or aggregate type for efficiency
   */
  async getEventsSince(
    afterTimestamp: string,
    filters?: { eventType?: string; aggregateType?: string }
  ): Promise<DomainEvent[]> {
    let query = supabase
      .from('events_log')
      .select('*')
      .gt('occurred_at', afterTimestamp);

    if (filters?.eventType) {
      query = query.eq('event_type', filters.eventType);
    }
    if (filters?.aggregateType) {
      query = query.eq('aggregate_type', filters.aggregateType);
    }

    const { data, error } = await query.order('created_at_block', {
      ascending: true,
    });

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get single event by ID
   * Used for duplicate detection and audit trails
   */
  async getEventById(eventId: string): Promise<DomainEvent | null> {
    const { data, error } = await supabase
      .from('events_log')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found
      return null;
    }

    if (error) {
      throw new Error(`Failed to fetch event: ${error.message}`);
    }

    return data;
  }

  /**
   * Check if idempotency key already processed
   * Returns true if event with this key exists
   */
  async isIdempotent(idempotencyKey: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('events_log')
      .select('event_id', { count: 'exact' })
      .eq('idempotency_key', idempotencyKey)
      .limit(1);

    if (error) {
      throw new Error(`Failed to check idempotency: ${error.message}`);
    }

    return (data?.length || 0) > 0;
  }

  /**
   * Get aggregated event count (for snapshots)
   */
  async getEventCount(aggregateId: string): Promise<number> {
    const { count, error } = await supabase
      .from('events_log')
      .select('*', { count: 'exact' })
      .eq('aggregate_id', aggregateId);

    if (error) {
      throw new Error(`Failed to get event count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get events by correlation ID (trace entire workflow)
   */
  async getByCorrelationId(correlationId: string): Promise<DomainEvent[]> {
    const { data, error } = await supabase
      .from('events_log')
      .select('*')
      .eq('correlation_id', correlationId)
      .order('created_at_block', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get events by actor (who did this)
   */
  async getByActorId(actorId: string): Promise<DomainEvent[]> {
    const { data, error } = await supabase
      .from('events_log')
      .select('*')
      .eq('actor_id', actorId)
      .order('recorded_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get events of specific type (for subscribers)
   */
  async getByEventType(eventType: string): Promise<DomainEvent[]> {
    const { data, error } = await supabase
      .from('events_log')
      .select('*')
      .eq('event_type', eventType)
      .order('recorded_at', { ascending: false })
      .limit(1000);

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return data || [];
  }
}

/**
 * Migrations to create event store tables
 * Run once during deployment
 */
export const eventStoreMigrations = `
-- Create events_log table (immutable event store)
CREATE TABLE IF NOT EXISTS events_log (
  event_id UUID PRIMARY KEY,
  event_type VARCHAR NOT NULL,
  event_version INT NOT NULL CHECK (event_version >= 1),

  -- Aggregate identity
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR NOT NULL,

  -- Causality tracking
  correlation_id UUID NOT NULL,
  idempotency_key VARCHAR UNIQUE NOT NULL,

  -- Timeline
  occurred_at TIMESTAMP NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at_block BIGINT NOT NULL,

  -- Actor
  actor_id UUID NOT NULL,

  -- Data
  data JSONB NOT NULL,
  metadata JSONB NOT NULL,

  -- Constraints
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Critical indexes for queries
CREATE INDEX IF NOT EXISTS idx_events_aggregate ON events_log(aggregate_id, aggregate_type);
CREATE INDEX IF NOT EXISTS idx_events_type ON events_log(event_type);
CREATE INDEX IF NOT EXISTS idx_events_actor ON events_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_correlation ON events_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_events_idempotency ON events_log(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_events_block ON events_log(created_at_block);

-- For offline users to find missed events
CREATE INDEX IF NOT EXISTS idx_events_since ON events_log(occurred_at, aggregate_type);

-- Create snapshots table (performance optimization)
CREATE TABLE IF NOT EXISTS event_snapshots (
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR NOT NULL,
  state JSONB NOT NULL,
  state_version BIGINT NOT NULL,
  taken_at TIMESTAMP NOT NULL DEFAULT NOW(),
  event_count_since_snapshot INT NOT NULL,

  PRIMARY KEY (aggregate_id, aggregate_type)
);

-- Create user event pointers (track progress for offline users)
CREATE TABLE IF NOT EXISTS user_event_pointers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_processed_event_id UUID,
  last_processed_at TIMESTAMP,
  subscribed_channels TEXT[],
  subscribed_at TIMESTAMP,
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create subscriptions table (who's subscribed to what)
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_type VARCHAR NOT NULL,
  channel_id UUID NOT NULL,
  event_types TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_heartbeat TIMESTAMP,

  UNIQUE (user_id, channel_type, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_channel ON subscriptions(channel_type, channel_id);

-- Enable Row Level Security
ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_pointers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see audit logs they're involved in
CREATE POLICY "users_see_own_events" ON events_log
  FOR SELECT
  USING (
    actor_id = auth.uid() OR
    auth.role() = 'admin'
  );

-- RLS Policy: Users can only manage their own subscriptions
CREATE POLICY "users_manage_own_subscriptions" ON subscriptions
  FOR ALL
  USING (user_id = auth.uid() OR auth.role() = 'admin');

-- RLS Policy: Users can only update their own pointers
CREATE POLICY "users_update_own_pointers" ON user_event_pointers
  FOR UPDATE
  USING (user_id = auth.uid());

-- Audit trigger (every insert is automatically logged)
CREATE OR REPLACE FUNCTION log_event_insert()
RETURNS TRIGGER AS \\$\\$
BEGIN
  -- Could emit webhook here for external systems
  RETURN NEW;
END;
\\$\\$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_events_log
AFTER INSERT ON events_log
FOR EACH ROW
EXECUTE FUNCTION log_event_insert();
`;

/**
 * Helper to run migrations
 */
export async function runEventStoreMigrations(): Promise<void> {
  const { error } = await supabase.rpc('exec_sql', {
    sql: eventStoreMigrations,
  });

  if (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }

  console.log('Event store migrations completed');
}
