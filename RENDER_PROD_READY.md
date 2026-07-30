# ValueSkins Backend Production Deployment Guide

**Status:** Ready to implement. Backend built (24 Rust microservices), not deployed. Frontend live on valueskins.com but uses mock/localStorage only. User requirement: Deploy everything, make real-time, production-ready at scale (100+ concurrent users).

---

## Current State (as of 2026-07-24)

### Frontend (Live)
- URL: https://valueskins.com
- Framework: Next.js Pages Router
- Hosting: Vercel
- Status: Dark UI repainted per 14 ui-specs, but uses mock data only (localStorage)
- Database: New Render PostgreSQL instance updated
  - External: `postgresql://valueskins_test_user:DFTjg1BtedBbP1YDJ0SfrxIKc5ZN8vwi@dpg-d9hpuajeo5us73e4p1t0-a.singapore-postgres.render.com/valueskins_test`
  - Internal: `postgresql://valueskins_test_user:DFTjg1BtedBbP1YDJ0SfrxIKc5ZN8vwi@dpg-d9hpuajeo5us73e4p1t0-a/valueskins_test`

### Backend (Built, Not Deployed)
- Language: Rust
- Location: `/backend` directory
- Microservices (24 total):
  - API Gateway (`api_gateway/`)
  - Auth Service (`auth_service/`)
  - Account Service (`account_service/`)
  - Payment Service (`payment_service/`)
  - Marketplace Service (`marketplace_service/`)
  - Search Service (`search_service/`)
  - Storage Service (`storage_service/`)
  - Analytics Service (`analytics_service/`)
  - Guardian Service (`guardian_service/`)
  - Trust Service (`trust_service/`)
  - Reputation Service (`reputation_service/`)
  - Settings Service (`settings_service/`)
  - Events Service (`events_service/`)
  - Moderation Service (`moderation_service/`)
  - Contract Service (`contract_service/`)
  - Referral Service (`referral_service/`)
  - AI Service (`ai_service/`)
  - Identity Service (`identity_service/`)
  - Credential Service (`credential_service/`)
  - Credit Service (`credit_service/`)
  - Communities Service (`communities_service/`)
  - Indexer (`indexer/`)
  - LinkedIn Service (`linkedin_service/`)
  - Brand API (`brand_api/`)
- Build System: Cargo (Rust package manager)
- Docker: Dockerfile exists in backend root
- Status: Compiles, microservices ready but no production deployment

---

## What Needs to Happen

### Phase 1: Backend Deployment to Render
**Goal:** Get API Gateway live and accessible from frontend.

1. **Build Docker image**
   ```bash
   cd backend
   docker build -t valueskins-backend:latest .
   ```

2. **Deploy to Render** (via Render dashboard or CLI)
   - Service type: Docker
   - Docker image: valueskins-backend:latest
   - Port: 8080 (default from API Gateway)
   - Environment variables needed:
     - `DATABASE_URL` (already set: new Render PostgreSQL)
     - `RUST_ENV=production`
     - `REDIS_URL` (if using Redis for sessions/caching)
     - `JWT_SECRET` (generate new secure key)
     - `LOG_LEVEL=info`

3. **Database migrations**
   - Location: Check `backend/migrations/` or `backend/db/` for SQL migration files
   - Run migrations before starting services
   - Schema should match: users, deals, messages, payments, reputation, etc.

4. **Verify API Gateway is live**
   - Test endpoint: `curl https://<render-deployment-url>/health`
   - Should return 200 with health status

### Phase 2: Frontend → Backend Wiring
**Goal:** Connect frontend APIs to real backend instead of localStorage.

1. **Update frontend environment**
   - File: `marketplace/.env.production`
   - Add: `NEXT_PUBLIC_BACKEND_URL=https://<render-api-gateway-url>`
   - Add: `NEXT_PUBLIC_WS_URL=wss://<render-api-gateway-url>/ws` (for WebSocket real-time)

2. **Replace mock API calls with real backend**
   - Files to update:
     - `marketplace/src/lib/api.ts` (API client)
     - `marketplace/src/context/AuthContext.tsx` (authentication)
     - `marketplace/src/features/marketplace/MarketplaceDemo.tsx` (deal listing)
     - `marketplace/src/features/messaging/` (chat/messaging)
   - Change from localStorage/mock to fetch/axios calls to backend endpoints

3. **API endpoints to wire** (from backend)
   - POST `/auth/login` (auth_service)
   - POST `/auth/signup` (auth_service)
   - POST `/deals` (marketplace_service)
   - GET `/deals/:id` (marketplace_service)
   - POST `/messages` (events_service / messaging)
   - GET `/messages/:dealId` (events_service)
   - PUT `/deals/:id/approve` (marketplace_service)
   - GET `/user/profile` (account_service)
   - POST `/payments/charge` (payment_service)

4. **Redeploy frontend**
   - Push to develop → staging.yml triggers
   - Verify on valueskins.com that backend is connected
   - Check browser console for API errors

### Phase 3: Real-Time Messaging (WebSocket)
**Goal:** Live chat, deal updates, notifications across devices.

1. **WebSocket layer in API Gateway**
   - Endpoint: `wss://<backend-url>/ws`
   - Authentication: JWT token in connection handshake
   - Message types:
     - `message:send` (new chat message)
     - `deal:update` (deal status change)
     - `notification:new` (incoming notification)
     - `presence:online` (user online/offline)

2. **Frontend WebSocket client**
   - File: Create `marketplace/src/hooks/useWebSocket.ts`
   - Logic: Connect on auth, reconnect on disconnect, handle message routing
   - Use with React Context to broadcast real-time events globally

3. **Backend message queue** (if not built)
   - Use Redis Pub/Sub or native Rust channels
   - Broker messages between microservices
   - Ensure one message isn't delivered twice to same user

### Phase 4: Production Hardening
**Goal:** Scale to 100+ concurrent users reliably.

1. **Database connection pooling**
   - Backend config: set `max_connections=50` for Postgres
   - Use connection pool library (sqlx, diesel, etc.)
   - Monitor: connection count should stay stable under load

2. **Caching layer** (Redis)
   - Session storage: user auth tokens → Redis (not DB)
   - Hot data: creator profiles, recent deals → Redis with TTL
   - Config: `REDIS_URL` in env, Redis on Render

3. **Rate limiting** (backend)
   - Per user: 100 API calls/minute
   - Per IP: 1000 calls/hour (unauthenticated)
   - Endpoints: all POST/PUT operations
   - Library: `actix-web` middleware or custom

4. **Load balancing**
   - Multiple instances of API Gateway on Render
   - Auto-scale rule: scale up at 70% CPU
   - Health checks every 30 seconds

5. **Monitoring & alerts**
   - Logs: JSON structured logs, queryable
   - Metrics: API latency, error rate, DB connection count
   - Alerts: if error rate > 5%, if latency > 500ms, if DB connections > 40

6. **Database backups**
   - Render PostgreSQL: automated daily backups
   - Retention: 90 days
   - Test restore monthly to staging

---

## Implementation Checklist for Next LLM

### Before Starting
- [ ] Read this entire file
- [ ] Understand: frontend is live but fake, backend is built but dormant
- [ ] Goal: real-time, production-ready, scales to 100+ users
- [ ] Token budget: start with fresh 200K (pause at 96%)

### Phase 1: Backend Deployment
- [ ] Check `backend/Dockerfile` exists and is valid
- [ ] Read `backend/Cargo.toml` to understand dependencies
- [ ] Build Docker image: `cd backend && docker build -t valueskins-backend:latest .`
- [ ] Create Render service:
  - Name: `valueskins-api`
  - Type: Docker
  - Image: valueskins-backend:latest
  - Port: 8080
  - Env vars: DATABASE_URL, RUST_ENV=production, JWT_SECRET, REDIS_URL
- [ ] Deploy and verify health check
- [ ] Get backend URL (e.g., https://valueskins-api-xyz.render.com)

### Phase 2: Frontend Wiring
- [ ] Update `marketplace/.env.production`:
  - `NEXT_PUBLIC_BACKEND_URL=<backend-url>`
  - `NEXT_PUBLIC_WS_URL=<backend-url with wss://>`
- [ ] Find all localStorage/mock calls in frontend:
  - Grep: `localStorage`, `mock`, `demo-data`
  - Replace with actual API calls
- [ ] Wire these endpoints:
  - Login: POST /auth/login
  - Signup: POST /auth/signup
  - Deals list: GET /deals
  - Create deal: POST /deals
  - Messages: POST/GET /messages/:dealId
  - Approve deal: PUT /deals/:id/approve
  - User profile: GET /user/profile
- [ ] Test: log in with real backend, create deal, verify data persists
- [ ] Deploy frontend: push to develop, wait for staging deploy, test on valueskins.com

### Phase 3: Real-Time
- [ ] Check backend for WebSocket implementation (search `ws://` in backend code)
- [ ] If missing, implement:
  - API Gateway WebSocket handler at `/ws`
  - Auth handshake with JWT
  - Message routing (deal updates, chat, notifications)
  - Broadcast to all connected users in same deal room
- [ ] Create frontend WebSocket hook: `useWebSocket.ts`
- [ ] Test: open app on two devices, send message, see it appear in real-time on both
- [ ] Test: one user approves deal, other sees status change instantly

### Phase 4: Hardening
- [ ] Backend: add connection pooling (check Cargo.toml for sqlx/diesel)
- [ ] Backend: add Redis caching for sessions
- [ ] Backend: implement rate limiting middleware
- [ ] Backend: set up structured JSON logging
- [ ] Render: enable auto-scaling (scale up at 70% CPU, max 3 instances)
- [ ] Render: set up health checks
- [ ] Database: verify automated backups are enabled
- [ ] Test: load test with 100 concurrent users
  - Tool: `ab` (Apache Bench) or `wrk`
  - Command: `ab -n 1000 -c 100 https://valueskins.com/api/deals`
  - Check: no errors, latency < 500ms, DB stable

### Testing Before Shipping
- [ ] Two browser windows: creator and brand
- [ ] Brand creates deal, creator sees it instantly
- [ ] Creator counters, brand sees it instantly
- [ ] Both send messages, appear in real-time
- [ ] Deal approval: status updates live on both devices
- [ ] Refresh page: data still there (verify backend persistence)
- [ ] New deal creation: shows in list immediately (WebSocket working)
- [ ] 10+ concurrent users: no errors, no timeouts
- [ ] Connection drops: app reconnects automatically

### Deployment & Monitoring
- [ ] Render deployment: Production environment
- [ ] Vercel frontend: points to live backend URL
- [ ] Database: backups enabled, tested restore
- [ ] Monitoring: Datadog or similar for metrics
- [ ] Alerts: Slack integration for errors/high latency
- [ ] Logging: view recent logs in Render dashboard
- [ ] Rollback plan: if backend breaks, revert to previous Render version

---

## Key Files to Examine

**Backend:**
- `backend/api_gateway/src/main.rs` — entry point, server startup
- `backend/api_gateway/src/handlers.rs` — HTTP route handlers
- `backend/auth_service/src/handlers.rs` — login/signup logic
- `backend/marketplace_service/src/handlers.rs` — deal CRUD
- `backend/events_service/src/lib.rs` — messaging/real-time logic
- `backend/Cargo.toml` — dependencies (actix-web, sqlx, tokio, etc.)
- `backend/.env` — local dev config

**Frontend:**
- `marketplace/src/context/AuthContext.tsx` — user auth state
- `marketplace/src/lib/api.ts` — API client (update this!)
- `marketplace/src/features/marketplace/MarketplaceDemoPage.tsx` — main UI
- `marketplace/.env.production` — backend URL env var
- `marketplace/src/pages/demo/marketplace.tsx` — routes

**Database:**
- Render PostgreSQL console: https://dashboard.render.com
- Tables: users, deals, messages, payments, created_at indexes critical

---

## Common Pitfalls & How to Avoid

1. **WebSocket connection fails silently**
   - Add error logging in frontend useWebSocket
   - Check CORS headers on backend
   - Verify wss:// (secure WebSocket) if HTTPS frontend

2. **One user doesn't see another's message**
   - Check: message routed to correct deal room
   - Verify: WebSocket broadcast includes all connected clients
   - Test: message persisted in database (check DB directly)

3. **Performance drops at 20+ users**
   - Check: database connection pool size (increase if maxed)
   - Add Redis for session/hot data caching
   - Check: backend logs for slow queries (>100ms)
   - Profile: use `cargo flamegraph` to find bottlenecks

4. **Deployment fails with "port already in use"**
   - Backend tries to bind to 8080 but it's taken
   - Solution: change port in `api_gateway/src/main.rs` or use Render port override

5. **Frontend shows "Cannot connect to backend"**
   - Check: `NEXT_PUBLIC_BACKEND_URL` is correct in .env.production
   - Check: backend is actually running (curl health endpoint)
   - Check: CORS headers allow frontend domain
   - Check: frontend and backend on same network/accessible

---

## Success Criteria

- [ ] Two devices, two accounts (brand + creator)
- [ ] Brand creates deal → creator sees it instantly (< 1 second)
- [ ] Creator sends message → brand sees it instantly
- [ ] Deal status change (approve/reject) → both see updated state instantly
- [ ] Refresh page → all data persists (backend, not localStorage)
- [ ] 100 concurrent users → no errors, < 500ms latency
- [ ] No duplicate messages, no lost updates
- [ ] Reconnect after network drop → automatic, no manual refresh needed

---

## Timeline Estimate

- Phase 1 (Backend Deploy): 2-3 hours
- Phase 2 (Frontend Wiring): 4-6 hours
- Phase 3 (Real-Time WebSocket): 3-4 hours
- Phase 4 (Hardening & Testing): 4-6 hours
- **Total: 14-20 hours of implementation work**

Team: 1 full-stack engineer (or 1 backend + 1 frontend in parallel)

---

## Questions to Ask If Stuck

- "Is the backend Docker image building without errors?"
- "Can I curl the health endpoint from my laptop?"
- "Are frontend API calls hitting the backend or still using localStorage?"
- "Does the WebSocket connection open? (check browser DevTools Network tab)"
- "Does the database have data? (query Render PostgreSQL console directly)"
- "What's the error in browser console?"
- "What's the error in Render backend logs?"

---

**Good luck. Make it real. Make it work for 100 users. Then tell me it's done.**
