import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getAccountId } from '@/lib/session';

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await query('ALTER TABLE deals ADD COLUMN IF NOT EXISTS exclusive BOOLEAN DEFAULT FALSE');
  await query('ALTER TABLE deals ADD COLUMN IF NOT EXISTS exclusivity_days INTEGER DEFAULT 0');
  schemaReady = true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accountId = await getAccountId(req.headers.cookie || '');
  if (!accountId) return res.status(401).json({ error: 'Unauthorized' });

  await ensureSchema();

  const dealId = parseInt(req.query.dealId as string || req.body?.deal_id || '');
  if (!dealId) return res.status(400).json({ error: 'dealId required' });

  const deal = await query('SELECT * FROM deals WHERE id = $1', [dealId]);
  if (!deal.rows[0]) return res.status(404).json({ error: 'Deal not found' });

  const isBrand = Number(deal.rows[0].brand_id) === accountId;

  if (req.method === 'GET') {
    return res.json({
      exclusive: !!deal.rows[0].exclusive,
      exclusivity_days: deal.rows[0].exclusivity_days || 0,
      isBrand,
    });
  }

  if (req.method === 'POST') {
    if (!isBrand) return res.status(403).json({ error: 'Only the brand can toggle exclusivity' });
    const { exclusive, exclusivity_days } = req.body;
    if (typeof exclusive !== 'boolean') return res.status(400).json({ error: 'exclusive boolean required' });

    const days = Math.min(Math.max(parseInt(exclusivity_days) || 30, 1), 365);

    await query(
      'UPDATE deals SET exclusive = $1, exclusivity_days = $2 WHERE id = $3',
      [exclusive, exclusive ? days : 0, dealId]
    );

    return res.json({ exclusive, exclusivity_days: exclusive ? days : 0 });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
