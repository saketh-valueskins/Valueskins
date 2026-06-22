import Razorpay from 'razorpay';

import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export { razorpay };

export interface CreateOrderParams {
  amount: number; // in paise
  currency?: string;
  receipt?: string;
  customer_notify?: 0 | 1;
  notes?: Record<string, any>;
}

export interface CreatePayoutParams {
  account_number: string;
  fund_account_id?: string;
  amount: number; // in paise
  currency?: string;
  mode: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI';
  purpose: 'payout' | 'refund' | 'settlement';
  receipt?: string;
  reference_id?: string;
  notes?: Record<string, any>;
}

export async function createOrder(params: CreateOrderParams) {
  try {
    const order = await razorpay.orders.create(params as any);
    return { success: true, data: order };
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    return { success: false, error };
  }
}

export async function fetchOrder(orderId: string) {
  try {
    const order = await razorpay.orders.fetch(orderId);
    return { success: true, data: order };
  } catch (error) {
    console.error('Razorpay order fetch failed:', error);
    return { success: false, error };
  }
}

export async function createTransfer(orderId: string, transfers: any[]) {
  try {
    const result = await ((razorpay as any).orders.createTransfer as any)(orderId, transfers);
    return { success: true, data: result };
  } catch (error) {
    console.error('Razorpay transfer creation failed:', error);
    return { success: false, error };
  }
}

export async function createPayout(params: CreatePayoutParams) {
  try {
    const payout = await ((razorpay as any).payouts.create as any)(params);
    return { success: true, data: payout };
  } catch (error) {
    console.error('Razorpay payout creation failed:', error);
    return { success: false, error };
  }
}

export async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
}

export async function createContact(params: {
  name: string;
  email?: string;
  type?: string;
  reference_id?: string;
}) {
  try {
    const contact = await (razorpay as any).contacts.create(params);
    return { success: true as const, data: contact };
  } catch (error) {
    console.error('Razorpay contact creation failed:', error);
    return { success: false as const, error };
  }
}

export async function createFundAccount(params: {
  contactId: string;
  accountType: string;
  bankAccount: {
    name: string;
    accountNumber: string;
    ifsc: string;
  };
}) {
  try {
    const fundAccount = await (razorpay as any).fundAccounts.create({
      contact_id: params.contactId,
      account_type: params.accountType,
      bank_account: {
        name: params.bankAccount.name,
        account_number: params.bankAccount.accountNumber,
        ifsc: params.bankAccount.ifsc,
      },
    });
    return { success: true as const, data: fundAccount };
  } catch (error) {
    console.error('Razorpay fund account creation failed:', error);
    return { success: false as const, error };
  }
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === signature;
}

const KNOWN_RAZORPAY_IPS: string[] = [];

export function isKnownRazorpayIp(ip: string): boolean {
  return KNOWN_RAZORPAY_IPS.includes(ip);
}
