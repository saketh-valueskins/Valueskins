import { NextApiRequest, NextApiResponse } from 'next';
import { setupCors } from '@/lib/cors';
import { query } from '@/lib/db-pool';
import { getAuthenticatedUserId } from '@/lib/auth/require-user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ?userId= is a public-profile lookup; otherwise default to the session user.
    const userId = req.query.userId || (await getAuthenticatedUserId(req));
    if (!userId) {
      return res.status(200).json({ credentials: [] });
    }

    const result = await query(
      `SELECT id, platform, handle, verified FROM social_credentials WHERE user_id = $1 ORDER BY platform`,
      [String(userId)]
    );

    return res.status(200).json({ credentials: result.rows });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return res.status(200).json({ credentials: [] });
  }
}
