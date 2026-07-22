import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import { getProfileStats, EMPTY_STATS } from '@/lib/profile-stats';

// Track Record stats for the signed-in user.
//
// MarketplaceDemoPage has been calling this endpoint for a while, but it did not
// exist — the fetch 404'd silently and the UI fell back to hardcoded metrics.
// Everything returned here is computed from completed deals (lib/profile-stats.ts);
// nothing is stored or user-editable, per Profile page.md §5.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await getSessionUserId(req.headers.cookie || '');
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const stats = await getProfileStats(String(userId));

    // followers is profile data, not a deal-derived stat
    let followers = 0;
    try {
      const u = await query('SELECT followers_count FROM users WHERE id = $1', [userId]);
      followers = Number(u.rows[0]?.followers_count ?? 0);
    } catch {
      followers = 0;
    }

    // Two naming shapes: snake_case for ProfileView, camelCase for the metrics
    // block in MarketplaceDemoPage that already consumes this route.
    return res.status(200).json({
      ...stats,
      followers,
      dealsCompleted: stats.deals_completed,
      onTimeRate: stats.on_time_rate,
      avgRating: stats.avg_rating,
      repeatRate: stats.repeat_rate,
      trustScore: stats.trust_score,
      avgResponseHours: stats.avg_response_hours,
    });
  } catch {
    return res.status(200).json({ ...EMPTY_STATS, followers: 0 });
  }
}
