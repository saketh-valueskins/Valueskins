import { NextApiRequest, NextApiResponse } from 'next';
import { downloadDealPDF } from '@/lib/firebase-storage';
import { getSessionUserId } from '@/lib/session';
import { query } from '@/lib/db-pool';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path } = req.query;

    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'PDF path required' });
    }

    // Get current user
    const userId = await getSessionUserId(req.headers.cookie || '');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract dealId from path (format: deals/{dealId}/pdfs/{filename})
    const pathParts = path.split('/');
    const dealId = pathParts[1];

    if (!dealId) {
      return res.status(400).json({ error: 'Invalid PDF path' });
    }

    // Verify user is deal participant
    const dealResult = await query(
      `SELECT creator_id, brand_id FROM deals WHERE id = $1`,
      [dealId]
    );

    if (dealResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const deal = dealResult.rows[0];
    if (deal.creator_id !== userId && deal.brand_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized: not deal participant' });
    }

    // Download PDF from Firebase
    const pdfBuffer = await downloadDealPDF(path);

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pathParts[pathParts.length - 1]}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.end(pdfBuffer);
  } catch (error: any) {
    console.error('Error downloading PDF:', error);
    return res.status(500).json({ error: error.message || 'Failed to download PDF' });
  }
}
