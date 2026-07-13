# Cloudflare DNS Setup

## Status
- Cloudflare MCP configured
- DNS records updated
- Domain is live at Vercel but serving the old demo project
- **Need to move domain to `valueskins-final` Vercel project**

## DNS Records (Cloudflare)

| Type | Name | Value | TTL | Status |
|---|---|---|---|---|
| A | `@` | `76.76.21.21` | 120 | ✅ Vercel IP |
| CNAME | `www` | `valueskins-final.vercel.app` | 120 | ✅ Updated from mock |

## Next Step

Move domain from demo project to the real app:

### Option A: Vercel Dashboard (manual, 2 min)
1. Go to [Vercel Dashboard](https://vercel.com) → `valueskins-final` → Settings → Domains
2. Add `valueskins.com` — Vercel auto-detects the DNS records
3. Add `www.valueskins.com`
4. Vercel will automatically detach from the old project

### Option B: via API (need VERCEL_TOKEN)
Provide a Vercel API token from `vercel.com/account/tokens`.

## Environment Variables (after domain is live)

Update in Vercel Dashboard → `valueskins-final` → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://valueskins.com` |
| `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` | `https://valueskins.com/api/oauth/google/callback` |
| `NEXT_PUBLIC_SITE_URL` | `https://valueskins.com` |

## Google OAuth (after domain is live)

Add to [Google Cloud Console](https://console.cloud.google.com):
- Authorized JavaScript origins: `https://valueskins.com`
- Authorized redirect URIs: `https://valueskins.com/api/oauth/google/callback`
