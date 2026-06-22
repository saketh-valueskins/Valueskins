import { NextApiRequest, NextApiResponse } from 'next';
import { setupCors } from '@/lib/cors';
import { sendEmail, sendNotificationEmail, EmailType } from '@/lib/email';

const VALID_TYPES: EmailType[] = [
  'deal_update', 'new_message', 'payment_confirmed', 'payout_processed',
  'password_reset', 'email_verification', 'campaign_invite', 'welcome', 'deal_completed',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      types: VALID_TYPES,
      note: 'Send transactional emails via POST. Requires SMTP_HOST and SMTP_PORT env vars for delivery; otherwise logs to email_queue table.',
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { to, userId, type, data } = req.body;

    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid type', validTypes: VALID_TYPES });
    }

    if (userId && !to) {
      const result = await sendNotificationEmail({ userId, type, data });
      return res.status(result.sent ? 200 : 202).json(result);
    }

    if (!to) return res.status(400).json({ error: 'Either to or userId required' });

    const result = await sendEmail({ to, userId: userId || undefined, type, data });
    return res.status(result.sent ? 200 : 202).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Email send failed' });
  }
}
