import type { NextApiRequest, NextApiResponse } from 'next';
import { InvoiceService } from '@/lib/invoice/invoice-service';
import { InvoiceGenerator } from '@/lib/invoice/invoice-generator';

/**
 * GET /api/invoices/[invoiceId]/download
 * Download invoice as HTML or PDF
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { invoiceId } = req.query;
    const { format = 'html' } = req.query;

    if (!invoiceId || typeof invoiceId !== 'string') {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    const invoice = await InvoiceService.getInvoice(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // TODO: Verify user has permission to download this invoice

    // Generate HTML
    const html = InvoiceGenerator.generateHTML(invoice);

    if (format === 'pdf') {
      // TODO: Convert HTML to PDF using headless browser (puppeteer/playwright)
      // For now, return HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.html"`);
      return res.status(200).send(html);
    } else {
      // Return as HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.html"`);
      return res.status(200).send(html);
    }
  } catch (error: any) {
    console.error('Error downloading invoice:', error);
    return res.status(500).json({
      error: 'Failed to download invoice',
      details: error.message,
    });
  }
}
