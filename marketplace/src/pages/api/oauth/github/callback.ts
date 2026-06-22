import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { exchangeGitHubCode, getGitHubUserInfo, parseOAuthState } from '@/lib/oauth';
import { hashSessionToken } from '@/lib/auth';
import { query } from '@/lib/db';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error, state } = req.query;

  if (error) {
    const encoded = encodeURIComponent(String(error));
    return res.redirect(`/?error=${encoded}`);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing code' });
  }

  const stateStr = typeof state === 'string' ? state : '';
  const parsedState = parseOAuthState(stateStr);
  const selectedRole = parsedState.role === 'brand' ? 'brand' : 'creator';

  const stateCookie = req.cookies['oauth_state'];
  if (stateCookie && stateStr !== stateCookie) {
    return res.status(403).json({ error: 'OAuth state mismatch — possible CSRF' });
  }

  try {
    const tokens = await exchangeGitHubCode(code);
    if (!tokens.access_token) {
      return res.status(400).json({ error: 'token_failed' });
    }

    const githubUser = await getGitHubUserInfo(tokens.access_token);
    const fallbackEmail = githubUser?.login ? `${githubUser.login}@github.local` : 'unknown@github.local';
    const rawEmail = githubUser?.email || fallbackEmail;
    const cleanEmail = rawEmail.toLowerCase().trim();

    let userId: number;
    let isNewUser = false;

    // Check by both instagram_user_id and email column for dedup
    let result = await query('SELECT id, role FROM users WHERE instagram_user_id = $1', [cleanEmail]);
    if (result.rows.length === 0) {
      result = await query('SELECT id, role FROM users WHERE email = $1', [cleanEmail]);
      if (result.rows.length > 0) {
        await query('UPDATE users SET instagram_user_id = $1 WHERE id = $2', [cleanEmail, result.rows[0].id]);
      }
    }

    if (result.rows.length > 0) {
      userId = result.rows[0].id;
      const existingRole = result.rows[0].role;
      if (!existingRole && selectedRole) {
        try { await query('UPDATE users SET role = $1, last_login_at = NOW(), email = $2 WHERE id = $3', [selectedRole, cleanEmail, userId]); } catch {}
      } else {
        try { await query('UPDATE users SET last_login_at = NOW(), email = COALESCE(email, $1) WHERE id = $2', [cleanEmail, userId]); } catch {}
      }
    } else {
      isNewUser = true;
      const login = githubUser?.login || cleanEmail.split('@')[0];
      const name = githubUser?.name || login;
      const avatar = githubUser?.avatar_url || null;
      try {
        const createResult = await query(
          'INSERT INTO users (instagram_user_id, email, email_verified, username, display_name, avatar_url, is_active, role, onboarding_stage) VALUES ($1, $2, TRUE, $3, $4, $5, $6, $7, $8) RETURNING id',
          [cleanEmail, cleanEmail, login, name, avatar, true, selectedRole, 'pending']
        );
        userId = createResult.rows[0].id;
      } catch {
        const createResult = await query(
          'INSERT INTO users (instagram_user_id, email, email_verified, username, display_name, avatar_url, is_active, role) VALUES ($1, $2, TRUE, $3, $4, $5, $6, $7) RETURNING id',
          [cleanEmail, cleanEmail, login, name, avatar, true, selectedRole]
        );
        userId = createResult.rows[0]?.id;
      }
      if (!userId) {
        throw new Error('Failed to create user');
      }

      try {
        const { sendEmail } = await import('@/lib/email');
        await sendEmail({ to: cleanEmail, userId, type: 'welcome', data: { name } });
      } catch {}
    }

    const sessionId = crypto.randomUUID();
    const hashedSessionId = hashSessionToken(sessionId);
    const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000);

    await query(
      'INSERT INTO auth_sessions (id, user_id, is_active, expires_at) VALUES ($1, $2, $3, $4)',
      [hashedSessionId, userId, true, expiresAt]
    );

    const isSecure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    const cookieStr = `valueskins_session=${sessionId}; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
    res.setHeader('Set-Cookie', cookieStr);

    const redirectUrl = isNewUser
      ? (selectedRole === 'brand' ? '/auth/onboarding-brand' : '/')
      : '/';
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return res.status(500).json({
      error: 'auth_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
