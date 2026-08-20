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

export async function generateDealPDF(
  deal: DealData,
  messages: ChatMessage[],
  deliverables: Deliverable[]
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
