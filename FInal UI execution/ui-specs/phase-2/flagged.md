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
- **Cause:** the old pill component/markup was never removed when the plain wordmark replaced it (dead code — G1 retired the pill).
- **Fix:** delete the old pill component/CSS everywhere; keep only the plain wordmark text (G1). Verify no page still imports/renders it. Ties to `migration-and-cleanup.md`.
- **Status:** open — remove on the cleanup pass.

---

*Build agent: when a spec's visual can't be built without a workflow/data/session change, STOP and add it here as the next `P2-F#` with root cause + proposed change, then proceed. Never change a workflow silently.*
