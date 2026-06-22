import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getAccountId } from '@/lib/session';

const avatars = [
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator1', bg: '#2563EB' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator2', bg: '#7C3AED' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator3', bg: '#DC2626' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator4', bg: '#059669' },
  { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator5', bg: '#D97706' },
];

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await query(`CREATE TABLE IF NOT EXISTS creator_social_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL DEFAULT 'instagram',
    handle VARCHAR(255) NOT NULL DEFAULT '',
    followers INTEGER NOT NULL DEFAULT 0 CHECK (followers >= 0),
    engagement_rate DECIMAL(5,2) DEFAULT 0 CHECK (engagement_rate >= 0),
    avg_likes INTEGER DEFAULT 0 CHECK (avg_likes >= 0),
    avg_comments INTEGER DEFAULT 0 CHECK (avg_comments >= 0),
    content_type VARCHAR(100) DEFAULT '',
    primary_niche VARCHAR(100) DEFAULT '',
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, platform)
  )`);
  await query('CREATE INDEX IF NOT EXISTS idx_social_stats_user ON creator_social_stats(user_id)');
  schemaReady = true;
}

function validateStats(body: any): string | null {
  if (body.followers !== undefined && (typeof body.followers !== 'number' || body.followers < 0 || body.followers > 999999999)) return 'Followers must be 0–999,999,999';
  if (body.engagement_rate !== undefined && (typeof body.engagement_rate !== 'number' || body.engagement_rate < 0 || body.engagement_rate > 100)) return 'Engagement rate must be 0–100';
  if (body.avg_likes !== undefined && (typeof body.avg_likes !== 'number' || body.avg_likes < 0)) return 'Avg likes must be >= 0';
  if (body.avg_comments !== undefined && (typeof body.avg_comments !== 'number' || body.avg_comments < 0)) return 'Avg comments must be >= 0';
  if (body.content_type !== undefined && typeof body.content_type !== 'string') return 'Content type must be a string';
  if (body.primary_niche !== undefined && typeof body.primary_niche !== 'string') return 'Primary niche must be a string';
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getAccountId(req.headers.cookie || '');
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const result = await query('SELECT * FROM creator_social_stats WHERE user_id = $1 ORDER BY platform', [userId]);
      return res.json({ stats: result.rows });
    }

    if (req.method === 'PUT') {
      const { stats } = req.body;
      if (!Array.isArray(stats)) return res.status(400).json({ error: 'stats must be an array' });
      if (stats.length > 10) return res.status(400).json({ error: 'Max 10 platforms' });

      const validPlatforms = ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'snapchat', 'pinterest', 'twitch', 'telegram', 'whatsapp_channel'];
      const seen = new Set<string>();

      for (const s of stats) {
        if (!s.platform || !validPlatforms.includes(s.platform)) return res.status(400).json({ error: `Invalid or unsupported platform: ${s.platform}` });
        if (seen.has(s.platform)) return res.status(400).json({ error: `Duplicate platform: ${s.platform}` });
        seen.add(s.platform);
        const err = validateStats(s);
        if (err) return res.status(400).json({ error: `${s.platform}: ${err}` });
      }

      for (const s of stats) {
        await query(`INSERT INTO creator_social_stats (user_id, platform, handle, followers, engagement_rate, avg_likes, avg_comments, content_type, primary_niche, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (user_id, platform) DO UPDATE SET
            handle = $3, followers = $4, engagement_rate = $5, avg_likes = $6, avg_comments = $7,
            content_type = $8, primary_niche = $9, updated_at = NOW()`,
          [userId, s.platform, s.handle || '', s.followers || 0, s.engagement_rate || 0, s.avg_likes || 0, s.avg_comments || 0, s.content_type || '', s.primary_niche || '']);
      }

      return res.json({ message: 'Social stats updated' });
    }

    if (req.method === 'DELETE') {
      const { platform } = req.query;
      if (!platform || typeof platform !== 'string') return res.status(400).json({ error: 'platform required' });
      await query('DELETE FROM creator_social_stats WHERE user_id = $1 AND platform = $2', [userId, platform]);
      return res.json({ message: 'Platform stats removed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Social stats error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
