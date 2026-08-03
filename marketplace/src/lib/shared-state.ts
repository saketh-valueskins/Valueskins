import { getSupabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type SharedCollections = 'deals' | 'campaigns' | 'messages' | 'applications' | 'notifications' | 'events';

export interface SharedState {
  deals: Record<string, any>;
  campaigns: Record<string, any>;
  messages: Record<string, any[]>;
  applications: Record<string, any>;
  notifications: Record<string, any>;
  events?: Record<string, any>;
}

export const EMPTY_SHARED_STATE: SharedState = {
  deals: {},
  campaigns: {},
  messages: {},
  applications: {},
  notifications: {},
};

function emptyFallback(state: any): SharedState {
  return {
    deals: state?.deals && typeof state.deals === 'object' ? state.deals : {},
    campaigns: state?.campaigns && typeof state.campaigns === 'object' ? state.campaigns : {},
    messages: state?.messages && typeof state.messages === 'object' ? state.messages : {},
    applications: state?.applications && typeof state.applications === 'object' ? state.applications : {},
    notifications: state?.notifications && typeof state.notifications === 'object' ? state.notifications : {},
    events: state?.events && typeof state.events === 'object' ? state.events : {},
  };
}

export async function loadSharedState(): Promise<SharedState> {
  try {
    const { data, error } = await getSupabase()
      .from('shared_state')
      .select('state')
      .eq('id', 'main')
      .maybeSingle();
    if (error) return EMPTY_SHARED_STATE;
    return emptyFallback(data?.state);
  } catch {
    return EMPTY_SHARED_STATE;
  }
}

export async function upsertSharedKey(path: SharedCollections, key: string, value: unknown): Promise<boolean> {
  try {
    const { error } = await getSupabase().rpc('upsert_shared_state_path', { path, key, value });
    return !error;
  } catch {
    return false;
  }
}

export async function mergeSharedDeal(dealKey: string, updates: Record<string, unknown>): Promise<boolean> {
  try {
    const { error } = await getSupabase().rpc('merge_shared_deal', { deal_key: dealKey, updates });
    return !error;
  } catch {
    return false;
  }
}

export async function appendSharedMessage(dealKey: string, message: unknown): Promise<boolean> {
  try {
    const { error } = await getSupabase().rpc('append_shared_message', { deal_key: dealKey, value: message });
    return !error;
  } catch {
    return false;
  }
}

export async function setSharedMessages(dealKey: string, messages: unknown[]): Promise<boolean> {
  try {
    const { error } = await getSupabase().rpc('set_shared_messages', { deal_key: dealKey, value: messages });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteSharedKey(path: SharedCollections, key: string): Promise<boolean> {
  try {
    const { error } = await getSupabase().rpc('delete_shared_key', { path, key });
    return !error;
  } catch {
    return false;
  }
}

// Single refcounted channel for all shared-state subscribers. Supabase's
// channel() returns a cached channel for an existing topic, so a second
// subscriber calling .on() on the already-subscribed channel would throw
// ("cannot add postgres_changes callbacks ... after subscribe()"). Reuse one
// channel and fan out to every registered listener instead.
let sharedChannel: RealtimeChannel | null = null;
const sharedListeners = new Set<(state: SharedState) => void>();
let sharedChannelRefCount = 0;

export function subscribeSharedState(onChange: (state: SharedState) => void): () => void {
  sharedListeners.add(onChange);
  sharedChannelRefCount++;

  if (!sharedChannel) {
    sharedChannel = getSupabase()
      .channel('shared-state-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_state' },
        (payload: any) => {
          const state = emptyFallback(payload.new?.state);
          sharedListeners.forEach((listener) => {
            try {
              listener(state);
            } catch (error) {
              console.error('[Realtime] shared-state listener error:', error);
            }
          });
        }
      )
      .subscribe();
  }

  return () => {
    sharedListeners.delete(onChange);
    sharedChannelRefCount--;
    if (sharedChannelRefCount === 0 && sharedChannel) {
      getSupabase().removeChannel(sharedChannel);
      sharedChannel = null;
    }
  };
}
