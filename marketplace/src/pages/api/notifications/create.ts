import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * POST /api/notifications/create
 * Create a notification record in database
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { creatorId, dealId, dealTitle, brandName, niche, budget, deadline } = req.body;

    if (!creatorId || !dealId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await query(
      `INSERT INTO notifications (creator_id, deal_id, deal_title, brand_name, niche, budget, deadline, read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
       RETURNING *`,
      [creatorId, dealId, dealTitle, brandName, niche, budget, deadline]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating notification:', err);
    return res.status(500).json({ error: 'Failed to create notification' });
  }
}
