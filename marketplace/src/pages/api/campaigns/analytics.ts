import { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionToken = req.cookies.valueskins_session;
  const session = await queryOne('SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()', [sessionToken || '']);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user_id;

  if (req.method === 'POST') {
    const { campaign_id } = req.body;
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id required' });

    try {
      const existing = await queryOne('SELECT * FROM campaign_analytics WHERE campaign_id = $1', [campaign_id]);
      if (existing) return res.status(200).json({ analytics: existing });

      const deals = await query(
        `SELECT d.id, d.offer_amount, d.status, d.completed_at, dr.rating
         FROM deals d LEFT JOIN deal_reviews dr ON dr.deal_id = d.id
         WHERE d.id LIKE $1`,
        [`${campaign_id}%`]
      );

      const totalDeals = deals.rows.length;
      const completedDeals = deals.rows.filter((d: any) => d.status === 'completed' || d.completed_at).length;
      const totalSpend = deals.rows.reduce((sum: number, d: any) => sum + (parseFloat(d.offer_amount) || 0), 0);
      const ratings = deals.rows.filter((d: any) => d.rating).map((d: any) => d.rating);
      const avgRating = ratings.length ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) : null;

      const analytics = await queryOne(
        `INSERT INTO campaign_analytics (campaign_id, brand_id, total_deals, total_spend, avg_rating, total_creators, completed_deals, report_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [campaign_id, userId, totalDeals, totalSpend, avgRating, totalDeals, completedDeals,
         JSON.stringify({ deals: deals.rows })]
      );

      return res.status(200).json({ analytics });
    } catch { return res.status(500).json({ error: 'Failed to generate analytics' }); }
  }

  if (req.method === 'GET') {
    const { campaign_id } = req.query;
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id required' });

    try {
      const analytics = await queryOne('SELECT * FROM campaign_analytics WHERE campaign_id = $1', [campaign_id]);
      return res.status(200).json({ analytics: analytics || null });
    } catch { return res.status(500).json({ error: 'Failed to fetch analytics' }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
