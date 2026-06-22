import type { NextApiRequest, NextApiResponse } from 'next';
import { createAndSetCsrfToken } from '@/lib/security/csrf-pages';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = createAndSetCsrfToken(res);

  res.status(200).json({ token });
}
