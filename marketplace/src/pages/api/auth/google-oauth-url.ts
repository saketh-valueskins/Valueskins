import type { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleOAuthUrl } from '@/lib/google-calendar';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authUrl = getGoogleOAuthUrl();
    return res.status(200).json({ authUrl });
  } catch (err) {
    console.error('Error generating OAuth URL:', err);
    return res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
}
