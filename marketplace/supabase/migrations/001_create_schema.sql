-- Migration: Create core schema for ValueSkins marketplace
-- Run via: supabase db push

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  budget numeric,
  target_valueSkins text[],
  deadline timestamp with time zone,
  location text,
  requirements text,
  status text DEFAULT 'open',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text,
  sender_id uuid REFERENCES auth.users(id),
  receiver_id uuid REFERENCES auth.users(id),
  content text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
DROP POLICY IF EXISTS "Anyone can read campaigns" ON campaigns;
CREATE POLICY "Anyone can read campaigns" ON campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Brands can create campaigns" ON campaigns;
CREATE POLICY "Brands can create campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "Brands can update own campaigns" ON campaigns;
CREATE POLICY "Brands can update own campaigns" ON campaigns FOR UPDATE USING (auth.uid() = brand_id);

-- RLS Policies for deals
DROP POLICY IF EXISTS "Anyone can read deals" ON deals;
CREATE POLICY "Anyone can read deals" ON deals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can create deals" ON deals;
CREATE POLICY "Creators can create deals" ON deals FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- RLS Policies for messages
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
CREATE POLICY "Users can read own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert messages" ON messages;
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_deals_campaign_id ON deals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_deals_creator_id ON deals(creator_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
