import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db-pool';
import { getSessionUserId } from '@/lib/session';
import { createOrder } from '@/lib/razorpay';
import { VALUESKIN_PRICE_CENTS, CURRENCY } from '@/lib/pricing';
import { calculatePlatformFee } from '@/lib/platformFees';
import { withCsrfProtection } from '@/lib/security/csrf-pages';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookie = req.headers.cookie || '';
  const userId = await getSessionUserId(cookie);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { profession_id, profession_name, tier = 1 } = req.body;
  if (!profession_id && !profession_name) {
    return res.status(400).json({ error: 'profession_id or profession_name is required' });
  }

  try {
    let resolvedProfessionId = profession_id;
    if (!resolvedProfessionId && profession_name) {
      const profResult = await query(
        'SELECT id FROM professions WHERE name = $1 LIMIT 1',
        [profession_name]
      );
      if (profResult.rows.length === 0) {
        return res.status(400).json({ error: `Profession "${profession_name}" not found` });
      }
      resolvedProfessionId = profResult.rows[0].id;
    }

    const existing = await query(
      'SELECT id FROM user_stickers WHERE user_id = $1 AND profession_id = $2 AND is_active = TRUE',
      [userId, resolvedProfessionId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You already own a value scheme for this profession' });
    }

    // Check max skins (3)
    const count = await query(
      'SELECT COUNT(*) as cnt FROM user_stickers WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );
    if (parseInt(count.rows[0]?.cnt || '0') >= 3) {
      return res.status(400).json({ error: 'You can only own 3 value skins' });
    }

    const amountCents = VALUESKIN_PRICE_CENTS;
    const fee = calculatePlatformFee(amountCents);
    const receipt = `vs_${userId}_${resolvedProfessionId}_${Date.now()}`;

    const order = await createOrder({
      amount: amountCents,
      currency: CURRENCY,
      receipt,
      notes: {
        purpose: 'valueskin_purchase',
        user_id: String(userId),
        profession_id: String(resolvedProfessionId),
        tier: String(tier),
        platform_fee_cents: String(fee.feeCents),
        net_amount_cents: String(fee.netAmountCents),
      },
    });

    if (!order.success) {
      console.error('Razorpay order creation failed:', (order as any).error);
      return res.status(500).json({ error: 'Payment order creation failed' });
    }

    return res.status(200).json({
      keyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
      order: order.data,
      amount: amountCents,
      currency: CURRENCY,
      profession_id: resolvedProfessionId,
      tier,
      fee,
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create order' });
  }
}

export default withCsrfProtection(handler);
