/**
 * Event Broadcaster
 * Publish events to the Supabase shared_state row (Realtime-enabled).
 * Frontend listens via useSupabaseRoom / subscribeSharedState.
 */

import { getSupabase } from '@/lib/supabase';
import { DomainEvent } from '@/lib/events/core';

export async function broadcastEvent(event: DomainEvent): Promise<void> {
  try {
    const supabase = getSupabase();
    // Write event into shared_state.events/<event_id> (granular, non-clobbering)
    const { error } = await supabase.rpc('upsert_shared_state_path', {
      path: 'events',
      key: String(event.event_id),
      value: {
        event_type: event.event_type,
        aggregate_type: event.aggregate_type,
        aggregate_id: event.aggregate_id,
        actor_id: event.actor_id,
        data: event.data,
        occurred_at: event.occurred_at,
        timestamp: Date.now(),
      },
    });

    if (error) {
      console.error('[Broadcaster] Supabase error:', error.message);
    }
  } catch (error) {
    console.error('[Broadcaster] Error:', error);
    // Don't throw - broadcasting is non-critical
  }
}
