# Things Commented Out — v1 scope decisions

This file lists every feature disabled for v1. Nothing below was deleted — every block is
`{false && ( ... )}` / `//` / `/* ... */` wrapped and tagged with
`[v1 COMMENTED OUT]` so it can be restored later by flipping the wrapper back on.

Summary of the three v1 decisions:

1. **No chatbox** — Deal Room Chat, DMs, and Communities are hidden.
2. **No niches / "3 types of ValueSkins"** — v1 is lifestyle & fashion only, with
   niche-agnostic creators. The store/niche selector and all niche targeting are disabled.
3. **No negotiation** — a brand creates a campaign with everything specified; that amount
   is **final**. Creators accept or decline; they cannot counter-offer or submit their own
   formal offer.

---

## 1. Chatbox removed

| File | Line | What |
|------|------|------|
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | 4168 | **Deal Room Chat box** (creator side). The chat column (messages feed + input) is hidden via `{false && ( … )}`; the sidebar (Campaign Brief / Checklist / Payment Plan / Reject) is kept and now renders full-width. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | 5293 | **Brand Negotiation View** modal — this contained the brand-side chat. Entire modal disabled. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | 6202 | **Messages View** (`MessagesView` — DMs + Communities). Render disabled. |

Not deleted (still referenced by logic/audit trail): `src/components/DealRoomChat.tsx`,
`src/features/marketplace/demo/views/MessagesView.tsx`, `src/pages/messages.tsx`.

## 2. Niche feature + "3 types of ValueSkins" removed (v1 = lifestyle & fashion only)

| File | Line | What |
|------|------|------|
| `marketplace/src/features/marketplace/demo/components/AppHeader.tsx` | 48 | `IconStore` component commented out (was only used by the Niche tab). |
| `marketplace/src/features/marketplace/demo/components/AppHeader.tsx` | 78 | **"Niche" tab** removed from the app header. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | 6870 | **Store / Niche / "3-types-of-ValueSkins" view** — the whole store view (niche grids, category cards, per-niche purchase flow, "Launch a Campaign" button) disabled. Unreachable via URL too — the render is `{false && (() => { … })()}`. |
| `marketplace/src/features/campaigns/CampaignComposer.tsx` | 496 | **"Target profession / niche"** field in campaign briefs disabled (campaigns now target all creators). |
| `marketplace/src/features/marketplace/demo/views/SettingsView.tsx` | 488 | **Content Niche** selector in creator profile settings disabled. |
| `marketplace/src/features/marketplace/demo/views/SettingsView.tsx` | 672 | **"Only accept proposals from these brand niches"** filter in creator safety settings disabled. |

Not deleted (data taxonomies behind the feature): `PROFESSIONS` / `CREATOR_PROFESSIONS`
in `MarketplaceDemoPage.tsx`, `src/config/professions.ts`, `src/lib/professions.ts`,
`BRAND_CATEGORY_BADGES` / `PROFESSION_BADGES` in `core/identity/AvatarOptions.tsx`,
and `docs/three-types-of-valueskins-system.md`. Keep these for a post-v1 relaunch.

## 3. No negotiation — brand amount is final

| File | Line | What |
|------|------|------|
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | 3634 | **"Counter Offer Sent"** status block (waiting-on-brand state) disabled. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | 3643 | **"Counter-Offer Accepted"** confirm/decline block disabled. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | 4378 | **"Your Counter"** input ("Send Counter" button + brand-offer display) disabled. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | 4445 | **"Submit Formal Offer"** (creator finalize) disabled. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | 5293 | **Brand Negotiation View** modal (Accept & Pay / Close flow) disabled. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | 5984 | **"View Profile & Invite"** — previously opened the negotiation modal; now replaced with a "Creator invitations arrive in a later release" toast. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | 6075 | **"View Negotiation"** button in the brand applicant list disabled. |

### Behavioral changes (with the feature, but not hidden behind `false &&`)

| File | Line | Change |
|------|------|--------|
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | ~3591 | Creator's **"Accept & Negotiate" → "Accept Deal — ₹X (fixed)"**. Clicking it locks the deal immediately (`phase: 'accepted'`), records an audit message, and shows "Deal accepted — terms locked". No counter entry point. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | ~3500 | Deal-room header subtitle: **"Negotiate freely — price, terms, everything" → "Fixed deal — final amount set by the brand"**. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | ~3510 | Deal-room stepper: **"Negotiating" step removed** (`STEPS` is now Brief → Offer → Accepted → Completed). |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | ~3279 | Creator pipeline column: **"Negotiation" → "Active"** and no longer buckets `chatroom`/`counter`/`brand_countered` deals. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | ~6029 | Brand applicant list status: **"Negotiating" → "Awaiting your decision"**. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | ~6057 | Brand applicant `actionable` set shrunk to `formal_offer` / `pending` only. "Accept & Pay" + "Reject" remain for the brand. |

---

## 4. New campaign-brief fields (added — not commented out)

The brand campaign composer (`CampaignComposer.tsx`) gained two optional inputs that are
stored on the campaign and surfaced to creators before they apply. These are live features,
not disabled ones — documented here only for completeness alongside the v1 changes.

| File | Line | What |
|------|------|------|
| `marketplace/src/features/campaigns/CampaignComposer.tsx` | ~601 | **Script box → "Send a script draft"** — brand can attach a script draft file (name stored in `draft.scriptFileName`) and/or paste the script text. "Non-negotiable (locked)" auto-shows a required locked-script textarea. |
| `marketplace/src/features/campaigns/CampaignComposer.tsx` | ~715 | **"Other information" box** — three optional fields: **Shoot location** (`draft.shootLocation`), **What you expect from the creator** (`draft.expectations`), **Anything else** (`draft.otherNotes`). |
| `CampaignComposer.tsx` | 54–57 | New `CampaignDraft` fields: `scriptFileName`, `shootLocation`, `expectations`, `otherNotes`. |
| `marketplace/src/features/valueskins/core/deals/useDealSync.ts` | 184–189 | `Campaign` type gains optional `scriptFileName`, `shootLocation`, `expectations`, `otherNotes`. |
| `marketplace/src/features/marketplace/demo/MarketplaceDemoPage.tsx` | ~5236 | `onLaunch` passes the new draft fields into the created `Campaign`. |
| `MarketplaceDemoPage.tsx` | ~2416 | `campaignOpportunities` mapping (and `Opportunity` type) pass through `scriptMode/scriptText/scriptFileName/shootLocation/expectations/otherNotes`. |
| `MarketplaceDemoPage.tsx` | ~2699 | **Details modal**: "Script" block (with lock/collab hint, file name, full text) and "Other information" block. |
| `MarketplaceDemoPage.tsx` | ~3442 | Creator campaign cards: compact "Shoot / Expectations / Script" strip. |
| `MarketplaceDemoPage.tsx` | ~4296 | Deal-room **Campaign Brief** sidebar: Shoot location, expectations/notes, script line. |
| `marketplace/src/features/marketplace/demo/views/ExploreView.tsx` | ~156 | Explore trending cards: same `Campaign` interface + brief strip. |

## Restore guide

- **Chatbox**: remove `{false && (` before the chat column div (MarketplaceDemoPage.tsx ~4170)
  and its closing `)}` (before the sidebar comment, ~4255); set the sidebar wrapper `width`
  back to `160px`; re-enable the Messages View render (~6202) and the brand negotiation modal
  (~5293) if wanted.
- **Store / Niche**: flip `{false && (` back to `{activeView === 'store' && (` at ~6870;
  re-add the `IconStore` function + the store tab line in `AppHeader.tsx`; re-enable the
  CampaignComposer profession row (~496) and the SettingsView niche pickers (~488, ~672).
- **Negotiation**: flip the commented conditions back (`false &&` → original) at ~3634, ~3643,
  ~4378, ~4445, ~5293; restore the "View Negotiation" button (~6075) and the "View Profile &
  Invite" handler (~5984); revert the Accept button (~3591) and the label/stepper/pipeline
  changes.

Each disabled block carries the `[v1 COMMENTED OUT]` marker in code for quick grepping:
`grep -rn "v1 COMMENTED OUT" marketplace/src`.