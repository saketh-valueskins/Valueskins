# Profile Page — UI Spec

> Template: **Profile** (light theme).
> Inherits `_global-conventions.md` (no pill anywhere · Inter everywhere · sand-only accent) and obeys `BRANDING.md` (source of truth).
> Status: **canonical build = v2 hero.** Primary sample: `_samples_delete_later/profile-page-v2.html` (light/dark). Earlier `profile-page-sample.html` is superseded.

---

## 0. What's changing (summary)

1. **Remove the black oval wordmark pill** (top-left) — per global rule G1.
2. **The ValueSkin is the profile identity** — rendered **large** in a hero card (the space a profile picture would occupy). This is the centerpiece (§2).
3. **`Brand` is a small quiet note** (role caption), not a selectable/toggle pill.
4. **One ValueSkin per context (decided):** on the profile, the big hero skin is the only ValueSkin — **do not** also duplicate the small name-badge here. The small badge is reserved for compact contexts elsewhere (§4).
5. **Type × Tier pills** surface both ValueSkins layers (`Professional` + `Signal · Level 3`).
6. **Inter across everything** — global rule G2 (sitewide).
7. **Light + dark** both supported; the hero card stays dark in both for the premium collectible feel.

---

## 1. Remove the wordmark pill (G1)

Delete the black oval `VALUESKINS` pill top-left. The top nav keeps its links (Profile · Settings · Logout · Delete Account). If brand presence is wanted in the nav, use the **plain wordmark text** left-aligned (Near Black, ~22px, no container) — but on this page the nav can simply start with the links; the pill does not come back.

---

## 2. The ValueSkin hero — the identity space (replaces the avatar/initial)

The `A` initial and the generic-silhouette placeholder are both replaced. The **ValueSkin itself is the profile identity**, shown large where a profile picture would sit.

- **Hero card:** premium dark surface (`linear-gradient(160deg,#0A0A0A,#161512 60%,#20201B)`), sand hairline border, a faint sand radial glow, soft tinted shadow. Stays dark in **both** themes.
- **Framed ValueSkin:** the owned profession skin rendered **large (~150px pixel art)** in a `~190px` framed tile (subtle inner border/glow), with a small **`ValueSkin`** tag in warm sand pinned under the frame. A gentle float animation (`translateY` ±6px, ~5s) gives it life. `image-rendering:pixelated` / `shape-rendering:crispEdges`, palette-tied (off-white figure + sand accents on the dark frame).
- **Why the skin, not a photo:** a profession ValueSkin is shared across a profession — it reads as *personality* (expressive collectible pixel art) while staying *not too unique* (a recognizable class, not a one-off). A personal photo would swing to "too unique." This is the deliberate identity choice.
- Beside the frame: the identity meta (§3–§4b).

> Future option (not now): if users upload a real photo/logo, the ValueSkin can become a corner "equipped" emblem on that avatar rather than the whole hero. For V1 the skin is the hero.

---

## 3. `Brand` — a small note, not a control

- The `Brand` pill (currently a bordered, selectable-looking chip with a building emoji) becomes a **small, quiet text note placed directly beneath the avatar**, centered under it.
- Treatment: uppercase or sentence-case small label, ~12px, Muted Grey / Charcoal, weight 500, letter-spacing ~`0.08em`. **No border, no fill, no emoji, no chip shape** — it reads as a caption stating account type, not something you click.
- Example: `BRAND` (small caps, muted) sitting ~10px under the avatar.
- The `Edit Profile` action stays as its own quiet outlined button (Deep-Sand hairline border, 6px radius), but moves to sit with the name/actions area rather than beside the old pill.

---

## 4. Identity meta (name, role, skin, tier)

Beside the hero frame:

- **Name** (`Anshul`), ~34px, weight 700, `--head` colour.
- **`Brand` role caption** directly under the name — small, uppercase, `0.12em` tracking, Muted Grey, weight 600. No border/fill/emoji/chip (§3 rules).
- **`Wearing App Developer · Technology`** line — ties the profile to the worn ValueSkin and the Store's language (`App Developer` emphasized).
- **Type × Tier pills** (surfaces both ValueSkins layers, `Project.md §28`): `Professional` as a **solid warm-sand** pill (Type), `Signal · Level 3` as a **sand-outline** pill (earned Tier). Sand only; no other colour.
- **`Edit Profile`** — quiet outlined button in the actions row.

## 4b. One ValueSkin per context (the dedup decision)

- **On the profile page, the big hero skin is the ONLY ValueSkin. Do NOT also place the small pixel badge next to the name here** — same artwork twice reads as duplication, not two signals.
- **The small name-badge is reserved for compact contexts** where the hero can't appear: campaign listings, search results, the deal room, comments, nav. There it's the traveling "verified ValueSkins identity" mark — inline, ~name cap-height, crisp-edged pixel art, palette-tied.
- **Rule:** *one ValueSkin per view.* Big hero on the profile; small badge everywhere compact. Never both in the same view.

> The sample renders the App Developer skin large in the hero; the small inline badge is shown there only to preview the compact mark — in the shipped profile it is omitted per the rule above.

---

## 5. Font — Inter everywhere (G2)

Applies sitewide, recorded globally in `_global-conventions.md`. On this page specifically: name, stats numbers, `ACCOUNT` label, field labels/values, buttons, nav — all `Inter`. No exceptions, no secondary font.

| Element | Weight | Size (desktop) |
|---------|--------|----------------|
| Username | 700 | ~28px |
| Stats numbers (Deals/Rating/Spent) | 700 | ~26px |
| Stats labels | 400 | ~13px, Muted Grey |
| `ACCOUNT` section label | 700 | ~12px, `0.08em` tracking, Muted Grey |
| Field labels (Email, Role…) | 400 | ~15px, Charcoal |
| Field values | 500 | ~15px, Near Black |
| Nav links | 500 | ~15px |

---

## 6. Colour mapping (light theme)

| Element | Token | Hex |
|---------|-------|-----|
| Page surface | Off White | `#F5F5F0` |
| Cards | Off White, hairline border | border `rgba(160,138,94,0.22)` |
| Username / values / stat numbers | Near Black | `#0A0A0A` |
| Labels / captions / `BRAND` note | Muted Grey→Charcoal | `#B8B4AC`/`#2D2D2D` |
| Avatar circle | Off-white shade | `#E8E6E0` |
| Avatar silhouette | Muted Grey | `#B8B4AC` |
| Badge figure / laptop accent | Near Black / Deep Sand | `#0A0A0A` / `#A08A5E` |
| Dividers in ACCOUNT card | Sand hairline | `rgba(160,138,94,0.18)` |
| `Edit Profile` button | Sand hairline outline | border `rgba(160,138,94,0.28)` |

## 7. Delete Account + Logout — flag (G3)

The current **red `Delete Account`** button (top-right) and red destructive block violate BRANDING §4 ("no bright/red CTAs"). Recommendation, not silently changed:

- Make destructive actions **quiet, not loud**: text-only or hairline-outline treatment in Charcoal, with a confirmation step carrying the weight instead of color. Reserve any red strictly for the *inside* of a confirm dialog if at all — never as a resting-state page button.
- `Logout` (currently solid black) is fine as a quiet near-black/outline button; keep it calmer than the primary content.
- If you want to keep a red for delete, confirm and I'll spec a restrained version; otherwise the sample shows the on-brand quiet treatment.

---

## 7b. ValueSkin hero treatment (preferred — v2)

The ValueSkin is the **centerpiece** of the profile, not just a tick by the name. Preferred layout (sample: `profile-page-v2.html`, light/dark toggle):

- A **hero identity card** (premium dark surface, sand glow, both themes) with the owned ValueSkin rendered **large** (~150px pixel art) in a framed tile, a small `ValueSkin` sand tag under it, and a gentle float animation.
- Beside it: name + the small inline ValueSkin badge (verified-tick slot), the `BRAND` role caption, a `Wearing App Developer · Technology` line, and **Type × Tier** pills (`Professional` solid sand + `Signal · Level 3` outline) — surfacing both ValueSkins layers from `Project.md §28`.
- Stats move into a clean 3-up divided strip below; Account card below that; quiet Delete (G3).

This makes the ValueSkin the identity anchor and ties directly to the Store's collectible language. The §2–§4 rules still hold; this is the elevated composition.

## 8. Do / Don't

**Do:** remove the pill · default silhouette avatar · `BRAND` as a small muted caption under the avatar · pixel ValueSkin badge (~name height) after the username · Inter everywhere · sand-only accents · quiet destructive actions.

**Don't:** keep the oval pill · use the `A` initial · make `Brand` look clickable/chip-like · oversize or sharpen the badge · introduce bright/red resting CTAs · use any non-Inter font.
