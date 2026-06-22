import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getSessionUserId, getAccountId } from '@/lib/session';

const ok = (r: NextApiResponse, d: any) => r.status(200).json(d);
const bad = (r: NextApiResponse, m: string) => r.status(400).json({ error: m });
const notFound = (r: NextApiResponse) => r.status(404).json({ error: 'Not found' });
const unauthorized = (r: NextApiResponse) => r.status(401).json({ error: 'Unauthorized' });
const serverError = (r: NextApiResponse, m: string) => r.status(500).json({ error: m });

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) DEFAULT 'no_delivery'`);
  await query(`CREATE TABLE IF NOT EXISTS delivery_tracking (
    id SERIAL PRIMARY KEY,
    deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    delivery_type VARCHAR(50) NOT NULL,
    brand_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    creator_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending_brand',
    access_link TEXT DEFAULT '',
    license_key TEXT DEFAULT '',
    coupon_code TEXT DEFAULT '',
    login_credentials TEXT DEFAULT '',
    courier_company VARCHAR(200) DEFAULT '',
    tracking_number VARCHAR(200) DEFAULT '',
    shipment_date TIMESTAMP,
    product_value DECIMAL(12,2) DEFAULT 0,
    product_list TEXT DEFAULT '',
    shipping_notes TEXT DEFAULT '',
    courier_receipt_url TEXT DEFAULT '',
    shipping_screenshot_url TEXT DEFAULT '',
    upload_screenshot_url TEXT DEFAULT '',
    unboxing_photo_url TEXT DEFAULT '',
    product_photo_url TEXT DEFAULT '',
    creator_confirmed_at TIMESTAMP,
    brand_confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`);
  await query('CREATE INDEX IF NOT EXISTS idx_delivery_tracking_deal ON delivery_tracking(deal_id)');
  schemaReady = true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookie = req.headers.cookie || '';
  const sessionUser = await getSessionUserId(cookie);
  const accountId = await getAccountId(cookie);
  if (!sessionUser || !accountId) return unauthorized(res);

  try {
    await ensureSchema();

    const { dealId } = req.query;
    const dealIdNum = dealId ? parseInt(dealId as string) : null;

    if (req.method === 'GET') {
      if (!dealIdNum) return bad(res, 'dealId required');
      const track = await query(
        'SELECT * FROM delivery_tracking WHERE deal_id = $1',
        [dealIdNum]
      );
      return ok(res, { delivery: track.rows[0] || null });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body.deal_id) return bad(res, 'deal_id required');

      const deal = await query(
        'SELECT brand_id, creator_id, delivery_type FROM deals WHERE id = $1',
        [body.deal_id]
      );
      if (!deal.rows[0]) return bad(res, 'Deal not found');
      if (Number(deal.rows[0].brand_id) !== Number(accountId)) return bad(res, 'Only brand can set up delivery');

      const dType = deal.rows[0].delivery_type || 'no_delivery';

      const existing = await query('SELECT id FROM delivery_tracking WHERE deal_id = $1', [body.deal_id]);
      if (existing.rows[0]) return bad(res, 'Delivery tracking already exists for this deal');

      const r = await query(`INSERT INTO delivery_tracking
        (deal_id, delivery_type, brand_id, creator_id, status) VALUES ($1,$2,$3,$4,'pending_brand') RETURNING *`,
        [body.deal_id, dType, deal.rows[0].brand_id, deal.rows[0].creator_id]);
      return ok(res, { delivery: r.rows[0] });
    }

    if (req.method === 'PATCH') {
      if (!dealIdNum) return bad(res, 'dealId required');
      const b = req.body;

      const track = await query('SELECT * FROM delivery_tracking WHERE deal_id = $1', [dealIdNum]);
      if (!track.rows[0]) return notFound(res);

      const deal = await query('SELECT brand_id, creator_id FROM deals WHERE id = $1', [dealIdNum]);
      if (!deal.rows[0]) return bad(res, 'Deal not found');

      const sets: string[] = [];
      const params: any[] = [];
      let p = 1;

      if (b.access_link !== undefined) { sets.push(`access_link = $${p++}`); params.push(b.access_link); }
      if (b.license_key !== undefined) { sets.push(`license_key = $${p++}`); params.push(b.license_key); }
      if (b.coupon_code !== undefined) { sets.push(`coupon_code = $${p++}`); params.push(b.coupon_code); }
      if (b.login_credentials !== undefined) { sets.push(`login_credentials = $${p++}`); params.push(b.login_credentials); }
      if (b.courier_company !== undefined) { sets.push(`courier_company = $${p++}`); params.push(b.courier_company); }
      if (b.tracking_number !== undefined) { sets.push(`tracking_number = $${p++}`); params.push(b.tracking_number); }
      if (b.shipment_date !== undefined) { sets.push(`shipment_date = $${p++}`); params.push(b.shipment_date ? new Date(b.shipment_date) : null); }
      if (b.product_value !== undefined) { sets.push(`product_value = $${p++}`); params.push(b.product_value); }
      if (b.product_list !== undefined) { sets.push(`product_list = $${p++}`); params.push(b.product_list); }
      if (b.shipping_notes !== undefined) { sets.push(`shipping_notes = $${p++}`); params.push(b.shipping_notes); }
      if (b.courier_receipt_url !== undefined) { sets.push(`courier_receipt_url = $${p++}`); params.push(b.courier_receipt_url); }
      if (b.shipping_screenshot_url !== undefined) { sets.push(`shipping_screenshot_url = $${p++}`); params.push(b.shipping_screenshot_url); }
      if (b.upload_screenshot_url !== undefined) { sets.push(`upload_screenshot_url = $${p++}`); params.push(b.upload_screenshot_url); }
      if (b.unboxing_photo_url !== undefined) { sets.push(`unboxing_photo_url = $${p++}`); params.push(b.unboxing_photo_url); }
      if (b.product_photo_url !== undefined) { sets.push(`product_photo_url = $${p++}`); params.push(b.product_photo_url); }

      if (b.status === 'digital_access_provided' || b.status === 'product_shipped') {
        if (Number(deal.rows[0].brand_id) !== Number(accountId)) return bad(res, 'Only brand can mark this status');
        sets.push(`status = $${p++}`); params.push(b.status);
        sets.push(`brand_confirmed_at = $${p++}`); params.push(new Date());
      }

      if (b.status === 'digital_access_confirmed' || b.status === 'product_received') {
        if (Number(deal.rows[0].creator_id) !== Number(accountId)) return bad(res, 'Only creator can confirm receipt');
        sets.push(`status = $${p++}`); params.push(b.status);
        sets.push(`creator_confirmed_at = $${p++}`); params.push(new Date());
      }

      if (sets.length === 0) return bad(res, 'No fields to update');
      sets.push('updated_at = NOW()');
      params.push(dealIdNum);

      const r = await query(`UPDATE delivery_tracking SET ${sets.join(', ')} WHERE deal_id = $${p} RETURNING *`, params);

      if (b.status === 'digital_access_provided' || b.status === 'product_shipped') {
        await query(`UPDATE deals SET phase = $2 WHERE id = $1`,
          [dealIdNum, b.status === 'digital_access_provided' ? 'digital_access_provided' : 'product_shipped']);
      }
      if (b.status === 'digital_access_confirmed') {
        await query(`UPDATE deals SET phase = 'funded' WHERE id = $1 AND phase = 'digital_access_provided'`, [dealIdNum]);
      }
      if (b.status === 'product_received') {
        await query(`UPDATE deals SET phase = 'funded' WHERE id = $1 AND phase = 'product_shipped'`, [dealIdNum]);
      }

      return ok(res, { delivery: r.rows[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Delivery tracking error:', err);
    return serverError(res, err.message || 'Server error');
  }
}
