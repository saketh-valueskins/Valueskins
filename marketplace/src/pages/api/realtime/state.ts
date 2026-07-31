import type { NextApiRequest, NextApiResponse } from 'next';

const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '';

// Helper to make Firebase REST calls
async function firebaseGet(path: string) {
  const url = `${FIREBASE_DB_URL}/${path}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function firebasePut(path: string, data: any) {
  const url = `${FIREBASE_DB_URL}/${path}.json`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.ok;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const emptyState = {
    deals: {},
    campaigns: [],
    messages: {},
    applications: [],
    notifications: [],
  };

  if (req.method === 'GET') {
    try {
      console.log('[API] GET /realtime/state - fetching from Firebase:', FIREBASE_DB_URL);
      const data = await firebaseGet('marketplace/realtime-state');
      console.log('[API] Firebase response:', data ? 'data received' : 'null/empty');

      if (!data) {
        return res.status(200).json(emptyState);
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('[API] Firebase GET error:', error);
      return res.status(200).json(emptyState);
    }
  }

  if (req.method === 'POST') {
    const { value } = req.body;
    if (!value) return res.status(400).json({ error: 'value is required' });

    try {
      console.log('[API] POST /realtime/state - writing to Firebase');
      const success = await firebasePut('marketplace/realtime-state', value);

      if (success) {
        console.log('[API] Firebase write successful');
        return res.status(200).json({ success: true });
      }
      console.error('[API] Firebase write failed');
      return res.status(500).json({ error: 'Failed to write to database' });
    } catch (error) {
      console.error('[API] Firebase POST error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
