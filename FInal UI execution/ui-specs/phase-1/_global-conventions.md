# Global UI Conventions

> Cross-cutting rules that apply to **every** ValueSkins screen. Individual page specs inherit these — don't re-litigate them per page. `BRANDING.md` remains the source of truth; this file records product-wide UI decisions made during the redesign.

---

## G1 — No wordmark pill, anywhere

The **black oval `VALUESKINS` pill is removed from every screen** — nav bars, auth, profile, all of it. It's rounded/"app-y" (violates BRANDING §6) and the wordmark never needs a container.

- Where a nav genuinely needs brand presence, use the **plain `VALUESKINS` wordmark as text** (Near Black on light / Off White on dark), left-aligned, at nav scale (~22–24px cap-height, tagline dropped in nav per BRANDING §7). No pill, no oval, no background shape, no rounded container.
- Prefer no logo at all on full-bleed brand moments (e.g. login) where a centered hero wordmark already carries the brand.

## G2 — One typeface: Inter, everywhere

The wordmark font is the **only** typeface across the entire product — UI, headings, body, numbers, labels, buttons. This matches BRANDING §5.

```
font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
```

- Weights by role: `700` wordmark/headings, `600` emphasis (links, key labels), `500` tagline, `400` body.
- No secondary or system font for body text, no serif anywhere, nothing decorative or rounded.
- Load Inter once, globally (BRANDING §5 snippet).

## G3 — Colour & accent discipline (reminder)

Per BRANDING §4: no blues, no startup greens, **no bright/red CTAs**. Warm/Deep Sand is a sparing accent only (separators, fine rules, small highlights) — never a large fill. Destructive actions (Delete, etc.) use quiet, restrained treatments, not loud red fills — see per-page notes.

## G4 — Orientation & state on every deep screen

Adding screens/flows does **not** confuse users — orphaned screens do. Confusion comes from losing *where am I* (orientation) and *what was I doing* (state), not from screen count. Every screen deeper than the primary tabs must carry:

1. **A persistent frame** — a top bar that never disappears, showing the screen's name and an **explicit Back** that returns to the previous screen in its *exact prior state* (same scroll position, same filters, same data). Never drop a user somewhere with no frame and no way back.
2. **Preserved state** — long/multi-field flows **autosave as a draft** and show a visible `Draft · autosaved` marker. Killing the "did I lose my work?" fear removes most of the perceived confusion of deep flows.
3. **A location signal** — active nav item, screen title, or breadcrumb, so one glance answers "where am I."
4. **Reachable primary nav** — the user is never trapped; they can always get back to the main tabs.

**Modal vs full page:** use a **modal** only for short, throwaway tasks (confirm, single field, quick pick) — its value is keeping the prior screen visible behind it. Use a **full page** for substantial, multi-field work (e.g. campaign creation) — it's safe *because* it carries the persistent frame above. Don't stack modals on modals. Keep screen-transition behavior consistent so the spatial model stays learnable.

Desktop and mobile share this rule: on desktop, disorientation comes from full context swaps with no anchor (the frame fixes it); on mobile, one-screen-at-a-time is native, so the risks shift to back-stack correctness and scroll restoration — the same persistent-frame + preserved-state rule covers both.

## G5 — Light-mode token standard (visibility-tuned)

Light mode must be as legible as dark. Use these canonical light tokens on every screen (dark tokens unchanged). Tuned so text, cards, and the pixel identities all read clearly on off-white.

```css
[data-theme="light"]{
  --bg: radial-gradient(72% 55% at 82% -8%, rgba(160,138,94,0.22), transparent 62%),
        linear-gradient(150deg,#F4F3EE 0%,#EFEADF 55%,#E4DCCB 100%);
  --head:  #0A0A0A;   /* headings */
  --text:  #3A362E;   /* body — warm near-black, not washed grey */
  --muted: #6E6A60;   /* captions/labels — strong enough to read */
  --card:  #FFFFFF;   /* cards: clean white for separation from off-white bg */
  --card-border: rgba(160,138,94,0.34);  /* firmer sand hairline */
  --field: #FFFFFF;
  --accent: #A08A5E;  /* deep sand — accents, focus, highlights */
}
```

Rules:
1. **Body text ≥ `#3A362E`, muted ≥ `#6E6A60`.** Do not use pale greys (e.g. `#9A968E`) for meaningful text — they wash out on off-white.
2. **Cards are white** (`#FFFFFF`) on the off-white gradient, with a firm sand hairline — so they separate instead of blending.
3. **Pixel ValueSkins repaint per theme:** figure = **near-black** in light, **off-white** in dark (with muted/charcoal secondary). A sprite built only for dark disappears on light — always theme-paint.
4. **Primary buttons:** solid **near-black** in light / **off-white** in dark. **Never a large sand/gold fill** — sand stays a sparing accent (BRANDING §4). A big gold "Next" button is off-brand.
5. Focus rings, selected states, markers: deep/warm sand, as elsewhere.

Applies across the whole product; existing screens adopt these on their next pass.

## G6 — Type scale standard (default font size)

Standardized after checking how large sites/design systems handle it. The consensus (e.g. the U.S. Web Design System roots at 16px = 100%; body copy sits 16–18px; headings derive from a modular ratio): **root at 16px, use `rem`, scale headings by ~1.25.**

**Root & base**
- `html { font-size: 100%; }` → **16px base**. Never hard-code a smaller root.
- Body copy: **`1rem` (16px)**, line-height `1.5–1.6`. Secondary/muted body may drop to `0.9375rem` (15px), no smaller for real reading text.
- Use **`rem`** everywhere (respects user/browser zoom + accessibility). Avoid `px` for type.
- **Inputs ≥ 16px** (`1rem`) — smaller triggers iOS zoom-on-focus.

**Scale (ratio ≈ 1.25, "major third")** — topics & subtopics:

| Token | Size | Use |
|-------|------|-----|
| `--fs-display` | `clamp(2.5rem, 6vw, 4rem)` | Hero / landing display |
| `--fs-h1` | `2rem` (32px) | Page title |
| `--fs-h2` | `1.5rem` (24px) | Section title (topic) |
| `--fs-h3` | `1.25rem` (20px) | Subsection / card title (subtopic) |
| `--fs-body` | `1rem` (16px) | Body |
| `--fs-small` | `0.8125rem` (13px) | Captions, helper text |
| `--fs-label` | `0.75rem` (12px) | Uppercase labels (with `0.08em` tracking) |

- Line-height: headings `1.05–1.2`, body `1.5–1.6`.
- Headings keep the brand's **wide tracking** on the wordmark/hero; body stays tight and confident (BRANDING §5).
- Weights by role (G2): 700 headings, 600 emphasis, 500 tagline, 400 body.

Every page uses this scale — no ad-hoc font sizes.

## G7 — Dark is the default theme

The product **loads in dark** on every app screen (BRANDING §6 / §10.1 — dark is the default/hero surface). **Light is opt-in** via the theme toggle and the choice **persists** per user.
- App screens (profile, market, store, deal room, settings, onboarding, login) default dark.
- The **marketing landing (welcome)** may stay light as an off-white marketing context; everything post-entry defaults dark.
- Any earlier sample that opened in light is overridden by this — default dark, remember the user's toggle.

## G8 — The bottom tab bar is always visible

The **bottom tab bar** (`Profile · Market · Store · Settings`) is the app spine and is **persistently visible on every authenticated screen — no matter the template.** It never scrolls away, never gets hidden by a sub-view, deep screen, deal room, store detail, or settings.
- Deep sub-views (e.g. Creator Profile Preferences, Deal Room) keep the tab bar **and** carry their own `Back` (G4) — both, not either.
- It's `position:fixed` at the bottom, above content; give pages bottom padding so nothing hides under it.
- **Only exception:** pre-account flows have no tabs yet — **welcome, login, role selection, and onboarding** (no account/role context). The moment the user is in the app, the tabs are always there.
- Active tab: Near Black/Off White by theme + a small **sand dot**; tactile press-scale.

---

*Add new product-wide rules here as they're decided, so page specs stay lean.*
