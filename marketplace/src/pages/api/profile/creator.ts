import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const sessionToken = req.cookies.valueskins_session;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sessionResult = await query(
      'SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = TRUE',
      [sessionToken]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const userId = sessionResult.rows[0].user_id;

    if (req.method === 'GET') {
      const profileResult = await query(
        `SELECT
          display_name, username, bio, location, country,
          instagram_handle, tiktok_handle, youtube_handle, twitter_handle, linkedin_handle,
          website, followers_count, engagement_rate, niche,
          languages, open_for_work, min_deal_value, preferred_deal_types,
          availability, response_time, pitch_video_url, pitch_text,
          portfolio_items
        FROM users WHERE id = $1`,
        [userId]
      );

      if (profileResult.rows.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      return res.status(200).json(profileResult.rows[0]);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body || {};

      // Map frontend field names to DB column names
      const fields: Record<string, any> = {};
      const mapping: Record<string, string> = {
        display_name: 'display_name',
        username: 'username',
        bio: 'bio',
        location: 'location',
        country: 'country',
        instagram: 'instagram_handle',
        instagram_handle: 'instagram_handle',
        tiktok: 'tiktok_handle',
        tiktok_handle: 'tiktok_handle',
        youtube: 'youtube_handle',
        youtube_handle: 'youtube_handle',
        twitter: 'twitter_handle',
        twitter_handle: 'twitter_handle',
        linkedin: 'linkedin_handle',
        linkedin_handle: 'linkedin_handle',
        website: 'website',
        niche: 'niche',
        followers_count: 'followers_count',
        engagement_rate: 'engagement_rate',
        open_for_work: 'open_for_work',
        min_deal_value: 'min_deal_value',
        preferred_deal_types: 'preferred_deal_types',
        availability: 'availability',
        response_time: 'response_time',
        pitch_video_url: 'pitch_video_url',
        pitch_text: 'pitch_text',
      };

      for (const [key, value] of Object.entries(body)) {
        const dbColumn = mapping[key];
        if (dbColumn && value !== undefined && value !== null) {
          // Deduplicate: if both instagram and instagram_handle are present, use one
          if (!fields[dbColumn]) {
            fields[dbColumn] = value;
          }
        }
      }

      // Build UPDATE query dynamically
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      // JSONB columns need to be serialized as JSON strings for the pg driver
      const jsonbColumns = new Set(['languages', 'preferred_deal_types', 'portfolio_items', 'modules']);

      for (const [column, value] of Object.entries(fields)) {
        updates.push(`${column} = $${paramCount}`);
        // Serialize arrays/objects for JSONB columns
        if (jsonbColumns.has(column) && (Array.isArray(value) || typeof value === 'object')) {
          params.push(JSON.stringify(value));
        } else {
          params.push(value);
        }
        paramCount++;
      }

      if (updates.length === 0) {
        return res.status(200).json({ message: 'No fields to update', userId });
      }

      updates.push(`updated_at = NOW()`);
      params.push(userId);

      await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        params
      );

      return res.status(200).json({ message: 'Profile updated', userId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Creator profile error:', error?.message || error);
    const detail = process.env.NODE_ENV !== 'production' ? error?.message : undefined;
    return res.status(500).json({ error: detail || 'Server error' });
  }
}
