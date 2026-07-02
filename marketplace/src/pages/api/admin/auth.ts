import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@valueskins.com').split(',').map(e => e.trim().toLowerCase());
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

// In-memory session store with TTL (5 minute sessions)
const adminSessions = new Map<string, { email: string; createdAt: number }>();
const SESSION_TTL_MS = 5 * 60 * 1000;

// Cleanup old sessions every minute
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of adminSessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      adminSessions.delete(token);
    }
  }
}, 60000);

export async function verifyAdminSession(token: string): Promise<string | null> {
  const now = Date.now();
  const session = adminSessions.get(token);

  if (!session) return null;
  if (now - session.createdAt > SESSION_TTL_MS) {
    adminSessions.delete(token);
    return null;
  }

  return session.email;
}

export async function createAdminSession(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, { email, createdAt: Date.now() });
  return token;
}

export async function validateAdminCredentials(
  email: string,
  password: string,
  googleToken: string
): Promise<boolean> {
  // Verify email is in allowed list
  if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
    return false;
  }

  // Verify password (bcrypt would be better in production)
  const passwordHash = crypto
    .createHash('sha256')
    .update(password + process.env.ADMIN_PASSWORD_SALT || '')
    .digest('hex');

  if (passwordHash !== ADMIN_PASSWORD_HASH) {
    return false;
  }

  // In production, verify googleToken with Google's API
  // For now, just check it exists
  if (!googleToken) {
    return false;
  }

  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  if (action === 'login') {
    const { email, password, googleToken } = req.body;

    if (!email || !password || !googleToken) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const isValid = await validateAdminCredentials(email, password, googleToken);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sessionToken = await createAdminSession(email);
    res.setHeader('Set-Cookie', `admin_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`);

    return res.status(200).json({ session: sessionToken, email });
  }

  if (action === 'verify') {
    const cookies = req.headers.cookie || '';
    const match = cookies.match(/admin_session=([^;]+)/);
    const sessionToken = match ? match[1] : '';

    const email = await verifyAdminSession(sessionToken);
    if (!email) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    return res.status(200).json({ authenticated: true, email });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
