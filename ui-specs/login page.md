# Login Page — UI Spec

> Template: **Login / Auth landing** (light theme).
> Governs: `BRANDING.md` is law. When this doc and the brand guide disagree, the brand guide wins.
> Status: redesign spec — merges the auth section and the footer section into one continuous page.

---

## 0. What's changing (summary)

The current build has the auth card and the footer living as two disconnected sections, separated by a heavy full-bleed black band, with a black oval `VALUESKINS` pill floating top-left. Three problems:

1. The black oval logo pill top-left is **redundant** (the hero wordmark already carries the brand) and it's off-brand — the pill is rounded/"app-y," which §6 forbids.
2. The solid black divider band is loud. §4 says warm sand is the only accent and §6 says borders are *thin, quiet*. A full black bar is decoration, not structure.
3. The hero wordmark sizing is unresolved — it needs to feel highlighted without tipping into intimidating.
4. **Remove the `One account for everything.` sub-headline entirely.** The wordmark + tagline already say enough; the line is filler and adds vertical bulk we don't want (§2: if you can cut a word, cut it).
5. **The whole page must fit in one viewport — no scroll.** Everything (auth block + footer) sits on one screen at standard desktop heights. Reduce sizes as needed to make it fit.

This spec fixes all of the above and specifies the merged, **single-viewport (no-scroll)** page.

---

## 1. Remove the top-left logo pill

- **Delete** the black oval `VALUESKINS` pill in the top-left corner entirely. No nav logo on this screen.
- Rationale: the auth page is a full-bleed brand moment — the centered hero wordmark IS the logo presence (§3 of brand guide: "the word `VALUESKINS` IS the logo"). A second, smaller, *rounded* lockup competes with the hero and breaks the no-rounded-corners rule (§6). One confident mark beats two.
- The top-left corner stays empty. Breathing room over density (§6).

---

## 2. The hero wordmark — sizing & psychology

**Goal (Aubrey's words):** catchy but not overdone, highlighted but not losing minimalism, not intimidating.

### The research, applied to our niche

Luxury and trust brands (Burberry, Balenciaga, Saint Laurent) all converged on *minimal, sans-serif, high-contrast* wordmarks because simplicity reads as confidence and permanence — the brand doesn't need to shout to be taken seriously. Black conveys sophistication. A simple mark stays powerful at any scale, so we don't need size to do the work that restraint does better.

For a two-sided **trust marketplace**, the wordmark's job is to say *"this is the professional standard"* the instant a creator or brand lands — calm authority, not hype. That means:

- **Big enough to anchor the page** (it's the first and largest thing you see) —
- **but not so big it feels like it's trying to impress you** (oversized = insecure/loud = the Tata Nano energy we avoid).

The KHY lesson: accessible-but-premium only works when the brand is *sure of itself*. Confidence is communicated through generous clear space and precise scale — not through size alone.

### The spec

| Property | Value | Why |
|----------|-------|-----|
| Wordmark cap-height | **~40px desktop** (clamp 30–40px responsive) | Hero-scale but restrained, and trimmed so the page fits one viewport with no scroll. Large enough to own the page, small enough to stay quiet. |
| Wordmark weight / tracking | `700` · `0.18em` (per brand guide §3) | Unchanged — this is locked. |
| Tagline size | ~25% of wordmark ≈ **10–11px** | `TRUST · EARNED · SERIOUS`, dots in Deep Sand `#A08A5E` (light theme). |
| Vertical position | Optically centered in the auth zone above the footer | Calm and intentional, not floaty. With no sub-headline the wordmark sits closer to the button. |
| Clear space | ≥ one cap-height empty on all sides (§7) | Non-negotiable — the space is what makes it feel premium. |
| ~~Sub-headline~~ | **Removed** — no `One account for everything.` line | Filler; cut it (§2). Removing it also reclaims vertical space for the no-scroll fit. |

> **Rule of thumb we're setting:** the hero wordmark is the largest type on the page, but stays quiet — never oversized. With the sub-headline gone, the button becomes the next focal element; keep clear space between them so the wordmark still reads as the anchor.

Responsive: `font-size: clamp(30px, 5vw, 40px);` Tagline: `clamp(9px, 1.4vw, 11px);`

---

## 3. Merge into one page — single viewport, no scroll

The page becomes **one continuous flow** on the off-white surface that **fits entirely within one screen — no scrolling.** Auth block centered in the upper portion, footer anchored to the bottom of the same viewport:

```
        [ empty top-left — pill removed ]

                 VALUESKINS
             TRUST · EARNED · SERIOUS

        ┌─────────────────────────────────┐
        │   G   Continue with Google       │
        └─────────────────────────────────┘

           Don't have an account?  Sign up

     By continuing, you agree to our Terms of
              Service and Privacy Policy.

   · · · · · · · ·  (minimal separation)  · · · · · · · ·

   VALUESKINS          LEGAL      DATA & PRIVACY    SUPPORT
   TRUST·EARNED·SERIOUS  ...          ...             ...
   Connect creators...

   © 2026 ValueSkins.            Made with care for creators & brands
```

Everything sits on the single Off White `#F5F5F0` surface. No color break between auth and footer. No sub-headline.

**No-scroll construction:**
- Use `min-height:100vh` with a column flex layout: auth block flex-grows and centers, footer is pinned at the bottom — no page overflow.
- Trim the vertical spacing tokens (§9) and font sizes so the total column height ≤ 100vh at standard desktop heights (~768px+). On short viewports, whitespace compresses first; the hairline separator and footer never get pushed off-screen.
- Footer stays compact — tighten line-heights and top padding so all four columns + bottom row live inside the viewport.

---

## 4. The separation — kill the black band

- **Delete the solid full-bleed black divider band.** It's the loudest thing on a page that should be quiet, and it splits the page in two when we want one continuous surface.
- Replace with a **single hairline rule**: `1px`, Deep Sand at low opacity or light grey — `border-top: 1px solid rgba(160, 138, 94, 0.22)` (Deep Sand `#A08A5E` @ ~22%). Barely-there.
- Give the rule **generous vertical breathing room** (≥ 80px above and below on desktop) so the separation comes from *space*, not from a line. The hairline just confirms the boundary; the whitespace does the real work (§6: breathing room over density).
- The footer then continues on the *same* off-white surface — no dark band, no color change.

> If even the hairline feels like too much later, we can drop to whitespace-only separation. But one quiet sand hairline is the safe, minimal default.

---

## 5. Colour mapping (light theme — this page)

This screen runs the **reversed / light** treatment (off-white surface), per §1 of the brand guide (light theme on off-white contexts).

| Element | Token | Hex |
|---------|-------|-----|
| Page surface | Off White | `#F5F5F0` |
| Wordmark | Near Black | `#0A0A0A` |
| Tagline words | Charcoal | `#2D2D2D` |
| Tagline dots · | Deep Sand | `#A08A5E` |
| Sub-headline / body | Charcoal | `#2D2D2D` |
| Muted body (footer desc, legal line) | Muted Grey→Charcoal | `#2D2D2D` @ ~70% |
| Google button border | Deep Sand hairline | `rgba(160,138,94,0.28)` |
| Google button label | Near Black | `#0A0A0A` |
| Section separator | Deep Sand hairline | `rgba(160,138,94,0.22)` |
| Footer headings (LEGAL, etc.) | Near Black | `#0A0A0A` |
| Footer links | Charcoal | `#2D2D2D` |

No blues, no greens, no bright CTAs (§4). Warm/Deep Sand appears **only** as the tagline dots and the hairlines — sparing, exactly as prescribed.

---

## 6. The Google button

- Keep it, but align to §6: **solid near-black or off-white by theme — no bright fills.** On this off-white page the button is a **quiet outlined button**: off-white fill, Deep-Sand hairline border (`rgba(160,138,94,0.28)`), near-black label, official Google `G` glyph.
- Corners: **subtle radius only** (`6px`), never pill-shaped (§6). The current build's radius is acceptable; do not round further.
- Width: comfortable, ~420–460px max, centered. Generous internal padding (`16px` vertical).
- **Interaction states (all required):**
  - *Hover:* border darkens to `rgba(160,138,94,0.5)`, label stays near-black. No color shift, no shadow bloom.
  - *Active:* nudge down `translateY(1px)`. No bounce.
  - *Focus (keyboard):* visible sand outline — `2px solid #A08A5E`, `outline-offset 2px`. Never remove focus without replacing it. Same treatment on all footer/sign-up links.
  - *Reduced motion:* honor `prefers-reduced-motion` — disable transitions/transforms.
- Touch target ≥ 44px tall (the `16px` vertical padding + text clears this).

---

## 7. Copy (unchanged — already on-brand)

All current copy passes §2 (terse, active, no exclamation marks). Keep verbatim (the `One account for everything.` sub-headline is **removed**):

- `Continue with Google`
- `Don't have an account? Sign up`  (`Sign up` = near-black, weight 600; rest Charcoal)
- `By continuing, you agree to our Terms of Service and Privacy Policy.`
- Footer tagline: `Connect creators with brands. Build reputation. Complete deals.`
- `© 2026 ValueSkins. All rights reserved.` / `Made with care for creators & brands`

---

## 8. Footer layout

- Four columns on desktop: **Brand lockup** | **LEGAL** | **DATA & PRIVACY** | **SUPPORT** (as in current build — the structure is good).
- Column headings: uppercase, small, wide-ish tracking (`0.08em`), Near Black, weight 700.
- Links: Charcoal, weight 400, comfortable line-height (~2). Hover → Near Black.
- The footer brand lockup uses the **smaller** wordmark (~22px) with tagline — this is the one acceptable secondary wordmark on the page because it's in the footer utility zone, not competing with the hero.
- Bottom row: copyright left, `Made with care for creators & brands` right, both Muted/Charcoal, small.
- Collapse to a single column, left-aligned, stacked, on mobile.

---

## 9. Spacing & layout tokens

Tightened for the no-scroll fit — these compress before anything gets pushed off-screen:

| Token | Value |
|-------|-------|
| Page max content width (auth block) | 460px, centered |
| Footer max width | 1120px, centered, side padding (≥ 48px) |
| Hero → button gap | ~32px (no sub-headline between them) |
| Button → sign-up line | ~22px |
| Sign-up → terms line | ~16px |
| Auth block → separator | `clamp(40px, 8vh, 80px)` — compresses on short viewports |
| Separator → footer | `clamp(40px, 8vh, 80px)` |
| Footer bottom padding | ~40px |
| Corner radius (buttons) | 6px (subtle, never pill) |

---

## 10. Do / Don't recap

**Do:** one off-white surface end to end · fit everything in one viewport, no scroll · hero wordmark ~40px, calm and centered · no sub-headline · separation via whitespace + one sand hairline · sand only on dots and hairlines · subtle 6px corners.

**Don't:** keep the black oval pill · keep the solid black divider band · keep the `One account for everything.` line · allow the page to scroll · oversize the hero wordmark · use pill-shaped buttons · introduce any blue/green/bright color · add shadows or gradients as decoration.
