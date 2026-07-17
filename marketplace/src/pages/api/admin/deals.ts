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
    // Get all deals with status and amounts
    const result = await query(`
      SELECT
        id,
        title,
        description,
        amount,
        currency,
        phase,
        created_at,
        creator_id,
        brand_id
      FROM deals
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    return res.status(200).json({ deals: result.rows || [] });
  } catch (err: any) {
    console.error('Error fetching deals:', err);
    return res.status(500).json({ error: 'Failed to fetch deals' });
  }
}
