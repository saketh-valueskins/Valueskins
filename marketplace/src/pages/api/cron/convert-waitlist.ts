import type { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { query, transaction } = await import('@/lib/db');

    const events = await query(
      `SELECT DISTINCT e.id FROM events e
       INNER JOIN event_waitlist_entries w ON w.event_id = e.id AND w.status = 'waiting'
       WHERE e.status = 'published' AND e.ticket_sales_end_date > NOW()`
    );

    let totalConverted = 0;
    for (const ev of events.rows) {
      let converted = 0;
      await transaction(async (client: any) => {
        const waiting = await client.query(
          `SELECT w.* FROM event_waitlist_entries w
           WHERE w.event_id = $1 AND w.status = 'waiting'
           ORDER BY w.created_at ASC LIMIT 5`,
          [ev.id]
        );

        if (waiting.rows.length === 0) return;

        const avail = await client.query(
          `SELECT tt.id as tier_id,
                  (tt.quantity - COALESCE(sold.c, 0)) as available
           FROM event_ticket_tiers tt
           LEFT JOIN (SELECT COALESCE(tier_id::int, 0) as tid, COUNT(*) as c FROM tickets WHERE event_id = $1 AND status = 'active' GROUP BY tier_id) sold ON sold.tid = tt.id
           WHERE tt.event_id = $1`,
          [ev.id]
        );

        for (const entry of waiting.rows) {
          const tier = avail.rows.find((a: any) => entry.tier_id ? a.tier_id === entry.tier_id : true);
          if (!tier || tier.available <= 0) continue;

          const ticketCode = 'WC-' + crypto.randomUUID().slice(0, 8).toUpperCase();
          await client.query(
            `INSERT INTO tickets (event_id, user_id, ticket_type, ticket_code, price_cents, status, tier_id)
             VALUES ($1, $2, 'waitlist-conversion', $3, 0, 'active', $4)`,
            [ev.id, entry.user_id, ticketCode, entry.tier_id || tier.tier_id]
          );
          await client.query(
            `UPDATE event_waitlist_entries SET status = 'converted', converted_at = NOW() WHERE id = $1`,
            [entry.id]
          );
          converted++;
        }
      });

      totalConverted += converted;
    }

    return res.status(200).json({ converted: totalConverted, eventsProcessed: events.rows.length });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export default handler;
