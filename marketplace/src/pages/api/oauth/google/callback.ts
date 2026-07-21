import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { exchangeGoogleCode, getGoogleUserInfo } from '@/lib/oauth';
import { query } from '@/lib/db';
import { SESSION_IDLE_TIMEOUT_MS, SESSION_ABSOLUTE_TIMEOUT_MS } from '@/config/constants';

interface GoogleUser {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(String(error))}`);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing code' });
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    if (!tokens.access_token) {
      return res.status(400).json({ error: 'token_failed' });
    }

    const googleUser = (await getGoogleUserInfo(tokens.access_token)) as GoogleUser;

    if (!googleUser.email) {
      return res.status(400).json({ error: 'no_email' });
    }

    const instagramUserId = googleUser.email;
    let userId: number;

    const existing = await query(
      'SELECT id, onboarding_stage FROM users WHERE instagram_user_id = $1',
      [instagramUserId]
    );

    // GP1: the role is committed AFTER OAuth, never before. A returning user who
    // already finished onboarding skips the prompt; everyone else is sent to it.
    let onboardingStage: string | null = null;

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      onboardingStage = existing.rows[0].onboarding_stage ?? null;
      await query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [userId]
      );
    } else {
      const created = await query(
        `INSERT INTO users (instagram_user_id, email, username, display_name, avatar_url, is_active, onboarding_stage)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          instagramUserId,
          googleUser.email,
          googleUser.email.split('@')[0],
          googleUser.name || googleUser.email,
          googleUser.picture || null,
          true,
          'pending',
        ]
      );

      if (!created.rows[0]) {
        const created2 = await query(
          `INSERT INTO users (instagram_user_id, email, username, display_name, avatar_url, is_active)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            instagramUserId,
            googleUser.email,
            googleUser.email.split('@')[0],
            googleUser.name || googleUser.email,
            googleUser.picture || null,
            true,
          ]
        );
        if (!created2.rows[0]) throw new Error('Failed to create user');
        userId = created2.rows[0].id;
      } else {
        userId = created.rows[0].id;
      }
    }

    const sessionId = crypto.randomUUID();
    // 30-min idle timeout; renewed on activity, capped at 24h (see lib/session.ts)
    const expiresAt = new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS);

    await query(
      'INSERT INTO auth_sessions (id, user_id, is_active, expires_at) VALUES ($1, $2, $3, $4)',
      [sessionId, userId, true, expiresAt]
    );

    const isSecure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    // GP2 / P2-F1: the cookie carries Max-Age so the session survives a browser
    // restart. Without it this was a browser-session cookie — closing the browser
    // silently logged the user out and lost unsaved work. Server-side expiry is
    // still the source of truth: 30-min sliding idle (touchSession), 24h absolute.
    const cookieMaxAgeSec = Math.floor(SESSION_ABSOLUTE_TIMEOUT_MS / 1000);
    const cookieStr = `valueskins_session=${sessionId}; HttpOnly${isSecure ? '; Secure' : ''}; SameSite=Lax; Path=/; Max-Age=${cookieMaxAgeSec}`;
    res.setHeader('Set-Cookie', cookieStr);

    // GP1 step 3: logged in first, then asked to continue as Creator or Brand.
    // Returning user with a committed role goes straight into their app.
    return res.redirect(onboardingStage === 'complete' ? '/demo/marketplace' : '/auth/onboarding');
  } catch (error) {
    console.error('OAuth error:', error);
    return res.status(500).json({
      error: 'auth_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
