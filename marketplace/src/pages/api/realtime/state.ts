import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';

const EMPTY_STATE = {
  deals: {},
  campaigns: [],
  messages: {},
  applications: [],
  notifications: [],
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(200).json(EMPTY_STATE);
  }

  if (req.method === 'GET') {
    try {
      const { data } = await supabase
        .from('shared_state')
        .select('state')
        .eq('id', 'main')
        .maybeSingle();

      const s = data?.state || {};
      return res.status(200).json({
        deals: s.deals || {},
        campaigns: Array.isArray(s.campaigns) ? s.campaigns : Object.values(s.campaigns || {}),
        messages: s.messages || {},
        applications: Array.isArray(s.applications) ? s.applications : Object.values(s.applications || {}),
        notifications: Array.isArray(s.notifications) ? s.notifications : Object.values(s.notifications || {}),
      });
    } catch (error) {
      console.error('[API] shared_state GET error:', error);
      return res.status(200).json(EMPTY_STATE);
    }
  }

  if (req.method === 'POST') {
    const { value } = req.body;
    if (!value) return res.status(400).json({ error: 'value is required' });

    try {
      // Merge each top-level key granularly — never replace the whole row, so
      // concurrent device writes can't clobber each other.
      const ops: Promise<unknown>[] = [];
      for (const [path, v] of Object.entries(value as Record<string, unknown>)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
            ops.push(supabase.rpc('upsert_shared_state_path', { path, key: String(k), value: val }));
          }
        } else if (Array.isArray(v)) {
          for (const item of v) {
            if (item && typeof item === 'object' && (item as any).id !== undefined) {
              ops.push(supabase.rpc('upsert_shared_state_path', { path, key: String((item as any).id), value: item }));
            }
          }
        }
      }
      await Promise.all(ops);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[API] shared_state POST error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
