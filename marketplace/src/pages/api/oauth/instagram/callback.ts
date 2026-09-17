import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import {
  exchangeInstagramCode,
  exchangeInstagramLongLivedToken,
  getInstagramUserInfo,
} from '@/lib/oauth';
import { ensureSocialAccountsTable } from '@/lib/instagram-social';
import { query } from '@/lib/db';
import { SESSION_IDLE_TIMEOUT_MS, SESSION_ABSOLUTE_TIMEOUT_MS } from '@/config/constants';

interface InstagramUser {
  id: string;
  username?: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
}

// Instagram Login does not expose an email address. We only ever store the
// Instagram user id + handle here; email is collected during onboarding and
// confirmed separately. No phone numbers are collected.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error, error_description } = req.query;

  if (error) {
    const reason = error_description ? String(error_description) : String(error);
    return res.redirect(`/?error=${encodeURIComponent(reason)}`);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing code' });
  }

  // Verify the state cookie matches the state Instagram echoes back. Prevents
  // CSRF on the callback (the state value is a 256-bit random set at start).
  const rawCookie = req.headers.cookie || '';
  const stateMatch = rawCookie.match(/oauth_state=([^;]+)/);
  const stateCookie = stateMatch ? stateMatch[1] : null;
  const state = req.query.state;

  if (!stateCookie || !state || stateCookie !== String(state)) {
    return res.status(400).json({ error: 'invalid_state' });
  }

  try {
    // 1. Exchange the authorization code for a short-lived token.
    const short = await exchangeInstagramCode(code);
    if (!short.access_token) {
      return res.status(400).json({ error: 'token_failed' });
    }

    // 2. Swap for a 60-day long-lived token (fall back to short if it fails).
    let accessToken: string = short.access_token;
    let expiresAt: Date | null = null;
    try {
      const long = await exchangeInstagramLongLivedToken(short.access_token);
      if (long.access_token) {
        accessToken = long.access_token;
        expiresAt = new Date(Date.now() + (long.expires_in || 60 * 24 * 3600) * 1000);
      }
    } catch {
      // Non-fatal — keep the short-lived token for this session.
    }

    // 3. Fetch the profile. THIS is the verification: a successful call proves
    //    the user controls this Instagram account.
    const ig = (await getInstagramUserInfo(accessToken)) as InstagramUser;
    if (!ig.id) {
      return res.status(400).json({ error: 'no_instagram_id' });
    }

    const instagramUserId = String(ig.id);
    const username = ig.username || `ig_${instagramUserId}`;
    const displayName = ig.name || ig.username || `Instagram ${instagramUserId}`;

    // Instagram Login only authorizes Business and Creator accounts, so the
    // account type answers "brand or creator?" for us: BUSINESS -> brand,
    // CREATOR -> creator. PERSONAL/unset falls back to the manual role prompt
    // (the /auth/onboarding split page).
    const accountType = (ig.account_type || '').toUpperCase();
    const detectedRole: 'brand' | 'creator' | null =
      accountType === 'BUSINESS' ? 'brand' : accountType === 'CREATOR' ? 'creator' : null;

    const existing = await query(
      'SELECT id, onboarding_stage FROM users WHERE instagram_user_id = $1',
      [instagramUserId]
    );

    // GP1: the role is committed AFTER OAuth, never before. A returning user who
    // already finished onboarding skips the prompt; everyone else is sent to it.
    let onboardingStage: string | null = null;
    let userId: number;

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      onboardingStage = existing.rows[0].onboarding_stage ?? null;
      await query(
        `UPDATE users SET last_login_at = NOW(),
                          username = COALESCE(NULLIF(username, ''), $2),
                          avatar_url = COALESCE(NULLIF(avatar_url, ''), $3)
         WHERE id = $1`,
        [userId, username, ig.profile_picture_url || null]
      );

      // Auto-commit the detected role for returning users who never finished
      // onboarding. This replaces the "brand or creator?" question entirely.
      if (onboardingStage !== 'complete' && detectedRole) {
        await query(
          `UPDATE users SET role = $2, onboarding_stage = 'complete' WHERE id = $1`,
          [userId, detectedRole]
        );
        onboardingStage = 'complete';
      }
    } else {
      // No email from Instagram — stored empty. Onboarding collects and
      // confirms it. `instagram_user_id` is the IG-scoped identity key.
      // When the account type identifies a role, the user is considered
      // onboarded immediately and skips the role prompt.
      const created = await query(
        `INSERT INTO users (instagram_user_id, email, username, display_name, avatar_url, is_active, role, onboarding_stage)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          instagramUserId,
          '',
          username,
          displayName,
          ig.profile_picture_url || null,
          true,
          detectedRole ?? 'creator',
          detectedRole ? 'complete' : 'pending',
        ]
      );
      if (!created.rows[0]) throw new Error('Failed to create user');
      userId = created.rows[0].id;
      onboardingStage = detectedRole ? 'complete' : 'pending';
    }

    // 4. Persist the Instagram connection (token + profile). Tokens are stored
    //    server-side only and never returned to the client.
    try {
      await ensureSocialAccountsTable();
      await query(
        `INSERT INTO social_media_accounts
           (user_id, platform, platform_user_id, username, display_name, account_type,
            followers_count, media_count, profile_picture_url, access_token, token_expires_at, is_active)
         VALUES ($1, 'instagram', $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
         ON CONFLICT (user_id, platform) DO UPDATE SET
           platform_user_id = EXCLUDED.platform_user_id,
           username = EXCLUDED.username,
           display_name = EXCLUDED.display_name,
           account_type = EXCLUDED.account_type,
           followers_count = EXCLUDED.followers_count,
           media_count = EXCLUDED.media_count,
           profile_picture_url = EXCLUDED.profile_picture_url,
           access_token = EXCLUDED.access_token,
           token_expires_at = EXCLUDED.token_expires_at,
           is_active = TRUE`,
        [
          userId,
          instagramUserId,
          ig.username || '',
          ig.name || '',
          ig.account_type || '',
          ig.followers_count || 0,
          ig.media_count || 0,
          ig.profile_picture_url || '',
          accessToken,
          expiresAt ? expiresAt.toISOString() : null,
        ]
      );

      // Mirror the Instagram snapshot onto the columns the profile/search
      // surfaces read, so the virtual resume shows real IG data after login
      // (not just manual onboarding input).
      await query(
        `UPDATE users
           SET instagram_handle = COALESCE(NULLIF(instagram_handle, ''), $2),
               followers_count = $3,
               avatar_url = COALESCE(NULLIF(avatar_url, ''), $4)
         WHERE id = $1`,
        [userId, username, ig.followers_count || 0, ig.profile_picture_url || null]
      );
    } catch (err) {
      // Login must not fail if token persistence fails — the account still
      // connects on next attempt. Logged server-side only.
      console.error('[oauth] Failed to persist Instagram account', err);
    }

    const sessionId = crypto.randomUUID();
    // 30-min idle timeout; renewed on activity, capped at 24h (see lib/session.ts)
    const sessionExpiresAt = new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS);

    await query(
      'INSERT INTO auth_sessions (id, user_id, is_active, expires_at) VALUES ($1, $2, $3, $4)',
      [sessionId, userId, true, sessionExpiresAt]
    );

    const isSecure =
      req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    // GP2 / P2-F1: the cookie carries Max-Age so the session survives a browser
    // restart. Server-side expiry is still the source of truth: 30-min sliding
    // idle (touchSession), 24h absolute.
    const cookieMaxAgeSec = Math.floor(SESSION_ABSOLUTE_TIMEOUT_MS / 1000);
    res.setHeader('Set-Cookie', [
      `valueskins_session=${sessionId}; HttpOnly${isSecure ? '; Secure' : ''}; SameSite=Lax; Path=/; Max-Age=${cookieMaxAgeSec}`,
      // Clear the one-time OAuth state cookie.
      `oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
    ]);

    // GP1 step 3: logged in first, then asked to continue as Creator or Brand.
    return res.redirect(
      onboardingStage === 'complete' ? '/demo/marketplace' : '/auth/onboarding'
    );
  } catch (error) {
    console.error('Instagram OAuth error:', error);
    return res.status(500).json({
      error: 'auth_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
