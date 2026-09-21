import { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      deal_id,
      brand_email,
      brand_name,
      base_amount,
      gst_rate = 18,
    } = req.body;

    if (!deal_id || !brand_email || !base_amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const gst_amount = (base_amount * gst_rate) / 100;
    const total_amount = base_amount + gst_amount;

    // Create invoice via Razorpay
    const invoice = await razorpay.invoices.create({
      email_notify: 1,
      sms_notify: 0,
      expire_by: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      description: `ValueSkins Deal Commission - ${deal_id}`,
      customer_notifications: 1,
      customer_id: brand_email, // Use email as customer ID
      type: 'invoice',
      line_items: [
        {
          item_name: 'ValueSkins Commission',
          description: `Commission for deal ${deal_id}`,
          amount: Math.round(base_amount * 100), // in paise
          unit_amount: Math.round(base_amount * 100),
          quantity: 1,
          tax_rate: gst_rate,
          tax_id: null,
        },
      ],
    });

    res.status(200).json({
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      short_url: invoice.short_url,
      status: invoice.status,
      total_amount,
      gst_amount,
      base_amount,
      message: 'Invoice generated and sent to brand email',
    });
  } catch (error) {
    console.error('GST invoice error:', error);
    res.status(500).json({ error: 'Failed to generate GST invoice' });
  }
}
