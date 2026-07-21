# UI-Instruction — for Claude Code (ValueSkins build)

> Read this before doing any UI work in this repo. It governs **how** you build and **how** you talk to me.

---

## 0. How to talk to me

- **Address me by name — "Aubrey" — in your replies.** Start or clearly include my name in each response. If a reply doesn't use my name, I'll treat it as a signal you may be off-track or hallucinating.
- **Always end with a short SUMMARY** — a few bullet points of exactly what you changed (files touched, what was added/removed), plus anything you flagged. No fluff.
- Be terse and concrete. No hype, no exclamation marks in UI copy (brand voice).

---

## 1. Build the UI exactly as specified

- The **`ui-specs/phase-2/<Page>.md`** files are **build-ready and exact.** Replicate them **pixel- and token-for-token** — spacing, colours, radii, font sizes/weights, breakpoints, scroll behaviour, motion timings. **Do not improvise or "improve" the design.** When any doubt exists, the numbers in the phase-2 spec win.
- Each phase-2 page ships with a **mock image** (e.g. `profile-page-mock.svg`) — use it as the visual reference alongside the spec.
- Obey, in this order of precedence: the specific **`phase-2/<Page>.md`** → **`phase-2/_global-provisions.md`** → **`_global-conventions.md` (G1–G6)** → **`BRANDING.md`**.
- Non-negotiables (from the brand): no wordmark pill, Inter only, sand-only accents, **no green, no emoji, no bright/red CTAs**, subtle radii, dark-default with a working light/dark toggle, transform/opacity-only motion with `prefers-reduced-motion` fallback.
- **Currency:** do NOT hardcode a currency symbol yet (`flagged.md` F1). Keep amounts currency-agnostic until told.

---

## 2. If a build needs a WORKFLOW change — flag it, don't do it silently

- If you cannot build a spec's visual without changing a **workflow, data model, flow, session, or backend behaviour**, **STOP.** Do **not** silently change it.
- Add an entry to **`ui-specs/phase-2/flagged.md`** as the next `P2-F#`: the root cause, what change is needed, and your proposed approach. Then continue with what you *can* safely build.
- Phase-1 business flags live in `ui-specs/flagged.md` (F1–F8) — respect those decisions (escrow-not-advance, 12% net-to-creator at user level, content-type ≠ ValueSkin, request/accept deals, Razorpay-only, etc.).

---

## 3. Understand before you build

- Before touching a screen, read: the relevant `phase-2/<Page>.md`, the phase-2 provisions, `_global-conventions.md`, `BRANDING.md`, and the product context in `Project.md`. Build what's intended, not just what's literally typed.
- Keep the whole system coherent: one wordmark logo, the ValueSkin pixel identity across profile/store/settings, the bottom-tab app spine, request/accept deal flow.

---

## 4. Housekeeping

- No `console.log`, no commented-out code, no unused imports in what you ship.
- Respect the type scale (16px root, rem, ~1.25 scale — G6). Inputs never below 16px.
- If you touch dead code or migrations, follow **`ui-specs/phase-2/migration-and-cleanup.md`** (highest model, maximum effort).

---

**Every reply:** greet me as Aubrey · build to the phase-2 spec exactly · flag workflow changes to `phase-2/flagged.md` · end with a short summary.
