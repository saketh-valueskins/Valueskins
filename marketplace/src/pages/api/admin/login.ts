import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const ADMIN_PASSWORD_SALT = process.env.ADMIN_PASSWORD_SALT || 'default-salt';

const adminSessions = new Map<string, { createdAt: number }>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Cleanup old sessions every minute
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of adminSessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      adminSessions.delete(token);
    }
  }
}, 60000);

export async function verifyAdminSession(token: string): Promise<boolean> {
  const now = Date.now();
  const session = adminSessions.get(token);

  if (!session) return false;
  if (now - session.createdAt > SESSION_TTL_MS) {
    adminSessions.delete(token);
    return false;
  }

  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, action } = req.body;

  // Verify action
  if (action === 'verify') {
    const cookies = req.headers.cookie || '';
    const match = cookies.match(/admin_session=([^;]+)/);
    const sessionToken = match ? match[1] : '';

    const isValid = await verifyAdminSession(sessionToken);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid session', authenticated: false });
    }

    return res.status(200).json({ authenticated: true });
  }

  // Login action
  if (action === 'login' || !action) {
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    // Hash the password with salt
    const passwordHash = crypto
      .createHash('sha256')
      .update(password + ADMIN_PASSWORD_SALT)
      .digest('hex');

    // Compare with stored hash
    if (passwordHash !== ADMIN_PASSWORD_HASH) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    adminSessions.set(sessionToken, { createdAt: Date.now() });

    // Set secure httpOnly cookie
    res.setHeader(
      'Set-Cookie',
      `admin_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`
    );

    return res.status(200).json({ success: true, message: 'Logged in' });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
