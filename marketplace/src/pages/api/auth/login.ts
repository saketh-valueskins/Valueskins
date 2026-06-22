import { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';
import { verifyCaptchaToken, isCaptchaEnabled } from '@/lib/hcaptcha';
import { verifyPassword, hashSessionToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';
import { AUTH_RATE_LIMIT_REQUESTS, AUTH_RATE_LIMIT_WINDOW_MS, ALLOWED_ORIGINS } from '@/config/constants';
import { withCsrfProtection } from '@/lib/security/csrf-pages';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
  if (!rateLimit(`login:${ip}`, AUTH_RATE_LIMIT_REQUESTS, AUTH_RATE_LIMIT_WINDOW_MS)) {
    return res.status(429).json({ error: 'Too many login attempts' });
  }

  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    return res.status(403).json({ error: 'Invalid origin' });
  }

  if (isCaptchaEnabled()) {
    const captchaResult = await verifyCaptchaToken(req.body?.captcha_token || '', ip);
    if (!captchaResult.success) {
      return res.status(400).json({ error: 'Captcha verification failed. Please try again.' });
    }
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Check account lockout before attempting login
    const lockoutCheck = await queryOne<{ locked: boolean; retry_after_seconds: number }>(
      `SELECT
        CASE WHEN COUNT(*) >= $1 AND MAX(attempted_at) > NOW() - INTERVAL '15 minutes'
          THEN true ELSE false END as locked,
        CASE WHEN COUNT(*) >= $1
          THEN EXTRACT(EPOCH FROM (MIN(attempted_at) + INTERVAL '15 minutes' - NOW()))::integer
          ELSE 0 END as retry_after_seconds
      FROM login_attempts
      WHERE email = $2 AND attempted_at > NOW() - INTERVAL '15 minutes' AND success = false`,
      [MAX_FAILED_ATTEMPTS, normalizedEmail]
    );

    if (lockoutCheck?.locked) {
      const retryAfter = Math.max(1, lockoutCheck.retry_after_seconds);
      return res.status(429).json({
        error: 'Account temporarily locked due to too many failed attempts',
        retry_after_seconds: retryAfter
      });
    }

    const user = await queryOne<{ id: number; password_hash: string; email_verified: boolean }>(
      'SELECT id, password_hash, email_verified FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (!user) {
      // Log failed attempt (non-existent email — still log to prevent enumeration)
      await query(
        'INSERT INTO login_attempts (email, ip_address, success, attempted_at) VALUES ($1, $2, false, NOW())',
        [normalizedEmail, ip]
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      // Log failed attempt
      await query(
        'INSERT INTO login_attempts (email, ip_address, user_id, success, attempted_at) VALUES ($1, $2, $3, false, NOW())',
        [normalizedEmail, ip, user.id]
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.email_verified) return res.status(403).json({ error: 'Email not verified', needs_verification: true });

    // Log successful login attempt (clears lockout window)
    await query(
      'INSERT INTO login_attempts (email, ip_address, user_id, success, attempted_at) VALUES ($1, $2, $3, true, NOW())',
      [normalizedEmail, ip, user.id]
    );

    // Create session with 30-minute idle timeout (not 7-day permanent)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS).toISOString();
    const lastActivityAt = new Date().toISOString();

    await query(
      'INSERT INTO auth_sessions (id, user_id, expires_at, last_activity_at, ip_address) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
      [hashedToken, user.id, expiresAt, lastActivityAt, ip]
    );

    // Clean up expired sessions
    await query('DELETE FROM auth_sessions WHERE expires_at < NOW()').catch(() => {});

    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.setHeader('Set-Cookie', [
      `valueskins_session=${sessionToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_IDLE_TIMEOUT_MS / 1000}`,
      `csrf_token=${csrfToken}; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
    ]);

    return res.status(200).json({ session_id: sessionToken, user_id: user.id });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
}

export default withCsrfProtection(handler);
