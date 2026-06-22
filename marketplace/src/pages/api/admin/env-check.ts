import { NextApiRequest, NextApiResponse } from 'next';

interface EnvStatus {
  name: string;
  set: boolean;
  required: boolean;
  note?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim());
  const userId = req.headers['x-user-id'] as string;
  if (!userId || (adminIds.length > 0 && !adminIds.includes(userId))) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const vars: EnvStatus[] = [
    { name: 'DATABASE_URL', set: !!process.env.DATABASE_URL, required: true },
    { name: 'RAZORPAY_KEY_ID', set: !!process.env.RAZORPAY_KEY_ID, required: true },
    { name: 'RAZORPAY_KEY_SECRET', set: !!process.env.RAZORPAY_KEY_SECRET, required: true },
    { name: 'RAZORPAY_ACCOUNT_NUMBER', set: !!process.env.RAZORPAY_ACCOUNT_NUMBER, required: true, note: 'Required for transfers to creator payout accounts' },
    { name: 'RAZORPAY_WEBHOOK_SECRET', set: !!process.env.RAZORPAY_WEBHOOK_SECRET, required: true, note: 'Verifies Razorpay webhook signatures' },
    { name: 'NEXT_PUBLIC_RAZORPAY_KEY_ID', set: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, required: true, note: 'Exposed to client for Razorpay Checkout' },
    { name: 'CRON_SECRET', set: !!process.env.CRON_SECRET, required: true, note: 'Protects cron endpoints' },
    { name: 'ADMIN_IDS', set: !!process.env.ADMIN_IDS, required: false, note: 'Comma-separated user IDs with admin access' },
    { name: 'RAZORPAY_WEBHOOK_IP_CHECK', set: !!process.env.RAZORPAY_WEBHOOK_IP_CHECK, required: false, note: 'Set to "true" to enable Razorpay IP whitelist' },
  ];

  const missing = vars
    .filter(v => v.required && !v.set)
    .map(v => v.name);

  return res.status(missing.length === 0 ? 200 : 500).json({
    healthy: missing.length === 0,
    missingRequired: missing,
    vars,
    timestamp: new Date().toISOString(),
  });
}
