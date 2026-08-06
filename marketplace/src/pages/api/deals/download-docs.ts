import { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler';
import { setupCors } from '@/lib/cors';
import { query } from '@/lib/db-pool';

const sanitizeHtml = (text: string): string => {
  if (!text) return '';
  return (text || '')
    .replace(/[<>"'&]/g, '')
    .replace(/on\w+=/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .slice(0, 2000);
};

const formatCurrency = (cents: number): string => {
  if (typeof cents !== 'number' || cents < 0) return '₹0.00';
  return `₹${(cents / 100).toFixed(2)}`;
};

const formatDate = (d: any): string => {
  if (!d) return 'TBD';
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return 'TBD'; }
};

async function getAuthUser(req: NextApiRequest): Promise<string | null> {
  const token = req.cookies.valueskins_session;
  if (!token) return null;
  const r = await query('SELECT user_id as account_id FROM auth_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()', [token]);
  return r.rows[0]?.account_id || null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (setupCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = await getAuthUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { dealId, format } = req.body;
    if (!dealId) return res.status(400).json({ error: 'Deal ID required' });

    const dealResult = await query(
      `SELECT d.id, d.title, d.status, d.deal_state, d.phase, d.offer_amount, d.advance_pct,
              d.review_period_days, d.value_skin, d.created_at, d.completed_at, d.contract_html,
              cb.display_name AS brand_name, cc.username AS creator_username
       FROM deals d
       LEFT JOIN accounts cb ON d.brand_id = cb.id
       LEFT JOIN accounts cc ON d.creator_id = cc.id
       WHERE d.id = $1 AND (d.brand_id = $2 OR d.creator_id = $2)`,
      [dealId, userId]
    );

    if (!dealResult.rows[0]) return res.status(404).json({ error: 'Deal not found or unauthorized' });

    const deal = dealResult.rows[0];
    const amountCents = Math.round((Number(deal.offer_amount) || 0) * 100);

    const messagesResult = await query(
      'SELECT message, sender_id, created_at FROM deal_messages WHERE deal_id = $1 ORDER BY created_at',
      [dealId]
    );

    const escrowResult = await query(
      'SELECT razorpay_order_id, status, total_amount_cents, funded_at, released_at FROM deal_escrow WHERE deal_id = $1',
      [dealId]
    );

    const reviewsResult = await query(
      'SELECT reviewer_id, rating_quality, rating_communication, rating_professionalism, comment, created_at FROM deal_reviews WHERE deal_id = $1',
      [dealId]
    );

    const milestonesResult = await query(
      'SELECT title, description, status, due_date, completed_at FROM deal_milestones WHERE deal_id = $1 ORDER BY created_at',
      [dealId]
    );

    const deliverablesResult = await query(
      'SELECT file_name, file_type, file_size, status, created_at FROM deliverable_reviews WHERE deal_id = $1 ORDER BY created_at DESC',
      [dealId]
    );

    const outputFormat = format === 'html' ? 'html' : 'json';

    if (outputFormat === 'html') {
      const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Deal Documentation - ${sanitizeHtml(deal.title || deal.id)}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; color: #222; line-height: 1.6; }
  h1 { border-bottom: 2px solid #000; padding-bottom: 8px; }
  h2 { font-size: 16px; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td, th { padding: 6px 10px; border: 1px solid #ddd; text-align: left; }
  th { background: #f5f5f5; }
  .section { margin: 16px 0; }
  .signature { margin-top: 40px; display: flex; justify-content: space-between; }
  .sig-box { width: 45%; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
  .footer { font-size: 10px; color: #888; margin-top: 40px; text-align: center; }
</style></head><body>
  <h1>Deal Documentation</h1>
  <p>Exported from ValueSkins on ${new Date().toISOString()}</p>

  <div class="section">
    <h2>Deal Information</h2>
    <table>
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Deal ID</td><td>${sanitizeHtml(deal.id)}</td></tr>
      <tr><td>Title</td><td>${sanitizeHtml(deal.title || 'N/A')}</td></tr>
      <tr><td>Brand</td><td>${sanitizeHtml(deal.brand_name || 'N/A')}</td></tr>
      <tr><td>Creator</td><td>${sanitizeHtml(deal.creator_username || 'N/A')}</td></tr>
      <tr><td>Value Skin</td><td>${sanitizeHtml(deal.value_skin || 'N/A')}</td></tr>
      <tr><td>Status</td><td>${sanitizeHtml(deal.status || deal.deal_state || deal.phase || 'N/A')}</td></tr>
      <tr><td>Offer Amount</td><td>${formatCurrency(amountCents)}</td></tr>
      <tr><td>Created</td><td>${formatDate(deal.created_at)}</td></tr>
      <tr><td>Completed</td><td>${formatDate(deal.completed_at)}</td></tr>
      <tr><td>Advance %</td><td>${deal.advance_pct || 0}%</td></tr>
      <tr><td>Review Period</td><td>${deal.review_period_days || 7} days</td></tr>
      <tr><td>Revisions</td><td>${deal.revision_count || 3} rounds</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Timeline</h2>
    <table>
      <tr><th>Event</th><th>Date</th></tr>
      <tr><td>Deal Created</td><td>${formatDate(deal.created_at)}</td></tr>
      <tr><td>Deal Completed</td><td>${formatDate(deal.completed_at)}</td></tr>
      ${milestonesResult.rows.length ? milestonesResult.rows.map((m: any) => `<tr><td>Milestone: ${sanitizeHtml(m.title)} (${m.status})</td><td>${formatDate(m.completed_at || m.due_date)}</td></tr>`).join('') : '<tr><td colspan="2">No milestones</td></tr>'}
    </table>
  </div>

  <div class="section">
    <h2>Deliverables (${deliverablesResult.rows.length})</h2>
    ${deliverablesResult.rows.length ? `<table>
      <tr><th>File</th><th>Type</th><th>Size</th><th>Status</th><th>Submitted</th></tr>
      ${deliverablesResult.rows.map((d: any) => `<tr>
        <td>${sanitizeHtml(d.file_name || '')}</td>
        <td>${d.file_type || 'N/A'}</td>
        <td>${d.file_size ? Math.round(d.file_size / 1024) + 'KB' : 'N/A'}</td>
        <td>${d.status || 'submitted'}</td>
        <td>${formatDate(d.created_at)}</td>
      </tr>`).join('')}
    </table>` : '<p>No deliverables</p>'}
  </div>

  <div class="section">
    <h2>Cost Breakdown</h2>
    <table>
      <tr><th>Item</th><th>Amount</th></tr>
      <tr><td>Offer Amount</td><td>${formatCurrency(amountCents)}</td></tr>
      <tr><td>Advance (${deal.advance_pct || 30}%)</td><td>${formatCurrency(Math.round(amountCents * (deal.advance_pct || 30) / 100))}</td></tr>
      <tr><td>Final Payment</td><td>${formatCurrency(Math.round(amountCents * (100 - (deal.advance_pct || 30)) / 100))}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Payment & Escrow</h2>
    ${escrowResult.rows.length ? `<table>
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Order ID</td><td>${sanitizeHtml(escrowResult.rows[0].razorpay_order_id || 'N/A')}</td></tr>
      <tr><td>Status</td><td>${escrowResult.rows[0].status || 'N/A'}</td></tr>
      <tr><td>Total (cents)</td><td>${escrowResult.rows[0].total_amount_cents || 'N/A'}</td></tr>
      <tr><td>Funded</td><td>${formatDate(escrowResult.rows[0].funded_at)}</td></tr>
      <tr><td>Released</td><td>${formatDate(escrowResult.rows[0].released_at)}</td></tr>
    </table>` : '<p>No escrow record</p>'}
  </div>

  <div class="section">
    <h2>Message History (${messagesResult.rows.length})</h2>
    ${messagesResult.rows.length ? `<table>
      <tr><th>Sender</th><th>Message</th><th>Timestamp</th></tr>
      ${messagesResult.rows.map((m: any) => `<tr><td>${sanitizeHtml(m.sender_id || '')}</td><td>${sanitizeHtml(m.message || '')}</td><td>${formatDate(m.created_at)}</td></tr>`).join('')}
    </table>` : '<p>No messages</p>'}
  </div>

  <div class="section">
    <h2>Reviews (${reviewsResult.rows.length})</h2>
    ${reviewsResult.rows.length ? `<table>
      <tr><th>Reviewer</th><th>Quality</th><th>Comm.</th><th>Prof.</th><th>Comment</th><th>Date</th></tr>
      ${reviewsResult.rows.map((r: any) => `<tr>
        <td>${sanitizeHtml(r.reviewer_id || '')}</td>
        <td>${r.rating_quality || '-'}</td>
        <td>${r.rating_communication || '-'}</td>
        <td>${r.rating_professionalism || '-'}</td>
        <td>${sanitizeHtml(r.comment || '')}</td>
        <td>${formatDate(r.created_at)}</td>
      </tr>`).join('')}
    </table>` : '<p>No reviews</p>'}
  </div>

  <div class="section">
    <h2>Terms & Conditions</h2>
    <p><strong>Payment Structure:</strong> ${deal.advance_pct || 30}% advance, remainder on final approval.</p>
    <p><strong>Review Period:</strong> ${deal.review_period_days || 7} days after deliverable submission.</p>
    <p><strong>Rights:</strong> Creator grants Brand a non-exclusive license for the agreed campaign. Creator retains ownership.</p>
    <p><strong>Disputes:</strong> Resolved through ValueSkins arbitration system.</p>
  </div>

  <div class="signature">
    <div class="sig-box"><p>Brand Signature</p><p>_________________</p><p>Date: ___________</p></div>
    <div class="sig-box"><p>Creator Signature</p><p>_________________</p><p>Date: ___________</p></div>
  </div>
  <div class="footer">Generated by ValueSkins. This is not legal advice.</div>
</body></html>`;

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="deal_${dealId}_docs.html"`);
      return res.status(200).send(html);
    }

    // Default: JSON
    const proof = {
      exportedAt: new Date().toISOString(),
      provider: 'fake_bank',
      deal: {
        id: deal.id,
        title: deal.title,
        status: deal.status || deal.deal_state || deal.phase,
        brandName: deal.brand_name,
        creatorUsername: deal.creator_username,
        valueSkin: deal.value_skin,
        offerAmountCents: amountCents,
        advancePct: deal.advance_pct,
        reviewPeriodDays: deal.review_period_days,
        revisionCount: deal.revision_count || 3,
        createdAt: deal.created_at,
        completedAt: deal.completed_at,
      },
      costBreakdown: {
        total: amountCents,
        advance: Math.round(amountCents * (deal.advance_pct || 30) / 100),
        finalPayment: Math.round(amountCents * (100 - (deal.advance_pct || 30)) / 100),
        advancePercent: deal.advance_pct || 30,
      },
      milestones: milestonesResult.rows.map((m: any) => ({
        title: m.title,
        description: m.description,
        status: m.status,
        dueDate: m.due_date,
        completedAt: m.completed_at,
      })),
      deliverables: deliverablesResult.rows.map((d: any) => ({
        fileName: d.file_name,
        fileType: d.file_type,
        fileSize: d.file_size,
        status: d.status,
        submittedAt: d.created_at,
      })),
      escrow: escrowResult.rows[0] || null,
      messageCount: messagesResult.rows.length,
      reviewCount: reviewsResult.rows.length,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="deal_${dealId}_receipt.json"`);
    return res.status(200).json(proof);
  } catch (error) {
    console.error('Docs download error:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
}

export default withApiHandler(handler);
