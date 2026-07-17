# ValueSkins Admin Dashboard Setup

## Overview
The admin dashboard is now live at `/admin/login` with the following pages:
- Dashboard (overview stats)
- Users (all creators and users)
- Brands (all brands)
- Deals (all deals with filtering)
- Disputes (manual review queue)
- Deal PDFs (stored PDF copies)

## Setup Instructions

### Step 1: Generate Admin Password Hash

Run this command to generate your admin password hash:

```bash
node -e "const crypto = require('crypto'); const salt = process.env.ADMIN_PASSWORD_SALT || 'default-salt'; const password = 'YOUR_PASSWORD_HERE'; const hash = crypto.createHash('sha256').update(password + salt).digest('hex'); console.log('Hash:', hash);"
```

Replace `YOUR_PASSWORD_HERE` with your actual admin password.

### Step 2: Set Environment Variables

Add these to your `.env.local` file:

```env
ADMIN_PASSWORD_HASH=<hash_from_step_1>
ADMIN_PASSWORD_SALT=your_random_salt_here
```

Example:
```env
ADMIN_PASSWORD_HASH=abc123def456...
ADMIN_PASSWORD_SALT=my_super_secret_salt_2024
```

**Important:** 
- Generate a random salt (at least 16 characters)
- Store both in `.env.local` (local development)
- Store both in Vercel project settings (production)
- Never commit these to git

### Step 3: Access the Admin Dashboard

1. Go to: `https://valueskins.com/admin/login` (or localhost:3000/admin/login)
2. Enter your password
3. You'll be logged in for 30 minutes
4. Session expires automatically

### Step 4: (Optional) Firebase Storage for PDFs

If you want to store deal PDFs in Firebase (recommended for free):

1. Create Firebase project: https://firebase.google.com
2. Enable Cloud Storage
3. Create `deals-pdfs` bucket
4. Add to environment:
   ```env
   FIREBASE_API_KEY=...
   FIREBASE_AUTH_DOMAIN=...
   FIREBASE_PROJECT_ID=...
   FIREBASE_STORAGE_BUCKET=...
   FIREBASE_MESSAGING_SENDER_ID=...
   FIREBASE_APP_ID=...
   ```

Then use Firebase SDK to upload PDFs when deals complete.

## Current Features

### Dashboard
- Total users (with new this week)
- Active deals
- Escrow locked amount
- Total paid out
- Pending verifications

### Users Page
- Search by name or email
- View all creators
- See deal count per user
- Account status

### Brands Page
- Search by company name or email
- View all brands
- See deals posted
- Verification status

### Deals Page
- Search by deal ID or title
- Filter by status (pending, in progress, completed, disputed)
- See deal amounts
- Track creation dates

### Disputes Page
- Shows flagged/disputed deals
- Manual resolution queue
- (Coming soon: dispute history)

### PDFs Page
- View all deal completion PDFs
- Download copies
- Track by deal ID
- (Coming soon: auto-storage to Firebase)

## Password Management

To change the admin password:

1. Generate new hash (see Step 1)
2. Update `ADMIN_PASSWORD_HASH` in environment
3. Restart the application
4. Old sessions automatically expire (max 30 mins)

## Security Notes

- Password stored as SHA-256 hash with salt
- Sessions use httpOnly cookies (can't be accessed by JavaScript)
- Session timeout: 30 minutes
- Only one admin password (no user accounts)
- All admin actions logged (TODO: add audit trail)

## Troubleshooting

**"Invalid password" on login:**
- Verify hash was generated correctly
- Check salt matches between generation and env var
- Restart the app to pick up env changes

**Admin pages show blank:**
- Check browser console for errors
- Verify admin session cookie exists
- Clear browser cookies and try again

**Database queries failing:**
- Check database connection string in env
- Verify tables exist (users, deals, etc.)
- Check database user has SELECT permissions

## Next Steps

1. ✅ Admin login page
2. ✅ Dashboard with stats
3. ✅ Users listing
4. ✅ Brands listing
5. ✅ Deals management
6. ⏳ Firebase PDF storage integration
7. ⏳ Dispute resolution interface
8. ⏳ Audit trail logging
9. ⏳ User/deal detail views
10. ⏳ Action buttons (suspend, verify, etc.)

## Testing

Test the admin dashboard locally:

```bash
# 1. Generate test password
node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('admin123' + 'test-salt').digest('hex'));"

# 2. Add to .env.local
ADMIN_PASSWORD_HASH=<hash_from_above>
ADMIN_PASSWORD_SALT=test-salt

# 3. Start dev server
npm run dev

# 4. Go to http://localhost:3000/admin/login
# 5. Enter password: admin123
```
