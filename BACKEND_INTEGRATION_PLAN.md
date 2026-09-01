# ValueSkins Backend Integration Plan
## Complete Frontend-to-Backend Wiring (4-6 Week Implementation)

**Status**: READY FOR EXECUTION
**Created**: 2026-08-30
**Target Completion**: 2026-10-15
**Effort**: 3-4 full-time engineers

---

## Executive Summary

This plan outlines how to wire the ValueSkins Next.js frontend completely to the 38-service Rust backend. Currently:
- **Backend**: 38 microservices built, compiled, containerized. NOT deployed.
- **Frontend**: Live at valueskins.com, 273+ pages/components, using localStorage/SharedStateManager (mock data).
- **Database**: PostgreSQL + Redis on Render. No migrations executed.

**Goal**: Ship production-ready system where frontend calls real API, syncs via WebSocket, no localStorage except sessions.

**Critical Path (Week 1-2)**:
1. Deploy backend to Render (1-2 days)
2. Run all database migrations (1 day)
3. Configure frontend environment variables (1 day)
4. Replace SharedStateManager with real API calls (5-7 days)
5. Wire WebSocket for real-time (3-4 days)

**Remaining (Week 3-6)**: Testing, optimization, rollout.

---

## Phase 1: Backend Deployment (Days 1-3)

### 1.1 Current State

**Backend Services** (38 microservices in `/backend/`):
```
Cargo.toml workspace members:
- api_gateway (entry point, routes all traffic)
- auth_service, account_service, persona_service
- marketplace_service, brand_api, communities_service
- notification_service, events_service, analytics_service
- recommendation_service, ai_service
- credential_service, matching_service, settings_service
- linkedin_service, platform_service, pricing_service
- credit_service, contract_service, reputation_service
- identity_service, guardian_service, trust_service
- risk_engine, verification_service, moderation_service
- payment_service, storage_service, tax_service
- referral_service, waitlist_service, social_service
- indexer, shared (common library)
```

**Dockerfile** (`backend/Dockerfile`):
- Multi-stage build (Rust 1.97.1 + Debian bookworm-slim)
- Compiles entire workspace
- Runs only `api_gateway` binary in runtime
- Health check on `/health/live`
- Listens on ports 8080 (HTTP), 9090 (Prometheus metrics)
- Non-root user `appuser`

**Render Blueprint** (`render.yaml`):
- Configured for PostgreSQL, Redis, Docker image runtime
- Environment variables scaffolded
- Auto-scaling: min 1, max 3 instances
- Health check interval: 10s

### 1.2 Deployment Steps

#### Step 1.2.1: Prepare Render Services

**Pre-requisite**: You have a Render account with billing configured.

```bash
# 1. Create/update Render services via blueprint
cd /Users/sakethvelamuri/Desktop/Startups.\ /Short\ term/Valueskins.

# Validate blueprint syntax
render blueprint validate render.yaml

# Deploy or update services
render blueprint apply render.yaml
```

**What this does**:
- Creates `valueskins-api` web service (Docker image)
- Creates `valueskins-db` PostgreSQL service
- Creates `valueskins-redis` Redis service
- Generates secrets for JWT_SECRET, API_KEY_HMAC_SALT, etc.
- Configures networking (only internal access for DB/Redis)

**Render Console Verification**:
- Navigate to [dashboard.render.com](https://dashboard.render.com)
- Verify three services exist: api, db, redis
- Check environment variables tab
- Note the `DATABASE_URL` and `REDIS_URL` (auto-populated by Render)

#### Step 1.2.2: Build & Push Docker Image

```bash
# Render will auto-build from the Dockerfile when you push
# BUT: we recommend pre-testing locally first

# Option A: Build locally to test (requires Docker + Rust toolchain)
cd backend/
docker build -t valueskins-api:latest .

# Test the image
docker run -e DATABASE_URL=postgres://user:pass@localhost/test \
           -e JWT_SECRET=test-secret-minimum-32-chars-long!!! \
           -e API_KEY_HMAC_SALT=test-salt-minimum-32-chars-long!!!!! \
           -e VERIFICATION_HMAC_SECRET=test-verify-minimum-32-chars!!! \
           -e PLATFORM_SIGNING_KEY_ED25519=test-ed25519-minimum-64-chars!!!!!! \
           -p 8080:8080 \
           valueskins-api:latest

# Test health check
curl http://localhost:8080/health/live
# Expected: {"status":"ok","service":"Valueskins API"}

# Option B: Push to Render (automatic build)
# Render watches main branch by default
# Any push to main triggers a build from render.yaml
# WARNING: First build may take 15-20 minutes (Rust compile)

git push origin main
# Monitor build at: https://dashboard.render.com/services/valueskins-api
```

**What to verify**:
- Build completes without errors
- Image size < 500MB (Debian slim + Rust binary)
- Service transitions to "Live" state
- Health check passes (green checkmark in Render dashboard)

#### Step 1.2.3: Verify Backend Health

```bash
# Get service URL from Render dashboard
# Format: https://valueskins-api.onrender.com

curl https://valueskins-api.onrender.com/health/live
# Expected: {"status":"ok","service":"Valueskins API"}

curl https://valueskins-api.onrender.com/health/ready
# Expected: {"status":"ready","service":"Valueskins API","database":"connected"}

# Check logs
# In Render dashboard, click service → Logs
# Look for messages like:
# "API gateway CORS allow-list"
# "Database connected successfully"
# "Redis cache initialized"
```

**Common Issues**:
| Issue | Cause | Fix |
|-------|-------|-----|
| Build timeout (> 30min) | Rust compilation slow | Increase instance type (standard → pro) |
| Health check fails after 10s | DB not connecting | Verify DATABASE_URL is set + DB service running |
| 502 Bad Gateway | Service crashed | Check logs for panics, verify JWT_SECRET strength |
| CORS rejections (warnings) | Frontend origin not in ALLOWED_ORIGINS | Update env var in Render dashboard |

---

## Phase 2: Database Migrations (Days 3-4)

### 2.1 Current State

**Migrations exist**: `/backend/migrations/` contains 74 SQL files (2024-01-30 through recent).

```
20240130000000_init_schema.sql              -- Core tables: users, personas
20240130000001_analytics_schema.sql         -- Analytics tables
...
20240220000004_barter_toggle.sql            -- Latest migration
```

**Migration Tool**: Backend uses SQLx (compile-time verified migrations).

### 2.2 Migration Execution Strategy

**Option A: Automatic (Recommended)**
```rust
// In api_gateway/src/main.rs, add before server starts:
sqlx::migrate!("./migrations")
    .run(pool.as_ref())
    .await
    .expect("Failed to run migrations");

// Then rebuild and redeploy
cargo build --release
render blueprint apply render.yaml
```

**Option B: Manual (if automatic fails)**
```bash
# Install sqlx-cli
cargo install sqlx-cli --no-default-features --features postgres

# Run migrations locally (for testing)
DATABASE_URL=postgres://user:pass@localhost/test \
sqlx migrate run --database-url $DATABASE_URL

# Or via psql (connect to Render DB)
psql $DATABASE_URL < migrations/20240130000000_init_schema.sql
# ... repeat for each migration
```

### 2.3 Verify Migrations

```bash
# List tables in database
psql $DATABASE_URL -c "\dt"

# Check migration status
psql $DATABASE_URL -c "SELECT * FROM _sqlx_migrations ORDER BY version;"

# Expected output:
# version │ description │ installed_on │ success │ execution_time │ installed_by
# ────────┼─────────────┼──────────────┼─────────┼────────────────┼──────────────
#       1 │ init_schema │ 2026-08-30... │ t       │  1500 ms       │ api_gateway
#       2 │ analytics...
# ...
```

### 2.4 Database Schema Overview

Key tables created (critical for frontend):

```sql
-- Users & Authentication
users (id, username, email, password_hash, created_at, ...)
user_profiles (user_id, display_name, avatar_url, bio, ...)
user_auth_tokens (user_id, refresh_token, expires_at, ...)

-- Marketplace
deals (id, creator_id, brand_id, title, status, created_at, ...)
deal_rooms (id, deal_id, created_at, ...)
deal_messages (id, deal_room_id, sender_id, content, created_at, ...)
campaigns (id, brand_id, title, status, budget, created_at, ...)

-- Applications & Engagement
applications (id, deal_id, creator_id, status, created_at, ...)
deal_applications (id, deal_id, user_id, status, created_at, ...)

-- Notifications
notifications (id, user_id, type, content, read, created_at, ...)

-- Analytics
user_events (user_id, event_type, event_data, created_at, ...)
```

**For frontend**: You'll query these tables via REST API endpoints (see Phase 3).

---

## Phase 3: Frontend API Integration (Days 5-11)

### 3.1 Current Frontend API Architecture

**Files that need updating**:
- `marketplace/src/lib/api-service.ts` - HTTP client (already scaffolded ✓)
- `marketplace/src/lib/shared-state.ts` - State manager (currently in-memory)
- `marketplace/src/lib/valueskins-api.ts` - REST API endpoints
- `marketplace/src/hooks/use-deals.ts`, `use-messages.ts`, etc. - Data hooks
- `marketplace/src/features/*/` - Feature modules (multiple files each)
- `marketplace/src/pages/api/` - Frontend API routes (to be removed)

### 3.2 Environment Setup

**File**: `marketplace/.env.local`

```env
# Render backend URL
NEXT_PUBLIC_BACKEND_URL=https://valueskins-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://valueskins-api.onrender.com/ws

# Auth (optional local override)
NEXT_PUBLIC_JWT_STORAGE=localStorage  # or sessionStorage
NEXT_PUBLIC_AUTH_TIMEOUT_MS=1800000   # 30 minutes
```

**Deployment**: `marketplace/.env.production`

```env
NEXT_PUBLIC_BACKEND_URL=https://valueskins-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://valueskins-api.onrender.com/ws
```

### 3.3 Replace SharedStateManager with Real API

**Current Pattern** (REMOVE):
```typescript
// marketplace/src/lib/shared-state.ts
const state = sharedStateManager.getState();  // localStorage mock
sharedStateManager.setState({ deals: fakeDeal });  // local update only
```

**New Pattern** (IMPLEMENT):

```typescript
// marketplace/src/lib/api-service.ts
async fetchDeals(filters?: DealFilters): Promise<Deal[]> {
  return this.get<Deal[]>('/deals', { params: filters });
}

async createDeal(deal: CreateDealRequest): Promise<Deal> {
  return this.post<Deal>('/deals', deal);
}

async updateDeal(id: string, updates: Partial<Deal>): Promise<Deal> {
  return this.put<Deal>(`/deals/${id}`, updates);
}
```

**Hook Usage** (UPDATE ALL):

```typescript
// marketplace/src/hooks/use-deals.ts
import { apiService } from '@/lib/api-service';

export function useDeals(filters?: DealFilters) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    apiService.fetchDeals(filters)
      .then(setDeals)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [filters]);

  return { deals, loading, error };
}
```

### 3.4 Backend API Endpoints (Required)

**Authentication**:
```
POST /auth/unified/login         -- Login with email/password
POST /auth/unified/signup        -- Create new account
POST /auth/unified/refresh       -- Refresh JWT token
POST /auth/unified/logout        -- Clear session
POST /auth/phone/request-otp     -- Send OTP to phone
POST /auth/phone/verify-otp      -- Verify OTP code
```

**Deals (Marketplace Core)**:
```
GET    /api/v1/deals                -- List all deals (paginated)
GET    /api/v1/deals/:id            -- Get single deal details
POST   /api/v1/deals                -- Create new deal
PUT    /api/v1/deals/:id            -- Update deal
DELETE /api/v1/deals/:id            -- Cancel deal
GET    /api/v1/deals/:id/messages   -- Get deal chat messages
POST   /api/v1/deals/:id/messages   -- Send message in deal room
```

**Creators** (Profile):
```
GET    /api/v1/creators             -- List creators (search)
GET    /api/v1/creators/:id         -- Get creator profile
PUT    /api/v1/creators/:id         -- Update profile
GET    /api/v1/creators/:id/deals   -- Creator's deals
```

**Brands** (Campaign Management):
```
GET    /api/v1/brands               -- List brands (admin only)
GET    /api/v1/brands/:id           -- Get brand profile
POST   /api/v1/brands/:id/campaigns -- Create campaign
GET    /api/v1/brands/:id/campaigns -- List campaigns
```

**Applications**:
```
GET    /api/v1/applications         -- List user's applications
POST   /api/v1/deals/:id/apply      -- Apply to a deal
PUT    /api/v1/applications/:id     -- Update application status
```

**Notifications**:
```
GET    /api/v1/notifications        -- List notifications
PUT    /api/v1/notifications/:id    -- Mark as read
DELETE /api/v1/notifications/:id    -- Delete notification
```

**User Account**:
```
GET    /api/v1/me                   -- Current user profile
PUT    /api/v1/me                   -- Update profile
GET    /api/v1/me/settings          -- User settings
PUT    /api/v1/me/settings          -- Update settings
```

### 3.5 API Response Format (Standard)

All endpoints return:

```typescript
interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, any>;
  };
  timestamp: string;
  requestId: string;
}
```

Example responses:

```json
// Success
{
  "data": {
    "id": "deal-123",
    "title": "Fashion collab",
    "creator_id": "user-456",
    "brand_id": "brand-789",
    "status": "open",
    "budget": 5000,
    "created_at": "2026-08-30T14:30:00Z"
  },
  "timestamp": "2026-08-30T14:30:45Z",
  "requestId": "req-xyz-123"
}

// Error
{
  "error": {
    "code": "DEAL_NOT_FOUND",
    "message": "Deal with id 'deal-123' not found",
    "status": 404,
    "details": { "deal_id": "deal-123" }
  },
  "timestamp": "2026-08-30T14:30:45Z",
  "requestId": "req-xyz-123"
}
```

### 3.6 File-by-File Changes

#### Priority 1: Core API Layer (Days 5-6)

**File**: `marketplace/src/lib/api-service.ts` (ALREADY EXISTS)
- Status: Partially implemented (api-service.ts skeleton exists)
- Action: Expand with all deal, creator, brand, application endpoints
- Changes: Add methods for each endpoint in section 3.4

**File**: `marketplace/src/lib/valueskins-api.ts` (VERIFY/CREATE)
- Purpose: High-level business logic API layer (uses api-service.ts internally)
- Changes: Wrap raw HTTP calls with application-specific logic
- Example:
  ```typescript
  export class ValueSkinsAPI {
    constructor(private client: ApiService) {}
    
    async getDealsForFeed(page = 1): Promise<Deal[]> {
      return this.client.get<Deal[]>('/deals', {
        params: { page, limit: 20, status: 'open' }
      });
    }
  }
  ```

**File**: `marketplace/src/context/` (VERIFY/CREATE)
- Purpose: React Context for global state (replace SharedStateManager)
- Action: Create `UserContext`, `DealsContext`, `NotificationsContext`
- Pattern:
  ```typescript
  const UserContext = createContext<{ user: User | null }>(null);
  
  export function UserProvider({ children }) {
    const [user, setUser] = useState<User | null>(null);
    
    useEffect(() => {
      apiService.getCurrentUser()
        .then(setUser)
        .catch(console.error);
    }, []);
    
    return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
  }
  ```

#### Priority 2: Hooks (Days 6-7)

**Files to create/update**:
- `marketplace/src/hooks/use-auth.ts` - Login, signup, logout
- `marketplace/src/hooks/use-deals.ts` - Fetch, create, update deals
- `marketplace/src/hooks/use-messages.ts` - Send/receive messages
- `marketplace/src/hooks/use-applications.ts` - Apply, track applications
- `marketplace/src/hooks/use-notifications.ts` - Fetch, mark read

Example:
```typescript
// marketplace/src/hooks/use-auth.ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiService.post('/auth/unified/login', {
        email, password
      });
      setUser(response.data);
      localStorage.setItem('auth_token', response.data.token);
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async () => {
    await apiService.post('/auth/unified/logout', {});
    setUser(null);
    localStorage.removeItem('auth_token');
  };
  
  return { user, loading, login, logout };
}
```

#### Priority 3: Pages (Days 7-11)

**Pages that call API** (sample of 273):

| Page | Current | Update Required |
|------|---------|-----------------|
| `/deals-feed` | Loads from SharedStateManager | Call `GET /api/v1/deals` |
| `/deals/[id]` | Static mock | Call `GET /api/v1/deals/:id` |
| `/create-deal` | Form submits to localStorage | Call `POST /api/v1/deals` |
| `/creator-profile/[id]` | Mock profile | Call `GET /api/v1/creators/:id` |
| `/messages/[dealId]` | Mock messages, no sync | Call WebSocket (Phase 4) |
| `/applications` | Mock list | Call `GET /api/v1/applications` |
| `/dashboard` | Mock stats | Call `GET /api/v1/me` + analytics |

**Pattern for updating a page**:
```typescript
// marketplace/src/pages/deals-feed.tsx (BEFORE)
const { deals } = useSharedState('deals');

// marketplace/src/pages/deals-feed.tsx (AFTER)
const { deals, loading, error } = useDeals({ status: 'open' });

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <DealsList deals={deals} />;
```

### 3.7 Authentication Flow

**Current**: localStorage with demo tokens
**New**: JWT from backend

```typescript
// 1. User logs in
POST /auth/unified/login
Request: { email: "creator@example.com", password: "password123" }
Response: {
  data: {
    user: { id: "user-123", email: "...", name: "..." },
    access_token: "eyJhbGc...",  // JWT, 15 min expiry
    refresh_token: "refresh...",  // Opaque, 7 day expiry
    token_type: "Bearer"
  }
}

// 2. Store tokens
localStorage.setItem('access_token', response.access_token);
localStorage.setItem('refresh_token', response.refresh_token);

// 3. Attach to every API call
headers: { 'Authorization': 'Bearer eyJhbGc...' }

// 4. On expiry (401 response), refresh automatically
POST /auth/unified/refresh
Request: { refresh_token: "refresh..." }
Response: { access_token: "new-eyJhbGc...", ... }
```

**Code** (`marketplace/src/lib/api-service.ts`):
```typescript
private async request<T>(...): Promise<T> {
  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { headers, ... });
  
  if (response.status === 401) {
    // Token expired, try refresh
    const refreshed = await this.refreshToken();
    if (refreshed) {
      // Retry original request with new token
      return this.request(method, endpoint, options);
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
      throw new Error('Authentication failed');
    }
  }
  
  return response.json();
}

private async refreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;
  
  try {
    const response = await fetch(`${this.baseUrl}/auth/unified/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.data.access_token);
      if (data.data.refresh_token) {
        localStorage.setItem('refresh_token', data.data.refresh_token);
      }
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed', error);
  }
  return false;
}
```

---

## Phase 4: WebSocket Real-Time Sync (Days 12-15)

### 4.1 Current State

**Backend**: WebSocket handler exists at `/backend/api_gateway/src/websocket.rs`
**Frontend**: Skeleton in `marketplace/src/lib/realtime-client.ts`

### 4.2 WebSocket Protocol

**Connection**:
```typescript
// Endpoint: wss://valueskins-api.onrender.com/ws
// Auth: Must pass JWT in query param or header

const ws = new WebSocket(
  `${wsUrl}?token=${accessToken}`
);

// Or via header (more secure):
const ws = new WebSocket(wsUrl);
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: accessToken
  }));
};
```

**Message Format** (JSON):
```json
{
  "type": "message_created",
  "channel": "deal:deal-123",
  "data": {
    "id": "msg-456",
    "deal_id": "deal-123",
    "sender_id": "user-789",
    "content": "Let's discuss timeline",
    "created_at": "2026-08-30T14:30:00Z"
  },
  "timestamp": "2026-08-30T14:30:00Z"
}
```

### 4.3 Real-Time Events to Subscribe

**Deal Events**:
```
deal:deal-123:status_changed
deal:deal-123:message_created
deal:deal-123:user_joined
deal:deal-123:offer_received
```

**Notification Events**:
```
notifications:user-123:new
notifications:user-123:read
```

**Presence Events**:
```
presence:user-123:online
presence:user-123:offline
```

### 4.4 Implementation

**File**: `marketplace/src/lib/realtime-client.ts` (EXPAND)

```typescript
import { EventEmitter } from 'events';

export interface RealtimeMessage {
  type: string;
  channel: string;
  data: any;
  timestamp: string;
}

export class RealtimeClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(url: string, token: string) {
    super();
    this.url = url;
    this.token = token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[RealtimeClient] Connected to WebSocket');
          
          // Send authentication
          this.ws!.send(JSON.stringify({
            type: 'auth',
            token: this.token,
          }));
          
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: RealtimeMessage = JSON.parse(event.data);
            
            // Emit type-specific event
            this.emit(message.type, message.data);
            
            // Also emit generic event for debugging
            this.emit('message', message);
          } catch (error) {
            console.error('[RealtimeClient] Failed to parse message', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[RealtimeClient] WebSocket error', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[RealtimeClient] Disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  subscribe(channel: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[RealtimeClient] Cannot subscribe: not connected');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'subscribe',
      channel,
    }));
  }

  unsubscribe(channel: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'unsubscribe',
      channel,
    }));
  }

  send(channel: string, data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[RealtimeClient] Cannot send: not connected');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'publish',
      channel,
      data,
    }));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RealtimeClient] Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[RealtimeClient] Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }
}
```

**Usage Hook** (`marketplace/src/hooks/use-realtime.ts`):

```typescript
import { useEffect, useCallback } from 'react';
import { RealtimeClient } from '@/lib/realtime-client';

const realtimeClient = new RealtimeClient(
  process.env.NEXT_PUBLIC_WS_URL!,
  localStorage.getItem('access_token')!
);

export function useRealtime(channel: string, onMessage: (data: any) => void) {
  useEffect(() => {
    if (!realtimeClient.connected) {
      realtimeClient.connect().catch(console.error);
    }

    realtimeClient.subscribe(channel);
    realtimeClient.on(channel, onMessage);

    return () => {
      realtimeClient.off(channel, onMessage);
      realtimeClient.unsubscribe(channel);
    };
  }, [channel, onMessage]);
}
```

**Component Usage** (e.g., Deal Room):

```typescript
// marketplace/src/pages/deals/[id]/room.tsx
export function DealRoom({ dealId }: { dealId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  // Subscribe to messages for this deal
  useRealtime(`deal:${dealId}:message_created`, (data: Message) => {
    setMessages(prev => [...prev, data]);
  });

  const sendMessage = (content: string) => {
    realtimeClient.send(`deal:${dealId}`, {
      type: 'message_send',
      content,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="deal-room">
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

### 4.5 Real-Time Events (Backend Must Broadcast)

**In Rust Backend** (`backend/api_gateway/src/websocket.rs`):

Events the frontend needs to listen to:

```typescript
// Deal lifecycle
'deal:DEAL_ID:status_changed'     // { status: 'open' | 'matched' | 'active' | 'completed' }
'deal:DEAL_ID:message_created'    // { id, sender_id, content, timestamp }
'deal:DEAL_ID:applicant_added'    // { user_id, profile_name }
'deal:DEAL_ID:offer_sent'         // { sender_id, amount, terms }
'deal:DEAL_ID:offer_accepted'     // {}
'deal:DEAL_ID:offer_rejected'     // {}

// Campaign events
'campaign:CAMPAIGN_ID:status_changed'
'campaign:CAMPAIGN_ID:applicant_applied'

// Notifications
'notifications:USER_ID:new'       // { type, title, content, link }
'notifications:USER_ID:read'      // { notification_id }

// User presence
'presence:USER_ID:online'         // { user_id, timestamp }
'presence:USER_ID:offline'        // { user_id, timestamp }
'presence:DEAL_ID:users'          // { online_users: [{ id, name }] }
```

**Verification**: Test WebSocket connection
```bash
# Install wscat
npm install -g wscat

# Connect to backend WebSocket
wscat -c "wss://valueskins-api.onrender.com/ws?token=YOUR_JWT_TOKEN"

# In the terminal, send a subscription message
{"type":"subscribe","channel":"deal:deal-123:message_created"}

# Check backend logs to verify subscription was received
# In Render dashboard → Logs, look for:
# "WebSocket client subscribed to channel: deal:deal-123:message_created"
```

---

## Phase 5: Data Migration & Initialization (Days 16-18)

### 5.1 Production Data Setup

You have two options:

**Option A: Import from Demo Data** (Recommended)
```bash
# Export current demo data from frontend localStorage
# Create SQL inserts for initial users, deals, campaigns

# Example: Insert seed data into production database
psql $DATABASE_URL << EOF
INSERT INTO users (id, username, email, password_hash, created_at)
VALUES ('user-1', 'creator1', 'creator1@example.com', '...hash...', NOW());

INSERT INTO deals (id, creator_id, brand_id, title, budget, status, created_at)
VALUES ('deal-1', 'user-1', 'brand-1', 'Fashion Collab', 5000, 'open', NOW());
EOF
```

**Option B: Fresh Start** (Clean slate)
- Keep database empty on launch
- Let users create first deals organically
- Reduces data quality issues

### 5.2 User Account Migration

If you have existing users in demo data:

```typescript
// marketplace/src/scripts/migrate-demo-users.ts
import { apiService } from '@/lib/api-service';

const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]');

async function migrate() {
  for (const user of demoUsers) {
    try {
      await apiService.post('/auth/unified/signup', {
        email: user.email,
        password: generateSecurePassword(),  // Send via secure channel
        name: user.name,
      });
      console.log(`Migrated user: ${user.email}`);
    } catch (error) {
      console.error(`Failed to migrate ${user.email}:`, error);
    }
  }
}
```

---

## Phase 6: End-to-End Testing (Days 19-21)

### 6.1 Test Checklist

**Authentication**:
- [ ] User can sign up
- [ ] User can log in
- [ ] JWT token is stored and sent with requests
- [ ] Token refresh works on 401
- [ ] Logout clears tokens

**API Calls**:
- [ ] GET /api/v1/deals returns list (paginated)
- [ ] GET /api/v1/deals/:id returns single deal
- [ ] POST /api/v1/deals creates new deal
- [ ] PUT /api/v1/deals/:id updates deal
- [ ] GET /api/v1/me returns current user profile
- [ ] GET /api/v1/creators/:id returns creator profile

**Real-Time**:
- [ ] WebSocket connects on deal room page
- [ ] Sending message broadcasts to other users
- [ ] Deal status changes broadcast in real-time
- [ ] Presence updates show who's online
- [ ] Reconnection works on network drop

**Error Handling**:
- [ ] 401 redirects to login
- [ ] 404 shows "Not found" message
- [ ] 500 shows error alert + logs to Sentry
- [ ] Network timeout retries 3x then shows message

### 6.2 Load Testing

```bash
# Load test the backend
# Install artillery
npm install -g artillery

# Create test plan
cat > load-test.yml << EOF
config:
  target: 'https://valueskins-api.onrender.com'
  phases:
    - duration: 60
      arrivalRate: 10  # 10 requests/second
scenarios:
  - name: 'Browse Deals'
    flow:
      - get:
          url: '/api/v1/deals'
          expect:
            - statusCode: 200
      - get:
          url: '/api/v1/deals/deal-1'
          expect:
            - statusCode: 200
EOF

# Run test
artillery run load-test.yml
```

### 6.3 Monitoring Setup

**Render Logs**: Monitor in Render dashboard
- Database query slow logs: Check if queries > 100ms
- Error rate: Should be < 0.1%
- WebSocket connections: Should scale to expected load

**Performance**:
- API response time: < 200ms (p95)
- WebSocket latency: < 50ms
- Error rate: < 0.1%

---

## Phase 7: Cleanup & Optimization (Days 22-28)

### 7.1 Remove LocalStorage Dependencies

**Files to delete or deprecate**:
```
marketplace/src/lib/shared-state.ts         -- Remove entirely
marketplace/src/lib/render-storage.ts       -- Remove entirely
marketplace/src/hooks/use-shared-state.ts   -- Remove entirely
marketplace/src/lib/demo-data.ts            -- Remove entirely
```

**Files to verify no localStorage usage**:
```
marketplace/src/pages/**/*.tsx              -- grep for "localStorage"
marketplace/src/components/**/*.tsx         -- grep for "localStorage"
marketplace/src/features/**/*.tsx           -- grep for "localStorage"
```

Run this to find remaining localStorage usage:
```bash
grep -r "localStorage\|SharedStateManager\|render-storage\|demo-data" \
  marketplace/src \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules
```

### 7.2 Performance Optimization

**Frontend**:
- [ ] Enable code splitting for deal/creator pages
- [ ] Cache API responses in React Query
- [ ] Lazy load components below the fold
- [ ] Image optimization (WebP, srcset)

**Backend**:
- [ ] Add database indexes for common queries
- [ ] Configure Redis caching for frequently accessed data
- [ ] Monitor slow queries, optimize if p95 > 100ms

### 7.3 Security Verification

**Pre-Production Checklist**:
- [ ] HTTPS enforced everywhere (no http://)
- [ ] CORS properly restricted (only valueskins.com)
- [ ] JWT secret is strong (> 32 chars, random)
- [ ] Database credentials not in git history
- [ ] API keys for third-party services rotated
- [ ] Secrets stored in Render environment (not .env files)
- [ ] No sensitive data in logs
- [ ] Rate limiting enabled on public endpoints
- [ ] CSRF tokens on state-changing requests
- [ ] Input validation on all endpoints

---

## Critical Risk Areas & Mitigation

### Risk 1: Database Connection Pool Exhaustion

**Symptom**: "Too many connections" error after 100+ users
**Cause**: Frontend making N requests simultaneously, each opens DB connection
**Mitigation**:
```rust
// In backend/shared/src/db.rs
let pool = PgPoolOptions::new()
    .max_connections(20)  // Limit concurrent connections
    .acquire_timeout(Duration::from_secs(5))
    .connect(&database_url)
    .await?;

// In api_gateway/src/main.rs, add connection pooling middleware
// Requests queue up instead of failing
```

### Risk 2: JWT Token Expiry During Long Operations

**Symptom**: User's session expires mid-operation, operation fails silently
**Cause**: Token valid for 15 min, but operation takes 20 min
**Mitigation**:
```typescript
// marketplace/src/lib/api-service.ts
private async request<T>(...): Promise<T> {
  let response = await fetch(url, { headers, ... });
  
  // Auto-retry once on 401
  if (response.status === 401) {
    const refreshed = await this.refreshToken();
    if (refreshed) {
      response = await fetch(url, { headers, ... });
    }
  }
  
  // If still 401, redirect to login
  if (response.status === 401) {
    window.location.href = '/login?redirect=' + window.location.pathname;
  }
  
  return response.json();
}
```

### Risk 3: WebSocket Connection Drops During Message Send

**Symptom**: Message sent via WebSocket but doesn't reach backend
**Cause**: Connection closed between send() and actual transmission
**Mitigation**:
```typescript
send(channel: string, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check connection state
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message and retry on reconnect
      this.messageQueue.push({ channel, data, resolve, reject });
      
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect().catch(reject);
      }
      return;
    }

    // Message ID for idempotency
    const msgId = `${channel}-${Date.now()}`;
    
    this.ws.send(JSON.stringify({
      type: 'publish',
      channel,
      data,
      idempotency_key: msgId,  // Backend deduplicates
    }));

    // Wait for ack or timeout
    const timeout = setTimeout(() => {
      reject(new Error('Message send timeout'));
    }, 5000);

    this.once(`ack-${msgId}`, () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
```

### Risk 4: Stale Cache Data Confuses Users

**Symptom**: User creates deal, doesn't see it in list immediately
**Cause**: Browser cached the /deals list, doesn't refresh
**Mitigation**:
```typescript
// marketplace/src/hooks/use-deals.ts
export function useDeals(filters?: DealFilters) {
  const queryClient = useQueryClient();

  const { data: deals } = useQuery(
    ['deals', filters],
    () => apiService.fetchDeals(filters),
    {
      staleTime: 30000,  // Cache for 30 seconds
      cacheTime: 60000,  // Keep in memory for 1 minute
    }
  );

  // When user creates a deal, invalidate cache immediately
  const createDeal = async (deal: CreateDealRequest) => {
    const newDeal = await apiService.createDeal(deal);
    
    // Force re-fetch
    queryClient.invalidateQueries(['deals']);
    
    return newDeal;
  };

  return { deals, createDeal };
}
```

### Risk 5: Render Instance Restart Loses In-Memory WebSocket Connections

**Symptom**: All users suddenly disconnected, have to reload page
**Cause**: Render auto-restarts instance for updates, all WebSocket connections die
**Mitigation**:
```typescript
// marketplace/src/lib/realtime-client.ts
private attemptReconnect(): void {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  const delay = Math.min(
    1000 * Math.pow(2, this.reconnectAttempts),
    30000  // Max 30 seconds
  );

  this.reconnectAttempts++;

  if (this.reconnectAttempts > this.maxReconnectAttempts) {
    // After 5 attempts, show user warning
    this.emit('reconnect_failed', {
      message: 'Lost connection to server. Please reload the page.',
      action: 'reload',
    });
    return;
  }

  setTimeout(() => {
    this.connect().catch(error => {
      console.error('Reconnect attempt failed', error);
      this.attemptReconnect();
    });
  }, delay);
}
```

### Risk 6: Missing Environment Variable Causes Silent Failures

**Symptom**: API calls fail silently, nothing in logs
**Cause**: NEXT_PUBLIC_BACKEND_URL not set in production
**Mitigation**:
```typescript
// marketplace/src/lib/api-service.ts
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  ...
};

if (!API_CONFIG.BASE_URL || !API_CONFIG.WS_URL) {
  throw new Error(
    'Missing required environment variables:\n' +
    `NEXT_PUBLIC_BACKEND_URL: ${API_CONFIG.BASE_URL || 'NOT SET'}\n` +
    `NEXT_PUBLIC_WS_URL: ${API_CONFIG.WS_URL || 'NOT SET'}\n` +
    'Check .env.local or Vercel environment settings.'
  );
}
```

---

## Rollback Plan (If Something Breaks)

### Scenario 1: Backend Deployment Fails

```bash
# Check Render logs
# In Render dashboard → valueskins-api → Logs

# Common issues:
# 1. Build timeout → increase instance type
# 2. Database connection fails → verify DATABASE_URL
# 3. JWT_SECRET weak → set strong secret in Render env vars

# Rollback: Revert to previous Render service revision
# In Render dashboard → Deployments → select previous build → Redeploy
```

### Scenario 2: Database Migration Breaks

```bash
# If migration hangs or corrupts data:
# 1. Stop api_gateway service (prevent further writes)
# 2. Restore database from backup (Render auto-backups daily)
# 3. Re-run migrations after fixing SQL

# To restore from backup:
# In Render dashboard → valueskins-db → Backups → Restore
```

### Scenario 3: Frontend Can't Connect to Backend

**Symptoms**: All API calls return CORS errors or timeout

```bash
# 1. Verify backend is running
curl https://valueskins-api.onrender.com/health/ready

# 2. Check ALLOWED_ORIGINS in Render env vars
# Should include: https://valueskins.com,https://www.valueskins.com

# 3. Verify NEXT_PUBLIC_BACKEND_URL is correct in Vercel
# Should be: https://valueskins-api.onrender.com

# 4. If still failing, temporarily set permissive CORS for debugging
# In backend/api_gateway/src/main.rs:
// .allowed_origin_fn(|_, _| true)  // DEBUGGING ONLY
// Change back after fixing
```

### Scenario 4: WebSocket Not Connecting

```bash
# Test with wscat
wscat -c "wss://valueskins-api.onrender.com/ws?token=YOUR_JWT"

# Should see:
# Connected
# [type receive] {"type":"auth_success","user_id":"user-123"}

# If fails, check backend logs for:
# "WebSocket connection closed" + reason

# Common fixes:
# 1. JWT token expired → get fresh token first
# 2. Origin not allowed → check ALLOWED_ORIGINS
# 3. Backend not accepting connections → restart service
```

### Scenario 5: Rollback to Previous Frontend Version

```bash
# If frontend changes break UX:
git log --oneline marketplace/  # Find last good commit
git revert HEAD --no-edit
git push origin main

# Vercel auto-deploys, should be live in 2-3 minutes
```

---

## Timeline Summary

| Phase | Days | Owner | Deliverable |
|-------|------|-------|-------------|
| 1. Backend Deployment | 1-3 | DevOps/Backend | Live backend on Render |
| 2. Database Migrations | 3-4 | Backend | Schema ready |
| 3. Frontend API Layer | 5-11 | Frontend | All endpoints wired |
| 4. WebSocket Real-Time | 12-15 | Frontend/Backend | Messages sync live |
| 5. Data Migration | 16-18 | Data Engineer | Seed production data |
| 6. E2E Testing | 19-21 | QA/Frontend | All tests passing |
| 7. Optimization/Cleanup | 22-28 | Full Team | Ready for launch |

**Total**: ~4 weeks with 3-4 engineers, can compress to 2-3 weeks with more people.

---

## Dependencies & Prerequisites

**Must Have Before Starting**:
- [ ] Render account with billing enabled
- [ ] Access to GitHub repo (for auto-build)
- [ ] Staging environment URL for testing
- [ ] SSL certificate (Render provides free via Let's Encrypt)
- [ ] PostgreSQL admin credentials (from Render)
- [ ] Redis admin credentials (from Render)

**Recommended Tools**:
- `render` CLI for local blueprint testing
- `psql` for database debugging
- `wscat` for WebSocket testing
- `artillery` for load testing
- `curl` or Postman for API testing

---

## Success Criteria

When you're done, verify:

1. **Authentication Works**
   - User can sign up → receives verification email → logs in
   - JWT token is valid → sent with requests → auto-refreshes on expiry

2. **API Calls Work**
   - All GET endpoints return data
   - All POST endpoints create records
   - All PUT endpoints update records
   - Errors return proper HTTP status codes

3. **Real-Time Works**
   - User 1 sends message → User 2 sees it instantly
   - Deal status changes → all subscribers notified
   - Presence shows who's online

4. **Performance**
   - API response time < 200ms (p95)
   - WebSocket latency < 50ms
   - Page load time < 2s (including API calls)

5. **Security**
   - No secrets in logs
   - CORS properly restricted
   - Rate limiting active
   - Tokens not exposed in browser dev tools

6. **Data Integrity**
   - Creating deal creates DB record
   - Sending message persists to DB
   - User logout clears session

---

## Files to Change (Checklist)

### Frontend Changes (marketplace/)

**Must Update**:
- [ ] `src/lib/api-service.ts` - Implement all endpoints
- [ ] `src/lib/valueskins-api.ts` - High-level business logic
- [ ] `src/hooks/use-auth.ts` - Real auth
- [ ] `src/hooks/use-deals.ts` - Real data
- [ ] `src/hooks/use-messages.ts` - Real messages
- [ ] `src/hooks/use-applications.ts` - Real applications
- [ ] `src/hooks/use-notifications.ts` - Real notifications
- [ ] `src/context/UserContext.tsx` - Global user state
- [ ] `.env.local` - Backend URLs
- [ ] `next.config.js` - CORS headers if needed

**Can Delete**:
- [ ] `src/lib/shared-state.ts`
- [ ] `src/lib/render-storage.ts`
- [ ] `src/lib/demo-data.ts`
- [ ] All `src/pages/api/` routes (API routes)

**Must Review**:
- [ ] All 273 pages that fetch data
- [ ] All components that call API
- [ ] All features that use localStorage

### Backend Changes (backend/)

**Already Done**:
- [x] `Cargo.toml` - Services defined
- [x] `Dockerfile` - Build config
- [x] `migrations/` - Schema defined
- [x] `api_gateway/src/main.rs` - Routes configured
- [x] `websocket.rs` - WebSocket handler

**Verify**:
- [ ] All microservice endpoints implemented
- [ ] Database migrations run successfully
- [ ] WebSocket broadcasts working
- [ ] Error handling returns proper status codes
- [ ] Rate limiting configured
- [ ] CORS allows frontend origin
- [ ] Secrets are strong and set in Render

### Deployment

**Render Configuration**:
- [ ] `render.yaml` blueprint valid
- [ ] Environment variables set
- [ ] Database URL correct
- [ ] Redis URL correct
- [ ] Health checks passing

---

## Next Steps

1. **This Week**: 
   - Review this plan with the team
   - Allocate engineers to phases
   - Set up Render project (if not done)

2. **Next Week**:
   - Deploy backend (Phase 1)
   - Run migrations (Phase 2)
   - Start frontend API integration (Phase 3)

3. **Week 3**:
   - Complete frontend API layer
   - Wire WebSocket (Phase 4)

4. **Week 4+**:
   - Testing, optimization, launch

---

## Questions?

Refer to:
- Backend code: `backend/api_gateway/src/main.rs` (850+ lines of routes)
- Frontend API: `marketplace/src/lib/api-service.ts`
- Database: `backend/migrations/` (74 migration files)
- Render docs: https://render.com/docs

Good luck! 🚀
