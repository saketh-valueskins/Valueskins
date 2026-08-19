/**
 * Event System Setup
 * Wire dispatcher, projections, and realtime together
 */

import { EventDispatcher, DomainEvent } from './core';
import { projectEvent } from '@/lib/projections';
import { broadcastEvent } from '@/lib/realtime/broadcaster';
import { getSupabase } from '@/lib/supabase';
import { logger } from '@/lib/logging/logger';

// In-memory denormalized state (synced to Supabase shared_state)
let currentState = {
  campaigns: [] as any[],
  deals: {} as any,
  messages: {} as any,
  applications: [] as any[],
  notifications: [] as any[],
};

/**
 * Sync denormalized state to the Supabase shared_state row.
 * Granular per-key writes so concurrent device writes are never clobbered.
 */
export async function syncStateToSupabase() {
  try {
    const supabase = getSupabase();
    const ops: Promise<unknown>[] = [];

    for (const campaign of currentState.campaigns) {
      if (campaign?.id !== undefined) {
        ops.push(Promise.resolve(supabase.rpc('upsert_shared_state_path', { path: 'campaigns', key: String(campaign.id), value: campaign })));
      }
    }
    for (const [dealKey, deal] of Object.entries(currentState.deals)) {
      if (deal) {
        ops.push(Promise.resolve(supabase.rpc('upsert_shared_state_path', { path: 'deals', key: dealKey, value: deal })));
      }
    }
    for (const [conversationId, msgs] of Object.entries(currentState.messages)) {
      if (Array.isArray(msgs)) {
        ops.push(Promise.resolve(supabase.rpc('set_shared_messages', { deal_key: conversationId, value: msgs })));
      }
    }

    await Promise.all(ops);
    logger.debug('State synced to Supabase');
  } catch (error) {
    logger.error('Supabase sync error', error as Error);
  }
}

class EventSubscriberAdapter {
  constructor(private handler: (event: DomainEvent) => Promise<void>) {}

  async onEvent(event: DomainEvent): Promise<void> {
    await this.handler(event);
  }
}

/**
 * Global event dispatcher (singleton)
 */
const dispatcher = new EventDispatcher();

/**
 * Setup event subscribers
 * Called once at app startup
 */
export function setupEventSystem(): void {
  // Subscriber 1: Update denormalized views for fast queries
  dispatcher.subscribe(
    '*',
    new EventSubscriberAdapter(async (event: DomainEvent) => {
      try {
        await projectEvent(event);
      } catch (error) {
        logger.error('Projection error', error as Error, {
          event_type: event.event_type,
          aggregate_id: event.aggregate_id,
        });
      }
    })
  );

  // Subscriber 2: Broadcast to realtime WebSocket clients
  dispatcher.subscribe(
    '*',
    new EventSubscriberAdapter(async (event: DomainEvent) => {
      try {
        await broadcastEvent(event);
      } catch (error) {
        logger.error('Broadcast error', error as Error, {
          event_type: event.event_type,
          aggregate_id: event.aggregate_id,
        });
      }
    })
  );

  // Subscriber 3: Update in-memory state (for realtime sync)
  dispatcher.subscribe(
    '*',
    new EventSubscriberAdapter(async (event: DomainEvent) => {
      // Update currentState based on event type
      if (event.aggregate_type === 'campaign') {
        if (event.event_type === 'campaign_created') {
          const campaign = event.data;
          currentState.campaigns.push(campaign);
        } else if (event.event_type === 'campaign_updated') {
          const idx = currentState.campaigns.findIndex(c => c.id === event.aggregate_id);
          if (idx >= 0) {
            currentState.campaigns[idx] = { ...currentState.campaigns[idx], ...event.data };
          }
        }
      } else if (event.aggregate_type === 'deal') {
        if (event.event_type === 'deal_created') {
          const deal = event.data;
          currentState.deals[deal.id] = deal;
        } else if (event.event_type === 'deal_updated') {
          if (currentState.deals[event.aggregate_id]) {
            currentState.deals[event.aggregate_id] = {
              ...currentState.deals[event.aggregate_id],
              ...event.data
            };
          }
        }
      } else if (event.aggregate_type === 'message') {
        if (event.event_type === 'message_sent') {
          const message = event.data;
          if (!currentState.messages[message.conversation_id]) {
            currentState.messages[message.conversation_id] = [];
          }
          currentState.messages[message.conversation_id].push(message);
        }
      }

      // Sync to Supabase after state changes
      await syncStateToSupabase();
    })
  );

  // Subscriber 4: Logging (optional, for audit)
  dispatcher.subscribe(
    '*',
    new EventSubscriberAdapter(async (event: DomainEvent) => {
      logger.debug('Event dispatched', {
        event_type: event.event_type,
        aggregate_type: event.aggregate_type,
        aggregate_id: event.aggregate_id,
        actor_id: event.actor_id,
      });
    })
  );

  logger.info('Event system initialized');
}

export function getDispatcher(): EventDispatcher {
  return dispatcher;
}
