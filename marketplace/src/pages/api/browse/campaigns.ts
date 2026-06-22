import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getAccountId } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getAccountId(req.headers.cookie || '');
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize as string) || 20), 100);
    const offset = (page - 1) * pageSize;

    const niche = req.query.niche as string;
    const maxBudget = req.query.maxBudget ? parseInt(req.query.maxBudget as string) : null;
    const search = req.query.search as string;

    const conditions: string[] = ["c.status = 'active'"];
    const params: any[] = [];
    let p = 1;

    if (niche) {
      conditions.push(`(c.required_niches ILIKE $${p} OR c.description ILIKE $${p})`);
      params.push(`%${niche}%`);
      p++;
    }

    if (maxBudget) {
      conditions.push(`c.budget_per_creator <= $${p} OR c.budget_per_creator = 0`);
      params.push(maxBudget);
      p++;
    }

    if (search) {
      conditions.push(`(c.title ILIKE $${p} OR c.description ILIKE $${p})`);
      params.push(`%${search}%`);
      p++;
    }

    conditions.push(`NOT EXISTS (
      SELECT 1 FROM campaign_bids cb WHERE cb.campaign_id = c.id AND cb.creator_id = $${p}
    )`);
    params.push(userId);
    p++;

    conditions.push(`NOT EXISTS (
      SELECT 1 FROM campaign_invites ci WHERE ci.campaign_id = c.id AND ci.creator_id = $${p}
    )`);
    params.push(userId);

    const whereClause = conditions.join(' AND ');

    const countResult = await query(`SELECT COUNT(*) as total FROM campaigns c WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0]?.total || '0');

    params.push(pageSize, offset);
    const r = await query(
      `SELECT c.*, a.display_name as brand_name, a.username as brand_username, a.avatar_url as brand_avatar,
        COALESCE(br.overall_rating, 0) as brand_rating, br.total_reviews
       FROM campaigns c
       JOIN accounts a ON c.brand_id = a.id
       LEFT JOIN (
         SELECT brand_id, AVG(overall_rating)::DECIMAL(3,2) as overall_rating, COUNT(*) as total_reviews
         FROM brand_reviews GROUP BY brand_id
       ) br ON c.brand_id = br.brand_id
       WHERE ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      params
    );

    const myBids = await query(
      `SELECT cb.*, c.title as campaign_title
       FROM campaign_bids cb JOIN campaigns c ON cb.campaign_id = c.id
       WHERE cb.creator_id = $1 AND cb.status = 'pending'`,
      [userId]
    );

    const myInvites = await query(
      `SELECT ci.*, c.title as campaign_title
       FROM campaign_invites ci JOIN campaigns c ON ci.campaign_id = c.id
       WHERE ci.creator_id = $1`,
      [userId]
    );

    return res.json({
      campaigns: r.rows,
      my_bids: myBids.rows,
      my_invites: myInvites.rows,
      pagination: {
        page, pageSize, total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
  } catch (err: any) {
    console.error('Browse campaigns error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
