import { NextApiRequest, NextApiResponse } from 'next';
import { setupCors } from '@/lib/cors';
import { query, queryOne } from '@/lib/db-pool';
import { hashPassword } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'Token and password (min 8 chars) required' });
    }

    const record = await queryOne(
      `SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token = $1 AND used = FALSE`,
      [token]
    );

    if (!record) return res.status(400).json({ error: 'Invalid or expired token' });
    if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Token expired' });

    const hashed = await hashPassword(password);

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, record.user_id]);
    await query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [record.id]);
    await query('DELETE FROM auth_sessions WHERE user_id = $1', [record.user_id]);

    return res.status(200).json({ reset: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed' });
  }
}
