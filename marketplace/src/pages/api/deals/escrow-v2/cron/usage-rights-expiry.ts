import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { query } from '@/lib/db-pool';
import { sendEmail } from '@/lib/email';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Usage Rights Expiry] CRON_SECRET not set');
    return res.status(500).json({ error: 'Cron not configured' });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  console.log(`[Usage Rights Expiry] triggered from ${ip} at ${new Date().toISOString()}`);

  try {
    const expiring = await query(
      `SELECT d.id as deal_id, d.title, d.usage_rights_days, d.license_expiration_date,
              d.brand_id, d.creator_id,
              b.email as brand_email, b.name as brand_name,
              c.name as creator_name
       FROM deals d
       LEFT JOIN users b ON b.id = d.brand_id
       LEFT JOIN users c ON c.id = d.creator_id
       WHERE d.phase = 'completed'
         AND d.license_expiration_date IS NOT NULL
         AND d.license_expiration_date - INTERVAL '5 days' <= NOW()
         AND d.license_expiration_date > NOW()`,
      []
    );

    let notified = 0;

    for (const row of expiring.rows) {
      try {
        if (!row.brand_email) {
          console.warn(`[Usage Rights Expiry] No email for brand ${row.brand_id} on deal ${row.deal_id}`);
          continue;
        }

        const expirationDate = new Date(row.license_expiration_date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        });

        await sendEmail({
          to: row.brand_email,
          userId: row.brand_id,
          type: 'usage_rights_expiring',
          data: {
            deal_id: row.deal_id,
            title: row.title || `Deal #${row.deal_id}`,
            creator_name: row.creator_name || 'Creator',
            expiration_date: expirationDate,
          },
        });

        console.log(`[Usage Rights Expiry] Notified brand ${row.brand_id} for deal ${row.deal_id}`);
        notified++;
      } catch (err) {
        console.error(`[Usage Rights Expiry] Failed to notify for deal ${row.deal_id}:`, err);
      }
    }

    return res.status(200).json({
      success: true,
      notified,
      totalExpiring: expiring.rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Usage Rights Expiry] Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default withApiHandler(handler);
