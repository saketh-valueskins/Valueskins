import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '';
const GITHUB_REDIRECT_URI = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || 'http://localhost:3000/api/oauth/github/callback';
const STATE_COOKIE = 'oauth_state';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { role } = req.query;
  const selectedRole = role === 'brand' ? 'brand' : 'creator';

  const rawState = crypto.randomBytes(32).toString('hex');
  const state = `${selectedRole}_${rawState}`;

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: 'user:email',
    state,
  });

  const isSecure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${STATE_COOKIE}=${state}; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=600`);

  return res.status(200).json({
    url: `https://github.com/login/oauth/authorize?${params.toString()}`,
  });
}
