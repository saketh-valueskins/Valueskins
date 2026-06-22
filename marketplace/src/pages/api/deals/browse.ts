import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db-pool';
import { withApiHandler } from '@/lib/api-handler';
import { setupCors } from '@/lib/cors';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(req.query.pageSize as string) || 20), 100);
    const offset = (page - 1) * pageSize;
    const minBudget = req.query.minBudget ? parseFloat(req.query.minBudget as string) : null;
    const maxBudget = req.query.maxBudget ? parseFloat(req.query.maxBudget as string) : null;
    const niche = (req.query.niche as string) || null;
    const platform = (req.query.platform as string) || null;

    let whereClause = "WHERE (status = 'open' OR deal_state = 'offer')";
    const params: any[] = [];
    let paramIdx = 1;

    if (minBudget !== null && !isNaN(minBudget)) {
      whereClause += ` AND budget >= $${paramIdx++}`;
      params.push(minBudget);
    }
    if (maxBudget !== null && !isNaN(maxBudget)) {
      whereClause += ` AND budget <= $${paramIdx++}`;
      params.push(maxBudget);
    }
    if (niche) {
      whereClause += ` AND (value_skin->>'profession' ILIKE $${paramIdx} OR value_skin->>'niche' ILIKE $${paramIdx})`;
      params.push(`%${niche}%`);
      paramIdx++;
    }
    if (platform) {
      whereClause += ` AND (value_skin->>'platform' ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`;
      params.push(`%${platform}%`);
      paramIdx++;
    }

    const countResult = await query(`SELECT COUNT(*) as total FROM deals ${whereClause}`, params);
    const total = parseInt(countResult.rows[0]?.total || '0');

    const dealsResult = await query(
      `SELECT id, title, description, budget, value_skin, brand_id, status, phase, deal_state, created_at,
              (SELECT display_name FROM accounts WHERE id = deals.brand_id) as brand_name
       FROM deals ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, pageSize, offset]
    );

    return res.status(200).json({
      deals: dealsResult.rows.map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        budget: Number(d.budget) || 0,
        brandName: d.brand_name || `Brand #${d.brand_id}`,
        status: d.status || d.deal_state || d.phase,
        createdAt: d.created_at,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
  } catch (error) {
    console.error('Browse deals error:', error);
    return res.status(500).json({ error: 'Failed to browse deals' });
  }
}

export default withApiHandler(handler);
