import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';

// Server-side draft storage — ui-specs/phase-2/_global-provisions.md GP2.
//
// GP2 has two parts. Part 1 (a durable session) was fixed in P2-F1. Part 2 is
// this: drafts must survive the session ending, so a re-login never costs the
// user an in-flight campaign, deal or profile edit. localStorage alone does not
// satisfy that — it is per-browser and vanishes on a different device.
//
// Auth is the real session (getSessionUserId), not the x-user-id header that
// the older onboarding-draft route trusts — a header is caller-controlled and
// would let anyone read anyone's draft.

const ALLOWED_KINDS = ['campaign', 'deal', 'profile'] as const;
type Kind = (typeof ALLOWED_KINDS)[number];

const MAX_BYTES = 128 * 1024; // a draft is a form, not an upload

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getSessionUserId(req.headers.cookie || '');
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const raw = req.query.kind;
  const kind = (Array.isArray(raw) ? raw[0] : raw) as Kind;
  if (!ALLOWED_KINDS.includes(kind)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const key = `draft_${kind}_${userId}`;

  try {
    if (req.method === 'GET') {
      const result = await query('SELECT value FROM cache WHERE key = $1 AND expires_at > NOW()', [key]);
      if (!result.rows.length) return res.status(204).end();
      return res.status(200).json(JSON.parse(result.rows[0].value));
    }

    if (req.method === 'PUT') {
      const body = req.body && typeof req.body === 'object' ? req.body : null;
      if (!body) return res.status(400).json({ error: 'Invalid request' });

      const payload = JSON.stringify({ data: body, savedAt: new Date().toISOString() });
      if (Buffer.byteLength(payload, 'utf8') > MAX_BYTES) {
        return res.status(413).json({ error: 'Draft too large' });
      }

      await query(
        `INSERT INTO cache (key, value, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days')
         ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = NOW() + INTERVAL '30 days'`,
        [key, payload]
      );
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await query('DELETE FROM cache WHERE key = $1', [key]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch {
    // A draft is convenience, never the source of truth — degrade to the
    // client's local copy rather than blocking the user's work.
    return res.status(200).json({ ok: false });
  }
}
