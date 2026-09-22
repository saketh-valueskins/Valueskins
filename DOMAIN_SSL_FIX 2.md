# Fix SSL Certificate for www.valueskins.com

## Problem
- Browser shows: "net::ERR_CERT_AUTHORITY_INVALID"
- www.valueskins.com doesn't have valid SSL certificate
- Need to connect custom domain to Vercel with auto SSL

## Solution (5 Steps)

### Step 1: Add Domain to Vercel (2 min)

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select "valueskins-final" project
3. Go to Settings → Domains
4. Click "Add" → Enter: `www.valueskins.com`
5. Vercel will show DNS instructions

### Step 2: Update DNS Records (3 min)

Vercel will show you ONE of these options:

**Option A: CNAME (Recommended)**
```
Host: www
Type: CNAME
Value: cname.vercel-dns.com.
TTL: 3600
```

**Option B: A Record (If CNAME unavailable)**
```
Host: www
Type: A
Value: 76.76.19.171
TTL: 3600
```

**Where to update DNS:**
- Go to your domain registrar (GoDaddy, Namecheap, Route53, etc.)
- Find DNS settings
- Add/update the record above
- Save

### Step 3: Add Root Domain (Optional but Recommended)

Also add `valueskins.com` (without www):

1. Vercel Dashboard → Domains → Add
2. Enter: `valueskins.com`
3. Add DNS record (A record):
   ```
   Host: @
   Type: A
   Value: 76.76.19.171
   TTL: 3600
   ```

### Step 4: Wait for DNS Propagation (5-10 min)

DNS can take 5-10 minutes to update globally.

Check status:
```bash
# Check DNS is pointing to Vercel
nslookup www.valueskins.com
# Should show: 76.76.19.171 or cname.vercel-dns.com
```

### Step 5: Vercel Auto-Provisions SSL (Instant)

Once DNS is correct, Vercel automatically:
1. Detects the domain points to them
2. Issues free SSL certificate (via Let's Encrypt)
3. Activates HTTPS

This happens in ~5 minutes after DNS propagates.

## Verification

Once set up, you should see:

✅ Vercel Dashboard shows: "valueskins.com - Valid Configuration"
✅ https://www.valueskins.com works
✅ Browser shows green lock 🔒
✅ No more SSL errors

## If Still Getting Error (After 10 min)

1. **Clear browser cache**:
   - Chrome: Ctrl+Shift+Delete → Clear All

2. **Check DNS propagated**:
   ```bash
   # Windows/Mac
   nslookup www.valueskins.com
   
   # Should show Vercel IP: 76.76.19.171
   ```

3. **Force HTTPS redirect**:
   - Vercel Dashboard → Project Settings → Domains
   - Toggle "Redirect www." if applicable

4. **Hard refresh**:
   - Chrome: Ctrl+Shift+R (Windows)
   - Mac: Cmd+Shift+R (Mac)

## Timeline

```
0 min:    Add domain to Vercel
0-3 min:  Update DNS records
3-10 min: DNS propagates globally
10 min:   Vercel issues SSL certificate
10+ min:  HTTPS working, green lock ✅
```

**Total time**: ~15 minutes

---

## Checklist

- [ ] Domain added to Vercel
- [ ] DNS CNAME/A record updated
- [ ] DNS change saved at registrar
- [ ] nslookup shows Vercel IP (76.76.19.171)
- [ ] Vercel shows "Valid Configuration"
- [ ] https://www.valueskins.com loads without warnings
- [ ] Green lock 🔒 appears in browser

---

**Status**: Once DNS propagates, SSL is automatic (Vercel handles it)
**No action needed after DNS update** — Let Vercel issue the certificate
