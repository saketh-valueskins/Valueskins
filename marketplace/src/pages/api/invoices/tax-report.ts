import type { NextApiRequest, NextApiResponse } from 'next';
import { InvoiceService } from '@/lib/invoice/invoice-service';

/**
 * GET /api/invoices/tax-report
 * Generate GST tax report for a date range
 * Query params: startDate (ISO), endDate (ISO)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing date range',
        example: '/api/invoices/tax-report?startDate=2026-01-01&endDate=2026-12-31',
      });
    }

    const start = new Date(String(startDate));
    const end = new Date(String(endDate));

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format (use ISO 8601)' });
    }

    // TODO: Verify user is admin or authorized to view tax reports

    const report = await InvoiceService.generateTaxReport(start, end);

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error generating tax report:', error);
    return res.status(500).json({
      error: 'Failed to generate tax report',
      details: error.message,
    });
  }
}
