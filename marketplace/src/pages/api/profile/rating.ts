import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getAccountId } from '@/lib/session';
import { computeRating } from '@/lib/rating';

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await query(`CREATE TABLE IF NOT EXISTS creator_ratings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL DEFAULT 0,
    follower_score INTEGER NOT NULL DEFAULT 0,
    engagement_score INTEGER NOT NULL DEFAULT 0,
    consistency_score INTEGER NOT NULL DEFAULT 0,
    reach_tier VARCHAR(50) NOT NULL DEFAULT 'Unrated',
    risk_flags TEXT[] DEFAULT '{}',
    calculated_at TIMESTAMP DEFAULT NOW()
  )`);
  schemaReady = true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getAccountId(req.headers.cookie || '');
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const targetId = req.query.userId ? parseInt(req.query.userId as string) : userId;
      const cached = await query('SELECT * FROM creator_ratings WHERE user_id = $1', [targetId]);
      return res.json({ rating: cached.rows[0] || null });
    }

    if (req.method === 'POST') {
      const stats = await query('SELECT * FROM creator_social_stats WHERE user_id = $1', [userId]);
      const rating = computeRating(stats.rows);

      await query(`INSERT INTO creator_ratings (user_id, overall_score, follower_score, engagement_score, consistency_score, reach_tier, risk_flags, calculated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          overall_score = $2, follower_score = $3, engagement_score = $4, consistency_score = $5,
          reach_tier = $6, risk_flags = $7, calculated_at = NOW()`,
        [userId, rating.overallScore, rating.followerScore, rating.engagementScore, rating.consistencyScore, rating.reachTier, rating.riskFlags]);

      return res.json({ rating, warning: rating.riskFlags.length > 0 ? 'Some stats appear inflated. Reviews from deal partners may override algorithm.' : null });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Rating error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
