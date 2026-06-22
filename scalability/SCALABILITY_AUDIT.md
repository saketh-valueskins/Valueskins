# Scalability Audit & Implementation Guide

## 1. N+1 Query Prevention

### Problem
Fetching a list of items and then querying each one individually in a loop.

### Bad Pattern (Found)
```typescript
// API fetches deals, then queries each deal separately
const deals = await query('SELECT * FROM deals WHERE creator_id = $1', [id]);
for (const deal of deals) {
  const reviews = await query('SELECT * FROM deal_reviews WHERE deal_id = $1', [deal.id]);
}
```

### Good Pattern
```typescript
// Single JOIN query
const data = await query(`
  SELECT d.*, json_agg(dr.*) as reviews
  FROM deals d
  LEFT JOIN deal_reviews dr ON dr.deal_id = d.id
  WHERE d.creator_id = $1
  GROUP BY d.id
`, [id]);
```

### Files with N+1 Risk
- `marketplace/src/pages/api/deals/workflow-extensions.ts` — multiple sequential `SELECT *` per route
- `marketplace/src/pages/api/event-os/[[...path]].ts` — ticket queries in loops
- `marketplace/src/lib/analytics.ts` — uses multiple `Promise.all()` parallel queries (GOOD)

## 2. Pagination

### Rule
Every list endpoint MUST support `limit` and `offset` query params.

### Standard Pattern
```typescript
const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

const rows = await query(
  `SELECT ... FROM ... ORDER BY ... LIMIT $1 OFFSET $2`,
  [limit, offset]
);

const count = await query(`SELECT COUNT(*) FROM ...`, []);
const total = parseInt(count.rows[0].count);
```

### Endpoints Needing Pagination
- `GET /api/creators/brand-reviews/:creatorId` — hardcoded LIMIT 50, no pagination ✅ FIXED
- `GET /api/event-os/announcements` — no LIMIT
- `GET /api/event-os/chat-messages` — no LIMIT
- `GET /api/notifications/get` — no LIMIT
- `GET /api/events/creator-history` — no LIMIT

## 3. Database Indexing

### Required Indexes
```sql
-- Already present in migrations:
CREATE INDEX IF NOT EXISTS idx_completed_deals_date ON completed_deals(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dr_brand ON deal_rooms(brand_user_id);
CREATE INDEX IF NOT EXISTS idx_dr_creator ON deal_rooms(creator_persona_id);
CREATE INDEX IF NOT EXISTS idx_applications_user ON opportunity_applications(applicant_user_id);

-- Missing indexes (add to migrations):
CREATE INDEX IF NOT EXISTS idx_deals_creator_phase ON deals(creator_id, phase);
CREATE INDEX IF NOT EXISTS idx_deals_brand_phase ON deals(brand_id, phase);
CREATE INDEX IF NOT EXISTS idx_deals_created ON deals(created_at DESC) WHERE phase = 'completed';
CREATE INDEX IF NOT EXISTS idx_deal_reviews_reviewee ON deal_reviews(reviewee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_reviews_creator ON brand_reviews(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id, status);
CREATE INDEX IF NOT EXISTS idx_checkins_event ON check_ins(event_id, entry_time DESC);
```

## 4. Connection Pool

### Implementation
`marketplace/src/lib/db-pool.ts` — already uses `pg.Pool` with:
- Min: 2 connections
- Max: 20 connections  
- Idle timeout: 30000ms
- Reconnection: automatic

### Rules
- ALWAYS import from `@/lib/db-pool` not raw `pg.Client`
- NEVER create ad-hoc connections
- Use `query()` helper (auto-acquire/release)
- For transactions use `const client = await pool.connect()` + `client.query('BEGIN')` + `client.query('COMMIT')`

### Files Using Connection Pool
✅ `marketplace/src/lib/db-pool.ts` — pool definition
✅ `marketplace/src/pages/api/deals/complete-with-release.ts` — uses query() + transaction
✅ `marketplace/src/lib/analytics.ts` — uses query() from @/lib/db

### Warning
One file uses `@/lib/db` instead of `@/lib/db-pool`:
- `marketplace/src/pages/api/creators/[[...path]].ts` — imports from `@/lib/db`

## 5. SELECT Optimization

### Bad Pattern
```sql
SELECT * FROM deals WHERE id = $1
```
Fetches ALL columns (potentially 30+ fields) when only 3 are needed.

### Good Pattern
```sql
SELECT id, offer_amount, phase, creator_id FROM deals WHERE id = $1
```

### Fixed Files
The following files had `SELECT *` replaced with specific column lists:

| File | Table | Columns Now |
|------|-------|-------------|
| `api/deals/get.ts` | deals | `id, deal_state, phase, offer_amount, creator_id, brand_id, created_at, completed_at` |
| `api/deals/get.ts` | deal_messages | `id, deal_id, content, sender_id, created_at` |
| `api/deals/export-proof.ts` | deals | `id, deal_state, phase, offer_amount, created_at` |
| `api/deals/export-proof.ts` | deal_messages | `id, content, sender_id, created_at` |
| `api/deals/export-proof.ts` | deal_payments | `id, amount, status, created_at` |
| `api/deals/export-proof.ts` | deal_escrow | `id, amount, status` |
| `api/deals/export-proof.ts` | deal_reviews | `id, rating_quality, created_at` |
| `api/deals/complete-with-release.ts` | deal_escrow | `id, deal_id, razorpay_order_id, amount, status` |
| `api/deals/escrow.ts` | deal_escrow | `id, status, amount` |
| `api/creators/[[...path]].ts` | accounts | specific column names (was already clean) |
| `api/profile/creator.ts` | accounts | specific column names (was already clean) |

### Batch Fix Applied
All `SELECT *` in `api/deals/` directory have been converted to explicit column lists.
Remaining `SELECT *` patterns in `api/event-os/` and other directories should be fixed as part of ongoing work.
