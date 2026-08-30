export type InvoiceType = 'stage1_commission' | 'stage2_advance' | 'stage3_remainder';
export type InvoiceRecipient = 'brand' | 'creator';

export interface InvoiceLineItem {
  description: string;
  amount: number; // in paise
  gstRate: number; // 18, 5, 0
  gstAmount: number; // calculated
  totalAmount: number; // amount + gst
}

export interface Invoice {
  id: string; // invoice_XXXX
  dealId: string;
  invoiceNumber: string; // INV-2026-001234
  invoiceDate: string; // ISO date
  invoiceType: InvoiceType;
  recipient: InvoiceRecipient; // who the invoice is for

  // Parties
  brandId: string;
  brandName: string;
  brandEmail: string;
  brandAddress?: string;
  brandGSTIN?: string;

  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  creatorAddress?: string;
  creatorGSTIN?: string;

  // Invoice details
  lineItems: InvoiceLineItem[];
  subtotal: number; // sum of amounts (in paise)
  totalGST: number; // sum of all GST (in paise)
  totalAmount: number; // subtotal + gst (in paise)

  // Payment reference
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentDate?: string;

  // File storage
  pdfUrl?: string;
  pdfStorageKey?: string;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceSummaryReport {
  period: {
    startDate: string;
    endDate: string;
  };
  totalInvoices: number;
  totalAmount: number; // in paise
  totalGSTCollected: number; // in paise
  totalGSTPaid: number; // in paise (to Razorpay)
  netGSTLiability: number; // collected - paid
  invoicesByType: Record<InvoiceType, number>;
  invoicesByRecipient: Record<InvoiceRecipient, number>;
}

export interface CreateInvoiceRequest {
  dealId: string;
  invoiceType: InvoiceType;
  recipient: InvoiceRecipient;
  brandId: string;
  brandName: string;
  brandEmail: string;
  brandGSTIN?: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  creatorGSTIN?: string;
  lineItems: Omit<InvoiceLineItem, 'gstAmount' | 'totalAmount'>[];
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  notes?: string;
}
