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
    // Broadcast to shared app-sync channel (all connected clients)
    // Frontend listens to this channel via subscribeToAppEvents()
    const appSyncChannel = supabase.channel('app-sync');

    const broadcastMessage = {
      type: 'broadcast' as const,
      event: 'realtime_event',
      payload: {
        event_type: getEventTypeForFrontend(event),
        user_id: event.actor_id,
        data: event.data,
        timestamp: event.occurred_at,
      },
    };

    // @ts-ignore - Supabase channel.send() type definition is incomplete
    await appSyncChannel.send(broadcastMessage);

    console.log('[Broadcaster] Sent to app-sync:', event.event_type);
  } catch (error) {
    console.error('[Broadcaster] Error:', error);
    // Don't throw - broadcasting is non-critical
  }
}

function getEventTypeForFrontend(event: DomainEvent): string {
  // Map domain event types to frontend event types
  switch (event.event_type) {
    case 'campaign_created':
      return 'campaign_created';
    case 'campaign_published':
      return 'campaign_updated';
    case 'campaign_closed':
      return 'campaign_updated';
    case 'creator_accepted_invitation':
      return 'deal_created';
    case 'negotiation_accepted':
    case 'contract_signed':
    case 'deal_completed':
    case 'deal_cancelled':
      return 'deal_updated';
    case 'message_sent':
      return 'message_sent';
    case 'message_delivered':
    case 'message_read':
      return 'message_sent';
    default:
      return event.event_type;
  }
}
