import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth/require-user';
import { setupCors } from '@/lib/cors';
import { query } from '@/lib/db-pool';
import { savePayoutAccountReference } from '@/lib/escrow';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;

  const userId = await requireUser(req, res);
  if (!userId) return;

  // ── GET PAYOUT ACCOUNTS ──
  if (req.method === 'GET') {
    const accounts = await query(
      `SELECT id, payment_provider, verification_status, last_four_digits, beneficiary_name, is_default, created_at
       FROM creator_payout_accounts WHERE creator_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    return res.status(200).json({ accounts: accounts.rows });
  }

  // ── SAVE PAYOUT ACCOUNT REFERENCE ──
  if (req.method === 'POST') {
    const { paymentProvider, payoutAccountId, verificationStatus, lastFourDigits, beneficiaryName } = req.body;
    if (!paymentProvider || typeof paymentProvider !== 'string' || paymentProvider.length > 50) {
      return res.status(400).json({ error: 'paymentProvider required (max 50 chars)' });
    }
    if (!payoutAccountId || typeof payoutAccountId !== 'string' || payoutAccountId.length > 100) {
      return res.status(400).json({ error: 'payoutAccountId required (max 100 chars)' });
    }
    if (!verificationStatus || !['pending', 'verified', 'failed'].includes(verificationStatus)) {
      return res.status(400).json({ error: 'verificationStatus must be pending, verified, or failed' });
    }
    if (lastFourDigits && (!/^\d{4}$/.test(lastFourDigits))) {
      return res.status(400).json({ error: 'lastFourDigits must be exactly 4 digits' });
    }

    const existing = await query(
      'SELECT COUNT(*) as cnt FROM creator_payout_accounts WHERE creator_id = $1',
      [userId]
    );
    const isDefault = parseInt(existing.rows[0]?.cnt || '0') === 0;

    await savePayoutAccountReference({
      creatorId: userId,
      paymentProvider,
      payoutAccountId,
      verificationStatus,
      lastFourDigits,
      beneficiaryName,
    });

    if (isDefault) {
      await query(
        `UPDATE creator_payout_accounts SET is_default = TRUE
         WHERE creator_id = $1 AND payout_account_id = $2`,
        [userId, payoutAccountId]
      );
    }

    return res.status(200).json({ success: true, isDefault });
  }

  // ── DELETE PAYOUT ACCOUNT ──
  if (req.method === 'DELETE') {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId required' });

    await query(
      'DELETE FROM creator_payout_accounts WHERE id = $1 AND creator_id = $2',
      [accountId, userId]
    );
    return res.status(200).json({ success: true });
  }

  // ── SET DEFAULT ──
  if (req.method === 'PATCH') {
    const { accountId, setDefault } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId required' });

    if (setDefault) {
      await query(
        `UPDATE creator_payout_accounts SET is_default = FALSE WHERE creator_id = $1`,
        [userId]
      );
      await query(
        `UPDATE creator_payout_accounts SET is_default = TRUE WHERE id = $1 AND creator_id = $2`,
        [accountId, userId]
      );
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withApiHandler(handler, {
  rateLimit: { maxRequests: 30, windowMs: 60000 },
});
