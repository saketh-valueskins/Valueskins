import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const missingVars: string[] = [];

  if (!process.env.RAZORPAY_KEY_ID) missingVars.push('RAZORPAY_KEY_ID');
  if (!process.env.RAZORPAY_KEY_SECRET) missingVars.push('RAZORPAY_KEY_SECRET');
  if (!process.env.DATABASE_URL) missingVars.push('DATABASE_URL');

  if (missingVars.length > 0) {
    return res.status(500).json({
      error: 'Missing environment variables',
      missing: missingVars,
      status: 'SETUP_INCOMPLETE'
    });
  }

  res.status(200).json({
    status: 'READY',
    razorpay_configured: !!process.env.RAZORPAY_KEY_ID,
    database_configured: !!process.env.DATABASE_URL,
    timestamp: new Date().toISOString()
  });
}
