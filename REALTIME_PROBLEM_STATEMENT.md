# Real-Time Cross-Device Synchronization Problem Statement

## Current State
**What works:**
- Real-time updates **within the same browser instance** on a single device
- When a user creates a campaign in `/demo/marketplace`, it appears immediately in the UI
- Campaigns, deals, messages, chats all update in real-time on the same browser

**What doesn't work:**
- Real-time updates **across different browsers/devices**
- Create campaign on laptop browser → phone browser doesn't see it without manual refresh
- Open app on 2 different devices → changes on device A don't appear on device B in real-time

## Technology Stack
- **Frontend:** Next.js, React with TypeScript, running at `/demo/marketplace`
- **Backend:** Next.js API routes, event-driven architecture (event dispatcher, handlers, commands)
- **Realtime Storage:** Firebase Realtime Database (ONLY, no Supabase, no custom WebSocket server)
- **Polling Interval:** 2 seconds (when implemented)

## Attempts Made (All Failed)

### Attempt 1: Supabase Realtime Channels
**What we tried:**
- Wired backend to broadcast campaign events to Supabase realtime channels
- Frontend subscribed to `channel.on('broadcast', ...)` events
- Expected: Frontend receives events, updates state, UI re-renders

**Why it failed:**
- Frontend had subscription listener but backend wasn't actually broadcasting to those channels
- Even when broadcaster was wired, Supabase channels didn't reliably deliver to multiple devices
- Type errors with `channel.send()` method
- User complained: "I've noticed you keep changing between supabase, firebase and render for realtime thing"

### Attempt 2: Firebase Broadcaster (Event-Based)
**What we tried:**
- Created `/marketplace/src/lib/realtime/broadcaster.ts`
- Backend event system emits `campaign_created`, `deal_created`, `message_sent` events
- Broadcaster writes each event to Firebase path: `/realtime/{aggregate_type}/{aggregate_id}/events/{event_id}`
- Frontend was supposed to listen to these paths and reconstruct state

**Why it failed:**
- Frontend wasn't listening to `/realtime/...` paths
- Broadcaster was writing events to Firebase, but no frontend code read from those paths
- Frontend expected a single denormalized state at `marketplace/realtime-state`, not individual event files

### Attempt 3: State Sync via Event Dispatcher
**What we tried:**
- Modified `/marketplace/src/lib/events/setup.ts` to track in-memory `currentState`
- After each event, update `currentState` with new campaigns/deals/messages
- Sync `currentState` to Firebase at path `marketplace/realtime-state` after every event
- Frontend polls `/api/realtime/state` every 2 seconds to fetch this path
- Expected flow:
  1. User creates campaign on laptop
  2. Backend event emitted
  3. `currentState.campaigns` updated
  4. Synced to Firebase at `marketplace/realtime-state`
  5. Frontend polls and gets updated state
  6. Phone polling also gets same state
  7. Phone UI updates with new campaign

**Why it failed:**
- Firebase path `marketplace/realtime-state` still returns empty or stale data
- Polling returns nothing, campaigns don't sync across devices
- Root cause unknown—either Firebase writes failing silently, or polling not hitting right path

## Current Architecture (Broken)

```
LAPTOP BROWSER:
  MarketplaceDemoPage.tsx
    ↓
  firebaseCreateCampaign() [local state update]
    ↓
  setCampaigns([...campaigns, newCampaign])
    ↓
  POST /api/v1/campaigns/create
    ↓
  Backend event system (works)
    ↓
  Event dispatcher
    ↓
  broadcastEvent() writes to Firebase /realtime/campaign_created/...
  syncStateToFirebase() writes to marketplace/realtime-state
  ✓ WORKS: Laptop sees new campaign in real-time
  ✗ FAILS: Phone doesn't see it

PHONE BROWSER:
  setInterval every 2 seconds
    ↓
  fetch(/api/realtime/state)
    ↓
  Firebase GET marketplace/realtime-state
    ↓
  Returns empty or old state
    ↗
  setCampaigns() doesn't update
```

## What We Know

1. **Same-browser realtime works perfectly**
   - No special mechanism, just `setCampaigns()`
   - React re-renders
   - User sees update instantly
   - This is the baseline that DOES work

2. **Firebase is configured and accessible**
   - Environment variables set: `NEXT_PUBLIC_FIREBASE_DATABASE_URL`, etc.
   - Reads work (GET requests return data)
   - Writes should work (no auth errors)

3. **Frontend polling loop exists**
   - `/marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` line 1270
   - Fetches `/api/realtime/state` every 2 seconds
   - Calls `setCampaigns(data.campaigns)` when data arrives

4. **Backend event system exists**
   - `/api/v1/campaigns/create` calls `handleCreateCampaignCommand()`
   - Events are emitted to dispatcher
   - Broadcaster tries to write events somewhere

## The Core Gap

**Between same-browser (working) and cross-device (broken):**

The same-browser flow that works:
```
User action → setState() → React re-render → User sees it
```

The cross-device flow we're trying:
```
User action → setState() → POST API → Backend event system → ??? → Firebase write → Frontend poll → setState() → React re-render
```

**We have the first half (same-browser), but the second half (sync to Firebase + poll) is broken.**

---

## Requirements for Solution

Your solution must:

1. **Use ONLY Firebase Realtime Database** (no Supabase, no custom WebSocket server, no third-party realtime service)

2. **Ensure cross-device sync**
   - Create campaign on laptop → appears on phone within ~2 seconds
   - Send message in chat on phone → appears on laptop in real-time
   - Update deal status on mobile → laptop sees it instantly
   - Works across any number of devices simultaneously

3. **Work with existing architecture**
   - Don't break same-browser realtime (it already works)
   - Don't require rewriting the entire backend
   - Frontend already has polling loop ready (use it or replace it with Firebase Realtime SDK)
   - Keep using Next.js API routes

4. **Be scalable**
   - Efficient Firebase reads/writes (not writing full state on every change)
   - Minimal bandwidth
   - Won't hit Firebase free tier limits immediately

5. **Explain clearly**
   - Exact code changes needed
   - Which files to modify
   - How data flows from one device to another
   - Why the previous attempts failed

---

## Files Involved

**Frontend (UI Layer):**
- `/marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` — React component with state (campaigns, deals, messages), renders UI, has polling loop

**Backend (Event System):**
- `/marketplace/src/lib/events/core.ts` — Domain event definitions
- `/marketplace/src/lib/events/setup.ts` — Event dispatcher wiring (currently broken, tries to sync state)
- `/marketplace/src/lib/realtime/broadcaster.ts` — Writes to Firebase
- `/marketplace/src/pages/api/v1/campaigns/create.ts` — Campaign creation endpoint
- `/marketplace/src/pages/api/realtime/state.ts` — GET/POST endpoint for Firebase state

**API Response Structure:**
```json
{
  "campaigns": [
    { "id": "...", "title": "...", "budget": 1000, ... }
  ],
  "deals": { "id": {...}, ... },
  "messages": { "conversation_id": [...], ... },
  "applications": [...],
  "notifications": [...]
}
```

---

## Question for Solution

**How should real-time data flow from one browser to another using ONLY Firebase, given that:**
1. Same-browser realtime already works (proof that the mechanism exists)
2. We want to minimize backend complexity
3. We can't use Supabase or WebSockets
4. We need sub-2-second latency across devices
5. We need to handle concurrent updates (2 users editing at once)

