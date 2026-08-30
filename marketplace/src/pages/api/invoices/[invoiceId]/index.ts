import type { NextApiRequest, NextApiResponse } from 'next';
import { InvoiceService } from '@/lib/invoice/invoice-service';

/**
 * GET /api/invoices/[invoiceId]
 * Retrieve invoice details
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { invoiceId } = req.query;

    if (!invoiceId || typeof invoiceId !== 'string') {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    const invoice = await InvoiceService.getInvoice(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // TODO: Verify user has permission to view this invoice

    return res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({
      error: 'Failed to fetch invoice',
      details: error.message,
    });
  }
}
