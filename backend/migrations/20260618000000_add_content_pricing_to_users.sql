-- Add JSONB column to store specific pricing for content types (reel, story, post, etc.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS content_pricing JSONB DEFAULT '{}';
