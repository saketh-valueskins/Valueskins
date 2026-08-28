import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

async function exchangeCodeForToken(code: string): Promise<any | null> {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar-callback`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      console.error('Token exchange failed:', await response.text());
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('Error exchanging code for token:', err);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Verify state parameter (CSRF protection)
    const sessionToken = req.cookies.valueskins_session;
    if (!sessionToken) {
      return res.redirect('/auth/login');
    }

    const sessionResult = await query(
      'SELECT account_id FROM sessions WHERE session_token = $1',
      [sessionToken]
    );

    if (!sessionResult.rows[0]) {
      return res.redirect('/auth/login');
    }

    const userId = sessionResult.rows[0].account_id;

    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(code as string);

    if (!tokenData) {
      return res.redirect('/demo/calendar?error=failed_to_connect_google');
    }

    // Store tokens in database
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600));

    await query(
      `UPDATE accounts
       SET google_access_token = $1,
           google_refresh_token = COALESCE($2, google_refresh_token),
           google_token_expires_at = $3
       WHERE id = $4`,
      [tokenData.access_token, tokenData.refresh_token || null, expiresAt.toISOString(), userId]
    );

    // Redirect back to calendar page
    return res.redirect('/demo/calendar?success=google_connected');
  } catch (err: any) {
    console.error('Google calendar callback error:', err);
    return res.redirect('/demo/calendar?error=callback_failed');
  }
}
