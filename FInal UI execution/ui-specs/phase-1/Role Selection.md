# Role Selection (Front Door) — UI Spec

> Template: **Welcome / role selection** — the first screen after landing. Light + dark (dark is the hero default).
> Inherits `_global-conventions.md` and obeys `BRANDING.md` (see §10.6 — front door).
> Status: **approved build.** Samples: `role-selection-sample.html` (dark), `role-selection-light-sample.html` (light).

---

## 0. Intent

Deliver the product in the first second: *a trust marketplace where creators and brands close deals on earned reputation.* Communicate it, prove it, and route the user — fast.

## 1. Structure

- **Dark premium surface** (tonal gradient + faint sand glow) as the default hero; light supported via toggle.
- **Hero:** wordmark + `TRUST · EARNED · SERIOUS`, then the headline `Where creators and brands close deals on earned trust.` (`earned trust` in sand), sub `Verified identities. Real reputation. Money that actually moves.`
- **Proof counters** (count-up on load): `Creators verified · Deals completed · ₹ Paid to creators`. The money number is the converter (`Project.md §13`).
- **Role split:** two large cards, `I'm a Creator` / `I'm a Brand`. Hovering one **spotlights it and dims the other**; the hovered card lifts, its pixel skins tilt, hidden feature lines reveal, and a `Continue as … →` appears.
- **Activity ticker** (bottom): slow marquee of recent platform activity, pauses on hover.
- **Drifting ValueSkin identities** in the background — subtle, low opacity, theme-repainted.
- Footnote: `You can change your role anytime in settings.`

## 2. Motion

Staggered entrance (wordmark → headline → proof → cards → ticker); count-up stats; split-spotlight on hover; gentle drift; ticker scroll. Transform/opacity only; `prefers-reduced-motion` disables all and shows everything static.

## 3. Copy

Terse, active, no exclamation (§2). Headline states the product; sub states the proof; cards state the payoff for each side (creator = earned reputation + paid; brand = verified creators + outcomes).

## 4. Data (honesty flag)

Proof counters + ticker are **illustrative** pre-launch. Ship them only when real, or frame explicitly as "building in public" live numbers — do not imply traction you don't have.

## 5. Do / Don't

**Do:** dark hero · instant product statement · money-moved proof · split-spotlight roles · pixel identity motif · restrained motion · both themes.

**Don't:** generic two grey boxes · vague "What's your role?" with no product context · bright/multi-hue gradient · carnival animation · fake-looking round numbers · the pill.
