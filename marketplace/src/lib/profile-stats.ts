import { query } from '@/lib/db';

// Track Record stats for the profile page (ui-specs/phase-2/Profile page.md §5).
//
// Every number here is COMPUTED from completed deals — the spec is explicit that
// these are "earned automatically from completed deals" and can never be edited
// or bought, so nothing in this file reads a user-writable column.
//
// Sources:
//   deals          -> creator_id, brand_id, status/phase, completed_at, posting_deadline
//   deal_reviews   -> rating (1-5) left by the counterparty
//   deal_messages  -> sender_id, created_at (used for reply latency)

export interface ProfileStats {
  deals_completed: number;
  deals_this_month: number;
  avg_rating: number;
  repeat_rate: number;
  on_time_rate: number;
  avg_response_hours: number;
  trust_score: number;
  rated_by: number;
}

export const EMPTY_STATS: ProfileStats = {
  deals_completed: 0,
  deals_this_month: 0,
  avg_rating: 0,
  repeat_rate: 0,
  on_time_rate: 0,
  avg_response_hours: 0,
  trust_score: 0,
  rated_by: 0,
};

/**
 * Trust score — a composite of the three signals a brand actually cares about,
 * weighted toward delivery. Documented here rather than hidden in SQL so the
 * weighting can be argued with:
 *
 *   40%  on-time delivery
 *   40%  average rating (normalised to a percentage)
 *   20%  repeat-client rate
 *
 * A creator with no completed deals scores 0 — the score is earned, not granted.
 * See phase-2/flagged.md P2-F6: the weighting is ours, not from Project.md.
 */
export function computeTrustScore(input: {
  onTimeRate: number;
  avgRating: number;
  repeatRate: number;
  dealsCompleted: number;
}): number {
  if (input.dealsCompleted <= 0) return 0;
  const ratingPct = (input.avgRating / 5) * 100;
  return Math.round(0.4 * input.onTimeRate + 0.4 * ratingPct + 0.2 * input.repeatRate);
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  try {
    const result = await query(
      `
      WITH completed AS (
        SELECT d.id::text AS id,
               d.brand_id::text AS brand_id,
               d.completed_at,
               d.posting_deadline
        FROM deals d
        WHERE d.creator_id::text = $1
          AND (d.status = 'completed' OR d.phase = 'completed')
      ),
      per_brand AS (
        SELECT brand_id, COUNT(*) AS deal_count
        FROM completed
        WHERE brand_id IS NOT NULL
        GROUP BY brand_id
      )
      SELECT
        (SELECT COUNT(*) FROM completed) AS deals_completed,

        (SELECT COUNT(*) FROM completed
          WHERE completed_at >= NOW() - INTERVAL '30 days') AS deals_this_month,

        -- rating left BY the counterparty, never self-reviews
        (SELECT COALESCE(ROUND(AVG(dr.rating)::numeric, 1), 0)
           FROM deal_reviews dr
           JOIN completed c ON dr.deal_id = c.id
          WHERE dr.reviewer_id::text <> $1) AS avg_rating,

        (SELECT COUNT(*) FROM deal_reviews dr
           JOIN completed c ON dr.deal_id = c.id
          WHERE dr.reviewer_id::text <> $1) AS rated_by,

        -- share of brands that came back for more than one completed deal
        (SELECT CASE WHEN COUNT(*) = 0 THEN 0
                     ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE deal_count > 1) / COUNT(*))
                END
           FROM per_brand) AS repeat_rate,

        -- delivered on or before the posting deadline
        (SELECT CASE WHEN COUNT(*) = 0 THEN 0
                     ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE completed_at <= posting_deadline) / COUNT(*))
                END
           FROM completed
          WHERE posting_deadline IS NOT NULL AND completed_at IS NOT NULL) AS on_time_rate,

        -- median-ish reply latency: hours from the counterparty's message to this
        -- user's next message in the same deal
        (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (m.created_at - prev.created_at)) / 3600)), 0)
           FROM deal_messages m
           JOIN LATERAL (
             SELECT p.created_at
               FROM deal_messages p
              WHERE p.deal_id = m.deal_id
                AND p.sender_id::text <> $1
                AND p.created_at < m.created_at
              ORDER BY p.created_at DESC
              LIMIT 1
           ) prev ON TRUE
          WHERE m.sender_id::text = $1) AS avg_response_hours
      `,
      [userId]
    );

    const r = result.rows[0] || {};
    const dealsCompleted = Number(r.deals_completed ?? 0);
    const avgRating = Number(r.avg_rating ?? 0);
    const repeatRate = Number(r.repeat_rate ?? 0);
    const onTimeRate = Number(r.on_time_rate ?? 0);

    return {
      deals_completed: dealsCompleted,
      deals_this_month: Number(r.deals_this_month ?? 0),
      avg_rating: avgRating,
      repeat_rate: repeatRate,
      on_time_rate: onTimeRate,
      avg_response_hours: Number(r.avg_response_hours ?? 0),
      rated_by: Number(r.rated_by ?? 0),
      trust_score: computeTrustScore({ onTimeRate, avgRating, repeatRate, dealsCompleted }),
    };
  } catch {
    // A missing table or a column-type mismatch must never take the profile page
    // down — the stats degrade to zero and the page still renders.
    return EMPTY_STATS;
  }
}
