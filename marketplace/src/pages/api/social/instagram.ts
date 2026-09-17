import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { ensureSocialAccountsTable } from '@/lib/instagram-social';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rawUserId = req.query.userId;
  if (!rawUserId || Array.isArray(rawUserId)) {
    return res.status(400).json({ error: 'userId required' });
  }
  const userId = Number(rawUserId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  try {
    await ensureSocialAccountsTable();

    const result = await query(
      `SELECT platform_user_id, username, display_name, account_type, bio,
              followers_count, media_count, profile_picture_url,
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
      connectedAt: row.connected_at,
      lastSyncedAt: row.follower_count_last_synced_at,
    });
  } catch (error: any) {
    console.error('Instagram analytics error:', error?.message || error);
    return res.status(500).json({ error: 'Server error' });
  }
}