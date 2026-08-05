import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import {
  loadSharedState,
  subscribeSharedState,
  subscribeRealtimeStatus,
  isRealtimeConnected,
  upsertSharedKey,
  mergeSharedDeal,
  appendSharedMessage,
} from '@/lib/shared-state';
import { logger } from '@/lib/logger';

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') return Object.values(value as Record<string, T>);
  return [];
}

function normalizeState(raw: any) {
  return {
    deals: raw?.deals && typeof raw.deals === 'object' ? raw.deals : {},
    campaigns: toArray(raw?.campaigns),
    messages: raw?.messages && typeof raw.messages === 'object' ? raw.messages : {},
    applications: toArray(raw?.applications),
    notifications: toArray(raw?.notifications),
  };
}

/**
 * Shared marketplace room backed by a single Supabase `shared_state` row.
 * Every mutation is a granular per-key write (never a whole-state overwrite),
 * so concurrent devices never clobber each other. All browsers receive live
 * updates via postgres_changes on the shared_state table.
 */
export const useSupabaseRoom = (userId: string | null, roomId: string | null, userId2: string) => {
  const [state, setState] = useState<any>({ deals: {}, campaigns: [], messages: {}, applications: [], notifications: [] });
  const [syncing, setSyncing] = useState(true);
  const mountedRef = useRef(true);
  const realtimeConnected = useSyncExternalStore(subscribeRealtimeStatus, isRealtimeConnected, () => false);

  useEffect(() => {
    mountedRef.current = true;

    function apply(raw: any) {
      if (!mountedRef.current) return;
      const next = normalizeState(raw);
      logger.info('[realtime] useSupabaseRoom apply', {
        campaigns: next.campaigns.length,
        applications: next.applications.length,
        deals: Object.keys(next.deals).length,
        messages: Object.keys(next.messages).length,
      });
      setState(next);
      setSyncing(false);
    }

    loadSharedState().then(apply);
    const unsubscribe = subscribeSharedState(apply);

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const createCampaign = useCallback((campaign: any) => {
    setState(prev => ({
      ...prev,
      campaigns: [...toArray(prev.campaigns).filter((entry: any) => entry?.id !== campaign.id), campaign],
    }));
    upsertSharedKey('campaigns', String(campaign.id), campaign);
  }, []);

  const updateDeal = useCallback((dealId: string, updates: any) => {
    setState(prev => ({
      ...prev,
      deals: { ...prev.deals, [dealId]: { ...(prev.deals[dealId] || {}), ...updates } },
    }));
    mergeSharedDeal(dealId, updates);
  }, []);

  const addMessage = useCallback((dealId: string, message: any) => {
    setState(prev => ({
      ...prev,
      messages: {
        ...prev.messages,
        [dealId]: [...(prev.messages[dealId] || []), message],
      },
    }));
    appendSharedMessage(dealId, message);
  }, []);

  const sendNotification = useCallback((recipient: string, type: string, message: string) => {
    const notification = {
      id: Date.now(),
      recipient,
      type,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setState(prev => ({
      ...prev,
      notifications: [notification, ...toArray(prev.notifications)].slice(0, 100),
    }));
    upsertSharedKey('notifications', String(notification.id), notification);
  }, []);

  const createApplication = useCallback((application: any) => {
    setState(prev => ({
      ...prev,
      applications: [...toArray(prev.applications).filter((entry: any) => entry?.id !== application.id), application],
    }));
    upsertSharedKey('applications', String(application.id), application);
  }, []);

  return {
    state,
    syncing,
    realtimeConnected,
    createCampaign,
    updateDeal,
    addMessage,
    sendNotification,
    createApplication,
  };
};
