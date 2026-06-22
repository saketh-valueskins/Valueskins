# Pagination Standards

## Rule
Every list endpoint MUST support `limit` and `offset` query params.

## Standard Implementation
```typescript
const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

const data = await query(
  `SELECT ... WHERE ... ORDER BY ... LIMIT $1 OFFSET $2`,
  [limit, offset]
);

const count = await query(`SELECT COUNT(*) FROM ... WHERE ...`, [...]);
const total = parseInt(count.rows[0].count);

return res.json({ total, limit, offset, data: data.rows });
```

## Response Shape
```json
{
  "total": 342,
  "limit": 50,
  "offset": 0,
  "data": [...]
}
```

## Defaults
- Default limit: `50`
- Max limit: `200` (prevents abuse)
- Offset: `0` (start from beginning)

## Endpoints Audited
| Endpoint | Pagination Fixed? |
|----------|-------------------|
| `GET /creators/brand-reviews/:id` | ✅ Added `limit` + `offset` + `total` |
| `GET /notifications/get` | ✅ Added `limit` + `offset` + `total` |
| Events chat messages | ❌ Needs fix |
| Events announcements | ❌ Needs fix |
| Event check-ins list | ❌ Needs fix |
