import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db-pool';
import { withApiHandler } from '@/lib/api-handler';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sessionToken = req.cookies.valueskins_session;
    if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });

    const sessionResult = await query(
      'SELECT account_id FROM sessions WHERE session_token = $1',
      [sessionToken]
    );
    if (!sessionResult.rows[0]) return res.status(401).json({ error: 'Invalid session' });

    const userId = sessionResult.rows[0].account_id;

    const dealsResult = await query(
      `SELECT id, title, status, deal_state, phase, offer_amount, delivery_type, created_at, completed_at,
              usage_rights_days, license_expiration_date, analytics_status, total_views, analytics_screenshot_link, analytics_window_start,
              CASE WHEN creator_id = $1 THEN brand_id ELSE creator_id END as partner_id,
              CASE WHEN creator_id = $1 THEN 'creator' ELSE 'brand' END as user_role
       FROM deals
       WHERE creator_id = $1 OR brand_id = $1
       ORDER BY GREATEST(created_at, COALESCE(completed_at, created_at)) DESC
       LIMIT 200`,
      [userId]
    );

    const deals = await Promise.all(
      dealsResult.rows.map(async (deal: any) => {
        let partnerName = deal.partner_id;
        const partnerResult = await query(
          "SELECT display_name, username FROM accounts WHERE id = $1",
          [deal.partner_id]
        );
        if (partnerResult.rows[0]) {
          partnerName = partnerResult.rows[0].display_name || partnerResult.rows[0].username || deal.partner_id;
        }

        const msgResult = await query(
          `SELECT message, sender_id, created_at FROM deal_messages
           WHERE deal_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [deal.id]
        );

        const unreadResult = await query(
          `SELECT COUNT(*) as count FROM deal_messages
           WHERE deal_id = $1 AND sender_id != $2`,
          [deal.id, userId]
        );

        return {
          id: deal.id,
          title: deal.title || `Deal #${deal.id}`,
          status: deal.status || deal.deal_state || deal.phase || 'unknown',
          offerAmount: Number(deal.offer_amount) || 0,
          partnerName,
          userRole: deal.user_role,
          createdAt: deal.created_at,
          completedAt: deal.completed_at,
          lastMessage: msgResult.rows[0] ? {
            text: (msgResult.rows[0].message || '').substring(0, 100),
            senderId: msgResult.rows[0].sender_id,
            createdAt: msgResult.rows[0].created_at,
          } : null,
          unreadCount: parseInt(unreadResult.rows[0]?.count || '0'),
        };
      })
    );

    return res.status(200).json({ deals });
  } catch (err: any) {
    console.error('My deals API error:', err);
    return res.status(500).json({ error: 'Failed to fetch deals' });
  }
}

export default withApiHandler(handler, {
  allowedMethods: ['GET'],
});
