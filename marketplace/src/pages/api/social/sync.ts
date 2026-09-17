import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { ensureSocialAccountsTable } from '@/lib/instagram-social';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sessionToken = req.cookies.valueskins_session;
  if (!sessionToken) return res.status(401).json({ error: 'Not authenticated' });

  try {
    await ensureSocialAccountsTable();

    const sessionResult = await query(
      'SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = TRUE AND expires_at > NOW()',
      [sessionToken]
    );
    if (!sessionResult.rows.length) return res.status(401).json({ error: 'Invalid session' });

    const userId = sessionResult.rows[0].user_id;

    const accountResult = await query(
      `SELECT platform_user_id, access_token FROM social_media_accounts
       WHERE user_id = $1 AND platform = 'instagram' AND is_active = TRUE
       ORDER BY connected_at DESC LIMIT 1`,
      [userId]
    );

    const account = accountResult.rows[0];
    if (!account || !account.access_token) {
      return res.status(400).json({ error: 'no_instagram_connection' });
    }

    const params = new URLSearchParams({
      fields: 'id,username,account_type,biography,profile_picture_url,followers_count,media_count',
      access_token: account.access_token,
    });

    const response = await fetch(
      `https://graph.instagram.com/${account.platform_user_id}?${params.toString()}`
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[social-sync] Instagram API error', detail.slice(0, 300));
      return res.status(502).json({ error: 'instagram_api_error' });
    }

    const data = await response.json();

    await query(
      `UPDATE social_media_accounts
         SET username = COALESCE($2, username),
             account_type = COALESCE($3, account_type),
             bio = COALESCE($4, bio),
             followers_count = COALESCE($5, followers_count),
             media_count = COALESCE($6, media_count),
             profile_picture_url = COALESCE($7, profile_picture_url),
             follower_count_last_synced_at = NOW()
       WHERE user_id = $1 AND platform = 'instagram'`,
      [
        userId,
        data.username || null,
        data.account_type || null,
        data.biography || null,
        Number(data.followers_count) || null,
        Number(data.media_count) || null,
        data.profile_picture_url || null,
      ]
    );

    await query(
      `UPDATE users
         SET followers_count = $2,
             bio = COALESCE(NULLIF(bio, ''), $3),
             avatar_url = COALESCE(NULLIF(avatar_url, ''), $4)
       WHERE id = $1`,
      [
        userId,
        Number(data.followers_count) || 0,
        data.biography || null,
        data.profile_picture_url || null,
      ]
    );

    return res.status(200).json({
      username: data.username,
      account_type: data.account_type,
      bio: data.biography || '',
      followers: Number(data.followers_count) || 0,
      media_count: Number(data.media_count) || 0,
      profile_picture_url: data.profile_picture_url || null,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Social sync error:', error?.message || error);
    return res.status(500).json({ error: 'Server error' });
  }
}