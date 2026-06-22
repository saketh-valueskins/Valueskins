# SELECT Optimization

## Rule
Never `SELECT *` in production. Always list the columns you need.

## Why
- `SELECT *` sends ALL columns over the network — bandwidth waste
- Prevents PostgreSQL index-only scans — forces heap lookups
- Breaks if table schema changes — hidden bugs
- Unclear intent — reader can't tell which fields are used

## Bad
```sql
SELECT * FROM deals WHERE id = $1;
```

## Good
```sql
SELECT id, deal_state, phase, offer_amount, created_at FROM deals WHERE id = $1;
```

## Batch Fix Applied
| File | Table | Fixed |
|------|-------|-------|
| `api/deals/get.ts` | deals | ✅ |
| `api/deals/get.ts` | deal_messages | ✅ |
| `api/deals/export-proof.ts` | deals, deal_messages, deal_payments, deal_escrow, deal_reviews | ✅ |
| `api/deals/complete-with-release.ts` | deal_escrow | ✅ |
| `api/deals/escrow.ts` | deal_escrow | ✅ |
| `api/notifications/get.ts` | notifications | ✅ |
| `api/creators/[[...path]].ts` | accounts (already clean) | ✅ |
| `api/event-os/[[...path]].ts` | tickets, check_ins, etc. | ❌ Still needs fix |

## Regex to Find
```bash
grep -rn "SELECT \*" src/pages/api/ --include="*.ts"
```
