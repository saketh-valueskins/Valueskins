# Razorpay Webhook Configuration Guide

## Automated Setup (One-Time)

Run this curl command in your terminal after getting your webhook secret:

```bash
curl -u rzp_live_TekVOBIGOSU2BJ:V6rmiTTyv7Twz43ATy1RvELP \
  https://api.razorpay.com/v1/webhooks \
  -d "url=https://valueskins-final.vercel.app/api/webhooks/razorpay" \
  -d "active=1" \
  -d "events=payment.authorized,payment.captured,payment.failed,payout.initiated,payout.processed,payout.failed,transfer.settled"
```

## Manual Setup (Razorpay Dashboard)

If curl fails, do this manually:

1. **Login** to Razorpay Dashboard:
   - URL: https://dashboard.razorpay.com
   - Key ID: rzp_live_TekVOBIGOSU2BJ
   - Secret: V6rmiTTyv7Twz43ATy1RvELP

2. **Navigate** to Settings → Webhooks

3. **Create New Webhook**:
   - **URL**: `https://valueskins-final.vercel.app/api/webhooks/razorpay`
   - **Events** (check all):
     - ☑ payment.authorized
     - ☑ payment.captured
     - ☑ payment.failed
     - ☑ payout.initiated
     - ☑ payout.processed
     - ☑ payout.failed
     - ☑ transfer.settled
   - **Active**: ✓ Yes

4. **Save** → Copy Webhook Secret

5. **Add to `.env.production`**:
   ```
   RAZORPAY_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXX
   ```

## Webhook Events Handled

| Event | Action | Status |
|-------|--------|--------|
| `payment.authorized` | Trigger advance payout (30%) | ✓ Ready |
| `payment.captured` | Update deal status to "commission_paid" | ✓ Ready |
| `payment.failed` | Mark payment as failed | ✓ Ready |
| `payout.initiated` | Log payout start | ✓ Ready |
| `payout.processed` | Mark payout as completed | ✓ Ready |
| `payout.failed` | Log failure + retry | ✓ Ready |
| `transfer.settled` | Final reconciliation | ✓ Ready |

## Verification

Test the webhook with:

```bash
curl -X POST https://valueskins-final.vercel.app/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: test" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test123",
          "order_id": "order_test456",
          "amount": 88500,
          "status": "captured"
        }
      }
    }
  }'
```

Expected: `{"received": true}`

---

**Status**: Ready for production  
**Webhook Path**: `/api/webhooks/razorpay`  
**Payment Flow**: Automatic on webhook confirmation
