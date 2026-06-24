import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

const ROOM_KEY = 'default';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureTable();

  if (req.method === 'GET') {
    const result = await query(
      'SELECT value FROM shared_state WHERE key = $1',
      [ROOM_KEY]
    );
    if (result.rows.length === 0) {
      return res.status(200).json({
        deals: {},
        campaigns: [],
        messages: {},
        applications: [],
        notifications: [],
      });
    }
    return res.status(200).json(result.rows[0].value);
  }

  if (req.method === 'POST') {
    const { value } = req.body;
    if (!value) return res.status(400).json({ error: 'value is required' });

    // Merge incoming fields with existing state to prevent data loss
    const existing = await query(
      'SELECT value FROM shared_state WHERE key = $1',
      [ROOM_KEY]
    );

    let merged = value;
    if (existing.rows.length > 0) {
      const current = existing.rows[0].value || {};
      merged = {
        deals: { ...(current.deals || {}), ...(value.deals || {}) },
        campaigns: value.campaigns !== undefined
          ? (value.campaigns.length > 0 || !current.campaigns?.length ? value.campaigns : current.campaigns)
          : (current.campaigns ?? []),
        messages: { ...(current.messages || {}), ...(value.messages || {}) },
        applications: value.applications !== undefined
          ? (value.applications.length > 0 || !current.applications?.length ? value.applications : current.applications)
          : (current.applications ?? []),
        notifications: value.notifications !== undefined
          ? (value.notifications.length > 0 || !current.notifications?.length ? value.notifications : current.notifications)
          : (current.notifications ?? []),
      };
    }

    await query(
      `INSERT INTO shared_state (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = $2, updated_at = NOW()`,
      [ROOM_KEY, JSON.stringify(merged)]
    );

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS shared_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
