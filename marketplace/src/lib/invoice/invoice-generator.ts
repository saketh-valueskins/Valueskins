import type { Invoice } from './types';

export class InvoiceGenerator {
  /**
   * Generate HTML invoice (can be converted to PDF via headless browser)
   */
  static generateHTML(invoice: Invoice): string {
    const amountInRupees = (paise: number) => (paise / 100).toFixed(2);
    const formatCurrency = (paise: number) => `₹${amountInRupees(paise)}`;

    const invoiceTypeLabel: Record<string, string> = {
      stage1_commission: 'Commission Invoice',
      stage2_advance: 'Advance Payment Invoice',
      stage3_remainder: 'Final Payment Invoice',
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px; }
    header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #FF9800; padding-bottom: 20px; }
    .company-info h1 { font-size: 28px; color: #FF9800; margin-bottom: 5px; }
    .company-info p { font-size: 12px; color: #666; }
    .invoice-details { text-align: right; }
    .invoice-details h2 { font-size: 20px; color: #FF9800; margin-bottom: 10px; }
    .invoice-details p { font-size: 12px; margin: 3px 0; }

    .parties { display: flex; gap: 40px; margin-bottom: 40px; }
    .party { flex: 1; }
    .party h3 { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
    .party p { font-size: 13px; line-height: 1.6; margin-bottom: 3px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #F5F5F5; padding: 12px; text-align: left; font-size: 12px; font-weight: 600; border-bottom: 2px solid #DDD; }
    td { padding: 12px; font-size: 13px; border-bottom: 1px solid #EEE; }
    .amount { text-align: right; font-family: 'Courier New', monospace; }
    tr.total-row { background: #FFFACD; font-weight: 600; }
    tr.total-row td { border-top: 2px solid #FF9800; border-bottom: 2px solid #FF9800; }

    .summary { margin-bottom: 40px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
    .summary-row.total { font-weight: 600; border-top: 2px solid #FF9800; padding-top: 12px; font-size: 15px; }

    .notes { background: #F9F9F9; padding: 15px; border-left: 4px solid #FF9800; margin-bottom: 30px; font-size: 12px; }
    .notes h4 { margin-bottom: 8px; }

    footer { font-size: 11px; color: #999; text-align: center; padding-top: 20px; border-top: 1px solid #DDD; }
    .gst-badge { background: #FFF3CD; color: #856404; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="company-info">
        <h1>ValueSkins</h1>
        <p>Creator & Brand Marketplace</p>
        <p style="margin-top: 10px;">CIN: xxxxxxxxx | GSTIN: ${process.env.COMPANY_GSTIN || 'xxxxxxxxxxxxx'}</p>
      </div>
      <div class="invoice-details">
        <h2>${invoiceTypeLabel[invoice.invoiceType]}</h2>
        <p><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
        <p><strong>Deal ID:</strong> ${invoice.dealId}</p>
      </div>
    </header>

    <div class="parties">
      <div class="party">
        <h3>Bill To (Brand)</h3>
        <p><strong>${invoice.brandName}</strong></p>
        <p>Email: ${invoice.brandEmail}</p>
        ${invoice.brandAddress ? `<p>${invoice.brandAddress}</p>` : ''}
        ${invoice.brandGSTIN ? `<p>GSTIN: ${invoice.brandGSTIN}</p>` : ''}
      </div>
      <div class="party">
        <h3>Creator Details</h3>
        <p><strong>${invoice.creatorName}</strong></p>
        <p>Email: ${invoice.creatorEmail}</p>
        ${invoice.creatorAddress ? `<p>${invoice.creatorAddress}</p>` : ''}
        ${invoice.creatorGSTIN ? `<p>GSTIN: ${invoice.creatorGSTIN}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="amount">Amount (₹)</th>
          <th class="amount">GST Rate</th>
          <th class="amount">GST Amount (₹)</th>
          <th class="amount">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lineItems.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="amount">${amountInRupees(item.amount)}</td>
            <td class="amount">${item.gstRate}%</td>
            <td class="amount">${amountInRupees(item.gstAmount)}</td>
            <td class="amount"><strong>${amountInRupees(item.totalAmount)}</strong></td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="2"><strong>Total</strong></td>
          <td class="amount"><strong>Total GST</strong></td>
          <td class="amount"><strong>${amountInRupees(invoice.totalGST)}</strong></td>
          <td class="amount"><strong>${amountInRupees(invoice.totalAmount)}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row">
        <span>Subtotal (before GST)</span>
        <span>${formatCurrency(invoice.subtotal)}</span>
      </div>
      <div class="summary-row">
        <span>GST (18%)</span>
        <span>${formatCurrency(invoice.totalGST)}</span>
      </div>
      <div class="summary-row total">
        <span>Invoice Total</span>
        <span>${formatCurrency(invoice.totalAmount)}</span>
      </div>
    </div>

    ${invoice.paymentStatus === 'completed' ? `
      <div class="summary">
        <div class="summary-row">
          <span><strong>✓ Payment Status</strong></span>
          <span><strong>PAID</strong></span>
        </div>
        ${invoice.paymentDate ? `
          <div class="summary-row">
            <span>Payment Date</span>
            <span>${new Date(invoice.paymentDate).toLocaleDateString('en-IN')}</span>
          </div>
        ` : ''}
      </div>
    ` : ''}

    ${invoice.notes ? `
      <div class="notes">
        <h4>Notes</h4>
        <p>${invoice.notes}</p>
      </div>
    ` : ''}

    <footer>
      <p>This is a computer-generated invoice. No signature required.</p>
      <p>ValueSkins • GST Registered • ${new Date().getFullYear()}</p>
    </footer>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Calculate GST on amount
   */
  static calculateGST(amount: number, gstRate: number): number {
    return Math.round((amount * gstRate) / 100);
  }

  /**
   * Format invoice number (INV-2026-001234)
   */
  static generateInvoiceNumber(invoiceId: string): string {
    const year = new Date().getFullYear();
    const sequence = invoiceId.replace('invoice_', '').padStart(6, '0');
    return `INV-${year}-${sequence}`;
  }
}
