import type { NextApiRequest, NextApiResponse } from 'next';
import { fakeBank } from '@/lib/fake-bank';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionToken = req.cookies.valueskins_session;
  if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });
  const sesh = await query(
    'SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()',
    [sessionToken]
  );
  if (!sesh.rows[0]) return res.status(401).json({ error: 'Invalid session' });

  const { action } = req.query;

  try {
    switch (action) {
      case 'ledger': {
        const ledger = fakeBank.getLedger();
        return res.status(200).json({ count: ledger.length, entries: ledger.slice(-50) });
      }
      case 'balance': {
        const balance = fakeBank.getBalance();
        return res.status(200).json(balance);
      }
      case 'orders': {
        return res.status(200).json({ message: 'Orders accessible via fakeBank internals' });
      }
      default: {
        const balance = fakeBank.getBalance();
        const ledger = fakeBank.getLedger();
        return res.status(200).json({
          status: 'running',
          mode: 'simulation',
          balance,
          recentActivity: ledger.slice(-10),
        });
      }
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
