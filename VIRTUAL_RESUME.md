# Virtual Resume — Feature Spec

> **One-line rule:** *Wherever there is a profile — it can be hovered.*
>
> Whenever a brand or creator seams another profile (in any location of the app), a brief card appears with everything the other party should know: basic info, profile picture, creator CPV (cost per view), and as much Instagram/Meta Graph API data as possible.

---

## 1. Product Rule

- ANY brand or creator profile anywhere in the app can trigger a hover card (Virtual Resume).
- The card shows a short, high-signal summary — not the full profile.
- Both directions: brand hovering a creator, creator hovering a brand.
- Hover = fast peek. Full profile stays a click away.

## 2. What the Virtual Resume Shows

Required contents, highest priority first:

1. **Basic info**
   - Name / username / handle
   - Profile picture (avatar)
   - Role (Brand | Creator)
   - Country / location
   - Profession / niche / ValueSkin

2. **Creator CPV (cost per view)**
   - Number shown prominently at top: `$X.XX CPV`
   - Derived from rate card + typical reach: `CPV = rate ÷ expected views`
   - Rates shown below in a row: Reel · Story · Post · Podcast · Live

3. **Trust & track record**
   - Deals completed
   - Avg deal value ($)
   - On-time rate (%)
   - Brand rating / repeat rate
   - Trust score

4. **Instagram / Meta Graph API data (as much as the API allows)**
   - Verified badge + published/Business Instagram status
   - Instagram handle (`@username`), name, biography, website
   - Profile picture URL (from IG)
   - Follower count (synced), following count, posts count
   - **CPV engine input:** estimated views per format (Reel/Story/Post) from IG analytics (reels_avg_watch_time, reach, impressions)
   - Engagement rate derived from IG (interactions ÷ reach)
   - 3 most recent posts (thumbnail image, like/comment/play)
   - Data freshness timestamp (e.g. "Synced 2h ago")

## 3. Interaction Model

- Hover anywhere on a creator's or brand's name/avatar/card → card pops near cursor within ~350ms.
- Mouse leaves → card hides after ~200ms (flicker guard).
- The card is non-interactive (peek only); clicking opens the full profile.
- Not shown over your own profile.

## 4. Where "profiles" live (coverage map)

Every location a brand/creator name or avatar renders must fire the hover:

- [x] Own profile avatar (top bar)
- [x] Deal room — brand name in header
- [x] Deal room — campaign cards (offer/brand row)
- [x] Deal room — per-phase deal rows (brand name)
- [x] Ask-brand modal (brand + campaign names)
- [x] Brand dashboard — applicant/creator pipeline rows
- [x] Brand dashboard — past deals (creator names)
- [x] Brand dashboard — browse creators (brand rows)
- [ ] Explore — creator search cards (currently click-to-open modal only)
- [ ] Explore — trending campaigns (brand names on cards, no hover)
- [ ] Portfolio / Gallery / About sections
- [ ] Notifications list (from/mention names)
- [ ] Messages/Chat (chat disabled in v1 — pending)
- [ ] Global search result rows

## 5. Data Sources

| Data | Live today | Source |
|---|---|---|
| Basic info | Partial | `HoverCard` + `HoverProfile` (profile state) |
| Profile picture | No (letter fallback) | `profileAvatar` state / avatarUrl — not passed to hover |
| CPV | **No — new** | Derived: `rateCard` ÷ IG recent-reach estimates |
| Rate card | Yes | `rateCard` state {reel, story, post, podcast, live} |
| Deals / avg value / on-time / rating | Yes | `metrics` state + deal count (computed in `buildBrandHover`/`buildCreatorHover`) |
| Instagram handle/bio/website | Sync service exists | `social-media-sync.ts` (Meta Graph API) — not surfaced in hover |
| Follower count | Yes (manual/metrics) | `metrics.followers` / IG sync service |
| IG posts, engagement, verified | **No — new** | Meta Graph API endpoints (see §6) |

## 6. Meta Graph API — what we can pull (with Business/Professional IG account)

Service scaffolding already exists: `marketplace/src/lib/social-media-sync.ts` calls
`https://graph.instagram.com/v18.0/{ig_user_id}?fields=ig_id,username,name,biography,website,profile_picture_url,followers_count`
(batch sync, rate-limit handling, exponential backoff). It currently only syncs **follower counts**.

To fill the Virtual Resume, extend the fields fetched per account:

- `username`, `name`, `biography`, `website`, `profile_picture_url` → brand/basic info
- `followers_count`, `follows_count`, `media_count` → IG numbers
- `ig_is_verified` (Business account) → verified badge
- Recent media (`media?fields=id,media_type,caption,thumbnail_url,permalink,like_count,comments_count,timestamp&limit=3`) → post thumbnails + engagement
- Insight-based CPV inputs (Professional account): `reels_avg_watch_time`, `reach`, `impressions`, `profile_views` per recent reel/post → estimated reach → `CPV = rate ÷ reach`

Constraints to honor in the spec:
- Requires a **Business or Creator-professional Instagram account** per creator (Personal IG accounts have no API access).
- Requires a Meta app token per creator (OAuth; long-lived exchange). App must be in **Live / Advanced Access** for insights fields — app review needed.
- Server-side calls only; never expose `access_token` to the client.
- Sync is a background job (cron/event) not per-hover — hover reads cached values. Include `synced_at` freshness.

## 7. Implementation Status (as of today)

| Item | Status | Notes |
|---|---|---|
| Hover card component (`HoverCard`) | ✅ Built | `ProfileHoverCard.tsx`, 320px card, avatar/name/role/skin/location/email/about/metrics/rate card/availability |
| Hover events + timing | ✅ Built | `showHoverCard`/`updateHoverPosition`/`hideHoverCard` in `MarketplaceDemoPage.tsx` (~line 1873) — 350ms in / 200ms out, fixed card near cursor |
| Brand-to-creator & creator-to-brand builders | ✅ Built | `buildBrandHover` (~1889), `buildCreatorHover` (~1942) |
| Coverage: deal room, ask modal, brand dashboard, own avatar | ✅ Wired | 14+ `onMouseEnter` sites (~2696→6237) |
| Coverage: Explore, portfolio, notifications, search | ❌ Missing | See §4 coverage map |
| Profile **picture** in hover | ⚠️ Partial | `HoverProfile.avatarUrl` is optional; builders pass `undefined` → letter/initial fallback shown |
| Creator **CPV** (cost per view) | ❌ Missing | No `cpv` anywhere; not derived, not displayed |
| IG handle / bio / website / verified badge | ⚠️ Partial | Sync service fetches them but nothing renders them; no verified field |
| IG follower count sync (automated) | ⚠️ Partial | `social-media-sync.ts` exists + cron docs; not running (no token/DB wiring in marketplace app) |
| IG posts / engagement / reach → CPV inputs | ❌ Missing | Endpoints not called; app-review/advanced-access not set up |
| `InstagramProfilePreview` component | ⚠️ Orphaned | `CreatorProfilePreview.tsx` exists but is unused — candidate for the resume visual |

## 8. Definition of Done

- [ ] Virtual Resume shows on **every** profile surface in §4 (no dead spots).
- [ ] Header shows profile picture (real avatar, not letter).
- [ ] Creator cards show **CPV** computed from rate card ÷ IG recent-reach (or a manual reach override when IG not connected).
- [ ] Instagram block renders handle, name, bio, website, verified badge, posts, followers, engagement, `synced_at`.
- [ ] Sync job updates IG data on a schedule (not on every hover); hover always reads cache.
- [ ] `access_token` never leaves the server.
- [ ] Graceful degradation: no IG connection → card still useful (basic info + rate card + CPV fallback).

---

*Status map last updated with the "What did we do so far?" audit.*