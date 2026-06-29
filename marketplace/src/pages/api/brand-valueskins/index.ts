import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * GET /api/brand-valueskins - Fetch brand's ValueSkins (categories)
 * POST /api/brand-valueskins - Create brand ValueSkin
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

    // Verify user is a brand
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows[0]?.role !== 'brand') {
      return res.status(403).json({ error: 'Only brands can access brand ValueSkins' });
    }

    if (req.method === 'GET') {
      const skinsResult = await query(
        `SELECT id, category, level, description, created_at, updated_at
         FROM brand_valueskins WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      const skin = skinsResult.rows[0] ? {
        id: skinsResult.rows[0].id,
        category: skinsResult.rows[0].category,
        level: parseInt(skinsResult.rows[0].level) || 1,
        description: skinsResult.rows[0].description,
        createdAt: skinsResult.rows[0].created_at,
        updatedAt: skinsResult.rows[0].updated_at,
      } : null;

      return res.status(200).json({ userRole: 'brand', skin, skinCount: skin ? 1 : 0, maxSkins: 1 });
    }

    if (req.method === 'POST') {
      const { category, description } = req.body;

      if (!category) {
        return res.status(400).json({ error: 'Category is required' });
      }

      // Check if brand already has a skin
      const existingResult = await query(
        'SELECT id FROM brand_valueskins WHERE user_id = $1',
        [userId]
      );

      if (existingResult.rows.length > 0) {
        return res.status(409).json({ error: 'You already have a brand ValueSkin. Remove it to create a new one.' });
      }

      const insertResult = await query(
        `INSERT INTO brand_valueskins (user_id, category, level, description, created_at)
         VALUES ($1, $2, 1, $3, NOW()) RETURNING id, category, level, description, created_at`,
        [userId, category, description || '']
      );

      const newSkin = insertResult.rows[0];
      return res.status(201).json({
        id: newSkin.id,
        category: newSkin.category,
        xp: 0,
        level: 1,
        description: newSkin.description,
        createdAt: newSkin.created_at,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Brand ValueSkins API error:', err);
    return res.status(500).json({ error: 'Failed to manage brand ValueSkins' });
  }
}
