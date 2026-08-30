import PDFDocument from 'pdfkit';

interface DealData {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  phase: string;
  created_at: string;
  timeline_days?: number;
  creator_id: string;
  creator_name?: string;
  brand_id: string;
  brand_name?: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
  type: 'text' | 'file' | 'deliverable';
}

interface Deliverable {
  id: string;
  title: string;
  description: string;
  submitted_by: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  files?: string[];
}

interface InvoiceLineItem {
  description: string;
  amount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

interface PaymentInvoice {
  invoiceNumber: string;
  invoiceType: 'stage1_commission' | 'stage2_advance' | 'stage3_remainder';
  invoiceDate: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentDate?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  totalGST: number;
  totalAmount: number;
}

export async function generateDealPDF(
  deal: DealData,
  messages: ChatMessage[],
  deliverables: Deliverable[],
  invoices?: PaymentInvoice[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('ValueSkins Deal Agreement', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Proof of Work & Communication', { align: 'center' });
      doc.moveDown(0.5);

      // Generated timestamp
      doc.fontSize(9).font('Helvetica-Oblique').text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown(1);

      // Deal Details Section
      doc.fontSize(14).font('Helvetica-Bold').text('Deal Details', { underline: true });
      doc.moveDown(0.3);

      const dealDetails = [
        [`Deal ID:`, deal.id],
        [`Title:`, deal.title],
        [`Amount:`, `${deal.currency} ${deal.amount.toLocaleString()}`],
        [`Status:`, deal.phase.toUpperCase()],
        [`Creator:`, deal.creator_name || 'N/A'],
        [`Brand:`, deal.brand_name || 'N/A'],
        [`Created:`, new Date(deal.created_at).toLocaleDateString()],
        [`Timeline:`, deal.timeline_days ? `${deal.timeline_days} days` : 'N/A'],
      ];

      dealDetails.forEach(([key, value]) => {
        doc.fontSize(10).font('Helvetica-Bold').text(key, { continued: true });
        doc.font('Helvetica').text(` ${value}`);
      });

      doc.moveDown(1);

      // Deal Description
      if (deal.description) {
        doc.fontSize(12).font('Helvetica-Bold').text('Scope of Work', { underline: true });
        doc.moveDown(0.2);
        doc.fontSize(10).font('Helvetica').text(deal.description, { align: 'left' });
        doc.moveDown(1);
      }

      // Deliverables Section
      if (deliverables.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Deliverables', { underline: true });
        doc.moveDown(0.3);

        deliverables.forEach((deliverable, index) => {
          doc.fontSize(10).font('Helvetica-Bold').text(`${index + 1}. ${deliverable.title}`);
          doc.fontSize(9).font('Helvetica').text(`Status: ${deliverable.status.toUpperCase()}`);
          doc.fontSize(9).font('Helvetica').text(`Submitted: ${new Date(deliverable.submitted_at).toLocaleString()}`);
          if (deliverable.description) {
            doc.fontSize(9).font('Helvetica').text(`Description: ${deliverable.description}`);
          }
          if (deliverable.files && deliverable.files.length > 0) {
            doc.fontSize(9).font('Helvetica').text(`Files: ${deliverable.files.join(', ')}`);
          }
          doc.moveDown(0.3);
        });

        doc.moveDown(0.5);
      }

      // GST Invoices Section
      if (invoices && invoices.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Payment & GST Invoices', { underline: true });
        doc.moveDown(0.3);

        invoices.forEach((invoice, index) => {
          const invoiceTypeLabel: Record<string, string> = {
            stage1_commission: 'Stage 1: Commission to ValueSkins',
            stage2_advance: 'Stage 2: Advance to Creator',
            stage3_remainder: 'Stage 3: Final Payment to Creator',
          };

          doc.fontSize(10).font('Helvetica-Bold').text(`Invoice ${index + 1}: ${invoiceTypeLabel[invoice.invoiceType]}`);
          doc.fontSize(9).font('Helvetica').text(`Invoice #: ${invoice.invoiceNumber}`);
          doc.fontSize(9).font('Helvetica').text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`);
          doc.fontSize(9).font('Helvetica').text(`Status: ${invoice.paymentStatus === 'completed' ? '✓ PAID' : invoice.paymentStatus.toUpperCase()}`);

          if (invoice.paymentDate) {
            doc.fontSize(9).font('Helvetica').text(`Paid: ${new Date(invoice.paymentDate).toLocaleDateString()}`);
          }

          // Line items table
          doc.moveDown(0.2);
          doc.fontSize(8).font('Helvetica-Bold').text('Description', { continued: true, width: 250 });
          doc.text('Amount', { continued: true, width: 80 });
          doc.text('GST', { continued: true, width: 80 });
          doc.text('Total', { width: 100 });

          invoice.lineItems.forEach((item) => {
            const amountInRupees = (paise: number) => (paise / 100).toFixed(2);
            doc.fontSize(8).font('Helvetica').text(item.description.substring(0, 30), { continued: true, width: 250 });
            doc.text(`₹${amountInRupees(item.amount)}`, { continued: true, width: 80 });
            doc.text(`₹${amountInRupees(item.gstAmount)}`, { continued: true, width: 80 });
            doc.text(`₹${amountInRupees(item.totalAmount)}`, { width: 100 });
          });

          // Totals
          const amountInRupees = (paise: number) => (paise / 100).toFixed(2);
          doc.fontSize(8).font('Helvetica-Bold').text('TOTAL', { continued: true, width: 250 });
          doc.text(`₹${amountInRupees(invoice.subtotal)}`, { continued: true, width: 80 });
          doc.text(`₹${amountInRupees(invoice.totalGST)} (18%)`, { continued: true, width: 80 });
          doc.text(`₹${amountInRupees(invoice.totalAmount)}`, { width: 100 });

          doc.moveDown(0.5);
        });

        // Summary
        const totalAllInvoices = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalGSTAllInvoices = invoices.reduce((sum, inv) => sum + inv.totalGST, 0);
        const amountInRupees = (paise: number) => (paise / 100).toFixed(2);

        doc.fontSize(10).font('Helvetica-Bold').text('Total Payment Summary');
        doc.fontSize(9).font('Helvetica').text(`Total GST Collected: ₹${amountInRupees(totalGSTAllInvoices)}`);
        doc.fontSize(9).font('Helvetica').text(`Total Amount (with GST): ₹${amountInRupees(totalAllInvoices)}`);
        doc.moveDown(1);
      }

      // Chat Messages Section
      if (messages.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Communication History', { underline: true });
        doc.moveDown(0.3);

        messages.forEach((msg) => {
          const timestamp = new Date(msg.created_at).toLocaleString();
          doc.fontSize(9).font('Helvetica-Bold').text(`${msg.sender_name} [${timestamp}]`);
          doc.fontSize(9).font('Helvetica').text(msg.message, { align: 'left' });
          doc.moveDown(0.2);
        });

        doc.moveDown(1);
      }

      // Footer
      doc.fontSize(8).font('Helvetica-Oblique').text('This PDF serves as proof of agreement, deliverables, and communication. All data is timestamped and immutable.', {
        align: 'center',
      });

      doc.fontSize(8).font('Helvetica-Oblique').text('For dispute resolution, download and compare multiple versions of this PDF to track progression.', {
        align: 'center',
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
