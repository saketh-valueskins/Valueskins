import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db-pool';
import { downloadDealPDF } from '@/lib/render-storage';
import { getSessionUserId } from '@/lib/session';

/**
 * GET /api/deals/[dealId]/download-completion-pdf
 * Download the final deal completion PDF with all details and invoices
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dealId } = req.query;

    if (!dealId || typeof dealId !== 'string') {
      return res.status(400).json({ error: 'Invalid deal ID' });
    }

    // Get current user
    const userId = await getSessionUserId(req.headers.cookie || '');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch deal
    const dealResult = await query(
      `SELECT id, creator_id, brand_id, completion_pdf_url, title FROM deals WHERE id = $1`,
      [dealId]
    );

    if (dealResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const deal = dealResult.rows[0];

    // Verify user is brand or creator
    if (deal.creator_id !== userId && deal.brand_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized: not deal participant' });
    }

    // Get PDF file
    if (!deal.completion_pdf_url) {
      return res.status(404).json({
        error: 'Completion PDF not yet generated',
        message: 'The deal completion PDF will be available once the deal is marked as complete',
      });
    }

    // Fetch PDF from storage
    const pdfBlob = await downloadDealPDF(deal.completion_pdf_url);

    if (!pdfBlob) {
      return res.status(404).json({ error: 'PDF file not found in storage' });
    }

    // Convert blob to buffer
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Return PDF
    const fileName = `${deal.title || 'deal'}-completion.pdf`.replace(/[^a-z0-9-]/gi, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    return res.end(pdfBuffer);
  } catch (error: any) {
    console.error('Error downloading completion PDF:', error);
    return res.status(500).json({
      error: 'Failed to download PDF',
      details: error.message,
    });
  }
}
