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
    const { creator_id, payment_method, upi_id, bank_account, ifsc } = req.body;

    if (!creator_id || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (payment_method === 'upi' && !upi_id) {
      return res.status(400).json({ error: 'UPI ID required' });
    }

    if (payment_method === 'bank' && (!bank_account || !ifsc)) {
      return res.status(400).json({ error: 'Bank account and IFSC required' });
    }

    // Create contact in Razorpay
    const contact = await razorpay.contacts.create({
      name: `Creator ${creator_id}`,
      email: creator_id, // Placeholder - use actual email
      type: 'individual',
      reference_id: creator_id,
    });

    let fundAccount;

    if (payment_method === 'upi') {
      // Create fund account for UPI
      fundAccount = await razorpay.fundAccounts.create({
        contact_id: contact.id,
        account_type: 'vpa',
        vpa: {
          address: upi_id,
        },
      });
    } else {
      // Create fund account for bank account
      fundAccount = await razorpay.fundAccounts.create({
        contact_id: contact.id,
        account_type: 'bank_account',
        bank_account: {
          name: `Creator ${creator_id}`,
          notes: {
            receiver_key_1: 'June',
          },
          ifsc: ifsc,
          account_number: bank_account,
        },
      });
    }

    // Store only the reference IDs in our database
    // The actual bank details remain encrypted in Razorpay's vault
    res.status(200).json({
      status: 'completed',
      contact_id: contact.id,
      fund_account_id: fundAccount.id,
      message: 'Bank details stored securely. Stored only once in Razorpay vault.',
      payment_method: payment_method,
    });
  } catch (error) {
    console.error('Bank details error:', error);
    res.status(500).json({ error: 'Failed to save bank details' });
  }
}
