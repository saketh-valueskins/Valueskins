import { NextApiRequest, NextApiResponse } from 'next';
import { setupCors } from '@/lib/cors';
import { query } from '@/lib/db-pool';
import { getAccountId } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = await getAccountId(req.headers.cookie || '');
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const type = req.query.type as string;

    let whereClause = 'WHERE (d.brand_id = $1 OR d.creator_id = $1)';
    let params: any[] = [userId];

    if (type === 'incoming') {
      whereClause = 'WHERE d.creator_id = $1';
    } else if (type === 'outgoing') {
      whereClause = 'WHERE d.brand_id = $1';
    }

    const countResult = await query(`SELECT COUNT(*) as total FROM deal_payments dp JOIN deals d ON d.id::text = dp.deal_id ${whereClause}`, params);
    const totalPayments = parseInt(countResult.rows[0]?.total || '0');

    const payments = await query(
      `SELECT
        dp.id, dp.deal_id, dp.amount, dp.status, dp.transaction_id, dp.payment_date, dp.created_at,
        d.title as deal_title, d.brand_id, d.creator_id
       FROM deal_payments dp
       JOIN deals d ON d.id::text = dp.deal_id
       ${whereClause}
       ORDER BY dp.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );

    const escrowPayments = await query(
      `SELECT
        de.id, de.deal_id, de.amount, de.status as escrow_status, de.razorpay_order_id, de.created_at,
        d.title as deal_title, d.brand_id, d.creator_id
       FROM deal_escrow de
       JOIN deals d ON d.id::text = de.deal_id
       ${whereClause}
       ORDER BY de.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );

    return res.status(200).json({
      payments: payments.rows.map((p: any) => ({
        ...p, type: 'payment',
      })),
      escrow: escrowPayments.rows.map((e: any) => ({
        ...e, type: 'escrow', status: e.escrow_status,
      })),
      pagination: { page, pageSize, total: totalPayments, hasMore: page * pageSize < totalPayments },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load payment history' });
  }
}
