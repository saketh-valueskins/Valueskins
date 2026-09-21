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
    const { deal_id, creator_id, payout_type, amount, fund_account_id } = req.body;

    if (!deal_id || !creator_id || !payout_type || !amount || !fund_account_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (payout_type !== 'advance' && payout_type !== 'final') {
      return res.status(400).json({ error: 'Invalid payout type' });
    }

    // Initiate payout via Razorpay
    const payout = await razorpay.transfers.create({
      account: 'acc_<account_id>', // Use connected account if available
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `${payout_type}_${deal_id}`,
      notes: {
        deal_id,
        creator_id,
        payout_type,
      },
    });

    // Alternative: Direct payout to fund account
    // const payout = await razorpay.payouts.create({
    //   account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
    //   fund_account_id,
    //   amount: Math.round(amount * 100),
    //   currency: 'INR',
    //   mode: 'NEFT',
    //   purpose: 'payout',
    //   queue_if_low_balance: true,
    //   notes: {
    //     deal_id,
    //     creator_id,
    //     payout_type,
    //   },
    // });

    res.status(200).json({
      payout_id: payout.id,
      status: payout.status,
      amount: payout.amount,
      transfer_id: payout.id,
    });
  } catch (error) {
    console.error('Payout initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate payout' });
  }
}
