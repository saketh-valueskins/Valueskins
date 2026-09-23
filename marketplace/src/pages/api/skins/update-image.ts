import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db-pool';
import { requireUser } from '@/lib/auth/require-user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionUserId = await requireUser(req, res);
    if (!sessionUserId) return;

    // Identity is the session user; a body userId is ignored.
    const userId = sessionUserId;
    const { valueSkin, imageBase64 } = req.body;

    if (!valueSkin || !imageBase64) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await query(
      'UPDATE user_value_skins SET image_url = $1, updated_at = NOW() WHERE user_id = $2 AND value_skin = $3',
      [imageBase64, userId, valueSkin]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Update image error:', error);
    return res.status(500).json({ error: 'Failed to update image' });
  }
}
