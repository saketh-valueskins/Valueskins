import { getSupabase } from './supabase';
import type { RealtimeChannel } from './supabase';

export type RealtimeEventType =
  | 'state_updated'
  | 'deal_created'
  | 'deal_updated'
  | 'campaign_created'
  | 'campaign_updated'
  | 'message_sent'
  | 'application_received'
  | 'offer_received'
  | 'sync_request';

export interface RealtimeEvent {
  event_type: RealtimeEventType;
  user_id: number;
  data: Record<string, any>;
  timestamp: string;
}

type Listener = (event: RealtimeEvent) => void;

const APP_CHANNEL = 'app-sync';
const listeners = new Map<string, Set<Listener>>();
let appChannel: RealtimeChannel | null = null;
let appChannelRefCount = 0;

// Subscribe to the shared app channel — all users receive each other's events
export function subscribeToAppEvents(onEvent: Listener): () => void {
  if (!listeners.has(APP_CHANNEL)) {
    listeners.set(APP_CHANNEL, new Set());
  }
  listeners.get(APP_CHANNEL)!.add(onEvent);

  appChannelRefCount++;
  if (!appChannel) {
    const supabase = getSupabase();
    appChannel = supabase.channel(APP_CHANNEL, {
      config: { broadcast: { self: false } },
    });

    appChannel.on('broadcast', { event: 'realtime_event' }, (payload) => {
      const event = payload.payload as RealtimeEvent;
      const channelListeners = listeners.get(APP_CHANNEL);
      if (channelListeners) {
        channelListeners.forEach(cb => {
          try { cb(event); } catch (e) { console.error('[Realtime] listener error:', e); }
        });
      }
    });

    appChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Connected to app-sync channel');
      }
    });
  }

  return () => {
    const channelListeners = listeners.get(APP_CHANNEL);
    if (channelListeners) {
      channelListeners.delete(onEvent);
      appChannelRefCount--;
      if (channelListeners.size === 0 && appChannel) {
        const supabase = getSupabase();
        supabase.removeChannel(appChannel);
        appChannel = null;
        listeners.delete(APP_CHANNEL);
      }
    }
  };
}

// Broadcast an event to all connected clients
export async function broadcastEvent(event: RealtimeEvent): Promise<void> {
  try {
    const supabase = getSupabase();
    const channel = supabase.channel(APP_CHANNEL);
    await channel.send({
      type: 'broadcast',
      event: 'realtime_event',
      payload: event,
    });
    supabase.removeChannel(channel);
  } catch (err) {
    console.error('[Realtime] Broadcast failed:', err);
  }
}
