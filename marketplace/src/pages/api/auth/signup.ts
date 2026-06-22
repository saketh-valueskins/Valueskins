import { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';
import { verifyCaptchaToken, isCaptchaEnabled } from '@/lib/hcaptcha';
import { hashPassword, hashSessionToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';
import { AUTH_RATE_LIMIT_REQUESTS, AUTH_RATE_LIMIT_WINDOW_MS, ALLOWED_ORIGINS } from '@/config/constants';
import { withCsrfProtection } from '@/lib/security/csrf-pages';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
  if (!rateLimit(`signup:${ip}`, AUTH_RATE_LIMIT_REQUESTS, AUTH_RATE_LIMIT_WINDOW_MS)) {
    return res.status(429).json({ error: 'Too many signup attempts' });
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
    const { email, password, display_name, agreed_to_terms, is_adult } = req.body;
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Email and password (min 8 chars) required' });
    }
    if (!is_adult) {
      return res.status(400).json({ error: 'You must be 18 or older to use ValueSkins' });
    }
    if (!agreed_to_terms) {
      return res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const user = await queryOne(
      `INSERT INTO users (email, password_hash, display_name, username, email_verified, role)
       VALUES ($1, $2, $3, $4, FALSE, $5) RETURNING id`,
      [cleanEmail, hashed, display_name || cleanEmail.split('@')[0], cleanEmail.split('@')[0], 'creator']
    );

    await query(
      `INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`,
      [user.id, verificationToken, expiresAt]
    );

    await query(
      `INSERT INTO user_consents (user_id, consent_type, granted, version, ip_address) VALUES ($1, 'terms_of_service', TRUE, '1.0', $2)`,
      [user.id, req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown']
    );
    await query(
      `INSERT INTO user_consents (user_id, consent_type, granted, version, ip_address) VALUES ($1, 'privacy_policy', TRUE, '1.0', $2)`,
      [user.id, req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown']
    );
    await query(
      `INSERT INTO user_consents (user_id, consent_type, granted, version, ip_address) VALUES ($1, 'age_18_plus', TRUE, '1.0', $2)`,
      [user.id, req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown']
    );

    try {
      const { sendEmail } = await import('@/lib/email');
      await sendEmail({
        to: cleanEmail,
        userId: user.id,
        type: 'email_verification',
        data: { verification_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}` },
      });
    } catch { }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashSessionToken(sessionToken);
    await query(
      'INSERT INTO auth_sessions (id, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      [hashedToken, user.id, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()]
    );

    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.setHeader('Set-Cookie', [
      `valueskins_session=${sessionToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
      `csrf_token=${csrfToken}; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
    ]);

    return res.status(201).json({ session_id: sessionToken, user_id: user.id });
  } catch (err) {
    return res.status(500).json({ error: 'Signup failed' });
  }
}

export default withCsrfProtection(handler);
