# UI-Spec Phase 2 — Profile Page (build-ready)

> **Phase 2 = zero-ambiguity build spec.** Every value is exact. The only thing left is to build it. Nothing here is "designer's discretion." When in doubt, the numbers below win.
> Visual reference: `profile-page-mock.svg` (this folder). Live behaviour: `_samples_delete_later/profile-identity-sample.html`.
> Inherits `_global-conventions.md` (G1–G6) and `BRANDING.md`. Currency is intentionally omitted (see `flagged.md` F1).

---

## 0. Page canvas, scroll & sizing

- **Layout:** single vertical column. **Vertical scroll only. No horizontal scroll — ever** (`overflow-x:hidden` on `body`).
- **Root font:** `html { font-size:100%; }` = 16px. All sizes below are px for clarity; convert to `rem` at build (÷16). `body { font-size:1rem; }`.
- **Page min height:** `min-height:100dvh` (never `100vh`).
- **Content column:** `max-width:900px; margin:0 auto;` — the wrap. Everything (hero, level, stats) lives inside this 900px column, centered.
- **Wrap padding:** `34px 28px 80px` (top / sides / bottom).
- **Background (full-bleed, fixed):** `background-attachment:fixed;`
  - Dark: `linear-gradient(150deg,#0A0A0A 0%,#141310 60%,#1C1B17 100%)`
  - Light: `linear-gradient(150deg,#F4F3EE 0%,#EEE9DE 60%,#E6E0D2 100%)`
- **Default theme:** dark. Ships with a theme toggle (G5). All element colors are given per theme in §8.
- **Breakpoints:** desktop ≥ 761px (spec below). `≤760px` and `≤460px` overrides in §7.
- **Font family (everything):** `'Inter','Helvetica Neue',Arial,sans-serif`. Weights used: 400, 500, 600, 700.
- **Global easing:** `--ease: cubic-bezier(0.16,1,0.3,1)`. Any transition/animation uses this unless stated.

---

## 1. Header (sticky)

| Property | Value |
|----------|-------|
| Position | `sticky; top:0; z-index:20` |
| Height | 56px (from padding) |
| Padding | `16px 40px` |
| Layout | `flex`, `space-between`, `align-items:center` |
| Background | dark `rgba(10,10,10,0.7)` / light `rgba(245,245,240,0.85)` + `backdrop-filter:blur(12px)` |
| Bottom border | `1px solid` hair → dark `rgba(245,245,240,0.08)` / light `rgba(45,45,45,0.10)` |

- **Left — wordmark:** text `VALUESKINS`, `font-weight:700; font-size:20px; letter-spacing:0.18em;` color `--head`.
- **Right — group** (gap 14px): `Settings` button + theme toggle.
  - `Settings` button: `font-size:14px; weight:600; padding:9px 18px; border-radius:9px; border:1px solid` divider; transparent bg; color `--head`. Hover: border → `--cardbrd`.
  - Toggle pill: `padding:6px 12px; border-radius:20px; border:1px solid` divider; label `12px` muted + a 26×14px track (`radius:8px`) with a 12×12 knob; knob at right in dark (`translateX(12px)`), left in light.

---

## 2. Identity hero (the anchor)

**Container** (`.hero`):

| Property | Value |
|----------|-------|
| Radius | `22px` |
| Padding | `36px 38px` |
| Layout | `flex; gap:34px; align-items:center` — **order: meta (left), ValueSkin frame (right)** |
| Background | `linear-gradient(155deg,#0A0A0A 0%,#17150F 55%,#22201A 100%)` (dark in BOTH themes — identity cards stay dark, per BRANDING §10.1) |
| Border | `1px solid rgba(200,184,154,0.22)` |
| Shadow | `0 40px 80px -42px rgba(10,10,10,0.6)` |
| Glow overlay | `radial-gradient(48% 70% at 86% -12%, rgba(160,138,94,0.24), transparent 62%)` as an `::after`, `pointer-events:none` |
| Text color | all hero text on this dark surface uses the dark-theme values regardless of page theme |

**Left — meta column** (`.hmeta`, `flex:1`):

1. **Name:** `font-size:clamp(30px,4.5vw,40px); weight:700; letter-spacing:-0.02em; line-height:1;` color `#F5F5F0`.
2. **Handle line** (`margin-top:8px`): `font-size:14px;` color `#B8B4AC`. Format: `@handle · <b>Profession</b> · City, Country`. The profession `<b>` is `#C9C5BC; weight:500`.
3. **Sub line** (`margin-top:14px`): `font-size:14px;` color `#C9C5BC`. e.g. `Speaks <b>English, Hindi</b> · Open for work` (`<b>` = `#F5F5F0; weight:600`).
4. **Pills row** (`margin-top:16px; gap:9px; flex-wrap`):
   - Each pill: `font-size:12px; weight:600; padding:6px 13px; border-radius:20px`.
   - **Type pill (solid):** bg `#C8B89A`, text `#0A0A0A`. (e.g. `Professional`.)
   - **Tier pill + Verified (outline):** `border:1px solid rgba(200,184,154,0.35);` text `#C8B89A`; transparent bg. (e.g. `Signal · Level 3`, `Verified`.)
5. **Actions row** (`margin-top:20px; gap:10px`):
   - Each button: `font-size:14px; weight:600; padding:11px 20px; border-radius:10px`.
   - **Primary `Watch pitch clip`:** bg `#C8B89A`, text `#0A0A0A`, border same.
   - **Ghost `Edit profile`:** transparent, `border:1px solid rgba(245,245,240,0.28)`, text `#F5F5F0`. Hover border → `rgba(245,245,240,0.6)`.

**Right — ValueSkin frame** (`.frame`, `flex:none`):

| Property | Value |
|----------|-------|
| Size | `160×160px` |
| Radius | `18px` |
| Background | `rgba(245,245,240,0.04)` |
| Border | `1px solid rgba(200,184,154,0.30)` |
| Inner highlight | `box-shadow: inset 0 1px 0 rgba(245,245,240,0.08)` |
| Pixel art size | `126×126px`, centered, `image-rendering:pixelated` |
| Motion | float `translateY` 0 → −5px → 0, `5s`, `--ease`, infinite |
| **No "ValueSkin" label** | the tag caption is removed (per latest) |

ValueSkin pixel spec: 12×12 grid, palette-tied (figure + Deep/Warm Sand accents), per BRANDING §10.4. See mock for the reference sprite.

---

## 3. Level progress card

**Container** (`margin-top:18px`):

| Property | Value |
|----------|-------|
| Radius | `16px` |
| Padding | `22px 24px` |
| Background | `--card` (dark `#141310` / light `#FFFFFF`) |
| Border | `1px solid` hair (dark `rgba(245,245,240,0.08)` / light `rgba(45,45,45,0.10)`) |

- **Top row** (`flex; space-between; align-items:baseline`):
  - Left: `Signal` `font-size:15px; weight:700; color:--head` + ` Level 3 · earned` as `font-size:12px; weight:500; color:--muted2; margin-left:6px`.
  - Right: `17 more deals → Aura` `font-size:12px; color:--muted2`.
- **Bar** (`margin-top:12px`): track `height:8px; radius:4px; background:--divider`. Fill: `width:51%` (example), `background:linear-gradient(90deg,#A08A5E,#C8B89A); radius:4px`. Fill animates from `0 → target` over `1s --ease` on load.
- **Note** (`margin-top:10px`): `font-size:12.5px; color:--muted2` — `Levels rise only on completed, paid deals — never bought, never gamed.`

> Bar % = `dealsAtCurrentTier / dealsNeededForNextTier`. Tier thresholds per `Project.md §4` (Signal 15–34 → Aura 35).

---

## 4. Section label ("TRACK RECORD")

- `font-size:11px; weight:700; letter-spacing:0.14em; text-transform:uppercase; color:--muted2;`
- `margin:28px 0 14px;`
- Trailing hairline: an `::after` flex-1 `height:1px; background:--divider` after the text (gap 12px).

---

## 5. Stats grid

**Grid:** `display:grid; grid-template-columns:repeat(3,1fr); gap:14px;` (3 across, 2 rows = 6 cards).

**Each stat card** (`.stat`):

| Property | Value |
|----------|-------|
| Radius | `16px` |
| Padding | `22px 24px` |
| Background | `--card` |
| Border | `1px solid` hair |

- **Label (`.k`):** `font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:--muted2`.
- **Value (`.v`):** `font-size:30px; weight:700; letter-spacing:-0.02em; line-height:1; margin-top:8px;` color `--head`.
  - **Unit suffix (`.u`):** `font-size:14px; weight:500; color:--muted2`.
  - **Sand variant** (rating + trust only): color `#A08A5E`.
- **Delta (`.d`, `margin-top:8px`):** `font-size:12px; color:--muted2`. Positive delta token (`.up`): color `#A08A5E; weight:600`.

**The six cards (exact content & which are sand):**

| # | Label | Value | Unit | Delta | Sand? |
|---|-------|-------|------|-------|-------|
| 1 | Deals done | 18 | — | `+3` this month | no |
| 2 | Avg rating | 4.9 | /5 | from 18 brands | **yes** |
| 3 | Repeat clients | 42 | % | came back for more | no |
| 4 | On-time delivery | 100 | % | every deal, on time | no |
| 5 | Avg response | 2 | h | fast to reply | no |
| 6 | Trust score | 92 | % | earned, not claimed | **yes** |

**Footnote** (`margin-top:12px`): `font-size:12px; color:--muted2` — `Stats are earned automatically from completed deals — they can't be edited or bought.`

> All stat values are **read-only, computed server-side** from completed deals (`Project.md §11`). Never editable.

---

## 6. Motion (exact)

All `transform`/`opacity` only; honour `prefers-reduced-motion` (disable all; render final state).

| Element | Animation | Timing / delay |
|---------|-----------|----------------|
| Hero | fade + `translateY(16px→0)` | `0.7s --ease`, delay `0.05s` |
| Level card | fade + `translateY(12px→0)` | `0.7s --ease`, delay `0.18s` |
| Stat cards | fade + `translateY(12px→0)`, staggered | `0.6s --ease`, delays `0.24 / 0.30 / 0.36 / 0.42 / 0.48 / 0.54s` |
| Stat numbers | count-up 0 → value | starts ~`0.45s`, duration `1000ms`, ease-out cubic (`1−(1−p)³`) |
| Level bar | width 0 → target | `1s --ease`, starts ~`0.45s` |
| ValueSkin | float ±5px | `5s --ease` infinite |

---

## 7. Responsive overrides

- **`≤760px`:**
  - Stats grid → `grid-template-columns:1fr 1fr`.
  - Hero → `flex-direction:column; text-align:center;` pills & actions `justify-content:center`. (Frame drops below the meta.)
- **`≤460px`:**
  - Stats grid → `grid-template-columns:1fr`.
  - Wrap side padding stays `28px` (min touch comfort); reduce to `20px` if needed.
- Touch targets ≥ 44px tall (buttons already clear this).

---

## 8. Colour tokens (per theme — copy verbatim)

```css
:root{
  --warm-sand:#C8B89A; --deep-sand:#A08A5E; --near-black:#0A0A0A; --off-white:#F5F5F0;
  --ease:cubic-bezier(0.16,1,0.3,1);
}
[data-theme="dark"]{
  --bg-a:#0A0A0A; --bg-b:#141310; --bg-c:#1C1B17;
  --head:#F5F5F0; --text:#C9C5BC; --muted2:#8A867E;
  --card:#141310; --hair:rgba(245,245,240,0.08); --divider:rgba(245,245,240,0.10);
  --cardbrd:rgba(200,184,154,0.16);
}
[data-theme="light"]{
  --bg-a:#F4F3EE; --bg-b:#EEE9DE; --bg-c:#E6E0D2;
  --head:#0A0A0A; --text:#3A362E; --muted2:#6E6A60;
  --card:#FFFFFF; --hair:rgba(45,45,45,0.10); --divider:rgba(160,138,94,0.20);
  --cardbrd:rgba(160,138,94,0.28);
}
```

The identity hero is **always** the dark gradient with the dark-theme text colors, in both page themes.

---

## 9. Data bindings (what's dynamic)

| Field | Source |
|-------|--------|
| Name, @handle, profession, city/country, languages, open-for-work | user profile |
| Type pill (Passion/Professional/Hobby) | ValueSkin Type (`Project.md §28`) |
| Tier pill (Raw→Icon + level) | earned Tier (`§4`) |
| Verified pill | verification state (`§10`) |
| ValueSkin pixel art | owned profession skin |
| Level bar % + "N more deals → NextTier" | tier thresholds (`§4`) |
| All 6 stats | computed from completed deals (`§11`), read-only |
| Pitch clip button | creator's uploaded clip (`§4 Layer 3`) |

---

## 10. Build checklist

- [ ] Content column 900px, centered, vertical scroll only, no horizontal scroll.
- [ ] Header sticky 56px, blur, hairline; wordmark 20/700/0.18em; Settings + toggle right.
- [ ] Hero: dark gradient (both themes), radius 22, padding 36×38, gap 34, meta left / frame right.
- [ ] Frame 160, radius 18, pixel 126, float 5s; **no ValueSkin caption**.
- [ ] Pills: Type solid sand, Tier/Verified outline sand. Actions: pitch clip solid sand, edit ghost.
- [ ] Level card + animated sand→warm bar.
- [ ] TRACK RECORD label + hairline.
- [ ] 6-card stat grid, numbers 30px, sand on rating + trust, count-up on load.
- [ ] All motion transform/opacity + reduced-motion fallback.
- [ ] Both themes wired to the exact tokens in §8.
- [ ] Responsive: 760 → 2-col + stacked hero; 460 → 1-col.
- [ ] No currency, no green, no emoji, no pill (G1/§4).
```
