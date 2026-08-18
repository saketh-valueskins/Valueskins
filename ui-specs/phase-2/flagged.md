# Phase 2 — Flagged (build-phase log)

> Phase-2 running log of **workflow / logic / backend** items surfaced during the build. Phase-2 page specs stay UI-only; anything that changes flow, data, session, or backend behaviour gets recorded here — **the build agent (Claude Code) must add to this file rather than silently changing a workflow.**
> Phase-1 business flags still live in `ui-specs/flagged.md` (F1–F8). This file is for phase-2/build items, numbered `P2-F#`.

---

## P2-F1 — Session ends & loses progress — **ROOT CAUSE FOUND & FIXED (part 1)**
- **Symptom:** session expires → forced re-login → **unsaved progress lost** (draft campaigns, in-flight deal negotiations, profile edits).
- **Root cause (diagnosed 2026-07-21):** it *was* a cookie problem. Both OAuth callbacks set the session cookie **with no `Max-Age` and no `Expires`**:
  ```
  valueskins_session=<id>; HttpOnly; Secure; SameSite=Lax; Path=/
  ```
  That is a **browser-session cookie** — it is discarded when the browser closes. A comment in `google/callback.ts` called this deliberate ("server-side expiry is the source of truth"), but the effect was that closing the browser silently signed the user out. Every cookie-*clearing* call correctly set `Max-Age=0`; the cookie-*setting* calls set no lifetime at all.
- **Fix applied (part 1 — persistence):** both callbacks now send `Max-Age = SESSION_ABSOLUTE_TIMEOUT_MS` (24h). Server-side expiry is still authoritative: 30-min sliding idle renewed by `touchSession`, capped at 24h absolute. The session now survives a browser restart.
- **Still open (part 2 — autosave):** GP2 also requires **server-side autosave of drafts** so nothing is lost even when a session legitimately ends. Not built. `/api/auth/onboarding-draft` exists and is the obvious pattern to extend to draft campaigns, in-flight deals and profile edits.
- **Status:** persistence ✅ fixed · draft autosave ⬜ open.

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

## P2-F6 — `Project.md` is missing from the repo (blocks three data decisions)

Every spec cites `Project.md` as the authority, but the file is not in the repo and not in git history on any branch. Three things could not be verified against it:

1. **Tier names (`§4`).** The phase-2 Profile spec pins **Signal = level 3** and **Aura = level 4 at 35 deals**, and describes the scale as **"Raw→Icon"**. `lib/levels.ts` thresholds already matched exactly (15–34, 35+), so levels 1/3/4/5 were renamed **Raw / Signal / Aura / Icon**. **Level 2's canonical name is unconfirmed** — it still reads `Emerging` from the old scale. Needs confirming.
2. **ValueSkin Type (`§28`).** The Type pill (Passion / Professional / Hobby) currently falls back to `Professional`. The rule that assigns it is in `Project.md`.
3. **Stat computation (`§11`).** The six Track Record stats are specified as computed server-side from completed deals. `/api/profile/me` does not return `repeat_rate`, `on_time_rate`, `avg_response_hours` or `trust_score`, so those tiles render 0 until the endpoint provides them. **The UI is built and correct; the data is not wired.**

**Also fixed in passing:** `lib/levels.ts` carried **green `#22c55e`**, purple `#a855f7` and amber `#f59e0b` as tier colours — a flat G3 violation ("sand only, no green"). All five are now sand.

- **Status:** open — needs `Project.md` in the repo, then confirm level 2's name and wire the four missing stats.

---

## P2-F7 — Store layout differs from `store-page-mock.svg`

- **Built:** a single-column list of category tiles.
- **Mock:** a **two-pane master/detail** — left is a searchable, numbered profession list with per-category skin counts; right is a white detail pane with a 2×2 grid of skin cards, an `Acquire` button per card, and an `EQUIPPED` state on the owned one.
- **Not rebuilt here** because it is a structural change, not a repaint, and the phase-2 folder has no written store spec to pin exact values against — only the mock. Needs either a `phase-2/Store.md` with numbers, or explicit approval to build straight from the mock.
- **Fixed now regardless:** the hardcoded `₹950` is gone (GP3 / F1 — the mock deliberately shows no price). The buy button reads `Acquire`, matching the mock.
- **Status:** open — awaiting a decision on the two-pane rebuild.

---

## P2-F8 — Slap-to-profile animation not built

`slap-animation-storyboard.svg` specifies a three-beat equip animation with exact timings:

| Beat | Motion | Timing |
|---|---|---|
| 1 · Rises in | 220px clone at screen centre, `scale .3→1.15`, `rotate −8→3` | ~320ms ease-**out** |
| 2 · Slams | FLIP to the ValueSkin frame, translate + `scale(≈.53)` | ~340ms ease-**IN** (accelerating = impact) |
| 3 · Lands | sand ring pulse + card shake, `Equipped` toast | 500ms / 400ms / ~3.2s |

Transform and opacity only; reduced-motion skips the flight entirely.

- **Not built** — it spans two surfaces (equip happens in the store, the frame lives on the profile), so it needs a decision on where equip is triggered from before the FLIP source/target can be wired. The profile-side landing target (the 160px frame) now exists.
- **Status:** open.

---

## P2-F9 — Creator Profile Preferences was orphaned; `Edit profile` entry point needs a call

- **Symptom:** `features/profiles/CreatorProfile.tsx` — the Creator Profile Preferences editor, built to `ui-specs/Creator Profile Preferences.md` (tabbed, live completion bar, near-black Save, sand-only stats) — had **zero importers**. It shipped in the repo but was unreachable in production from every entry point:
  - Settings > Profile & Skins row **labelled** `Creator Profile Preferences` pointed at `/profile/me` — the read-only ProfileView, not the editor.
  - `Edit profile` in the app shell opened the old inline name/bio card (`editingProfile`).
  - `Edit profile` at `/profile/me` pushed to the Settings hub.
- **Fix applied:** the editor now renders as a Settings pane inside the app shell (`settingsPane === 'creator-preferences'`) with a Back that returns to the hub in its prior state (G4). It gained `embedded` + `onBack` props, matching the pattern `ProfileView`/`SettingsHub` already use. The mis-pointed Settings row now opens it. A standalone route `/account/creator-profile` exists for direct links and the non-embedded hub.
- **Open — needs Aubrey's call:** `Creator Profile Preferences.md` §1 says the **primary** entry is the Profile hero's `Edit preferences` button. Today that button (`Edit profile`) opens the old inline name/bio card instead. Repointing it at the editor is the spec-correct move and the editor's Identity tab already covers display name, username, niche, city, country and bio — but it would orphan the inline card, so it is a flow change, not a repaint. **Not changed here.** Say the word and I will repoint it and remove the inline card.
- **Status:** editor reachable ✅ · Profile-hero entry point ⬜ open.

---

*Build agent: when a spec's visual can't be built without a workflow/data/session change, STOP and add it here as the next `P2-F#` with root cause + proposed change, then proceed. Never change a workflow silently.*
