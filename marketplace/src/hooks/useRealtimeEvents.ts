/**
 * useRealtimeEvents - React hook for realtime event subscriptions
 *
 * Usage:
 * const campaigns = useRealtimeEvents('campaigns', creator_id, {
 *   onEvent: (event) => updateUI(event),
 *   eventTypes: ['campaign_created', 'campaign_published']
 * });
 *
 * Handles:
 * - Automatic subscription on mount
 * - Offline detection & event replay
 * - Presence tracking
 * - Cleanup on unmount
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { DomainEvent } from '@/lib/events/core';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UseRealtimeEventsOptions {
  onEvent?: (event: DomainEvent) => void;
  eventTypes?: string[]; // which events to receive ('*' = all)
  autoSubscribe?: boolean; // subscribe on mount
  onError?: (error: Error) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

export function useRealtimeEvents(
  channelType: string,
  channelId: string,
  options: UseRealtimeEventsOptions = {}
) {
  const [isConnected, setIsConnected] = useState(true);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const channelRef = useRef<any>(null);
  const subscribedRef = useRef(false);

  const {
    onEvent,
    eventTypes = ['*'],
    autoSubscribe = true,
    onError,
    onOffline,
    onOnline,
  } = options;

  // Subscribe to realtime channel
  const subscribe = useCallback(async () => {
    if (subscribedRef.current) return;

    try {
      const channel = supabase.realtime.subscribe(
        `${channelType}:${channelId}`,
        {
          event: '*',
          schema: 'public',
        }
      );

      channelRef.current = channel;

      // Listen for events
      channel.on('*', (payload: any) => {
        const event = payload.payload?.event;

        if (!event) return;

        // Filter by event type if needed
        if (
          eventTypes.length > 0 &&
          !eventTypes.includes('*') &&
          !eventTypes.includes(event.event_type)
        ) {
          return;
        }

        // Update local state
        setEvents(prev => [...prev, event]);

        // Call handler
        onEvent?.(event);
      });

      // Subscribe to connection status
      channel.on('postgres_changes', { event: 'INSERT' }, (payload: any) => {
        // Handle new events
        if (payload.new) {
          onEvent?.(payload.new);
        }
      });

      // Listen for reconnection
      supabase.realtime.on('CHANNEL_ERROR', () => {
        setIsConnected(false);
        onOffline?.();
      });

      supabase.realtime.on('CHANNEL_SUBSCRIBED', () => {
        setIsConnected(true);
        onOnline?.();

        // Replay missed events
        replayMissedEvents();
      });

      subscribedRef.current = true;
    } catch (error) {
      onError?.(error as Error);
    }
  }, [channelType, channelId, eventTypes, onEvent, onOffline, onOnline, onError]);

  // Unsubscribe
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.realtime.unsubscribe(channelRef.current);
      subscribedRef.current = false;
    }
  }, []);

  // Replay missed events from offline period
  const replayMissedEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/realtime/replay-events', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) return;

      const { missed_events } = await response.json();

      for (const event of missed_events) {
        // Filter by event type
        if (
          eventTypes.length > 0 &&
          !eventTypes.includes('*') &&
          !eventTypes.includes(event.event_type)
        ) {
          continue;
        }

        setEvents(prev => [...prev, event]);
        onEvent?.(event);
      }
    } catch (error) {
      console.error('Failed to replay events:', error);
    }
  }, [eventTypes, onEvent]);

  // Auto-subscribe on mount
  useEffect(() => {
    if (autoSubscribe) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [subscribe, unsubscribe, autoSubscribe]);

  // Track presence
  useEffect(() => {
    const trackPresence = async () => {
      try {
        await fetch('/api/v1/realtime/presence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            online: true,
            viewing: `${channelType}:${channelId}`,
          }),
        });
      } catch (error) {
        console.error('Failed to track presence:', error);
      }
    };

    trackPresence();

    const interval = setInterval(trackPresence, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [channelType, channelId]);

  return {
    isConnected,
    events,
    subscribe,
    unsubscribe,
    replayMissedEvents,
  };
}

/**
 * useEventSubscriptions - Subscribe to multiple channels
 *
 * Usage:
 * const { campaigns, deals, notifications } = useEventSubscriptions({
 *   campaigns: { channelId: 'campaigns_for_valueSkin_UGC' },
 *   deals: { channelId: 'deal_123' },
 *   notifications: { channelId: user_id },
 * });
 */

interface SubscriptionConfig {
  channelId: string;
  eventTypes?: string[];
  onEvent?: (event: DomainEvent) => void;
}

export function useEventSubscriptions(
  subscriptions: Record<string, SubscriptionConfig>
) {
  const [allEvents, setAllEvents] = useState<Record<string, DomainEvent[]>>({});
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const subscriptionHandles = Object.entries(subscriptions).map(
      ([key, config]) => {
        const { events, isConnected } = useRealtimeEvents(
          key,
          config.channelId,
          {
            eventTypes: config.eventTypes,
            onEvent: (event: DomainEvent) => {
              setAllEvents(prev => ({
                ...prev,
                [key]: [...(prev[key] || []), event],
              }));
              config.onEvent?.(event);
            },
            onOffline: () => setConnected(false),
            onOnline: () => setConnected(true),
          }
        );

        return { key, events, isConnected };
      }
    );

    return () => {
      // Cleanup handled by individual hooks
    };
  }, [subscriptions]);

  return {
    events: allEvents,
    isConnected: connected,
  };
}
