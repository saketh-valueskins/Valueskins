# N+1 Query Prevention

## The Problem
One query to fetch a list, then N queries for each item in that list.

## Bad Patterns to Avoid

### ❌ Looping over results
```typescript
const deals = await query('SELECT id FROM deals WHERE creator_id = $1', [id]);
for (const deal of deals.rows) {
  const reviews = await query('SELECT * FROM deal_reviews WHERE deal_id = $1', [deal.id]);
}
```

### ❌ Sequential lookups in the same request
```typescript
const user = await query('SELECT ... FROM users WHERE id = $1', [req.headers['x-user-id']]);
const account = await query('SELECT ... FROM accounts WHERE id = $1', [user.rows[0].account_id]);
const rep = await query('SELECT ... FROM user_reputation WHERE account_id = $1', [account.rows[0].id]);
```

## Good Patterns

### ✅ JOIN with aggregation
```typescript
const result = await query(`
  SELECT d.*, json_agg(json_build_object(
    'id', r.id, 'rating', r.rating_quality, 'created_at', r.created_at
  )) as reviews
  FROM deals d
  LEFT JOIN deal_reviews r ON r.deal_id = d.id
  WHERE d.creator_id = $1
  GROUP BY d.id
  ORDER BY d.created_at DESC
`, [id]);
```

### ✅ Promise.all for independent queries
```typescript
const [deals, reviews, reputation] = await Promise.all([
  query('SELECT ... FROM deals WHERE ...', [id]),
  query('SELECT ... FROM deal_reviews WHERE ...', [id]),
  query('SELECT ... FROM user_reputation WHERE ...', [id]),
]);
```

## Files Audited
| File | Status |
|------|--------|
| `src/lib/analytics.ts` | ✅ Uses Promise.all — 7 parallel queries |
| `src/pages/api/deals/workflow-extensions.ts` | ⚠️ Sequential queries (creators then campaigns) — needs refactor |
| `src/pages/api/creators/[[...path]].ts` | ✅ Single queries per route handler |
| `src/pages/api/event-os/[[...path]].ts` | ⚠️ Multiple sequential queries — needs JOINs |

## Rule
If you see a `for` loop with a `query()` call inside it = N+1. Stop and rewrite.
