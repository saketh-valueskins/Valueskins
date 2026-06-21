import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = '/api/realtime/state';
const POLL_INTERVAL = 3000;

function normalizeCollection<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') return Object.values(value as Record<string, T>);
  return [];
}

function normalizeState(raw: any) {
  return {
    deals: raw?.deals && typeof raw.deals === 'object' ? raw.deals : {},
    campaigns: normalizeCollection(raw?.campaigns),
    messages: raw?.messages && typeof raw.messages === 'object' ? raw.messages : {},
    applications: normalizeCollection(raw?.applications),
    notifications: normalizeCollection(raw?.notifications),
  };
}

async function fetchState(): Promise<any> {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function persistState(state: any): Promise<void> {
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: state }),
    });
  } catch {}
}

export const useFirebaseRoom = (userId: string | null, roomId: string | null, userId2: string) => {
  const [state, setState] = useState<any>({ deals: {}, campaigns: [], messages: {}, applications: [], notifications: [] });
  const [syncing, setSyncing] = useState(true);
  const stateRef = useRef(state);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  stateRef.current = state;

  // Initial load + polling
  useEffect(() => {
    let mounted = true;

    async function load() {
      const data = await fetchState();
      if (!mounted) return;
      if (data) {
        setState(normalizeState(data));
      }
      setSyncing(false);
    }

    load();

    pollingRef.current = setInterval(async () => {
      const data = await fetchState();
      if (!mounted) return;
      if (data) {
        setState(normalizeState(data));
      }
    }, POLL_INTERVAL);

    return () => {
      mounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Debounced persist on state change
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (syncing) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistState(stateRef.current);
    }, 200);
  }, [state, syncing]);

  const createCampaign = useCallback((campaign: any) => {
    setState(prev => {
      const campaigns = normalizeCollection(prev.campaigns);
      return {
        ...prev,
        campaigns: [...campaigns.filter((entry: any) => entry?.id !== campaign.id), campaign],
      };
    });
  }, []);

  const updateDeal = useCallback((dealId: string, updates: any) => {
    setState(prev => ({
      ...prev,
      deals: { ...prev.deals, [dealId]: { ...prev.deals[dealId], ...updates } }
    }));
  }, []);

  const addMessage = useCallback((dealId: string, message: any) => {
    setState(prev => ({
      ...prev,
      messages: {
        ...prev.messages,
        [dealId]: [...(prev.messages[dealId] || []), message]
      }
    }));
  }, []);

  const sendNotification = useCallback((recipient: string, type: string, message: string) => {
    setState(prev => {
      const notifications = normalizeCollection(prev.notifications);
      return {
        ...prev,
        notifications: [
          {
            id: Date.now(),
            recipient,
            type,
            message,
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...notifications,
        ].slice(0, 100),
      };
    });
  }, []);

  const createApplication = useCallback((application: any) => {
    setState(prev => {
      const applications = normalizeCollection(prev.applications);
      return {
        ...prev,
        applications: [...applications.filter((entry: any) => entry?.id !== application.id), application],
      };
    });
  }, []);

  return {
    state,
    syncing,
    createCampaign,
    updateDeal,
    addMessage,
    sendNotification,
    createApplication
  };
};
