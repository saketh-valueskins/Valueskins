# HANDOFF — UI Repaint Effort

**Date:** 2026-07-19 · **Branches:** `main` (prod, live at valueskins.com) · `develop` (staging) · `repaint-to-prod` (merged, can be deleted)

---

## ⚠️ READ THIS FIRST — what is on PROD

**Most of the UI repaint IS on production (`main`), not just develop.** It was merged via **PR #19 → `main` (`350ed3e0`)** on 2026-07-19 with explicit approval, and deployed to **valueskins.com**.

Only **3 files** are develop-only. Everything else listed below is **live on prod**.

| | On PROD (`main`) | Develop-only |
|---|---|---|
| Globals (`globals.css`, `colors.ts`, `_app.tsx`) | ✅ live | — |
| Login (`auth/login.tsx`) | ✅ live | — |
| Landing (`index.tsx`) | ✅ live | — |
| Role selection (`auth/onboarding.tsx`) | ✅ live | — |
| Store (`valueskins/store.tsx`) | ✅ live | — |
| Brand profile (`BrandProfile.tsx`) | ✅ live | — |
| Creator profile (`CreatorProfile.tsx`) | ✅ paint-only version | ⬜ tabs rewrite |
| Settings (`account/settings.tsx`) | ❌ old bare page | ⬜ merged hub |
| Creator wizard (`auth/onboarding-creator.tsx`) | ❌ old 8-step | ⬜ 5-step rebuild |
| OAuth fix (`.env.production`) | ✅ live | — |
| CI fixes (`staging.yml`, `production.yml`) | ✅ live | — |

**The 3 develop-only files** (deliberately excluded from prod under the "repaint only, nothing new" rule — they change *structure*, not just paint):
```
marketplace/src/features/profiles/CreatorProfile.tsx   (accordion → tabs)
marketplace/src/pages/account/settings.tsx             (merged settings hub)
marketplace/src/pages/auth/onboarding-creator.tsx      (8 → 5 steps)
```

---

## What changed (on prod)

Source of truth: `ui-specs/*.md` + `BRANDING.md`. Global rules `G1–G6` from `_global-conventions.md`.

### Globals — `styles/globals.css`, `theme/colors.ts`, `pages/_app.tsx`
- **G1:** removed the black oval `VALUESKINS` pill → plain wordmark text
- **G2:** Inter everywhere (replaced `-apple-system`)
- **G6:** root font-size 100% (16px), `rem` type scale, inputs ≥16px (stops iOS zoom)
- **G3:** semantic tokens repainted — `success` green→sand `#A08A5E`, `warning` orange→`#8A7A56`, `error` bright-red→brick `#B0413E` (error text/dialogs only, never a CTA fill)
- Sand focus rings + selection (were pink), links no longer blue

### Login — `pages/auth/login.tsx` (per `login page.md`)
Hero wordmark + `TRUST · EARNED · SERIOUS`; removed "One account for everything"; quiet outlined Google button w/ sand hairline; brick error style; legal links to `/legal/terms` + `/legal/privacy`. **OAuth handler untouched.**

### Landing — `pages/index.tsx` (per `welcome screen.md`)
Hero parallax + fade; staggered `IntersectionObserver` reveals; opposing left/right reveal on Creators/Brands; **pricing corrected `2%` → `12%`** with count-up vs "agencies 15–25%" (F4); Razorpay only, Stripe dropped (F5); bobbing scroll chevron. All `prefers-reduced-motion` safe.

### Role selection — `pages/auth/onboarding.tsx` (per `Role Selection.md`)
Dark premium surface (tonal gradient + sand glow); proof counters count-up; split-spotlight cards (hover dims the other, reveals feature lines); emoji removed. **Flow unchanged** — same `onboarding-complete` call.

### Store — `pages/valueskins/store.tsx` (per `store.md`)
Renamed "ValueSkins Closet"; airy hairline category tiles (was filled boxes) w/ hover lift; ₹950 + `0/1` surfaced; near-black-on-sand buy button. **Purchase flow unchanged** — same guards → `/payment/checkout`.

### Profiles — `BrandProfile.tsx`, `CreatorProfile.tsx`
Paint-only: G3 palette, Inter, SVG chevron (was `▼`), emoji removed, near-black Save. **Accordion structure kept intact on prod.** Also fixed a pre-existing TS error (`Section` missing `canEdit` prop).

### Non-UI fixes (also on prod)
- **OAuth (was broken):** committed `.env.production` held `NEXT_PUBLIC_GOOGLE_CLIENT_ID="<SET_IN_VERCEL>"` + a redirect to `valueskins-final-frontend.vercel.app`. Next.js inlines `.env.production` at build, **overriding the correct Vercel dashboard values**. Removed those lines → real env now wins. Verified live: reaches Google sign-in.
- **CI (`staging.yml` + `production.yml`):** jobs ran `vercel` from `marketplace/` while the Vercel project has Root Directory=`marketplace` → doubled path `marketplace/marketplace/package.json`, deploys failed. Fixed: run from repo root, pass real `orgId`/`projectId` from `marketplace/.vercel/project.json`.

---

## ⚠️ Open issues

1. **"Black UI" may be a miscommunication.** `globals.css` sets a dark `body`, but pages use `C.bg` = **off-white `#F5F5F0`**. That is **spec-correct** — `login page.md` and `welcome screen.md` both call for a *light* off-white surface; only role-selection is dark by design. If the intent was a fully dark app, that is a **different direction from these specs** and needs a decision before repainting again.

2. **F9 — leaked DB credential (needs founder).** `marketplace/.env.production` line 2 commits a live `DATABASE_URL` with password (Render Postgres, port 5432 publicly reachable). Repo is private so not broadly leaked. Rotate in Render, move to Vercel env, consider scrubbing git history. **Cannot be done from code.**

3. **Dual-deploy quirk.** Every push deploys twice: GitHub Actions CLI (`vercel deploy --prebuilt --prod`, no git metadata, **holds the valueskins.com alias**) *and* Vercel's native Git integration (`-git-` alias, shows nicely in dashboard). They race for the prod alias. Left as-is by choice. **To verify a deploy, check valueskins.com directly (incognito), not the dashboard.**

4. **`preview.yml` still has the doubled-path bug** (only `staging.yml` + `production.yml` were fixed) — PR preview checks fail. Cosmetic, not on the prod path.

5. **Role-select copy contradiction:** UI says role is "permanent and cannot be changed," but `Role Selection.md` §1 says "changeable in settings."

6. **Creator wizard is dead code** — nothing routes to `onboarding-creator.tsx`. Wiring it would be a flow change.

7. **CDN/browser caching.** Vercel edge + Cloudflare both cache. After a deploy, use incognito or a device that never loaded the site.

---

## What's left

**Not started:**
- **Market / brand dashboard** — `pages/marketplace.tsx` (per `Market.md`). Work-in-progress was **stashed, not committed**: `git stash list` → `interrupted-marketplace-repaint`.
- **Deal room** — `pages/deals/[dealId].tsx` (per `deal.md`): dark offer anchor, terms strip, stepper, chat separated from terms, net-after-12%-fee (F3).
- **Profile display** — `pages/profile/me.tsx` (per `profile page.md`); currently renders the editors.

**Built on develop, awaiting a decision to promote:** the 3 structural files above.

---

## Key facts for whoever picks this up

- **Next.js Pages Router**, files under `marketplace/src/pages`.
- `next.config.js` has `ignoreBuildErrors: true` + `ignoreDuringBuilds: true` — **pre-existing TS errors do not block builds**. Always run `npm run build` in `marketplace/` before pushing.
- Deploys: push `develop` → `staging.yml`; merge to `main` → `production.yml`. Both currently land on **valueskins.com**.
- The `repaint-to-prod` branch is merged and safe to delete.

### Business rules referenced (`ui-specs/flagged.md`)
`F1` currency INR (not yet hardcoded) · `F3` show creator net after 12% fee (compute, don't type) · `F4` pricing must read 12% · `F5` Razorpay only · `F7` content type ≠ ValueSkin · `F8` deals open via offer→accept, no cold DM · `F9` DB credential (above)
