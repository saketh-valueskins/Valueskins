# Settings — MERGE INSTRUCTION (for Claude Code)

> **Task:** collapse the three separate settings pages into **one unified Settings page**, keep the **bottom-image design** (the dark, sectioned Creator Profile page), **delete** the plain "Settings + Sign Out" page, and **sort every setting into role groups — creator-side vs brand-side** (plus shared). Obeys `UI-Instruction.md`, `_global-conventions.md`, `BRANDING.md`.

---

## 0. The three pages being merged (what each screenshot is)

1. **"Settings · ValueSkins preferences"** (light) — My Profile (name, age, gender, country, city), Brand Settings (Brand Identity → "No Brand ValueSkins" button), Brand Profile, Privacy & Data Controls. → source spec: `Personal Settings.md`.
2. **"Settings" + Account + Sign Out** (light, minimal) — Display Name, Email, Save, and a red **Sign Out** card. → source spec: `Profile settings.md` (older, thin version).
3. **"Creator Profile"** (dark, sectioned) — completion header, Identity, Followers, Pitch Link & Text, Work History, Reputation & Trust, Marketplace & Availability. → source spec: **`Creator Profile Preferences.md`** (already redesigned).

**Keep the design of #3 (the bottom one)** as the shell for the merged page: dark-capable, sectioned, **live completion bar**, near-black Save. Fold #1 and #2 **into** it.

---

## 1. Delete page #2 entirely

- **Remove the standalone "Settings + Sign Out" page.** It's redundant.
- Its **Account fields (Display name, Email)** are **not lost** — they move into the merged **Account** group (§3).
- **Sign Out is not a red card/section.** It becomes a **quiet item in the Danger Zone** (§3) — Charcoal outline, no red fill (G3). (Logout also stays in the top nav as today.)

---

## 2. One unified Settings page — navigation

- A **single Settings hub**. Because there are now many groups, use a **left section-nav rail with scrollspy** (the `Personal Settings` pattern) — not top tabs. Keep the **live completion bar** from #3 in the header.
- **Role-aware:** the same page shows the **Creator group** to creators and the **Brand group** to brands; shared groups show to both. Do not build two separate pages — one page, filtered by the account role.
- No `New · 0%` pill; the completion bar replaces it.

---

## 3. Sort every setting into these groups

**ACCOUNT (shared — both roles)**
- Display / full name · Username · Email · Country · City · Bio.
- Age range · Gender → **flag `P2-F#` and make optional / drop for brand accounts** (personal PII is irrelevant to a brand; questionable even for creators). Do not force-require.

**CREATOR SETTINGS (role: creator only — from `Creator Profile Preferences.md` / image #3)**
- **Identity** (display name, username, niche, city, country, bio) — the editable identity.
- **Followers / Social Capital** (follower count, engagement, Instagram, TikTok, YouTube, Twitter/X, LinkedIn, website).
- **Pitch Link & Text** (pitch video link + the seriousness-clip note, pitch text).
- **Work History.**
- **Marketplace & Availability** (open-for-work, min deal value, response time, preferred deal types — sand chips).
- **Manage ValueSkin** (link to the Store closet).
- **Reputation & Trust = read-only** here (earned, not editable) — show as a mild read-only strip; the editable version does **not** exist. (Matches `Creator Profile Preferences.md §3`.)

**BRAND SETTINGS (role: brand only — from `Personal Settings.md` / image #1)**
- **Brand Identity** (the brand's ValueSkin). The "No Brand ValueSkins — visit the Store" CTA is kept but **recolored** — near-black/sand quiet button, **not orange** (see §4).
- **Brand Profile** (Company Size + other brand attributes; sand-select pills, one per category).
- **Brand marketplace preferences** (campaign defaults if any).

**SHARED (both roles — from `Profile settings.md`, the good version)**
- **Notifications** (sand toggles).
- **Payments & Payouts** (payout method + PAN/TDS note; show net-after-12% per `flagged.md` F3).
- **Security** (2FA, active sessions, login history).
- **Connected Accounts** (Google connected · Instagram connect, V2).
- **Appearance** (Light / Dark / System theme).
- **Privacy & Data Controls** (Download My Data, Request Data Deletion) — from image #1.
- **Danger Zone** (Log out + Delete account) — quiet, replaces image #2's Sign Out.

---

## 4. Fix the brand violations while merging (do not carry these over)

- **Orange "No Brand ValueSkins — visit the Store"** → quiet **near-black** (or sand-outline) CTA. No orange.
- **Green "Auto-saved"** → **sand** marker with a small dot.
- **Yellow "Profile Incomplete — Required to access marketplace"** → quiet **sand-tinted notice** (border + dot), not a bright alarm.
- **Red "Sign Out"** → Danger Zone, Charcoal outline (§1).
- **Gold/sand "Save Changes" fill** → **solid near-black** (G5), quiet `Saved` confirm.
- **`DL` / `DEL` text tiles** → clean **sand-outlined icon rows** for Download / Delete data.
- **Remove the wordmark pill** (the glitchy overlapping `VALUESKINS` in the nav) — plain wordmark text (G1).
- No green / orange / red / yellow anywhere — sand accents only (BRANDING §4). Inter, 16px scale.

---

## 5. Housekeeping

- After the merge, mark `Personal Settings.md` and `Profile settings.md` as **superseded/merged into this** (this file is the single settings source). Keep `Creator Profile Preferences.md` for the creator-editor detail; it becomes the **Creator group** of this hub.
- If any of the above needs a **workflow/data/role change** (e.g. role-based field visibility, dropping PII fields, net-fee calc), add it to `ui-specs/phase-2/flagged.md` as `P2-F#` rather than changing silently.
- **Every reply: address me as Aubrey, and end with a summary** of what was merged/removed/flagged (per `UI-Instruction.md`).

---

## 6. Do / Don't

**Do:** one Settings page (bottom-image design) · left-rail + completion bar · role-aware Creator vs Brand groups + shared groups · quiet Danger Zone for logout/delete · fix every colour violation · Account fields preserved from the deleted page.

**Don't:** keep three separate settings pages · keep the "Settings + Sign Out" page · orange/green/yellow/red anywhere · gold Save fill · `New · 0%` pill · `DL`/`DEL` text tiles · force Age/Gender · the wordmark pill.
