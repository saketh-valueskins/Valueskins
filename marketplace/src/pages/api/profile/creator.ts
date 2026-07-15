import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

let profileMigrated = false;

async function ensureProfileColumns() {
  if (profileMigrated) return;
  const cols = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_handle TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS tiktok_handle TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_handle TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_handle TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_handle TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS open_for_work BOOLEAN DEFAULT true",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS min_deal_value INTEGER DEFAULT 500",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_deal_types JSONB DEFAULT '[\"paid\",\"barter\"]'::jsonb",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'available'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS response_time TEXT DEFAULT '24'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS pitch_video_url TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS pitch_text TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_items JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'creator'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT",
  ];
  for (const sql of cols) {
    try { await query(sql); } catch {}
  }
  profileMigrated = true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureProfileColumns();

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

      // Numeric columns: coerce strings -> numbers so the pg driver doesn't
      // choke inserting a string into NUMERIC/INTEGER columns.
      const numericColumns = new Set(['followers_count', 'engagement_rate', 'min_deal_value']);

      for (const [key, value] of Object.entries(body)) {
        const dbColumn = mapping[key];
        if (dbColumn && value !== undefined && value !== null) {
          // username is UNIQUE — skip blank values to avoid unique-constraint 500s
          if (dbColumn === 'username' && String(value).trim() === '') {
            continue;
          }
          // Deduplicate: if both instagram and instagram_handle are present, use one
          if (!fields[dbColumn]) {
            if (numericColumns.has(dbColumn)) {
              const num = Number(value);
              fields[dbColumn] = Number.isFinite(num) ? num : 0;
            } else {
              fields[dbColumn] = value;
            }
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
