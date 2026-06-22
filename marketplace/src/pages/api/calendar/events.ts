import { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionToken = req.cookies.valueskins_session;
  const session = await queryOne('SELECT user_id FROM auth_sessions WHERE id = $1 AND is_active = true AND expires_at > NOW()', [sessionToken || '']);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user_id;

  if (req.method === 'POST') {
    const { deal_id, event_type, title, description, event_date, all_day } = req.body;
    if (!title || !event_date || !event_type) {
      return res.status(400).json({ error: 'title, event_date, event_type required' });
    }

    try {
      const event = await queryOne(
        `INSERT INTO calendar_events (user_id, deal_id, event_type, title, description, event_date, all_day)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [userId, deal_id || null, event_type, title, description || null, event_date, all_day || false]
      );

      await query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
        [userId, `Reminder: ${title}`, description || '', 'calendar']
      );

      return res.status(200).json({ event });
    } catch { return res.status(500).json({ error: 'Failed to create event' }); }
  }

  if (req.method === 'GET') {
    const { deal_id } = req.query;
    try {
      let result;
      if (deal_id) {
        result = await query(
          'SELECT * FROM calendar_events WHERE user_id = $1 AND deal_id = $2 ORDER BY event_date ASC',
          [userId, deal_id]
        );
      } else {
        result = await query(
          'SELECT * FROM calendar_events WHERE user_id = $1 AND event_date >= NOW() - INTERVAL \'7 days\' ORDER BY event_date ASC LIMIT 50',
          [userId]
        );
      }
      return res.status(200).json({ events: result.rows });
    } catch { return res.status(500).json({ error: 'Failed to fetch events' }); }
  }

  if (req.method === 'DELETE') {
    const { event_id } = req.body;
    if (!event_id) return res.status(400).json({ error: 'event_id required' });

    try {
      await query('DELETE FROM calendar_events WHERE id = $1 AND user_id = $2', [event_id, userId]);
      return res.status(200).json({ success: true });
    } catch { return res.status(500).json({ error: 'Failed to delete event' }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
