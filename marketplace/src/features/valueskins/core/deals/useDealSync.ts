/**
 * ARCHITECTURE: See ARCHITECTURE_GUIDE.txt for codebase overview
 * FILE PURPOSE: Core state management hook for deal negotiation
 * ROLE IN SYSTEM: Central place where all deal data lives (offers, scripts, chat, etc)
 * WHAT IT DOES:
 *   - Manages deal state using React hooks
 *   - Syncs with localStorage (offline support)
 *   - Syncs with Firebase (real-time notifications)
 *   - Syncs across browser tabs via BroadcastChannel
 * CONSUMED BY: instagram/page.tsx, tiktok/page.tsx, youtube/page.tsx, linkedin/page.tsx
 *
 * Deal synchronization hook — bridges localStorage state with backend API.
 *
 * Strategy:
 * 1. On mount, attempt to load deal rooms from backend API
 * 2. If backend is reachable, use it as source of truth and sync to localStorage
 * 3. If backend is unreachable, fall back to localStorage (offline mode)
 * 4. All mutations attempt API first, then update localStorage
 * 5. BroadcastChannel keeps multiple tabs in sync
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeToAppEvents, broadcastEvent, type RealtimeEvent } from '@/lib/supabase-realtime';

// ---- Types matching the demo page's DealState ----

export type DealRoomPhase = 'brief' | 'offer' | 'pending' | 'counter' | 'brand_considering' | 'brand_countered' | 'brand_rejected' | 'brand_reviewing' | 'last_offer' | 'rejected' | 'chatroom' | 'formal_offer' | 'checklist' | 'accepted' | 'softhold';

export type PaymentMilestoneStatus = 'pending' | 'released';

export type DealState = {
  phase: DealRoomPhase;
  intent: 'explore' | 'campaign' | 'long-term';
  briefFilled: boolean;
  briefTitle: string;
  offerAmount: string;
  counterAmount: string;
  brandResponseAmount: string; // amount brand counter-offered back after creator countered
  agreementAmount?: string; // final agreed amount after negotiation
  chatMessages: ChatMessage[];
  chatInput: string;
  performanceClause: boolean;
  advancePercent: number;
  uploadPercent: number;
  approvalPercent: number;
  // Payment milestone tracking — synced real-time
  paymentMilestones?: Record<'advance' | 'upload' | 'approval', PaymentMilestoneStatus>;
  creatorDealLifecycle?: 'checklist' | 'scripting' | 'deliverables' | 'submitted' | 'approved'; // Creator side
  // Script workflow: both parties negotiate, edit, and approve script before deliverables
  scriptMode?: 'non_negotiable' | 'discussion' | 'creator_freedom';
  brandScriptText?: string; // Non-negotiable mode: fixed script from brand
  scriptDraft?: string; // Current working script (real-time edits)
  scriptVersion?: number; // Incremented each time a revision is submitted
  scriptStatus?: 'draft' | 'submitted' | 'pending_revision' | 'approved'; // Approval state
  scriptFeedback?: string; // Revision feedback from approver
  scriptApprovedAt?: string; // ISO timestamp when both parties approved
  creatorScriptApproved?: boolean; // Creator clicked "I approve"
  brandScriptApproved?: boolean; // Brand clicked "I approve"
  scriptVersionHistory?: Array<{
    version: number;
    text: string;
    editedBy: 'creator' | 'brand';
    editedAt: string; // ISO timestamp
    reason?: string; // Why they edited (optional)
  }>;
  // Webhook simulation logs (MVP)
  publishEvents?: Array<{ id: number; type: 'video_published' | 'milestone_released'; message: string; at: string }>;
  deliverableStatuses?: Record<number, 'pending' | 'linking' | 'uploaded' | 'approved'>; // Per-deliverable status
  // Brand-side state — persisted so role-switching preserves progress
  brandPhase?: string;          // BrandDealPhase
  brandApprovalPhase?: string;  // BrandApprovalPhase
  formalOfferSentByCreator?: boolean;
  deliverableLinks?: Record<number, string>; // Instagram URLs per deliverable index
  // Backend IDs — populated when synced with API
  backendDealRoomId?: number;
  backendLastMessageId?: number;
  // Deal type differentiation — determines workflow (escrow vs goods vs content tracking)
  dealType?: 'paid' | 'barter' | 'c2c_paid' | 'c2c_collab';
  type?: string; // Generic type field for deal display
  // Barter-only: goods lifecycle and tracking number
  goodsTrackerStatus?: 'goods_preparing' | 'goods_shipped' | 'goods_delivered' | 'content_due' | 'content_submitted' | 'content_approved';
  goodsTrackingNumber?: string;
  // C2C collab (unpaid) only: content lifecycle
  c2cContentStatus?: 'content_creating' | 'content_submitted' | 'content_approved';
  // International deal flags and compliance acknowledgments
  isInternationalDeal?: boolean;
  customsComplianceAcknowledged?: boolean;
  // Escrow state — synced between brand (funder) and creator (receiver)
  escrowFunded?: boolean;
  // Payment milestone tracking — which stages have been released to creator
  milestoneAdvanceReleased?: boolean;
  milestoneUploadReleased?: boolean;
  milestoneApprovalReleased?: boolean;
  // Tip system — brand can tip after deal completion
  tipsReceived?: Array<{ amount: string; from: string; timestamp: string; message?: string }>;
  // Dispute tracking
  disputes?: Array<{
    id: number;
    type: 'late_delivery' | 'quality_issue' | 'payment' | 'other';
    description: string;
    filledBy: 'creator' | 'brand';
    timestamp: string;
    status: 'open' | 'resolved';
  }>;
  // Point of Contact — set at campaign creation, shown to both parties
  poc?: { name: string; workEmail: string; role: string; phone?: string };
  // Campaign linkage — connects deal to its originating campaign for Sent Deals tracking
  campaignId?: number;
  campaignTitle?: string;
  // Deal context — ensures both parties can find the same deal
  // creatorName|creatorSkin is the deal key itself, but we also store context for reference
  creatorMarketplaceIndex?: number; // BRAND_MARKETPLACE_CREATORS array index
  opportunityIndex?: number;        // activeOpportunities array index (creator side)
  creatorName?: string;             // Name of creator from BRAND_MARKETPLACE_CREATORS
  creatorSkin?: string;             // ValueSkin (profession) of creator
  // Ratings and reviews — both sides rate each other after deal completion
  creatorRating?: number;           // 1-5 stars from creator to brand
  creatorRatingComment?: string;    // Creator's review comment
  displayCreatorRating?: boolean;   // Creator chose to show on profile
  brandRating?: number;             // 1-5 stars from brand to creator
  brandRatingComment?: string;      // Brand's review comment
  displayBrandRating?: boolean;     // Brand chose to show on profile
};

export type ChatMessage = {
  id: number;
  sender: 'me' | 'brand' | 'creator';
  text: string;
  time: string;       // display time (e.g. "2:34 PM")
  isoTime: string;    // full ISO timestamp for audit log (e.g. "2026-03-18T14:34:07.421Z")
  seen?: boolean;
  seenAt?: string;    // ISO timestamp of when the other party opened/read the message
};

// A single entry in the deal's immutable event ledger
export type DealEvent = {
  id: number;
  type: 'offer_sent' | 'offer_received' | 'counter_sent' | 'counter_received' | 'accepted' | 'rejected' | 'message_sent' | 'message_seen' | 'deal_signed' | 'content_submitted' | 'content_approved' | 'payment_released';
  actor: 'creator' | 'brand' | 'system';
  label: string;       // human-readable description
  isoTime: string;     // ISO timestamp
  hash: string;        // SHA-256 of (prevHash + type + actor + isoTime + label) — chain integrity
};

export type SharedApplication = {
  id: number;
  campaignId: number;
  campaignTitle: string;
  creatorProfession: string;
  creatorHandle: string;
  status: 'pending' | 'accepted' | 'rejected' | 'invited';
  appliedAt: string;
  opportunityIndex?: number; // Index in activeOpportunities for deal key lookup
  // Creator insights — visible to brand when reviewing application
  creatorName?: string;
  creatorFollowers?: string;
  creatorEngagement?: string;
  creatorLevel?: number;
  creatorMatchScore?: string;
  creatorRate?: string;
  creatorDealCompletionRate?: number;
  creatorPortfolio?: string[];
  creatorAudienceLocation?: string;
  creatorAudienceAge?: string;
  creatorResponseTimeHrs?: number;
  creatorInstagramUrl?: string;
  creatorWebsiteUrl?: string;
};

export type Campaign = {
  id: number;
  brandName?: string;
  brandProfession: string;
  title: string;
  description: string;
  about?: string;
  requiredProfessions: string[];
  requiredValueskin?: string;
  minLevel: number;
  maxLevel: number;
  budget: string;
  deadline: string;
  location: string;
  nonNegotiables: string[];
  deliverables: string;
  compensationType?: string;
  exclusivity?: string;
  usageRights?: string;
  revisionLimit?: number;
  audienceTarget?: string;
  requirements?: string[];
  scriptMode?: 'non_negotiable' | 'discussion' | 'creator_freedom';
  scriptText?: string;
  allowContentApprovalPayment?: boolean;
  status: 'open' | 'closed' | 'expired';
  applicants: number;
  creatorCount?: number;
  escrowFunded?: boolean;
  escrowPool?: number;
  escrowAllocated?: number;
  country?: string;
  poc?: { name: string; workEmail: string; role: string; phone?: string };
};

// ---- Storage keys ----
const STORAGE_DEALS = 'vs_demo_deal_states';
const STORAGE_APPLICATIONS = 'vs_demo_applications';
const STORAGE_CAMPAIGNS = 'vs_demo_campaigns';
const BC_NAME = 'vs_demo_sync';
const STORAGE_VERSION_KEY = 'vs_demo_data_version';
const CURRENT_DATA_VERSION = '4'; // bump to clear old mock data

// One-time purge of stale mock data from previous sessions
if (typeof window !== 'undefined') {
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  if (storedVersion !== CURRENT_DATA_VERSION) {
    localStorage.removeItem(STORAGE_DEALS);
    localStorage.removeItem(STORAGE_APPLICATIONS);
    localStorage.removeItem(STORAGE_CAMPAIGNS);
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_DATA_VERSION);
  }
}

// ---- Backend connectivity check ----
let pgBackendOnline: boolean | null = null;
let lastCheck = 0;
const CHECK_INTERVAL = 30_000;

async function isBackendOnline(pingPath = '/api/campaigns/list'): Promise<boolean> {
  const now = Date.now();
  if (pgBackendOnline !== null && now - lastCheck < CHECK_INTERVAL) {
    return pgBackendOnline;
  }
  try {
    const res = await fetch(pingPath, { method: 'HEAD', credentials: 'include' });
    pgBackendOnline = res.ok || res.status < 500;
  } catch {
    pgBackendOnline = false;
  }
  lastCheck = now;
  return pgBackendOnline ?? false;
}

// ---- localStorage helpers ----
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota exceeded — safe to ignore */ }
}

function broadcastSync(): void {
  try {
    new BroadcastChannel(BC_NAME).postMessage('sync');
  } catch { /* unsupported — safe to ignore */ }
}

// ---- Main hook ----

const SYNC_API = '/api/realtime/state';
const POLL_INTERVAL_MS = 3000;

export function useDealSync(userId?: number) {
  const [dealStates, setDealStates] = useState<Record<string, DealState>>({});
  const [applications, setApplications] = useState<SharedApplication[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(false);
  const syncInProgress = useRef(false);

  // Cross-device sync refs — prevent echo loops between persist and poll
  const externalUpdateRef = useRef(false);
  const lastPersistRef = useRef('');
  const dealStatesRef = useRef(dealStates);
  const campaignsRef = useRef(campaigns);
  const applicationsRef = useRef(applications);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Keep refs in sync
  dealStatesRef.current = dealStates;
  campaignsRef.current = campaigns;
  applicationsRef.current = applications;

  // Initial load — try backend, fall back to localStorage
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const backendUp = await isBackendOnline();
      if (cancelled) return;
      setOnline(backendUp);

      if (backendUp) {
        // ── Try PostgreSQL API endpoints (Next.js API routes → DB) ──

        // 1. Load campaigns from PostgreSQL
        try {
          const campRes = await fetch('/api/campaigns/list', { credentials: 'include' });
          if (!cancelled && campRes.ok) {
            const campData = await campRes.json();
            if (campData.campaigns) {
              const dbCampaigns: Campaign[] = campData.campaigns.map((c: any) => ({
                id: c.id,
                brandName: '',
                brandProfession: '',
                title: c.title || '',
                description: c.description || '',
                requiredProfessions: [],
                minLevel: 0,
                maxLevel: 0,
                budget: String(c.budget_per_creator || '0'),
                deadline: c.deadline || '',
                location: '',
                nonNegotiables: [],
                deliverables: '',
                status: c.status === 'active' ? 'open' : 'closed',
                applicants: Number(c.invite_count || 0),
              }));
              const localCampaigns = loadFromStorage<Campaign[]>(STORAGE_CAMPAIGNS, []);
              const dbIds = new Set(dbCampaigns.map(c => c.id));
              const localOnly = localCampaigns.filter(c => !dbIds.has(c.id));
              const merged = [...dbCampaigns, ...localOnly];
              setCampaigns(merged);
              saveToStorage(STORAGE_CAMPAIGNS, merged);
            }
          }
        } catch { /* fall through */ }

        // 2. Load deals from PostgreSQL
        try {
          const dealRes = await fetch('/api/deals/my-deals', { credentials: 'include' });
          if (!cancelled && dealRes.ok) {
            const dealData = await dealRes.json();
            if (dealData.deals) {
              const dbDeals: Record<string, DealState> = {};
              for (const d of dealData.deals) {
                const key = `${d.title || 'Deal'}:${d.id}`;
                dbDeals[key] = {
                  phase: mapDbDealPhase(d.status),
                  intent: 'campaign',
                  briefFilled: true,
                  briefTitle: d.title || '',
                  offerAmount: String(d.offerAmount || ''),
                  counterAmount: '',
                  brandResponseAmount: '',
                  chatMessages: [],
                  chatInput: '',
                  performanceClause: false,
                  advancePercent: 30,
                  uploadPercent: 40,
                  approvalPercent: 30,
                  backendDealRoomId: typeof d.id === 'number' ? d.id : undefined,
                  creatorName: d.partnerName,
                };
              }
              const localDeals = loadFromStorage<Record<string, DealState>>(STORAGE_DEALS, {});
              const merged = { ...localDeals, ...dbDeals };
              setDealStates(merged);
              saveToStorage(STORAGE_DEALS, merged);
            }
          }
        } catch { /* fall through */ }

        // 3. Load bids (applications) from PostgreSQL
        try {
          const bidRes = await fetch('/api/bids/', { credentials: 'include' });
          if (!cancelled && bidRes.ok) {
            const bidData = await bidRes.json();
            if (bidData.bids) {
              const dbApps: SharedApplication[] = bidData.bids.map((b: any) => ({
                id: b.id,
                campaignId: b.campaign_id,
                campaignTitle: b.campaign_title || '',
                creatorProfession: '',
                creatorHandle: '',
                status: mapBidStatus(b.status),
                appliedAt: b.created_at || new Date().toISOString(),
              }));
              const localApps = loadFromStorage<SharedApplication[]>(STORAGE_APPLICATIONS, []);
              const dbIds = new Set(dbApps.map(a => a.id));
              const localOnly = localApps.filter(a => !dbIds.has(a.id));
              const merged = [...dbApps, ...localOnly];
              setApplications(merged);
              saveToStorage(STORAGE_APPLICATIONS, merged);
            }
          }
        } catch { /* fall through */ }

      } else {
        // Offline mode — load everything from localStorage
        setDealStates(loadFromStorage(STORAGE_DEALS, {}));
        setApplications(loadFromStorage(STORAGE_APPLICATIONS, []));
      }

      // Load campaigns from localStorage if PG load didn't populate them
      setCampaigns(prev => {
        if (prev.length > 0) return prev;
        return loadFromStorage(STORAGE_CAMPAIGNS, []);
      });
      if (!cancelled) setLoaded(true);
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // Persist deals to localStorage on change
  useEffect(() => {
    if (!loaded) return;
    saveToStorage(STORAGE_DEALS, dealStates);
    broadcastSync();
  }, [dealStates, loaded]);

  // Persist applications to localStorage on change
  useEffect(() => {
    if (!loaded) return;
    saveToStorage(STORAGE_APPLICATIONS, applications);
    broadcastSync();
  }, [applications, loaded]);

  // Persist campaigns to localStorage on change
  useEffect(() => {
    if (!loaded) return;
    saveToStorage(STORAGE_CAMPAIGNS, campaigns);
    broadcastSync();
  }, [campaigns, loaded]);

  // Listen for cross-tab sync
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = () => {
        setDealStates(loadFromStorage(STORAGE_DEALS, {}));
        setApplications(loadFromStorage(STORAGE_APPLICATIONS, []));
        setCampaigns(loadFromStorage(STORAGE_CAMPAIGNS, []));
      };
    } catch { /* unsupported */ }

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_DEALS) setDealStates(loadFromStorage(STORAGE_DEALS, {}));
      if (e.key === STORAGE_APPLICATIONS) setApplications(loadFromStorage(STORAGE_APPLICATIONS, []));
      if (e.key === STORAGE_CAMPAIGNS) setCampaigns(loadFromStorage(STORAGE_CAMPAIGNS, []));
    };
    window.addEventListener('storage', onStorage);
    return () => {
      bc?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // ── Cross-device sync ────────────────────────────────────────────────

  // 1. Load from shared database on mount
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadShared() {
      try {
        const res = await fetch(SYNC_API);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!data) return;
        externalUpdateRef.current = true;
        if (data.deals && typeof data.deals === 'object') {
          setDealStates(prev => {
            const merged = { ...prev };
            for (const [k, v] of Object.entries(data.deals)) {
              merged[k] = { ...(merged[k] || {} as DealState), ...(v as Partial<DealState>) };
            }
            return merged;
          });
        }
        if (Array.isArray(data.applications)) setApplications(data.applications);
        if (Array.isArray(data.campaigns)) {
          setCampaigns(prev => {
            const localIds = new Set(prev.map(c => c.id));
            const newOnes = (data.campaigns as Campaign[]).filter(c => !localIds.has(c.id));
            if (newOnes.length === 0) return prev;
            return [...prev, ...newOnes];
          });
        }
        setTimeout(() => { externalUpdateRef.current = false; }, 200);
      } catch { /* shared DB not reachable — no-op */ }
    }

    loadShared();
    return () => { cancelled = true; };
  }, [userId]);

  // 2. Debounced persist to shared database after local mutations
  //    Skipped when the update originated from external sync (prevents echo)
  useEffect(() => {
    if (!userIdRef.current || !loaded || externalUpdateRef.current) return;
    const payload = { deals: dealStates, campaigns, applications };
    const str = JSON.stringify(payload);
    if (str === lastPersistRef.current) return;
    lastPersistRef.current = str;
    const timer = setTimeout(() => {
      const uid = userIdRef.current!;
      fetch(SYNC_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: payload }) })
        .then(() => {
          broadcastEvent({
            event_type: 'state_updated',
            user_id: uid,
            data: payload,
            timestamp: new Date().toISOString(),
          }).catch(() => {});
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [dealStates, campaigns, applications, loaded]);

  // 3. Poll for external changes
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(SYNC_API);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!data) return;
        const localStr = JSON.stringify({ deals: dealStatesRef.current, campaigns: campaignsRef.current, applications: applicationsRef.current });
        const remoteStr = JSON.stringify({ deals: data.deals || {}, campaigns: data.campaigns || [], applications: data.applications || [] });
        if (localStr === remoteStr) return;
        externalUpdateRef.current = true;
        if (data.deals && typeof data.deals === 'object') {
          setDealStates(prev => {
            const merged = { ...prev };
            for (const [k, v] of Object.entries(data.deals)) {
              merged[k] = { ...(merged[k] || {} as DealState), ...(v as Partial<DealState>) };
            }
            return merged;
          });
        }
        if (Array.isArray(data.applications)) setApplications(data.applications);
        if (Array.isArray(data.campaigns)) {
          setCampaigns(prev => {
            const localIds = new Set(prev.map(c => c.id));
            const newOnes = (data.campaigns as Campaign[]).filter(c => !localIds.has(c.id));
            if (newOnes.length === 0) return prev;
            return [...prev, ...newOnes];
          });
        }
        setTimeout(() => { externalUpdateRef.current = false; }, 200);
      } catch { /* no-op */ }
    }, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [userId]);

  // 4. Subscribe to real-time events from other users (shared app channel)
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToAppEvents((event: RealtimeEvent) => {
      if (event.user_id === userIdRef.current) return; // skip own events
      const data = event.data;
      if (!data) return;
      externalUpdateRef.current = true;
      if (event.event_type === 'state_updated' || event.event_type === 'deal_created' || event.event_type === 'deal_updated') {
        if (data.dealKey) {
          setDealStates(prev => ({
            ...prev,
            [data.dealKey]: { ...(prev[data.dealKey] || {} as DealState), ...data.updates },
          }));
        } else if (data.deals) {
          setDealStates(prev => {
            const merged = { ...prev };
            for (const [k, v] of Object.entries(data.deals)) {
              merged[k] = { ...(merged[k] || {} as DealState), ...(v as Partial<DealState>) };
            }
            return merged;
          });
        }
        if (data.campaigns && Array.isArray(data.campaigns)) {
          setCampaigns(data.campaigns);
        }
        if (data.applications && Array.isArray(data.applications)) {
          setApplications(data.applications);
        }
      }
      if (event.event_type === 'campaign_created' && data.campaign) {
        setCampaigns(prev => [...prev, data.campaign]);
      }
      if (event.event_type === 'application_received' && data.application) {
        setApplications(prev => [...prev, data.application]);
      }
      if (event.event_type === 'message_sent' && data.dealKey && data.message) {
        setDealStates(prev => {
          const deal = prev[data.dealKey];
          if (!deal) return prev;
          return { ...prev, [data.dealKey]: { ...deal, chatMessages: [...deal.chatMessages, data.message] } };
        });
      }
      setTimeout(() => { externalUpdateRef.current = false; }, 200);
    });
    return unsubscribe;
  }, [userId]);

  // ---- Deal state helpers ----

  const getOrCreateDeal = useCallback((key: string): DealState => {
    return dealStates[key] ?? {
      phase: 'brief' as const,
      intent: 'campaign' as const,
      briefFilled: false,
      briefTitle: '',
      offerAmount: '',
      counterAmount: '',
      brandResponseAmount: '',
      chatMessages: [
        { id: 1, sender: 'brand' as const, text: 'Hey! Excited to work together on this campaign.', time: 'just now', isoTime: new Date().toISOString(), seen: false },
      ],
      chatInput: '',
      performanceClause: false,
      advancePercent: 70,
      uploadPercent: 0,
      approvalPercent: 0,
      dealType: undefined,
      goodsTrackerStatus: undefined,
      goodsTrackingNumber: undefined,
      c2cContentStatus: undefined,
      isInternationalDeal: false,
      customsComplianceAcknowledged: false,
      poc: undefined,
    };
  }, [dealStates]);

  const updateDeal = useCallback((key: string, patch: Partial<DealState>) => {
    setDealStates(prev => {
      const existing = prev[key] ?? {
        phase: 'brief' as const,
        intent: 'campaign' as const,
        briefFilled: false,
        briefTitle: '',
        offerAmount: '',
        counterAmount: '',
        chatMessages: [
          { id: 1, sender: 'brand' as const, text: 'Hey! Excited to work together on this campaign.', time: 'just now', isoTime: new Date().toISOString(), seen: false },
        ],
        chatInput: '',
        performanceClause: false,
        advancePercent: 70,
        uploadPercent: 0,
        approvalPercent: 0,
        dealType: undefined,
        goodsTrackerStatus: undefined,
        goodsTrackingNumber: undefined,
        c2cContentStatus: undefined,
        isInternationalDeal: false,
        customsComplianceAcknowledged: false,
        poc: undefined,
      };
      return { ...prev, [key]: { ...existing, ...prev[key], ...patch } };
    });
  }, []);

  // ---- API-backed mutations ----

  /** Open a deal room — tries PostgreSQL API first, then Rust backend, falls back to localStorage-only */
  const openDealRoom = useCallback(async (
    key: string,
    creatorPersonaId: number,
    briefData: {
      intent: string;
      title: string;
      description: string;
      deliverables: string;
      campaignType: string;
      compensationType?: string;
    }
  ) => {
    // Try PostgreSQL deals API first
    try {
      const skinParts = key.split(':');
      const valueSkin = skinParts.length > 1 ? skinParts[skinParts.length - 1] : '';
      const res = await fetch('/api/deals/create-with-skin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          title: briefData.title,
          description: briefData.description,
          budget: Number(briefData.compensationType) || 0,
          valueSkin,
          creatorId: creatorPersonaId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.dealId) {
        updateDeal(key, {
          phase: 'offer',
          intent: briefData.intent as DealState['intent'],
          briefFilled: true,
          briefTitle: briefData.title,
          backendDealRoomId: typeof data.dealId === 'number' ? data.dealId : parseInt(String(data.dealId)) || undefined,
        });
        return data.dealId;
      }
    } catch { /* fall through */ }

    // Offline fallback
    updateDeal(key, {
      phase: 'offer',
      intent: briefData.intent as DealState['intent'],
      briefFilled: true,
      briefTitle: briefData.title,
    });
    return null;
  }, [updateDeal]);

  /** Send a chat message — persists to PostgreSQL via /api/deals/message */
  const sendMessage = useCallback(async (
    key: string,
    text: string,
    sender: 'me' | 'brand' = 'me'
  ) => {
    const deal = dealStates[key];
    const dealId = deal?.backendDealRoomId;
    const newMsg: ChatMessage = {
      id: Date.now(),
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isoTime: new Date().toISOString(),
      seen: false,
    };

    // Update locally immediately (optimistic)
    setDealStates(prev => {
      const existing = prev[key];
      if (!existing) return prev;
      return {
        ...prev,
        [key]: {
          ...existing,
          chatMessages: [...existing.chatMessages, newMsg],
          chatInput: '',
        },
      };
    });

    // Persist to PostgreSQL
    if (dealId) {
      try {
        await fetch('/api/deals/message', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ dealId, message: text }),
        });
      } catch { /* message saved locally */ }
    }
  }, [dealStates]);

  /** Make an offer — persists offer message to PostgreSQL */
  const makeOffer = useCallback(async (
    key: string,
    amountCents: number,
    note?: string
  ) => {
    const deal = dealStates[key];
    const dealId = deal?.backendDealRoomId;
    const offerText = `Offer: $${(amountCents / 100).toFixed(0)}${note ? ` - ${note}` : ''}`;

    if (dealId) {
      try {
        await fetch('/api/deals/message', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ dealId, message: offerText }),
        });
      } catch { /* local fallback */ }
    }

    updateDeal(key, { phase: 'counter', offerAmount: String(amountCents / 100) });
  }, [dealStates, updateDeal]);

  /** Submit application — writes to PostgreSQL via bids API */
  const submitApplication = useCallback(async (
    opportunityId: number,
    personaId: number,
    pitch: string,
    appData: Omit<SharedApplication, 'id'>
  ) => {
    let appId = Date.now();

    try {
      const res = await fetch('/api/bids/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          campaign_id: opportunityId,
          bid_amount: 0,
          proposal: pitch,
        }),
      });
      const data = await res.json();
      if (res.ok && data.bid) {
        appId = data.bid.id;
      }
    } catch { /* fall through to local fallback */ }

    const newApp: SharedApplication = { ...appData, id: appId };
    setApplications(prev => [...prev, newApp]);
  }, []);

  /** Accept application (brand side) — upserts to PostgreSQL via bids API */
  const acceptApplication = useCallback(async (
    applicationId: number,
    opportunityId: number,
    personaId: number
  ) => {
    try {
      await fetch('/api/bids/', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ bid_id: applicationId, action: 'accept' }),
      });
    } catch { /* local update still applies */ }

    setApplications(prev =>
      prev.map(a => a.id === applicationId ? { ...a, status: 'accepted' as const } : a)
    );
  }, []);

  /** Create campaign (brand side) — writes to PostgreSQL via campaigns API */
  const createCampaign = useCallback(async (campaign: Omit<Campaign, 'id'>) => {
    let campId = Date.now();

    try {
      const res = await fetch('/api/campaigns/list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          title: campaign.title,
          description: campaign.description,
          budget_per_creator: Number(campaign.budget) || 0,
          total_budget: Number(campaign.budget) || 0,
          delivery_type: campaign.deliverables?.includes('digital') ? 'digital_access' : 'no_delivery',
        }),
      });
      const data = await res.json();
      if (res.ok && data.campaign) {
        campId = data.campaign.id;
      }
    } catch { /* fall through to local fallback */ }

    const newCampaign: Campaign = { ...campaign, id: campId };
    setCampaigns(prev => [...prev, newCampaign]);
  }, []);

  /** Finalize deal — updates local state (PostgreSQL completion handled by escrow/release flow) */
  const finalizeDeal = useCallback(async (key: string) => {
    const deal = dealStates[key];
    const dealId = deal?.backendDealRoomId;

    if (dealId) {
      try {
        await fetch('/api/deals/complete-with-release', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ dealId }),
        });
      } catch { /* local update still applies */ }
    }

    updateDeal(key, { phase: 'accepted' });
  }, [dealStates, updateDeal]);

  /** Background sync — creates PostgreSQL records for local-only deals */
  const syncToBackend = useCallback(async () => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;

    try {
      const backendUp = await isBackendOnline();
      if (!backendUp) return;
      setOnline(true);

      for (const [key, deal] of Object.entries(dealStates)) {
        if (deal.backendDealRoomId || deal.phase === 'brief') continue;

        const skinParts = key.split(':');
        const valueSkin = skinParts.length > 1 ? skinParts[skinParts.length - 1] : '';

        try {
          const res = await fetch('/api/deals/create-with-skin', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({
              title: deal.briefTitle || key.split(':')[0],
              description: 'Synced from local state',
              budget: Number(deal.offerAmount) || 0,
              valueSkin,
              creatorId: 1,
            }),
          });
          const data = await res.json();
          if (res.ok && data.dealId) {
            updateDeal(key, {
              backendDealRoomId: typeof data.dealId === 'number' ? data.dealId : parseInt(String(data.dealId)) || undefined,
            });
          }
        } catch { /* skip this deal */ }
      }
    } finally {
      syncInProgress.current = false;
    }
  }, [dealStates, updateDeal]);

  // Run background sync every 60 seconds
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(syncToBackend, 60_000);
    return () => clearInterval(interval);
  }, [loaded, syncToBackend]);

  return {
    // State
    dealStates,
    setDealStates,
    applications,
    setApplications,
    campaigns,
    setCampaigns,
    loaded,
    online,

    // Deal helpers
    getOrCreateDeal,
    updateDeal,

    // API-backed mutations
    openDealRoom,
    sendMessage,
    makeOffer,
    submitApplication,
    acceptApplication,
    createCampaign,
    finalizeDeal,
    syncToBackend,
  };
}

// ---- Helpers ----

function mapStatusToPhase(status: string): DealRoomPhase {
  switch (status) {
    case 'active': return 'chatroom';
    case 'accepted': return 'accepted';
    case 'completed': return 'accepted';
    case 'cancelled':
    case 'expired':
    case 'rejected': return 'brief';
    default: return 'brief';
  }
}

function mapDbDealPhase(status: string): DealRoomPhase {
  switch (status) {
    case 'offer':
    case 'negotiation': return 'offer';
    case 'active':
    case 'in_progress': return 'chatroom';
    case 'checklist': return 'checklist';
    case 'accepted':
    case 'completed': return 'accepted';
    case 'rejected':
    case 'cancelled': return 'rejected';
    default: return 'brief';
  }
}

function mapBidStatus(status: string): SharedApplication['status'] {
  switch (status) {
    case 'pending': return 'pending';
    case 'accepted': return 'accepted';
    case 'rejected': return 'rejected';
    case 'withdrawn': return 'pending';
    default: return 'pending';
  }
}
