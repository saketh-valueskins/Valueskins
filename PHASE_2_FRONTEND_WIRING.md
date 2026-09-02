# Phase 2: Frontend API Wiring to Real Backend

**Status:** 121 localStorage calls + fake realtime to replace with real backend APIs  
**Timeline:** 4-6 hours of focused work  
**Blocker:** Backend must be live with /health/live responding

---

## Files to Modify (Priority Order)

### 1. Core API Client (HIGH PRIORITY)
**File:** `marketplace/src/lib/api.ts`

**Current state:** Mock API client with fake responses  
**Action:** Replace with real backend calls

```typescript
// BEFORE (mock)
export const createDeal = async (deal: Deal) => {
  const deals = JSON.parse(localStorage.getItem('deals') || '{}');
  deals[deal.id] = deal;
  localStorage.setItem('deals', JSON.stringify(deals));
  return deal;
};

// AFTER (real backend)
export const createDeal = async (deal: Deal) => {
  const response = await fetch(`${API_BASE}/deals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // httpOnly cookies
    body: JSON.stringify(deal)
  });
  if (!response.ok) throw new Error('Failed to create deal');
  return response.json();
};
```

**API Endpoints to wire:**
- POST `/deals` → Create deal
- GET `/deals/:id` → Get deal
- PUT `/deals/:id` → Update deal
- GET `/deals` → List deals (paginated)
- POST `/deals/:id/approve` → Approve deal
- POST `/deals/:id/reject` → Reject deal

---

### 2. Authentication (CRITICAL)
**File:** `marketplace/src/context/AuthContext.tsx`

**Current state:** Mock login, localStorage token  
**Action:** Wire to real Render backend auth

```typescript
// BEFORE (mock)
const login = async (email: string, password: string) => {
  localStorage.setItem('auth_token', 'mock-jwt-token');
  setUser({ id: '1', email, role: 'brand' });
};

// AFTER (real backend)
const login = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Server sets httpOnly cookie
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  
  setUser(data.user); // User data in response
  // Token stored in httpOnly cookie automatically by browser
};
```

**API Endpoints:**
- POST `/auth/login` → Login (returns user + sets httpOnly cookie)
- POST `/auth/signup` → Signup
- POST `/auth/logout` → Logout
- GET `/auth/me` → Current user (verify httpOnly cookie)
- POST `/auth/refresh` → Refresh token (if expired)

---

### 3. Realtime Messages (HIGH PRIORITY)
**File:** `marketplace/src/features/valueskins/core/realtime/useSupabaseRoom.ts`

**Current state:** In-memory SharedStateManager  
**Action:** Replace with WebSocket connection to backend

```typescript
// BEFORE (fake)
export const useSupabaseRoom = () => {
  const [state, setState] = useState(sharedStateManager.getState());
  
  const addMessage = (dealId: string, message: any) => {
    sharedStateManager.updateCollection('messages', dealId, message);
  };
};

// AFTER (real WebSocket)
export const useWebSocket = (backendUrl: string) => {
  const [state, setState] = useState({});
  const wsRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
    wsRef.current = new WebSocket(`${backendUrl}/ws?token=${token}`);
    
    wsRef.current.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      
      if (type === 'message:new') {
        setState(prev => ({
          ...prev,
          messages: { ...prev.messages, [data.dealId]: [...(prev.messages[data.dealId] || []), data] }
        }));
      }
      if (type === 'deal:updated') {
        setState(prev => ({
          ...prev,
          deals: { ...prev.deals, [data.id]: data }
        }));
      }
    };
    
    return () => wsRef.current?.close();
  }, [backendUrl]);
  
  const sendMessage = (dealId: string, message: string) => {
    wsRef.current?.send(JSON.stringify({
      type: 'message:send',
      dealId,
      message
    }));
  };
  
  return { state, sendMessage };
};
```

**WebSocket Events to handle:**
- `message:new` → New chat message
- `deal:updated` → Deal status change
- `deal:created` → New deal in feed
- `notification:new` → Incoming notification
- `application:received` → New creator application
- `offer:received` → Counter-offer from creator
- `presence:online` → User online/offline

---

### 4. Deals & Marketplace (HIGH PRIORITY)
**File:** `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx`

**Current state:** Reads/writes to sharedStateManager (localStorage)  
**Action:** Replace with API calls + WebSocket updates

```typescript
// BEFORE
const { state: sharedState } = useSupabaseRoom(null, null, '');
const deals = Object.values(sharedState.deals || {});

// AFTER
const [deals, setDeals] = useState([]);

useEffect(() => {
  const fetchDeals = async () => {
    const response = await fetch(`${API_BASE}/deals?limit=50&offset=0`, {
      credentials: 'include'
    });
    const data = await response.json();
    setDeals(data.deals);
  };
  
  fetchDeals();
}, []);

// Listen for real-time updates
useEffect(() => {
  const handler = (message) => {
    if (message.type === 'deal:created') {
      setDeals(prev => [message.data, ...prev]);
    }
    if (message.type === 'deal:updated') {
      setDeals(prev => prev.map(d => d.id === message.data.id ? message.data : d));
    }
  };
  
  ws.addEventListener('message', handler);
  return () => ws.removeEventListener('message', handler);
}, [ws]);
```

**API Endpoints:**
- GET `/deals` → List all deals (with filters, pagination)
- POST `/deals` → Create deal (creator or brand)
- GET `/deals/:id` → Get deal details
- PUT `/deals/:id` → Update deal
- POST `/deals/:id/approve` → Approve deal
- POST `/deals/:id/counter` → Send counter-offer
- POST `/deals/:id/messages` → Send message
- GET `/deals/:id/messages` → Get chat history

---

### 5. Creators (MEDIUM PRIORITY)
**File:** `marketplace/src/features/creators/CreatorProfile.tsx`

**Current state:** localStorage data  
**Action:** Fetch from backend

```typescript
// BEFORE
const creator = JSON.parse(localStorage.getItem(`creator_${creatorId}`) || '{}');

// AFTER
const [creator, setCreator] = useState(null);

useEffect(() => {
  const fetchCreator = async () => {
    const response = await fetch(`${API_BASE}/creators/${creatorId}`, {
      credentials: 'include'
    });
    setCreator(await response.json());
  };
  
  fetchCreator();
}, [creatorId]);
```

**API Endpoints:**
- GET `/creators` → List creators (search/filter)
- GET `/creators/:id` → Get creator profile
- PUT `/creators/:id` → Update creator profile
- POST `/creators/:id/follow` → Follow creator
- GET `/creators/:id/portfolio` → Get creator portfolio

---

### 6. Brands (MEDIUM PRIORITY)
**File:** `marketplace/src/features/brands/BrandProfile.tsx`

**Current state:** localStorage data  
**Action:** Fetch from backend

```typescript
// BEFORE
const brand = JSON.parse(localStorage.getItem(`brand_${brandId}`) || '{}');

// AFTER
const [brand, setBrand] = useState(null);

useEffect(() => {
  const fetchBrand = async () => {
    const response = await fetch(`${API_BASE}/brands/${brandId}`, {
      credentials: 'include'
    });
    setBrand(await response.json());
  };
  
  fetchBrand();
}, [brandId]);
```

**API Endpoints:**
- GET `/brands` → List brands
- GET `/brands/:id` → Get brand profile
- PUT `/brands/:id` → Update brand profile
- GET `/brands/:id/campaigns` → Get active campaigns
- POST `/brands/:id/campaigns` → Create campaign

---

### 7. Notifications (MEDIUM PRIORITY)
**File:** `marketplace/src/features/notifications/NotificationCenter.tsx`

**Current state:** Mock notifications in localStorage  
**Action:** Fetch from backend + WebSocket updates

```typescript
// BEFORE
const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');

// AFTER
const [notifications, setNotifications] = useState([]);

useEffect(() => {
  const fetchNotifications = async () => {
    const response = await fetch(`${API_BASE}/notifications?limit=50`, {
      credentials: 'include'
    });
    setNotifications(await response.json());
  };
  
  fetchNotifications();
}, []);

// Real-time updates
useEffect(() => {
  const handler = (message) => {
    if (message.type === 'notification:new') {
      setNotifications(prev => [message.data, ...prev]);
    }
  };
  
  ws.addEventListener('message', handler);
  return () => ws.removeEventListener('message', handler);
}, [ws]);
```

**API Endpoints:**
- GET `/notifications` → List notifications
- POST `/notifications/:id/read` → Mark as read
- DELETE `/notifications/:id` → Delete notification

---

## Environment Variables (Set in `.env.production`)

```env
NEXT_PUBLIC_BACKEND_URL=https://valueskins-api-[ID].render.com
NEXT_PUBLIC_WS_URL=wss://valueskins-api-[ID].render.com/ws
NEXT_PUBLIC_API_TIMEOUT=30000
```

---

## Files to DELETE (No longer needed)

1. `marketplace/src/lib/shared-state.ts` — In-memory state manager
2. `marketplace/src/features/valueskins/core/realtime/useSupabaseRoom.ts` — Fake realtime
3. `marketplace/src/lib/demo-data.ts` — Mock data (if exists)
4. All localStorage calls in:
   - `marketplace/src/context/AuthContext.tsx`
   - `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx`
   - `marketplace/src/features/creators/*.tsx`
   - `marketplace/src/features/brands/*.tsx`

---

## Implementation Checklist

### Step 1: Environment Setup
- [ ] Get backend URL from Render
- [ ] Set NEXT_PUBLIC_BACKEND_URL in .env.production
- [ ] Set NEXT_PUBLIC_WS_URL in .env.production
- [ ] Verify .env.local has same values for local dev

### Step 2: Auth Integration
- [ ] Modify AuthContext.tsx to call POST /auth/login
- [ ] Test login with real backend
- [ ] Verify httpOnly cookie is set
- [ ] Test logout (clears cookie)
- [ ] Test session persistence (refresh page, still logged in)

### Step 3: API Client Setup
- [ ] Update api.ts with real backend endpoints
- [ ] Test GET /deals (returns real data)
- [ ] Test POST /deals (creates and returns ID)
- [ ] Test PUT /deals/:id (updates)
- [ ] Test error handling (network failure, 401 unauthorized)

### Step 4: WebSocket Connection
- [ ] Create useWebSocket hook
- [ ] Connect to wss://backend/ws
- [ ] Authenticate with httpOnly token
- [ ] Handle message types (deal:updated, message:new, etc.)
- [ ] Implement reconnection logic
- [ ] Test on two browser windows (verify real-time sync)

### Step 5: Replace Realtime in Pages
- [ ] MarketplaceDemoPage: Use API instead of useSupabaseRoom
- [ ] Messages: Fetch from GET /deals/:id/messages
- [ ] Notifications: Fetch from GET /notifications
- [ ] Deals list: Fetch from GET /deals
- [ ] Test each page loads data correctly

### Step 6: Error Handling
- [ ] Network error → Show toast message
- [ ] 401 Unauthorized → Redirect to login
- [ ] 404 Not Found → Show "Not found" state
- [ ] 500 Server Error → Show retry button
- [ ] Timeout → Show "Please try again" message

### Step 7: Testing (Critical)
- [ ] Two browser windows: Brand + Creator accounts
- [ ] Brand creates deal → Creator sees it instantly (<1s)
- [ ] Creator counters → Brand sees update instantly
- [ ] Both send messages → Appear in real-time on both
- [ ] Refresh page → Data persists (from backend, not cache)
- [ ] Disconnect network → Reconnect auto-resumes
- [ ] 10+ concurrent users → No errors, <500ms latency

### Step 8: Clean Up
- [ ] Delete localStorage calls
- [ ] Delete SharedStateManager
- [ ] Delete mock data
- [ ] Remove useSupabaseRoom import
- [ ] Run `npm run build` (no errors)
- [ ] Test production build locally

---

## Success Criteria

✅ Login/logout works with real backend  
✅ Deals display from database (not mock)  
✅ Create deal → Instantly visible to other users  
✅ Messages sync in real-time  
✅ Notifications arrive instantly  
✅ Page refresh → Data persists  
✅ Network drop → Auto-reconnect  
✅ Two devices show same data  
✅ No localStorage calls in network requests  
✅ All 121 localStorage references removed  

---

## Rollback Plan (If Something Breaks)

If backend connectivity fails:
1. Revert commit: `git revert HEAD`
2. App falls back to fake realtime (existing code)
3. Users keep working while we fix backend
4. Re-deploy when backend is stable

---

## Timeline

- **Hour 1:** Auth + API client setup
- **Hour 2:** WebSocket connection + events
- **Hour 3:** Replace MarketplaceDemoPage + Deals
- **Hour 4:** Replace Creators/Brands/Notifications
- **Hour 5:** Error handling + cleanup
- **Hour 6:** Testing + bug fixes

**Total: 4-6 hours to fully wire frontend to live backend**

---

## Next: Phase 3 (After Phase 2 Complete)

Once frontend is wired to real backend:

1. Merge develop (features: auto-matching removal, script simplification)
2. Deploy to production
3. Real data flows through real backend
4. Monitor metrics: latency, error rate, concurrent users
5. Begin scaling to 1000 concurrent users

