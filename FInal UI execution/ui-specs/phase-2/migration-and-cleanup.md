# Phase 2 — Migration, Bug-Check & Dead-Code Removal

> **Run this with the highest-capability model and maximum reasoning effort.** This is a careful, destructive-if-wrong task — treat it as high-stakes. Do not rush.

---

## 0. Mindset

Before deleting a single line: **understand what we're building.** Read `Project.md`, `BRANDING.md`, `ui-specs/_global-conventions.md`, `ui-specs/phase-2/_global-provisions.md`, and every `ui-specs/phase-2/<Page>.md`. Then verify that **what is built matches what is intended** — design, flow, and data. Cleanup without understanding is how you delete something load-bearing.

**Golden rule:** if removing something *might* break the build or a flow, do not remove it — flag it instead (`ui-specs/phase-2/flagged.md`).

---

## 1. Scope — what to hunt

- **Dead code:** unreachable branches, unused functions/components/hooks, orphaned files, unused imports/exports, dead CSS, commented-out blocks, `console.log`/debug statements, feature flags never read.
- **Superseded screens** (from the redesign — confirm against specs before deleting): the old "Welcome back" home page, old Create-Campaign modal (replaced by the composer), old accordion "Creator Profile" (replaced by Creator Profile Preferences), the old wordmark pill, any green/emoji/gold-fill remnants.
- **Duplicate/parallel implementations:** two components doing the same job — keep the one the specs describe, remove the other.
- **Unused assets:** images, icons, fonts not referenced anywhere.
- **Stale routes/endpoints** no longer reachable.

---

## 2. Sync check — built vs intended

For each major screen (Welcome/Role, Login, Profile, Store, Market/Dashboard, Deal Room, Settings, Onboarding):
1. Does the built UI match its `phase-2/<Page>.md` (or phase-1 spec) — tokens, layout, motion?
2. Does the **flow** match (`_global-provisions.md` GP1 auth flow; request/accept deals; escrow-not-advance; 12% net-to-creator; content-type ≠ ValueSkin)?
3. If built ≠ intended, decide: is it a **bug to fix**, a **spec to update**, or a **workflow change to flag**? Record which.

---

## 3. Method (safe, incremental)

1. **Map first.** Produce a list of suspected dead code / out-of-sync areas *before* changing anything. Show me the list.
2. **Delete in small, reversible commits** — one concern per commit, with a clear message.
3. **After each change: build + run + smoke-test** the affected screens. If anything breaks, revert that change and flag it.
4. **Never** delete across a boundary you don't understand (auth, payments/escrow, session, data models) without flagging first.
5. Keep a **removed-items log** (what, why, where) in the PR/summary so nothing vanishes silently.

---

## 4. Bug pass

While in the code: catch obvious bugs — broken links/routes, unhandled errors, missing loading/empty/error states (phase-1 requirement), inputs < 16px (iOS zoom), missing `prefers-reduced-motion`, horizontal-scroll leaks, theme-token mismatches, and the **session/progress-loss issue** (`P2-F1` — diagnose cookie/token, see `GP2`).

---

## 5. Deliverable

- The map of dead/out-of-sync code (before), and the removed-items log (after).
- A clean build with all specced screens still working and matching their specs.
- Any flow/data/session issues added to `ui-specs/phase-2/flagged.md`.
- End with a **summary** (address me as Aubrey) of what was removed, what was fixed, and what was flagged.

---

**Do not trade correctness for tidiness. A slightly larger codebase that works beats a lean one that's broken.**
