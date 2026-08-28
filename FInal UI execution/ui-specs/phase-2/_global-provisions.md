# UI-Spec Phase 2 — Global Provisions

> Build-phase rules that apply to **every** phase-2 page. These sit **on top of** phase-1 `ui-specs/_global-conventions.md` (G1–G6 still bind) and `BRANDING.md`. Where a phase-2 page spec gives exact values, those win. Business/logic items go to `ui-specs/phase-2/flagged.md`.

---

## GP0 — Phase-1 conventions still bind
Everything from `_global-conventions.md` remains in force: no wordmark pill (G1), Inter everywhere (G2), orientation/state on deep screens (G4), light-mode tokens (G5), the 16px/rem type scale (G6), sand-only accents, no green, no emoji, quiet destructive actions. Phase 2 only **adds** to this.

---

## GP1 — Entry & auth flow (welcome → OAuth → role)

Reuse what we already built — do not reinvent:
- **Welcome / front door:** the **Creator vs Brand** two-component split **with the animation** (from `role-selection-sample.html`). This is the entry moment.
- **Login:** the `login-page-sample.html` treatment (Continue with Google → OAuth).

**Flow (canonical):**
1. **Welcome screen** presents the product + the two role components (animated).
2. **Clicking a component (or Get Started / Sign In)** opens **login → OAuth (Google)**.
3. **After OAuth completes** — whether it's a **new account** or an **existing sign-in** — the user is **logged in first**, then **asked to continue as Creator or Brand.**
4. **Role may be chosen in two places** — either on the welcome screen *or* deferred to the **post-OAuth prompt**. The **post-OAuth role prompt is the source of truth** for the account's role. If a role was picked at welcome, pre-select it in the post-OAuth prompt; the user still confirms.

Net: role selection is **flexible** (welcome or after login), but the account role is **committed after OAuth**, not before.

---

## GP2 — Session persistence (investigate + flag)

**Observed problem:** the session ends and forces re-login, and doing so **loses unsaved progress** — draft campaigns, in-flight deal negotiations, profile edits. Repeated re-logins that wipe progress are a serious UX failure for a platform where deals are in motion.

**Build-agent instructions:**
1. **Diagnose the cause.** Check whether this is a **cookie/session-token issue** — e.g. a short-lived access token with no refresh token, a session cookie not persisted, wrong `SameSite`/`Secure`/expiry, or in-memory-only session that dies on reload. Confirm the actual mechanism before fixing.
2. **If it's a big issue, FLAG it** in `ui-specs/phase-2/flagged.md` (new `P2-F#`) with the root cause and proposed fix.
3. **Two-part fix direction (once confirmed):**
   - **Persistent session:** a durable, refreshable session (httpOnly, `Secure`, `SameSite=Lax`, sensible expiry + silent refresh) so users aren't kicked out mid-work.
   - **Autosave drafts server-side** so that even if a session *does* end, no draft campaign / deal / profile edit is lost (ties to phase-1 G4 autosave). Progress must survive a re-login.
4. Do not paper over it in the UI — fix the persistence, then the UI reflects a restored session/draft.

---

## GP3 — Currency stays unset (carry-over)
Per `flagged.md` F1, do **not** hardcode a currency symbol in any phase-2 build yet. Keep amounts currency-agnostic until the final hardcode pass.

---

*Add new phase-2 provisions here as `GP#`. Page-level exact specs live in each `phase-2/<Page>.md`.*
