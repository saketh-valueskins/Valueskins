# UI-Spec Phase 2 — Welcome Screen (one change only)

> **Everything about the welcome screen stays the same. There is exactly ONE change — the entry/click flow.** This file exists solely to document that one change so nobody re-touches the rest.
> Visual + motion reference (unchanged, build to these exactly): `_samples_delete_later/role-selection-sample.html` (+ light: `role-selection-light-sample.html`), specced in `ui-specs/Role Selection.md`.
> Inherits `phase-2/_global-provisions.md` (esp. **GP1**), `_global-conventions.md`, `BRANDING.md`.

---

## 0. What does NOT change (leave it alone)

Same parameters as phase 2 — i.e. build the existing screen **exactly**, no visual edits:

- The **two components** (`I'm a Creator` / `I'm a Brand`) and their **split-spotlight hover animation**.
- The dark premium hero, wordmark + `TRUST · EARNED · SERIOUS`, the headline and sub.
- **Proof counters** (count-up), the **activity ticker**, the **drifting ValueSkin identities**.
- All colours, spacing, radii, type sizes, motion timings/easing, both light/dark themes, reduced-motion fallback.
- The footnote `You can change your role anytime in settings.`

**No layout, colour, copy, or motion changes.** If you find yourself editing any of the above, stop — that's out of scope.

---

## 1. THE one change — entry/click routes through OAuth, role commits after

**Before:** clicking a role component (or Get Started / Sign In) went straight into that role's experience.

**Now (phase 2):** the components/CTAs are **entry points into auth, not direct role routers.** Exact behaviour:

1. **Click `I'm a Creator` / `I'm a Brand`** (or `Get Started` / `Sign In`) → open **login → Google OAuth** (the `login-page-sample.html` treatment).
2. **After OAuth completes** (new account *or* returning sign-in):
   - **New user / no role set yet:** show the **post-OAuth "Continue as Creator / Brand" confirm.** If they clicked a specific component on the welcome screen, that role is **pre-selected** in the confirm — they just confirm. The **account role is committed here** (this prompt is the source of truth, per GP1).
   - **Returning user who already has a role:** skip the prompt, go straight into their app.
3. Role can therefore be chosen **at the welcome screen OR after OAuth** — but it is only **committed after OAuth.** A pre-selection from the welcome screen is a convenience, not the commit.

That is the entire change: **the click now leads to OAuth first; the role is finalized post-OAuth (pre-filled from the click).** Nothing else moves.

---

## 2. States (so it's unambiguous to build)

| Trigger | Result |
|---------|--------|
| Click `I'm a Creator` | → login/OAuth → (new) post-OAuth confirm with **Creator pre-selected** → commit → creator app · (returning w/ role) → creator app |
| Click `I'm a Brand` | → login/OAuth → (new) post-OAuth confirm with **Brand pre-selected** → commit → brand app · (returning w/ role) → brand app |
| Click `Get Started` / `Sign In` (no role picked) | → login/OAuth → (new) post-OAuth confirm, **no pre-selection** → user picks → commit · (returning) → their app |

- The **post-OAuth role confirm** reuses the same two-component treatment (may be a lighter/compact version) — it is the commit step, not a second marketing screen.
- Do not commit a role before OAuth; a pre-selection is stored transiently and applied after login.

---

## 3. Build note

- This is the **only** delta from the existing welcome screen. Everything else is a pixel-for-pixel rebuild of the reference sample.
- If this one change requires any backend/session/workflow work (e.g. carrying the pre-selected role through OAuth, or the returning-user role check), that's a **workflow item** — add it to `ui-specs/phase-2/flagged.md` (`P2-F#`) rather than changing anything silently (per `UI-Instruction.md`).

---

*If the single change you meant is different from the entry/OAuth-routing change above, say so and I'll swap it — but per GP1 this is the one.*
