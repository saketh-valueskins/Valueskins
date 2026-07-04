# Handoff — Logo Integration, Uniform Branding, Session Timeout, Security Audit

**Date:** 2026-07-04
**Branch:** `main`
**Working dir:** `marketplace/` (Next.js 14 Pages Router)
**Last commit before this work:** `43f35ee6 Apply uniform ValueSkins brand identity across app`

This file lets you resume on another device. Everything below the "DONE" line is
committed and pushed. The "REMAINING" section is what's left.

---

## The original request (verbatim intent)

1. Integrate the `VALUESKINS` **wordmark logo** (per `LOGO_HANDOFF.md`) across the
   whole site — dark (primary) + light (reversed) treatments. Don't overdo it.
2. Add an **initial splash animation** (black/white screen → logo appears).
3. Make branding **universal and uniform**. The settings page currently "looks like
   a whole different website" — that must not happen. Uniform across the whole site.
4. Add a **standard login/session timeout** (what real websites use).
5. **Polish the whole site and find vulnerabilities.**
6. Push to git **first**, then run a **full security check over the whole repo**.
7. Give a summary at the end and hand off to Opus/Sonnet.

Source-of-truth for the logo: `LOGO_HANDOFF.md` + the two SVG files. The word
`VALUESKINS` IS the logo — no icon, no symbol. Palette is near-black `#0A0A0A` /
off-white `#F5F5F0` / warm sand `#C8B89A` / deep sand `#A08A5E` / charcoal `#2D2D2D`
/ muted grey `#B8B4AC`. **No blues, no startup greens.**

---

## ✅ DONE (committed + pushed)

### 1. Logo assets + component
- `marketplace/public/assets/valueskin-logo-dark.svg` — canonical dark SVG (from handoff §8)
- `marketplace/public/assets/valueskin-logo-light.svg` — canonical light SVG
- `marketplace/src/components/ValueSkinsLogo.tsx` — React wordmark component.
  Props: `theme` ('dark'|'light'), `size` (px, tagline scales 25%), `hideTagline`.
  Exact spec: weight 700, `0.18em` tracking; tagline weight 500, `0.34em`, sand dots.

### 2. Splash intro animation
- `marketplace/src/components/SplashIntro.tsx` — near-black `#0A0A0A` full-screen
  overlay, wordmark fades in (600ms) → holds (900ms) → overlay fades out (500ms).
  **Shows once per browser session** (`sessionStorage` key `vs_splash_shown`).
  Click-to-skip. Respects `prefers-reduced-motion`.
- Mounted in `marketplace/src/pages/_app.tsx` (top of tree, `z-index: 10000`).

### 3. Wordmark placed (restrained — not everywhere)
- `_app.tsx` — the fixed top-left pill now reads `VALUESKINS` with brand tracking/colors.
- `src/pages/index.tsx` — dashboard loading state uses `<ValueSkinsLogo>`; card
  accent colors + logout button rebranded.
- `src/pages/auth/login.tsx` — full wordmark lockup as the page header.
- `src/pages/auth/signup.tsx`, `forgot-password.tsx`, `reset-password.tsx` — wordmark header.
- `src/pages/demo/marketplace.tsx` — dark-treatment wordmark on the login gate; local
  palette (was slate/blue) rebranded.
- `src/components/Footer.tsx` — `VALUESKINS` + tagline lockup.

### 4. Uniform branding (this is the big one — settings no longer looks like a different app)
Global palette swap applied via `sed` across `marketplace/src/**` (`.ts`/`.tsx`) + `globals.css`:

| Old (slate/blue "dashboard" theme) | New (ValueSkins brand) |
|---|---|
| `#0f172a` | `#0A0A0A` |
| `#1e293b` | `#1A1A1A` |
| `#334155` | `#2D2D2D` |
| `#94a3b8` | `#B8B4AC` |
| `#cbd5e1` | `#D6D2C8` |
| `#f8fafc` | `#F5F5F0` |
| `#e2e8f0` | `#E0E0DA` |
| `#38bdf8` (blue accent) | `#C8B89A` (warm sand) |
| `#2563EB` / `#2563eb` (blue primary) | `#0A0A0A` |
| `#1e40af` | `#2D2D2D` |
| `#3B82F6` / `#3b82f6` | `#A08A5E` |
| `rgb(56,189,248)` | `rgb(200,184,154)` |
| `rgb(148,163,184)` | `rgb(184,180,172)` |
| `rgb(15,23,42)` | `rgb(10,10,10)` |
| `rgb(59,130,246)` | `rgb(160,138,94)` |
| `rgb(37,99,235)` | `rgb(10,10,10)` |
| `#fff7fb` (old mauve bg) | `#F5F5F0` |
| `#675b64` (old mauve primary) | `#0A0A0A` |
| `#f8e7f2` | `#F0F0EA` |
| `#f183ff` (globals.css nav/tag accent) | `#C8B89A` |

- `src/theme/colors.ts` — the shared `COLORS`/`C` design tokens (imported by 29 pages)
  rewritten to the brand palette. **Token names unchanged**, so every consumer re-skins
  uniformly. This is what fixes the "settings looks like a different site" problem —
  `SettingsView` was already migrated to brand colors in the prior commit; now the rest
  of the app matches it instead of the reverse.
- `src/components/CookieConsent.tsx` — had its own hardcoded slate palette; swapped to
  the dark brand treatment.
- `src/styles/globals.css` — `.btn-primary`, `.nav-item-active`, `.tag-primary` rebranded.
- Residual verification: `grep -r "0f172a|38bdf8|2563EB|3b82f6|675b64|fff7fb|f183ff" src/` → **0 hits.**

### 5. Session / login timeout (standard 30-min idle, sliding, 24h absolute cap)
- `src/config/constants.ts`:
  - `SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000` (was 15m, inconsistent)
  - Added `SESSION_ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000`
- `src/lib/session.ts` — added `touchSession()` that slides `expires_at` forward on
  each authenticated request, `LEAST(now+idle, created_at+absolute)`. `getSessionUserId()`
  now calls it (best-effort).
- `src/pages/api/auth/check.ts` — cleaned up (removed noisy console.logs), calls
  `touchSession()` on valid sessions.
- All 5 session-creation sites moved from **7-day** to **30-min idle**, and cookies
  changed to **browser-session cookies** (no `Max-Age`) so server-side `expires_at`
  is the single source of truth:
  - `src/pages/api/auth/login.ts`
  - `src/pages/api/auth/signup.ts`
  - `src/pages/api/auth/[[...path]].ts` (dev-login path)
  - `src/pages/api/oauth/google/callback.ts` (removed `COOKIE_MAX_AGE=7d`)
  - `src/pages/api/oauth/github/callback.ts` (removed `COOKIE_MAX_AGE=7d`)
- `src/lib/migrations.ts` — `auth_sessions.expires_at` default `INTERVAL '7 days'` → `'30 minutes'`.
- Verified: `grep "7 * 24 * 60 * 60" src/pages/api/{auth,oauth}` (excluding Max-Age=0) → none.

### Type-check status
`npx tsc --noEmit` — **all remaining errors are pre-existing and unrelated** (Sentry
module not installed, `@testing-library/react` version mismatch, Razorpay global typing,
email template typing, `DealState.escrowPool`). Filtering tsc output to every file I
touched returns **zero errors**. My changes did not introduce new type errors.

---

## ⛔ REMAINING (not started — pick up here)

### A. Verify the app actually renders (do this first on resume)
Dev server was running on `:3000` during the session. On a fresh device:
```
cd marketplace && npm install && npm run dev
```
Then eyeball:
- `/` (dashboard), `/auth/login`, `/demo/marketplace`, and the **settings** view
  (settings inside the demo marketplace page, per project memory — NOT a `/settings` route).
- Confirm splash plays once, wordmark shows, palette is uniform (no leftover blue/slate).
- **Known open item from before this task:** user reported a "Server error when saving
  changes in the settings tab." Root cause was NOT diagnosed. `SettingsView.saveMyProfile()`
  is pure localStorage (no API call), so the 500 is likely elsewhere (an API the demo
  page calls, or an SSR error on `/demo/marketplace`). Reproduce and trace server logs.

### B. Full security audit over the repo (was step 6/7 of the request)
Not started. Suggested approach:
- Run the `/security-review` skill on the branch diff, and/or a repo-wide pass.
- `npm audit --production` (CLAUDE.md mandates zero high/critical).
- Grep for the classic issues the CLAUDE.md security spec calls out: raw SQL string
  interpolation (`${` inside queries), secrets in code, missing CSRF on state-changing
  routes, IDOR on `/api/**/[id]` endpoints, `dangerouslySetInnerHTML` without sanitize.
- The session cookie change (browser-session, server-authoritative expiry) is a security
  improvement — note it in the audit.

### C. Summary + Opus/Sonnet handoff
Write the final summary once A + B are done.

---

## Notes / project conventions (from memory — don't relearn these)
- **Pages Router**, not App Router. No `src/app/`. Pages live in `src/pages/`.
- The live demo is `/demo/marketplace`. There is **no** `/demo/instagram` route.
- "Settings" means the settings **view inside the demo marketplace page**, not a route.
- Batch related changes into one push (avoid multiple Vercel deploys).
- Deploys to Vercel automatically on push to `main`.
- Path has spaces (`Startups. /Short term/Valueskins.`) — quote it in every shell command.

## Files created this session
- `marketplace/public/assets/valueskin-logo-dark.svg`
- `marketplace/public/assets/valueskin-logo-light.svg`
- `marketplace/src/components/ValueSkinsLogo.tsx`
- `marketplace/src/components/SplashIntro.tsx`
- `HANDOFF_BRANDING_SECURITY.md` (this file)
