import { getSupabase } from './supabase';

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

export function subscribeSharedState(onChange: (state: SharedState) => void): () => void {
  const channel = getSupabase()
    .channel('shared-state-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shared_state' },
      (payload: any) => {
        onChange(emptyFallback(payload.new?.state));
      }
    )
    .subscribe();
  return () => {
    getSupabase().removeChannel(channel);
  };
}
