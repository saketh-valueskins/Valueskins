import { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionToken = req.cookies.valueskins_session;
  const session = await queryOne('SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()', [sessionToken || '']);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user_id;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand_id, deal_id, description } = req.body;
  if (!brand_id || !deal_id) return res.status(400).json({ error: 'brand_id and deal_id required' });

  try {
    await query(
      `INSERT INTO ftc_reports (reporter_id, brand_id, deal_id, description, status) VALUES ($1, $2, $3, $4, 'pending')`,
      [userId, brand_id, deal_id, description || null]
    );

    const reportCount = await queryOne(
      'SELECT COUNT(*) as count FROM ftc_reports WHERE brand_id = $1 AND status = $2',
      [brand_id, 'pending']
    );

    if (reportCount && parseInt(reportCount.count) >= 3) {
      await query(
        `INSERT INTO brand_bans (brand_id, reason) VALUES ($1, 'Banned after 3+ FTC disclosure violation reports') ON CONFLICT (brand_id) DO NOTHING`,
        [brand_id]
      );
    }

    return res.status(200).json({ success: true, message: 'Report submitted. We review all FTC violation claims.' });
  } catch { return res.status(500).json({ error: 'Failed to submit report' }); }
}
