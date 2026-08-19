/**
 * Reputation Queries - Read Path
 * User profiles, ratings, reviews, badges
 */

import { PostgresEventStore } from '../events/postgres-event-store';

const eventStore = new PostgresEventStore();

// ============================================================================
// GET USER REPUTATION PROFILE
// ============================================================================

export async function getUserReputationProfile(user_id: string) {
  const query = `
    SELECT
      (e.data->>'average_rating')::float as average_rating,
      (e.data->>'total_reviews')::int as total_reviews,
      (e.data->>'total_ratings')::int as total_ratings,
      e.data->'badges' as badges,
      (e.data->>'response_time_avg_hours')::float as response_time_avg_hours,
      (e.data->>'completion_rate')::float as completion_rate,
      e.occurred_at
    FROM events_log e
    WHERE e.aggregate_id = $1
      AND e.event_type = 'reputation_score_updated'
    ORDER BY e.occurred_at DESC
    LIMIT 1
  `;

  const result = await eventStore['pool'].query(query, [user_id]);

  if (!result.rows || result.rows.length === 0) {
    return {
      user_id,
      average_rating: 0,
      total_reviews: 0,
      total_ratings: 0,
      badges: [],
      response_time_avg_hours: 0,
      completion_rate: 0,
      last_updated: new Date().toISOString(),
    };
  }

  const row = result.rows[0];
  return {
    user_id,
    average_rating: row.average_rating || 0,
    total_reviews: row.total_reviews || 0,
    total_ratings: row.total_ratings || 0,
    badges: row.badges || [],
    response_time_avg_hours: row.response_time_avg_hours || 0,
    completion_rate: row.completion_rate || 0,
    last_updated: row.occurred_at,
  };
}

// ============================================================================
// GET USER REVIEWS
// ============================================================================

export async function getUserReviews(user_id: string, limit = 50, offset = 0) {
  const query = `
    SELECT
      (e.data->>'review_id') as review_id,
      (e.data->>'reviewer_id') as reviewer_id,
      (e.data->>'reviewer_type') as reviewer_type,
      e.data->>'title' as title,
      e.data->>'content' as content,
      (e.data->>'verified_deal')::boolean as verified_deal,
      e.data->>'deal_id' as deal_id,
      e.occurred_at
    FROM events_log e
    WHERE e.event_type = 'review_submitted'
      AND e.data->>'reviewee_id' = $1
    ORDER BY e.occurred_at DESC
    LIMIT $2 OFFSET $3
  `;

  const result = await eventStore['pool'].query(query, [user_id, limit, offset]);

  return result.rows.map((row) => ({
    review_id: row.review_id,
    reviewer_id: row.reviewer_id,
    reviewer_type: row.reviewer_type,
    title: row.title,
    content: row.content,
    verified_deal: row.verified_deal,
    deal_id: row.deal_id,
    submitted_at: row.occurred_at,
  }));
}

// ============================================================================
// GET USER RATINGS
// ============================================================================

export async function getUserRatings(user_id: string, limit = 50, offset = 0) {
  const query = `
    SELECT
      (e.data->>'rating_id') as rating_id,
      (e.data->>'rater_id') as rater_id,
      (e.data->>'rater_type') as rater_type,
      (e.data->>'rating')::int as rating,
      e.data->'categories' as categories,
      (e.data->>'verified_deal')::boolean as verified_deal,
      e.data->>'deal_id' as deal_id,
      e.occurred_at
    FROM events_log e
    WHERE e.event_type = 'rating_submitted'
      AND e.data->>'ratee_id' = $1
    ORDER BY e.occurred_at DESC
    LIMIT $2 OFFSET $3
  `;

  const result = await eventStore['pool'].query(query, [user_id, limit, offset]);

  return result.rows.map((row) => ({
    rating_id: row.rating_id,
    rater_id: row.rater_id,
    rater_type: row.rater_type,
    rating: row.rating,
    categories: row.categories,
    verified_deal: row.verified_deal,
    deal_id: row.deal_id,
    submitted_at: row.occurred_at,
  }));
}

// ============================================================================
// GET USER BADGES
// ============================================================================

export async function getUserBadges(user_id: string) {
  const query = `
    SELECT DISTINCT
      (e.data->>'badge_id') as badge_id,
      e.data->>'badge_type' as badge_type,
      e.data->>'reason' as reason,
      e.data->>'issued_by' as issued_by,
      e.occurred_at
    FROM events_log e
    WHERE e.aggregate_id = $1
      AND e.event_type = 'badge_awarded'
    ORDER BY e.occurred_at DESC
  `;

  const result = await eventStore['pool'].query(query, [user_id]);

  return result.rows.map((row) => ({
    badge_id: row.badge_id,
    badge_type: row.badge_type,
    reason: row.reason,
    issued_by: row.issued_by,
    awarded_at: row.occurred_at,
  }));
}

// ============================================================================
// GET TOP-RATED CREATORS
// ============================================================================

export async function getTopRatedCreators(limit = 20) {
  const query = `
    SELECT
      e.aggregate_id as user_id,
      (e.data->>'average_rating')::float as average_rating,
      (e.data->>'total_ratings')::int as total_ratings,
      (e.data->>'completion_rate')::float as completion_rate,
      e.occurred_at
    FROM events_log e
    WHERE e.event_type = 'reputation_score_updated'
      AND e.aggregate_type = 'reputation'
      AND (e.data->>'average_rating')::float >= 4.5
    ORDER BY (e.data->>'average_rating')::float DESC, (e.data->>'total_ratings')::int DESC
    LIMIT $1
  `;

  const result = await eventStore['pool'].query(query, [limit]);

  return result.rows.map((row) => ({
    user_id: row.user_id,
    average_rating: row.average_rating,
    total_ratings: row.total_ratings,
    completion_rate: row.completion_rate,
    last_updated: row.occurred_at,
  }));
}

// ============================================================================
// GET TOP-RATED BRANDS
// ============================================================================

export async function getTopRatedBrands(limit = 20) {
  const query = `
    SELECT
      e.aggregate_id as user_id,
      (e.data->>'average_rating')::float as average_rating,
      (e.data->>'total_ratings')::int as total_ratings,
      (e.data->>'completion_rate')::float as completion_rate,
      e.occurred_at
    FROM events_log e
    WHERE e.event_type = 'reputation_score_updated'
      AND e.aggregate_type = 'reputation'
      AND (e.data->>'average_rating')::float >= 4.5
    ORDER BY (e.data->>'average_rating')::float DESC, (e.data->>'total_ratings')::int DESC
    LIMIT $1
  `;

  const result = await eventStore['pool'].query(query, [limit]);

  return result.rows.map((row) => ({
    user_id: row.user_id,
    average_rating: row.average_rating,
    total_ratings: row.total_ratings,
    completion_rate: row.completion_rate,
    last_updated: row.occurred_at,
  }));
}

// ============================================================================
// GET REVIEW COUNT FOR USER
// ============================================================================

export async function getReviewCountForUser(user_id: string): Promise<number> {
  const query = `
    SELECT COUNT(*) as review_count
    FROM events_log e
    WHERE e.event_type = 'review_submitted'
      AND e.data->>'reviewee_id' = $1
  `;

  const result = await eventStore['pool'].query(query, [user_id]);
  return parseInt(result.rows[0]?.review_count || '0', 10);
}
