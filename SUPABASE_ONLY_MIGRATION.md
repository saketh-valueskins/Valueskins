# Supabase Only Migration Plan

## Decision: Use ONLY Supabase for Everything

**Services being consolidated:**
- ❌ Firebase (removed)
- ❌ Render (removed)
- ✅ Supabase (database + auth + realtime + backend)

**Project:** `valueskins-1bbda` → **Delete it**, use only Supabase

---

## Phase 1: Database Schema (Day 1-2)

Create tables in Supabase PostgreSQL:

```sql
-- Users (already exists via Auth)
create table if not exists users (
  id uuid primary key references auth.users(id),
  email text unique,
  username text unique,
  role text default 'creator', -- 'creator', 'brand', 'admin'
  created_at timestamp default now()
);

-- Campaigns (brands create these)
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references users(id) on delete cascade,
  title text not null,
  description text,
  budget numeric,
  target_valueSkins text[],
  deadline timestamp,
  location text,
  requirements text,
  status text default 'open', -- 'open', 'active', 'closed'
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Deals (creators apply to campaigns)
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  creator_id uuid references users(id) on delete cascade,
  status text default 'pending', -- 'pending', 'accepted', 'rejected', 'completed'
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Messages (chat between creator and brand)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text,
  sender_id uuid references users(id),
  receiver_id uuid references users(id),
  content text,
  created_at timestamp default now()
);

-- Realtime-State (denormalized view for faster reads)
create table if not exists realtime_state (
  id text primary key default 'state',
  campaigns jsonb default '[]',
  deals jsonb default '{}',
  messages jsonb default '{}',
  updated_at timestamp default now()
);

-- Enable RLS (Row Level Security)
alter table campaigns enable row level security;
alter table deals enable row level security;
alter table messages enable row level security;

-- RLS Policies
create policy "Users can read all campaigns" on campaigns for select using (true);
create policy "Brands can create campaigns" on campaigns for insert with check (auth.uid() = brand_id);
create policy "Brands can update own campaigns" on campaigns for update using (auth.uid() = brand_id);

-- Realtime subscriptions (allow all for now, restrict later)
alter table realtime_state enable row level security;
create policy "Anyone can read realtime state" on realtime_state for select using (true);
create policy "Anyone can update realtime state" on realtime_state for update using (true);
```

---

## Phase 2: Realtime Subscriptions (Day 3-4)

### Frontend: Replace Firebase polling with Supabase subscriptions

**File:** `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx`

**Remove this (Firebase polling):**
```typescript
// ❌ DELETE THIS BLOCK
useEffect(() => {
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/realtime/state');
      if (res.ok) {
        const data = await res.json();
        if (data.campaigns && Array.isArray(data.campaigns)) {
          setCampaigns(data.campaigns);
        }
      }
    } catch (err) {
      console.log('[Poll] Firebase fetch error:', err);
    }
  }, 2000);

  return () => clearInterval(pollInterval);
}, [setCampaigns]);
```

**Add this (Supabase realtime):**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('realtime:campaigns')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'campaigns' },
      (payload) => {
        console.log('[Supabase] Campaign change:', payload.eventType, payload.new);
        
        if (payload.eventType === 'INSERT') {
          setCampaigns(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setCampaigns(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        } else if (payload.eventType === 'DELETE') {
          setCampaigns(prev => prev.filter(c => c.id !== payload.old.id));
        }
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, []);

// Same pattern for deals, messages, etc.
useEffect(() => {
  const channel = supabase
    .channel('realtime:deals')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'deals' },
      (payload) => {
        // Handle deal changes
      }
    )
    .subscribe();

  return () => channel.unsubscribe();
}, []);

useEffect(() => {
  const channel = supabase
    .channel('realtime:messages')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages' },
      (payload) => {
        // Handle message changes
      }
    )
    .subscribe();

  return () => channel.unsubscribe();
}, []);
```

---

## Phase 3: Backend API (Day 5)

### Option A: Keep Next.js API routes (simpler)

**File:** `marketplace/src/pages/api/v1/campaigns/create.ts`

Change from Firebase write to Supabase insert:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key (admin access) for server
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, description, budget, target_valueSkins, deadline, location, requirements } = req.body;

    // Insert into Supabase
    const { data, error } = await supabase
      .from('campaigns')
      .insert([
        {
          brand_id: user_id, // from JWT token
          title,
          description,
          budget,
          target_valueSkins,
          deadline,
          location,
          requirements,
        }
      ])
      .select();

    if (error) throw error;

    // Supabase realtime automatically notifies all subscribed clients
    // No need to manually broadcast

    return res.status(201).json({
      success: true,
      campaign_id: data[0].id,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    return res.status(500).json({ error: 'Failed to create campaign' });
  }
}
```

### Option B: Use Supabase Edge Functions (recommended for production)

Convert API routes to Edge Functions:

```typescript
// supabase/functions/create-campaign/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )

  const { title, description, budget, target_valueSkins, deadline, location, requirements } = await req.json()
  const { data, error } = await supabase
    .from('campaigns')
    .insert([{ title, description, budget, target_valueSkins, deadline, location, requirements }])
    .select()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  return new Response(JSON.stringify({ success: true, campaign_id: data[0].id }), { status: 201 })
})
```

---

## Phase 4: Remove Firebase/Render Code (Day 6)

**Delete these files (no longer needed):**
```
❌ marketplace/src/lib/realtime/broadcaster.ts
❌ marketplace/src/lib/firebase-storage.ts
❌ marketplace/src/pages/api/realtime/state.ts
❌ marketplace/src/hooks/useRealtimeSync.ts
❌ REALTIME_ARCHITECTURE.md
❌ FIREBASE_SETUP_MANUAL.md
```

**Remove Firebase dependencies:**
```bash
cd marketplace
npm uninstall firebase
```

**Remove Firebase env vars from `.env.local`:**
```bash
# DELETE THESE:
# NEXT_PUBLIC_FIREBASE_*
# RENDER_API_KEY
```

**Keep only Supabase env vars:**
```
NEXT_PUBLIC_SUPABASE_URL=https://yqdttucebzvaeucymzox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ... # Add this for server-side access
```

---

## Phase 5: Testing & Deploy (Day 7)

**Local testing:**
```bash
cd marketplace
npm run dev
```

1. Open app on laptop: `http://localhost:3000/demo/marketplace`
2. Open app on phone/different browser
3. Create campaign on laptop
4. **Phone should see it immediately** (no 2-second polling delay)
5. Send message on phone
6. **Laptop should see it immediately**

**Deploy to Vercel:**
```bash
git add -A
git commit -m "feat: migrate to Supabase-only realtime

Remove Firebase and Render dependencies.
Use Supabase PostgreSQL for database.
Use Supabase realtime subscriptions (WebSocket) instead of polling.
Use Supabase Edge Functions instead of Render.

Realtime is now:
- Instant (WebSocket, not 2-sec polling)
- Scalable (native PostgreSQL + Supabase infrastructure)
- Cost-effective (no separate Firebase/Render bills)
- Simpler (single Supabase platform)"

git push origin prod-push
gh pr create --head prod-push --base main
```

---

## Cost Comparison

| Service | Old | New |
|---------|-----|-----|
| Firebase | $0-50/mo | ❌ Removed |
| Render | $0-30/mo | ❌ Removed |
| Supabase | $0 | ✅ $0 (free tier) |
| **Total** | **~$50/mo** | **~$0** |

At scale (1K users):
- Firebase polling: $300+/mo
- Supabase realtime: $50/mo (compute + storage)

**You save money AND get better performance.**

---

## Rollback Plan (If Something Breaks)

Keep Firebase/Render config in place for 1 week after deploy. If issues arise:

```bash
git revert <commit-hash>
# Back to Firebase polling (slower but working)
```

But you won't need this. Supabase realtime is solid.

---

## Summary

**Before:** Firebase (realtime DB) + Render (backend) + Supabase (auth) = 3 platforms
**After:** Supabase only (database + realtime + backend + auth) = 1 platform

**Result:**
- ✅ Instant realtime (WebSocket, <100ms latency)
- ✅ Cheaper ($0/mo vs $50/mo)
- ✅ Simpler (1 platform, not 3)
- ✅ Scalable (PostgreSQL + Supabase infrastructure)
- ✅ Easier to debug (single source of truth)

**Timeline:** 1 week to fully migrate

**Start:** Phase 1 (database schema)

