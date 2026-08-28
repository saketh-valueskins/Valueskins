import { query } from '@/lib/db';

export async function getValidGoogleAccessToken(userId: number): Promise<string | null> {
  try {
    const result = await query(
      'SELECT google_access_token, google_refresh_token, google_token_expires_at FROM accounts WHERE id = $1',
      [userId]
    );

    if (!result.rows[0]) return null;

    const user = result.rows[0];
    const expiresAt = new Date(user.google_token_expires_at);
    const now = new Date();

    // If token expires in less than 5 minutes, refresh it
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      return await refreshGoogleAccessToken(userId, user.google_refresh_token);
    }

    return user.google_access_token;
  } catch (err) {
    console.error('Error getting valid Google access token:', err);
    return null;
  }
}

export async function refreshGoogleAccessToken(userId: number, refreshToken: string): Promise<string | null> {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }

    const data = await response.json();

    // Update tokens in database
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 3600));

    await query(
      `UPDATE accounts
       SET google_access_token = $1,
           google_token_expires_at = $2
       WHERE id = $3`,
      [data.access_token, expiresAt.toISOString(), userId]
    );

    return data.access_token;
  } catch (err) {
    console.error('Error refreshing Google access token:', err);
    return null;
  }
}

export function getGoogleOAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar-callback`;
  const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';

  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
