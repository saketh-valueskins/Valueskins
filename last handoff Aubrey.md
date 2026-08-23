# Last Handoff — Aubrey

Handoff notes for the next model picking up this repo. Read top to bottom before touching anything.

---

## 1. How to work with Aubrey

**Address him by name.** Start responses with "Aubrey" before giving output. He asked for this explicitly.

**Never assume — ask, but always bring a recommendation.** Do not guess at intent and run ahead. When there is a real fork, ask, and say which option you'd pick and why. Do not ask about things you can verify yourself by reading the code — go check, then report.

**Verify before claiming.** This session produced one significant wrong call: production was reported "healthy" based on HTTP 200 plus `/api/health` returning `status: ok`. Both were true and both were irrelevant — the app was crashing **client-side** behind a React error boundary. Server-side signals cannot see that class of failure. When you claim something works, name the evidence that would fail if it didn't.

**Beware false negatives in your own shell checks.** A `for` loop piping `curl` into `grep -q` reported "prod is clean" when prod was in fact broken. A direct fetch of the same file found the bug immediately. If a negative result is load-bearing, re-check it a second way.

**Always run the build before committing a dependency change.** Installing one package pruned an undeclared dependency and broke the build (see §4). `npx jest` and `npx tsc` both stayed green while `npm run build` failed — no single check covers everything.

**Don't delete on his behalf without mapping the graph first.** Dead code he recently edited, or scaffolding for features he may still want, gets flagged — not removed. When deletion is approved, prove it's unreferenced by import path *and* by basename, and check for side-effect imports (`import 'x'` with no `from`), before touching anything.

**Ship flow.** `develop` is staging, `main` is production. Push `develop` → `gh pr create --base main --head develop` → `gh pr merge`. Note: `gh pr merge --admin` is blocked by the permission classifier; plain `gh pr merge` works.

---

## 2. Repo orientation

- Next.js app lives in **`marketplace/`**, not repo root. `next@14.2.29`, React 18.2.0.
- Vercel project `valueskins-marketplace` serves valueskins.com. **Root Directory = `marketplace`** is set in the Vercel dashboard and drives the build. Do **not** add a repo-root `vercel.json` that fights it.
- A second project `valueskins-frontend` builds from repo root, fails, and serves no domain. Ignore its failures.
- `marketplace/vercel.json` is the real build config.
- Backend is a separate Rust service reached via `NEXT_PUBLIC_BACKEND_URL`. Supabase was removed (commit `24a1eb99`) and replaced with a local no-op stub in `src/lib/supabase.ts`.
- Repo is cluttered: `marketplace 2/`, `node_modules.bak/`, `nexus/`, `frontend/`, ~60 root markdown files. Most is stale.

**Critical build fact:** `marketplace/next.config.js` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`. **The build does not gate on type errors.** A green build proves nothing about type safety. Run `npx tsc --noEmit` separately.

---

## 3. What was done this session

### 3a. Five always-false authorization checks (real, user-facing)

`getAccountId()` returns a **string** (`auth_sessions.user_id` is `BIGINT`, which the `pg` driver returns as a string). Several call sites compared it against `Number(...)`, so `42 === "42"` was always false.

Fixed by normalizing both sides with `String(a) === String(b)` — the idiom already used in `src/lib/escrow/escrow-engine.ts`.

| File | Effect of the bug |
|---|---|
| `src/pages/api/bids/index.ts` (3 sites) | Bid accept / reject / withdraw **always returned 401** — feature entirely dead. Brands never saw their own campaign bids. |
| `src/pages/api/deals/exclusivity.ts` | Brand-only POST **always returned 403** |
| `src/pages/api/deals/[[...path]].ts` | "cannot review yourself" guard **never fired** |
| `src/pages/api/event-os/[[...path]].ts` | "hosts can't buy own tickets" guard **never fired** |

Two were broken features; two were security guards silently not enforcing.

### 3b. Production crash — Supabase stub not chainable (the big one)

`/demo/marketplace`, `/preview`, `/valueskins/store`, `/account/settings` were **crashing on live production**:

```
undefined is not an object (evaluating
'U().channel("shared-state-realtime").on("postgres_changes",...).subscribe')
```

Cause: the Supabase removal left a no-op stub that copied supabase-js's method *names* but not its **chainable shape**. `channel()` returned an object whose `.on()` returned `undefined`, so `.subscribe()` on that `undefined` threw. `subscribeSharedState()` has no try/catch, so it took down the whole React tree.

Fixed at the stub layer so all call sites degrade together:
- `channel()` returns a chainable channel; `on()`/`subscribe()` return the channel
- `from()` returns a chainable, **thenable** query builder resolving `{ data, error }` (the stub previously had no `from()` at all)
- the backward-compat `supabase` Proxy now delegates to `getSupabase()` instead of returning a bare async fn per property, which broke `supabase.from(t).insert(rows)`
- `subscribe()` deliberately never fires its status callback, so realtime honestly reports "not connected" rather than faking `SUBSCRIBED`

Verified in the shipped bundle: broken prod was `on:()=>{}` / `subscribe:()=>{}`; fixed is `on:()=>e` / `subscribe:()=>e`.

### 3c. Other real fixes

- `src/pages/api/deals/generate-pdf.ts` — `uploadDealPDF()` takes 3 args, was called with 2. Every deal PDF uploaded to a path ending in `undefined`, overwriting the previous one. Now passes a timestamped filename so `getDealPDFVersions()` returns genuine versions.
- `src/lib/validation/schemas.ts` — `FundEscrowSchema` was missing `brand_id`, which `FundEscrowCommand` requires. Also widened `validateRequest` generic to `<S extends z.ZodTypeAny> → z.infer<S>`.
- `src/pages/api/health.ts` — `as const` made the `checks` object's literal types unassignable.
- `src/pages/payments/history.tsx` — `C.warning` didn't exist, so `withAlpha(undefined, …)` emitted invalid CSS and status pills rendered unstyled. Added `warning: '#f59e0b'`.
- `src/lib/pdf-generator.ts` — removed a dead `@react-pdf/renderer` import (not installed; the file actually uses `pdfkit`).

### 3d. Test suite made trustworthy

Was **3 of 4 suites failing**, so the suite carried no signal. `__tests__/realtime.test.ts` and `__tests__/scalability.test.ts` imported `vitest`, which is **not a dependency** — they failed at import and had never once run. `src/__tests__/AuthContext.test.tsx` had a real race: it `waitFor`-ed on `account-id === 'null'`, already true at initial render, then asserted `loading === 'false'` outside the wait. Reordered to wait on the settled state.

Now **16/16 passing**.

### 3e. Dead CQRS subsystem deleted (see §4 for why it became urgent)

Removed 39 files, net **−4,642 lines**: the 11 `/api/v1/*` routes, `src/lib/{commands,queries,projections,events,realtime}`, `src/hooks/useRealtimeEvents.ts`, `src/lib/supabase-storage.ts`, and the two `vitest` test files that covered only this subsystem.

All provably unreferenced — verified by import path, by basename, and for side-effect imports. `src/pages/api/realtime/{state,stream}.ts` were checked and **kept**; they don't depend on the cluster.

### 3f. Commits

| Commit | Contents |
|---|---|
| `debb1668` | ownership checks, health, theme.warning, escrow schema, PDF filename, test suite |
| `cb01c747` | Supabase stub chainable — the production crash fix |
| `eadb054f` | merge of PR #52 into `main` |
| `e8a2bb6f` | dead CQRS removal, phantom dep fix, Sentry dep added (on `develop`) |

`debb1668`, `cb01c747`, `eadb054f` are on `main` and confirmed live. **`e8a2bb6f` is on `develop` and has not been merged to `main` yet.**

**Type errors went 97 → 37 across the session.**

---

## 4. The phantom dependency (important lesson)

`@supabase/supabase-js` was **never declared** in `marketplace/package.json`. It existed only as an entry in the committed `package-lock.json`, so Vercel's `npm ci` installed it and the build passed.

Running `npm install @sentry/nextjs` regenerated the lockfile, npm correctly pruned the undeclared package, and **the build broke** — `Module not found: Can't resolve '@supabase/supabase-js'`. This was going to detonate on the next dependency change of any kind; Sentry was just the trigger.

Six files imported it as a runtime value, and all six were dead, which is why deleting them (rather than re-adding a Supabase client to satisfy dead code) was the right resolution. Two **type-only** imports in live code (`shared-state.ts`, `supabase-realtime.ts`) now point at a local `RealtimeChannel` interface declared beside the stub in `src/lib/supabase.ts`.

Worth checking whether other undeclared packages are hiding in the lockfile the same way.

---

## 5. IN PROGRESS — Sentry wiring (installed but NOT wired)

**Only step 1 of 7 is done**, and it is committed in `e8a2bb6f`.

**Why it matters:** the production crash in §3b sat live and undetected until Aubrey happened to open the page. There is **no error tracking in production**. `sentry.client.config.ts` and `sentry.server.config.ts` exist and call `Sentry.init(...)`, but `next.config.js` never wraps `withSentryConfig` — they are inert files creating a false impression of monitoring.

**Done:** `@sentry/nextjs` pinned at **`10.70.0`**. `8.55.2` was tried first (it matches the existing config filenames and the `browserTracingIntegration()` API already written in them) but pulls **23 advisories including 2 high**. `10.70.0` still supports Next 14 (`peerDependencies.next` includes `^14.0`), needs Node ≥18 (we run 22), and adds **zero** advisories. It is currently inert — nothing imports it.

**Remaining:**
1. Wrap the export in `marketplace/next.config.js` with `withSentryConfig`.
2. Decide config layout. v10 prefers `instrumentation.ts` (server/edge `register()`) and `instrumentation-client.ts` over `sentry.{client,server}.config.ts`. v10's `webpack.js` still references the old names — **this was being verified when the session ended and is unresolved.** The existing configs use `browserTracingIntegration()` / `replayIntegration()`, which are client-entry exports; they read as `undefined` if you require the package from Node, which is expected, not a bug.
3. Reconcile the DSN env var. Configs read `process.env.SENTRY_DSN`; `src/lib/config.ts:89` reads `NEXT_PUBLIC_SENTRY_DSN`. The client bundle needs the `NEXT_PUBLIC_` prefix. Both configs gate on `enabled: !!process.env.SENTRY_DSN` — keep that, so they stay inert until a DSN is set.
4. Report from the boundary that actually catches these: **`src/components/ErrorBoundary.tsx`** rendered Aubrey's screenshot (`#fee` background, `#c00` monospace, single "Try again"), **not** `ProductionErrorBoundary.tsx`. It already calls `logger.error(...)` from `@/lib/logger`.
5. `src/lib/logger.ts` is the **live** logger (used by `ErrorBoundary`, `useSupabaseRoom`, `shared-state.ts`). Note `src/lib/logging/logger.ts` — which holds the `// TODO: Send to Sentry` marker — was only used by the now-deleted CQRS layer, so **that TODO is misleading; wire `src/lib/logger.ts`.**
6. Add try/catch to `subscribeSharedState()` in `src/lib/shared-state.ts`. The stub fix removed this specific crash, but any future throw in that chain blanks the page again. `loadSharedState()` already models the pattern (try/catch → `EMPTY_SHARED_STATE`).
7. Add a smoke check that executes the page and fails on an uncaught console error — every server-side signal was green during the outage. Put it in `marketplace/tests/`, which is excluded from jest's `testMatch` and from `tsconfig.json`.

Approved plan: `/Users/sakethvelamuri/.claude/plans/flickering-spinning-lampson.md` (its §5 "dead CQRS" item is now done).

---

## 6. Known outstanding issues

- **`tsconfig.json` has `"strict": false`.** Root cause of most of the remaining 37 type errors, and why Zod infers every schema field as optional (a documented Zod requirement). Flipping it is a multi-week refactor — do not do it casually.
- **`src/components/ValueSkinsSection.tsx`** is imported nowhere and imports a non-existent `useValueSkinsCredentials`. Left in place because Aubrey had just edited it — confirm before removing.
- **9 pre-existing dependency advisories**, none from this session's work: `tar` (critical); `bcrypt`, `next`, `nanoid`, `postcss`, `brace-expansion`, `@mapbox/node-pre-gyp` (high); `dompurify` (moderate); `@babel/core` (low).
- **`pdfkit: "^0.19.1"`** is a floating version, violating CLAUDE.md Part 7.
- **`e8a2bb6f` is not yet on `main`.**

---

## 7. Verification commands

```bash
cd marketplace
npm run build      # exit 0 — required; does NOT gate on types
npx jest           # expect 16/16 passing
npx tsc --noEmit | grep -c "error TS"   # expect 37
npm ci --dry-run   # exit 0 — catches lockfile drift
```

Checking whether a fix is genuinely live on production (HTTP 200 is not sufficient):

```bash
# find the chunk, then read it directly — don't rely on a grep -q loop
curl -s https://valueskins.com/demo/marketplace | grep -oE '/_next/static/chunks/7918-[a-z0-9]+\.js'
curl -s "https://valueskins.com/_next/static/chunks/7918-<hash>.js" -o /tmp/c.js
grep -oE 'on:\(\)=>[a-zA-Z_$]+' /tmp/c.js    # want on:()=>e ; on:()=>{} means broken
```

---

## 8. Summary

Two genuinely broken things were found and fixed on production. The bid accept/reject/withdraw flow had been returning 401 to every caller — a completely dead feature — because a string session ID was compared against a number; the same mistake silently disabled two security guards elsewhere. Separately, four pages were crashing client-side for real users because the Supabase removal left a stub that imitated the API's method names but not its chainable shape. Both are fixed, merged to `main`, and confirmed live in the deployed bundle.

The test suite was restored to meaning something — it had been failing 3 of 4 suites, two of which imported a test runner that was never installed and had therefore never executed once. It now passes 16/16.

Installing Sentry then exposed a landmine unrelated to Sentry: `@supabase/supabase-js` was never a declared dependency and survived only inside the lockfile, so the first `npm install` to regenerate that file broke the build. Every file importing it turned out to be part of an event-sourcing subsystem with no callers, so the subsystem was deleted — 39 files, net −4,642 lines. Type errors fell from 97 to 37 across the session.

The open thread is error tracking. The production crash was found only because Aubrey opened the page; every server-side signal stayed green the entire time, because the failure was client-side. `@sentry/nextjs@10.70.0` is installed and pinned but **nothing is wired**, and the immediate question to resolve is the v10 config layout — whether to keep `sentry.{client,server}.config.ts` or migrate to `instrumentation.ts` / `instrumentation-client.ts`. Also note `e8a2bb6f` is still sitting on `develop` and has not shipped to production.
