import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { setupCors } from '@/lib/cors';
import { query } from '@/lib/db-pool';
import { computeProofHashChain, signProof } from '@/lib/proof-signing';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sessionToken = req.cookies.valueskins_session;
    if (!sessionToken) return res.status(401).json({ error: 'Unauthorized' });

    const { dealId } = req.body;
    if (!dealId) return res.status(400).json({ error: 'Deal ID required' });

    // ── Deal ──
    const dealResult = await query('SELECT * FROM deals WHERE id = $1', [dealId]);
    if (!dealResult.rows[0]) return res.status(404).json({ error: 'Deal not found' });
    const deal = dealResult.rows[0];

    // ── Parties ──
    const parties: Record<string, any> = {};
    if (deal.creator_id) {
      const creatorResult = await query(
        `SELECT u.id, u.display_name, u.avatar_url, u.email, u.created_at,
                a.bio, a.website
         FROM users u LEFT JOIN accounts a ON a.user_id = u.id WHERE u.id = $1`,
        [deal.creator_id]
      );
      if (creatorResult.rows[0]) parties.creator = creatorResult.rows[0];
    }
    if (deal.brand_id) {
      const brandResult = await query(
        'SELECT display_name, email, username FROM users WHERE id = $1',
        [deal.brand_id]
      );
      if (brandResult.rows[0]) parties.brand = brandResult.rows[0];
    }

    // ── Deal terms (from deal row + extras) ──
    const dealTerms: Record<string, any> = {
      title: deal.title || null,
      description: deal.description || null,
      valueSkin: deal.value_skin || null,
      budget: deal.budget || null,
      offerAmount: deal.offer_amount || null,
      contentType: deal.content_type || null,
      deliverables: deal.deliverables || null,
      dealState: deal.deal_state || null,
      exclusive: deal.exclusive || false,
      exclusivityDays: deal.exclusivity_days || 0,
      advancePct: deal.advance_pct || 0,
      contentDueDate: deal.content_due_date || null,
      reviewPeriodDays: deal.review_period_days || null,
    };

    // ── Messages ──
    const messagesResult = await query(
      `SELECT id, deal_id, sender_id, message, created_at,
              COALESCE(prev_hash, '') AS prev_hash,
              COALESCE(hash, '') AS hash,
              COALESCE(wal_position, '') AS wal_position
       FROM deal_messages WHERE deal_id = $1 ORDER BY created_at ASC`,
      [dealId]
    );

    // ── Payments ──
    const paymentsResult = await query(
      'SELECT * FROM deal_payments WHERE deal_id = $1 ORDER BY created_at ASC',
      [dealId]
    );
    const totalPaid = paymentsResult.rows.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    // ── Escrow ──
    const escrowResult = await query(
      'SELECT * FROM deal_escrow WHERE deal_id = $1',
      [dealId]
    );

    // ── Milestones + deliverables ──
    let milestones: any[] = [];
    try {
      const msResult = await query(
        'SELECT * FROM deal_milestones WHERE deal_id = $1 ORDER BY created_at ASC',
        [dealId]
      );
      milestones = msResult.rows;

      for (const ms of milestones) {
        const delResult = await query(
          `SELECT dr.*, json_agg(json_build_object(
            'id', rc.id, 'author_id', rc.author_id, 'comment', rc.comment, 'created_at', rc.created_at
          )) AS comments
          FROM deliverable_reviews dr
          LEFT JOIN review_comments rc ON rc.deliverable_id = dr.id
          WHERE dr.milestone_id = $1
          GROUP BY dr.id ORDER BY dr.created_at DESC`,
          [ms.id]
        );
        ms.deliverables = delResult.rows || [];
      }
    } catch {
      // milestones table may not exist on all deployments
    }

    // ── Deal files (contracts, briefs, uploads) ──
    let dealFiles: any[] = [];
    try {
      const filesResult = await query(
        'SELECT * FROM deal_files WHERE deal_id = $1 ORDER BY uploaded_at ASC',
        [dealId]
      );
      dealFiles = filesResult.rows;
    } catch {
      // deal_files table may not exist
    }

    // ── Audit trail (every action taken on the deal) ──
    let auditLog: any[] = [];
    try {
      const auditResult = await query(
        `SELECT id, actor_id, actor_role, action, details, created_at
         FROM deal_audit_logs WHERE deal_id = $1
         ORDER BY created_at DESC`,
        [dealId]
      );
      auditLog = auditResult.rows;
    } catch {
      // deal_audit_logs table may not exist
    }

    // ── Disputes ──
    let disputes: any[] = [];
    try {
      const disputeResult = await query(
        'SELECT * FROM deal_disputes WHERE deal_id = $1 ORDER BY created_at DESC',
        [dealId]
      );
      disputes = disputeResult.rows;
    } catch {}

    // ── Payment schedule (milestone templates) ──
    let paymentSchedule: any = null;
    try {
      const psResult = await query(
        `SELECT advance_pct, milestone_pcts, final_pct
         FROM deal_milestone_templates WHERE deal_id = $1`,
        [dealId]
      );
      paymentSchedule = psResult.rows[0] || null;
    } catch {}

    // ── Contract reference ──
    let contractReference: any = null;
    try {
      const contractResult = await query(
        `SELECT id, contract_text, generated_at
         FROM deal_contracts WHERE deal_id = $1 ORDER BY generated_at DESC LIMIT 1`,
        [dealId]
      );
      contractReference = contractResult.rows[0] || null;
      if (contractReference) {
        contractReference.url = `/api/deals/contract-generate?dealId=${dealId}`;
      }
    } catch {}

    // ── Reviews ──
    const reviewsResult = await query(
      'SELECT * FROM deal_reviews WHERE deal_id = $1',
      [dealId]
    );

    // ── Consent records ──
    let consents: any[] = [];
    if (parties.creator) {
      try {
        const consentResult = await query(
          `SELECT consent_type, granted, version, ip_address, created_at
           FROM user_consents WHERE user_id = $1 AND consent_type = 'deal_recording'`,
          [parties.creator.id]
        );
        consents.push(...consentResult.rows.map((r: any) => ({ ...r, party: 'creator' })));
      } catch {}
    }
    if (parties.brand) {
      try {
        const consentResult = await query(
          `SELECT consent_type, granted, version, ip_address, created_at
           FROM user_consents WHERE user_id = $1 AND consent_type = 'deal_recording'`,
          [parties.brand.id]
        );
        consents.push(...consentResult.rows.map((r: any) => ({ ...r, party: 'brand' })));
      } catch {}
    }

    // ── Deal duration ──
    let dealDuration: Record<string, any> = { days: null };
    if (deal.created_at) {
      const start = new Date(deal.created_at);
      const end = deal.completed_at ? new Date(deal.completed_at) : new Date();
      dealDuration = {
        days: Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        startDate: deal.created_at,
        endDate: deal.completed_at || null,
        status: deal.completed_at ? 'completed' : 'in_progress',
      };
    }

    // ── Revision summary ──
    let revisionSummary: Record<string, any> = { submitted: 0, approved: 0, rejected: 0, pending: 0 };
    for (const ms of milestones) {
      for (const d of (ms.deliverables || [])) {
        revisionSummary.submitted++;
        if (d.status === 'approved') revisionSummary.approved++;
        else if (d.status === 'rejected') revisionSummary.rejected++;
        else revisionSummary.pending++;
      }
    }

    // ── Hash chain ──
    const hashChain = computeProofHashChain(messagesResult.rows);
    const chainTip = messagesResult.rows.length > 0
      ? (messagesResult.rows[messagesResult.rows.length - 1] as any)?.hash || hashChain
      : hashChain;

    // ── Build proof ──
    const proof: Record<string, any> = {
      formatVersion: 2,
      reportType: 'deal_completion_report',
      dealId,
      deal: {
        id: deal.id,
        title: deal.title,
        status: deal.status,
        phase: deal.phase,
        dealState: deal.deal_state,
        createdAt: deal.created_at,
        completedAt: deal.completed_at,
        updatedAt: deal.updated_at || deal.created_at,
      },
      parties,
      dealTerms,
      dealDuration,
      paymentSchedule,
      contractReference,
      disputes,
      revisionSummary,
      financialSummary: {
        totalPaid,
        offerAmount: deal.offer_amount || null,
        budget: deal.budget || null,
        advancePct: deal.advance_pct || 0,
        escrow: escrowResult.rows[0] || null,
        payments: paymentsResult.rows,
        paymentCount: paymentsResult.rows.length,
      },
      deliverablesAndMilestones: {
        contentDueDate: deal.content_due_date,
        contentType: deal.content_type,
        deliverables: deal.deliverables,
        milestones,
        milestoneCount: milestones.length,
        completedMilestones: milestones.filter((m: any) => m.status === 'completed').length,
      },
      files: dealFiles,
      communication: {
        messages: messagesResult.rows,
        messageCount: messagesResult.rows.length,
      },
      timeline: [
        { event: 'Deal Created', timestamp: deal.created_at },
        ...paymentsResult.rows.map((p: any) => ({ event: `Payment: ₹${p.amount}`, timestamp: p.created_at, transactionId: p.transaction_id })),
        ...milestones.filter((m: any) => m.completed_at).map((m: any) => ({ event: `Milestone completed: ${m.title}`, timestamp: m.completed_at })),
        ...(deal.completed_at ? [{ event: 'Deal Completed', timestamp: deal.completed_at }] : []),
      ],
      auditTrail: auditLog,
      reviews: reviewsResult.rows,
      consents,
      hashChain: {
        algorithm: 'sha256',
        chainTip,
        computedFromMessages: hashChain,
        messageCount: messagesResult.rows.length,
      },
      exportedAt: new Date().toISOString(),
    };

    // Cryptographically sign the hash chain tip
    const signaturePayload = JSON.stringify({ dealId, hashChain: chainTip, exportedAt: proof.exportedAt });
    proof.signature = signProof(signaturePayload);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="valueskins_deal_report_${dealId}.json"`);
    return res.status(200).json(proof);
  } catch (error) {
    console.error('Proof export error:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
}

export default withApiHandler(handler, {
  rateLimit: { maxRequests: 20, windowMs: 60_000 },
});
