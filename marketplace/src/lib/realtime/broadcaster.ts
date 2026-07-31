/**
 * Event Broadcaster
 * Publish events to Supabase Realtime WebSocket
 */

import { createClient } from '@supabase/supabase-js';
import { DomainEvent } from '@/lib/events/core';
import { SubscriptionManager } from './subscription-manager';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const subscriptionManager = new SubscriptionManager();

export async function broadcastEvent(event: DomainEvent): Promise<void> {
  try {
    // Get subscribers for this event
    const channel = getChannelForEvent(event);
    const subscribers = await subscriptionManager.getChannelSubscribers(
      channel.type,
      channel.id
    );

    // Broadcast to each subscriber
    for (const subscriber of subscribers) {
      // Check authorization
      if (!isAuthorized(subscriber.user_id, event)) {
        continue;
      }

      // Publish to Supabase realtime
      await supabase
        .from('realtime_events')
        .insert({
          user_id: subscriber.user_id,
          event_type: event.event_type,
          aggregate_id: event.aggregate_id,
          aggregate_type: event.aggregate_type,
          data: event.data,
          timestamp: new Date().toISOString(),
        });

      // Also broadcast via Supabase Realtime channel
      const realtimeChannel = supabase.channel(
        `${channel.type}:${channel.id}:${subscriber.user_id}`
      );

      realtimeChannel.send('broadcast', {
        event: {
          event_id: event.event_id,
          event_type: event.event_type,
          aggregate_id: event.aggregate_id,
          occurred_at: event.occurred_at,
          data: event.data,
        },
      });
    }
  } catch (error) {
    console.error('Broadcast error:', error);
    // Don't throw - broadcasting is non-critical
  }
}

function getChannelForEvent(event: DomainEvent): { type: string; id: string } {
  switch (event.aggregate_type) {
    case 'campaign':
      return { type: 'campaigns', id: event.aggregate_id };
    case 'deal':
      return { type: 'deals', id: event.aggregate_id };
    case 'conversation':
      return { type: 'messages', id: event.aggregate_id };
    case 'notification':
      return { type: 'notifications', id: event.data.recipient_id };
    case 'reputation':
      return { type: 'reputation', id: event.aggregate_id };
    default:
      return { type: 'events', id: event.aggregate_id };
  }
}

function isAuthorized(userId: string, event: DomainEvent): boolean {
  // Creator can see campaigns
  if (event.aggregate_type === 'campaign') {
    return true; // Public visibility
  }

  // User can see their own deals
  if (event.aggregate_type === 'deal') {
    return event.data.brand_id === userId || event.data.creator_id === userId;
  }

  // User can see their conversations
  if (event.aggregate_type === 'conversation') {
    return event.data.participants.includes(userId);
  }

  // User can see their notifications
  if (event.aggregate_type === 'notification') {
    return event.data.recipient_id === userId;
  }

  return false;
}
