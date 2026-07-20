# Market / Brand Dashboard — UI Spec

> Template: **Brand Dashboard + Create Campaign modal**.
> Inherits `_global-conventions.md` (no pill · Inter everywhere · sand-only accent) and obeys `BRANDING.md`.
> Status: redesign spec. Sample: `_samples_delete_later/market-sample.html` (dashboard + interactive modal).

---

## 0. What's changing (summary)

1. **Remove the oval pill** (G1) — nav uses plain wordmark text.
2. **Dashboard**: bigger, left-aligned `Brand Dashboard` heading · bigger `Create Campaign` button placed lower · **tonal gradient background** from the palette.
3. **Create Campaign modal**: **landscape** orientation, near-full-bleed with only a thin gradient margin showing (the `Brand Dashboard` text behind is fully covered) · multi-column form so inputs aren't ugly stretched bars · entrance/interaction **animations**.
4. **Creator level range** selectors: **beige (warm sand)** selected state — kills the off-brand green.
5. **Rename** `Publish Campaign` → **`Launch Campaign`** (see §1).

---

## 1. Rename the primary CTA

**Decision: `Launch Campaign`.** Reasoning against the brand voice (§2 — active, confident, terse):
- `Publish Campaign` is passive/CMS-flavoured (you "publish" a blog post).
- `Raise Campaign` reads like fundraising — wrong mental model for a brand posting a brief.
- **`Launch Campaign`** is active, decisive, and matches the "brands that mean business" tone. It frames the moment as a commitment, not a form submission.

Keep it two words, title case, no exclamation. (If you ever want shorter: `Launch` alone works once context is obvious.)

---

## 2. Dashboard — gradient, heading, button

### 2a. Gradient background (the brand-guide call)

> **Brand tension, stated honestly:** `BRANDING.md §6` says "no gradients … as decoration." A loud, multi-hue gradient stays banned. What we're using instead is a **restrained tonal gradient** — a single-family dark wash (near-black → charcoal) with a whisper of deep sand. It's monochrome depth, not decoration, and it leans into "**dark is default**" (§6). This is the on-brand way to honor the request.

- Surface: `linear-gradient(135deg, #0A0A0A 0%, #1C1B18 55%, #2D2D2D 100%)`.
- Plus a **faint** deep-sand glow, top-right, very low opacity: `radial-gradient(60% 50% at 85% 0%, rgba(160,138,94,0.14), transparent 70%)` layered over the base. Barely perceptible warmth — never a visible blob.
- No animation on the gradient (static; motion lives in the modal). No noise, no banding — use the two layers above.
- Text/marks on this surface flip to the **dark-theme** treatment: Off White text, sand accents.

This dark dashboard is intentional: login/profile are light (off-white contexts); the dashboard embraces the default dark brand surface and makes the light modal pop against it.

### 2b. Heading — bigger, left-aligned

- `Brand Dashboard`: Off White `#F5F5F0`, weight 700, **~40px** (up from ~30px), tight tracking, **left-aligned** at the content's left edge.
- Optional muted sub-line under it (Muted Grey) e.g. `Your campaigns, applicants, and deals` — quiet, ~15px. Keep or drop; terse is fine.
- Remove the thin vertical divider lines flanking the header row in the current build — they add clutter.

### 2c. `Create Campaign` button — bigger, lower

- Move it **off the header row** into the empty state below, sitting lower on the page (anchored in the empty content zone), visibly larger: ~`18px` label, generous padding (`18px 34px`), `6px` radius.
- On the dark surface this is a **solid Off White button, Near Black label** (§6: solid off-white by theme). Leading `+` glyph as a thin SVG, not an emoji.
- Because the dashboard is empty, pair it with a proper **empty state** (skill Rule 5): a short line — `No campaigns yet. Launch your first.` (Muted Grey) — with the big button beneath it, both left-aligned in the content column. Empty space is composed, not blank.
- Hover: subtle lift `translateY(-1px)`; active: `translateY(0) scale(0.99)`. Transform-only (hardware-accelerated).

---

## 3. Create Campaign — **full-page composer with live preview (DECIDED)**

> **Decision:** the modal is **replaced** by a full-page **campaign composer**. Rationale (see `_global-conventions.md` G4): campaign creation is long and multi-field, so a modal was the wrong tool — it cramped content and forced scrolling in a small window. A full page is correct *because* it carries a persistent frame that keeps the user oriented. Sample: `campaign-composer-sample.html`.

### 3-0. Composer structure

- **Persistent header (never scrolls away):** ‹ Back (returns to the dashboard in its exact prior state), screen title `New Campaign` with a `Draft · autosaved` marker, theme toggle, and the primary `Launch Campaign` button. This frame is what prevents disorientation (G4).
- **Two columns:** left = the form (scrollable), right = a **sticky live preview** of the creator-facing listing that assembles in real time as fields are filled. The preview card always uses the **premium dark brand surface** (near-black, sand accents, ValueSkin pixel badge) so it reads as a finished artifact even mid-draft.
- **Autosave** as draft; visible marker. No work is ever lost on Back.
- Collapses to single column < 960px; preview moves below the form (non-sticky) on mobile.
- The field styling (§3c), beige level range (§3d), and animation rules (§3e) below **carry over unchanged** to the composer — they were always about the fields, not the container. Ignore the modal-shell geometry in §3a (superseded); keep everything else.

### 3a. ~~Modal shape & framing~~ (superseded by the composer — kept for reference only)

### 3a. Shape & framing

- **Landscape**: `max-width: 1080px`, `width: calc(100vw - 96px)`, `max-height: calc(100vh - 72px)`. Centered.
- The modal nearly fills the viewport, leaving only a **thin margin (~36–48px)** all around where the dark gradient backdrop shows — the `Brand Dashboard` text behind is **fully covered**.
- Backdrop: the gradient dims via an overlay `rgba(10,10,10,0.55)` so the modal (light) reads as the focus and the visible margin is a quiet dark frame.
- Modal surface: Off White `#F5F5F0` (not pure white — tinted to brand), `14px` radius, hairline sand border, soft **tinted** shadow `0 30px 60px -20px rgba(10,10,10,0.45)`.
- Internal scroll: the modal body scrolls inside its own height; header (`Create Campaign` + close) stays **sticky** at the top of the modal so the title and close are always reachable.

### 3b. Layout — multi-column, no ugly wide inputs

Inside the wide modal, lay the form on a **2-column grid** (`grid-template-columns: 1fr 1fr; column-gap: 40px; row-gap: 22px`) so inputs are comfortable half-width, never stretched bars:

- **Full-width (span both columns):** `Campaign title`, `About your product / campaign` (textarea), `Campaign description` (textarea), the `Script negotiation mode` and `Content delivery mode` card-choices, and the final `Launch Campaign` button.
- **Half-width (one column each), paired on a row:**
  - `Brand name` | `Campaign title`? → keep `Brand name` half, next to `Campaign title` **no** (title is important → full). Pair instead: `Target profession/niche` | `Your country`, then `Content language` | `Creator level range`(this one needs width → see 3d), `Budget per creator` | `Creators to hire`, `Exclusivity` | `Usage rights`, `Application deadline` | `Delivery deadline`.
- **Point of Contact** block: `Full name` | `Role / title` on one row, `Work email` | `Phone` on the next.
- Inputs max out at their column width — **never** a single input spanning the full 1080px. Labels sit **above** inputs, `gap: 8px` (skill Rule 6).
- Collapse to single column below ~760px (mobile).

### 3c. Field styling

- Inputs/selects/textareas: Off-white fill, hairline sand border `rgba(160,138,94,0.28)`, `6px` radius, `12–14px` padding, Inter, Charcoal text, Muted-Grey placeholders.
- **Focus:** border → `#A08A5E`, plus a soft sand ring `box-shadow: 0 0 0 3px rgba(160,138,94,0.16)`. No blue focus rings.
- Textareas: comfortable height (`~110px`), resize vertical only.
- Section sub-descriptions (the grey helper text) stay, Muted Grey, ~13px.

### 3d. Creator level range — beige selectors

- Two rows (`Min`, `Max`), each `L1…L5` as a segmented set.
- **Unselected:** off-white fill, sand hairline border, Charcoal label.
- **Selected:** **Warm Sand `#C8B89A` fill, Near Black label**, weight 600 — the requested beige. Remove the black `L1` and the **green `L5` entirely** (green violates §4).
- Between the two rows, the summary line `Accepting Level 1 to 5` stays (Near Black, small, weight 600).
- Selection transition: background/border cross-fade `150ms cubic-bezier(0.16,1,0.3,1)`; on press `scale(0.98)`.
- Apply the **same beige-selected logic** to the other pill/segment choices for consistency — `Compensation type` (`Paid` etc.) selected = warm sand fill; the larger **card choices** (`Script negotiation mode`, `Content delivery mode`) selected = Near Black 1.5px border + faint sand tint `rgba(200,184,154,0.14)` fill (they're bigger, so a full sand fill would be too heavy — a tinted, bordered selected card is the restrained move).

### 3e. Animations (transform/opacity only — 60fps)

- **Open:** backdrop fades `opacity 0→1, 180ms`. Modal `opacity 0→1` + `scale 0.97→1` + `translateY 8px→0`, `220ms cubic-bezier(0.16,1,0.3,1)`. Reads as a soft rise, not a bounce (no elastic — skill motion rule).
- **Staggered fields (subtle):** form groups fade/rise in with `animation-delay: calc(var(--i) * 28ms)` on open — a light cascade, capped so it never feels slow.
- **Close:** reverse — modal `scale 1→0.98`, `opacity→0`, `140ms`; backdrop fades out.
- **Segment/level select:** color + `scale(0.98)` tap feedback.
- **Inputs:** border/ring transition `150ms`.
- **Launch button:** hover `translateY(-1px)`; active `scale(0.99)`.
- **`prefers-reduced-motion`:** disable scale/translate/stagger; keep instant opacity only.
- **Close affordance:** replace the bare `X` with a quiet icon button (Charcoal, hairline, `6px` radius) with hover; keeps it tappable (≥36px target).

---

## 4. Nav / destructive actions (carry-over)

- Remove pill (G1); nav uses plain wordmark text on the dark dashboard → Off White wordmark.
- The **red `Delete Account`** still violates §4 — same recommendation as `profile page.md §7`: quiet Charcoal/outline treatment, not a red resting fill. Flagged, not silently changed.
- Bottom tab bar (`Profile · Market · Store · Settings`): keep, align to Inter, active tab (`Market`) in Near Black/Off White by theme with a small sand dot indicator (already present) — quiet.

---

## 4b. Themes — keep both (decided)

Light and dark are **both** kept for this page. The dashboard gradient exists in two treatments:
- **Dark:** `linear-gradient(135deg,#0A0A0A,#1C1B18 55%,#2D2D2D)` + faint sand glow. Off-white text.
- **Light:** `linear-gradient(135deg,#F5F5F0,#F0ECE2 55%,#E9E3D5)` + warm sand glow. Near-black text, solid near-black CTA.

Samples: `market-sample.html` (dark) and `market-sample-light.html` (light). Theme decision for the rest of the app is TBD per page.

## 4c. Create Campaign — composer (DECIDED, green-lit)

The **full-page composer with live preview** is the chosen approach (see §3). Reframes form-filling as crafting a public brief creators will judge — on-brand "earned, serious." Sample: `campaign-composer-sample.html` (light/dark toggle). The modal is retired; §3a geometry is superseded, all field/level/animation rules carry over.

## 5. Do / Don't

**Do:** tonal dark gradient (mono + faint sand) · big left-aligned heading · bigger lower CTA with composed empty state · landscape near-bleed modal with thin gradient frame · 2-column form, labels above · beige-selected level range · transform-only animations with reduced-motion fallback · `Launch Campaign`.

**Don't:** multi-hue/decorative gradient · centered tiny heading · full-width stretched inputs · green (or any bright) selected states · pure white modal · animate width/height/top/left · bring back the pill · red resting CTAs.
