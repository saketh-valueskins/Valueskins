# ValueSkins — Project Master Document

> Last updated from founder strategy session (ValueSkins type layer, seriousness filter, niche taxonomy — see §28). Prior session: disintermediation, moats, gateway economics, incorporation & liability.
> This is a living document. Update after every major decision.

---

## 1. The One-Line Pitch

A marketplace where creators and brands close paid campaigns — with a verified identity layer (ValueSkins) that replaces agency trust with earned, public reputation, and an outcome layer that proves which rupee came back.

> **Strategic note (this session):** the pitch says creators and brands close deals "directly." Internally, be honest that *direct* is also the leak. The introduction evaporates the instant it's delivered; a one-time match cannot defend a recurring fee. The defensible business is not the match — it is being the **financial trust layer + operational backbone + outcome layer** both sides keep needing on every deal. See §23.

---

## 2. Vision

**Near-term:** Become the infrastructure layer for creator-brand trust in India. Replace the "trust me" of talent agencies with a transparent, earned, tamper-proof signal.

**Mid-term:** Expand from ad campaigns into an events marketplace, niche creator discovery, a consumer-facing layer where audiences follow ValueSkins-rated creators, and — the higher-margin play surfaced this session — a **supply-manufacturing layer** (train enthusiasts/students into placeable creators). See §24.

**Long-term:** Acquisition by Meta to integrate natively into Instagram's creator marketplace. The pitch is that ValueSkins is the trust and identity layer Instagram never built.

---

## 3. The Problem

The creator economy in India runs on:
- Cold DMs with no verification
- Self-reported media kits anyone can fake in Canva
- Agencies charging 15–25% to do what a platform should do automatically
- Payments that arrive weeks late with no paper trail
- Brands ghosting creators after 3 weeks of back-and-forth
- No standardized way to prove a creator's track record to a new brand
- No honest, actionable read on whether a campaign actually *sold anything* — only vanity metrics (views, likes)

Neither side has a trustless way to evaluate the other. Agencies fill that gap manually, expensively, and unscalably.

---

## 4. The Solution — What We're Building

A two-sided marketplace with differentiation layers:

### Layer 1 — The Marketplace
Brands post campaigns. Creators apply. Deals close. Payments process through Razorpay. Simple, fast.

### Layer 2 — ValueSkins (the USP)
A verified identity layer on every creator's profile. Not a badge you buy. Not a follower count. A level earned purely through completed, paid deals on the platform.

> **Update (this session):** ValueSkins now has TWO distinct layers — a *Type* (intent: Passion / Professional / Hobby) and the earned *Tier* ladder below. They are separate axes; do not merge them. See §28.

5 tiers (the earned Tier layer):
| Level | Name | Deals Required | Profile Change |
|-------|------|---------------|----------------|
| 1 | 🪨 Raw | 0–4 | Default grey frame, no badge |
| 2 | 🌿 Seed | 5–14 | Green frame, leaf badge |
| 3 | ⚡ Signal | 15–34 | Blue frame, bolt badge, hover pulse animation |
| 4 | 🔮 Aura | 35–74 | Purple gradient, crystal badge, higher in discovery sort |
| 5 | 👑 Icon | 75+ | Gold frame, crown badge, "Top Creator" tag |

**Critical design decisions:**
- ~~Levels are cosmetic only — no feature unlocks, no paywalls~~ **Dropped this session.** Higher earned Tier now unlocks real perks — better access/visibility + earning power — rolled out **gradually, one market at a time** (see §28).
- Level increases only on **completed deals** — not accepted, not in-progress, not applied
- Late completions, bad reviews, communication issues go into the **brand's review system only** — separate from level, does not affect level
- Levels cannot be bought. They cannot be gamed.

### Layer 3 — The Hover Video / Pitch Clip
On every creator's ValueSkins profile, hovering plays a **30-second intro video** recorded by the creator — introducing themselves, their niche, and specifically how they'd integrate a brand into their content.

> **Refined (this session):** treat this clip as a *pitch* — how the creator would market a specific brand's product — which makes it the platform's built-in **seriousness filter** (a part-timer won't bother recording one). Doubles as the primary matching signal beyond metrics. See §28.

A brand can scan 10 creators in 5 minutes. One video does the work of 10 cold pitches. This justifies the **one-time ValueSkins purchase** — it sets a creator's profile permanently, not a subscription.

### Layer 4 — The Trust & Money Layer (the real moat — see §23)
Escrow, milestone release, dispute protection, and the system-of-record. This is the layer that survives after the introduction is spent. It is the spine of the business, not a feature.

### Layer 5 — The Outcome Layer (V3+ — see §25)
Real, readable, action-driving data — not vanity dashboards. Which creator drove sales, not views. This is what eventually justifies the commission and welds platform/brand/creator interests together. Carries the heaviest legal and engineering load in the whole product; do not build early.

---

## 5. What We Are Not

- Not a SaaS analytics tool (Qoruz)
- Not an agency-style managed service (Kofluence, One Impression)
- Not a brand subscription tool (Winkl)
- Not cheap. Not budget. Not "the affordable option."

**We are the professional standard.** Accessible pricing, premium presentation. The Tata Nano made "cheapest" its identity. We never lead with price. We lead with trust.

---

## 6. Differentiation from Competitors

| Competitor | Their model | Our gap |
|------------|-------------|---------|
| Qoruz | B2B SaaS for brands, analytics-heavy | No gamification, no creator identity layer, no marketplace |
| Winkl | SaaS + marketplace, brand-first | No reputation system, no trust layer, shutting down (Good Creator Co.) |
| Kofluence / One Impression | Agency model, 15–25% of spend | High cost, human-dependent, doesn't scale |
| Instagram Creator Marketplace | Built into Instagram, invite-only brands | No reputation layer, no gamification, no cross-platform identity |
| JioStarverse | Analytics-driven, Jio-backed | Analytics only, no identity or gamification layer — yet |

**The moat:** ValueSkins becomes the trust signal the industry checks even outside our platform — the way a credit score isn't a bank, it's the thing banks check before lending. When "what's their ValueSkins level" becomes the question brands ask before any deal, we stop being a middleman and become infrastructure.

**Why agencies can't replicate this:** their core product is a human saying "trust me, this creator is good." We automate that into a visible, public signal. Every agency's biggest cost is the humans doing creator vetting. We make that cost zero.

---

## 7. Business Model

### Revenue Streams (sequenced)

**V1 — Transaction fee (launch day) — 12% CONFIRMED (for now)**
- 12% of campaign value, charged to the brand
- Creators pay **no commission** on applied deals (V1) — but Passion/Professional creators pay a one-time ValueSkins activation fee (below). Supersedes the earlier "creators pay nothing — ever" line (decided this session).
- Razorpay processes payment; platform holds briefly; creator paid minus TDS (rate/section to confirm with CA — see §11 note)
- Net platform revenue per ₹50K deal: ~₹4,820 after Razorpay's effective gateway cut (see §17 and §26 — model 2.36%, not 2%)

**V1 — ValueSkins activation fee (one-time, launch day) — DECIDED this session**
- Creator identity activation, priced by **Type** (one-time, not a subscription — sets the profile permanently per §4). NOT a way to buy earned Tier (Raw→Icon), which is never sold.
  - **Hobby: Free** (the on-ramp — liquidity first, limited access)
  - **Passion: ₹499**
  - **Professional: ₹999**
- Upgrade path: pay the difference to move Hobby → Passion → Professional.
- Doubles as a **seriousness filter** (part-timers won't pay) and early cash before deal volume exists.
- Still to confirm (proposed, not locked): minimum per-deal fee (~₹199), international rate (~15% + FX/customs pass-through), barter facilitation flat fee, and a tier-based commission rebate for top tiers (V2 retention lever).

**V2 — Brand subscriptions (post ₹10L GMV/month)**
- ₹2,999–₹9,999/month tiers for brands
- Based on number of campaigns, AI-matching access, analytics depth
- Independent of creator level system

**V3 — Creator premium (month 6+, post-traction only)**
- Small fee (2–3%) on inbound deals creators receive through discovery feed
- Only on deals the platform found for them — not deals they applied to
- Never charge creators for applying or joining

### Pricing rationale
- Indian talent managers charge 15–25% on top of creator's quoted rate — brands already absorb this
- Our 12% brand-side fee is cheaper than every existing alternative and fits the established "brand absorbs facilitation cost" pattern
- India only, INR only until ₹50L+ GMV/month consistently for 3 months

### Pricing-around-the-leak principle (this session)
The 12% match fee is **not** defensible forever on a repeat relationship — once a brand and creator have decided to keep working together, a high per-deal cut is exactly what they route around. The structural answer:
- **Full commission on the first deal**, where the matching value is real and undeniable.
- **Drop to a low platform/SaaS fee on the ongoing relationship** — a small fee they'll happily pay to keep escrow, contracts, and dispute protection.
- You trade a commission you'd have lost entirely for a smaller one you actually keep. **The fee that survives is the one smaller than the hassle of avoiding it.**

### Future direction — performance pricing (V3+)
The endgame is charging commission on **attributable sales**, not on the deal — the version where the data is load-bearing and the cut is justified by outcome, not introduction. This imports every attribution-fairness problem at maximum intensity (see §25). It is a different, harder company hiding inside a feature. Phase-three weapon, not a wedge.

---

## 8. Brand Identity

> **Canonical brand guide lives in `BRANDING.md`** (logo, palette, typography, voice, UI application rules — the source of truth for all design/UI work). The below is a summary.

**What we represent:** Trust. Seriousness. Professional standard for creator-brand relationships.

**Logo / Wordmark (CONFIRMED — the wordmark IS the logo):**
- The word **VALUESKINS** is the mark — **no separate icon or symbol**.
- All-caps, single word, **wide letter-spacing**, geometric sans-serif (Helvetica Neue / Inter / DM Sans).
- Lockup: wordmark with tagline **"Trust · Earned · Serious"** in small, muted caps beneath it, dot-separated.
- Primary treatment: off-white/cream (`#F5F5F0`) on near-black (`#0A0A0A`); reverses to near-black on off-white for light contexts.
- Warm sand (`#C8B89A`) as a sparing accent only. Minimal, high-contrast, no graphic logomark.

**Reference:** KHY by Kylie Jenner — accessible in price, luxury in presentation. Deliberate construction. Restraint and intention. Nothing is loud. The product is affordable but never looks cheap.

**Voice:** Sparse. Confident. Short sentences. Active voice. No exclamation marks in headlines. No startup-speak. No "revolutionary." No "leverage AI to disrupt."

**Colour direction:** Near-black base (#0A0A0A), off-white (#F5F5F0), warm sand accent (#C8B89A), charcoal (#2D2D2D). No primary blues or startup greens.

**Typography:** Wide letter-spacing on headings. Geometric sans-serif (Inter, DM Sans, Helvetica Neue). Never decorative. Never rounded/playful.

**Copy examples:**
- "Your level. Earned." — not "Congratulations! You've levelled up! 🎉"
- "Verified." — not "We've checked and you're good to go!"
- "Brands that mean business. Creators who deliver." — not "Connect with amazing brands and unleash your potential!"

**The Tata Nano rule:** Nano said "world's cheapest car." People didn't want to be seen in it. ValueSkins never mentions cost first. We lead with what it delivers. Price is an afterthought.

---

## 9. Product Decisions (V1)

> **Build status (this session):** Escrow / milestone-hold **core logic is CODED** — the moat spine is being front-loaded exactly as §23 prescribes. Not yet wired to payments; Razorpay integration deliberately deferred until the company is registered via Razorpay Rize (to capture onboarding offers — see §18, §26).

### V1 ships — the complete deal loop end to end

- [ ] Creator profile with ValueSkins level display (cosmetic only)
- [ ] Hover video on creator profile (30-second self-intro)
- [ ] Brand profile with GST verification + domain email check
- [ ] Campaign posting by brand (title, brief, budget, deliverable, deadline)
- [ ] Creator applies to campaign
- [ ] Brand selects creator, deal created
- [ ] Creator submits deliverable (link or file)
- [ ] Brand approves or requests revision (max 2 rounds in V1)
- [ ] Payment released via Razorpay, 10% TDS deducted, creator paid
- [ ] Level updates automatically on deal completion
- [ ] Brand leaves review (star + written note) after deal closes
- [ ] Platform fee invoice auto-generated for brand
- [ ] Creator payout record generated with TDS line
- [ ] Basic dashboard: brand sees campaigns, creator sees deals + level progress
- [ ] Basic server analytics: GMV, deal count, active users
- [~] **Escrow / milestone-hold logic — CORE LOGIC CODED ✅** (hold → milestone/release built; not yet wired to payments). Razorpay deferred until registration via Razorpay Rize captures onboarding offers (§18, §26). Money sits with the platform until deliverable accepted — the moat spine, front-loaded per §23.
- [ ] **Disintermediation sensor (instrumentation)** — track repeat brands, rising deal frequency, brands hiring creators full-time off the back of intros (feeds the academy decision — see §24)

### Explicitly NOT in V1
- Brand × Brand collabs (V2 — biggest moat feature, most unique idea in the whole product)
- AI-powered matching
- Brand subscription tiers
- Advanced analytics / attribution / outcome layer (V3 — see §25)
- Dispute resolution system (handle manually in V1)
- Instagram OAuth integration (V2 — requires 4–8 weeks Meta App Review)
- Supply-manufacturing / academy (V2+ — see §24)
- US/global expansion

---

## 10. Verification Architecture

### Creator verification — V1 (manual)
1. Instagram profile link submitted (Creator or Business account only)
2. Manual review: real posts, real niche, real engagement pattern
3. Phone OTP verified
4. PAN card submitted — dual purpose: TDS legal requirement + real-identity gate (bots don't have PANs)
5. You personally approve first 100 profiles

### Creator verification — V2 (Instagram OAuth)
- Connect Instagram via official Meta OAuth
- Pull directly from Graph API: real follower count, engagement rate, audience demographics, account type confirmation
- Only Creator/Business accounts can authenticate (personal accounts blocked by Meta)
- Requires Meta App Review approval (4–8 weeks)
- API cost: ₹0 from Meta — real cost is engineering time and quarterly maintenance as Meta ships API changes

### Brand verification — V1 (three layers)
1. **GST API check** — free, instant, government-backed. Valid active GSTIN confirms real registered Indian business.
2. **Email domain match** — brand's signup email domain must match their listed website. No Gmail/Yahoo/Outlook for brand accounts.
3. **Manual first-3 review** — personally check website, social presence, campaign brief legitimacy for first 3 brands.

---

## 11. ValueSkins Level Logic

> **Note (this session):** Tiers are no longer cosmetic-only — higher tiers now unlock perks (access + earning power, see §28). The completion-only trigger and the strict separation from the review system below both still stand.

**The only trigger:** a deal is "completed" when the brand marks the deliverable as accepted AND payment is released through the platform. Nothing else counts.

**What does NOT affect level:** late delivery, bad reviews, communication issues, accepted-but-not-completed deals, applied deals.

These go into the brand's review system (separate database table from day one) and affect brand perception, not level. The two systems must stay architecturally separate.

**Decay:** No decay in V1. Level only goes up, never down. Keeps early creators motivated before the market is competitive enough for decay to make sense.

---

## 12. Invoice Specification

**Invoice 1 — Platform fee invoice (company → brand)**
- Company name + GST number
- Sequential invoice number (VS-2025-001)
- Invoice date
- Brand's legal name + GST number + registered address
- Campaign name / Deal ID
- Description: "Platform facilitation fee for influencer campaign"
- Campaign value + platform fee (12%) + GST on fee (18%, SAC code 998361)
- Total payable + payment link
- SAC code: 998361

**Document 2 — Creator payout record (company → creator)**
- Creator's legal name + PAN
- Deal ID + campaign name
- Gross amount, TDS deducted (10% under Section 194R), net amount paid
- Date of payment
- TDS certificate reference (Form 16A — issued quarterly)

---

## 13. Critical Mass & Launch Targets

**Launch cohort:** 100 creators, 10 brands (10:1 ratio)
**Geography:** India only, Mumbai or Pune only to start
**Niche:** D2C brands (skincare, F&B, fashion) + micro-creators (10K–100K followers)
**Target deals in first 60 days:** 15–20 completed deals

| Milestone | Who notices |
|-----------|-------------|
| 20–30 completed deals | Mid-tier creators (100K–500K) |
| ₹5–10L cumulative GMV | Bigger D2C brands |
| 3–5 repeat brands (returning for 2nd+ campaign) | Creator agencies, managers |
| 1–2 recognizable brand logos | All new brands evaluating risk |
| 500+ creators, 50+ brands | Macro creators (500K+), agency conversations |

**The number that converts the skeptical:** not user count — "X creators got paid ₹Y through completed deals." Money moved = platform is real.

---

## 14. Tech & Hosting Stack

### Free tier (V1)
- **Domain:** Cloudflare Registrar ($9.77/year) — free CDN, SSL, DDoS. Already purchased.
- **Frontend:** Vercel (free Hobby, 100GB bandwidth, auto-deploys from GitHub)
- **Backend + database:** Render (free tier — PostgreSQL, 512MB RAM. Cold starts after 15 min — use UptimeRobot to ping every 14 min)
- **Marketing/landing page:** Cloudflare Pages (unlimited bandwidth, free)
- **Email:** Resend.com (3,000 emails/month free)
- **OTP/SMS:** 2Factor.in (~₹0.18/OTP)
- **Analytics:** Posthog (1M events/month free)
- **Error monitoring:** Sentry (free developer plan)

### Free tool stack
- Notion (docs, roadmap, CRM)
- Figma (design, free 3 projects)
- Google Sheets (P&L, expense tracker)
- Zoho Invoice (GST-compliant invoicing, free plan)
- WhatsApp Business (creator community)

### Post-free-tier migration
Move off Render free tier to Render paid or Railway.app once cold starts cost real users — roughly month 3–4 at MVP scale.

---

## 15. Legal, Incorporation & Liability

### Incorporation route — DECISION (this session)
Three options were compared:

| Route | Professional fee | Best for |
|-------|------------------|----------|
| **Self-file (DIY) via MCA SPICe+** | ₹0 (only govt cost) | Cheapest; fine for a simple 2-director Indian-only Pvt Ltd if confident on the portal |
| **Razorpay Rize** | ₹1,499 + govt fee | Cheap, fast (7–10 days), plugs straight into Razorpay banking/gateway we're using anyway |
| **Local CA (for incorporation)** | ₹3,000–₹15,000 | Complex cases (FDI, NRI directors, multiple share classes) |

> **Resolved:** Register via **Razorpay Rize** (or DIY SPICe+ if confident) — the registration fee is a rounding error and the ecosystem fit is worth it. **Keep an independent CA separately for ongoing compliance** (already budgeted at ₹3,000/month in §17). Do NOT outsource ongoing compliance to the registration funnel. This supersedes the earlier "DIY only, ₹5,300" note.
> Government/DSC/stamp-duty extras still apply on top of any quoted fee; DSC went up ₹1,000 per director in July 2024 — one DSC per director (we need 2).

- Structure: Private Limited Company, 2 directors / 2 shareholders
- Equity split: **75 / 25** (CEO/CTO : CFO/Sales)
- Timeline: 7–10 working days
- PAN, TAN, DIN, DSC, MOA, AOA all handled in the SPICe+ flow

### Blueprint (order of operations)
1. Reserve company name (MCA name check / RUN)
2. DSC for each director
3. DIN for each director
4. Draft MOA & AOA
5. File SPICe+ with MCA
6. Receive Certificate of Incorporation + PAN + TAN
7. Open current account (see §16)
8. Activate Razorpay gateway (KYC using PAN + CoI)
9. Engage CA for GST + compliance calendar

### Personal documents needed NOW (per director)
1. **PAN card** (every other doc must match this name spelling exactly)
2. One ID proof: Aadhaar / Voter ID / Passport / Driving Licence
3. One address proof < 2 months old: bank statement / electricity / water / gas / postpaid mobile bill
4. Recent passport-size photo (white background, digital)
5. Valid email + mobile (used to issue DSC)

For the registered office:
6. Latest utility bill of the address (< 2 months)
7. If borrowed/owned by a relative: signed **NOC** from the owner + their ownership proof (property tax receipt or sale deed) + utility bill in owner's name
8. If rented: rent agreement + NOC from landlord

> Name/DOB/address mismatches across PAN, Aadhaar and utility bills are the #1 cause of rejection. Check spelling before uploading anything.

### Director liability — the airtight version (this session)
**Default truth: directors/shareholders are NOT personally liable for normal business losses.** If the company fails, owes vendors, or shuts down, creditors can only reach the *company's* assets — not personal house, car, or savings. That is the entire point of a Pvt Ltd.

**The 5 situations where that protection breaks:**
1. **You sign a personal guarantee** (e.g. on a bank loan) — that specific debt becomes personally yours. Read anything before signing.
2. **Fraud / fraudulent trading** — knowingly taking on debt with no reasonable prospect of repaying.
3. **Missed mandatory filings** — directors can be personally liable for the late-filing *penalties* (not company debts). This is the realistic day-one risk → exactly why we keep the CA.
4. **Unpaid company tax dues** — Income Tax Act §179 puts joint liability on directors unless they prove the default wasn't due to their neglect. CA closes this gap.
5. **Misusing company money / mixing personal and business finances** — erodes the legal shield.

**Defence is simple:** don't sign personal guarantees casually, keep the CA filing on time, keep personal and company money strictly separate (§17 rule 1). Then you're as protected as Indian law allows.

### Registered office — grandma's house (this session)
- **The house does NOT become a company asset.** A registered office is just an address where official mail is delivered and statutory records are kept (Companies Act §12). Using a space ≠ owning it. No ownership transfers.
- **The owner (grandma) takes on zero financial/legal liability.** The NOC's entire purpose is to record that she retains full ownership and is not responsible for the business. She is not a director, shareholder, or guarantor.
- **What she signs:** a one-line NOC ("no objection to this address being used as the company's registered office") + a utility bill in her name + property tax receipt / sale deed (proves she can give permission).
- **Only real downside:** the address becomes public record on the MCA portal, and official/legal notices for the company would arrive at her door. That's a privacy/disruption consideration to flag to her — not a money or liability risk. Worst case for her is inconvenience, even in total business failure.

### Address options compared (this session)
| Option | Cost | Catch |
|--------|------|-------|
| **Grandma's house** | ₹0 | Already available, zero risk to her — RECOMMENDED |
| Co-founder's rented house (landlord NOC) | ₹0 | Depends on landlord saying yes — many refuse to put their property on a public business record |
| Cheapest virtual office | ~₹18,000–₹32,000/yr for a registration-ready bundle (bare listings from ~₹667/mo exclude the docs) | Must include rent agreement + NOC + utility bill or it's useless for MCA |

> Decision: use grandma's house. It's free, confirmed, and risk-free. Don't burn time chasing a landlord or paying for a virtual office unless it becomes unworkable.

### Funding reality — CANNOT raise before incorporation (this session)
- Every funding instrument (equity round, convertible note, SAFE/iSAFE) gives the investor **shares** — which only exist inside a registered company. There is no "raise first, register later." Angel investors will not invest in an unregistered/sole-prop entity.
- You *can* earn revenue as individuals (sole prop), but with **zero liability protection** (defeats the whole point), Razorpay merchant KYC is blocked/limited without an entity, and income doesn't transfer cleanly into the company later.
- **Conclusion:** registration is the unlock, not the obstacle. Register first.

### Critical legal documents (co-founder drafts, then review before signing)
1. Founder agreement: equity split (75/25), vesting cliff, IP ownership, decision-making process, exit terms
2. T&C for platform users
3. Privacy policy (note DPDP Act exposure once outcome layer collects consumer data — see §25)
4. Brand campaign agreement template — **include a circumvention/anti-disintermediation clause** (see §23)
5. Creator payout terms

### T&C must include (minimum)
1. Dispute resolution clause — what happens when brand rejects deliverable
2. TDS deduction acknowledgement from creators
3. Platform's right to suspend accounts for fraud
4. Data usage policy
5. Payment terms — how long brands have to pay, when creators get paid
6. **Circumvention clause** — deals between parties introduced on-platform owe commission for a defined window (e.g. 12 months) regardless of where signed. Strongest as a deterrent on the brand side (companies fear knowingly breaching contracts more than individuals do).

### Tax obligations
- GST: register when revenue hits ₹20L or when first brand invoice goes out (whichever first). SAC code 998361.
- TDS: deduct 10% under §194R from every creator payout over ₹10,000. Remit quarterly. Issue Form 16A quarterly.
- File returns with CA monthly once GST-registered.

### Trademark
- "ValueSkins" — Class 35 (advertising) + Class 42 (technology)
- File on IP India portal directly
- Government fee: ₹9,000
- File post-incorporation, not before

---

## 16. Banking

**Recommended:** IDFC FIRST Bank — Startup Current Account
- Genuinely zero monthly average balance for companies under 3 years old
- Video KYC, 2–3 day activation
- Zero charges on NEFT, RTGS, IMPS
- Built for early-stage startups specifically

**Alternative:** ICICI Bank iStartup 2.0 — strongest Razorpay integration, purpose-built for Pvt Ltd

**Cannot open until:** Certificate of Incorporation is received from MCA.

**Documents needed:** Certificate of Incorporation, company PAN, MoA + AoA, Board Resolution authorizing account opening, both directors' PAN + Aadhaar, passport photos, proof of registered address.

---

## 17. Financial Model

### Lean monthly burn (V1, no salaries)
| Item | ₹/month |
|------|---------|
| Domain (Cloudflare) | 68 |
| OTP/SMS | 300 |
| CA retainer | 3,000 |
| Travel (creator meetings) | 2,500 |
| Misc buffer | 1,500 |
| **Total** | **~₹7,400** |

### Capital split (75/25 — CEO/CTO : CFO/Sales)
| | One-time setup | Monthly |
|--|---------------|---------|
| CEO (75%) | ₹25,725 | ₹5,526 |
| CFO/Sales (25%) | ₹8,575 | ₹1,842 |

### Break-even GMV
At 12% platform cut (net ~₹4,820/deal after gateway):
- Cover lean burn: ~₹5–8L GMV/month (~10–15 deals at ₹50K avg)
- Cover full real burn (with deferred salaries): ~₹25–40L GMV/month (~50–80 deals)

### Cash discipline rules
1. Company money and personal money never touch once incorporated (this is also liability protection — see §15)
2. No fixed cost without a revenue trigger
3. TDS and GST portions ring-fenced the moment payment lands — never treated as available balance
4. Marketing spend cap: zero paid ads for first 60 days. Then max 10–15% of net platform revenue only.
5. Maintain 3-month minimum cash buffer before any new hire or subscription
6. Weekly Sunday P&L review — 30 minutes, both founders, non-negotiable

---

## 18. Pre-incorporation Cash Flow

All expenses before incorporation are personal founder expenses — recorded as pre-incorporation expenses, reimbursed as a director loan once the current account is open.

**Order of operations:**
1. Build MVP (free hosting, free tools)
2. Get first brand commitment to a real paid campaign
3. Incorporate Pvt Ltd (7–10 days)
4. Open company current account (2–5 days)
5. Connect Razorpay to company account (2–5 days)
6. First real transaction flows

Do NOT process any real brand-to-creator payment before incorporation + Razorpay are both live.

---

## 19. Marketing Strategy

### Phase 1 — Pre-launch (zero spend)
- Reddit (r/IndiaStartups, r/CreatorEconomy, r/startups Sunday thread)
- Personal LinkedIn — founder posts, not company page
- Direct DM outreach to micro-creators and D2C brand founders
- WhatsApp community for early creator cohort

### Content pillars (Instagram — when ready, with proper content management)
1. **Build in public** — real numbers, real milestones, real setbacks
2. **DM Theatre** — anonymized/recreated chaos of how brand deals actually go wrong
3. **Creator spotlight** — feature onboarded creators weekly
4. **Plain-English education** — TDS explainers, red flags in brand deals, how ValueSkins levels work

### B2C marketing advantage (this session)
"We connect brands with creators" is a hard B2B sell, deal by deal. "We'll teach you to become a paid creator and get you your first placement" (the academy — §24) is a B2C *dream* that markets itself: people line up to give attention because you're selling a transformation of themselves, not a service. Aspiration is the cheapest acquisition channel — and those students become content, social proof, and supply at once.

### Brand voice on all channels
- No exclamation marks in headlines
- No stock photos
- Founder faces visible
- Admit what's broken, admit what's uncertain
- Post failures, not just wins

### Instagram note
Not starting with Instagram immediately — protecting brand value. Start with Reddit. Instagram needs a dedicated content manager before launch to hold the brand standard.

---

## 20. Competitor Map

### Active Indian competitors
| Platform | Threat level | Why |
|----------|-------------|-----|
| Qoruz | Direct | Institutionally backed, analytics-heavy, no gamification |
| CollabSkool | Direct (watch closely) | **Already shipped** (app + DPIIT recognition) — ahead of us on time-to-market. But went *wide and shallow*: 4 sides (Brand / Influencer / Fan-shoutouts / Videographer), 2 unrelated jobs (fan entertainment vs brand ROI). Generic "verified creators + secure payments" — no earned reputation, no escrow spine, no anti-disintermediation design, no seriousness filter. Their breadth = 4-sided cold-start problem + credibility ceiling (a fan-shoutout app can't be taken seriously for performance campaigns). See framing below. |
| Winkl | Direct | Same segment, no reputation system |
| Good Creator Co. (Plixxo + Winkl merged) | Opportunity | Shutting down — 135K+ brand collaborations of orphaned creators available NOW |
| One Impression / Kofluence | Indirect | Agency model, different price point (₹30L+ budgets) |
| JioStarverse | Watch | Jio distribution — no gamification yet, 18–24 month window |

**CollabSkool framing (wide-shallow vs narrow-deep):** they optimize for *number of connections*; we optimize for *trust per deal*. They went wide (4 audiences, instant matching, fan shoutouts) and shallow (no reputation, no escrow moat). We go narrow (brand↔creator) and deep (earned trust + quality matching). Their breadth is both their cold-start weakness and their credibility ceiling. **Caveat we must respect: they're real and shipped; we're a document.** We only beat them by shipping the depth — not by matching features. (Analysis session — see Decision Log.)

### Global with India presence
| Platform | Threat level | Why |
|----------|-------------|-----|
| Instagram Creator Marketplace | Acquirer target | No reputation layer, no gamification — our pitch to them |
| IZEA | Not a threat | USD pricing, no INR rails, not India-facing |

### Future threats (once we have traction)
- Meta / Instagram — acquisition play
- Jio / JioStarverse — distribution reach
- YouTube BrandConnect India expansion
- Razorpay / Cashfree adding creator payout marketplace features
- A new funded Indian startup copying the model (most urgent — 0–18 months)

---

## 21. Open Decisions (to resolve)

- [ ] Onboarding flow — exact screens from sign-up to first deal
- [ ] Dispute resolution process for V1 (currently: handle manually)
- [ ] Landing page copy — written
- [ ] Pitch deck — 8 slides
- [ ] Founder agreement — co-founder drafts, then review
- [ ] T&C + Privacy Policy — co-founder drafts, then review (add circumvention clause + DPDP coverage)
- [ ] Brand verification flow — GST API integration spec for CEO
- [ ] Instagram OAuth — Meta App Review submission (V2, plan for month 4+)
- [ ] Content management for Instagram — find a creator to manage before launch
- [x] ~~What "one-time ValueSkins purchase" pricing is~~ — **DECIDED:** Hobby free / Passion ₹499 / Professional ₹999 (one-time, by Type). Commission 12% brand-side (for now). (§7)
- [ ] Early signal definition: what inside the marketplace tells us a brand has crossed from "matching" to "wants its own bench" (academy trigger — §24)
- [ ] Decide: do we sell the data (reporting product) or sell on outcomes the data proves (performance commission)? — the §25 fork
- [ ] Sharpen the **Passion vs Professional** distinction — what each means for a brand, and what visibly separates them (§28)
- [ ] Resolve the pay driver: **earned reputation/performance vs raw follower count** — research says niche-converts-better; founder instinct says reach=money (§28)
- [ ] Finalize the **first target segment** (which brands, which creators) — currently reopened; §13 targets are tentative (§28)

---

## 22. Glossary (plain English)

| Term | Meaning |
|------|---------|
| **Disintermediation** | Two parties who met on the platform going direct to cut out the fee. The core marketplace risk. |
| **CA / CS** | Chartered Accountant / Company Secretary — handle accounts/tax and legal/compliance filings. |
| **MCA / ROC** | Ministry of Corporate Affairs / Registrar of Companies — where you register and file. |
| **Pvt Ltd / LLP / OPC** | Private Limited / Limited Liability Partnership / One Person Company — entity structures. |
| **PAN / TAN / DIN** | Company tax ID / tax-deduction account number / Director Identification Number. |
| **DSC** | Digital Signature Certificate — each director needs one to file online. |
| **MOA / AOA** | Memorandum / Articles of Association — what the company can do and how it's run. |
| **NOC** | No Objection Certificate — owner's signed permission to use an address; protects their ownership. |
| **MDR** | Merchant Discount Rate — the % a network/bank charges per card transaction. |
| **Platform fee** | Razorpay's own % on top of/instead of MDR — applies even to UPI. |
| **T+1 / T+2** | "Transaction day + 1 or 2" — how long until money actually lands. |
| **TDS** | Tax Deducted at Source — tax withheld on certain payments (here, creator payouts). |
| **DPDP Act** | India's data-protection law — triggers consent/liability obligations once we hold consumer data. |
| **Dark social** | Influence that converts with no trackable click (saw video → googled later → bought). Breaks attribution. |
| **Last-click attribution** | Crediting only the final click — systematically under-credits the creators who actually work. |

---

## 23. Disintermediation & Moats (core strategy — this session)

**Hard truth:** disintermediation is the single hardest marketplace problem. You will not stop it completely; anyone who says they can is lying. The goal is not "stop it" — it's making going around you cost **more in attention and risk than the commission costs in money**, for *enough* deals that the unit economics hold.

**Why a pure introduction is indefensible:** the match is a one-time event; the commission is recurring. The moment A meets B, your entire value is delivered and you have nothing left to withhold. So the moat can't be the matching — it has to be something they keep needing *after* they've met.

**Moat stack, strongest → weakest:**
1. **Manufacture your own supply** (the academy — §24). You can't be disintermediated from talent you *created*. No "direct" exists because the relationship didn't pre-exist you. This is an identity lock — the hardest to break.
2. **Package so buying requires no thinking** (the ValueSkins bundle / "buy a curated set" — the Uber move). Deletes the evaluation phase. You can't go direct to a package; the thing bought *was* the curation.
3. **Be where the money and risk sit** (escrow + dispute protection + system-of-record). Going direct means both sides give up their safety net simultaneously. First time someone gets burned going direct, they come back. This is the spine.
4. **Contracts** (circumvention clause — §15). Deterrent, not a wall. Changes going-direct from "clever shortcut" to "deliberate breach." Works best on brands.

**The Uber lesson (corrected):** Uber's real moat isn't the auto at your door — it's that they **deleted the decision**. The user stops evaluating because evaluating costs more energy than the decision is worth. Riders *do* think "I should just drive" — and never act, because the thought dies against the friction of acting. Normalization ("just take an Uber") means the alternative never even gets *considered*. You can't be undercut on a decision the customer never makes.

**Your disadvantage vs Uber, stated plainly:** for a rider, "drive myself" is huge effort (buy a car). For a brand going direct to a creator they've met, it's one DM + a transfer — near-zero effort. The friction Uber gets for free, **you must manufacture.** Escrow they won't give up, reporting their boss now expects in your format, the dispute protection one bad direct deal taught them to value, the fact that going direct means re-creating by hand, worse, what you do in one click — every deal, forever.

**The race you must win:** the *itch* to go direct can arrive early (after ~3 deals they've met everyone), but the *lock-in* (workflow/data/escrow dependence) sets slowly. If confidence outruns embedding, you lose them in the gap and "we have them where we want them" becomes "we trained them to leave." So **front-load the lock** (escrow + system-of-record in V1) so it's load-bearing before they're confident enough to walk. Don't assume the race runs in your favour — engineer it.

**Reframe of the "brand wants to go in-house" itch:** that brand isn't only a leak — it's the lead for the academy (§24). When demand shifts from "find me creators" to "build me a bench," you place your trained students into their media team. They still pay you, for placement instead of matching. Uber turned "I'll drive" into supply; you turn "I'll go in-house" into placement demand. **This only works if the marketplace is instrumented to detect that shift** (repeat brands, rising frequency, brands hiring creators full-time). Build the marketplace blind to that signal and you'll never know your best academy customer just walked.

---

## 24. Supply-Manufacturing Layer / Academy (V2+ — this session)

**The idea:** instead of only finding existing creators, take in students/enthusiasts who want to create but don't know where to start, train them, and place them — either as platform creators or into brands' in-house media teams.

**Why it's the deepest moat, not a marketing angle:**
- You can't disintermediate supply you *created*. Found creators can leave; *made* creators began their professional existence inside the platform. You're the origin, not a middleman. A creator who got their training, first portfolio, and first ten deals through you doesn't see you as a fee on top of their business — you *are* its foundation. Identity lock.
- This is exactly how modeling/talent agencies and the old studio system held their cut for decades: they didn't find stars, they *made* them, and a made thing owes its maker in a way a found thing never does.

**Sequencing (resolved this session):** marketplace **first**, academy grows out of it.
- The marketplace is the **sensor** that reveals which brands are ready for the academy and generates placement demand *before* you've built supply.
- Reasoning to hold honestly: "using Uber long enough makes the rider consider driving" cuts both ways — heavy usage can deepen dependence *or* competence. We bet on dependence, which only pays if we front-load the lock (§23).

**The pushback to respect:** the academy is a *whole second company* (curriculum, quality control, placement pipeline) that scales with people and effort, not just code. Agencies that did this stayed small and high-touch for a reason. Do not run marketplace and academy at full intensity simultaneously from day one — you'll do both at half quality. Let the marketplace fund and feed the academy.

**Open question (→ §21):** define the in-marketplace early signal that a brand has crossed from "matching" to "wants its own bench," *before* they act on it.

---

## 25. Outcome / Attribution Layer (V3+ — this session)

**The instinct (correct):** brands don't want views — they want to know *which rupee came back*. Move from a **media marketplace** (sell attention) to a **performance marketplace** (sell outcomes). Real, readable, action-driving data: this creator drove sales; this one had views and zero conversions; this customer bought once and never again. This is what justifies the commission long-term.

**The plan as sketched:** require brands to run a site that emits data, partner with web-design firms (commission), provide an API, so generic data becomes *ultimate* data. Strictly a scalability-phase move — worthless on 5 campaigns (statistical noise). Phase-three weapon.

**The landmines (do not skip these):**
1. **Attribution is brutally hard; the clean funnel is fantasy.** Dark social + last-click systematically under-credit the creators who actually work. Your dashboard will be a *probabilistic estimate dressed as truth*. The moment a brand's own numbers disagree with yours, the credibility of the whole product cracks.
2. **The ground is moving against tracking.** Apple tracking changes, third-party cookies dying, and — directly on us — the **DPDP Act**: holding consumer purchase-level data makes us a data processor with consent + breach liability. This is where we'd take on *real* new legal exposure (ties to §15 liability).
3. **A huge share of Indian sales is un-instrumentable.** Amazon, Flipkart, Myntra, Nykaa, Instagram, WhatsApp — we don't own those checkouts, so we can't track them. The "require a site + API" model goes blind exactly where much of the money moves, and works best for mature D2C brands who need us least.
4. **Owning the data = owning the blame.** Today a flopped campaign is "not our fault." The moment our dashboard shows "10,000 views, 0 sales," everyone looks at us — and the data reveals whether it was the creator, the product, the price, or the checkout *our web partner built*. We become accountable for outcomes we don't control.
5. **Top creators will resist sales-scoring.** Conversion depends on product/price/checkout — none of which they touch. The best creators have leverage and will refuse a platform that judges them on numbers outside their control. We could win brands and lose our best supply.
6. **Ultimate data is a disintermediation map.** "Creator X converts at 4%, the rest are dead weight" tells the brand exactly which one creator to keep and go direct to. Our best feature becomes the escape key for our highest-value relationships. **Mandatory design rule:** the data must be **worthless the moment they leave** — attribution only lives while campaigns run on our rails; tracking dies when they go direct. Portable value = we armed them. Locked value = moat.
7. **The web-partner commission is the Razorpay upsell we resented.** Forcing brands onto a partner for our cut is exactly the bait-and-upsell pattern we criticized. Worse: a mediocre partner builds a slow checkout, conversions tank, our own data looks bad. Pick the partner for checkout *quality*, never for the commission.

**The fork (→ §21):** charge brands *for the data* (a reporting product they'll eventually cancel or rebuild) vs. charge *on the outcomes the data proves* (commission on attributable sales, interests welded together, data is the thing neither side can fake). Only the second is a moat.

---

## 26. Razorpay Gateway — Real Cost & Terms (this session)

We're committing to Razorpay's gateway, so the gateway terms — not the ₹1,499 registration — are the real recurring cost centre.

**Model these as the true numbers, not the headline:**
- **Effective rate is 2.36%, not 2%** — the standard ~2% domestic fee attracts 18% GST on the fee.
- **UPI is not free to us** — despite RBI's zero-MDR mandate, a ~2% platform/technology fee applies. Budget 2.36% on UPI too unless negotiated.
- **RuPay-credit-card-on-UPI trap** — looks like UPI in checkout, priced like a card (~2.15% platform fee + MDR, ~2.5%+ effective).
- **Refunds don't return the fee** — on a refund the principal goes back to the customer but the original transaction fee is not reversed. High-return businesses bleed margin here.
- **Instant/same-day settlement costs extra** (~0.15–0.20%). Default is T+2; same-day money is a paid add-on.
- **International is the biggest sticker-vs-real gap** — quoted ~3% becomes ~3.54% after GST, plus a ~1–2% FX conversion spread baked in → real cost ~5%. Get the true all-in rate before assuming domestic pricing.
- **Enterprise renegotiation exists but isn't offered proactively** — once consistently processing > ~₹5–10L/month, contact sales for custom pricing. Calendar reminder.
- **RazorpayX current-account refund clause** — if you pay the fee and don't initiate services within 3 months, ~25% may be deducted as processing fee, and refunds may be withheld entirely once the account is created.
- **Activation isn't instant** — requires corporate docs (PAN, GST) AND live website disclosures (refund policy, physical contact info). Prepare these *before* finishing incorporation, or activation stalls. Regulated categories (food/FSSAI, forex, insurance, etc.) need extra certificates.
- **Chargebacks/disputes sit on the merchant** — Razorpay is a gateway only; chargeback amounts and fines are auto-deducted from settlement. A dispute spike hits cash flow directly.

**Before going live, get in writing:** (1) blended rate incl. GST (treat 2.36% as baseline), (2) whether UPI gets a negotiated lower rate, (3) settlement cycle + instant-settlement cost, (4) real all-in international rate if any overseas customers, (5) refund terms if we pause/cancel the current account before activation.

---

## 27. Decision Log (this session)

- **Registration:** Razorpay Rize (or DIY SPICe+) for incorporation; independent CA retained separately for ongoing compliance. Supersedes earlier "DIY only ₹5,300."
- **Registered office:** grandma's house via NOC — zero cost, zero liability to her, house never becomes a company asset. Virtual office (~₹18–32K/yr) only as fallback.
- **Liability:** directors safe by default; 5 named exceptions; CA + clean books + no casual personal guarantees = airtight.
- **Funding:** impossible before incorporation; register first, it's the unlock.
- **Gateway:** model Razorpay at 2.36% effective; international ~5%; watch refund/settlement/chargeback terms.
- **Moat:** stop chasing a foolproof fence; price around the leak. Front-load escrow + system-of-record in V1. Moat stack = supply manufacture > packaging > money/trust layer > contracts.
- **Sequencing:** marketplace first as both lock and *sensor*; academy and outcome layer are separate, heavier companies to grow out of it, not bolt on early.
- **Outcome layer:** real direction, but loaded with attribution, DPDP, blame-ownership, supply-resistance, and self-disintermediation risks; data must be worthless off-platform; never force a web partner for the commission.
- **ValueSkins = two layers:** Type (intent: Passion/Professional/Hobby) × Tier (earned: Raw→Icon). Hobby is the on-ramp (Option A). (§28)
- **Cosmetic-only rule dropped:** earned Tier now unlocks access + earning power, rolled out gradually, one market at a time. (§28)
- **Seriousness filter:** the profile clip becomes a "how I'd market your product" pitch — the built-in serious-creator screen. (§28)
- **Niche taxonomy:** hybrid — defined fields + free-text tags, never a single open field. (§28)
- **GTM:** first target segment not yet finalized; §13 targets tentative; go gradual, one market at a time. (§28)

---

## 28. ValueSkins Type Layer, Seriousness Filter & Niche Taxonomy (this session)

**Core principle: ValueSkins is TWO separate layers. Do not merge them.**

A creator always carries both at once — e.g. *a Professional-type creator at Signal tier.*

### Layer A — ValueSkins Type (intent / "why they're here")
Three types, fixed at three (no more):

| Type | Meaning |
|------|---------|
| **Passion** | Deeply committed to a niche; treats creating as a calling, not just income. |
| **Professional** | Does this for a living; treats it as a business, full-time. |
| **Hobby** | Casual / entry-level. **The on-ramp (Option A):** anyone can join as Hobby with *limited access*, and graduates to Passion/Professional by recording a pitch clip + completing deals. Hobby is the funnel, not the enemy. |

> Goal remains "serious creators only" — but instead of *excluding* casual creators at the door, Hobby lets them in and the **pitch clip + completed deals filter for seriousness over time.** Passion vs Professional distinction still needs sharpening (→ §21).

### Layer B — Tier (earned reputation / "how proven they are")
The existing Raw → Seed → Signal → Aura → Icon ladder (§4 Layer 2), earned **only** through completed paid deals. This is the progression and moat layer. **Cosmetic-only rule dropped this session** — higher Tier now unlocks real perks (better access/visibility + earning power).

### The seriousness filter = the pitch clip (refines §4 Layer 3)
The profile clip is not a generic intro — it's a short clip where the creator pitches **how they'd market a specific brand's product.** It (1) self-selects for serious creators — effort *is* the screen, (2) gives brands a real matching signal beyond metrics, (3) lives on-platform as proof a creator can't port to a competitor (moat).

### Niche taxonomy — hybrid, NOT a single open field
- **Defined primary niche fields** (fitness, beauty, F&B, fashion, tech, finance, …) → these power the filtering that is the core product.
- **Plus free-text tags / sub-niches** for nuance ("vegan high-protein," "budget skincare").
- One open field alone would kill filterability and put us back into the broken search the research described.

### Monetization caution (UNRESOLVED — flagged)
Founder direction: *"more followers/outreach → more money."* Research caution stands: an 18K niche creator out-converts a 500K broad one, so paying purely by follower count rewards the exact vanity metric this platform exists to fix — and makes us indistinguishable from incumbents. **Recommendation:** tie earning power to **earned reputation + on-platform performance**, with followers as one input, not the currency. Decision pending (→ §21).

### Go-to-market (decision this session)
First target segment — *which brands, which creators* — is **not yet finalized.** The §13 Mumbai/Pune + D2C + 10K–100K micro-creator targets are **tentative, not locked.** Governing principle: roll out **gradual, one market at a time.**

---

*Document generated from founder sessions — ValueSkins Pvt Ltd (in incorporation).*
