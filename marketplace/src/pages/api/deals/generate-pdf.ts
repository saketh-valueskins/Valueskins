import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db-pool';
import { generateDealPDF } from '@/lib/pdf-generator';
import { uploadDealPDF, getDealPDFVersions } from '@/lib/firebase-storage';
import { getSessionUserId } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dealId, action } = req.body;

    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID required' });
    }

    // Get current user
    const userId = await getSessionUserId(req.headers.cookie || '');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Action: list PDF versions
    if (action === 'list-versions') {
      const versions = await getDealPDFVersions(dealId);
      return res.status(200).json({ success: true, versions });
    }

    // Action: generate new PDF
    if (action === 'generate') {
      // Fetch deal details
      const dealResult = await query(
        `SELECT d.*, u1.display_name as creator_name, u2.display_name as brand_name
         FROM deals d
         LEFT JOIN users u1 ON d.creator_id = u1.id
         LEFT JOIN users u2 ON d.brand_id = u2.id
         WHERE d.id = $1`,
        [dealId]
      );

      if (dealResult.rows.length === 0) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const deal = dealResult.rows[0];

      // Check if user is creator or brand
      if (deal.creator_id !== userId && deal.brand_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized: not deal participant' });
      }

      // Check deal phase (only allow in in_progress, review, or completed)
      if (!['in_progress', 'review', 'completed'].includes(deal.phase)) {
        return res.status(400).json({ error: `Cannot generate PDF in ${deal.phase} phase` });
      }

      // Fetch all messages for this deal
      const messagesResult = await query(
        `SELECT dm.*, u.display_name as sender_name
         FROM deal_messages dm
         JOIN users u ON dm.sender_id = u.id
         WHERE dm.deal_id = $1
         ORDER BY dm.created_at ASC`,
        [dealId]
      );

      const messages = messagesResult.rows || [];

      // Fetch all deliverables
      const deliverablesResult = await query(
        `SELECT * FROM deliverables
         WHERE deal_id = $1
         ORDER BY created_at ASC`,
        [dealId]
      );

      const deliverables = deliverablesResult.rows || [];

      // Generate PDF
      const pdfBuffer = await generateDealPDF(deal, messages, deliverables);

      // Upload to Firebase
      const filepath = await uploadDealPDF(dealId, pdfBuffer);

      // Get all versions
      const versions = await getDealPDFVersions(dealId);

      // Return PDF as download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="deal-${dealId}-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.end(pdfBuffer);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  }
}
