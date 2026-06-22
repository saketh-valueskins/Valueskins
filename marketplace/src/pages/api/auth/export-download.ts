import type { NextApiRequest, NextApiResponse } from 'next';
import { queryOne } from '@/lib/db-pool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const row = await queryOne(
      'SELECT compliance_json, history_pdf_base64 FROM pending_deletion_exports WHERE id = $1',
      [token]
    );

    if (!row) {
      return res.status(404).json({ error: 'Export not found or expired' });
    }

    // If compliance_json has actual data (not placeholder), serve JSON
    if (row.compliance_json !== 'before_deletion') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="valueskins-compliance-export.json"`);
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).send(row.compliance_json);
    }

    // Otherwise serve PDF
    const pdfBuffer = Buffer.from(row.history_pdf_base64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="valueskins-account-history.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Export download error:', error);
    return res.status(500).json({ error: 'Failed to serve export' });
  }
}
