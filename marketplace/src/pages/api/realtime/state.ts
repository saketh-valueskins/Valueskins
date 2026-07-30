import type { NextApiRequest, NextApiResponse } from 'next';

const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const firebaseRes = await fetch(`${FIREBASE_DB_URL}/realtime-state.json`);
      if (!firebaseRes.ok) {
        return res.status(200).json({
          deals: {},
          campaigns: [],
          messages: {},
          applications: [],
          notifications: [],
        });
      }
      const data = await firebaseRes.json();
      return res.status(200).json(data || {
        deals: {},
        campaigns: [],
        messages: {},
        applications: [],
        notifications: [],
      });
    } catch (error) {
      return res.status(200).json({
        deals: {},
        campaigns: [],
        messages: {},
        applications: [],
        notifications: [],
      });
    }
  }

  if (req.method === 'POST') {
    const { value } = req.body;
    if (!value) return res.status(400).json({ error: 'value is required' });

    try {
      // Write directly to Firebase Realtime Database
      const firebaseRes = await fetch(`${FIREBASE_DB_URL}/realtime-state.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });

      if (firebaseRes.ok) {
        return res.status(200).json({ success: true });
      }
      return res.status(500).json({ error: 'Failed to write to database' });
    } catch (error) {
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
