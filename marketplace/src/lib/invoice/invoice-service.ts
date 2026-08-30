import { InvoiceGenerator } from './invoice-generator';
import type { Invoice, CreateInvoiceRequest, InvoiceSummaryReport } from './types';
import { logger } from '../logger';

export class InvoiceService {
  /**
   * Create a new invoice
   */
  static async createInvoice(req: CreateInvoiceRequest): Promise<Invoice> {
    const invoiceId = `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const invoiceNumber = InvoiceGenerator.generateInvoiceNumber(invoiceId);

    // Calculate GST for each line item
    const lineItems = req.lineItems.map(item => ({
      ...item,
      gstAmount: InvoiceGenerator.calculateGST(item.amount, item.gstRate),
      totalAmount: item.amount + InvoiceGenerator.calculateGST(item.amount, item.gstRate),
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const totalGST = lineItems.reduce((sum, item) => sum + item.gstAmount, 0);
    const totalAmount = subtotal + totalGST;

    const invoice: Invoice = {
      id: invoiceId,
      dealId: req.dealId,
      invoiceNumber,
      invoiceDate: new Date().toISOString(),
      invoiceType: req.invoiceType,
      recipient: req.recipient,
      brandId: req.brandId,
      brandName: req.brandName,
      brandEmail: req.brandEmail,
      brandAddress: req.brandName, // TODO: fetch from user profile
      brandGSTIN: req.brandGSTIN,
      creatorId: req.creatorId,
      creatorName: req.creatorName,
      creatorEmail: req.creatorEmail,
      creatorAddress: req.creatorName, // TODO: fetch from user profile
      creatorGSTIN: req.creatorGSTIN,
      lineItems,
      subtotal,
      totalGST,
      totalAmount,
      razorpayOrderId: req.razorpayOrderId,
      razorpayPaymentId: req.razorpayPaymentId,
      paymentStatus: 'pending',
      notes: req.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in database
    await this.saveInvoice(invoice);

    // Log audit trail
    await this.logAudit(invoiceId, 'created', {
      dealId: req.dealId,
      invoiceType: req.invoiceType,
      totalAmount: totalAmount,
    });

    logger.info('Invoice created', {
      invoiceId,
      invoiceNumber,
      dealId: req.dealId,
      totalAmount: totalAmount,
    });

    return invoice;
  }

  /**
   * Get invoice by ID
   */
  static async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      // Query database
      const query = `SELECT * FROM invoices WHERE id = $1`;
      const result = await this.query(query, [invoiceId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.rowToInvoice(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching invoice', error);
      return null;
    }
  }

  /**
   * Get invoices for a deal
   */
  static async getInvoicesByDeal(dealId: string): Promise<Invoice[]> {
    try {
      const query = `SELECT * FROM invoices WHERE deal_id = $1 ORDER BY created_at DESC`;
      const result = await this.query(query, [dealId]);

      return result.rows.map(row => this.rowToInvoice(row));
    } catch (error) {
      logger.error('Error fetching deal invoices', error);
      return [];
    }
  }

  /**
   * Get invoices for a user (brand or creator)
   */
  static async getInvoicesByUser(userId: string, userType: 'brand' | 'creator'): Promise<Invoice[]> {
    try {
      const column = userType === 'brand' ? 'brand_id' : 'creator_id';
      const query = `SELECT * FROM invoices WHERE ${column} = $1 ORDER BY created_at DESC`;
      const result = await this.query(query, [userId]);

      return result.rows.map(row => this.rowToInvoice(row));
    } catch (error) {
      logger.error('Error fetching user invoices', error);
      return [];
    }
  }

  /**
   * Update invoice payment status
   */
  static async updatePaymentStatus(
    invoiceId: string,
    status: 'pending' | 'completed' | 'failed',
    razorpayPaymentId?: string
  ): Promise<boolean> {
    try {
      const query = `
        UPDATE invoices
        SET payment_status = $1,
            razorpay_payment_id = $2,
            payment_date = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE payment_date END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `;

      await this.query(query, [status, razorpayPaymentId, invoiceId]);

      await this.logAudit(invoiceId, 'payment_status_updated', {
        status,
        razorpayPaymentId,
      });

      logger.info('Invoice payment status updated', { invoiceId, status });
      return true;
    } catch (error) {
      logger.error('Error updating invoice payment status', error);
      return false;
    }
  }

  /**
   * Generate summary report for tax compliance
   */
  static async generateTaxReport(startDate: Date, endDate: Date): Promise<InvoiceSummaryReport> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_invoices,
          SUM(subtotal) as total_amount,
          SUM(total_gst) as total_gst_collected,
          invoice_type,
          recipient
        FROM invoices
        WHERE payment_status = 'completed'
          AND created_at BETWEEN $1 AND $2
        GROUP BY invoice_type, recipient
      `;

      const result = await this.query(query, [startDate, endDate]);

      // Aggregate results
      let totalInvoices = 0;
      let totalAmount = 0;
      let totalGSTCollected = 0;
      const invoicesByType: Record<string, number> = {};
      const invoicesByRecipient: Record<string, number> = {};

      result.rows.forEach(row => {
        totalInvoices += parseInt(row.total_invoices);
        totalAmount += parseInt(row.total_amount || 0);
        totalGSTCollected += parseInt(row.total_gst || 0);

        invoicesByType[row.invoice_type] = (invoicesByType[row.invoice_type] || 0) + parseInt(row.total_invoices);
        invoicesByRecipient[row.recipient] = (invoicesByRecipient[row.recipient] || 0) + parseInt(row.total_invoices);
      });

      // Razorpay fees GST (approximate - 2% + 18% GST on 2% = 0.36% of total amount)
      const estimatedRazorpayFees = Math.round(totalAmount * 0.02);
      const totalGSTPaid = Math.round(estimatedRazorpayFees * 0.18);

      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        totalInvoices,
        totalAmount,
        totalGSTCollected,
        totalGSTPaid,
        netGSTLiability: totalGSTCollected - totalGSTPaid,
        invoicesByType: invoicesByType as any,
        invoicesByRecipient: invoicesByRecipient as any,
      };
    } catch (error) {
      logger.error('Error generating tax report', error);
      return {
        period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        totalInvoices: 0,
        totalAmount: 0,
        totalGSTCollected: 0,
        totalGSTPaid: 0,
        netGSTLiability: 0,
        invoicesByType: {},
        invoicesByRecipient: {},
      };
    }
  }

  // Private helpers

  private static async saveInvoice(invoice: Invoice): Promise<void> {
    const query = `
      INSERT INTO invoices (
        id, deal_id, invoice_number, invoice_date, invoice_type, recipient,
        brand_id, brand_name, brand_email, brand_address, brand_gstin,
        creator_id, creator_name, creator_email, creator_address, creator_gstin,
        subtotal, total_gst, total_amount,
        razorpay_order_id, razorpay_payment_id, payment_status,
        line_items, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    `;

    await this.query(query, [
      invoice.id,
      invoice.dealId,
      invoice.invoiceNumber,
      invoice.invoiceDate,
      invoice.invoiceType,
      invoice.recipient,
      invoice.brandId,
      invoice.brandName,
      invoice.brandEmail,
      invoice.brandAddress,
      invoice.brandGSTIN,
      invoice.creatorId,
      invoice.creatorName,
      invoice.creatorEmail,
      invoice.creatorAddress,
      invoice.creatorGSTIN,
      invoice.subtotal,
      invoice.totalGST,
      invoice.totalAmount,
      invoice.razorpayOrderId,
      invoice.razorpayPaymentId,
      invoice.paymentStatus,
      JSON.stringify(invoice.lineItems),
      invoice.notes,
      invoice.createdAt,
      invoice.updatedAt,
    ]);
  }

  private static async logAudit(invoiceId: string, action: string, details: any): Promise<void> {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const query = `
      INSERT INTO invoice_audit_log (id, invoice_id, action, details, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `;

    try {
      await this.query(query, [auditId, invoiceId, action, JSON.stringify(details)]);
    } catch (error) {
      logger.error('Error logging invoice audit', error);
    }
  }

  private static rowToInvoice(row: any): Invoice {
    return {
      id: row.id,
      dealId: row.deal_id,
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date,
      invoiceType: row.invoice_type,
      recipient: row.recipient,
      brandId: row.brand_id,
      brandName: row.brand_name,
      brandEmail: row.brand_email,
      brandAddress: row.brand_address,
      brandGSTIN: row.brand_gstin,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      creatorEmail: row.creator_email,
      creatorAddress: row.creator_address,
      creatorGSTIN: row.creator_gstin,
      lineItems: row.line_items,
      subtotal: row.subtotal,
      totalGST: row.total_gst,
      totalAmount: row.total_amount,
      razorpayOrderId: row.razorpay_order_id,
      razorpayPaymentId: row.razorpay_payment_id,
      paymentStatus: row.payment_status,
      pdfUrl: row.pdf_url,
      pdfStorageKey: row.pdf_storage_key,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // TODO: Replace with actual database query method
  private static async query(sql: string, params: any[]): Promise<any> {
    // This would connect to actual database
    // For now, return mock response
    return { rows: [] };
  }
}
