import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { ensureSocialAccountsTable } from '@/lib/instagram-social';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // The logged-in user owns the connection. userId query stays for backwards
  // compat with the marketplace profile surfaces; otherwise resolve from the
  // session (the Virtual Resume / reviewer flow sends no query param).
  const rawUserId = req.query.userId;
  let userId: number;

  if (rawUserId && !Array.isArray(rawUserId)) {
    const parsed = Number(rawUserId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res.status(400).json({ error: 'Invalid userId' });
    }
    userId = parsed;
  } else {
    const sessionToken = req.cookies.valueskins_session;
    if (!sessionToken) return res.status(401).json({ error: 'Not authenticated' });
    const sessionResult = await query(
      'SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = TRUE AND expires_at > NOW()',
      [sessionToken]
    );
    if (!sessionResult.rows.length) return res.status(401).json({ error: 'Invalid session' });
    userId = sessionResult.rows[0].user_id;
  }

  try {
    await ensureSocialAccountsTable();

    const result = await query(
      `SELECT platform_user_id, username, display_name, account_type, bio,
              followers_count, media_count, profile_picture_url,
              insights_reach, insights_impressions, insights_profile_views,
              insights_engagement, insights_synced_at,
              connected_at, follower_count_last_synced_at, is_active
       FROM social_media_accounts
       WHERE user_id = $1 AND platform = 'instagram'
       ORDER BY connected_at DESC
       LIMIT 1`,
      [userId]
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(200).json({ connected: false });
    }

    const hasInsights = !!row.insights_synced_at;

    return res.status(200).json({
      connected: row.is_active === true,
      instagramId: row.platform_user_id,
      username: row.username,
      displayName: row.display_name,
      accountType: row.account_type,
      bio: row.bio,
      followers: row.followers_count,
      mediaCount: row.media_count,
      profilePictureUrl: row.profile_picture_url,
      insights: hasInsights
        ? {
            reach: row.insights_reach,
            impressions: row.insights_impressions,
            profileViews: row.insights_profile_views,
            engagementRate: row.insights_engagement,
            syncedAt: new Date(row.insights_synced_at).toISOString(),
          }
        : null,
      connectedAt: row.connected_at,
      lastSyncedAt: row.follower_count_last_synced_at,
    });
  } catch (error: any) {
    console.error('Instagram analytics error:', error?.message || error);
    return res.status(500).json({ error: 'Server error' });
  }
}