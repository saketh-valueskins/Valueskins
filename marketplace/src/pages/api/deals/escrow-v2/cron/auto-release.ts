import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { autoReleaseExpiredReviewPeriods } from '@/lib/escrow';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not set — auto-release disabled');
    return res.status(500).json({ error: 'Cron not configured' });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  console.log(`auto-release cron triggered from ${ip} at ${new Date().toISOString()}`);

  try {
    const released = await autoReleaseExpiredReviewPeriods();
    return res.status(200).json({
      success: true,
      autoReleased: released,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Auto-release cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default withApiHandler(handler);
