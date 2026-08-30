import type { NextApiRequest, NextApiResponse } from 'next';
import { InvoiceService } from '@/lib/invoice/invoice-service';

/**
 * GET /api/invoices/deal/[dealId]
 * Get all invoices for a deal
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

    const invoices = await InvoiceService.getInvoicesByDeal(dealId);

    return res.status(200).json({
      success: true,
      invoices,
      count: invoices.length,
    });
  } catch (error: any) {
    console.error('Error fetching deal invoices:', error);
    return res.status(500).json({
      error: 'Failed to fetch invoices',
      details: error.message,
    });
  }
}
