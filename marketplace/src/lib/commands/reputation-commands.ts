/**
 * Reputation Commands - Ratings, reviews, badges
 * Guarantees: immutable feedback, verified transactions only
 */

import { v4 as uuid } from 'uuid';
import { EventBuilder } from '../events/core';
import { PostgresEventStore } from '../events/postgres-event-store';
import {
  ReviewSubmittedEvent,
  RatingSubmittedEvent,
  BadgeAwardedEvent,
  ReputationScoreUpdatedEvent,
} from '../events/domain-events';

const eventStore = new PostgresEventStore();

// ============================================================================
// SUBMIT REVIEW COMMAND
// ============================================================================

export interface SubmitReviewCommand {
  review_id: string;
  deal_id: string;
  reviewer_id: string; // Who's writing the review
  reviewee_id: string; // Who's being reviewed
  reviewer_type: 'brand' | 'creator';
  title: string;
  content: string;
  verified_deal: boolean;
  user_id: string;
}

export async function handleSubmitReviewCommand(
  command: SubmitReviewCommand
): Promise<{ review_id: string }> {
  if (!command.title || command.title.trim().length === 0) {
    throw new Error('Review title cannot be empty');
  }

  if (!command.content || command.content.trim().length === 0) {
    throw new Error('Review content cannot be empty');
  }

  if (command.content.length > 5000) {
    throw new Error('Review exceeds maximum length of 5000 characters');
  }

  const idempotency_key = `review:submit:${command.deal_id}:${command.reviewer_id}`;

  const event = new EventBuilder(
    'review_submitted',
    command.review_id,
    'reputation',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      review_id: command.review_id,
      deal_id: command.deal_id,
      reviewer_id: command.reviewer_id,
      reviewee_id: command.reviewee_id,
      reviewer_type: command.reviewer_type,
      title: command.title,
      content: command.content,
      verified_deal: command.verified_deal,
      submitted_at: new Date().toISOString(),
    })
    .build() as ReviewSubmittedEvent;

  await eventStore.append([event]);
  return { review_id: command.review_id };
}

// ============================================================================
// SUBMIT RATING COMMAND
// ============================================================================

export interface SubmitRatingCommand {
  rating_id: string;
  deal_id: string;
  rater_id: string;
  ratee_id: string;
  rater_type: 'brand' | 'creator';
  rating: number; // 1-5 stars
  categories: {
    communication?: number;
    professionalism?: number;
    content_quality?: number;
    on_time_delivery?: number;
    value_for_money?: number;
  };
  verified_deal: boolean;
  user_id: string;
}

export async function handleSubmitRatingCommand(
  command: SubmitRatingCommand
): Promise<{ rating_id: string }> {
  if (command.rating < 1 || command.rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Validate category ratings
  Object.values(command.categories).forEach((cat_rating) => {
    if (cat_rating && (cat_rating < 1 || cat_rating > 5)) {
      throw new Error('Category ratings must be between 1 and 5');
    }
  });

  const idempotency_key = `rating:submit:${command.deal_id}:${command.rater_id}`;

  const event = new EventBuilder(
    'rating_submitted',
    command.rating_id,
    'reputation',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      rating_id: command.rating_id,
      deal_id: command.deal_id,
      rater_id: command.rater_id,
      ratee_id: command.ratee_id,
      rater_type: command.rater_type,
      rating: command.rating,
      categories: command.categories,
      verified_deal: command.verified_deal,
      submitted_at: new Date().toISOString(),
    })
    .build() as RatingSubmittedEvent;

  await eventStore.append([event]);
  return { rating_id: command.rating_id };
}

// ============================================================================
// AWARD BADGE COMMAND
// ============================================================================

export interface AwardBadgeCommand {
  badge_id: string;
  user_id_recipient: string;
  badge_type: 'super_creator' | 'trusted_brand' | 'top_rated' | 'fast_responder' | 'first_deal' | 'verified_seller';
  reason: string;
  issued_by: 'system' | 'admin';
  user_id: string;
}

export async function handleAwardBadgeCommand(
  command: AwardBadgeCommand
): Promise<{ badge_id: string }> {
  const idempotency_key = `badge:award:${command.user_id_recipient}:${command.badge_type}`;

  const event = new EventBuilder(
    'badge_awarded',
    command.badge_id,
    'reputation',
    command.user_id
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      badge_id: command.badge_id,
      user_id_recipient: command.user_id_recipient,
      badge_type: command.badge_type,
      reason: command.reason,
      issued_by: command.issued_by,
      awarded_at: new Date().toISOString(),
    })
    .build() as BadgeAwardedEvent;

  await eventStore.append([event]);
  return { badge_id: command.badge_id };
}

// ============================================================================
// UPDATE REPUTATION SCORE COMMAND (System-only, triggered by aggregation jobs)
// ============================================================================

export interface UpdateReputationScoreCommand {
  user_id: string;
  average_rating: number;
  total_reviews: number;
  total_ratings: number;
  badges: string[]; // badge_ids
  response_time_avg_hours: number;
  completion_rate: number; // 0-1
  user_id_actor: string;
}

export async function handleUpdateReputationScoreCommand(
  command: UpdateReputationScoreCommand
): Promise<void> {
  if (command.average_rating < 0 || command.average_rating > 5) {
    throw new Error('Average rating must be between 0 and 5');
  }

  if (command.completion_rate < 0 || command.completion_rate > 1) {
    throw new Error('Completion rate must be between 0 and 1');
  }

  const idempotency_key = `reputation:update:${command.user_id}:${Math.floor(Date.now() / 60000)}`; // Hourly idempotency

  const event = new EventBuilder(
    'reputation_score_updated',
    command.user_id,
    'reputation',
    command.user_id_actor
  )
    .withIdempotencyKey(idempotency_key)
    .withData({
      user_id: command.user_id,
      average_rating: command.average_rating,
      total_reviews: command.total_reviews,
      total_ratings: command.total_ratings,
      badges: command.badges,
      response_time_avg_hours: command.response_time_avg_hours,
      completion_rate: command.completion_rate,
      updated_at: new Date().toISOString(),
    })
    .build() as ReputationScoreUpdatedEvent;

  await eventStore.append([event]);
}
