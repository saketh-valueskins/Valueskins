# SQL Injection Prevention

## Status: PROTECTED ✅

All database queries use **parameterized prepared statements** (`$1, $2` placeholders with values as a separate array). The `pg` library handles escaping natively — user input never reaches the SQL string.

## What We Have

| Layer | Protection | Status |
|-------|-----------|--------|
| `pg.Pool.query(text, params)` | Values always in `$1, $2, ...` placeholders | ✅ |
| Runtime guard (`safe-query.ts`) | Warns on unparameterized WHERE queries | ✅ |
| CI lint (`scripts/sql-injection-lint.js`) | Blocks direct `pg` imports, string concat, template interpolation | ✅ |
| Dual pool fix (`db.ts`) | No longer creates separate pool — re-exports from `db-pool.ts` | ✅ |

## What We DON'T Need
- **ORM**: Not required. Parameterized `$N` queries are the gold standard. ORMs add complexity without improving injection safety.
- **Manual escaping**: The `pg` library handles all escaping internally when using parameterized queries.

## Lint Script
```bash
npm run lint:sql        # check all files
npm run lint:sql:ci     # fail on errors (CI mode)
```

## Architecture
```
src/lib/db-pool.ts       ← Single pool (max 20), exports query()
src/lib/db.ts            ← Re-exports from db-pool (backward compat)
src/lib/safe-query.ts    ← Runtime guard layer (optional wrapper)
All API routes           ← Use query('SELECT ... WHERE id = $1', [val])
```

## How Parameterization Works
```typescript
// SAFE - values never touch SQL string
query('SELECT * FROM users WHERE email = $1', [userInput]);

// DANGEROUS - never do this
query(`SELECT * FROM users WHERE email = '${userInput}'`);
```

The `pg` library sends the SQL text and values separately to PostgreSQL. The database engine handles escaping — values are data, not code.
