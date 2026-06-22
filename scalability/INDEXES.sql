-- ============================================================
-- Database Indexes for Performance (Run against production DB)
-- ============================================================
-- These indexes cover the most frequent query patterns in the app.
-- Run with: psql $DATABASE_URL -f scalability/INDEXES.sql
-- ============================================================

-- DEALS table (heavily queried by role + phase)
CREATE INDEX IF NOT EXISTS idx_deals_creator_phase ON deals(creator_id, phase);
CREATE INDEX IF NOT EXISTS idx_deals_brand_phase ON deals(brand_id, phase);
CREATE INDEX IF NOT EXISTS idx_deals_created_completed ON deals(created_at DESC) WHERE phase = 'completed';
CREATE INDEX IF NOT EXISTS idx_deals_offer ON deals(offer_amount);

-- COMPLETED_DEALS (analytics queries)
CREATE INDEX IF NOT EXISTS idx_completed_deals_creator ON completed_deals(creator_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_completed_deals_brand ON completed_deals(brand_id, completed_at DESC);

-- DEAL_REVIEWS (ratings aggregation)
CREATE INDEX IF NOT EXISTS idx_deal_reviews_reviewee ON deal_reviews(reviewee_id, created_at DESC);

-- DEAL_MESSAGES (chat history)
CREATE INDEX IF NOT EXISTS idx_deal_messages_deal ON deal_messages(deal_id, created_at ASC);

-- DEAL_ESCROW (payment status lookups)
CREATE INDEX IF NOT EXISTS idx_deal_escrow_deal ON deal_escrow(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_escrow_status ON deal_escrow(status);

-- BRAND_REVIEWS (creator profile page)
CREATE INDEX IF NOT EXISTS idx_brand_reviews_creator ON brand_reviews(creator_id, created_at DESC);

-- NOTIFICATIONS (user feed)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at, created_at DESC);

-- OPPORTUNITIES (brand campaign listing)
CREATE INDEX IF NOT EXISTS idx_opportunities_brand ON opportunities(brand_user_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON opportunities(category, status);

-- OPPORTUNITY_APPLICATIONS (applicant tracking)
CREATE INDEX IF NOT EXISTS idx_applications_opportunity ON opportunity_applications(opportunity_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON opportunity_applications(applicant_user_id, status);

-- TICKETS (event ticketing)
CREATE INDEX IF NOT EXISTS idx_tickets_event_user ON tickets(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_payment_ref ON tickets(payment_ref);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(event_id, status);

-- CHECK_INS (event entry tracking)
CREATE INDEX IF NOT EXISTS idx_checkins_event_time ON check_ins(event_id, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_ticket ON check_ins(ticket_id);

-- USER_REPUTATION (leaderboard & ranking)
CREATE INDEX IF NOT EXISTS idx_reputation_score ON user_reputation(creator_rank_score DESC);

-- EVENTS (listing + filtering)
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_events_host ON events(host_id, status);
