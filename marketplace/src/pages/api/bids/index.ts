import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getAccountId } from '@/lib/session';

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await query(`CREATE TABLE IF NOT EXISTS campaign_bids (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    creator_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    bid_amount DECIMAL(12,2) NOT NULL,
    proposal TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(campaign_id, creator_id)
  )`);
  await query('CREATE INDEX IF NOT EXISTS idx_campaign_bids_campaign ON campaign_bids(campaign_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_campaign_bids_creator ON campaign_bids(creator_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_campaign_bids_status ON campaign_bids(status)');
  schemaReady = true;
}

const ok = (r: NextApiResponse, d: any) => r.status(200).json(d);
const created = (r: NextApiResponse, d: any) => r.status(201).json(d);
const bad = (r: NextApiResponse, m: string) => r.status(400).json({ error: m });
const notFound = (r: NextApiResponse) => r.status(404).json({ error: 'Not found' });
const unauthorized = (r: NextApiResponse) => r.status(401).json({ error: 'Unauthorized' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getAccountId(req.headers.cookie || '');
  if (!userId) return unauthorized(res);

  try {
    await ensureSchema();

    const { method, query: q, body } = req;

    // POST: Place a bid on a campaign
    if (method === 'POST') {
      const { campaign_id, bid_amount, proposal } = body;
      if (!campaign_id) return bad(res, 'campaign_id required');
      if (!bid_amount || bid_amount <= 0) return bad(res, 'Valid bid_amount required');

      const campaign = await query('SELECT * FROM campaigns WHERE id = $1', [campaign_id]);
      if (!campaign.rows[0]) return bad(res, 'Campaign not found');

      if (campaign.rows[0].deadline && new Date(campaign.rows[0].deadline) < new Date()) {
        return bad(res, 'Campaign deadline has passed');
      }

      const existing = await query('SELECT * FROM campaign_bids WHERE campaign_id = $1 AND creator_id = $2', [campaign_id, userId]);
      if (existing.rows[0]) {
        const updated = await query(
          `UPDATE campaign_bids SET bid_amount = $1, proposal = $2, status = 'pending', updated_at = NOW()
           WHERE campaign_id = $3 AND creator_id = $4 RETURNING *`,
          [bid_amount, proposal || '', campaign_id, userId]
        );
        return ok(res, { bid: updated.rows[0], message: 'Bid updated' });
      }

      const result = await query(
        `INSERT INTO campaign_bids (campaign_id, creator_id, bid_amount, proposal)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [campaign_id, userId, bid_amount, proposal || '']
      );
      return created(res, { bid: result.rows[0] });
    }

    // GET: List bids
    if (method === 'GET') {
      const { campaign_id, status: filterStatus } = q;

      if (campaign_id) {
        const campaign = await query('SELECT c.*, a.display_name as brand_name FROM campaigns c JOIN accounts a ON c.brand_id = a.id WHERE c.id = $1', [campaign_id]);
        if (!campaign.rows[0]) return bad(res, 'Campaign not found');

        const isBrandOwner = String(campaign.rows[0].brand_id) === String(userId);

        if (isBrandOwner) {
          const bids = await query(
            `SELECT cb.*, a.display_name as creator_name, a.username as creator_username, a.avatar_url as creator_avatar
             FROM campaign_bids cb JOIN accounts a ON cb.creator_id = a.id
             WHERE cb.campaign_id = $1${filterStatus ? ' AND cb.status = $2' : ''}
             ORDER BY cb.bid_amount ASC, cb.created_at ASC`,
            filterStatus ? [campaign_id, filterStatus] : [campaign_id]
          );
          return ok(res, { campaign: campaign.rows[0], bids: bids.rows, role: 'brand' });
        }

        const myBids = await query(
          `SELECT cb.*, c.title as campaign_title, a.display_name as brand_name
           FROM campaign_bids cb
           JOIN campaigns c ON cb.campaign_id = c.id
           JOIN accounts a ON c.brand_id = a.id
           WHERE cb.campaign_id = $1 AND cb.creator_id = $2`,
          [campaign_id, userId]
        );
        return ok(res, { campaign: campaign.rows[0], bids: myBids.rows, role: 'creator' });
      }

      const myCreatorBids = await query(
        `SELECT cb.*, c.title as campaign_title, a.display_name as brand_name, c.status as campaign_status
         FROM campaign_bids cb
         JOIN campaigns c ON cb.campaign_id = c.id
         JOIN accounts a ON c.brand_id = a.id
         WHERE cb.creator_id = $1
         ORDER BY cb.created_at DESC`,
        [userId]
      );
      return ok(res, { bids: myCreatorBids.rows });
    }

    // PATCH: Accept/reject bid (brand) or withdraw (creator)
    if (method === 'PATCH') {
      const { bid_id, action } = body;
      if (!bid_id || !action) return bad(res, 'bid_id and action required');

      const bid = await query('SELECT * FROM campaign_bids WHERE id = $1', [bid_id]);
      if (!bid.rows[0]) return notFound(res);

      const campaign = await query('SELECT * FROM campaigns WHERE id = $1', [bid.rows[0].campaign_id]);
      if (!campaign.rows[0]) return notFound(res);

      const isBrandOwner = String(campaign.rows[0].brand_id) === String(userId);
      const isBidOwner = String(bid.rows[0].creator_id) === String(userId);

      if (!isBrandOwner && !isBidOwner) return unauthorized(res);

      if (action === 'accept') {
        if (!isBrandOwner) return bad(res, 'Only the brand can accept bids');
        await query("UPDATE campaign_bids SET status = 'accepted', updated_at = NOW() WHERE id = $1", [bid_id]);
        await query("UPDATE campaign_bids SET status = 'rejected', updated_at = NOW() WHERE campaign_id = $1 AND id != $2 AND status = 'pending'",
          [bid.rows[0].campaign_id, bid_id]);
        const invite = await query(
          `INSERT INTO campaign_invites (campaign_id, creator_id, status)
           VALUES ($1, $2, 'pending') ON CONFLICT (campaign_id, creator_id)
           DO UPDATE SET status = 'pending', updated_at = NOW() RETURNING *`,
          [bid.rows[0].campaign_id, bid.rows[0].creator_id]
        );
        return ok(res, { message: 'Bid accepted, invite created', invite: invite.rows[0] });
      }

      if (action === 'reject') {
        if (!isBrandOwner) return bad(res, 'Only the brand can reject bids');
        await query("UPDATE campaign_bids SET status = 'rejected', updated_at = NOW() WHERE id = $1", [bid_id]);
        return ok(res, { message: 'Bid rejected' });
      }

      if (action === 'withdraw') {
        if (!isBidOwner) return bad(res, 'Only the bidder can withdraw');
        await query("UPDATE campaign_bids SET status = 'withdrawn', updated_at = NOW() WHERE id = $1", [bid_id]);
        return ok(res, { message: 'Bid withdrawn' });
      }

      return bad(res, 'Invalid action. Use: accept, reject, withdraw');
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Bids error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
