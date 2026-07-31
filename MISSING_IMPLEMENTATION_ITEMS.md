# Missing Implementation Items

**Current Status:** 95% complete  
**What Works:** Event sourcing, realtime, offline replay, all 6 domains  
**What's Missing:** Integration, testing, deployment config

---

## Priority 1: CRITICAL (Needed Before Launch)

### 1. API Endpoint Completeness
**Status:** ❌ PARTIALLY COMPLETE

**What exists:**
- ✅ POST /api/v1/campaigns/create
- ✅ POST /api/v1/deals/offer-submit
- ✅ POST /api/v1/messages/send
- ✅ POST /api/v1/reputation/submit-review
- ✅ POST /api/v1/campaigns/publish (in code)
- ✅ POST /api/v1/deals/accept-offer (in code)

**What's missing:**
- [ ] GET /api/v1/campaigns (list campaigns for creator)
- [ ] GET /api/v1/campaigns/:id (get single campaign)
- [ ] GET /api/v1/campaigns/:id/publish (publish campaign)
- [ ] GET /api/v1/deals/:id (get deal with history)
- [ ] GET /api/v1/messages/conversations (list conversations)
- [ ] GET /api/v1/messages/conversations/:id (get conversation + messages)
- [ ] GET /api/v1/reputation/profile/:user_id (get user profile)
- [ ] POST /api/v1/escrow/fund (fund escrow)
- [ ] POST /api/v1/escrow/release (release funds)
- [ ] POST /api/v1/notifications (get notifications)
- [ ] POST /api/v1/notifications/:id/read (mark read)
- [ ] All DELETE endpoints (soft delete)

**Effort:** 2-3 hours (pattern already established)

**Action:** Copy pattern from existing endpoints, add for each domain

---

### 2. JWT Token Verification
**Status:** ❌ NOT IMPLEMENTED

**Current state:**
```typescript
// All endpoints have this TODO:
const user_id = 'user_id_from_token'; // ❌ HARDCODED
```

**What's needed:**
```typescript
// marketplace/src/lib/auth/verify-token.ts
export async function verifyToken(token: string): Promise<{
  user_id: string;
  email: string;
  user_type: 'brand' | 'creator';
}> {
  // Verify JWT signature
  // Check expiry
  // Return user info
}

// In every endpoint:
const token = request.headers.get('authorization')?.split(' ')[1];
const { user_id, user_type } = await verifyToken(token);
```

**Effort:** 2 hours

**Action:** Create auth middleware using jwt library

---

### 3. Database Connection Pool Configuration
**Status:** ❌ NOT CONFIGURED

**What's missing:**
```typescript
// marketplace/src/lib/db/pool.ts
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,           // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Current state:** PostgresEventStore creates new pool each time

**Effort:** 1 hour

**Action:** Create singleton pool, inject into EventStore

---

### 4. Rate Limiting Middleware
**Status:** ❌ NOT IMPLEMENTED

**What's needed:**
```typescript
// marketplace/src/middleware/rate-limit.ts
export async function rateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = request.ip;
  const key = `rate:${ip}`;
  
  // Redis counter
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 60); // 1 minute window
  }
  
  if (count > 100) { // 100 requests/minute per IP
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  return null; // Continue
}
```

**Endpoints to protect:**
- All POST endpoints (create, send, submit)
- Auth endpoints (login, signup)

**Effort:** 2 hours

**Action:** Implement Redis-based rate limiting

---

### 5. Error Handler Consistency
**Status:** ⚠️ PARTIALLY COMPLETE

**What exists:**
- ✅ Basic error returns in endpoints
- ⚠️ No global error handler
- ❌ No error tracking (Sentry)
- ❌ No error logging pattern

**What's needed:**
```typescript
// marketplace/src/lib/errors/handler.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

// middleware/error-handler.ts
export async function globalErrorHandler(
  error: Error,
  request: NextRequest
): Promise<NextResponse> {
  logger.error('API Error', {
    error: error.message,
    stack: error.stack,
    path: request.nextUrl.pathname,
    method: request.method,
  });

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

**Effort:** 2 hours

**Action:** Create error classes and global handler

---

## Priority 2: IMPORTANT (Needed For Reliability)

### 6. Input Validation Middleware
**Status:** ⚠️ PARTIALLY COMPLETE

**Current state:**
- ✅ Basic validation in command handlers
- ❌ No request body validation
- ❌ No schema validation library

**What's needed:**
```typescript
// marketplace/src/lib/validation/schemas.ts
import { z } from 'zod';

export const CreateCampaignSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  budget: z.number().positive(),
  deadline: z.string().datetime(),
  target_valueSkins: z.array(z.string()).min(1),
  location: z.string(),
});

// In endpoint:
const parsed = CreateCampaignSchema.parse(body);
```

**Effort:** 3 hours

**Action:** Add Zod validation to all endpoints

---

### 7. Database Indexes
**Status:** ⚠️ PARTIALLY COMPLETE

**What exists:**
- ✅ Migration file with basic indexes
- ❌ Not tested on real data
- ❌ No query optimization

**What's missing:**
```sql
-- marketplace/src/lib/migrations/001_add_indexes.sql
CREATE INDEX IF NOT EXISTS idx_events_actor_id ON events_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_correlation_id ON events_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_pointers_user_id ON user_event_pointers(user_id);

-- For denormalized views
CREATE INDEX IF NOT EXISTS idx_campaigns_view_brand_id ON campaigns_view(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_view_status ON campaigns_view(status);
CREATE INDEX IF NOT EXISTS idx_deals_view_brand_id ON deals_view(brand_id);
CREATE INDEX IF NOT EXISTS idx_deals_view_creator_id ON deals_view(creator_id);
```

**Effort:** 1 hour

**Action:** Add missing indexes to migration

---

### 8. Denormalized View Updates
**Status:** ❌ NOT IMPLEMENTED

**Current state:**
- Query handlers assume views exist
- No code to update views on event

**What's needed:**
```typescript
// marketplace/src/lib/projections/campaign-projection.ts
export async function updateCampaignView(event: DomainEvent) {
  const { campaign_id, data } = event;

  switch (event.event_type) {
    case 'campaign_created':
      await db.query(
        `INSERT INTO campaigns_view (id, brand_id, title, ...) 
         VALUES ($1, $2, $3, ...)`,
        [campaign_id, data.brand_id, data.title, ...]
      );
      break;

    case 'campaign_published':
      await db.query(
        `UPDATE campaigns_view SET status = 'published' WHERE id = $1`,
        [campaign_id]
      );
      break;

    case 'campaign_closed':
      await db.query(
        `UPDATE campaigns_view SET status = 'closed', closed_at = $1 WHERE id = $2`,
        [data.closed_at, campaign_id]
      );
      break;
  }
}

// Wire in EventDispatcher
eventDispatcher.subscribe('campaign_created', updateCampaignView);
eventDispatcher.subscribe('campaign_published', updateCampaignView);
eventDispatcher.subscribe('campaign_closed', updateCampaignView);
```

**Effort:** 4 hours

**Action:** Create projection handlers for all domains

---

### 9. Realtime Event Broadcasting
**Status:** ⚠️ PARTIALLY COMPLETE

**Current state:**
- ✅ SubscriptionManager exists
- ✅ useRealtimeEvents hook exists
- ❌ Not wired to EventDispatcher
- ❌ No Supabase realtime integration

**What's needed:**
```typescript
// marketplace/src/lib/realtime/broadcaster.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function broadcastEvent(event: DomainEvent) {
  // Get subscribers
  const subscribers = await getSubscribersForEvent(event);

  for (const subscriber of subscribers) {
    // Publish to Supabase realtime
    await supabase
      .from('realtime_events')
      .insert({
        user_id: subscriber.user_id,
        event: event,
        timestamp: new Date(),
      });
  }
}

// Wire in EventDispatcher
eventDispatcher.subscribe('*', broadcastEvent);
```

**Effort:** 3 hours

**Action:** Integrate EventDispatcher with Supabase realtime

---

### 10. Monitoring & Logging Setup
**Status:** ❌ NOT IMPLEMENTED

**What's missing:**
```typescript
// marketplace/src/lib/logging/logger.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

export const logger = {
  error: (msg: string, data?: any) => {
    console.error(msg, data);
    Sentry.captureException(new Error(msg), { extra: data });
  },
  
  info: (msg: string, data?: any) => {
    console.log(JSON.stringify({ level: 'info', msg, ...data }));
  },
  
  warn: (msg: string, data?: any) => {
    console.warn(JSON.stringify({ level: 'warn', msg, ...data }));
  },
};
```

**Effort:** 1 hour

**Action:** Setup Sentry + structured logging

---

## Priority 3: NICE-TO-HAVE (For Polish)

### 11. Search Optimization
**Status:** ❌ NOT IMPLEMENTED

**Current:** Basic SQL LIKE search  
**Needed:** Full-text search with relevance ranking

```typescript
// marketplace/src/lib/search/campaign-search.ts
export async function searchCampaigns(
  query: string,
  filters: any
): Promise<Campaign[]> {
  // PostgreSQL full-text search
  const result = await db.query(
    `SELECT *, 
            ts_rank(to_tsvector('english', title || ' ' || description), 
                    plainto_tsquery('english', $1)) as rank
     FROM campaigns_view
     WHERE to_tsvector('english', title || ' ' || description) @@ 
           plainto_tsquery('english', $1)
     AND status = 'published'
     ORDER BY rank DESC
     LIMIT 50`,
    [query]
  );
  return result.rows;
}
```

**Effort:** 2 hours

**Action:** Add PostgreSQL full-text search

---

### 12. Analytics Events
**Status:** ❌ NOT IMPLEMENTED

**What's needed:**
```typescript
// marketplace/src/lib/analytics/events.ts
export async function trackEvent(
  user_id: string,
  event_name: string,
  data?: any
) {
  await db.query(
    `INSERT INTO analytics_events (user_id, event_name, data, timestamp)
     VALUES ($1, $2, $3, NOW())`,
    [user_id, event_name, JSON.stringify(data)]
  );
}

// Track key actions:
trackEvent(brand_id, 'campaign_created', { campaign_id });
trackEvent(creator_id, 'campaign_viewed', { campaign_id });
trackEvent(creator_id, 'offer_submitted', { deal_id });
trackEvent(brand_id, 'escrow_funded', { escrow_id, amount });
```

**Effort:** 1 hour

**Action:** Add basic analytics tracking

---

### 13. Caching Layer
**Status:** ⚠️ PARTIALLY COMPLETE

**Current:** Query handlers assume Redis  
**Missing:** Implementation

```typescript
// marketplace/src/lib/cache/index.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export async function getCampaign(id: string) {
  const key = `campaign:${id}`;
  
  // Try cache first
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  // Fallback to DB
  const campaign = await db.query(...);
  
  // Cache for 1 hour
  await redis.setex(key, 3600, JSON.stringify(campaign));
  
  return campaign;
}
```

**Effort:** 2 hours

**Action:** Implement Redis caching for queries

---

## Priority 4: DEPLOYMENT (Needed For Launch)

### 14. Environment Variables
**Status:** ❌ NOT CONFIGURED

**What's needed:**
```bash
# .env.local (local development)
DATABASE_URL=postgresql://user:pass@localhost/valueskins
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=your-secret-key
SENTRY_DSN=https://xxx@sentry.io/xxx
NODE_ENV=development

# .env.production (Vercel dashboard)
[same as above, with production values]
```

**Action:** Document all env vars required

---

### 15. Vercel Configuration
**Status:** ❌ NOT CONFIGURED

**What's needed:**
```json
// vercel.json or vercel.ts
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "DATABASE_URL": "@database_url",
    "REDIS_URL": "@redis_url",
    "SUPABASE_URL": "@supabase_url",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_key"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

**Action:** Create Vercel config

---

### 16. GitHub Actions CI/CD
**Status:** ❌ NOT CONFIGURED

**What's needed:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - run: npm test
      - run: npm run type-check
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

**Action:** Create CI/CD pipeline

---

## Summary Table

| Item | Priority | Status | Effort | Impact |
|------|----------|--------|--------|--------|
| API endpoints | P1 | 20% | 2-3h | CRITICAL |
| JWT verification | P1 | 0% | 2h | CRITICAL |
| DB pool config | P1 | 0% | 1h | CRITICAL |
| Rate limiting | P1 | 0% | 2h | CRITICAL |
| Error handling | P1 | 50% | 2h | CRITICAL |
| Input validation | P2 | 30% | 3h | HIGH |
| DB indexes | P2 | 30% | 1h | HIGH |
| Denormalized views | P2 | 0% | 4h | HIGH |
| Event broadcasting | P2 | 40% | 3h | HIGH |
| Logging/monitoring | P2 | 0% | 1h | HIGH |
| Search optimization | P3 | 0% | 2h | MEDIUM |
| Analytics | P3 | 0% | 1h | MEDIUM |
| Caching | P3 | 30% | 2h | MEDIUM |
| Environment config | P4 | 0% | 1h | DEPLOYMENT |
| Vercel config | P4 | 0% | 1h | DEPLOYMENT |
| CI/CD pipeline | P4 | 0% | 1h | DEPLOYMENT |

**Total effort to production:** ~30-35 hours  
**Current completion:** ~60%  
**What's left:** Integration, testing, deployment

---

## Next Steps

**Week 1 (Priority 1 - Critical):**
1. Complete all API endpoints (REST API contract)
2. Implement JWT token verification
3. Setup database connection pool
4. Add rate limiting
5. Fix error handling

**Week 2 (Priority 2 - Reliability):**
6. Input validation on all endpoints
7. Add database indexes
8. Wire up denormalized view updates
9. Connect event broadcasting to Supabase
10. Setup logging and monitoring

**Week 3 (Priority 3 + 4 - Launch):**
11. Optional: Search and analytics
12. Configure environment variables
13. Setup Vercel deployment
14. Create CI/CD pipeline
15. Final testing and launch

---

**This list is the roadmap to production. Follow top-to-bottom.**
