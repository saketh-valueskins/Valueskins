-- Invoice table for GST compliance
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TIMESTAMP NOT NULL,
  invoice_type TEXT NOT NULL, -- stage1_commission, stage2_advance, stage3_remainder
  recipient TEXT NOT NULL, -- brand, creator

  -- Brand details
  brand_id TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_email TEXT NOT NULL,
  brand_address TEXT,
  brand_gstin TEXT,

  -- Creator details
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  creator_address TEXT,
  creator_gstin TEXT,

  -- Invoice amounts (in paise)
  subtotal BIGINT NOT NULL, -- sum of line items before GST
  total_gst BIGINT NOT NULL, -- total GST
  total_amount BIGINT NOT NULL, -- subtotal + gst

  -- Payment reference
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  payment_date TIMESTAMP,

  -- Line items (stored as JSON for flexibility)
  line_items JSONB NOT NULL,

  -- File storage
  pdf_url TEXT,
  pdf_storage_key TEXT,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_invoices_deal_id ON invoices(deal_id);
CREATE INDEX IF NOT EXISTS idx_invoices_brand_id ON invoices(brand_id);
CREATE INDEX IF NOT EXISTS idx_invoices_creator_id ON invoices(creator_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Invoice audit log (for tracking changes)
CREATE TABLE IF NOT EXISTS invoice_audit_log (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  action TEXT NOT NULL, -- created, updated, downloaded, emailed
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_invoice_id ON invoice_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_action ON invoice_audit_log(action);
