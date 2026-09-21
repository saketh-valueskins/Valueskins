import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

function verifySignature(
  body: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex');
  return hash === signature;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);

    if (!verifySignature(body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const { event: eventType, payload } = event;

    switch (eventType) {
      case 'payment.authorized': {
        const payment = payload.payment.entity;
        console.log(`Payment authorized: ${payment.id}`);
        // Update deal status to commission_paid
        // Trigger advance payout
        break;
      }

      case 'payment.captured': {
        const payment = payload.payment.entity;
        console.log(`Payment captured: ${payment.id}`);
        // Update transaction status
        break;
      }

      case 'payout.initiated': {
        const payout = payload.payout.entity;
        console.log(`Payout initiated: ${payout.id}`);
        // Update payout status
        break;
      }

      case 'payout.processed': {
        const payout = payload.payout.entity;
        console.log(`Payout processed: ${payout.id}`);
        // Update payout status to completed
        break;
      }

      case 'transfer.settled': {
        const transfer = payload.transfer.entity;
        console.log(`Transfer settled: ${transfer.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
