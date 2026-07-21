# Deal Room (Creator Side) — UI Spec

> Template: **Deal / negotiation experience** — creator's view of a campaign. Light + dark (G5).
> Inherits `_global-conventions.md` (no pill · Inter · sand accent · G4/G5 · 16px scale) and obeys `BRANDING.md`. Business/logic flags live in `flagged.md`.
> Status: redesign spec. Samples: `deal-sample.html` (first pass) and **`deal-sample-v2.html` (preferred — premium, alive)**.

---

## 0. The goal

Make closing a deal feel **dramatically easier and more professional than DMs** — no long unprofessional back-and-forth. Terms and money happen in **structured, one-tap controls**; chat is only for clarifying. The creator always knows exactly what they're agreeing to.

## 1. Why the first pass felt "dead / like a toy" (and the fixes)

Diagnosis → correction, applied in v2:

1. **Flat sameness** (every element the same weight/box) → give the offer a single **dark hero anchor**; everything else is quieter. Contrast, not uniformity.
2. **Soft rounded pastel boxes on white = candy** → sharper geometry, thinner hairlines, **deep-sand text/lines instead of pale filled tints**.
3. **No dark anchor** (the premium moments elsewhere are dark) → the **offer sits on the dark brand surface** — instantly reads expensive.
4. **Emojis cheapen it** → remove all emoji; use thin SVG icons (shield, check).
5. **No type hierarchy** → the offer amount is **large and confident**; labels small and quiet.
6. **Inert** → purposeful life: offer **rises + counts in**, stepper **fills**, brand shows **"online"**, chat shows a **typing indicator** then the message. Restrained, not carnival (BRANDING §10.5).

## 2. Structure (v2)

- **Header row:** back to marketplace + brand mini (logo, name, `online` pulse, campaign line). Brand name/logo → brand page.
- **Offer hero (DARK — the anchor):** `Offer from [brand]`, the **amount large**, a **net-after-fee line** (§4), and a one-line **escrow** explainer. Actions live here: **Accept · Counter · Decline**. `Counter` reveals a single number field (progressive disclosure). On accept → an `Agreed — escrow funded` state.
- **Terms strip (highlighted, scannable, not centerpiece):** `Deliverables · Compensation · Deliver by · Usage/Review` in a clean 4-up. This is what they're "getting into," visible at a glance.
- **Tag row:** `Intent`, `Content type`, and `Match %` as small chips (§5).
- **Progression:** thin animated stepper `Brief → Offer → Agreed → In progress → Paid` (sand/near-black, **never green**).
- **Chat (clearly separate):** labeled "questions & rapport — not terms," with hint that money/terms are handled above. Gated until the creator accepts/counters. Messages animate in; **"logged with UTC timestamp"** note (the on-record moat).

## 3. Chat vs terms — differentiate (decided)

The structured **deal controls** (offer/counter/accept) are visually and functionally **separate** from freeform **chat**. Never negotiate price in prose — that's the DM problem. Terms = one tap, on the record; chat = clarify only.

## 4. Fee transparency (implement — see `flagged.md` F3)

Show the creator their **net after the 12% platform fee** on the offer (amount − 12%), with TDS noted as handled at payout. **Compute this at the user level** — the value is calculated per offer for the logged-in creator, not a typed constant.

## 5. Intent, content type & match (decided — `flagged.md` F7)

- Show **Intent** (Campaign / Ambassador / …) and **Content type** (Product Review / Tutorial / …) as small chips.
- **Content type is NOT gated by the ValueSkin** — they're independent axes. A given profession can do any content type.
- **Match %** is derived from the creator's **ValueSkin niche + level + language**, not content type. Label it so the creator understands why they matched.

## 6. Compensation is a field (`flagged.md` F6)

Keep compensation configurable: `Paid · Paid + Barter · Barter · Performance-based`. Samples show one example value for the visual only; the build reads the campaign's actual value into the terms strip and offer.

## 7. Deal initiation — request/accept (decided — `flagged.md` F8)

Deals open through a **structured offer → accept/counter** that unlocks the chat. **No cold open-DM.** This is the anti-spam, professional, on-record model (vs the DM chaos we're replacing). Chat only exists inside an engaged deal.

## 8. Brand page (new)

A real-feeling brand profile (sample: *Northwind Labs* — dev tooling, Bengaluru): dark brand hero (logo, name, category/location, `Verified · GST checked · replies in ~Nh`), a stats strip (campaigns run, avg deal, creator rating, on-time pay), an About paragraph, and past campaigns. Reachable from the offer/marketplace. It should make the creator *feel* who they're dealing with — legitimacy at a glance.

## 9. Colour / motion / theme

Near-black + sand only; **no green** (recolor all success/progress from the source screenshots). Dark offer anchor in both themes. Motion: transform/opacity, count-up, stepper fill, typing indicator, online pulse; `prefers-reduced-motion` resolves everything static. Light + dark (G5). Pill removed; destructive actions quiet (G3).

## 10. Do / Don't

**Do:** dark offer anchor with a big confident amount · terms strip highlighted + scannable · structured actions separate from chat · request/accept gating · net-after-fee shown · intent/content-type as tags · match from ValueSkin+level+language · brand page that feels legit · purposeful life · no emoji.

**Don't:** flat same-weight boxes · pastel candy fills · green anywhere · emojis · negotiate terms in chat · gate content type by ValueSkin · airplane-cockpit controls (sliders + checklist + dual rejects) · the pill · hardcode a currency in the spec (see `flagged.md` F1).
