import type { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const backendAvailable = false;

function ok(data: any) { return { status: 200, data }; }
function created(data: any) { return { status: 201, data }; }
function bad(msg: string) { return { status: 400, data: { error: msg } }; }
function notFound() { return { status: 404, data: { error: 'Not found' } }; }
function unauthorized() { return { status: 401, data: { error: 'Unauthorized' } }; }

function respond(res: NextApiResponse, result: { status: number; data: any }) {
  return res.status(result.status).json(result.data);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path, ...queryParams } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : (path ?? '');
  const cookie = req.headers.cookie || '';
  const sessionUser = await getSessionUserId(cookie);

  if (!sessionUser) return respond(res, unauthorized());
  const userId = sessionUser;

  if (backendAvailable) {
    try {
      const url = new URL(`${BACKEND_URL}/api/v1/business-profiles/${pathStr}`);
      Object.entries(queryParams).forEach(([k, v]) => { if (typeof v === 'string') url.searchParams.set(k, v); });
      const body = req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined;
      const backendRes = await fetch(url.toString(), {
        method: req.method,
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body,
      });
      const data = backendRes.headers.get('content-type')?.includes('application/json')
        ? await backendRes.json() : await backendRes.text();
      const setCookie = backendRes.headers.get('set-cookie');
      if (setCookie) res.setHeader('Set-Cookie', setCookie);
      return res.status(backendRes.status).json(data);
    } catch { /* fall through */ }
  }

  const parts = pathStr.split('/');
  const resourceId = parts[0];
  const subResource = parts[1];
  const subId = parts[2];
  const action = parts[3];

  // ── Profiles ──

  if (req.method === 'GET' && !pathStr) {
    const rows = await query('SELECT * FROM business_profiles WHERE account_id = $1', [userId]);
    return respond(res, ok({ profiles: rows.rows }));
  }

  if (req.method === 'GET' && pathStr === 'mine') {
    const profile = await queryOne('SELECT * FROM business_profiles WHERE account_id = $1', [userId]);
    return profile ? respond(res, ok(profile)) : respond(res, notFound());
  }

  if (req.method === 'POST' && !pathStr) {
    const body = req.body;
    if (!body || !body.businessName) return respond(res, bad('businessName is required'));
    const existing = await queryOne('SELECT id FROM business_profiles WHERE account_id = $1', [userId]);
    if (existing) return respond(res, bad('Profile already exists'));
    const profileId = `biz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await query(
      `INSERT INTO business_profiles (id, account_id, business_name, logo_url, cover_image_url, description, address, city, state, country, google_maps_url, contact_phone, contact_email, website, social_links, venue_photos, capacity, parking_info, amenities, dress_code_default, age_restriction_default, venue_policies, music_preferences, default_tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
      [profileId, userId, body.businessName, body.logoUrl || null, body.coverImageUrl || null,
       body.description || '', body.address || '', body.city || '', body.state || '', body.country || '',
       body.googleMapsUrl || '', body.contactPhone || '', body.contactEmail || '', body.website || '',
       JSON.stringify(body.socialLinks || []), JSON.stringify(body.venuePhotos || []),
       body.capacity || 0, body.parkingInfo || '', JSON.stringify(body.amenities || []),
       body.dressCodeDefault || '', body.ageRestrictionDefault || 0, body.venuePolicies || '',
       JSON.stringify(body.musicPreferences || []), JSON.stringify(body.defaultTags || [])]
    );
    const profile = await queryOne('SELECT * FROM business_profiles WHERE id = $1', [profileId]);
    return respond(res, created(profile));
  }

  if (req.method === 'GET' && resourceId && !subResource) {
    const profile = await queryOne('SELECT * FROM business_profiles WHERE id = $1', [resourceId]);
    return profile ? respond(res, ok(profile)) : respond(res, notFound());
  }

  if (req.method === 'PUT' && resourceId && !subResource) {
    const existing = await queryOne('SELECT * FROM business_profiles WHERE id = $1', [resourceId]);
    if (!existing) return respond(res, notFound());
    const body = req.body;
    const fields: string[] = []; const vals: any[] = []; let idx = 1;
    for (const [key, val] of Object.entries(body)) {
      if (key === 'id' || key === 'account_id' || key === 'created_at') continue;
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${col} = $${idx++}`);
      vals.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
    }
    if (fields.length > 0) {
      vals.push(resourceId);
      await query(`UPDATE business_profiles SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx}`, vals);
    }
    const updated = await queryOne('SELECT * FROM business_profiles WHERE id = $1', [resourceId]);
    return respond(res, ok(updated));
  }

  // ── Templates ──

  if (req.method === 'GET' && resourceId && subResource === 'templates' && !subId) {
    const rows = await query('SELECT * FROM event_templates WHERE business_profile_id = $1 ORDER BY sort_order', [resourceId]);
    return respond(res, ok({ templates: rows.rows }));
  }

  if (req.method === 'POST' && resourceId && subResource === 'templates' && !subId) {
    const body = req.body;
    if (!body || !body.name) return respond(res, bad('name is required'));
    const tmplId = `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await query(
      `INSERT INTO event_templates (id, business_profile_id, name, description, category, is_recurring, recurrence_type, recurrence_config, template_data, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [tmplId, resourceId, body.name, body.description || '', body.category || '',
       body.isRecurring || false, body.recurrenceType || '', JSON.stringify(body.recurrenceConfig || {}),
       JSON.stringify(body.templateData || {}), body.sortOrder || 0]
    );
    const tmpl = await queryOne('SELECT * FROM event_templates WHERE id = $1', [tmplId]);
    return respond(res, created(tmpl));
  }

  if (pathStr.startsWith('templates/')) {
    const tmplId = pathStr.replace('templates/', '');
    const tmpl = await queryOne('SELECT * FROM event_templates WHERE id = $1', [tmplId]);
    if (!tmpl) return respond(res, notFound());

    if (req.method === 'GET' && !parts[2]) {
      return respond(res, ok(tmpl));
    }
    if (req.method === 'PUT' && !parts[2]) {
      const body = req.body;
      const fields: string[] = []; const vals: any[] = []; let idx = 1;
      for (const [key, val] of Object.entries(body)) {
        if (key === 'id' || key === 'created_at') continue;
        const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${col} = $${idx++}`);
        vals.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
      }
      if (fields.length > 0) {
        vals.push(tmplId);
        await query(`UPDATE event_templates SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx}`, vals);
      }
      const updated = await queryOne('SELECT * FROM event_templates WHERE id = $1', [tmplId]);
      return respond(res, ok(updated));
    }
    if (req.method === 'DELETE' && !parts[2]) {
      await query('DELETE FROM event_templates WHERE id = $1', [tmplId]);
      return res.status(204).end();
    }
    if (req.method === 'POST' && parts[2] === 'use') {
      await query('UPDATE event_templates SET use_count = use_count + 1, last_used_at = now() WHERE id = $1', [tmplId]);
      const updated = await queryOne('SELECT * FROM event_templates WHERE id = $1', [tmplId]);
      return respond(res, ok({ template: updated }));
    }
  }

  // ── Promoters ──

  if (req.method === 'GET' && pathStr === 'promoters') {
    const profile = await queryOne('SELECT id FROM business_profiles WHERE account_id = $1', [userId]);
    if (!profile) return respond(res, bad('No business profile'));
    const rows = await query('SELECT * FROM promoters WHERE business_profile_id = $1', [profile.id]);
    return respond(res, ok({ promoters: rows.rows }));
  }

  if (req.method === 'POST' && pathStr === 'promoters') {
    const body = req.body;
    if (!body || !body.name) return respond(res, bad('name is required'));
    const profile = await queryOne('SELECT id FROM business_profiles WHERE account_id = $1', [userId]);
    if (!profile) return respond(res, bad('No business profile'));
    const promId = `promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await query(
      `INSERT INTO promoters (id, business_profile_id, account_id, name, email, phone, promoter_type, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [promId, profile.id, body.accountId || null, body.name, body.email || '', body.phone || '',
       body.promoterType || 'individual', 'active', body.notes || '']
    );
    const promoter = await queryOne('SELECT * FROM promoters WHERE id = $1', [promId]);
    return respond(res, created(promoter));
  }

  if (req.method === 'POST' && pathStr === 'promoters/search') {
    const { query: searchQuery } = req.body || {};
    const results = [
      { id: 'user-1', name: 'Rahul Sharma', handle: '@rahul', type: 'influencer', followers: 15000 },
      { id: 'user-2', name: 'Maya Singh', handle: '@maya', type: 'creator', followers: 8000 },
      { id: 'user-3', name: 'Arjun Patel', handle: '@arjun', type: 'individual', followers: 1200 },
      { id: 'user-4', name: 'Priya Kapoor', handle: '@priya', type: 'student_ambassador', followers: 3000 },
      { id: 'user-5', name: 'Vikram Raj', handle: '@vikram', type: 'club_promoter', followers: 25000 },
    ];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return respond(res, ok({ results: results.filter(r => r.name.toLowerCase().includes(q) || r.handle.toLowerCase().includes(q)) }));
    }
    return respond(res, ok({ results }));
  }

  if (pathStr.startsWith('promoters/') && !pathStr.includes('/')) {
    const promoterId = pathStr.replace('promoters/', '');
    const promoter = await queryOne('SELECT * FROM promoters WHERE id = $1', [promoterId]);
    if (!promoter) return respond(res, notFound());

    if (req.method === 'GET') return respond(res, ok(promoter));
    if (req.method === 'PUT') {
      const body = req.body;
      const fields: string[] = []; const vals: any[] = []; let idx = 1;
      for (const [key, val] of Object.entries(body)) {
        if (key === 'id' || key === 'created_at') continue;
        const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${col} = $${idx++}`);
        vals.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
      }
      if (fields.length > 0) {
        vals.push(promoterId);
        await query(`UPDATE promoters SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx}`, vals);
      }
      const updated = await queryOne('SELECT * FROM promoters WHERE id = $1', [promoterId]);
      return respond(res, ok(updated));
    }
  }

  if (pathStr.startsWith('promoters/')) {
    const promoterId = parts[1];
    const actionOp = parts[2];
    const promoter = await queryOne('SELECT * FROM promoters WHERE id = $1', [promoterId]);
    if (!promoter) return respond(res, notFound());

    if (actionOp === 'suspend') {
      await query("UPDATE promoters SET status = 'suspended', updated_at = now() WHERE id = $1", [promoterId]);
      const updated = await queryOne('SELECT * FROM promoters WHERE id = $1', [promoterId]);
      return respond(res, ok(updated));
    }
    if (actionOp === 'approve') {
      await query("UPDATE promoters SET status = 'active', updated_at = now() WHERE id = $1", [promoterId]);
      const updated = await queryOne('SELECT * FROM promoters WHERE id = $1', [promoterId]);
      return respond(res, ok(updated));
    }
    if (actionOp === 'commission') {
      const body = req.body;
      const existing = await queryOne('SELECT * FROM commissions WHERE promoter_id = $1 AND event_id IS NULL', [promoterId]);
      const commId = existing?.id || `comm-${Date.now()}`;
      if (existing) {
        await query(
          `UPDATE commissions SET commission_type = $1, fixed_amount_cents = $2, percentage_rate = $3, tier_config = $4, max_payout_cents = $5, requires_approval = $6, updated_at = now() WHERE id = $7`,
          [body.commissionType || 'percentage', body.fixedAmountCents || 0, body.percentageRate || 0,
           JSON.stringify(body.tierConfig || []), body.maxPayoutCents || 0, body.requiresApproval || false, commId]
        );
      } else {
        await query(
          `INSERT INTO commissions (id, promoter_id, commission_type, fixed_amount_cents, percentage_rate, tier_config, max_payout_cents, requires_approval) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [commId, promoterId, body.commissionType || 'percentage', body.fixedAmountCents || 0,
           body.percentageRate || 0, JSON.stringify(body.tierConfig || []), body.maxPayoutCents || 0, body.requiresApproval || false]
        );
      }
      const comm = await queryOne('SELECT * FROM commissions WHERE id = $1', [commId]);
      return respond(res, ok(comm));
    }
  }

  // ── Referral Links ──

  if (req.method === 'POST' && pathStr === 'referral-links') {
    const { promoterId, eventId } = req.body || {};
    if (!promoterId || !eventId) return respond(res, bad('promoterId and eventId required'));
    const code = `ref-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const linkId = `rl-${Date.now()}`;
    await query(
      `INSERT INTO referral_links (id, promoter_id, event_id, referral_code, referral_url, promo_code) VALUES ($1,$2,$3,$4,$5,$6)`,
      [linkId, promoterId, eventId, code, `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/r/${code}`, '']
    );
    const link = await queryOne('SELECT * FROM referral_links WHERE id = $1', [linkId]);
    return respond(res, created(link));
  }

  if (pathStr.startsWith('referral-links/promoter/')) {
    const pid = pathStr.replace('referral-links/promoter/', '');
    const rows = await query('SELECT * FROM referral_links WHERE promoter_id = $1', [pid]);
    return respond(res, ok({ links: rows.rows }));
  }

  if (pathStr.startsWith('referral-links/')) {
    const code = pathStr.replace('referral-links/', '');
    const link = await queryOne('SELECT * FROM referral_links WHERE referral_code = $1', [code]);
    if (link) {
      await query('UPDATE referral_links SET unique_clicks = unique_clicks + 1 WHERE id = $1', [link.id]);
      return respond(res, ok(link));
    }
    return respond(res, notFound());
  }

  // ── Commissions ──

  if (pathStr.startsWith('commissions/promoter/')) {
    const pid = pathStr.replace('commissions/promoter/', '');
    const rows = await query('SELECT * FROM commissions WHERE promoter_id = $1', [pid]);
    return respond(res, ok({ commissions: rows.rows }));
  }

  if (pathStr.startsWith('commissions/')) {
    const cid = pathStr.replace('commissions/', '');
    if (req.method === 'PUT') {
      const body = req.body;
      const existing = await queryOne('SELECT * FROM commissions WHERE id = $1', [cid]);
      if (!existing) return respond(res, notFound());
      await query(
        `UPDATE commissions SET commission_type = $1, fixed_amount_cents = $2, percentage_rate = $3, tier_config = $4, max_payout_cents = $5, requires_approval = $6, updated_at = now() WHERE id = $7`,
        [body.commissionType || existing.commission_type, body.fixedAmountCents ?? existing.fixed_amount_cents,
         body.percentageRate ?? existing.percentage_rate, JSON.stringify(body.tierConfig || existing.tier_config),
         body.maxPayoutCents ?? existing.max_payout_cents, body.requiresApproval ?? existing.requires_approval, cid]
      );
      const updated = await queryOne('SELECT * FROM commissions WHERE id = $1', [cid]);
      return respond(res, ok(updated));
    }
  }

  if (req.method === 'POST' && pathStr === 'commissions/calculate') {
    const { priceCents, commissionType, percentageRate, fixedAmountCents, tierConfig, ticketNumber } = req.body || {};
    let commissionCents = 0;
    if (commissionType === 'percentage') {
      commissionCents = Math.round((priceCents * (percentageRate || 0)) / 100);
    } else if (commissionType === 'fixed') {
      commissionCents = fixedAmountCents || 0;
    } else if (commissionType === 'tiered' && tierConfig) {
      const sorted = [...tierConfig].sort((a: any, b: any) => b.minTickets - a.minTickets);
      const tier = sorted.find((t: any) => (ticketNumber || 0) >= t.minTickets);
      commissionCents = tier ? Math.round((priceCents * tier.rate) / 100) : 0;
    }
    return respond(res, ok({ commissionCents, venueReceivesCents: priceCents - commissionCents }));
  }

  // ── Payouts ──

  if (req.method === 'GET' && pathStr === 'payouts') {
    const profile = await queryOne('SELECT id FROM business_profiles WHERE account_id = $1', [userId]);
    if (!profile) return respond(res, ok({ payouts: [] }));
    const rows = await query('SELECT * FROM payouts WHERE business_profile_id = $1', [profile.id]);
    return respond(res, ok({ payouts: rows.rows }));
  }

  if (pathStr.startsWith('payouts/') && parts[2] === 'request') {
    const pi = parts[1];
    const payout = await queryOne('SELECT * FROM payouts WHERE id = $1', [pi]);
    if (!payout) return respond(res, notFound());
    await query("UPDATE payouts SET status = 'processing', updated_at = now() WHERE id = $1", [pi]);
    const updated = await queryOne('SELECT * FROM payouts WHERE id = $1', [pi]);
    return respond(res, ok(updated));
  }

  // ── Dashboards ──

  if (req.method === 'GET' && pathStr === 'host-dashboard') {
    const profile = await queryOne('SELECT * FROM business_profiles WHERE account_id = $1', [userId]);
    if (!profile) return respond(res, bad('No business profile'));
    const activePromoters = await query("SELECT * FROM promoters WHERE business_profile_id = $1 AND status = 'active'", [profile.id]);
    const topPromoters = await Promise.all(activePromoters.rows.map(async (p: any) => {
      const links = await query('SELECT * FROM referral_links WHERE promoter_id = $1', [p.id]);
      const totalSales = links.rows.reduce((s: number, r: any) => s + (r.ticket_sales || 0), 0);
      const totalRevenue = links.rows.reduce((s: number, r: any) => s + (r.revenue_cents || 0), 0);
      const totalClicks = links.rows.reduce((s: number, r: any) => s + (r.unique_clicks || 0), 0);
      return {
        promoterId: p.id, name: p.name, promoterType: p.promoter_type,
        ticketSales: totalSales, revenueCents: totalRevenue,
        clicks: totalClicks,
        conversionRate: totalClicks > 0 ? Math.round((totalSales / totalClicks) * 100) : 0,
        commissionEarnedCents: Math.round(totalRevenue * 0.1),
      };
    }));
    topPromoters.sort((a, b) => b.ticketSales - a.ticketSales);

    return respond(res, ok({
      totalTicketSales: topPromoters.reduce((s: number, p: any) => s + p.ticketSales, 0),
      totalRevenueCents: topPromoters.reduce((s: number, p: any) => s + p.revenueCents, 0),
      totalFees: 0,
      totalCommissions: topPromoters.reduce((s: number, p: any) => s + p.commissionEarnedCents, 0),
      netRevenueCents: topPromoters.reduce((s: number, p: any) => s + p.revenueCents, 0),
      uniqueAttendees: 0,
      repeatAttendees: 0,
      activePromoters: activePromoters.rows.length,
      upcomingEvents: 0,
      topPromoters,
      recentPayouts: [],
    }));
  }

  if (req.method === 'GET' && pathStr === 'promoter-dashboard') {
    const myPromoters = await query("SELECT * FROM promoters WHERE status = 'active' LIMIT 1");
    if (myPromoters.rows.length === 0) {
      return respond(res, ok({
        totalTicketsSold: 0, totalEarningsCents: 0, pendingEarningsCents: 0,
        paidOutCents: 0, totalClicks: 0, conversionRate: 0,
        activeReferralLinks: [], upcomingEvents: [],
        leaderboardRank: 1, leaderboardTotal: 1,
      }));
    }
    const p = myPromoters.rows[0];
    const links = await query('SELECT * FROM referral_links WHERE promoter_id = $1', [p.id]);
    const totalTickets = links.rows.reduce((s: number, r: any) => s + (r.ticket_sales || 0), 0);
    const totalClicks = links.rows.reduce((s: number, r: any) => s + (r.unique_clicks || 0), 0);
    const totalRevenue = links.rows.reduce((s: number, r: any) => s + (r.revenue_cents || 0), 0);
    return respond(res, ok({
      totalTicketsSold: totalTickets,
      totalEarningsCents: Math.round(totalRevenue * 0.1),
      pendingEarningsCents: Math.round(totalRevenue * 0.05),
      paidOutCents: Math.round(totalRevenue * 0.05),
      totalClicks,
      conversionRate: totalClicks > 0 ? Math.round((totalTickets / totalClicks) * 100) : 0,
      activeReferralLinks: links.rows,
      upcomingEvents: [],
      leaderboardRank: 1,
      leaderboardTotal: 3,
    }));
  }

  return respond(res, notFound());
}
