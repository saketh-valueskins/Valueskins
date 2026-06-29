import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * GET /api/valueskins - Fetch current user's ValueSkins
 * POST /api/valueskins - Create new ValueSkin
 * 
 * Returns ValueSkins based on user role:
 * - Creator: shows creator profession-based skins
 * - Brand: shows brand category-based skins
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionToken = req.cookies.valueskins_session;

  if (!sessionToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sessionResult = await query(
      'SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()',
      [sessionToken]
    );

    if (!sessionResult.rows.length) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const userId = sessionResult.rows[0].user_id;

    // Get user role
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role || 'creator';

    if (req.method === 'GET') {
      // Fetch all ValueSkins for this user
      const skinsResult = await query(
        `SELECT
          id, user_id, profession, level, about_me, pitch_text, pitch_video,
          created_at, updated_at
         FROM user_valueskins
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      const skins = skinsResult.rows.map((skin: any) => ({
        id: skin.id,
        profession: skin.profession,
        level: parseInt(skin.level) || 1,
        aboutMe: skin.about_me,
        pitchText: skin.pitch_text,
        pitchVideo: skin.pitch_video,
        createdAt: skin.created_at,
        updatedAt: skin.updated_at,
      }));

      return res.status(200).json({
        userRole,
        skin: skins[0] || null,
        skinCount: skins.length,
        maxSkins: 1,
      });
    }

    if (req.method === 'POST') {
      const { profession, aboutMe, pitchText, pitchVideo } = req.body;

      // Validation
      if (!profession) {
        return res.status(400).json({ error: 'Profession is required' });
      }

      // Check if user already has a skin
      const existingResult = await query(
        'SELECT id FROM user_valueskins WHERE user_id = $1',
        [userId]
      );

      if (existingResult.rows.length > 0) {
        return res.status(409).json({ error: 'You already have a ValueSkin. Remove it to create a new one.' });
      }

      // Create ValueSkin
      const insertResult = await query(
        `INSERT INTO user_valueskins (user_id, profession, level, about_me, pitch_text, pitch_video, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, profession, level, about_me, pitch_text, pitch_video, created_at`,
        [userId, profession, 1, aboutMe || '', pitchText || '', pitchVideo || '']
      );

      const newSkin = insertResult.rows[0];

      // Sync profession to users.niche for matching queries
      await query('UPDATE users SET niche = $1 WHERE id = $2', [profession, userId]);

      // Sync to user_value_skins for marketplace discovery
      await query(
        `INSERT INTO user_value_skins (user_id, value_skin)
         VALUES ($1, $2) ON CONFLICT (user_id, value_skin) DO NOTHING`,
        [userId, profession]
      );

      return res.status(201).json({
        id: newSkin.id,
        profession: newSkin.profession,
        xp: 0,
        level: 1,
        aboutMe: newSkin.about_me,
        pitchText: newSkin.pitch_text,
        pitchVideo: newSkin.pitch_video,
        createdAt: newSkin.created_at,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('ValueSkins API error:', err);
    return res.status(500).json({ error: 'Failed to manage ValueSkins' });
  }
}
