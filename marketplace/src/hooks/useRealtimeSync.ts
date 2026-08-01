/**
 * Hook to sync realtime updates from Supabase to React state
 * Listens to event-driven architecture broadcasts
 */

import { useEffect, useCallback } from 'react';
import { subscribeToAppEvents } from '@/lib/supabase-realtime';
import type { RealtimeEvent } from '@/lib/supabase-realtime';

interface UseRealtimeSyncOptions {
  onCampaignCreated?: (event: RealtimeEvent) => void;
  onCampaignUpdated?: (event: RealtimeEvent) => void;
  onDealCreated?: (event: RealtimeEvent) => void;
  onDealUpdated?: (event: RealtimeEvent) => void;
  onMessageSent?: (event: RealtimeEvent) => void;
  onAnyEvent?: (event: RealtimeEvent) => void;
}

export function useRealtimeSync(options: UseRealtimeSyncOptions) {
  const {
    onCampaignCreated,
    onCampaignUpdated,
    onDealCreated,
    onDealUpdated,
    onMessageSent,
    onAnyEvent,
  } = options;

  useEffect(() => {
    const handleEvent = (event: RealtimeEvent) => {
      // Log all events for debugging
      console.log('[Realtime] Event received:', event.event_type, event.data);

      // Route to specific handlers
      switch (event.event_type) {
        case 'campaign_created':
          onCampaignCreated?.(event);
          break;
        case 'campaign_updated':
          onCampaignUpdated?.(event);
          break;
        case 'deal_created':
          onDealCreated?.(event);
          break;
        case 'deal_updated':
          onDealUpdated?.(event);
          break;
        case 'message_sent':
          onMessageSent?.(event);
          break;
      }

      // Always call generic handler
      onAnyEvent?.(event);
    };

    // Subscribe to all events
    const unsubscribe = subscribeToAppEvents(handleEvent);

    return unsubscribe;
  }, [onCampaignCreated, onCampaignUpdated, onDealCreated, onDealUpdated, onMessageSent, onAnyEvent]);
}
