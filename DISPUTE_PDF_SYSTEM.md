# ValueSkins Dispute Resolution & PDF Proof System

## Overview
Complete system for resolving disputes with irrefutable proof via versioned PDFs. Disputes can ONLY be entertained when deals are actively progressing (in_progress/review/completed phases).

---

## 1. PDF GENERATION & DOWNLOAD

### User-Facing Feature (In Deal Pages)

**Component:** `<DealPDFDownloader dealId={dealId} dealPhase={dealPhase} />`

**Availability:**
- Only available when deal is in: `in_progress`, `review`, or `completed` phases
- Hidden for pending, cancelled, or completed-paid deals

**What Users Can Do:**
1. Click "Generate PDF" button
2. PDF automatically generates + downloads
3. PDF auto-uploads to Firebase Storage
4. View all previous PDF versions (proof timeline)
5. Download any version to see deal progression

**PDF Contents (Every Generation):**
- Deal title, amount, currency, timeline
- Brand requirements (what was promised)
- All chat messages from start to generation time
- All submitted deliverables (with timestamps)
- Current deal phase/status
- Generated timestamp

### API Endpoints

**Generate & Download PDF:**
```
POST /api/deals/generate-pdf
Body: { dealId, action: "generate" }
Response: PDF file (auto-download)
```

**List All PDF Versions:**
```
POST /api/deals/generate-pdf
Body: { dealId, action: "list-versions" }
Response: [{ name, path, timestamp }, ...]
```

**Download Specific Version:**
```
GET /api/deals/download-pdf?path={filepath}
Response: PDF file
```

### Firebase Storage Structure
```
gs://valueskins-bucket/
  deals/
    {dealId}/
      pdfs/
        {dealId}-2024-07-16T14-30-45-123Z.pdf (v1)
        {dealId}-2024-07-16T15-45-30-456Z.pdf (v2)
        {dealId}-2024-07-17T09-12-15-789Z.pdf (v3)
```

Each version timestamped, showing exact progression of work.

---

## 2. DISPUTE RESOLUTION IN ADMIN DASHBOARD

### Access: `/admin/disputes`

### Rules (Non-Negotiable)

**✅ Disputes Shown ONLY When:**
- Deal phase = `in_progress` (creator working)
- Deal phase = `review` (brand reviewing)
- Deal phase = `completed` (final review before payout)

**❌ Disputes NOT Shown For:**
- Pending deals (not started yet)
- Cancelled deals (already dead)
- Completed-paid deals (already resolved)

### Admin Interface

**Left Panel: Dispute List**
- Shows all open disputes for active deals
- Sortable by: newest first, severity
- Click to select for resolution

**Right Panel: Dispute Detail & Resolution**

**Evidence Shown:**
1. **Deal Terms** (what was agreed)
   - Title, amount, timeline, scope

2. **All Chat Messages** (proof of communication)
   - Full conversation history with timestamps
   - Shows exactly what was promised

3. **Deliverables Submitted** (what was actually delivered)
   - Files, descriptions, status
   - Revision history

4. **User Evidence** (uploaded by parties)
   - Screenshots, docs, recordings
   - Admin can download/review

5. **PDF Versions** (proof timeline)
   - All versions generated during deal
   - Admin can download any version
   - Compare v1 (initial expectations) vs v3 (current state)

### Resolution Options

Admin chooses ONE:

```
1. FULL PAYMENT TO CREATOR (100% payout)
   - Use if: Brand was wrong, creator delivered properly
   - Triggers: Move deal to completed, create payout record

2. FULL REFUND TO BRAND (0% creator payout)
   - Use if: Creator failed to deliver without reason
   - Triggers: Move deal to completed, no payout

3. SPLIT 50/50 (50% to each)
   - Use if: Both at fault, partial delivery
   - Triggers: Move deal to completed, 50% payout to creator

4. BAN CREATOR
   - Use if: Fraud, repeated non-delivery, harassment
   - Triggers: Mark user as banned, suspend account permanently
   - Effect: User cannot post, accept deals, or message

5. BAN BRAND
   - Use if: Fraud, scam behavior, harassment
   - Triggers: Mark user as banned, suspend account permanently
   - Effect: User cannot create deals or message
```

**Admin Must Provide:**
- Resolution choice
- Detailed notes explaining reasoning
- Both are required before confirming

### What Happens After Resolution

```
1. Dispute marked as: resolved_creator / resolved_brand / resolved_split / dismissed
2. If not ban: Deal moves to phase = "completed"
3. If resolution chosen: Payout created (amount based on resolution)
4. User status: Updated if banned
5. Audit trail: Logged with admin notes
6. Both parties notified: Deal is resolved
```

---

## 3. PROOF SYSTEM (Irrefutable Evidence)

### Why PDFs Are The Ultimate Proof

**Timeline Example:**

**PDF v1 (Generated day 1, in_progress phase):**
- Deal scope: "Create 10 Instagram posts"
- Chat: Brand: "I need posts about summer fashion"
- Brand: "Deadline is July 30"
- Deliverables submitted: None yet

**PDF v2 (Generated day 7, in_progress phase):**
- Same deal scope
- New chats show: Creator sent 5 posts
- Brand: "Great! But I need more fashion focus"
- Creator: "Updating posts..."

**PDF v3 (Generated day 12, review phase):**
- Deal scope: "Create 10 Instagram posts"
- Full chat history (all negotiation)
- All 10 posts delivered
- Brand: "These look good, approving"
- Dispute raised: "Quality not as expected"

**In Dispute Resolution:**
- Admin downloads PDF v1: Shows initial agreement
- Admin downloads PDF v2: Shows creator progress + brand feedback
- Admin downloads PDF v3: Shows final delivery + context of quality complaint
- Admin compares all 3: Timeline proves creator delivered on brand feedback

**Verdict:** Clear proof that creator adapted to feedback and delivered. Full payment awarded.

---

## 4. DATABASE SCHEMA

### deal_disputes Table
```sql
CREATE TABLE deal_disputes (
  id UUID PRIMARY KEY,
  deal_id TEXT NOT NULL,
  raised_by UUID NOT NULL,          -- which party raised dispute
  reason VARCHAR(50),               -- deliverable_not_as_agreed, missed_deadline, etc.
  description TEXT,                 -- detailed complaint
  evidence_urls JSONB,              -- array of uploaded file URLs
  status VARCHAR(50),               -- open, under_review, resolved_creator, resolved_brand, resolved_split, dismissed
  admin_notes TEXT,                 -- why admin chose this resolution
  resolved_at TIMESTAMP,            -- when resolved
  created_at TIMESTAMP
);
```

### deal_payouts Table
```sql
CREATE TABLE deal_payouts (
  id UUID PRIMARY KEY,
  deal_id TEXT NOT NULL,
  creator_id UUID NOT NULL,
  amount NUMERIC,                   -- amount to pay
  currency VARCHAR(3),              -- INR, USD, etc.
  status VARCHAR(50),               -- pending, completed, failed
  created_at TIMESTAMP
);
```

### users Table (Updated)
```sql
ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';  -- active, banned, suspended
ALTER TABLE users ADD COLUMN banned_at TIMESTAMP;
ALTER TABLE users ADD COLUMN ban_reason TEXT;
```

---

## 5. INTEGRATION CHECKLIST

**To fully activate system:**

- [ ] Add `DealPDFDownloader` component to deal chat/detail pages
- [ ] Set Firebase credentials in env vars:
  ```
  NEXT_PUBLIC_FIREBASE_API_KEY=...
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
  ```
- [ ] Ensure deal tables have `phase` column (in_progress, review, completed, etc.)
- [ ] Create `deal_payouts` table in database
- [ ] Add `status, banned_at, ban_reason` columns to users table
- [ ] Update deal UI to show "Generate PDF" button (when phase = in_progress/review/completed)
- [ ] Admin can access `/admin/disputes` (requires login)
- [ ] Test end-to-end: Generate PDF → Raise dispute → Admin resolves → Payout triggered

---

## 6. SECURITY & COMPLIANCE

**What This System Provides:**

✅ **Irrefutable Proof** — Timestamped PDF versions show exact progression
✅ **No Disputes in Gray Areas** — Only active deals can have disputes
✅ **Clear Decision Framework** — Admin has specific evidence to decide
✅ **Permanent Records** — All PDFs versioned in Firebase (can't be deleted)
✅ **User Safety** — Ban feature prevents repeat bad actors
✅ **Audit Trail** — Every resolution logged with reasoning
✅ **Fraud Prevention** — PDF versions catch false claims (can see who said what when)

**For Payment Processors:**
- Razorpay/Stripe care about: Clear dispute process + proof-based decisions
- This system shows: Structured process + irrefutable evidence + admin oversight
- Confidence: High (reduces chargeback risk from disputed deals)

---

## 7. TESTING CHECKLIST

**Before going live:**

- [ ] Generate PDF during in_progress phase
- [ ] Verify PDF contains: deal terms, all chats, deliverables
- [ ] Generate another PDF 1 hour later
- [ ] Confirm both versions stored in Firebase
- [ ] View version history (should show both with timestamps)
- [ ] Download v1 and v2 — verify different content
- [ ] Raise dispute on active deal
- [ ] Admin sees: deal details, chat history, PDF versions
- [ ] Admin resolves dispute (e.g., full to creator)
- [ ] Verify deal marked as completed
- [ ] Verify payout record created
- [ ] Verify user not banned (if not ban option)
- [ ] Test ban option: verify user status = banned
- [ ] Check audit logs: resolution recorded with notes

---

## 8. FUTURE ENHANCEMENTS

Not required now, but nice-to-have:

- [ ] AI analysis of PDFs (compare versions, flag inconsistencies)
- [ ] Video/screen recordings in evidence (for high-value disputes)
- [ ] Third-party expert review (for specialized niches)
- [ ] Dispute appeal process (if user disagrees with resolution)
- [ ] Analytics: dispute rate per creator/brand (identify risky patterns)
- [ ] Auto-resolution for simple cases (e.g., missed deadline + chat proof)

---

## Summary

**The system is complete and ready to deploy to staging for testing.**

- ✅ PDF generation with versioning
- ✅ Firebase storage integration
- ✅ Admin dispute resolution interface
- ✅ Ban user functionality
- ✅ Non-negotiable phase restrictions
- ✅ Clear proof-based decision framework

**Next step:** Test in staging environment, then deploy to production.
