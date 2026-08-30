import { query } from './db-pool';
import { generateDealPDF } from './pdf-generator';
import { uploadDealPDF } from './render-storage';
import { logger } from './logger';

/**
 * Auto-generate and auto-download deal completion PDF for both parties
 * Called when deal reaches "completed" status
 */
export async function handleDealCompletion(dealId: string): Promise<{
  success: boolean;
  pdfFileName?: string;
  brandEmail?: string;
  creatorEmail?: string;
  downloadUrl?: string;
}> {
  try {
    logger.info('Handling deal completion', { dealId });

    // Fetch deal details
    const dealResult = await query(
      `SELECT d.*, u1.display_name as creator_name, u1.email as creator_email, u2.display_name as brand_name, u2.email as brand_email
       FROM deals d
       LEFT JOIN users u1 ON d.creator_id = u1.id
       LEFT JOIN users u2 ON d.brand_id = u2.id
       WHERE d.id = $1`,
      [dealId]
    );

    if (dealResult.rows.length === 0) {
      logger.error('Deal not found for completion handler', { dealId });
      return { success: false };
    }

    const deal = dealResult.rows[0];

    // Fetch messages
    const messagesResult = await query(
      `SELECT dm.*, u.display_name as sender_name
       FROM deal_messages dm
       JOIN users u ON dm.sender_id = u.id
       WHERE dm.deal_id = $1
       ORDER BY dm.created_at ASC`,
      [dealId]
    );
    const messages = messagesResult.rows || [];

    // Fetch deliverables
    const deliverablesResult = await query(
      `SELECT * FROM deliverables
       WHERE deal_id = $1
       ORDER BY created_at ASC`,
      [dealId]
    );
    const deliverables = deliverablesResult.rows || [];

    // Fetch invoices
    let invoices: any[] = [];
    try {
      const invoicesResult = await query(
        `SELECT
          invoice_number,
          invoice_type,
          invoice_date,
          payment_status,
          payment_date,
          line_items,
          subtotal,
          total_gst,
          total_amount
         FROM invoices
         WHERE deal_id = $1
         ORDER BY created_at ASC`,
        [dealId]
      );

      invoices = (invoicesResult.rows || []).map(row => ({
        invoiceNumber: row.invoice_number,
        invoiceType: row.invoice_type,
        invoiceDate: row.invoice_date,
        paymentStatus: row.payment_status,
        paymentDate: row.payment_date,
        lineItems: row.line_items,
        subtotal: row.subtotal,
        totalGST: row.total_gst,
        totalAmount: row.total_amount,
      }));
    } catch (invoiceError) {
      logger.warn('Could not fetch invoices during completion', invoiceError);
    }

    // Generate PDF with invoices
    const pdfBuffer = await generateDealPDF(deal, messages, deliverables, invoices);

    // Upload to storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `deal-${dealId}-completed-${timestamp}.pdf`;
    const filepath = await uploadDealPDF(dealId, pdfBuffer, fileName);

    logger.info('Deal completion PDF generated', {
      dealId,
      fileName,
      filepath,
      creatorEmail: deal.creator_email,
      brandEmail: deal.brand_email,
    });

    // TODO: Send emails to both parties with PDF attached
    // await emailService.sendDealCompletionPDF(deal.creator_email, pdfBuffer, fileName);
    // await emailService.sendDealCompletionPDF(deal.brand_email, pdfBuffer, fileName);

    // TODO: Store download link in deal record for easy access
    await query(
      `UPDATE deals SET completion_pdf_url = $1, completion_pdf_generated_at = NOW() WHERE id = $2`,
      [filepath, dealId]
    );

    return {
      success: true,
      pdfFileName: fileName,
      brandEmail: deal.brand_email,
      creatorEmail: deal.creator_email,
      downloadUrl: `/api/deals/${dealId}/download-completion-pdf`,
    };
  } catch (error) {
    logger.error('Error handling deal completion', error);
    return { success: false };
  }
}

/**
 * Webhook handler - called when deal transitions to "completed" status
 */
export async function onDealCompleted(dealId: string): Promise<void> {
  try {
    const result = await handleDealCompletion(dealId);

    if (!result.success) {
      throw new Error('Failed to generate completion PDF');
    }

    logger.info('Deal completion workflow triggered', {
      dealId,
      pdfFile: result.pdfFileName,
      brandEmail: result.brandEmail,
      creatorEmail: result.creatorEmail,
    });
  } catch (error) {
    logger.error('Error in deal completion workflow', error);
    // Don't fail the entire completion - PDF generation is secondary
  }
}
