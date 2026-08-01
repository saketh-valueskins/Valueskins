# Real-Time Architecture - Firebase Only

## Decision: Firebase Realtime Database (Final & Locked)

**No more Supabase. No more Render WebSocket. Firebase only.**

This document locks in the decision to use Firebase Realtime Database exclusively for all cross-device, cross-browser real-time synchronization.

---

## Architecture

### Data Flow

```
User Action (Create Campaign)
    ↓
Frontend UI Update + Local State
    ↓
POST /api/realtime/state
    ↓
Firebase Realtime DB (marketplace/realtime-state)
    ↓
Poll /api/realtime/state (every 2 seconds)
    ↓
Frontend fetches latest campaigns
    ↓
setCampaigns() updates UI
    ↓
All other devices see the same data
```

### Components

#### 1. Firebase REST API Endpoint
**File:** `marketplace/src/pages/api/realtime/state.ts`

- **GET:** Fetches latest state from Firebase at `marketplace/realtime-state`
- **POST:** Writes state to Firebase (triggered by campaign creation, deal updates, etc.)
- Uses Firebase REST API (`https://your-db.firebaseio.com/path.json`)

#### 2. Frontend Polling
**File:** `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx`

- Polls `/api/realtime/state` every 2 seconds
- Updates campaigns state when new data arrives
- Simple, reliable, works across all devices

#### 3. Backend Event Broadcasting
**File:** `marketplace/src/lib/realtime/broadcaster.ts`

- Backend events trigger Firebase writes
- Path: `/realtime/{aggregate_type}/{aggregate_id}/events/{event_id}`
- Events from event-driven architecture are persisted to Firebase

---

## What's Removed

### ❌ Supabase Realtime
- Removed: `subscribeToAppEvents()` hook from MarketplaceDemoPage
- Removed: Supabase channel subscriptions
- Files to delete eventually: `marketplace/src/lib/supabase-realtime.ts`

### ❌ Custom WebSocket Server
- Removed: `/ws` endpoint references
- WebSocket client files remain but unused
- File: `marketplace/src/lib/realtime-client.ts` (unused)

### ❌ Complex Subscriptions
- Removed: Subscription manager complexity
- Removed: Per-user/per-aggregate channel routing
- Removed: Authorization checks on channels (Firebase rules handle this)

---

## How It Works (Step-by-Step)

### Creating a Campaign

1. User fills form and clicks "Create Campaign"
2. Frontend creates local state and adds to list
3. Frontend calls POST /api/realtime/state with updated campaigns
4. Backend writes to Firebase at `marketplace/realtime-state`
5. Other devices' poll intervals fetch and see new campaign

### Polling (Every 2 Seconds)

```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch('/api/realtime/state');
    const data = await res.json();
    setCampaigns(data.campaigns); // Update state
  }, 2000);
  return () => clearInterval(interval);
}, []);
```

---

## Firebase Path Structure

```
marketplace/
  └── realtime-state
      ├── campaigns: []
      ├── deals: {}
      ├── messages: {}
      ├── applications: []
      └── notifications: []
```

Every 2 seconds, clients fetch this entire tree and update state.

---

## Polling Interval: 2 Seconds

- Fast enough for UX (user sees updates ~2 sec after creation)
- Cheap enough for Firebase (not hammering the API)
- Simple enough to maintain (no event subscriptions)

---

## Status: LOCKED ✅

- Firebase Realtime Database = Final Choice
- Polling every 2 seconds = Working Solution
- All devices sync without page refresh
- No more confusion about which system to use

Done.
