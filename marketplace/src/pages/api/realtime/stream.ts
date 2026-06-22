import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUserId } from '@/lib/session';
import { subscribe, sseWrite } from '@/lib/event-bus';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const cookie = req.headers.cookie || '';
  const userId = await getSessionUserId(cookie);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  sseWrite(res, 'connected', { userId, message: 'SSE connected' });

  const unsubscribe = subscribe(userId, (event) => {
    sseWrite(res, event.event_type, event.data);
  });

  const keepAlive = setInterval(() => {
    sseWrite(res, 'keepalive', { time: Date.now() });
  }, 30000);

  // Safety timeout: auto-cleanup after 30 min to prevent subscriber leaks in serverless
  const safetyTimeout = setTimeout(() => {
    clearInterval(keepAlive);
    unsubscribe();
    res.end();
  }, 30 * 60 * 1000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clearTimeout(safetyTimeout);
    unsubscribe();
  });
}
