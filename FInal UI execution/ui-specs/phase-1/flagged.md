# Flagged — deferred decisions & things to hardcode at the end

> A running log of cross-cutting items surfaced during UI/UX work that are **not** UI decisions — they're business/logic/data decisions to lock and hardcode later. The page specs stay UI-only and reference this file. Keep updating as new flags appear.

---

## F1 — Currency (deferred to final hardcode)
- The product is **INR / India-only for V1** (per `Project.md §7`). Some source screenshots showed USD (`$`).
- **UI specs deliberately do NOT hardcode a currency symbol** — samples are currency-agnostic placeholders. The real symbol/formatting gets set once, at the end.
- Action later: hardcode INR formatting (`en-IN`) app-wide.

## F2 — Escrow vs "advance" (model note — not a UI centerpiece)
- Some source UI showed a payment split like `Advance 70% / On approval 0%`. This **contradicts the escrow model** in `Project.md §4/§9`: money is **held in escrow and released on approval** — "brands only pay for work they approve."
- **Correct model to build:** brand funds the deal into **escrow on agreement** (held), released to the creator **on delivery + approval**. No upfront advance paid *to the creator* before approval.
- Not urgent per founder; recorded here. Deal specs describe the escrow model, not an advance.

## F3 — Platform fee shown as net-to-creator (a real change to implement)
- Surface the **12% platform fee** transparently: show the creator their **net after the fee** (deal amount − 12%), with TDS handled at payout.
- **Implement at the user/account level:** compute and display net per deal/offer for the logged-in creator. This is a functional change, not just cosmetic — the value must be calculated, not typed.
- Also referenced in `deal.md`.

## F4 — Pricing number consistency
- Public/landing pricing must read **12%** (brand-side fee, `Project.md §7`), never the old `2%`. Don't lead with the number (Tata Nano rule); frame vs agency 15–25%. (Handled in `welcome screen.md`; logged here so the number stays consistent everywhere.)

## F5 — Payments provider
- **Razorpay only** for V1 (India). Any "Stripe" mention is premature — drop until real (`Project.md §26`, §18).

## F6 — Compensation is a data field (not a fixed label)
- Compensation type is a **field** with options `Paid · Paid + Barter · Barter · Performance-based` (`Project.md §7/composer`). Samples show one example value for illustration only; the build keeps it configurable per campaign.

## F7 — Content type ≠ ValueSkin (decided)
- Content type (Product Review, Tutorial, Ambassador…) is an **independent lightweight tag**, NOT gated by the ValueSkin/profession. Match score derives from **ValueSkin niche + level + language**, not content type. (Council decision; implemented in `deal.md`.)

## F8 — Deal initiation = request/accept (decided)
- Deals open via a **structured offer → accept/counter** flow that unlocks chat; **no cold open-DM**. Keeps the on-record moat clean (`Project.md §23`). (Council decision; in `deal.md`.)

---

*Add new flags with the next `F#`. UI specs stay UI-only; business/logic/data decisions live here.*
