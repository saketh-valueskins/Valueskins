import crypto from 'crypto';

// ── Fake Bank: In-memory payment simulation ──
// Replaces Razorpay when no real keys are configured.
// All operations are in-memory, no external dependencies.
// Ledger is logged to console for audit/debugging.

interface FakeOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: 'created' | 'paid' | 'cancelled';
  notes: Record<string, any>;
  transfers: FakeTransfer[];
  created_at: number;
  paid_at: number | null;
}

interface FakeTransfer {
  id: string;
  order_id: string;
  account: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processed' | 'failed';
  created_at: number;
  processed_at: number | null;
}

interface FakePayout {
  id: string;
  fund_account_id: string;
  amount: number;
  currency: string;
  mode: string;
  purpose: string;
  status: 'pending' | 'processed' | 'failed';
  receipt: string;
  created_at: number;
  processed_at: number | null;
}

interface FakeFundAccount {
  id: string;
  contact_id: string;
  account_type: string;
  bank_account: any;
  vpa: any;
  created_at: number;
}

interface FakeContact {
  id: string;
  name: string;
  email: string;
  contact: string;
  type: string;
  reference_id: string;
  created_at: number;
}

interface LedgerEntry {
  timestamp: string;
  type: 'order' | 'transfer' | 'refund' | 'payout' | 'fund_account' | 'contact' | 'verification';
  action: string;
  details: any;
}

class FakeBank {
  private orders: Map<string, FakeOrder> = new Map();
  private payouts: Map<string, FakePayout> = new Map();
  private fundAccounts: Map<string, FakeFundAccount> = new Map();
  private contacts: Map<string, FakeContact> = new Map();
  private ledger: LedgerEntry[] = [];
  private seq(prefix: string): string {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }

  private log(type: LedgerEntry['type'], action: string, details: any) {
    const entry: LedgerEntry = {
      timestamp: new Date().toISOString(),
      type,
      action,
      details,
    };
    this.ledger.push(entry);
    console.log(`[FakeBank] ${type}: ${action}`, JSON.stringify(details, null, 2));
  }

  getLedger(): LedgerEntry[] {
    return [...this.ledger];
  }

  getBalance(): { totalOrders: number; totalPayouts: number; net: number } {
    let totalOrders = 0;
    let totalPayouts = 0;
    for (const o of this.orders.values()) {
      if (o.status === 'paid') totalOrders += o.amount;
    }
    for (const p of this.payouts.values()) {
      if (p.status === 'processed') totalPayouts += p.amount;
    }
    return { totalOrders, totalPayouts, net: totalOrders - totalPayouts };
  }

  // ── ORDER OPERATIONS ──

  createOrder(params: {
    amount: number;
    currency?: string;
    receipt?: string;
    notes?: Record<string, any>;
  }) {
    const id = this.seq('order');
    const order: FakeOrder = {
      id,
      amount: params.amount,
      currency: params.currency || 'INR',
      receipt: params.receipt || `receipt_${id}`,
      status: 'created',
      notes: params.notes || {},
      transfers: [],
      created_at: Date.now(),
      paid_at: null,
    };
    this.orders.set(id, order);
    this.log('order', 'created', { orderId: id, amount: params.amount });
    return {
      success: true as const,
      data: {
        id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        notes: order.notes,
        created_at: order.created_at,
        attempt: 0,
      },
    };
  }

  fetchOrder(orderId: string) {
    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false as const, error: new Error(`Order ${orderId} not found`) };
    }
    return {
      success: true as const,
      data: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        notes: order.notes,
        created_at: order.created_at,
        attempts: order.status === 'paid' ? 1 : 0,
      },
    };
  }

  markOrderPaid(orderId: string, paymentId?: string) {
    const order = this.orders.get(orderId);
    if (!order) return { success: false as const, error: new Error('Order not found') };
    order.status = 'paid';
    order.paid_at = Date.now();
    this.log('order', 'paid', { orderId, paymentId: paymentId || `${orderId}_payment` });
    return { success: true as const, data: order };
  }

  // ── TRANSFER OPERATIONS ──

  createTransfer(orderId: string, transfers: Array<{ account: string; amount: number; currency?: string }>) {
    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false as const, error: new Error(`Order ${orderId} not found`) };
    }
    const results: any[] = [];
    for (const t of transfers) {
      const transfer: FakeTransfer = {
        id: this.seq('transfer'),
        order_id: orderId,
        account: t.account,
        amount: t.amount,
        currency: t.currency || order.currency,
        status: 'processed',
        created_at: Date.now(),
        processed_at: Date.now(),
      };
      order.transfers.push(transfer);
      results.push(transfer);
      this.log('transfer', 'created', { transferId: transfer.id, orderId, account: t.account, amount: t.amount });
    }
    return { success: true as const, data: results.length === 1 ? results[0] : results };
  }

  // ── REFUND OPERATIONS ──

  createRefund(paymentId: string, options?: { amount?: number; speed?: 'normal' | 'optimum'; notes?: Record<string, any> }) {
    const refundId = this.seq('refund');
    this.log('refund', 'created', { paymentId, refundId, amount: options?.amount });
    return { success: true as const, data: { id: refundId, payment_id: paymentId, amount: options?.amount || 0, status: 'processed', created_at: Date.now() } };
  }

  // ── PAYOUT OPERATIONS ──

  createPayout(params: {
    account_number: string;
    fund_account_id: string;
    amount: number;
    currency?: string;
    mode?: string;
    purpose?: string;
    receipt?: string;
  }) {
    const id = this.seq('payout');
    const payout: FakePayout = {
      id,
      fund_account_id: params.fund_account_id,
      amount: params.amount,
      currency: params.currency || 'INR',
      mode: params.mode || 'NEFT',
      purpose: params.purpose || 'payout',
      status: 'processed',
      receipt: params.receipt || `receipt_${id}`,
      created_at: Date.now(),
      processed_at: Date.now(),
    };
    this.payouts.set(id, payout);
    this.log('payout', 'created', { payoutId: id, amount: params.amount, fundAccount: params.fund_account_id });
    return { success: true as const, data: payout };
  }

  // ── FUND ACCOUNT OPERATIONS ──

  createFundAccount(params: {
    contactId: string;
    accountType: 'bank_account' | 'vpa';
    bankAccount?: { name: string; accountNumber: string; ifsc: string };
    vpa?: { address: string };
  }) {
    const id = this.seq('fund');
    const fundAccount: FakeFundAccount = {
      id,
      contact_id: params.contactId,
      account_type: params.accountType,
      bank_account: params.bankAccount || null,
      vpa: params.vpa || null,
      created_at: Date.now(),
    };
    this.fundAccounts.set(id, fundAccount);
    this.log('fund_account', 'created', { fundAccountId: id, type: params.accountType });
    return { success: true as const, data: fundAccount };
  }

  // ── CONTACT OPERATIONS ──

  createContact(params: {
    name: string;
    email?: string;
    contact?: string;
    type?: string;
    reference_id?: string;
  }) {
    const id = this.seq('contact');
    const contact: FakeContact = {
      id,
      name: params.name,
      email: params.email || '',
      contact: params.contact || '',
      type: params.type || 'vendor',
      reference_id: params.reference_id || '',
      created_at: Date.now(),
    };
    this.contacts.set(id, contact);
    this.log('contact', 'created', { contactId: id, name: params.name });
    return { success: true as const, data: { id, ...params, created_at: contact.created_at } };
  }

  // ── SIGNATURE VERIFICATION (dev only — always returns true) ──

  verifySignature(_orderId: string, _paymentId: string, _signature: string): boolean {
    if (process.env.RAZORPAY_KEY_SECRET) {
      console.warn('[FakeBank] Signature verification bypassed — real Razorpay keys are set but fake bank is being used');
    }
    return true;
  }

  verifyWebhookSignature(_body: string, _signature: string, _secret: string): boolean {
    if (process.env.RAZORPAY_KEY_SECRET) {
      console.warn('[FakeBank] Webhook signature verification bypassed — real Razorpay keys are set but fake bank is being used');
    }
    return true;
  }

  getKeyId(): string {
    return 'fake_bank_test';
  }

  getKeySecret(): string {
    return 'fake_bank_secret';
  }
}

export const fakeBank = new FakeBank();
