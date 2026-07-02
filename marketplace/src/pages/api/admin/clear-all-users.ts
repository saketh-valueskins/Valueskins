import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminSession } from './auth';

// DANGER: This endpoint clears ALL users from the database
// Only available in development/testing, requires admin auth
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin session
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_session=([^;]+)/);
  const sessionToken = match ? match[1] : '';

  const adminEmail = await verifyAdminSession(sessionToken);
  if (!adminEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'This operation is disabled in production' });
  }

  return res.status(200).json({ message: 'Contact support for data reset' });
}
