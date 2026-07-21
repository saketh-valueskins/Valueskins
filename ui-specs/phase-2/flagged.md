# Phase 2 — Flagged (build-phase log)

> Phase-2 running log of **workflow / logic / backend** items surfaced during the build. Phase-2 page specs stay UI-only; anything that changes flow, data, session, or backend behaviour gets recorded here — **the build agent (Claude Code) must add to this file rather than silently changing a workflow.**
> Phase-1 business flags still live in `ui-specs/flagged.md` (F1–F8). This file is for phase-2/build items, numbered `P2-F#`.

---

## P2-F1 — Session ends & loses progress (investigate; likely cookie/token)
- **Symptom:** session expires → forced re-login → **unsaved progress lost** (draft campaigns, in-flight deal negotiations, profile edits).
- **To confirm:** is it a **cookie/session-token** problem? (short-lived access token, no refresh token, session not persisted, wrong `SameSite`/`Secure`/expiry, or in-memory session dying on reload.)
- **If confirmed as a big issue:** log the root cause + fix here and implement per `GP2`:
  - persistent, refreshable session (httpOnly · Secure · SameSite=Lax · expiry + silent refresh), and
  - **server-side autosave of drafts** so no work is lost even across a re-login.
- **Status:** open — diagnose first, then fix + update this entry.

---

## P2-F2 — Old wordmark pill still renders (overlap bug)

- **Symptom:** the retired black **oval `VALUESKINS` pill** is still in the build, rendering **under/overlapping** the new plain wordmark in the nav (visible as a glitchy doubled/overlapping `VALUESKINS`).
- **Actual cause (diagnosed 2026-07-21):** the pill was *not* the culprit — `ValueSkinsLogo.tsx` is already plain text with no oval, background or border, so G1 was satisfied. The real cause is **duplication**: `_app.tsx` renders a `position:fixed` `VALUESKINS` at top-left (`z-index:9999`) on every route, suppressed only on `/auth/login` and `/auth/signup`. Five routes draw their own wordmark and so rendered two stacked on top of each other — `/`, `/auth/onboarding`, `/auth/forgot-password`, `/auth/reset-password`, `/demo/marketplace`.
- **Fix applied:** replaced the two ad-hoc route checks in `_app.tsx` with a single `ROUTES_WITH_OWN_WORDMARK` list + early return.
- **Status:** ✅ **closed** — fixed on `develop` in the cleanup pass.

---

## P2-F3 — Global wordmark uses `mixBlendMode: difference` (visual glitch)

- **Symptom:** the fixed `_app.tsx` wordmark inverts against whatever scrolls beneath it, so its colour flickers/changes during scroll.
- **Cause:** `mixBlendMode:'difference'` + `color:'currentColor'` on a `position:fixed` element. It was presumably a shortcut to stay legible on both light and dark pages.
- **Why not fixed here:** replacing it needs a per-route decision on the wordmark colour (pages mix the off-white `C.bg` surface with dark surfaces), and getting it wrong makes the wordmark invisible rather than glitchy. Needs a visual call.
- **Proposed:** drop `mixBlendMode` and drive the colour from the page theme token (`--head`), same as the sticky header in `Profile page.md` §1.
- **Status:** open — needs Aubrey's call on the light/dark treatment.

---

## P2-F4 — `getAuth` never existed; two deal-PDF endpoints were dead

- **Symptom:** `/api/deals/download-pdf` and `/api/deals/generate-pdf` threw on every call.
- **Cause:** both imported `getAuth` from `@/lib/auth`, which has never exported it. `next.config.js` sets `ignoreBuildErrors:true` **and** `ignoreDuringBuilds:true`, so the broken import never failed a build. It only surfaced when the cleanup pass invalidated Next's module cache.
- **Fix applied:** both now use `getSessionUserId(req.headers.cookie)` — the same helper the sibling `download-docs.ts` already used. Ownership checks unchanged (`creator_id` / `brand_id` only).
- **Broader risk:** those two `ignore*` flags mean **any** import error can ship silently. Recommend turning them off, or adding `tsc --noEmit` to CI as a blocking step.
- **Status:** ✅ endpoints fixed — the `ignoreBuildErrors` policy question is **open**.

---

## P2-F5 — Dead code removed in the cleanup pass (log)

Removed on `develop`; each is recoverable from the commit's parent.

| What | Size | Why it was safe |
|---|---|---|
| `node_modules.bak/` (untracked) | 50,739 files · 442 MB | stale backup, referenced nowhere; was 97.4% of all tracked files |
| Event OS — `features/events/**`, `features/events-management/**` | ~12,000 lines | unreachable; `/events`, `/events/[id]`, `/upcoming-events`, `/promoter-earnings` are "COMING SOON" stubs importing none of it. No spec covers events. `data/types.ts` kept (used by `lib/db-mapping.ts` + `api/payments`) |
| Prisma auth cluster (`prisma`, `accountLockout`, `emailVerification`, `passwordReset`, `rateLimit`) | 514 lines | unreachable **and** non-functional — `@prisma/client` is a dep but there is no `prisma/` schema, so the client could never initialise. Live data layer is `lib/db.ts` (81 importers) |
| 7 re-export shims / `export {}` tombstones | — | zero importers; their targets are imported directly (2–7 sites each) |
| 12 superseded lib duplicates | — | zero importers, live sibling in place |

**Still orphaned but deliberately NOT removed** (needs a decision, per the golden rule — do not delete across a boundary you don't understand):

- **`lib/security/**` — 21 files, ~4,100 lines.** Unreachable, but it is the security boundary. Includes both real controls (`csrf`, `sanitize`, `schemas`, `session`, `data-retention`) and self-test harnesses (`attack-simulator`, `breach-prevention-tests`, `data-leak-tests`, `encryption-tests`). Wire up or delete — but as one deliberate decision, not a sweep.
- **`src/config/{cities,professions,demo-data,index}.ts`.** Orphaned, but this is the config system deliberately built to replace hardcoded values; deleting it discards planned work.
- **`@prisma/client` in `package.json`.** Now that its consumers are gone the dep is unused, but dropping it forces a lockfile regen — and lockfile drift has broken this Vercel project before. Do it in an isolated commit.
- **~95 further orphaned components/libs** (`DealCard`, `TopNav`, `Navigation`, `GlobalSearch`, `ShareableProfileCard`, `creatorMatching`, `community`, …). Many are pre-redesign screens; each needs checking against its spec before removal.

- **Status:** open — the four groups above await a decision.

---

*Build agent: when a spec's visual can't be built without a workflow/data/session change, STOP and add it here as the next `P2-F#` with root cause + proposed change, then proceed. Never change a workflow silently.*
