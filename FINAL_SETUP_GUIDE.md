# 🚀 ValueSkins Payment System - Final Setup Guide

**Status**: Code deployed to production ✅  
**Database**: Schema ready, migration SQL created  
**UI**: Profile gating + campaign creation built  
**Razorpay**: Live keys configured  
**Webhooks**: Handler ready, needs URL configuration  

---

## 30-Minute Setup (What You Need to Do)

### Step 1: Connect Database (5 min)

Your production database needs to be connected and the schema migrated.

**Option A: Using Vercel Database (Recommended)**
```bash
# If using Vercel Postgres (via marketplace)
# The migration will run automatically on deploy

# Or manually in Vercel dashboard:
# Settings → Environment Variables → Add DATABASE_URL
```

**Option B: Using External PostgreSQL**
```bash
# 1. Get your production PostgreSQL URL
# Format: postgresql://user:password@host:port/dbname

# 2. Add to Vercel:
vercel env add DATABASE_URL
# Paste: postgresql://user:password@...

# 3. Apply migration:
cd marketplace
npx prisma migrate deploy
```

### Step 2: Configure Razorpay Webhook (5 min)

The payment flow triggers automatically via webhooks.

**Step-by-step:**
1. Login to Razorpay Dashboard: https://dashboard.razorpay.com
   - Key: rzp_live_TekVOBIGOSU2BJ
   - Secret: V6rmiTTyv7Twz43ATy1RvELP

2. Go to Settings → Webhooks → Create New Webhook

3. Fill in:
   - **URL**: `https://valueskins-final.vercel.app/api/webhooks/razorpay`
   - **Events**: Select all:
     - ☑ payment.authorized
     - ☑ payment.captured
     - ☑ payment.failed
     - ☑ payout.initiated
     - ☑ payout.processed
     - ☑ transfer.settled
   - **Active**: ✓ Yes

4. Click Create → Copy Webhook Secret

5. Add to Vercel:
   ```bash
   vercel env add RAZORPAY_WEBHOOK_SECRET
   # Paste the secret from step 4
   ```

### Step 3: Configure Email Service (5 min)

GST invoices and ADPs are emailed automatically.

**Step-by-step:**
1. Generate Gmail App Password (not your Gmail password):
   - Go to https://myaccount.google.com/apppasswords
   - Select: Mail + Windows Computer
   - Copy 16-character password

2. Add to Vercel:
   ```bash
   vercel env add GMAIL_PASSWORD
   # Paste the 16-character password
   ```

3. Verify email config is set:
   ```bash
   vercel env pull .env.production.local
   # Check GMAIL_USER=billing@valueskins.com
   ```

### Step 4: Deploy Updated Environment (5 min)

Redeploy with new environment variables.

```bash
# Option A: Automatic
git push origin main
# Vercel auto-deploys

# Option B: Manual
vercel --prod
```

### Step 5: Verify Everything Works (5 min)

Test the complete flow:

```bash
# 1. Check environment
curl https://valueskins-final.vercel.app/api/payment/validate-env

# Expected response:
# {"status":"READY","razorpay_configured":true,"database_configured":true}

# 2. Test commission payment
curl -X POST https://valueskins-final.vercel.app/api/payment/initiate-commission \
  -H "Content-Type: application/json" \
  -d '{
    "deal_id": "test_123",
    "brand_id": "test_456",
    "amount": 885
  }'

# Expected: order_id + Razorpay key

# 3. Check logs
vercel logs --tail
```

---

## After Setup: The Complete Flow

### 1. Brand Creates Campaign
- Brand navigates to `/campaigns/create`
- Fills one form (title, budget, requirements, script)
- Sees payment breakdown (fixed ₹885 commission)
- Clicks "Proceed to Payment"

### 2. Razorpay Checkout
- Razorpay modal opens
- Brand completes payment (₹885 commission)
- Webhook fires: `payment.captured`

### 3. Auto Advance Payout (30%)
- System processes webhook
- Creates Razorpay payout to creator
- Sends email to creator: "You've got a deal! ₹2,734.50 advance"
- Creator receives via UPI/Bank in 2-4 hours

### 4. Creator Does Work
- Creator uploads deliverable
- Brand reviews

### 5. Auto Final Payout (70%)
- Brand approves work
- System creates final payout via Razorpay
- Creator receives ₹6,380.50
- System generates ADP-# PDF automatically

### 6. Auto Document Generation
- Final payment confirmed
- System generates ADP (Automated Deal PDF):
  - Sequential numbering (ADP-1, ADP-2, ...)
  - 10-section document (deal summary, parties, financials, etc.)
  - SHA-256 hash for tamper detection
- Email sent to both parties with PDF attached

### 7. Deal Complete
- Both parties have documentation
- No manual invoicing needed
- No manual payouts needed
- Zero ValueSkins fees absorbed (business model)

---

## Environment Variables Checklist

**Required** (already set):
```
✓ RAZORPAY_KEY_ID=rzp_live_TekVOBIGOSU2BJ
✓ RAZORPAY_KEY_SECRET=V6rmiTTyv7Twz43ATy1RvELP
✓ NEXT_PUBLIC_INSTAGRAM_CLIENT_ID=...
✓ INSTAGRAM_CLIENT_SECRET=...
```

**Must set in Vercel**:
```
[ ] DATABASE_URL=postgresql://...
[ ] RAZORPAY_WEBHOOK_SECRET=whsec_...
[ ] GMAIL_PASSWORD=<16-char app password>
```

**Already configured**:
```
✓ GMAIL_USER=billing@valueskins.com
✓ GST_RATE=18
✓ SESSION_SECRET=...
✓ ADP_BASE_URL=https://valueskins-final.vercel.app
```

---

## File Locations (for reference)

```
Payment Endpoints:
  /marketplace/src/pages/api/payment/initiate-commission.ts
  /marketplace/src/pages/api/payment/initiate-payout.ts
  /marketplace/src/pages/api/payment/generate-gst-invoice.ts
  /marketplace/src/pages/api/payment/generate-adp.ts
  /marketplace/src/pages/api/profile/complete-bank-details.ts
  /marketplace/src/pages/api/payment/validate-env.ts

Webhooks:
  /marketplace/src/pages/api/webhooks/razorpay/[[...event]].ts

UI:
  /marketplace/src/pages/profile/complete-profile.tsx (creator/brand form)
  /marketplace/src/pages/campaigns/create.tsx (campaign creation)

Utilities:
  /marketplace/src/lib/payment-workflow.ts
  /marketplace/src/lib/payment-middleware.ts
  /marketplace/src/middleware/profile-gating.ts

Database:
  /marketplace/prisma/schema.prisma
  /marketplace/prisma/migrations/1_init/migration.sql

Config:
  /marketplace/.env.local (dev)
  /marketplace/.env.production (prod template)
```

---

## Troubleshooting

### "Database not found"
- Ensure DATABASE_URL is set in Vercel
- Run: `npx prisma migrate deploy`
- Check PostgreSQL is running

### "Webhook not working"
- Verify webhook URL in Razorpay dashboard
- Check webhook secret is set in Vercel
- Look at API logs: `vercel logs --tail`

### "Email not sending"
- Check GMAIL_PASSWORD is 16 characters (app password, not Gmail password)
- Verify GMAIL_USER is billing@valueskins.com
- Check no other apps using same Gmail account with old password

### "Commission payment fails"
- Verify Razorpay live keys are correct
- Check test mode is OFF in Razorpay dashboard
- Review Razorpay error logs

---

## Monitoring (After Launch)

### Daily
- Check Vercel logs for errors: `vercel logs --tail`
- Verify webhook events in Razorpay dashboard
- Monitor payment success rate

### Weekly
- Check creator complaints (payments not received)
- Verify ADP PDFs are generating
- Monitor email delivery

### Monthly
- Review transaction logs
- Audit payment amounts
- Check creator payout timing (should be <4 hours)

---

## Success Criteria ✅

After setup, confirm:
- [ ] Database schema migrated successfully
- [ ] Razorpay webhook created and active
- [ ] Email service sending invites + invoices
- [ ] Profile gating working (users required to complete profile)
- [ ] Campaign creation form visible to brands
- [ ] Commission payment working
- [ ] Advance payout working
- [ ] ADP generation working
- [ ] Webhooks firing and updating deal status
- [ ] Creators receiving payments within 4 hours

---

## Next 30 Minutes Timeline

```
0:00 - 0:05   Database setup + migration
0:05 - 0:10   Razorpay webhook configuration
0:10 - 0:15   Email service setup
0:15 - 0:20   Vercel environment variables
0:20 - 0:25   Deploy + verify
0:25 - 0:30   End-to-end testing
```

**Total setup time**: ~25 minutes  
**Buffer**: 5 minutes for troubleshooting

---

**Status**: 🚀 READY FOR PRODUCTION  
**Last Updated**: 2026-09-21  
**Next Step**: Execute the 5 setup steps above
