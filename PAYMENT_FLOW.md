# ValueSkins Payment Flow: Complete Model

## The Math (Example: ₹10,000 Deal)

```
Brand Budget:                    ₹10,000.00
├─ ValueSkins Commission:        ₹885.00 (fixed, inc. 18% GST)
└─ Remaining for Creator:        ₹9,115.00
   ├─ Creator Advance (30%):     ₹2,734.50 (30% of ₹9,115)
   └─ Creator Final (70%):       ₹6,380.50 (70% of ₹9,115)

Total to Creator:                ₹9,115.00 ✓
Total to ValueSkins:             ₹885.00 ✓
Total from Brand:                ₹10,000.00 ✓
```

**Key Rules:**
- Commission is **fixed ₹885**, regardless of deal size
- Advance/Final percentages calculated on **remaining budget after commission**
- Creators assumed **no GST account** (individual service providers)
- Brand has **non-negotiable fixed budget**

---

## The Payment Flow (Step-by-Step)

### Step 1: Deal Lock & Commission Payment

**What Happens:**
1. Brand creates deal: "I have ₹10,000 budget for this creator"
2. ValueSkins calculates:
   - Commission: ₹885
   - Creator gets: ₹9,115 (₹2,734.50 advance + ₹6,380.50 final)
3. Brand clicks "Lock Deal"
4. Razorpay checkout opens: Brand pays ₹885 to ValueSkins
5. Razorpay confirms payment
6. ValueSkins generates **GST invoice** for brand

**Database:**
```
deals:
  - id: "deal_123"
  - creator_id: "creator_456"
  - brand_id: "brand_789"
  - total_budget: 10000.00
  - commission_amount: 885.00
  - creator_payout_amount: 9115.00
  - creator_advance: 2734.50
  - creator_final: 6380.50
  - status: "commission_paid"
  - commission_paid_at: "2026-09-21T10:30:00Z"

transactions:
  - id: "txn_comm_123"
  - deal_id: "deal_123"
  - type: "commission"
  - payer: "brand"
  - payee: "valueskins"
  - amount: 885.00
  - status: "completed"
  - razorpay_payment_id: "pay_xxxxx"
  - gst_invoice_number: "VS-2026-09-001"
```

---

### Step 2: Creator Notified & Accepts Deal

**What Happens:**
1. Creator gets notification: "Deal locked! Advance: ₹2,734.50, Final: ₹6,380.50"
2. Creator reviews and accepts deal
3. System verifies creator has bank account registered with Razorpay

---

### Step 3: Brand Releases Advance

**What Happens:**
1. Brand clicks "Release Advance" (₹2,734.50)
2. ValueSkins calls Razorpay Payouts API
3. Razorpay initiates NEFT/IMPS transfer
4. Creator receives ₹2,734.50 in 2-4 hours

**API Call:**
```
POST https://api.razorpay.com/v1/payouts
{
  "account_number": "2121... (ValueSkins' Razorpay account)",
  "fund_account_id": "fa_xxxxx (creator's bank, stored in Razorpay)",
  "amount": 273450,
  "currency": "INR",
  "mode": "NEFT",
  "reference_id": "deal_123_advance"
}
```

---

### Step 4: Creator Works on Deal

- Creator uses advance to cover initial costs
- Delivers content to brand
- Brand reviews and approves

---

### Step 5: Brand Releases Final Payment

**What Happens:**
1. Brand clicks "Release Final Payment" (₹6,380.50)
2. Same Razorpay Payouts flow, different amount
3. Creator receives ₹6,380.50 in 2-4 hours

---

### Step 6: Deal Completed

- Deal marked as "completed"
- All transactions immutable and logged
- Audit trail: Commission (₹885) + Advance (₹2,734.50) + Final (₹6,380.50) = ₹10,000

---

## Data Storage & Security

### What ValueSkins Stores (✅ ALLOWED)

```
creator_payouts:
  - creator_id
  - razorpay_contact_id (POINTER ONLY, not actual bank details)
  - bank_account_masked (e.g., "XXXX4321" - last 4 digits for reference)
  - verified (boolean)
  - created_at

transactions:
  - deal_id
  - type ("commission" | "creator_advance" | "creator_final")
  - amount
  - status ("completed" | "initiated" | "failed")
  - razorpay_transfer_id
  - razorpay_payment_id (commission only)
```

### What ValueSkins Does NOT Store (❌ FORBIDDEN)

```
✗ Actual bank account numbers
✗ IFSC codes
✗ Account holder full names
✗ Any unencrypted PII
```

### Where Bank Details Actually Live

**Razorpay's Encrypted Vault** (PCI-DSS compliant):
- Creator adds account in profile
- ValueSkins calls Razorpay API: Creates contact + fund account
- Razorpay stores encrypted, returns `contact_id`
- ValueSkins stores only the `contact_id` (reference)
- When paying: Use `contact_id` to reference the encrypted account

**Why:**
- ✅ ValueSkins never touches raw bank data
- ✅ Razorpay handles all compliance/security
- ✅ Your database is clean
- ✅ If Razorpay is breached, your data isn't exposed

---

## Tax & Compliance

### Commission (₹885 to ValueSkins)

```
Brand pays:        ₹885.00
Breakdown:
  - Base: ₹750
  - GST (18%): ₹135

ValueSkins:
  ├─ Generates GST invoice to brand
  ├─ Reports as service revenue
  ├─ Pays ₹135 GST to authorities
  └─ Keeps ₹750 (net)

Brand's Accounting:
  ├─ Can deduct ₹885 as business expense
  ├─ If GST-registered: Claims ₹135 input tax credit
  └─ Net cost: ₹750
```

### Creator Payments (₹9,115 to Creator)

```
Brand pays:        ₹9,115.00 (via Razorpay)
Creator receives:  ₹9,115.00 (no deductions by ValueSkins)

Creator's Responsibilities:
  ├─ Must report as income
  ├─ If annual income > ₹2.5L: File income tax return
  └─ GST: Not GST-registered (assumed), no GST invoice from ValueSkins

ValueSkins' Responsibilities:
  ├─ Facilitate payment (via Razorpay)
  ├─ Do NOT deduct TDS/GST
  ├─ Document transactions
  └─ Keep audit trail

UPI 0.4% Rule (if applicable):
  ├─ If Razorpay uses UPI for payout: Razorpay pays it
  ├─ If Razorpay uses NEFT: Rule doesn't apply
  ├─ ValueSkins: No liability
  └─ Creator: Receives full ₹9,115
```

---

## Error Handling

### Scenario 1: Payout Fails (Invalid Bank Account)

```
Razorpay webhook: "payout.failed"

Backend:
1. Updates transaction status: "failed"
2. Notifies creator: "Payment couldn't process. Update your bank details."
3. Notifies brand: "Advance failed. Creator is updating details."

Fix:
- Creator updates bank account
- Brand clicks "Retry" button
- Process repeats
```

### Scenario 2: Double Payment Prevention

```
Brand clicks "Release Advance" twice

Backend checks: deal.status == "advance_paid" ?
→ YES: Return error "Advance already released"
→ NO: Process the payment

Prevents duplicate charges ✓
```

### Scenario 3: Creator No Bank Account

```
Brand tries to release advance

Backend checks: creator_payouts.verified ?
→ NO: Show error
      "Creator must verify bank account. 
       Notifying them to add details."
      
Creator gets notification:
→ Adds bank account
→ Razorpay verifies (1-2 days)
→ Brand can retry
```

---

## Implementation Checklist

- [ ] Razorpay Payouts API enabled
- [ ] Webhook signature verification (HMAC-SHA256)
- [ ] Database schema (deals, transactions, creator_payouts tables)
- [ ] GST invoice generation
- [ ] Creator bank account verification flow
- [ ] Commission payment Razorpay checkout
- [ ] Advance payout API call
- [ ] Final payout API call
- [ ] All webhook handlers (payment confirmed, payout success, payout failed)
- [ ] Error handling & retry logic
- [ ] Notifications (email/SMS/in-app) for each step
- [ ] Payment dashboard (transaction history)
- [ ] Audit trail logging
- [ ] Tax reporting exports

---

## Final Summary

| Action | Who | How | When |
|--------|-----|-----|------|
| Commission (₹885) | Brand → ValueSkins | Razorpay checkout | Deal lock |
| Commission invoice | ValueSkins | Generated & emailed | After payment confirmed |
| Advance (₹2,734.50) | Brand → Creator | Razorpay Payouts | After commission paid |
| Final (₹6,380.50) | Brand → Creator | Razorpay Payouts | After deal completion |
| GST invoice | ValueSkins | Generated for commission | Deal lock |
| Audit trail | ValueSkins | Database logging | Every transaction |
| Error handling | ValueSkins | Webhooks + retries | Real-time |

---

## Why This Works

✅ **Creator Trust** — Money hits account in 2-4 hours  
✅ **Brand Confidence** — Clear, traceable payment flow  
✅ **ValueSkins Protection** — Commission collected upfront  
✅ **Compliance** — GST invoiced, transactions documented  
✅ **Security** — Bank details never stored by ValueSkins  
✅ **Scalability** — Works for 1 deal or 100K deals  
✅ **Audit Ready** — Full transaction ledger  
✅ **Razorpay Liability** — They handle payout processing & compliance  

---

**Last Updated:** 2026-09-21  
**Status:** Ready for implementation
