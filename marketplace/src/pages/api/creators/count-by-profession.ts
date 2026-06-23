import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export interface ProfessionCount {
  profession: string;
  count: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ProfessionCount[] | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await query(
      `SELECT uv.value_skin as profession, COUNT(DISTINCT uv.user_id::uuid) as count
       FROM user_value_skins uv
       JOIN users u ON u.id = uv.user_id::uuid
       WHERE u.role = 'creator' AND u.is_active = true
       GROUP BY uv.value_skin
       ORDER BY count DESC`
    );

    const data: ProfessionCount[] = result.rows.map((row: any) => ({
      profession: row.profession,
      count: parseInt(row.count) || 0,
    }));

    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Error counting creators by profession:', err);
    return res.status(500).json({ error: 'Failed to count creators by profession' });
  }
}
