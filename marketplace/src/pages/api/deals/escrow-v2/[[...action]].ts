import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth/require-user';
import { setupCors } from '@/lib/cors';
import { query } from '@/lib/db-pool';
import {
  createDeal,
  fundEscrow,
  confirmEscrowFunding,
  submitDeliverable,
  approveDeliverables,
  submitAnalytics,
  approveAnalytics,
  requestRevision,
  submitRevision,
  raiseDispute,
  resolveDispute,
  getDealEscrowStatus,
  getAuditLog,
} from '@/lib/escrow';
import { VALUESKIN_PRICE_CENTS, CURRENCY } from '@/lib/pricing';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;

  const { action } = req.query;
  const act = Array.isArray(action) ? action[0] : action;

  const userId = await requireUser(req, res);
  if (!userId) return;

  try {
    // ── CREATE DEAL WITH MILESTONES ──
    if (act === 'create-deal' && req.method === 'POST') {
      const { dealId, totalAmountRupees, advancePct, milestonePcts, finalPct, reviewPeriodDays } = req.body;
      if (!dealId || typeof totalAmountRupees !== 'number' || totalAmountRupees <= 0) {
        return res.status(400).json({ error: 'dealId and totalAmountRupees (positive number) required' });
      }

      const totalCents = Math.round(totalAmountRupees * 100);
      if (totalCents > 50000000) {
        return res.status(400).json({ error: 'Amount exceeds maximum (₹500,000)' });
      }

      const mPcts = Array.isArray(milestonePcts) ? milestonePcts : [];
      if (mPcts.some((p: number) => typeof p !== 'number' || p < 0 || p > 100)) {
        return res.status(400).json({ error: 'Each milestone percentage must be between 0 and 100' });
      }

      await createDeal({
        dealId,
        totalAmountCents: totalCents,
        advancePct: typeof advancePct === 'number' ? advancePct : 30,
        milestonePcts: mPcts,
        finalPct: typeof finalPct === 'number'
          ? finalPct
          : (100 - (advancePct || 30) - mPcts.reduce((a: number, b: number) => a + b, 0)),
        reviewPeriodDays: typeof reviewPeriodDays === 'number' ? reviewPeriodDays : 7,
      });

      return res.status(200).json({ success: true });
    }

    // ── FUND ESCROW (initiate Razorpay order) ──
    if (act === 'fund' && req.method === 'POST') {
      const { dealId } = req.body;
      if (!dealId) return res.status(400).json({ error: 'dealId required' });

      const deal = await query(
        'SELECT offer_amount, advance_pct, brand_id FROM deals WHERE id = $1',
        [dealId]
      );
      if (!deal.rows[0]) return res.status(404).json({ error: 'Deal not found' });
      if (String(deal.rows[0].brand_id) !== String(userId)) {
        return res.status(403).json({ error: 'Only the brand can fund escrow' });
      }

      const totalCents = Math.round(Number(deal.rows[0].offer_amount) * 100);
      const orderId = await fundEscrow(dealId, totalCents);

      return res.status(200).json({
        keyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        orderId,
        amount: totalCents,
        currency: CURRENCY,
      });
    }

    // ── CONFIRM ESCROW FUNDING (verify payment) ──
    if (act === 'confirm-funding' && req.method === 'POST') {
      const { dealId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      if (!dealId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment verification fields' });
      }

      await confirmEscrowFunding(dealId, razorpay_order_id, razorpay_payment_id, razorpay_signature);

      return res.status(200).json({ success: true, message: 'Escrow funded. Advance released.' });
    }

    // ── SUBMIT DELIVERABLE ──
    if (act === 'submit-deliverable' && req.method === 'POST') {
      const { dealId, title, description, fileUrl, fileType, fileSizeBytes } = req.body;
      if (!dealId || !title || typeof title !== 'string' || title.length > 500) {
        return res.status(400).json({ error: 'dealId and title (max 500 chars) required' });
      }
      if (!fileUrl || typeof fileUrl !== 'string' || fileUrl.length > 2000) {
        return res.status(400).json({ error: 'fileUrl required (max 2000 chars)' });
      }

      const delId = await submitDeliverable({
        dealId,
        creatorId: userId,
        title,
        description: description || undefined,
        fileUrl,
        fileType: fileType || undefined,
        fileSizeBytes: typeof fileSizeBytes === 'number' ? fileSizeBytes : undefined,
      });

      return res.status(200).json({ success: true, deliverableId: delId });
    }

    // ── APPROVE DELIVERABLES ──
    if (act === 'approve' && req.method === 'POST') {
      const { dealId } = req.body;
      if (!dealId) return res.status(400).json({ error: 'dealId required' });

      await approveDeliverables(dealId, userId);
      return res.status(200).json({ success: true, message: 'Deliverables approved. Analytics phase started (7-day timer).' });
    }

    // ── SUBMIT ANALYTICS ──
    if (act === 'submit-analytics' && req.method === 'POST') {
      const { dealId, totalViews, analyticsScreenshotLink } = req.body;
      if (!dealId) return res.status(400).json({ error: 'dealId required' });
      if (typeof totalViews !== 'number' || !Number.isInteger(totalViews) || totalViews < 0) {
        return res.status(400).json({ error: 'totalViews must be a non-negative integer' });
      }
      if (typeof analyticsScreenshotLink !== 'string' || analyticsScreenshotLink.length < 1 || analyticsScreenshotLink.length > 2000) {
        return res.status(400).json({ error: 'analyticsScreenshotLink required (max 2000 chars)' });
      }

      await submitAnalytics(dealId, userId, totalViews, analyticsScreenshotLink);
      return res.status(200).json({ success: true, message: 'Analytics submitted. Awaiting brand approval.' });
    }

    // ── APPROVE ANALYTICS ──
    if (act === 'approve-analytics' && req.method === 'POST') {
      const { dealId } = req.body;
      if (!dealId) return res.status(400).json({ error: 'dealId required' });

      await approveAnalytics(dealId, userId);
      return res.status(200).json({ success: true, message: 'Analytics approved. Final payment released.' });
    }

    // ── REQUEST REVISION ──
    if (act === 'request-revision' && req.method === 'POST') {
      const { dealId, notes } = req.body;
      if (!dealId || !notes || typeof notes !== 'string' || notes.length > 2000) {
        return res.status(400).json({ error: 'dealId and notes (max 2000 chars) required' });
      }

      await requestRevision(dealId, userId, notes);
      return res.status(200).json({ success: true, message: 'Revision requested' });
    }

    // ── SUBMIT REVISION ──
    if (act === 'submit-revision' && req.method === 'POST') {
      const { dealId, fileUrl, notes } = req.body;
      if (!dealId || !fileUrl || typeof fileUrl !== 'string' || fileUrl.length > 2000) {
        return res.status(400).json({ error: 'dealId and fileUrl (max 2000 chars) required' });
      }

      await submitRevision(dealId, userId, fileUrl, notes);
      return res.status(200).json({ success: true, message: 'Revision submitted' });
    }

    // ── RAISE DISPUTE ──
    if (act === 'raise-dispute' && req.method === 'POST') {
      const { dealId, reason, description, evidenceUrls } = req.body;
      if (!dealId || !reason || !description || typeof description !== 'string' || description.length > 5000) {
        return res.status(400).json({ error: 'dealId, reason, and description (max 5000 chars) required' });
      }
      if (!['deliverable_not_as_agreed', 'missed_deadline', 'quality_issues', 'scope_disagreement', 'communication_breakdown', 'other'].includes(reason)) {
        return res.status(400).json({ error: 'Invalid dispute reason' });
      }

      const disputeId = await raiseDispute(dealId, userId, reason, description, evidenceUrls);
      return res.status(200).json({ success: true, disputeId });
    }

    // ── RESOLVE DISPUTE (admin only) ──
    if (act === 'resolve-dispute' && req.method === 'POST') {
      const { disputeId, resolution, notes, payoutAdjustmentPct } = req.body;
      if (!disputeId || !resolution || !notes) {
        return res.status(400).json({ error: 'disputeId, resolution, and notes required' });
      }
      if (!['resolved_creator', 'resolved_brand', 'resolved_split', 'dismissed'].includes(resolution)) {
        return res.status(400).json({ error: 'Invalid resolution type' });
      }

      await resolveDispute(disputeId, userId, resolution, notes, payoutAdjustmentPct);
      return res.status(200).json({ success: true, message: 'Dispute resolved' });
    }

    // ── GET STATUS ──
    if (act === 'status' && req.method === 'GET') {
      const { dealId } = req.query;
      if (!dealId || Array.isArray(dealId)) return res.status(400).json({ error: 'dealId required' });

      const deal = await query('SELECT id FROM deals WHERE id = $1', [dealId]);
      if (!deal.rows[0]) return res.status(404).json({ error: 'Deal not found' });

      const status = await getDealEscrowStatus(dealId);
      return res.status(200).json(status);
    }

    // ── GET AUDIT LOG ──
    if (act === 'audit' && req.method === 'GET') {
      const { dealId, limit, offset } = req.query;
      if (!dealId || Array.isArray(dealId)) return res.status(400).json({ error: 'dealId required' });

      const l = Math.min(Math.max(parseInt(limit as string) || 50, 1), 200);
      const o = Math.max(parseInt(offset as string) || 0, 0);

      const audit = await getAuditLog(dealId, l, o);
      return res.status(200).json(audit);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error(`Escrow v2 [${act}] error:`, error);
    return res.status(500).json({ error: error.message || 'Escrow operation failed' });
  }
}

export default withApiHandler(handler, {
  rateLimit: { maxRequests: 60, windowMs: 60000 },
});
