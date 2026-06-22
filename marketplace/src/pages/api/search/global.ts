import { NextApiRequest, NextApiResponse } from 'next';
import { setupCors } from '@/lib/cors';
import { query } from '@/lib/db-pool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const q = ((req.query.q as string) || '').trim();
    if (!q || q.length < 2) return res.status(200).json({ creators: [], deals: [], campaigns: [] });

    const searchTerm = `%${q}%`;

    const [creators, deals, campaigns] = await Promise.all([
      query(
        `SELECT id, display_name, bio, niche, followers_count, instagram_handle, engagement_rate
         FROM users WHERE display_name ILIKE $1 OR bio ILIKE $1 OR niche::text ILIKE $1
         LIMIT 5`,
        [searchTerm]
      ),
      query(
        `SELECT id, title, budget, phase, created_at
         FROM deals WHERE title ILIKE $1 LIMIT 5`,
        [searchTerm]
      ),
      query(
        `SELECT id, title, description, status, budget_per_creator
         FROM campaigns WHERE title ILIKE $1 OR description ILIKE $1 LIMIT 5`,
        [searchTerm]
      ),
    ]);

    return res.status(200).json({
      creators: creators.rows,
      deals: deals.rows,
      campaigns: campaigns.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Search failed' });
  }
}
