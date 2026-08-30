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
