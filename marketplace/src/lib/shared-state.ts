import { logger } from './logger';

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
  };
}

export class SharedStateManager {
  private static instance: SharedStateManager;
  private state: SharedState = EMPTY_SHARED_STATE;
  private listeners: Set<(state: SharedState) => void> = new Set();

  private constructor() {}

  static getInstance(): SharedStateManager {
    if (!SharedStateManager.instance) {
      SharedStateManager.instance = new SharedStateManager();
    }
    return SharedStateManager.instance;
  }

  getState(): SharedState {
    return this.state;
  }

  setState(newState: Partial<SharedState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  updateCollection<K extends SharedCollections>(
    collection: K,
    key: string,
    value: any
  ): void {
    this.state[collection] = {
      ...this.state[collection],
      [key]: value,
    };
    this.notifyListeners();
  }

  subscribe(listener: (state: SharedState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        logger.error('Error notifying state listener', error);
      }
    });
  }

  clear(): void {
    this.state = EMPTY_SHARED_STATE;
    this.notifyListeners();
  }
}

export const sharedStateManager = SharedStateManager.getInstance();

// Realtime status management
const realtimeStatusListeners = new Set<() => void>();
let realtimeConnected = false;

// Legacy API compatibility - maps to SharedStateManager
export async function loadSharedState(): Promise<SharedState> {
  try {
    return sharedStateManager.getState();
  } catch (e) {
    logger.warn('[realtime] loadSharedState threw', { error: e instanceof Error ? e.message : String(e) });
    return EMPTY_SHARED_STATE;
  }
}

export async function upsertSharedKey(path: SharedCollections, key: string, value: unknown): Promise<boolean> {
  try {
    sharedStateManager.updateCollection(path, key, value);
    return true;
  } catch {
    return false;
  }
}

export async function mergeSharedDeal(dealKey: string, updates: Record<string, unknown>): Promise<boolean> {
  try {
    const current = sharedStateManager.getState().deals[dealKey] || {};
    sharedStateManager.updateCollection('deals', dealKey, { ...current, ...updates });
    return true;
  } catch {
    return false;
  }
}

export async function appendSharedMessage(dealKey: string, message: unknown): Promise<boolean> {
  try {
    const current = sharedStateManager.getState().messages[dealKey] || [];
    sharedStateManager.updateCollection('messages', dealKey, [...current, message]);
    return true;
  } catch {
    return false;
  }
}

export async function setSharedMessages(dealKey: string, messages: unknown[]): Promise<boolean> {
  try {
    sharedStateManager.updateCollection('messages', dealKey, messages);
    return true;
  } catch {
    return false;
  }
}

export async function deleteSharedKey(path: SharedCollections, key: string): Promise<boolean> {
  try {
    const current = sharedStateManager.getState()[path];
    const { [key]: _, ...rest } = current;
    sharedStateManager.setState({ [path]: rest } as any);
    return true;
  } catch {
    return false;
  }
}

export function subscribeSharedState(onChange: (state: SharedState) => void): () => void {
  return sharedStateManager.subscribe(onChange);
}

export function subscribeRealtimeStatus(listener: () => void): () => void {
  realtimeStatusListeners.add(listener);
  return () => {
    realtimeStatusListeners.delete(listener);
  };
}

export function isRealtimeConnected(): boolean {
  return realtimeConnected;
}

export function setRealtimeConnected(connected: boolean): void {
  if (realtimeConnected === connected) return;
  realtimeConnected = connected;
  realtimeStatusListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      logger.error('Error notifying realtime status listener', error);
    }
  });
}
