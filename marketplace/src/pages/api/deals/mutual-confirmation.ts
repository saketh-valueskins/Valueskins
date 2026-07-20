/**
 * MUTUAL CONFIRMATION API
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Zero liability for ValueSkins business logic.
 *
 * Endpoints:
 * - POST /api/deals/mutual-confirmation/brand-approve
 * - POST /api/deals/mutual-confirmation/creator-confirm
 * - GET /api/deals/mutual-confirmation/status
 * - GET /api/deals/mutual-confirmation/proof
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { setupCors } from '@/lib/cors';
import {
  recordBrandApproval,
  recordCreatorConfirmation,
  getMutualConfirmationState,
  checkAndCreatePayoutLinkIfMutuallyConfirmed,
  getMutualConfirmationProof,
} from '@/lib/escrow/escrow-engine-v3-mutual-confirmation';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;

  const { action } = req.query;
  const act = Array.isArray(action) ? action[0] : action;

  const sessionToken = req.cookies.valueskins_session;
  const userId = req.headers['x-user-id'] as string;

  if (!sessionToken || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // ── BRAND APPROVES DELIVERABLE ──
    if (act === 'brand-approve' && req.method === 'POST') {
      const { dealId, approvalNotes } = req.body;

      if (!dealId) return res.status(400).json({ error: 'dealId required' });

      await recordBrandApproval(dealId, userId, approvalNotes);

      // Check if creator already confirmed (trigger payout if so)
      const state = await getMutualConfirmationState(dealId);
      if (state.creatorConfirmed) {
        await checkAndCreatePayoutLinkIfMutuallyConfirmed(dealId, 'advance');
      }

      return res.status(200).json({
        success: true,
        message: 'Brand approval recorded. Awaiting creator confirmation.',
        state,
      });
    }

    // ── CREATOR CONFIRMS DELIVERY ──
    if (act === 'creator-confirm' && req.method === 'POST') {
      const { dealId, confirmationNotes } = req.body;

      if (!dealId) return res.status(400).json({ error: 'dealId required' });

      await recordCreatorConfirmation(dealId, userId, confirmationNotes);

      // Check if brand already approved (trigger payout if so)
      const state = await getMutualConfirmationState(dealId);
      if (state.brandApproved) {
        await checkAndCreatePayoutLinkIfMutuallyConfirmed(dealId, 'advance');
      }

      return res.status(200).json({
        success: true,
        message: 'Creator confirmation recorded. Payout link will be created if brand approved.',
        state,
      });
    }

    // ── GET MUTUAL CONFIRMATION STATUS ──
    if (act === 'status' && req.method === 'GET') {
      const { dealId } = req.query;

      if (!dealId || Array.isArray(dealId)) {
        return res.status(400).json({ error: 'dealId required' });
      }

      const state = await getMutualConfirmationState(dealId);

      return res.status(200).json({
        state,
        message: 'Mutual confirmation status',
        liability: 'Both parties signed off. ValueSkins zero liability.',
      });
    }

    // ── GET PROOF OF MUTUAL CONFIRMATION ──
    if (act === 'proof' && req.method === 'GET') {
      const { dealId } = req.query;

      if (!dealId || Array.isArray(dealId)) {
        return res.status(400).json({ error: 'dealId required' });
      }

      const proof = await getMutualConfirmationProof(dealId);

      return res.status(200).json({
        proof,
        message: 'Complete audit trail proving mutual consent',
        liability: 'ValueSkins has zero liability. Both parties explicitly signed off.',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error(`Mutual confirmation [${act}] error:`, error);
    return res.status(500).json({ error: error.message || 'Operation failed' });
  }
}

export default withApiHandler(handler, {
  rateLimit: { maxRequests: 100, windowMs: 60000 }
});
