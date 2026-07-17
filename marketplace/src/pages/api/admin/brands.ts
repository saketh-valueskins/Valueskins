import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db-pool';
import { verifyAdminSession } from './login';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin session
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_session=([^;]+)/);
  const sessionToken = match ? match[1] : '';

  const isValidSession = await verifyAdminSession(sessionToken);
  if (!isValidSession) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all brands with their data
    const result = await query(`
      SELECT
        u.id,
        u.email,
        u.display_name as company_name,
        u.created_at,
        u.status,
        COUNT(d.id) as total_deals,
        COALESCE(SUM(CASE WHEN d.phase = 'completed' THEN 1 ELSE 0 END), 0)::int as completed_deals,
        'pending'::text as verification_status
      FROM users u
      LEFT JOIN deals d ON u.id = d.brand_id
      WHERE u.role = 'brand' OR u.id IN (SELECT DISTINCT brand_id FROM deals)
      GROUP BY u.id, u.email, u.display_name, u.created_at, u.status
      ORDER BY u.created_at DESC
      LIMIT 1000
    `);

    return res.status(200).json({ brands: result.rows || [] });
  } catch (err: any) {
    console.error('Error fetching brands:', err);
    return res.status(500).json({ error: 'Failed to fetch brands' });
  }
}
