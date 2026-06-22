# Legal Analysis — India Edition

## Premise

We replace agencies. We don't become one. Everything here is specific to operating in India.

---

## First: The 4 Things You Actually Need

Before any T&S or code matters, these are non-negotiable for India:

### 1. Private Limited Company

Not LLP, not OPC, not sole proprietor. Pvt Ltd.

Why: If you're a sole proprietor and someone sues, they sue YOU — your personal bank account, your parents' house, everything. A Pvt Ltd is a separate legal entity. If the company gets sued, the company is the defendant, not you personally.

**Cost**: ₹15-25K to register (ClearTax, Vakilsearch, or a CA)
**Time**: 2-3 weeks
**Must have**: DIN, DSC, PAN for the company, bank account in company name
**⚠️ Liability**: If you're collecting money from clients (even through escrow), operating as an individual is asking for disaster. A Pvt Ltd is ₹25K well spent.

### 2. Razorpay's escrow flow — money never touches your account

RBI requires a Payment Aggregator license if funds flow through your bank account. That's a ₹5Cr net-worth requirement, months of compliance, impossible for a startup. Razorpay handles this for you.

**The rule**: The brand pays into Razorpay's escrow pool. Razorpay holds it. Razorpay releases to the creator when conditions are met. Your platform never holds the funds.

What this means for your deal flow:
- Brand funds deal → money goes to Razorpay (not your account)
- Creator submits deliverables → approved → Razorpay releases to creator
- If cancelled → Razorpay returns to brand's source

**What to verify in Razorpay dashboard**: Your settlement mode should be "payouts from escrow," not "funds settle to your bank account then you pay the creator." The latter makes you a payment aggregator under RBI law.

### 3. Cyber Liability Insurance

If a creator's video leaks because of your bug, they don't care about your T&S. They lost a paid campaign. Insurance covers the payout.

**Providers**:
- ICICI Lombard — Cyber Insurance for Startups (~₹15-30K/year)
- HDFC Ergo — CyberSafe (~₹20-40K/year)
- TATA AIG — Cyber Insurance

Get a ₹50L-1Cr policy. It costs ₹15-40K/year. Buy before you launch.

### 4. T&S from an Indian lawyer

Indian contract law is different from the US. Specific things that matter:
- **Indian Contract Act 1872**: Click-wrap agreements are enforceable (Trimex v. Vedanta, Supreme Court), but unreasonable terms can be struck down
- **IT Act 2000**: Gives legal recognition to electronic contracts and digital signatures
- **Consumer Protection Act 2019**: Users can go to consumer court, which is faster and more consumer-friendly than civil court. Any "unfair contract" terms can be invalidated
- **GST**: Platform services may attract 18% GST. You need to understand whether you're a marketplace operator (TDS on payments) or a service provider
- **DPDP Act 2023**: New data protection law. Fines up to ₹250Cr. You need a privacy policy that actually matches what you do

**Get one T&S drafted specifically for Indian law** by an Indian lawyer who does marketplace/platform work. ₹30-50K one-time.

---

## Summary of What These 4 Things Do

| Protection | What it covers |
|---|---|
| Pvt Ltd | Personal assets are safe. Company is the defendant. |
| Razorpay escrow | No RBI license needed. Money never touches you. |
| Cyber insurance | Payout for data leaks / bugs / breaches. |
| Indian T&S | Click-wrap contract enforceable under IT Act 2000. |

Without these 4 things, code doesn't matter. With them, you can build the rest.

---

## Now: Each Agency Legal Function in Indian Terms

---

### 1. Contract Drafting

**Platform does**: Deal creation form = contract. Structured fields (title, budget, deliverables, revisions). Escrow enforces payment.

**India-specific**: Under the IT Act 2000 Section 10A, contracts formed through electronic means are valid. So the deal created on-platform IS a valid contract between the two users.

**Needs T&S language**: "Each deal created on ValueSkins constitutes a binding agreement between brand and creator under the Indian Contract Act 1872. ValueSkins is a platform facilitator and not a party to the agreement."

**Left out**: Custom clauses, legal jargon, signatures

**Compensation**: The platform workflow is more enforceable than a PDF contract because money == teeth. Creator doesn't deliver? Money goes back. Brand doesn't approve? Money releases. PDF contracts get you sued. Code prevents the problem.

---

### 2. NDA Negotiation

**Platform does**: Nothing. Not our job.

**India context**: NDAs are common in Indian business but notoriously hard to enforce in Indian courts (cases take 5-10 years). They're mostly trust theater anyway.

**Replacement**: Platform reputation + escrow. The creator has a value skin on the line. They're not going to steal a campaign strategy for one deal and lose their entire profile.

**T&S**: "ValueSkins does not facilitate, enforce, or mediate NDAs. Users who require NDAs must execute them independently."

---

### 3. Exclusivity Clauses

**Platform does**: Nothing in code. If a brand wants exclusivity, they negotiate it directly with the creator.

**Replacement**: Market forces. If you want the creator to not work with competitors, pay a premium. The deal description captures the agreement. No platform enforcement.

**T&S**: "Exclusivity arrangements are between users. ValueSkins does not monitor or enforce them."

---

### 4. Usage Rights / Licensing

**Platform does**: Default rule in T&S — creator retains ownership, brand gets license for the deal's purpose.

**India context**: Indian Copyright Act 1957 governs this. Licensing needs to be clear. If the T&S says "brand can use deliverables for campaign purposes," that needs to be specific enough to be enforceable.

**Needs lawyer**: The exact wording of the default license. Under Indian copyright law, an implied license is possible but risky. Get an explicit clause:

> *"Creator grants Brand a non-exclusive, perpetual license to use Deliverables for the Campaign described in the Deal. Any use beyond the scope of the Campaign requires separate compensation agreed between Creator and Brand. Creator retains all ownership rights not expressly granted."*

**Missing**: Structured deal field for usage scope. Not a legal requirement but reduces ambiguity.

---

### 5. Revision Limits

**Platform does**: Already in code. `revision_count` field. Default 3. Works.

**Needs fixing**: Auto-resolution when revisions are exhausted.
- After N revisions, creator marks "final submission"
- Brand has 7 days to approve or reject
- If no response, deal auto-approves and funds release

**India-specific concern**: Consumer Protection Act 2019 gives consumers the right to reject services that don't match the description. If a brand claims "deliverables don't match what was promised," consumer court MAY hear the case even after auto-resolution. The auto-resolution needs a clear escape hatch (48-hour warning email, option to dispute).

---

### 6. Late Delivery / Deadlines

**Platform does**: Not handled well.

**Needs building**:
- Phase inactivity timers (30 days no action → auto-resolve)
- Funded but no deliverable → refund brand
- Submitted but no review → auto-approve + release
- Revision requested but no resubmit → release to brand (creator forfeits)

**India context**: Under Indian Contract Act, time is not "of the essence" unless explicitly stated. Your platform rules make deadlines explicit by default. This is actually stronger than a standard Indian contract where deadlines are often ambiguous.

---

### 7. Kill Fees (Cancellation Mid-Project)

**Needs building**: Structured cancellation phase with options:
1. Mutual cancel → full refund
2. Partial delivery → brand can approve partial payment (creator sets amount, brand counters)
3. Deadlock >14 days → auto-split (e.g., 70% brand / 30% creator)

**India context**: This is the highest-risk area under Indian consumer law. If a brand pays ₹5L and gets nothing, they WILL go to consumer court regardless of T&S. The auto-split rule needs to be demonstrably fair or it gets struck down.

**Safer approach**: Before auto-split, send email to both parties: "No resolution reached in 14 days. Per platform rules, funds will be split 70/30 unless either party objects within 48 hours." This gives them a final out and makes the process defensible.

---

### 8. Dispute Resolution (Quality Disputes)

**Platform does**: Revision workflow handles this. Structured audit trail logs every action.

**Left out**: Human mediation

**Replacement**: Auto-resolution based on platform rules (not human judgment).

**India context**: Indian courts take 5-10 years for a contract dispute. Consumer forums take 6-12 months. Your auto-resolution is faster than both. But if it's seen as unfair, a consumer forum can overturn it.

**To be defensible**:
- Every revision reason is logged (structured form, not free text)
- Both parties get 48-hour warning before any auto-resolution executes
- The auto-resolution rules are published in the T&S upfront (no surprises)

---

### 9. Payment Collection

**Platform does**: Escrow via Razorpay. Money held by Razorpay, not you.

**India-specific regulation**: 
- If money passes through your bank account → you need RBI Payment Aggregator license (₹5Cr net worth)
- If Razorpay holds the money in escrow → you're fine, Razorpay has the license
- TDS under Section 194R of Income Tax Act: If you're facilitating payments between users, there may be TDS implications. **Ask your CA.**

**Needs building**: Auto-payout on deal completion. When deal reaches 'completed' status, Razorpay should auto-release to creator's payout account.

---

### 10. Tax Forms (GST, TDS, Income Tax)

**Platform does**: Nothing. Users handle their own taxes.

**India context**: This is more complex than the US. Specifically:
- **GST on platform fee**: If you charge a platform fee, GST at 18% applies. You need GST registration.
- **TDS under 194R**: If you're facilitating payments to creators, there's a question about whether you need to deduct TDS. Get a CA opinion.
- **Creator's GST**: Creators earning >₹20L/year need GST registration. They issue invoices to brands. You don't touch this.
- **Brand's TDS**: Brands paying creators may need to deduct TDS under 194J (professional fees). You don't touch this.

**Your responsibility**: Pay GST on your platform fees. That's it. Everything else is between the user and the government.

**T&S**: "Users are solely responsible for their tax obligations including GST, TDS, and income tax. ValueSkins does not provide tax advice or documentation."

---

### 11. ASCI / Advertising Compliance (India's FTC)

**Platform does**: Nothing.

**India context**: ASCI (Advertising Standards Council of India) regulates influencer advertising. Guidelines require:
- Clear disclosure (#ad, #sponsored, #brandedcontent)
- No misleading claims
- Due diligence by brand on claims made in content

**Enforcement**: ASCI complaints go to the brand, not the platform. However, the government is increasingly pressuring platforms to self-regulate.

**Your position**: "Creators and brands are responsible for ASCI compliance including proper disclosure. ValueSkins does not review or approve content."

**Needs building**: Optional tag in deal form: "This is a paid partnership. Creator agrees to disclose per ASCI guidelines." Not enforceable, but creates a paper trail.

---

### 12. Data Privacy (DPDP Act 2023)

**Required**: You need a privacy policy that covers:
- What data you collect (name, email, valueskin, deal history)
- What you do with it (facilitate deals, show profiles)
- Who you share it with (Razorpay, other users as part of profiles)
- How users can delete their data
- Consent mechanism (checkbox on signup)

**Penalties**: Up to ₹250Cr for violations. Take this seriously.

**Needs building**: User data deletion flow (GDPR-style). You already have `/api/auth/request-deletion`. Make sure it actually deletes from the database.

---

## Final List: What to Build vs What to Buy

### Build (code features)
1. Auto-resolution on revision exhaustion (7-day timer, auto-release)
2. Phase inactivity timers (30 days → auto-resolve per phase)
3. Kill fee phase with 48-hour final warning before auto-split
4. Structured dispute form (checkbox reasons, not free text)
5. Auto-payout on deal completion (Razorpay trigger)
6. Data deletion flow (DPDP compliance)
7. ASCI disclosure checkbox (optional, in deal form)

### Buy (one-time, setup costs)
1. **Pvt Ltd registration**: ₹15-25K
2. **Razorpay escrow integration**: Already in progress, but verify funds never hit your account
3. **Cyber liability insurance**: ₹15-40K/year
4. **Indian T&S from marketplace lawyer**: ₹30-50K
5. **CA for GST/TDS advice**: ₹5-10K consultation

**Total setup cost**: ~₹70K-1.3L (about $800-1,500 USD). One-time.

**Ongoing**: Insurance renewal (₹15-40K/year) + CA for filings (₹10-20K/year).

---

## What Happens If You Skip Any of This

| Skip | Risk |
|---|---|
| No Pvt Ltd | Someone sues → they take your personal assets. Your parents' house, your savings, gone. |
| Funds in your bank | RBI notice → fine + business shut down + you personally liable |
| No insurance | Data leak → ₹25L+ payout from your pocket |
| No Indian T&S | Consumer court throws out your US-style T&S → you lose every case |
| No GST registration | Department notice → fine + interest + penalties |

Get the 4 things done before you launch. ₹70K-1.3L total. Non-negotiable.
