# ValueSkins — Brand Guide

> **Canonical brand source of truth.** Everything visual and verbal in the product, site, and decks derives from this file. Any design or UI work — human or agentic — must follow it exactly. When a detail is ambiguous, the two SVG logo files in this folder win.

---

## 1. Brand essence

**The one sentence that governs every decision:**
> *"The professional standard for creator-brand relationships. Not the cheapest option. The right one."*

**Three words:** Trust · Earned · Serious.

**Reference point — KHY (Kylie Jenner):** accessible in price, luxury in presentation. Every touchpoint — spacing, copy, photography — communicates restraint and intention. Nothing is loud. Affordable but never cheap, because the brand identity is expensive. That's the lane ValueSkins occupies: a platform anyone can afford to join, that looks and behaves like something premium.

**The Tata Nano rule:** Nano branded itself "the world's cheapest car" — nobody wanted to be seen in it. ValueSkins **never leads with price.** Lead with what it delivers (trust, verified creators, completed deals). Price is an afterthought for a brand that knows its value.

**IS vs IS NOT:**

| ✓ IS | ✕ IS NOT |
|------|----------|
| Minimal. Confident. Sparse copy. | Loud. Colourful. Emoji-heavy. |
| High contrast. Earned authority. | Startup-speak. "Disruptive." Hustle-culture. |
| Serious without being cold. | Influencer-aesthetic. Free-tier feeling. |
| Professional without being corporate. | Cheap. Overcrowded layouts. |
| Affordable without being budget. | Rounded, playful, "app-y." |

---

## 2. Voice

**In product copy:**
- *"Your level. Earned."* — not "Congratulations! You've levelled up! 🎉"
- *"Verified."* — not "We've checked and you're good to go!"
- *"Deal complete."* — not "Amazing work, your deal is done!"

**In marketing:**
- *"Brands that mean business. Creators who deliver."* — not "Connect with amazing brands and unleash your potential!"

**Rules:** Short sentences. Active voice. No exclamation marks in headlines — ever. No startup-speak ("leverage," "revolutionary," "disrupt"). If you can cut a word, cut it.

---

## 3. Logo / Wordmark

- **The word `VALUESKINS` IS the logo.** No icon, no symbol, no graphic mark. Do not add one.
- All-caps, single word, **wide letter-spacing**, geometric sans-serif, bold.
- Beneath it, a tagline lockup: **`TRUST · EARNED · SERIOUS`** in smaller, muted caps, with the **·** separators in warm sand.
- Dark theme: off-white on near-black (primary). Light theme: near-black on off-white (reversed).

```
┌───────────────────────────────────────┐
│            VALUESKINS                  │   ← wordmark, weight 700, 0.18em tracking
│         TRUST · EARNED · SERIOUS       │   ← tagline, weight 500, 0.34em tracking, sand dots
└───────────────────────────────────────┘
```

**Assets (canonical):** `valueskin-logo-dark.svg` (primary), `valueskin-logo-light.svg` (reversed). Full source in §9.

### Wordmark spec

| Property | Value |
|----------|-------|
| Text | `VALUESKINS` (uppercase, one word) |
| Font | `Inter` → `'Helvetica Neue', Arial, sans-serif` |
| Weight | `700` · uppercase · letter-spacing `0.18em` · line-height `1` |
| Colour — dark / light | `#F5F5F0` / `#0A0A0A` |

### Tagline lockup spec

| Property | Value |
|----------|-------|
| Text | `TRUST · EARNED · SERIOUS` (`·` = U+00B7, one space each side) |
| Weight | `500` · letter-spacing `0.34em` · size ≈ 25% of wordmark |
| Word colour — dark / light | `#B8B4AC` / `#2D2D2D` |
| Dot colour — dark / light | `#C8B89A` / `#A08A5E` |
| Position | centred under wordmark, gap ≈ 0.35× wordmark cap-height |

---

## 4. Colour palette

| Token | Hex | RGB | Role |
|-------|-----|-----|------|
| Near Black | `#0A0A0A` | `10, 10, 10` | Base / dark bg, light-theme text |
| Off White | `#F5F5F0` | `245, 245, 240` | Surface / light bg, dark-theme text |
| Warm Sand | `#C8B89A` | `200, 184, 154` | Accent only — separators, fine rules, highlights |
| Charcoal | `#2D2D2D` | `45, 45, 45` | Secondary text, borders, muted UI |
| Deep Sand | `#A08A5E` | `160, 138, 94` | Accent variant for light/off-white surfaces |
| Muted Grey | `#B8B4AC` | `184, 180, 172` | Muted text on dark surfaces |

**Rules:** No blues. No startup greens. No bright/red CTAs. Warm sand is a **sparing** accent, never a large fill. High contrast everywhere. Think Glossier's restraint + KHY's contrast, with more authority.

```css
:root {
  --vs-near-black: #0A0A0A;
  --vs-off-white:  #F5F5F0;
  --vs-warm-sand:  #C8B89A;
  --vs-charcoal:   #2D2D2D;
  --vs-deep-sand:  #A08A5E;
  --vs-muted-grey: #B8B4AC;
}
```

---

## 5. Typography

- Font family everywhere: `'Inter', 'Helvetica Neue', Arial, sans-serif` (load Inter — see below).
- **Headings:** wide letter-spacing (like KHY), large, sparse, lots of breathing room.
- **Body:** small, tight, confident.
- Never decorative. Never rounded/playful/"app-y."
- **Default size & scale (standardized):** root **16px = 100%**, `rem`-based, headings on a **~1.25 modular scale**; inputs/body never below 16px. Full token table in `ui-specs/_global-conventions.md` **G6**. This is the single type scale for the whole product — no ad-hoc sizes.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
```

---

## 6. UI application principles

How the brand shows up in the product — apply these to every screen:

- **Dark is default.** Near-black surfaces, off-white text. Light theme only on off-white/photo-light contexts.
- **Breathing room over density.** Generous whitespace; never overcrowd. Sparse beats busy.
- **Buttons/CTAs:** solid near-black or off-white (by theme). No bright colour CTAs. Warm sand only for subtle emphasis, never a full button fill.
- **Borders & dividers:** charcoal `#2D2D2D` (dark) / hairline sand or light grey (light). Thin, quiet.
- **Corners:** subtle radius, not pill-shaped/playful.
- **No gradients, shadows-as-decoration, noise, or stock photography.**
- **Copy in UI** follows §2 — terse, confident, no exclamation marks.

---

## 7. Logo usage rules

- **Clear space:** ≥ one cap-height of empty space on all sides of the lockup.
- **Minimum width:** wordmark ≥ 120px on screen. In tight nav, ~28px tall (~120–150px wide); drop the tagline in nav, use the full lockup on login/landing/hero.
- **Don't:** change the font, re-colour the wordmark, tighten the tracking, add a symbol/emoji, apply gradients/shadows, stretch, rotate, or place on busy backgrounds.
- **Monogram** (favicon/app icon < 120px): not yet designed — request separately, do NOT invent one.

---

## 8. Implementation

### Option A — use the SVG file (simplest, pixel-safe)
```jsx
<img src="/assets/valueskin-logo-dark.svg" alt="ValueSkins" style={{ height: 28 }} />
```

### Option B — React component (scalable + accessible, matches the SVG)
```jsx
export function ValueSkinsLogo({ theme = "dark", size = 44 }) {
  const isDark = theme === "dark";
  const word = isDark ? "#F5F5F0" : "#0A0A0A";
  const tagWord = isDark ? "#B8B4AC" : "#2D2D2D";
  const dot = isDark ? "#C8B89A" : "#A08A5E";
  return (
    <div role="img" aria-label="ValueSkins"
         style={{ fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", textAlign: "center", lineHeight: 1 }}>
      <div style={{ color: word, fontWeight: 700, fontSize: size, letterSpacing: "0.18em" }}>VALUESKINS</div>
      <div style={{ marginTop: size * 0.32, color: tagWord, fontWeight: 500, fontSize: size * 0.25, letterSpacing: "0.34em" }}>
        TRUST <span style={{ color: dot }}>·</span> EARNED <span style={{ color: dot }}>·</span> SERIOUS
      </div>
    </div>
  );
}
```

---

## 9. Exact SVG source (canonical — copy verbatim)

### Dark (`valueskin-logo-dark.svg`)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 340" role="img" aria-label="ValueSkins logo, dark">
  <title>ValueSkins — dark treatment</title>
  <rect width="900" height="340" fill="#0A0A0A"/>
  <text x="450" y="180" text-anchor="middle" font-family="'Helvetica Neue', Inter, Arial, sans-serif" font-weight="700" font-size="88" letter-spacing="16" fill="#F5F5F0">VALUESKINS</text>
  <text x="450" y="235" text-anchor="middle" font-family="'Helvetica Neue', Inter, Arial, sans-serif" font-weight="500" font-size="22" letter-spacing="7.5">
    <tspan fill="#B8B4AC">TRUST </tspan><tspan fill="#C8B89A">· </tspan><tspan fill="#B8B4AC">EARNED </tspan><tspan fill="#C8B89A">· </tspan><tspan fill="#B8B4AC">SERIOUS</tspan>
  </text>
</svg>
```

### Light (`valueskin-logo-light.svg`)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 340" role="img" aria-label="ValueSkins logo, light">
  <title>ValueSkins — light treatment</title>
  <rect width="900" height="340" fill="#F5F5F0"/>
  <text x="450" y="180" text-anchor="middle" font-family="'Helvetica Neue', Inter, Arial, sans-serif" font-weight="700" font-size="88" letter-spacing="16" fill="#0A0A0A">VALUESKINS</text>
  <text x="450" y="235" text-anchor="middle" font-family="'Helvetica Neue', Inter, Arial, sans-serif" font-weight="500" font-size="22" letter-spacing="7.5">
    <tspan fill="#2D2D2D">TRUST </tspan><tspan fill="#A08A5E">· </tspan><tspan fill="#2D2D2D">EARNED </tspan><tspan fill="#A08A5E">· </tspan><tspan fill="#2D2D2D">SERIOUS</tspan>
  </text>
</svg>
```

---

## 10. Product UI evolution (redesign decisions — this cycle)

These extend §1–§9 from the product redesign. They are canonical. Full per-screen specs live in `ui-specs/` (and `ui-specs/_global-conventions.md`).

### 10.1 Dual themes — both official
Dark **and** light are both first-class. **Dark is the default / hero surface** (front door, dashboards, identity cards). Light is used on off-white/marketing contexts (login) and wherever the user selects it. Every screen ships a theme toggle where relevant; the `App Developer`-style identity cards stay dark in both themes for a premium collectible feel.

**Light mode is visibility-tuned (canonical tokens in `ui-specs/_global-conventions.md` G5):** body text `#3A362E`, muted `#6E6A60` (no pale washed greys for real text), white cards on the off-white gradient, pixel ValueSkins repainted to near-black figures, and primary buttons solid near-black — **never a large sand/gold fill** (sand stays a sparing accent per §4).

### 10.2 Tonal gradients — permitted (clarifies §6)
§6's "no gradients as decoration" is refined: **decorative, multi-hue gradients remain banned.** **Tonal, single-family gradients are permitted** — near-black→charcoal depth with an optional *faint* deep-sand glow, or off-white→sand on light. Monochrome depth, never a rainbow, never an animated colour blob. This is how "dark is default" gets richness without breaking restraint.

### 10.3 The wordmark pill is retired
The rounded black `VALUESKINS` pill is removed everywhere (it violated the no-rounded/"app-y" rule). Brand presence in-product = the **plain wordmark as text** (Near Black / Off White by theme), or a centered hero wordmark on full-bleed moments. No container, no oval, ever. (Global rule G1.)

### 10.4 ValueSkin pixel identity — a core brand element
The **ValueSkin** is a per-user **pixel-art identity mark** representing a creator's profession (e.g. App Developer). It is now a recurring brand device across profile, store, settings, and the front door.
- **Rendering:** crisp-edged low-res pixel art (`image-rendering:pixelated` / `shape-rendering:crispEdges`), palette-tied only — Near Black/Off White figure with Deep/Warm Sand accents. No new colours.
- **Deliberately low-fidelity:** legible as *what* it is, not crisply detailed — restraint, not loud. Reads as personality while staying "not too unique" (a shared professional class, not a one-off portrait).
- **One ValueSkin per view:** big hero on the profile; small inline badge (verified-tick slot) in compact contexts (listings, search, deal room, nav). Never the same mark twice in one view.
- Owned skins are shown as **collectible cards** (the "Closet" framing). Sand = owned/equipped; everything else neutral.

### 10.5 Motion principles
Motion is restrained and purposeful: **animate only `transform` and `opacity`** (hardware-accelerated); easing `cubic-bezier(0.16,1,0.3,1)`, never bounce/elastic; entrances stagger subtly; accents may "breathe" quietly. Always honour `prefers-reduced-motion`. Attention is earned through precision, not spectacle.

### 10.6 The front door (role selection)
The welcome/role page is the first second of the product and must *deliver the product instantly*: dark premium surface, hero wordmark + a plain-spoken headline ("creators and brands close deals on **earned trust**"), a **Creator vs Brand** split that spotlights on hover, quiet **proof counters** (verified creators · completed deals · money paid — the "money moved" proof, per `Project.md §13`) and a subtle activity ticker, with drifting ValueSkin identities in the background. Confident, not carnival. Sample: `_samples_delete_later/role-selection-sample.html`.

### 10.7 Destructive actions are quiet
No bright/red resting CTAs anywhere (reaffirms §4). Log out / delete live in a restrained "Danger Zone" — Charcoal-outline, confirmation carries the weight, never a loud red fill.

---

*Source of truth: this file + the two SVGs in this folder. If a build disagrees with them, they win.*
