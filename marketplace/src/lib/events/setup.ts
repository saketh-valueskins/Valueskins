/**
 * Event System Setup
 * Wire dispatcher, projections, and realtime together
 */

import { EventDispatcher, DomainEvent } from './core';
import { projectEvent } from '@/lib/projections';
import { broadcastEvent } from '@/lib/realtime/broadcaster';
import { logger } from '@/lib/logging/logger';

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

  // Subscriber 3: Logging (optional, for audit)
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
