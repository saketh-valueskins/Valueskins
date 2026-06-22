import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await query(
      'SELECT id, name, category, image_uri FROM professions ORDER BY category, name',
    );

    const grouped: Record<string, { id: number; name: string; image_uri?: string }[]> = {};
    for (const row of result.rows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push({ id: row.id, name: row.name, image_uri: row.image_uri || undefined });
    }

    return res.status(200).json({ categories: grouped });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch professions' });
  }
}
