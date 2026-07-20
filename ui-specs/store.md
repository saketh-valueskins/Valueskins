# Store ("ValueSkins Closet") — UI Spec

> Template: **Store** — ValueSkin purchase. **Shared by creators AND brands** (same closet). Light + dark (G5).
> Inherits `_global-conventions.md` (no pill · Inter · sand accent · G4/G5) and obeys `BRANDING.md`.
> Status: redesign spec + full purchase flow. Sample: `_samples_delete_later/store-flow-sample.html` (interactive: browse → buy → Razorpay → slap-to-profile).

---

## 0. What the Store is

One closet, both sides. Creators and brands buy a **ValueSkin** — a **pixel-character** identity for their profession. The pixel characters are the **defaults** (one per profession); they're the mark that appears on the profile hero and, small, everywhere compact. **One active skin at a time** (`0/1 max`), price **₹950** one-time.

> The default characters are illustrated pixel avatars (colorful character art). Character art *may use colour* — it's content/illustration, not UI chrome, so the sand-only accent rule (§4) applies to the interface around it, not to the avatars themselves. The sample uses generated placeholder pixel characters; swap in the final art, keeping the slot/size/flow.

## 1. Closet (browse)

- Title `ValueSkins Closet`, sub line, minimal search with live filter.
- **Airy category grid** (2-col): hairline tiles (not filled grey boxes), each `Category name` + `N skins` count + chevron. Hover = sand tint + lift. (Declutters the current filled-box build.)
- Click a category → **category modal**.

## 2. Category modal (skin grid)

- Header: `Category` + `0/1 max` chip + close.
- Note: `Tap any badge to purchase (₹950) and instantly apply it as your ValueSkin.`
- 2-col grid of **skin cards**: pixel character + profession name. Hover lifts with a soft warm shadow; tap selects.
- Modal animates in (fade + scale-up), backdrop dims.

## 3. Confirmation (new — before payment)

Clicking a skin opens a **confirm step** (don't jump straight to pay):

- The chosen skin shown **large**, its name, `One-time · ₹950`, and a line: *"This becomes your ValueSkin — the identity brands see everywhere. One active skin at a time."*
- Buttons: `Cancel` (quiet outline) · `Continue to payment` (solid near-black / off-white).

## 4. Razorpay checkout (demo/mock)

- A **Razorpay-style checkout** panel: merchant row (ValueSkins · secure), amount `₹950`, payment methods (UPI selected default · Card · Netbanking), `Pay ₹950`, and a clear **demo/mock** disclaimer (no real charge).
- On pay → **processing** (spinner, "Processing payment…") → **success** ("Payment complete · Applying [skin]…").
- Real build: wire to Razorpay per `Project.md §26` (2.36% effective, activation gated on registration). This sample is a faithful mock only.

## 5. The "slap" — apply to profile (the payoff)

On payment complete, the skin **slaps onto the profile with animation**, then lands the user on the **profile page**:

1. Route to the profile view; hero frame starts **empty**.
2. A large clone of the skin appears center-screen (rises/scales in, slight rotate).
3. It **slams** into the hero frame — an ease-in (accelerating) transform so it reads as impact, not a glide.
4. On landing: **impact ring** pulse on the frame + a quick **card shake**, the real skin drops into the frame, `Wearing [skin] · [category]` updates, and an **`Equipped`** toast appears.
5. Transform/opacity only (FLIP-style: measure target rect, animate transform); `prefers-reduced-motion` skips the flight and just places the skin.

This is the reward moment — the purchase visibly *becomes* your identity.

## 6. Colour / theme / chrome

- Light + dark (G5 light tokens: white cards, strong text, near-black UI). Sand for accents/selected/focus only; **no red/green/blue** UI; character art may be colourful.
- No pill (G1); quiet destructive actions (G3). Bottom tabs kept, `Store` active.

## 7. Flow recap

`Closet → category modal → pick skin → confirm (₹950) → Razorpay (mock) → processing → complete → slap-to-profile → Profile (equipped)`

## 8. Do / Don't

**Do:** shared creator/brand closet · pixel-character defaults · airy category tiles · confirm before pay · Razorpay mock with clear demo label · cinematic slap-to-profile · one active skin · both themes.

**Don't:** filled grey category boxes · skip the confirm step · imply a real charge in the demo · use UI colour beyond sand · keep the pill · duplicate the skin mark in one view (one ValueSkin per view).
