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
    const { deal_id, brand_id, amount, description } = req.body;

    if (!deal_id || !brand_id || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Razorpay order for commission payment
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `deal_${deal_id}`,
      notes: {
        deal_id,
        brand_id,
        type: 'commission',
      },
      description: description || 'ValueSkins Deal Commission',
    });

    res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Commission payment error:', error);
    res.status(500).json({ error: 'Failed to initiate commission payment' });
  }
}
