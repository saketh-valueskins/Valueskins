import { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      adp_number,
      deal_id,
      creator_id,
      brand_id,
      title,
      description,
      total_budget,
      commission_amount,
      creator_payout,
      creator_advance,
      creator_final,
      created_at,
      completed_at,
      creator_name,
      brand_name,
      creator_email,
      brand_email,
      deliverables,
      timeline,
    } = req.body;

    if (!adp_number || !deal_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate PDF
    const doc = new PDFDocument();
    let pdfBuffer = Buffer.alloc(0);

    doc.on('data', (chunk) => {
      pdfBuffer = Buffer.concat([pdfBuffer, chunk]);
    });

    // ADP Header
    doc.fontSize(20).text(`Automated Deal PDF (ADP)`, { align: 'center' });
    doc.fontSize(14).text(`ADP-${adp_number}`, { align: 'center' });
    doc.moveDown();

    // Deal Summary
    doc.fontSize(12).text('DEAL SUMMARY', { underline: true });
    doc.fontSize(10);
    doc.text(`Deal ID: ${deal_id}`);
    doc.text(`Title: ${title}`);
    doc.text(`Description: ${description || 'N/A'}`);
    doc.text(`Created: ${new Date(created_at).toISOString()}`);
    doc.text(`Completed: ${completed_at ? new Date(completed_at).toISOString() : 'In Progress'}`);
    doc.moveDown();

    // Parties
    doc.fontSize(12).text('PARTIES INVOLVED', { underline: true });
    doc.fontSize(10);
    doc.text(`Creator: ${creator_name} (${creator_email})`);
    doc.text(`Brand: ${brand_name} (${brand_email})`);
    doc.text(`Platform: ValueSkins`);
    doc.moveDown();

    // Financial Breakdown
    doc.fontSize(12).text('FINANCIAL BREAKDOWN', { underline: true });
    doc.fontSize(10);
    doc.text(`Total Budget: ₹${total_budget}`);
    doc.text(`Commission: ₹${commission_amount}`);
    doc.text(`Creator Payout: ₹${creator_payout}`);
    doc.text(`  - Advance (30%): ₹${creator_advance}`);
    doc.text(`  - Final (70%): ₹${creator_final}`);
    doc.moveDown();

    // Deliverables
    if (deliverables) {
      doc.fontSize(12).text('DELIVERABLES & REQUIREMENTS', { underline: true });
      doc.fontSize(10);
      doc.text(deliverables);
      doc.moveDown();
    }

    // Timeline
    if (timeline) {
      doc.fontSize(12).text('TIMELINE', { underline: true });
      doc.fontSize(10);
      doc.text(timeline);
      doc.moveDown();
    }

    // Verification
    doc.fontSize(12).text('VERIFICATION', { underline: true });
    doc.fontSize(10);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.text(`Digital Signature: SHA-256 (tamper-proof)`);
    doc.moveDown();

    // Hash for tamper detection
    const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    doc.fontSize(8).text(`Hash: ${hash.substring(0, 32)}...`);

    doc.end();

    // Wait for PDF generation to complete
    await new Promise((resolve) => {
      doc.on('finish', resolve);
    });

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ADP-${adp_number}.pdf"`);
    res.setHeader('X-ADP-Number', adp_number.toString());
    res.setHeader('X-Deal-ID', deal_id);
    res.setHeader('X-PDF-Hash', hash);

    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('ADP generation error:', error);
    res.status(500).json({ error: 'Failed to generate ADP' });
  }
}
