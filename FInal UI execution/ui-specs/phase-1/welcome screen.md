# Welcome Screen (Public Landing) — UI Spec

> Template: **Public marketing landing** (pre-auth). Apple-style scroll-interactive. Light default + dark (G5).
> Inherits `_global-conventions.md` and obeys `BRANDING.md`. Distinct from `Role Selection.md` (that's the post-entry role picker; this is the marketing front page).
> Status: redesign spec. Sample: `_samples_delete_later/welcome-screen-sample.html`.

---

## 0. Scope

Keep the existing content and structure. This pass is **color correction + Apple-style scroll interactivity**, plus a few flagged suggestions (§5). Sections stay: Hero → How It Works (4 steps) → For Creators / For Brands → Pricing → Final CTA → Footer.

## 1. Color correction (the required fixes)

1. **Remove the oval pill** (G1) — nav uses the plain `VALUESKINS` wordmark; header gets a hairline border only after you scroll.
2. **Remove the duplicated tagline** under the hero wordmark (it renders `TRUST · EARNED · SERIOUS` twice). One lockup only.
3. **Remove the solid black divider band** above the footer — replace with a single hairline (same fix as `login page.md`). Footer sits on the one surface.
4. **Palette:** off-white gradient surface, `STEP 0X` labels and `→` bullets in **deep sand**, white cards with sand hairlines, `Get Started` / `Create Your Account` solid near-black, `Sign In` outline. No black slab, no bright colour.
5. **Light-mode tokens** per G5 (strong text, white cards); dark supported via toggle.

## 2. Apple-style scroll interactivity (the main add)

Restrained, premium, transform/opacity only:

- **Hero parallax + fade:** on scroll, the hero headline drifts up slightly and the whole hero fades as you leave it (scroll-linked opacity/transform). A `Scroll` hint with a bobbing chevron.
- **Staggered scroll reveals:** every section/card fades + rises as it enters the viewport (IntersectionObserver), steps staggered `--i * 90ms`.
- **Opposing reveal:** `For Creators` slides in from the **left**, `For Brands` from the **right** — Apple's split-reveal signature.
- **Count-up:** the pricing number counts up when its section scrolls into view.
- **Sticky header:** transparent over the hero, gains a hairline border once scrolled.
- **Drifting ValueSkin identities** in the hero background — faint, theme-painted, ties to the brand's pixel language.
- **`prefers-reduced-motion`:** all reveals resolve to visible, parallax/count-up disabled.

> Deliberately not a carnival: no pinned scroll-jacking or horizontal hijack in v1 (can add a pinned "How It Works" sequence later if you want more drama). Motion serves clarity, per `BRANDING §10.5`.

## 3. Content (unchanged, except pricing)

Hero headline `The marketplace for creators and brands`; escrow-backed sub; 4 steps; two benefit columns; **reshaped pricing (§3a)**; final CTA; footer with Legal / Data & Privacy / Contact (founder email + phone kept).

### 3a. Pricing — reshaped (resolves the old `2%`)

- **`2%` removed.** Corrected to **12%** (the confirmed brand-side fee, `Project.md §7`).
- **No longer led with a giant number** (Tata Nano rule, BRANDING §1). Instead the section leads with the trust framing — *"Pricing that only wins when you do · No subscription, no upfront fees, you only pay when a deal completes"* — and presents 12% as a **calm comparison**: `ValueSkins 12%` vs `Typical agencies 15–25%`, with the line *"Less than half of what agencies charge — and only when the work is done."*
- 12% is a **strength** here because it's visibly cheaper than agencies — so it's shown as a favourable contrast, not a headline price. Moderate size, deep sand on the 12%, muted on the agency figure.

## 4. Motion / theme

Sand accents only; light default (marketing/off-white context per BRANDING §10.1) with dark toggle. Buttons lift on hover, press-scale on active.

## 5. Suggestions — resolved

1. ~~Pricing `2%` vs `12%`~~ **Resolved** → 12% (§3a).
2. ~~Giant price number leads with price~~ **Resolved** → reshaped to a calm agency comparison (§3a).
3. **Escrow copy "Razorpay or Stripe"** → Stripe dropped (Razorpay/India-only, `Project.md`). Done in sample.

## 6. Do / Don't

**Do:** keep content · remove pill + duplicate tagline + black band · sand accents + white cards · scroll reveals, hero parallax, opposing panels · sticky hairline header · drifting pixel identities · 16px/rem type scale (G6) · reduced-motion safe.

**Don't:** lead with a giant price number · claim Stripe or the old 2% · black divider band · bright colour · scroll-jack the whole page · the pill.
