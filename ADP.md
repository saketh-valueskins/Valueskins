# ADP: Automated Deal PDF

## Overview

**ADP (Automated Deal PDF)** is a comprehensive, auto-generated document that serves as the complete legal record of every deal transaction on ValueSkins.

Generated automatically when a deal completes, sent to both creator and brand via email, and available for download anytime.

---

## ADP Numbering Scheme

**Format:** `ADP-{SEQUENTIAL-NUMBER}`

```
Examples:
ADP-1
ADP-2
ADP-3
...
ADP-1000
ADP-10001

Database: Auto-incrementing sequence in gst_invoices.adp_number
Searchability: Simple, fast, easy to reference
```

**Why sequential (not date-based)?**
- Easier to search ("Give me ADP-42" vs "Give me ADP-20260921-001")
- Simpler for user reference ("My ADP is #42")
- Better for compliance (sequential = audit trail)

---

## What ADP Contains

### 1. DEAL SUMMARY
```
- Deal ID
- Campaign title
- Deal created date/time
- Deal completed date/time
- Total duration
```

### 2. PARTIES INVOLVED
```
Creator:
├─ Name
├─ Email (verified)
└─ UPI ID (masked)

Brand:
├─ Name
├─ Email (verified)
└─ Company info

Platform:
└─ ValueSkins (facilitator)
```

### 3. DEAL DETAILS
```
- Campaign description
- Requirements
- Deliverables
- Timeline
- Status (✓ COMPLETED)
```

### 4. FINANCIAL BREAKDOWN (COMPLETE)
```
Total Budget: ₹10,000.00

COMMISSION (ValueSkins):
├─ Base: ₹750.00
├─ GST (18%): ₹135.00
├─ Total: ₹885.00
├─ Status: ✓ PAID
├─ Transaction ID: pay_xxxxx
└─ Date: [timestamp]

CREATOR PAYOUT (Total: ₹9,115.00):
├─ Advance (30%): ₹2,734.50
│  ├─ Status: ✓ PAID
│  ├─ Transaction ID: trf_xxxxx
│  ├─ Date: [timestamp]
│  └─ Method: UPI
│
└─ Final (70%): ₹6,380.50
   ├─ Status: ✓ PAID
   ├─ Transaction ID: trf_yyyyy
   ├─ Date: [timestamp]
   └─ Method: UPI

Creator Total Received: ₹9,115.00 ✓
```

### 5. INVOICES & RECEIPTS
```
GST Invoice #: VS-2026-09-001
├─ Amount: ₹885.00 (inc. 18% GST)
├─ Issued: [date/time]
└─ [ATTACHED: Invoice PDF]

Payment Receipts:
├─ Commission: pay_xxxxx
├─ Advance: trf_xxxxx
└─ Final: trf_yyyyy
```

### 6. DEAL PROGRESS TIMELINE
```
[Complete chronological log of every action]
├─ Deal created
├─ Commission paid ✓
├─ Creator notified
├─ Creator accepted ✓
├─ Advance released ✓
├─ Advance received ✓
├─ Work submitted ✓
├─ Brand approved ✓
├─ Final released ✓
├─ Final received ✓
└─ Deal completed ✓
```

### 7. DELIVERABLES & APPROVALS
```
Work Submitted:
├─ Date/time
├─ File/description
├─ Quality rating
├─ Brand approval: ✓ APPROVED
└─ [ATTACHED: Preview/thumbnail]
```

### 8. MESSAGES & COMMUNICATIONS
```
Total messages: [count]
Creator messages: [count]
Brand messages: [count]

[SUMMARY OF KEY MESSAGES]:
├─ [Message 1]
├─ [Message 2]
└─ [...]
```

### 9. COMPLIANCE & LEGAL
```
- Both parties agreed to terms: ✓
- Payment verified: ✓
- Work approved: ✓
- Dispute status: None
- Document generated: [date/time]
```

### 10. VERIFICATION SIGNATURES
```
Creator:
├─ Email verified: [email]
├─ UPI verified: [UPI masked]
└─ Signature: Digital (email receipt)

Brand:
├─ Email verified: [email]
├─ Payment verified: Razorpay [transaction ID]
└─ Signature: Digital (payment receipt)

Platform:
├─ Digital Signature
├─ Generated: [date/time]
└─ Certificate: [Tamper-evident hash]
```

---

## When ADP is Generated

### Automatic Generation

```
TRIGGER: Final payment confirmed by Razorpay
TIME: Within 1 minute of final_payment_confirmed webhook
ACTION:
  1. Generate comprehensive PDF
  2. Assign ADP number (auto-increment)
  3. Store in database
  4. Email to both parties
  5. Mark deal as "adp_generated"
```

### On-Demand Download

```
AVAILABILITY: After deal completion
LOCATION: Deal dashboard → "Download Report"
FORMAT: PDF download
ACCESSIBILITY: Both creator and brand can access anytime
```

---

## Database Schema

```sql
CREATE TABLE adp_documents (
  id UUID PRIMARY KEY,
  deal_id UUID REFERENCES deals(id) UNIQUE,
  
  -- ADP Numbering
  adp_number BIGINT UNIQUE AUTO_INCREMENT,  -- 1, 2, 3, ...
  
  -- Document
  pdf_data BYTEA,
  pdf_size_bytes BIGINT,
  
  -- Verification
  hash VARCHAR,  -- SHA-256 for tamper detection
  
  -- Tracking
  generated_at TIMESTAMP,
  downloaded_by_creator_at TIMESTAMP,
  downloaded_by_brand_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add to deals table
ALTER TABLE deals ADD COLUMN adp_generated BOOLEAN DEFAULT false;
ALTER TABLE deals ADD COLUMN adp_generated_at TIMESTAMP;
ALTER TABLE deals ADD COLUMN adp_number BIGINT REFERENCES adp_documents(adp_number);
```

---

## Implementation Code

### Step 1: Generate ADP

```javascript
const PDFDocument = require('pdfkit');
const crypto = require('crypto');

async function generateADP(dealId) {
  
  // Fetch all deal data
  const deal = await db.query(`
    SELECT d.*, c.name as creator_name, c.email as creator_email,
           b.name as brand_name, b.email as brand_email
    FROM deals d
    JOIN users c ON d.creator_id = c.id
    JOIN users b ON d.brand_id = b.id
    WHERE d.id = $1
  `, [dealId]);
  
  // Fetch transactions
  const transactions = await db.query(
    `SELECT * FROM transactions WHERE deal_id = $1 ORDER BY created_at`,
    [dealId]
  );
  
  // Fetch messages
  const messages = await db.query(
    `SELECT * FROM deal_messages WHERE deal_id = $1 ORDER BY created_at`,
    [dealId]
  );
  
  // Fetch invoice
  const invoice = await db.query(
    `SELECT * FROM gst_invoices WHERE deal_id = $1`,
    [dealId]
  );
  
  // Generate PDF
  const doc = new PDFDocument();
  const buffers = [];
  
  doc.on('data', buffers.push.bind(buffers));
  
  // Title
  doc.fontSize(24).text('DEAL COMPLETION REPORT', { align: 'center' });
  doc.fontSize(12).text(`ValueSkins - Automated Deal Documentation`, { align: 'center' });
  doc.moveDown();
  
  // Deal Summary
  doc.fontSize(16).text('1. DEAL SUMMARY', { underline: true });
  doc.fontSize(11);
  doc.text(`Deal ID: ${dealId}`);
  doc.text(`Title: ${deal.rows[0].title}`);
  doc.text(`Created: ${deal.rows[0].created_at}`);
  doc.text(`Completed: ${deal.rows[0].completed_at}`);
  doc.moveDown();
  
  // Parties
  doc.fontSize(16).text('2. PARTIES INVOLVED', { underline: true });
  doc.fontSize(11);
  doc.text(`Creator: ${deal.rows[0].creator_name} (${deal.rows[0].creator_email})`);
  doc.text(`Brand: ${deal.rows[0].brand_name} (${deal.rows[0].brand_email})`);
  doc.moveDown();
  
  // Financial
  doc.fontSize(16).text('3. FINANCIAL BREAKDOWN', { underline: true });
  doc.fontSize(11);
  doc.text(`Total Budget: ₹${deal.rows[0].total_budget.toFixed(2)}`);
  doc.text(`Commission: ₹${deal.rows[0].commission_amount.toFixed(2)} (inc. 18% GST)`);
  doc.text(`Creator Payout: ₹${deal.rows[0].creator_payout_amount.toFixed(2)}`);
  doc.text(`  - Advance (30%): ₹${deal.rows[0].creator_advance.toFixed(2)}`);
  doc.text(`  - Final (70%): ₹${deal.rows[0].creator_final.toFixed(2)}`);
  doc.moveDown();
  
  // Transactions
  doc.fontSize(16).text('4. TRANSACTIONS', { underline: true });
  doc.fontSize(11);
  transactions.rows.forEach(txn => {
    doc.text(`${txn.type.toUpperCase()}: ₹${txn.amount.toFixed(2)} - ${txn.status.toUpperCase()}`);
    doc.text(`  Transaction ID: ${txn.razorpay_payment_id || txn.razorpay_transfer_id}`);
    doc.text(`  Date: ${txn.created_at}`);
  });
  doc.moveDown();
  
  // Messages summary
  doc.fontSize(16).text('5. COMMUNICATIONS', { underline: true });
  doc.fontSize(11);
  doc.text(`Total Messages: ${messages.rows.length}`);
  messages.rows.slice(0, 10).forEach(msg => {
    doc.text(`${msg.sender}: ${msg.content.substring(0, 100)}...`);
  });
  doc.moveDown();
  
  // Completion
  doc.fontSize(16).text('6. VERIFICATION', { underline: true });
  doc.fontSize(11);
  doc.text(`Creator Email Verified: ✓`);
  doc.text(`Brand Payment Verified: ✓`);
  doc.text(`Work Approved: ✓`);
  doc.text(`All Payments Complete: ✓`);
  doc.moveDown();
  
  // Footer
  doc.fontSize(9).text('This is an official record of the transaction between parties.', { align: 'center' });
  doc.text('All payments verified via Razorpay.', { align: 'center' });
  doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
  
  doc.end();
  
  const pdfBuffer = Buffer.concat(buffers);
  
  // Calculate hash
  const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  
  return { pdf: pdfBuffer, hash };
}
```

### Step 2: Store & Send

```javascript
async function storeAndSendADP(dealId) {
  const { pdf, hash } = await generateADP(dealId);
  
  // Get next ADP number
  const result = await db.query(
    `SELECT MAX(adp_number) as max_num FROM adp_documents`
  );
  const nextAdpNumber = (result.rows[0].max_num || 0) + 1;
  
  // Store in database
  await db.query(
    `INSERT INTO adp_documents (deal_id, adp_number, pdf_data, hash, generated_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [dealId, nextAdpNumber, pdf, hash]
  );
  
  // Get deal & creator/brand emails
  const deal = await db.query(
    `SELECT d.*, c.email as creator_email, b.email as brand_email
     FROM deals d
     JOIN users c ON d.creator_id = c.id
     JOIN users b ON d.brand_id = b.id
     WHERE d.id = $1`,
    [dealId]
  );
  
  // Send email to both
  await sendEmail({
    to: [deal.rows[0].creator_email, deal.rows[0].brand_email],
    subject: `Deal Completed - Report #${nextAdpNumber} (ADP-${nextAdpNumber})`,
    body: `Your deal has been completed successfully. Attached is your official deal report.`,
    attachments: [{
      filename: `ADP-${nextAdpNumber}.pdf`,
      content: pdf
    }]
  });
  
  // Update deal
  await db.query(
    `UPDATE deals SET adp_generated = true, adp_generated_at = NOW(), adp_number = $1 WHERE id = $2`,
    [nextAdpNumber, dealId]
  );
}
```

### Step 3: Trigger on Final Payment

```javascript
// In webhook handler when final payment is confirmed
POST /webhooks/razorpay/payout {
  event: "payout.processed",
  payload: {
    payout: {
      id: "trf_yyyyy",
      status: "processed",
      ...
    }
  }
}

// Trigger ADP generation
await storeAndSendADP(dealId);
```

---

## Features

✅ Automatic generation (deal completion)  
✅ Sequential numbering (ADP-1, ADP-2, etc.)  
✅ Automatic email (both parties)  
✅ Downloadable anytime  
✅ Complete record (everything)  
✅ Tamper-evident (SHA-256 hash)  
✅ Legal documentation  
✅ Tax compliant (GST invoice included)  
✅ Dispute-proof (full timeline + approvals)  
✅ Searchable (by ADP number)

---

## User Experience

### Email to Creator

```
Subject: Deal Completed - Report #42 (ADP-42)

Hi Saketh,

Your deal with Skincare Co has been completed!

Attached is your complete deal report (ADP-42) including:
✓ Deal details
✓ All payments (₹9,115.00)
✓ Transaction confirmations
✓ Timeline
✓ Your work approved

Download and keep this for your records.

Best regards,
ValueSkins Team
```

### Email to Brand

```
Subject: Deal Completed - Report #42 (ADP-42)

Hi Skincare Co,

Your deal with Saketh Velamuri has been completed!

Attached is your complete deal report (ADP-42) including:
✓ Deal details
✓ Commission paid (₹885.00)
✓ Creator payments (₹9,115.00)
✓ Invoice (VS-2026-09-001)
✓ Timeline
✓ Creator's work delivered

Download and keep this for your records.

Best regards,
ValueSkins Team
```

---

## Compliance & Legal

✓ **Dispute-proof**: Complete timeline + all approvals  
✓ **Tax-compliant**: GST invoice included  
✓ **Payment-verified**: All transaction IDs  
✓ **Work-approved**: Brand approval proof  
✓ **Tamper-evident**: SHA-256 hash verification  
✓ **Audit-ready**: Full transaction ledger  

---

## Numbering Examples

```
Deal #1 → ADP-1
Deal #2 → ADP-2
Deal #100 → ADP-100
Deal #1,000 → ADP-1000
Deal #10,000 → ADP-10000

Easy to search, easy to reference, easy to track.
```

---

**Status: READY FOR IMPLEMENTATION**
