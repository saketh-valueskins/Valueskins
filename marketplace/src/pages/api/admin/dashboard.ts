import { NextApiRequest, NextApiResponse } from 'next';
import { setupCors } from '@/lib/cors';
import { query, queryOne } from '@/lib/db-pool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [users, deals, escrow, payments, brands, reports] = await Promise.all([
      queryOne('SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL \'7 days\')::int as new_this_week FROM users'),
      queryOne('SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE phase = \'active\' OR phase = \'funded\' OR phase = \'in_progress\')::int as active FROM deals WHERE phase IS NOT NULL'),
      queryOne('SELECT COUNT(*)::int as total, COALESCE(SUM(amount)::numeric,0)::numeric(10,2) as total_locked FROM deal_escrow WHERE status = \'pending\' OR status = \'hold\''),
      queryOne('SELECT COUNT(*)::int as total, COALESCE(SUM(amount)::numeric,0)::numeric(10,2) as total_paid FROM deal_payments WHERE status = \'completed\''),
      queryOne('SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = \'pending\')::int as pending FROM brand_verification'),
      query('SELECT phase, COUNT(*)::int as count FROM deals WHERE phase IS NOT NULL GROUP BY phase ORDER BY count DESC'),
    ]);

    return res.status(200).json({
      users, deals, escrow, payments, brands,
      phaseBreakdown: reports.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load dashboard data' });
  }
}
