# Connection Pool Standards

## Pool Configuration
Defined in `marketplace/src/lib/db-pool.ts`:
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,          // Max concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

## Rules
1. **ALWAYS** import from `@/lib/db-pool` — never create raw `pg.Client`
2. **NEVER** use `new Pool()` in a route handler — always use the shared pool
3. **Simple queries**: use `query()` helper (auto-acquire + release)
4. **Transactions**: use `pool.connect()` + manual BEGIN/COMMIT/ROLLBACK

## Transaction Pattern
```typescript
import { pool } from '@/lib/db-pool';

async function transferFunds(fromId: string, toId: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

## Audit
| File | Pool Used? | Notes |
|------|-----------|-------|
| `lib/db-pool.ts` | ✅ Definition | Correct config |
| `lib/db.ts` | ✅ Re-exports | Re-exports from db-pool |
| `pages/api/deals/complete-with-release.ts` | ✅ | Uses query() |

## Fixed
- `pages/api/creators/[[...path]].ts` — was importing from `@/lib/db` (same pool, wrong alias) ✅ Fixed to `@/lib/db-pool`
