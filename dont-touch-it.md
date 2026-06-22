# Don't Touch It: Radical Avoidance Strategy

The philosophy: If you don't hold it, you can't leak it, lose it, or get sued over it.

---

## Phase 1: Eliminate Entirely

If the feature doesn't add core value, don't build it. No amount of compliance fixes a feature you never had.

| Don't build | Risk avoided |
|---|---|
| Phone number collection | DPDP consent, breach liability, SMS costs, spam |
| In-app file hosting / uploads | Copyright liability, storage breach, malware in uploads, takedown compliance, storage costs |
| SMS / phone-based 2FA | Phone number storage, SMS delivery compliance, SIM swap fraud |
| In-app KYC / identity verification | Storage of government ID copies (massive DPDP risk), manual review costs, false document detection |
| Chat message archival beyond deals | Breach exposure, irrelevant discovery in lawsuits |
| Direct messaging between users outside deal context | Moderation liability, harassment claims on your platform |
| User "verification" badges | Liability if someone you "verified" commits fraud and user says "but you said they were verified" |
| Content moderation / review | Agency-like behavior, liability for what you approved vs missed |
| Creator portfolios hosted on-platform | Copyright claims (user uploaded someone else's work to your servers) |
| Brand campaign analytics tracked by you | Data ownership disputes, DPDP consent for tracking |
| User reputation scores computed by you | Defamation suits from low-scored users |
| Anything that makes you "review," "approve," or "curate" user content | Loses IT Act Section 79 safe harbor |

---

## Phase 2: Outsource to a Third Party

If the feature is essential, don't do it yourself. Make someone else do it, keep the data with them.

### Payouts & Bank Details → Razorpay

**Current state**: Your code might be collecting bank details and calling Razorpay's API.

**Better**: Use Razorpay's Direct Payout feature with `on_hold` and fund accounts. Razorpay's API creates a "fund account" for the user. Razorpay collects the bank details. You never see or store them.

Flow:
1. User clicks "Set up payout"
2. They're redirected to Razorpay's hosted page or you embed their form
3. Razorpay validates and stores bank account, IFSC, PAN, and does KYC
4. Your platform only stores `razorpay_fund_account_id`
5. When deal completes, you call Razorpay to release to `razorpay_fund_account_id`
6. Razorpay handles TDS, GST on payouts, failed transfers, etc.

**Risk eliminated**: Bank detail storage, KYC document storage, TDS compliance, failed payment handling, fraud detection.

### Authentication → Google / GitHub OAuth

**Current state**: You have email/password login too.

**Better**: Make OAuth the primary, email/password optional. Google and GitHub handle password security, breach detection, 2FA. You never see a password.

If you keep email/password (some users want it):
- Never store password hints, security questions, or plaintext
- Hash with bcrypt (already done)
- Outsource password reset to your forgot-password flow (already done)

### Email → SendGrid / AWS SES

**Current state**: You're already using email services.

**Better**: Never store email content in your database. Template IDs, user IDs, and merge variables only. SendGrid stores the actual email templates. If SendGrid gets breached, the email content is their problem.

### Deliverable Files → Google Drive / Dropbox links

**Current state**: You have a file upload API endpoint that stores files somewhere.

**Better**: Remove file upload entirely. Tell creators to upload to Google Drive/Dropbox and paste the share link in the deliverable form.

**This eliminates**:
- Copyright infringement liability (you don't host infringing files)
- Storage security and cost
- Malware scanning obligations
- Takedown compliance for files
- Bandwidth costs for large files

**You lose**: Convenience. That's the trade-off. Is it worth never getting sued over a file someone uploaded that they didn't own? Yes.

### Escrow Funds → Razorpay Payment Links / Order API

**Current state**: You're already using Razorpay for escrow.

**Better**: Ensure the flow is:
1. Brand clicks "Fund deal" → your server calls Razorpay to create an order
2. Brand pays on Razorpay's hosted checkout page
3. Razorpay holds the funds in their escrow settlement pool
4. When conditions met, Razorpay releases to creator

**Crucial**: Money never settles to your bank account. Not even temporarily. It goes from brand's card → Razorpay's escrow pool → creator's fund account.

### Database → Supabase (managed)

**Current state**: You're using Supabase already.

**Good**: They handle encryption at rest, automated backups, patch management, compliance certs (SOC 2, ISO 27001). If there's a database breach, it's Supabase's infrastructure failure, not yours — but the data exposure is still your problem.

**Mitigation**: Encrypt sensitive fields at the application layer before storing (email, display_name). That way even Supabase can't read them.

---

## Phase 3: What You MUST Hold — Minimize Surface Area

For data you genuinely need, store the minimum viable set.

### What to actually store

- User ID (auto-increment integer or UUID)
- Email (hash it + encrypt it separately for delivery; or just encrypt at app level)
- Display name (users choose this, not real name)
- OAuth provider ID (Google sub, GitHub ID)
- Valueskins data (profession, slot, xp, level — no real identity info)
- Deal records (title, budget, phase, timestamps — transactional, not personal)
- Deal messages (purge after 90 days post-completion)

### What to NOT store

| Field | Why not |
|---|---|
| Phone number | DPDP + breach risk. You don't need it. |
| Real name | Display name is enough. No legal name unless required for payouts (and Razorpay handles that). |
| Date of birth | DPDP sensitive data. T&S says "you must be 18+." No need to verify or store. |
| Gender | Not needed. Don't collect it. Not even "optional." |
| Address | Not needed. Razorpay collects address for payouts. |
| Government ID | Never. Razorpay does KYC. |
| Bank account / IFSC | Never. Razorpay collects and stores. |
| IP address log | If you log IPs, you create a data point that can be requested in discovery. Log for rate limiting only, purge after 24 hours. |
| User agent / browser fingerprint | Same as IP. Don't build user surveillance systems. |
| Device tokens | Only for push notifications, and only if user opts in. Purge if unused for 30 days. |
| Chat message content | Store only during active deal. Purge 90 days after completion. |
| Content/files | Never host. User provides links. |
| Payment history beyond deal records | Razorpay stores the full history. You just need deal state. |

---

## Summary: The Data You Actually Keep

```
Your database:
├── users
│   ├── id
│   ├── email (encrypted at app level)
│   ├── display_name
│   ├── oauth_provider + oauth_id
│   └── password_hash (if email auth)
├── valueskins
│   ├── profession, slot, xp, level (no PII)
│   └── about_me, pitch_text
├── deals
│   ├── title, budget, phase, status
│   └── creator_id, brand_id
├── deal_messages
│   └── text, sender_id, timestamp (purged 90d after deal completes)
└── sessions
    └── token, user_id, expires_at

NOT in your database:
├── Phone numbers
├── Real names / legal names  
├── Date of birth / age
├── Gender
├── Address
├── Government ID / PAN
├── Bank account / IFSC
├── IP addresses (only transient in logs, purged 24h)
├── Device tokens (only if user opted in, purged if unused)
├── Files / images / videos
├── Payment transaction details (only deal state)
└── Content assets (user provides links)
```

---

## The Trade-Offs You Accept

| Not doing | User impact | Why it's worth it |
|---|---|---|
| File hosting | Creator must upload to Drive/Dropbox | Never sued for copyright infringement. Ever. |
| Phone number | No SMS 2FA | Email + authenticator app for 2FA is better security anyway |
| KYC verification | Users self-report | If they lie, it's fraud, not your problem |
| Content moderation | Some low-quality content | You're protected by Section 79 safe harbor |
| Real name collection | Users use display names | Reduces DPDP exposure significantly |
| Payment details | User enters on Razorpay's site | You never see bank info → no breach risk |

---

## One Exception You Should Make

Deliverable links can go dead (expired Google Drive link). Your T&S should say: "Creator is responsible for maintaining access to deliverables for 90 days post-deal. If link expires, creator must re-share upon request."

This keeps liability on the creator, not you.

---

## Conclusion

The safest database is the one you never create. Every field you don't collect is a lawsuit you can't lose. Every third party that holds the risky data is a legal barrier between you and liability.

Maximize "not my problem." That's the agency replacement.

---

## Going Global: Which Laws Actually Apply

If you have users in multiple countries, technically you need to follow their laws too. But "technically" and "will get enforced against an Indian pre-revenue startup" are different things.

Here's the real picture:

### The minimum you must do

Your current India compliance (DPDP) already covers most of what the global laws require. The "don't touch it" strategy was designed for India but accidentally makes you 80% compliant everywhere:

| Requirement | DPDP (India) | GDPR (EU) | CCPA (California) | What you already do |
|---|---|---|---|---|
| Consent before collection | ✅ | ✅ | ✅ | Planned (checkbox on signup) |
| Right to deletion | ✅ | ✅ | ✅ | Your `/api/auth/request-deletion` |
| Purpose limitation | ✅ | ✅ | ✅ | Don't collect what you don't need |
| Breach notification | ✅ | ✅ | ✅ | Need to build alert system |
| Data minimization | ✅ | ✅ | ✅ | Core philosophy — don't touch it |
| Privacy policy | ✅ | ✅ | ✅ | Need to write one |
| No excessive retention | ✅ | ✅ | ⚠️ | Messages purged 90d post-deal |
| Right to access data | ⚠️ | ✅ | ✅ | Easy to add — just dump their DB row |
| Data portability | ❌ | ✅ | ✅ | Not planned, easy to add (export JSON) |
| DPO appointment | ⚠️ (at scale) | ✅ (at scale) | ❌ | Not needed until you're large |
| Cross-border transfer rules | ✅ (within India) | 🚨 | ❌ | If EU user's data is stored in India — this is the gap |
| Cookie consent | ❌ | 🚨 | ⚠️ | Not implemented |
| Age of digital consent | 18 | 16 (varies by country) | 13 | Just say 18+ in T&S; don't verify |

### The real risk by jurisdiction

**India** — HIGH. This is where you're incorporated, where your bank is, where courts can actually reach you. You must comply with DPDP, IT Act, GST, CA 2019. Non-compliance here is enforceable tomorrow.

**US (California — CCPA)** — LOW. CCPA applies to businesses that meet revenue/user thresholds ($25M revenue or 50K+ CA users). You're nowhere near that. Even if you were, CCPA enforcement against an Indian company with no US presence is impractical. Don't worry about it.

**EU (GDPR)** — MEDIUM. GDPR technically applies if you have any EU users. But enforcement:
- EU regulators go after companies with EU presence (Meta, Google, Apple) or companies actively targeting EU users
- An Indian startup that doesn't market to Europe, doesn't have an EU entity, and just happens to have 20 EU users who found the site themselves? Practically zero enforcement risk
- OneData's survey showed 95%+ of GDPR fines go to companies with EU headquarters
- The remaining 5% are companies actively selling to EU consumers

**Brazil (LGPD) / South Africa (POPIA) / Thailand (PDPA)** — VERY LOW. Same logic as GDPR but less enforcement.

### The pragmatic approach

**Phase 1 (now — India only)**:
- Full DPDP compliance
- IT Act Section 79 safe harbor (takedown, grievance officer)
- GST registration
- Pvt Ltd
- Don't think about global laws

**Phase 2 (when you get first non-India user)**:
- Add a privacy policy that covers EU+California too (any lawyer can draft one that covers all major jurisdictions for ₹30-50K)
- Make sure deletion + consent mechanisms work for all users (they already do)
- You're already 80% compliant just by not collecting much data

**Phase 3 (when you're actively growing in a jurisdiction)**:
- Hire a local lawyer in that jurisdiction for a one-time review
- Add jurisdiction-specific disclosures
- This is a year+ away

### What changes if you go global?

**The gap you actually need to close for GDPR**:

1. **Data transfer mechanism**: If an EU user signs up, their data is stored in India. GDPR requires an "adequate level of protection" for cross-border transfers. The current mechanism is either:
   - Standard Contractual Clauses (SCCs) — a template you sign with your data processors. Free, just paperwork.
   - Binding Corporate Rules — too complex for a startup.
   - Adequacy decision — EU hasn't declared India adequate (yet).
   
   **Fix**: Add SCCs to your contracts with Supabase/AWS/Razorpay. This is a checkbox your platform lawyer can handle.

2. **Cookie consent**: GDPR requires opt-in consent for non-essential cookies. DPDP doesn't explicitly require this. If you have EU users, you need a cookie banner.
   - **Fix**: Use a free cookie consent widget (CookieYes, Osano). ~₹0-5K/year for the free tier.

3. **Data portability**: User can request all their data in machine-readable format.
   - **Fix**: Add a `/api/auth/export-data` endpoint. ~2 hours of dev work.

4. **GDPR-compliant T&S**: Certain disclosures required (right to lodge complaint with supervisory authority, etc.)
   - **Fix**: Your lawyer includes these when drafting the T&S for India. Ask them to cover EU too.

**The gap you actually need to close for CCPA**:

Practically nothing at your scale. If you cross $25M revenue or 100K California users, then you need a "Do Not Sell My Personal Information" link. That's years away.

### The honest truth

> "The risk of getting fined by a European regulator as an Indian startup with incidental EU users is so low it's not worth thinking about at MVP stage."

Same for California. Same for Brazil.

The real risk is:
1. India — yes, you're here, get compliant
2. Any jurisdiction where you open a physical office — then you're fair game
3. Any jurisdiction where you actively market — then you're fair game
4. Any jurisdiction where a user decides to make you their personal vendetta — possible but unlikely

### Recommendation

Go global by default. Don't block any country. Don't think about their laws.

**What to do**:
1. Comply with India fully (₹70K-1.5L setup)
2. Use the "don't touch it" strategy for everything (makes you compliant everywhere)
3. Have your Indian lawyer add GDPR-friendly clauses to your T&S (one extra line item, maybe ₹5-10K more)
4. Add a basic cookie consent banner (free widget)
5. Add data export endpoint (2 hours)
6. That's it

**What NOT to do**:
- Don't register for GST in the EU (you don't have an establishment there)
- Don't appoint an EU representative (you're not a data processor for EU controllers)
- Don't do a "GDPR compliance project" (you'd spend ₹5L chasing something you don't need)
- Don't block EU users (you'd lose users for no benefit)

The "don't touch it" strategy is jurisdiction-agnostic. If you don't store it, no law can punish you for leaking it. That's the whole point.
