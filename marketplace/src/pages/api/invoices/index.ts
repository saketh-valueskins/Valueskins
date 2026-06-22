import { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';

function getUserId(req: NextApiRequest): Promise<any> {
  const sessionToken = req.cookies.valueskins_session;
  return queryOne('SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()', [sessionToken || '']);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getUserId(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user_id;

  if (req.method === 'POST') {
    const { deal_id, phase, phase_number, amount, from_id, to_id } = req.body;
    if (!deal_id || !phase || !amount || !from_id || !to_id) {
      return res.status(400).json({ error: 'deal_id, phase, amount, from_id, to_id required' });
    }

    try {
      const count = await queryOne('SELECT COUNT(*) as c FROM invoices WHERE deal_id = $1', [deal_id]);
      const invoiceNum = parseInt(count?.c || '0') + 1;
      const invoiceNumber = `INV-${deal_id.slice(-6)}-${invoiceNum}`;

      const invoice = await queryOne(
        `INSERT INTO invoices (deal_id, invoice_number, phase, phase_number, amount, from_id, to_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
        [deal_id, invoiceNumber, phase, phase_number || 1, amount, from_id, to_id]
      );

      return res.status(200).json({ invoice });
    } catch (e) { return res.status(500).json({ error: 'Failed to generate invoice' }); }
  }

  if (req.method === 'GET') {
    const { deal_id } = req.query;
    if (!deal_id) return res.status(400).json({ error: 'deal_id required' });

    try {
      const result = await query(
        'SELECT * FROM invoices WHERE deal_id = $1 ORDER BY phase_number ASC',
        [deal_id]
      );
      return res.status(200).json({ invoices: result.rows });
    } catch { return res.status(500).json({ error: 'Failed to fetch invoices' }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
