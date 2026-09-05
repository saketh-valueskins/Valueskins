// FILE: marketplace/src/features/valueskins/core/realtime/useRealtimeRoom.ts
// PURPOSE: React binding for the shared marketplace room over WebSockets.
// Single source of truth for shared room state across all connected clients.

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  sharedStateManager,
  subscribeSharedState,
  subscribeRealtimeStatus,
  isRealtimeConnected,
  startRealtime,
  upsertSharedKey,
  mergeSharedDeal,
  appendSharedMessage,
  EMPTY_SHARED_STATE,
  type SharedState,
} from '@/lib/shared-state';

/**
 * The store keys campaigns/applications/notifications by id, but every consumer
 * reads them as arrays (`.length`, `.filter`, `as Campaign[]`). Convert at the
 * boundary so call sites never have to care how they are stored.
 */
function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') return Object.values(value as Record<string, T>);
  return [];
}

export interface RoomView {
  deals: Record<string, any>;
  campaigns: any[];
  messages: Record<string, any[]>;
  applications: any[];
  notifications: any[];
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useRealtimeRoom = (
  _userId?: string | null,
  _roomId?: string | null,
  _legacyArg?: string
) => {
  // Raw store snapshot. The manager hands back the same object reference between
  // mutations, which is what keeps useSyncExternalStore from looping.
  const raw = useSyncExternalStore<SharedState>(
    subscribeSharedState,
    () => sharedStateManager.getState(),
    () => EMPTY_SHARED_STATE
  );

  const realtimeConnected = useSyncExternalStore(
    subscribeRealtimeStatus,
    isRealtimeConnected,
    () => false
  );

  // Derived arrays are rebuilt only when the underlying store object changes.
  const state = useMemo<RoomView>(
    () => ({
      deals: raw?.deals && typeof raw.deals === 'object' ? raw.deals : {},
      campaigns: toArray(raw?.campaigns),
      messages: raw?.messages && typeof raw.messages === 'object' ? raw.messages : {},
      applications: toArray(raw?.applications),
      notifications: toArray(raw?.notifications),
    }),
    [raw]
  );

  const createCampaign = useCallback((campaign: any) => {
    if (!campaign) return;
    const key = String(campaign.id ?? newId('camp'));
    void upsertSharedKey('campaigns', key, { ...campaign, id: campaign.id ?? key });
  }, []);

  const updateDeal = useCallback((dealKey: string, updates: Record<string, unknown>) => {
    if (!dealKey || !updates) return;
    void mergeSharedDeal(dealKey, updates);
  }, []);

  const addMessage = useCallback((dealKey: string, message: any) => {
    if (!dealKey || !message) return;
    void appendSharedMessage(dealKey, message);
  }, []);

  const sendNotification = useCallback((target: string, type: string, text: string) => {
    const key = newId('notif');
    void upsertSharedKey('notifications', key, {
      id: key,
      target,
      type,
      text,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }, []);

  const createApplication = useCallback((application: any) => {
    if (!application) return;
    const key = String(application.id ?? newId('app'));
    void upsertSharedKey('applications', key, { ...application, id: application.id ?? key });
  }, []);

  // Safe to call on every render — startRealtime() is idempotent.
  if (typeof window !== 'undefined') startRealtime();

  return {
    state,
    syncing: !realtimeConnected,
    realtimeConnected,
    createCampaign,
    updateDeal,
    addMessage,
    sendNotification,
    createApplication,
  };
};

export default useRealtimeRoom;
