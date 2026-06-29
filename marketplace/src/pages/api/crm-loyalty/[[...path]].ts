import type { NextApiRequest, NextApiResponse } from 'next';
import { query, queryOne } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = Array.isArray(req.query.path) ? req.query.path : [];
  const [resource, ...rest] = path;

  if (!resource) return res.status(400).json({ error: 'No resource specified' });

  const accountId = parseInt(rest[0]) || 1;

  switch (resource) {
    case 'points': {
      if (req.method === 'GET') {
        const balance = await queryOne('SELECT balance FROM loyalty_points WHERE account_id = $1', [accountId]);
        const historyRows = await query(
          'SELECT * FROM loyalty_points_history WHERE account_id = $1 ORDER BY created_at DESC LIMIT 50',
          [accountId]
        );
        return res.json({
          accountId,
          points: balance?.balance || 0,
          history: historyRows.rows.map(r => ({
            points: r.points,
            reason: r.reason,
            referenceType: r.reference_type,
            referenceId: r.reference_id,
            createdAt: r.created_at?.toISOString() || '',
          })),
        });
      }
      if (req.method === 'POST') {
        const { points, reason, referenceType, referenceId } = req.body;
        await query(
          `INSERT INTO loyalty_points (account_id, balance) VALUES ($1, $2)
           ON CONFLICT (account_id) DO UPDATE SET balance = loyalty_points.balance + $2, updated_at = now()`,
          [accountId, points]
        );
        await query(
          `INSERT INTO loyalty_points_history (account_id, points, reason, reference_type, reference_id) VALUES ($1, $2, $3, $4, $5)`,
          [accountId, points, reason || '', referenceType || null, referenceId || null]
        );
        const updated = await queryOne('SELECT balance FROM loyalty_points WHERE account_id = $1', [accountId]);
        return res.json({ success: true, balance: updated?.balance || 0 });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    case 'streaks': {
      const s = await queryOne('SELECT * FROM loyalty_points_history WHERE account_id = $1 ORDER BY created_at DESC LIMIT 1', [accountId]);
      return res.json({
        accountId,
        currentStreak: 0,
        longestStreak: 0,
        lastEventDate: s?.created_at?.toISOString() || null,
      });
    }

    case 'vip': {
      const v = await queryOne('SELECT * FROM vip_tiers WHERE account_id = $1', [accountId]);
      return res.json({
        accountId,
        tier: v?.tier || 'bronze',
        pointsThreshold: v?.points_threshold || 0,
      });
    }

    case 'badges': {
      const b = await query('SELECT * FROM badges WHERE account_id = $1', [accountId]);
      return res.json({
        accountId,
        badges: b.rows.map(r => ({
          name: r.name,
          description: r.description,
          icon: r.icon,
          awardedAt: r.awarded_at?.toISOString() || '',
        })),
      });
    }

    case 'leaderboard': {
      const lb = await query(
        'SELECT account_id, balance FROM loyalty_points ORDER BY balance DESC LIMIT 10'
      );
      return res.json({
        leaderboard: lb.rows.map(r => ({ accountId: r.account_id, points: Number(r.balance) })),
      });
    }

    default:
      return res.status(404).json({ error: `Unknown resource: ${resource}` });
  }
}
