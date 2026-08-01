/**
 * Event System Setup
 * Wire dispatcher, projections, and realtime together
 */

import { EventDispatcher, DomainEvent } from './core';
import { projectEvent } from '@/lib/projections';
import { broadcastEvent } from '@/lib/realtime/broadcaster';
import { logger } from '@/lib/logging/logger';

// In-memory denormalized state (syncs to Firebase)
let currentState = {
  campaigns: [] as any[],
  deals: {} as any,
  messages: {} as any,
  applications: [] as any[],
  notifications: [] as any[],
};

/**
 * Sync denormalized state to Firebase
 */
export async function syncStateToFirebase() {
  try {
    const firebaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    if (!firebaseUrl) {
      logger.warn('Firebase URL not configured');
      return;
    }

    const url = `${firebaseUrl}/marketplace/realtime-state.json`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentState),
    });

    if (res.ok) {
      logger.debug('State synced to Firebase');
    } else {
      logger.warn('Firebase sync failed', { status: res.status });
    }
  } catch (error) {
    logger.error('Firebase sync error', error as Error);
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

      // Sync to Firebase after state changes
      await syncStateToFirebase();
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
