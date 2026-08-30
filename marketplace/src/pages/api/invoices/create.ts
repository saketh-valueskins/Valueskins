import type { NextApiRequest, NextApiResponse } from 'next';
import { InvoiceService } from '@/lib/invoice/invoice-service';
import { InvoiceGenerator } from '@/lib/invoice/invoice-generator';
import type { CreateInvoiceRequest } from '@/lib/invoice/types';

/**
 * POST /api/invoices/create
 * Create a new GST invoice for a transaction
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const invoiceReq: CreateInvoiceRequest = req.body;

    // Validate required fields
    if (!invoiceReq.dealId || !invoiceReq.brandId || !invoiceReq.creatorId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create invoice
    const invoice = await InvoiceService.createInvoice(invoiceReq);

    // Generate HTML
    const html = InvoiceGenerator.generateHTML(invoice);

    // TODO: Convert HTML to PDF and store in S3
    // For now, return HTML and invoice data
    invoice.pdfUrl = `/api/invoices/${invoice.id}/pdf`;

    return res.status(201).json({
      success: true,
      invoice,
      downloadUrl: `/api/invoices/${invoice.id}/download`,
    });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({
      error: 'Failed to create invoice',
      details: error.message,
    });
  }
}
