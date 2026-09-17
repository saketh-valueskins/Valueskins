import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE OAUTH START — COMMENTED OUT (kept for reference, do not delete)
// Superseded by /api/oauth/start/instagram (Instagram Login via Meta).
// ─────────────────────────────────────────────────────────────────────────────
//
// const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
// const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback';
// const STATE_COOKIE = 'oauth_state';
//
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
//
//   const { role } = req.query;
//   const selectedRole = role === 'brand' ? 'brand' : 'creator';
//
//   const rawState = crypto.randomBytes(32).toString('hex');
//   const state = `${selectedRole}_${rawState}`;
//
//   const params = new URLSearchParams({
//     client_id: GOOGLE_CLIENT_ID,
//     redirect_uri: GOOGLE_REDIRECT_URI,
//     response_type: 'code',
//     // Identity only. Calendar scopes are "sensitive" per Google, so requesting
//     // them here forced verification review and showed every user the
//     // "Google hasn't verified this app" interstitial — for a feature that no
//     // longer exists. Request Calendar separately at point of use if it returns.
//     scope: 'openid profile email',
//     state,
//     access_type: 'offline',
//     prompt: 'select_account',
//   });
//
//   const isSecure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
//   res.setHeader('Set-Cookie', `${STATE_COOKIE}=${state}; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=600`);
//
//   return res.status(200).json({
//     url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
//   });
// }
// ─────────────────────────────────────────────────────────────────────────────

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: 'google_oauth_disabled',
    message: 'Google OAuth has been replaced by Instagram OAuth. Use /api/oauth/start/instagram.',
  });
}
