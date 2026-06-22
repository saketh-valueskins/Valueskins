import { NextApiRequest, NextApiResponse } from 'next';
import { setupCors } from '@/lib/cors';
import { query, queryOne } from '@/lib/db-pool';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email required' });

    const user = await queryOne('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (!user) return res.status(200).json({ sent: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, used = FALSE`,
      [user.id, token, expiresAt]
    );

    const { sendEmail } = await import('@/lib/email');
    await sendEmail({
      to: user.email,
      userId: user.id,
      type: 'password_reset',
      data: { reset_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}` },
    });

    return res.status(200).json({ sent: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed' });
  }
}
