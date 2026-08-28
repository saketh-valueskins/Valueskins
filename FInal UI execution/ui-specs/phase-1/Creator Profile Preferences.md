# Creator Profile Preferences — UI Spec

> Template: **Creator profile editor** (overhaul of the accordion "Creator Profile"). Light + dark (G5).
> Inherits `_global-conventions.md` (no pill · Inter · sand accent · G4/G5) and obeys `BRANDING.md`.
> Status: redesign spec. Merged demo: `_samples_delete_later/app-merged-sample.html` (bottom-tab app + this editor + reputation on profile).

---

## 0. What's changing

The old "Creator Profile" was a long stack of accordions (Identity, Social Capital, Pitch, Reputation & Trust, Marketplace) with a gold Save button and a `New · 0% / Completion 33%` header. Overhaul:

1. **Rename → Creator Profile Preferences.**
2. **Tabbed, not accordion** — top segmented tabs (Identity · Social Capital · Pitch · Marketplace) with an animated indicator.
3. **Live completion progress bar** in the header (updates as fields fill).
4. **Reputation & Trust removed from the editor** — it's *earned*, not edited. It lives, **mildly**, on the Profile page as a read-only strip (§3).
5. **Gold Save → solid near-black** (G5 — sand is never a big fill). Save shows a quiet `Saved` confirmation.
6. **Kill the "Welcome back" home page.** Its two destinations map onto the app: *Marketplace* → the **Market** bottom tab; *Preferences* → opens from the **Profile** page's `Edit preferences` button (and a Settings quick-link). No separate landing.
7. **Navigation = the bottom tab bar** (Profile · Market · Store · Settings) as the app spine; Preferences is a full sub-view over Profile with a **Back** (G4).

## 1. Where it lives (placement)

- **Primary entry:** the **Profile page** hero has an `Edit preferences` button → opens Preferences as a sliding full-screen sub-view.
- **Secondary entry:** a `Creator Profile Preferences` quick-link in Settings.
- **Back** returns to the Profile page in its prior state (G4). The bottom tabs remain the app's spine; switching a tab also exits Preferences.

## 2. The editor

- **Sticky header:** `Creator Profile Preferences` + `Back to profile`, and a **live completion bar** (`Profile completion — N%`, sand fill) that recomputes as fields get values. This replaces the confusing `New · 0% / 33%` chips.
- **Top segmented tabs** with a sliding sand-tinted indicator: **Identity · Social Capital · Pitch · Marketplace**. Tab content cross-fades.
- **Fields per tab** (from the current build):
  - *Identity:* Display name · Username · Niche · City · Country · Bio.
  - *Social Capital:* Follower count · Engagement rate · Instagram · TikTok · YouTube · Twitter/X · LinkedIn · Website.
  - *Pitch:* Pitch video link (with the seriousness-clip note) · Pitch text.
  - *Marketplace:* `Open for work` toggle · Minimum deal value · Response time · Preferred deal types (Paid/Barter/Equity/Ambassador chips, sand-selected).
- Each tab has its own **near-black Save** with a `Saved` micro-confirmation. Hairline fields, sand focus rings.

## 3. Reputation — mild, read-only, on the Profile page

- **Not in the editor.** Trust score, Completion, Repeat clients, Avg rating are *earned from completed deals* — they belong on the **Profile**, shown as a **quiet read-only strip** below the ValueSkin hero, with a line: *"Earned automatically from completed deals — not editable."*
- Fix the off-brand stat colours (orange/green) → **Trust score in deep sand, the rest neutral**. No green/orange/red.

## 4. Navigation model (the merge)

- **Bottom tab bar** is the app spine: `Profile · Market · Store · Settings`, active tab in Near Black/Off White with a small **sand dot** indicator, tactile press scale. Always reachable (G4).
- The **home page is removed**; the app opens to Profile.
- `Market` = the marketplace (brands/campaigns). `Store` = the closet. `Settings` = the settings hub. `Profile` = identity + mild reputation + entry to Preferences.

## 5. Motion / theme

Sub-view slides up on open; tab indicator slides; content cross-fades; progress bar animates; Save confirms. Bottom-tab press scale + sand dot. Transform/opacity only; `prefers-reduced-motion` aware. Light + dark (G5).

## 6. Alternative considered

Top segmented tabs (chosen) vs a **left-rail** like `Personal Settings`. Left-rail suits many-section utility pages; the editor has only 4 focused groups, so top tabs read cleaner and keep the completion bar prominent. Easy to swap to left-rail if preferred.

## 7. Do / Don't

**Do:** rename to Preferences · top tabs + live completion bar · near-black Save with confirm · reputation read-only on Profile (sand/neutral) · bottom-tab app spine · open Preferences from Profile.

**Don't:** keep the accordion stack · put reputation in the editor · gold/sand Save fill · `New · 0%` chips · keep the Welcome-back home page · orange/green stats · the pill.
