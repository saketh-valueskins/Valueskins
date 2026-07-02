import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminSession } from './auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Block catch-all — all admin routes must be explicit
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_session=([^;]+)/);
  const sessionToken = match ? match[1] : '';

  const adminEmail = await verifyAdminSession(sessionToken);
  if (!adminEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // If we get here, route doesn't exist
  return res.status(404).json({
    error: 'Not found',
    message: 'This admin endpoint does not exist',
  });
}
