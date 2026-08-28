# Personal Settings — UI Spec

> Template: **Settings** (light + dark).
> Inherits `_global-conventions.md` (no pill · Inter · sand accent · G4 orientation) and obeys `BRANDING.md`.
> Status: redesign spec. Sample: `_samples_delete_later/personal-settings-sample.html` (left nav rail, light/dark toggle).

---

## 0. What's changing (summary)

1. **Remove the oval pill** (G1); wordmark as plain text.
2. **Left-aligned two-column layout** — a sticky **section-nav rail** on the left, form content to its right (§1). Not a bare left-pinned column (that leaves a lopsided void); the rail fills the width on purpose and doubles as orientation.
3. **Green "Auto-saved" → sand** marker with a breathing dot (no green anywhere — §4).
4. **Yellow "Profile Incomplete" → a quiet sand notice** (no bright alarm color).
5. **Grey slab inputs → hairline fields** with sand focus rings; labels as small uppercase captions above.
6. **Brand Identity ties to the ValueSkin** — pixel avatar + skin tag + sand `Active` marker.
7. **Company Size pills → sand selected**, single-select per category.
8. **Privacy rows** become clean tappable list items with quiet sand-outlined icons; deletion uses the restrained danger treatment (not red, not grey-disabled).
9. **Footer merged onto one surface** with a hairline separator — the solid black divider band is removed (same fix as login).
10. **Inter everywhere** (G2); **light + dark** both supported.

---

## 1. Layout — left nav rail + content

- **Two columns** centered in a `max-width:1180px` shell: **rail `236px`** + **content `1fr`**, `~56px` gap. Left-aligned within the shell — content is anchored, not floating, and the right side isn't an empty void.
- **Rail (sticky, `top:96px`):** page title `Settings`, sub `ValueSkins preferences`, the sand `Auto-saved` marker, then a vertical **section nav** (`My Profile · Brand Settings · Brand Profile · Privacy & Data`) with a left hairline spine.
  - Active item: Near Black/Off White text, weight 600, **warm-sand left border** marking position. Inactive: Muted Grey.
  - **Scrollspy:** the active item updates as you scroll (IntersectionObserver); clicking scrolls smoothly to the section. This is the orientation win (G4) — always know which section you're in and jump between them.
- **Content:** the four sections stacked, each with `scroll-margin-top` so anchored jumps clear the sticky header.
- **Responsive < 900px:** rail collapses above the content as a horizontal row of pill-chips (still shows/sets active section); form grids collapse to single column.

Why not left-align the whole app: this rail pattern suits **utility, multi-section** pages (Settings). Marketing/auth pages (login) stay centered. Don't globally left-align.

---

## 2. Section: My Profile

- **Quiet incomplete notice** (replaces bright yellow): sand-tinted background `rgba(200,184,154,0.12)`, sand hairline, a sand dot, bold line `Profile incomplete` + muted helper `Complete these fields to access the marketplace.` Conveys urgency through placement, not alarm color.
- Fields: `Full name` (full width), then a 2-col grid — `Age range` (select), `Gender` (select), `Country`, `City`. Labels above, small uppercase Muted-Grey captions.
- Inputs: hairline sand border, field fill, `8px` radius, sand focus ring. No grey slabs, no blue focus.

> **Founder call to confirm:** `Age range` and `Gender` are collected here. For a serious B2B brand account this may be unnecessary PII — consider dropping or making optional for brand-type accounts. Flagged, not changed.

## 3. Section: Brand Settings

- **Brand Identity card:** the owned **ValueSkin pixel avatar** (~52px, framed) + `Brand Identity` label + the `App Developer` skin tag (sand outline) + a sand **`Active`** marker (breathing dot). Ties Settings to the profile/store identity language. The old plain red-bordered box is replaced by the standard hairline card.

## 4. Section: Brand Profile

- An **expandable card** (chevron rotates on open). Helper text, then **`Company Size`** as sand-select pills (`Startup … Government`), **single-select** (one per category, per the current copy "select one option from each category"). Additional categories (industry, tone, etc.) follow the same pill pattern when added.

## 5. Section: Privacy & Data Controls

- Two **tappable list rows**, hairline border, hover sand tint, `translateY`/scale feedback:
  - `Download My Data` — quiet sand-outlined download icon (thin SVG, not `DL` text-in-a-box).
  - `Request Data Deletion` — **restrained danger** treatment: charcoal-outlined icon, not red fill, not grey-disabled. The GDPR helper line stays.
- Icons replace the `DL`/`DEL` text tiles from the current build.

## 6. Footer & chrome

- Footer merged onto the **same surface**, hairline top rule, full brand columns (Legal · Data & Privacy · Support) — the solid black band is removed.
- Bottom tab bar kept, Inter, `Settings` active with sand indicator; primary nav always reachable (G4).
- Destructive `Delete Account` (top-right) keeps the quiet treatment (G3), not red.

## 7. Colour, theme, motion

- Both themes; page chrome flips, sand accents constant.
- Sand only for: auto-saved/active markers, notice, focus rings, selected pills, rail active border, row-icon strokes, hover tints. No blue/green/red resting states.
- Motion: transform/opacity only — smooth scroll, chevron rotate, pill/row tap feedback, breathing dots; `prefers-reduced-motion` disables animation + smooth scroll.

## 8. Do / Don't

**Do:** left rail + content (anchored) · sticky scrollspy nav · sand auto-saved/active/notice · hairline fields with sand focus · ValueSkin-tied brand identity · sand-select pills · quiet icon rows · merged single-surface footer · Inter · light+dark.

**Don't:** bare left-pin (lopsided void) · left-align the whole app · green/yellow/red states · grey slab inputs · `DL`/`DEL` text tiles · solid black divider band · bring back the pill.
