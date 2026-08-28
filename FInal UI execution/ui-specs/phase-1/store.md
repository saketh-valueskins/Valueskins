# Store ("ValueSkins Closet") — UI Spec

> Template: **Store** — ValueSkin purchase. **Shared by creators AND brands** (same closet). Light + dark (G5).
> Inherits `_global-conventions.md` (no pill · Inter · sand accent · G4/G5) and obeys `BRANDING.md`.
> Status: **finalized** — master–detail layout + full purchase flow. Layout sample: `_samples_delete_later/store-list-2pane-sample.html` (list + detail). Purchase-flow sample: `_samples_delete_later/store-flow-sample.html` (buy → Razorpay → slap-to-profile).

---

## 0. What the Store is

One closet, both sides. Creators and brands buy a **ValueSkin** — a **pixel-character** identity for their profession. The pixel characters are the **defaults** (one per profession); they're the mark that appears on the profile hero and, small, everywhere compact. **One active skin at a time** (`0/1 max`), price **₹950** one-time.

> The default characters are illustrated pixel avatars (colorful character art). Character art *may use colour* — it's content/illustration, not UI chrome, so the sand-only accent rule (§4) applies to the interface around it, not to the avatars themselves. The sample uses generated placeholder pixel characters; swap in the final art, keeping the slot/size/flow.

## 1. Closet (browse) — **master–detail, two-pane (FINAL)**

Retire both the filled-grey-box grid **and** the category *modal*. The closet is a **two-pane master–detail** layout — this fills the screen width (no empty sides) and keeps browsing on one screen.

- **Shell:** `max-width:1180px`, centered, `display:grid; grid-template-columns:380px 1fr; gap:32px; align-items:start`.
- **LEFT — the category list (master):** title `ValueSkins Closet`, sub, minimal search (live filter), then a **single-column list** of professions:
  - Rows separated by **hairlines** (no filled boxes), each = `NN` index · category name · owned dot (if owned) · `N skins` (right, tabular) · chevron.
  - Hover: sand tint + slight `padding-left` nudge + chevron slides. **Selected row:** sand left-border + soft sand tint.
- **RIGHT — the detail pane:** `position:sticky; top:92px`, bordered card, `min-height ~420px`.
  - **Default (nothing selected):** a quiet **Your Closet** state — the owned/equipped skin + "Pick a profession on the left to browse and buy more skins."
  - **On select:** header (`Category name` + `N skins · 0/1 owned` chip), the note `Tap a badge to purchase and instantly apply it as your ValueSkin. One active skin at a time.`, then a **2-col grid of skin cards** (pixel character + name + `Acquire` / `Equipped`).
- **Responsive ≤900px:** collapse to one column; the detail pane moves **above** the list (`order:-1`) so a selection is visible; on narrow screens selecting a category can push the detail into view.
- No modal, no filled boxes, no empty side gutters.

## 2. Acquiring a skin (from the detail pane)

- Tapping a skin card's **`Acquire`** opens the **confirmation step** (§3) → Razorpay (§4) → slap-to-profile (§5). `Equipped` marks the owned one.
- The `0/1 max` / one-active-skin rule still holds.

## 3. Confirmation (new — before payment)

Clicking a skin opens a **confirm step** (don't jump straight to pay):

- The chosen skin shown **large**, its name, `One-time · ₹950`, and a line: *"This becomes your ValueSkin — the identity brands see everywhere. One active skin at a time."*
- Buttons: `Cancel` (quiet outline) · `Continue to payment` (solid near-black / off-white).

## 4. Razorpay checkout (demo/mock)

- A **Razorpay-style checkout** panel: merchant row (ValueSkins · secure), amount `₹950`, payment methods (UPI selected default · Card · Netbanking), `Pay ₹950`, and a clear **demo/mock** disclaimer (no real charge).
- On pay → **processing** (spinner, "Processing payment…") → **success** ("Payment complete · Applying [skin]…").
- Real build: wire to Razorpay per `Project.md §26` (2.36% effective, activation gated on registration). This sample is a faithful mock only.

## 5. The "slap" — apply to profile (the payoff) — build-ready

On payment complete, the skin **slaps onto the profile**, then lands the user on the **profile page**. Reference image: `phase-2/slap-animation-storyboard.svg`. Exact spec (FLIP: measure the target frame rect, animate a fixed clone with `transform`/`opacity` only):

1. **Route to profile;** the hero ValueSkin frame starts **empty**.
2. **Create the flyer** — a fixed clone of the purchased skin, **220px**, centered at viewport center. Initial: `transform: scale(0.3) rotate(-8deg); opacity:0`.
3. **Phase 1 — rise in (≈320ms):** `transition: transform .32s var(--ease), opacity .2s ease;` → `transform: scale(1.15) rotate(3deg); opacity:1`. (Skin swells at center.)
4. **Hold ~360ms,** then measure the frame's rect. Compute the translate delta (frame center − viewport center) and scale `k = frame.width*0.8 / 220` (≈0.53).
5. **Phase 2 — SLAM (≈340ms):** `transition: transform .34s cubic-bezier(0.5,0,0.85,0.2)` (ease-**in** = accelerates → reads as impact, not a glide) → `transform: translate(Δx,Δy) scale(k) rotate(0)`.
6. **On land (`transitionend`):**
   - Place the **real skin (150px)** into the frame; remove the flyer.
   - **Impact ring:** frame plays `impact .5s var(--ease)` — `box-shadow` ring `0 0 0 0 → 0 0 0 18px → 0` in `rgba(200,184,154,0.6 → 0)`.
   - **Card shake:** hero card plays `shake .4s ease` — `translateX: 0,-6,5,-3,2,0`.
   - Update `Wearing [skin] · [category]`; slide up an **`Equipped`** toast (near-black pill, sand accent) for ~3.2s.
7. **`prefers-reduced-motion`:** skip the flight entirely — place the skin in the frame directly, no ring/shake.

Timings (copy): entrance `320ms` ease-out · hold `360ms` · slam `340ms` ease-in · impact ring `500ms` · shake `400ms` · toast visible `3200ms`. This is the reward moment — the purchase visibly *becomes* the identity.

## 6. Colour / theme / chrome

- Light + dark (G5 light tokens: white cards, strong text, near-black UI). Sand for accents/selected/focus only; **no red/green/blue** UI; character art may be colourful.
- No pill (G1); quiet destructive actions (G3). Bottom tabs kept, `Store` active.

## 7. Flow recap

`Closet (list) → select category → detail pane → Acquire skin → confirm → Razorpay (mock) → processing → complete → slap-to-profile → Profile (equipped)`

## 8. Do / Don't

**Do:** shared creator/brand closet · pixel-character defaults · **two-pane master–detail (category list left, skins detail right)** · fill the width (no empty side gutters) · confirm before pay · Razorpay mock with clear demo label · cinematic slap-to-profile · one active skin · both themes.

**Don't:** filled grey category boxes · **category modal** (retired — detail pane replaces it) · a lonely narrow centered column with empty sides · skip the confirm step · imply a real charge in the demo · use UI colour beyond sand · keep the pill · duplicate the skin mark in one view.
