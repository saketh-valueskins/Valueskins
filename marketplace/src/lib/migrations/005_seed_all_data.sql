-- Seed Script: Comprehensive demo data for shared Oregon DB
-- Creates users, campaigns, bids, deals, deal rooms, messages, matches, etc.
-- Both localhost and Vercel see identical data since they share this DB.

-- ═══════════════════════════════════════════════════════════════
-- 1. USERS (brands + creators)
-- ═══════════════════════════════════════════════════════════════

-- Existing users (keep as-is):
-- ac5d0f9c-a10b-426f-ba5f-5fc61af7ab71 | sakethvelamuri5 | creator
-- d58a1343-deb9-42f4-bcc3-12088fdf3724 | redleg789       | creator
-- 850a4f1d-8cef-4fa0-a71e-472b6b9c3616 | hoskyisgaming   | brand

INSERT INTO users (id, username, display_name, role, bio, location, followers_count, engagement_rate, niche, languages, is_active, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'nikeofficial',    'Nike',          'brand',   'Just Do It. Global sportswear brand.',           'Beaverton, OR', 0, 0, 'Fashion & Sportswear', '["en"]', true, now()),
  ('a0000000-0000-0000-0000-000000000002', 'spotifybrand',    'Spotify',       'brand',   'Music for everyone. Looking for creator partners.','New York, NY',   0, 0, 'Music & Entertainment', '["en"]', true, now()),
  ('a0000000-0000-0000-0000-000000000003', 'glossierco',      'Glossier',      'brand',   'Beauty products inspired by real life.',          'New York, NY',   0, 0, 'Beauty & Skincare', '["en"]', true, now()),
  ('a0000000-0000-0000-0000-000000000004', 'alex_fitness',    'Alex Rivera',   'creator', 'Fitness coach & wellness advocate.',              'Los Angeles, CA', 184000, 4.2, 'Fitness', '["en","es"]', true, now()),
  ('a0000000-0000-0000-0000-000000000005', 'maya_designs',    'Maya Chen',     'creator', 'UX designer & digital artist.',                   'San Francisco, CA', 92000, 3.8, 'Design', '["en","zh"]', true, now()),
  ('a0000000-0000-0000-0000-000000000006', 'jordan_travels',  'Jordan Smith',  'creator', 'Travel photographer & storyteller.',               'Denver, CO',      256000, 4.7, 'Travel', '["en"]', true, now()),
  ('a0000000-0000-0000-0000-000000000007', 'priya_tech',      'Priya Patel',   'creator', 'Tech reviewer & coding educator.',                'Austin, TX',      145000, 4.1, 'Technology', '["en","hi"]', true, now()),
  ('a0000000-0000-0000-0000-000000000008', 'marcus_gaming',   'Marcus Williams','creator','Gaming content creator & streamer.',              'Atlanta, GA',     320000, 5.0, 'Gaming', '["en"]', true, now())
ON CONFLICT (id) DO NOTHING;

-- Ensure all seed users have an accounts entry
INSERT INTO accounts (user_id) VALUES
  ('a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000005'),
  ('a0000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000007'),
  ('a0000000-0000-0000-0000-000000000008'),
  ('ac5d0f9c-a10b-426f-ba5f-5fc61af7ab71'),
  ('d58a1343-deb9-42f4-bcc3-12088fdf3724'),
  ('850a4f1d-8cef-4fa0-a71e-472b6b9c3616')
ON CONFLICT (user_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 2. CAMPAIGNS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO campaigns (id, brand_id, title, description, budget_per_creator, total_budget, deadline, status, delivery_type, usage_rights_days, required_niches, created_at) VALUES
  (1, '850a4f1d-8cef-4fa0-a71e-472b6b9c3616', 'Summer Fitness Challenge',
   'Looking for fitness creators to promote our new athleisure line. Need authentic workout content showing our gear in action.',
   2500, 15000, now() + interval '30 days', 'active', 'no_delivery', 365, ARRAY['Fitness', 'Health', 'Lifestyle'], now() - interval '5 days'),
  (2, 'a0000000-0000-0000-0000-000000000001', 'Air Max Launch Campaign',
   'Launching new Air Max collection. Seeking lifestyle and streetwear creators for unboxing and styling content.',
   5000, 50000, now() + interval '45 days', 'active', 'no_delivery', 180, ARRAY['Fashion', 'Lifestyle', 'Sports'], now() - interval '3 days'),
  (3, 'a0000000-0000-0000-0000-000000000002', 'Spotify Wrapped 2026',
   'Annual Wrapped campaign. Looking for creators to share their listening stats in creative formats.',
   3000, 30000, now() + interval '60 days', 'active', 'no_delivery', 90, ARRAY['Music', 'Entertainment', 'Lifestyle'], now() - interval '7 days'),
  (4, 'a0000000-0000-0000-0000-000000000003', 'Glossier You Fragrance Launch',
   'New fragrance launch. Seeking beauty and lifestyle creators for authentic scent-story content.',
   4000, 24000, now() + interval '21 days', 'active', 'no_delivery', 365, ARRAY['Beauty', 'Lifestyle', 'Fashion'], now() - interval '2 days'),
  (5, '850a4f1d-8cef-4fa0-a71e-472b6b9c3616', 'Creator Mentorship Program',
   'Brand ambassador program for up-and-coming creators in fashion, fitness, and lifestyle. Monthly stipend + free products.',
   1000, 12000, now() + interval '90 days', 'active', 'no_delivery', 365, ARRAY['Fashion', 'Fitness', 'Lifestyle', 'Beauty'], now() - interval '10 days'),
  (6, 'a0000000-0000-0000-0000-000000000002', 'Podcast Guest Search',
   'Seeking tech and music creators to feature on our official podcast. Topics: creator economy, music discovery, digital trends.',
   2000, 10000, now() - interval '5 days', 'active', 'no_delivery', 365, ARRAY['Technology', 'Music', 'Business'], now() - interval '20 days'),
  (7, 'a0000000-0000-0000-0000-000000000001', 'Nike Training Club App Feature',
   'Feature creators using NTC app in their workout routines. Video submissions showcasing integration.',
   3500, 28000, now() - interval '2 days', 'active', 'no_delivery', 180, ARRAY['Fitness', 'Health', 'Lifestyle'], now() - interval '15 days'),
  (8, 'a0000000-0000-0000-0000-000000000003', 'Summer Skin Prep Series',
   '3-part series on summer skincare routines using Glossier products. Must show before/after results.',
   1500, 9000, now() + interval '14 days', 'active', 'no_delivery', 365, ARRAY['Beauty', 'Lifestyle', 'Health'], now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3. CAMPAIGN BIDS (creator_id now TEXT = user UUID)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO campaign_bids (id, campaign_id, creator_id, bid_amount, proposal, status, created_at) VALUES
  (1, 1, 'ac5d0f9c-a10b-426f-ba5f-5fc61af7ab71', 2000,
   'I can create 3 high-energy workout videos featuring your athleisure line. My audience is 85% fitness enthusiasts.',
   'pending', now() - interval '3 days'),
  (2, 1, 'a0000000-0000-0000-0000-000000000004', 2500,
   'As a certified fitness coach with 184K followers, I can showcase your gear authentically in my daily workout routines.',
   'pending', now() - interval '2 days'),
  (3, 2, 'a0000000-0000-0000-0000-000000000006', 4500,
   'Street-style photo series featuring Air Max at iconic urban locations. My photography consistently gets 50K+ likes.',
   'pending', now() - interval '1 day'),
  (4, 3, 'a0000000-0000-0000-0000-000000000007', 2800,
   'Interactive data visualization of my Wrapped stats with tech commentary. My tech audience loves data-driven content.',
   'accepted', now() - interval '4 days'),
  (5, 3, 'a0000000-0000-0000-0000-000000000008', 3000,
   'Live-stream reaction to my Wrapped results with gaming overlay. 320K followers, high engagement on music crossover content.',
   'pending', now() - interval '2 days'),
  (6, 4, 'a0000000-0000-0000-0000-000000000005', 3500,
   'Aesthetic visual storytelling matching the fragrance notes to color palettes. My design audience appreciates sensory content.',
   'pending', now() - interval '1 day'),
  (7, 5, 'a0000000-0000-0000-0000-000000000004', 1000,
   'Would love to mentor aspiring fitness creators while representing your brand consistently.',
   'accepted', now() - interval '6 days'),
  (8, 5, 'd58a1343-deb9-42f4-bcc3-12088fdf3724', 800,
   'I can bring a fresh perspective on fashion+tech crossover content to the mentorship program.',
   'pending', now() - interval '5 days'),
  (9, 7, 'a0000000-0000-0000-0000-000000000004', 3000,
   'Weekly workout series integrating NTC app routines. Before/after transformation tracking with my fitness audience.',
   'accepted', now() - interval '8 days')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 4. DEALS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO deals (id, creator_id, brand_id, title, description, budget_amount, phase, status, value_skin, created_at, updated_at) VALUES
  ('deal-summer-fitness-1', 'a0000000-0000-0000-0000-000000000004', '850a4f1d-8cef-4fa0-a71e-472b6b9c3616',
   'Summer Fitness Challenge - Alex Rivera',
   '3 high-energy workout videos featuring new athleisure line. Including Instagram Reels, TikTok, and YouTube Shorts.',
   2500, 'active', 'active', 'Profession: Fitness Coach', now() - interval '4 days', now() - interval '4 days'),
  ('deal-spotify-wrapped-1', 'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002',
   'Spotify Wrapped - Data Viz',
   'Interactive data visualization of Wrapped listening stats with tech commentary and explanation of music trends.',
   2800, 'brief', 'active', 'Profession: Tech Creator', now() - interval '2 days', now() - interval '2 days'),
  ('deal-mentorship-1', 'a0000000-0000-0000-0000-000000000004', '850a4f1d-8cef-4fa0-a71e-472b6b9c3616',
   'Creator Mentorship - Alex Rivera',
   'Monthly mentor sessions for aspiring fitness creators. Brand integration in educational content.',
   1000, 'active', 'active', 'Passion: Mentorship', now() - interval '5 days', now() - interval '5 days'),
  ('deal-ntc-app-1', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'NTC App Integration Series',
   'Weekly workout series integrating Nike Training Club app. Includes progress tracking and community engagement.',
   3000, 'negotiation', 'active', 'Profession: Fitness Coach', now() - interval '6 days', now() - interval '1 day'),
  ('deal-completed-nike-1', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
   'Air Max Travel Series (Completed)',
   'Travel photo series featuring Air Max at global landmarks. Previously completed campaign.',
   4000, 'completed', 'active', 'Hobby: Travel Photography', now() - interval '60 days', now() - interval '5 days'),
  ('deal-completed-glossier-1', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003',
   'Glossier Design Collab (Completed)',
   'Design-focused campaign creating visual identity guidelines for Glossier product launches.',
   3500, 'completed', 'active', 'Profession: UX Designer', now() - interval '45 days', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 5. DEAL ROOMS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO deal_rooms (id, brand_user_id, creator_user_id, phase, status, created_at) VALUES
  ('deal-summer-fitness-1', '850a4f1d-8cef-4fa0-a71e-472b6b9c3616', 'a0000000-0000-0000-0000-000000000004', 'active', 'active', now() - interval '4 days'),
  ('deal-spotify-wrapped-1', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 'brief', 'active', now() - interval '2 days'),
  ('deal-mentorship-1', '850a4f1d-8cef-4fa0-a71e-472b6b9c3616', 'a0000000-0000-0000-0000-000000000004', 'active', 'active', now() - interval '5 days'),
  ('deal-ntc-app-1', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'negotiation', 'active', now() - interval '6 days'),
  ('deal-completed-nike-1', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'completed', 'active', now() - interval '60 days'),
  ('deal-completed-glossier-1', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'completed', 'active', now() - interval '45 days')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 6. DEAL MESSAGES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO deal_messages (deal_id, sender_id, message, created_at) VALUES
  -- Messages in deal-summer-fitness-1
  ('deal-summer-fitness-1', 'a0000000-0000-0000-0000-000000000004', 'Hi team! Excited to kick off this summer fitness campaign. I have some ideas for the first video.', now() - interval '3 days'),
  ('deal-summer-fitness-1', '850a4f1d-8cef-4fa0-a71e-472b6b9c3616', 'Great to have you on board Alex! We are looking for 3 videos minimum. Can you share your content calendar?', now() - interval '3 days'),
  ('deal-summer-fitness-1', 'a0000000-0000-0000-0000-000000000004', 'Absolutely! Ill send over a draft schedule by tomorrow. Thinking Monday/Wednesday/Friday for Reels.', now() - interval '2 days'),
  ('deal-summer-fitness-1', '850a4f1d-8cef-4fa0-a71e-472b6b9c3616', 'Perfect. Also we can ship the products by end of week if you send me your address.', now() - interval '2 days'),
  -- Messages in deal-mentorship-1
  ('deal-mentorship-1', 'a0000000-0000-0000-0000-000000000004', 'Thanks for selecting me for the mentorship program! Looking forward to working with aspiring creators.', now() - interval '4 days'),
  ('deal-mentorship-1', '850a4f1d-8cef-4fa0-a71e-472b6b9c3616', 'Welcome to the program Alex! We have 10 mentees lined up for your first session.', now() - interval '4 days'),
  -- Messages in deal-completed-nike-1
  ('deal-completed-nike-1', 'a0000000-0000-0000-0000-000000000006', 'Here are the final photos from the Tokyo shoot. Let me know if any edits needed!', now() - interval '30 days'),
  ('deal-completed-nike-1', 'a0000000-0000-0000-0000-000000000001', 'These are stunning! The Air Max look incredible against the Shibuya crossing backdrop.', now() - interval '30 days'),
  ('deal-completed-nike-1', 'a0000000-0000-0000-0000-000000000006', 'Thanks! I have 3 more location sets to deliver by end of week.', now() - interval '29 days'),
  ('deal-completed-nike-1', 'a0000000-0000-0000-0000-000000000001', 'Approved. Payment processed. Looking forward to working together again!', now() - interval '25 days'),
  ('deal-completed-nike-1', 'a0000000-0000-0000-0000-000000000006', 'Thank you! Had an amazing time. Would love to do another campaign soon!', now() - interval '25 days')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 7. BRAND-CREATOR MATCHES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO brand_creator_matches (campaign_id, brand_id, creator_id, match_score, match_reasons) VALUES
  (1, '850a4f1d-8cef-4fa0-a71e-472b6b9c3616', 'a0000000-0000-0000-0000-000000000004', 95, ARRAY['Perfect niche match', 'High engagement rate', 'Previous deal success']),
  (1, '850a4f1d-8cef-4fa0-a71e-472b6b9c3616', 'ac5d0f9c-a10b-426f-ba5f-5fc61af7ab71', 78, ARRAY['Good audience overlap', 'Interested in fitness']),
  (2, 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 91, ARRAY['Strong visual portfolio', 'High follower count', 'Lifestyle alignment']),
  (2, 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 62, ARRAY['Large audience', 'Streetwear interest']),
  (3, 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 88, ARRAY['Data visualization skills', 'Tech audience overlap', 'Approved bid']),
  (3, 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 71, ARRAY['Large streaming audience', 'Music crossover content']),
  (4, 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 93, ARRAY['Aesthetic content style', 'Beauty audience', 'Design expertise']),
  (5, '850a4f1d-8cef-4fa0-a71e-472b6b9c3616', 'a0000000-0000-0000-0000-000000000004', 97, ARRAY['Experienced mentor', 'Brand alignment', 'Approved bid']),
  (7, 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 94, ARRAY['Fitness expert', 'NTC app experience', 'Approved bid'])
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 8. NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO notifications (user_id, title, message, type, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000004', 'Bid Accepted!',     'Your bid on "Summer Fitness Challenge" was accepted. Deal room is open.', 'deal', now() - interval '4 days'),
  ('a0000000-0000-0000-0000-000000000004', 'New Deal Active',   'Your Creator Mentorship deal is now active. Check the deal room for details.', 'deal', now() - interval '5 days'),
  ('a0000000-0000-0000-0000-000000000004', 'NTC Deal Update',   'Nike wants to negotiate terms on the NTC App Integration deal.', 'deal', now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000007', 'Bid Accepted!',     'Your Spotify Wrapped bid was accepted. Welcome to the campaign!', 'deal', now() - interval '2 days'),
  ('ac5d0f9c-a10b-426f-ba5f-5fc61af7ab71', 'New Campaign',     'A new campaign "Summer Fitness Challenge" matches your profile.', 'campaign', now() - interval '5 days'),
  ('ac5d0f9c-a10b-426f-ba5f-5fc61af7ab71', 'Bid Submitted',    'Your bid on "Summer Fitness Challenge" is under review.', 'campaign', now() - interval '3 days'),
  ('d58a1343-deb9-42f4-bcc3-12088fdf3724', 'New Campaign',     '"Creator Mentorship Program" is looking for applicants.', 'campaign', now() - interval '10 days'),
  ('a0000000-0000-0000-0000-000000000006', 'Campaign Complete', 'Your Air Max campaign has been marked as completed. Great work!', 'deal', now() - interval '25 days'),
  ('a0000000-0000-0000-0000-000000000005', 'New Match',         'You have been matched with Glossier for their fragrance launch campaign.', 'campaign', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000008', 'New Opportunity',   'Spotify Wrapped campaign is looking for gaming creators!', 'campaign', now() - interval '7 days')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 9. SHARED STATE (bridges demo page with individual pages)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO shared_state (user_id, key, value, updated_at) VALUES
  ('a0000000-0000-0000-0000-000000000004', 'pending_deals', '["deal-summer-fitness-1","deal-mentorship-1","deal-ntc-app-1"]', now()),
  ('a0000000-0000-0000-0000-000000000007', 'pending_deals', '["deal-spotify-wrapped-1"]', now()),
  ('a0000000-0000-0000-0000-000000000006', 'pending_deals', '["deal-completed-nike-1"]', now()),
  ('a0000000-0000-0000-0000-000000000005', 'pending_deals', '["deal-completed-glossier-1"]', now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 10. PAYMENTS SEED
-- ═══════════════════════════════════════════════════════════════

INSERT INTO transaction_ledger (id, provider, type, amount_cents, currency, gross_amount_cents, fee_cents, net_amount_cents, status, created_at) VALUES
  ('ledger-seed-1', 'stripe', 'payment', 400000, 'USD', 408000, 8000, 400000, 'succeeded', now() - interval '25 days'),
  ('ledger-seed-2', 'stripe', 'payment', 250000, 'USD', 255000, 5000, 250000, 'succeeded', now() - interval '4 days'),
  ('ledger-seed-3', 'razorpay', 'payment', 100000, 'INR', 102000, 2000, 100000, 'succeeded', now() - interval '5 days'),
  ('ledger-seed-4', 'stripe', 'payout', 300000, 'USD', 300000, 0, 300000, 'succeeded', now() - interval '20 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO platform_fee_records (id, transaction_id, provider, gross_amount_cents, fee_cents, net_amount_cents, currency, status, created_at) VALUES
  ('fee-seed-1', 'ledger-seed-1', 'stripe', 408000, 8000, 400000, 'USD', 'collected', now() - interval '25 days'),
  ('fee-seed-2', 'ledger-seed-2', 'stripe', 255000, 5000, 250000, 'USD', 'collected', now() - interval '4 days'),
  ('fee-seed-3', 'ledger-seed-3', 'razorpay', 102000, 2000, 100000, 'INR', 'collected', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 11. BUSINESS PROFILES SEED
-- ═══════════════════════════════════════════════════════════════

INSERT INTO business_profiles (id, account_id, business_name, description, city, country, contact_email, social_links, capacity, amenities, verified, created_at) VALUES
  ('biz-seed-nike-1', 'a0000000-0000-0000-0000-000000000001', 'Nike HQ', 'Global headquarters of Nike Inc. World-leading sportswear manufacturer.', 'Beaverton', 'US', 'partnerships@nike.com', '[{"platform":"instagram","url":"https://instagram.com/nike"},{"platform":"twitter","url":"https://twitter.com/nike"}]', 5000, '["Showroom","Photo Studio","Gym"]', true, now()),
  ('biz-seed-spotify-1', 'a0000000-0000-0000-0000-000000000002', 'Spotify NYC', 'Spotify creator partnerships office in New York City.', 'New York', 'US', 'creators@spotify.com', '[{"platform":"instagram","url":"https://instagram.com/spotify"},{"platform":"twitter","url":"https://twitter.com/spotify"}]', 2000, '["Recording Studio","Event Space"]', true, now()),
  ('biz-seed-glossier-1', 'a0000000-0000-0000-0000-000000000003', 'Glossier NYC', 'Flagship Glossier store and creator experience space.', 'New York', 'US', 'collabs@glossier.com', '[{"platform":"instagram","url":"https://instagram.com/glossier"}]', 500, '["Product Studio","Photo Booth","Event Space"]', true, now())
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 12. LOYALTY & BADGES SEED
-- ═══════════════════════════════════════════════════════════════

INSERT INTO loyalty_points (account_id, balance) VALUES
  (1, 1250), (2, 3400), (3, 800)
ON CONFLICT (account_id) DO NOTHING;

INSERT INTO loyalty_points_history (account_id, points, reason, created_at) VALUES
  (1, 500, 'Deal completed: Air Max campaign', now() - interval '25 days'),
  (1, 750, 'Deal completed: Training Club campaign', now() - interval '10 days'),
  (2, 2000, 'Deal completed: Design collab', now() - interval '20 days'),
  (2, 1400, 'Referral bonus: referred new brand', now() - interval '15 days'),
  (3, 800, 'Deal completed: Mentorship kickoff', now() - interval '5 days');

INSERT INTO badges (account_id, name, description, awarded_at) VALUES
  (1, 'Top Creator', 'Awarded for completing deals worth over $5,000', now() - interval '20 days'),
  (1, 'Early Adopter', 'One of the first creators on the platform', now() - interval '90 days'),
  (2, 'Design Excellence', 'Outstanding design quality in deliverables', now() - interval '15 days'),
  (3, 'Rising Star', 'Completed first 3 deals successfully', now() - interval '5 days');

INSERT INTO vip_tiers (account_id, tier, points_threshold) VALUES
  (1, 'silver', 1000), (2, 'gold', 3000), (3, 'bronze', 500)
ON CONFLICT (account_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════

SELECT '=== SEED VERIFICATION ===' AS status;
SELECT 'users' AS tbl, count(*)::text FROM users
UNION ALL SELECT 'accounts', count(*)::text FROM accounts
UNION ALL SELECT 'campaigns', count(*)::text FROM campaigns
UNION ALL SELECT 'campaign_bids', count(*)::text FROM campaign_bids
UNION ALL SELECT 'deals', count(*)::text FROM deals
UNION ALL SELECT 'deal_rooms', count(*)::text FROM deal_rooms
UNION ALL SELECT 'deal_messages', count(*)::text FROM deal_messages
UNION ALL SELECT 'brand_creator_matches', count(*)::text FROM brand_creator_matches
UNION ALL SELECT 'notifications', count(*)::text FROM notifications
UNION ALL SELECT 'shared_state', count(*)::text FROM shared_state
UNION ALL SELECT 'transaction_ledger', count(*)::text FROM transaction_ledger
UNION ALL SELECT 'platform_fee_records', count(*)::text FROM platform_fee_records
UNION ALL SELECT 'business_profiles', count(*)::text FROM business_profiles
UNION ALL SELECT 'loyalty_points', count(*)::text FROM loyalty_points
UNION ALL SELECT 'badges', count(*)::text FROM badges
UNION ALL SELECT 'vip_tiers', count(*)::text FROM vip_tiers
ORDER BY tbl;
