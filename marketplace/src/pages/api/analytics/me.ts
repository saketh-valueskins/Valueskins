import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { getCreatorAnalytics, getBrandAnalytics } from '@/lib/analytics';
import { query } from '@/lib/db-pool';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sessionToken = req.cookies.valueskins_session;
    if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });

    const userIdHeader = req.headers['x-user-id'];
    if (!userIdHeader || typeof userIdHeader !== 'string') {
      return res.status(401).json({ error: 'Unauthorized: x-user-id required' });
    }

    const userId = parseInt(userIdHeader, 10);
    if (isNaN(userId)) return res.status(401).json({ error: 'Invalid user ID' });

    // Verify session matches the claimed user
    const sessionCheck = await query(
      'SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()',
      [sessionToken]
    );
    if (sessionCheck.rows.length === 0) return res.status(401).json({ error: 'Session expired or invalid' });
    if (Number(sessionCheck.rows[0].user_id) !== userId) {
      return res.status(403).json({ error: 'Session mismatch' });
    }

    const userRow = await query('SELECT account_id FROM users WHERE id = $1', [userId]);
    if (userRow.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const accountId = userRow.rows[0].account_id;

    const role = (req.query.role as string) || '';

    if (role === 'creator') {
      const data = await getCreatorAnalytics(accountId);
      return res.status(200).json({ role: 'creator', data });
    }

    if (role === 'brand') {
      const data = await getBrandAnalytics(accountId);
      return res.status(200).json({ role: 'brand', data });
    }

    const moduleCheck = await query(
      `SELECT m.code FROM modules m
       JOIN account_modules am ON am.module_id = m.id
       WHERE am.account_id = $1 AND am.is_active = TRUE AND m.code IN ('brand', 'valueskin')`,
      [accountId]
    );

    const modules = moduleCheck.rows.map((r: any) => r.code);
    const isBrand = modules.includes('brand');
    const isCreator = modules.includes('valueskin');

    if (isBrand && !isCreator) {
      const data = await getBrandAnalytics(accountId);
      return res.status(200).json({ role: 'brand', data });
    }

    const data = await getCreatorAnalytics(accountId);
    return res.status(200).json({ role: 'creator', data });
  } catch (err: any) {
    console.error('[analytics] Error:', err.message);
    return res.status(500).json({ error: 'Failed to load analytics' });
  }
}

export default withApiHandler(handler, {
  rateLimit: { maxRequests: 30, windowMs: 60000 },
});
