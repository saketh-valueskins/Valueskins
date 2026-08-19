-- Seed professions from ValueSkins categories
-- EXACTLY 7 niches — the platform is intentionally focused on these.
-- Idempotent: safe to re-run (the migration runner executes every file on each deploy).

-- 1. Deactivate any profession outside the 7 canonical niches
UPDATE professions
SET is_active = FALSE
WHERE LOWER(name) NOT IN (
  'fashion & beauty', 'food', 'travel', 'music', 'tech', 'education', 'comedy & entertainment'
);

-- 2. Ensure the 7 canonical niches exist and are active (insert if missing)
INSERT INTO professions (name, category, is_active)
SELECT v.name, v.category, TRUE
FROM (VALUES
  ('Fashion & Beauty', 'Fashion & Beauty'),
  ('Food', 'Food'),
  ('Travel', 'Travel'),
  ('Music', 'Music'),
  ('Tech', 'Tech'),
  ('Education', 'Education'),
  ('Comedy & Entertainment', 'Comedy & Entertainment')
) AS v(name, category)
WHERE NOT EXISTS (SELECT 1 FROM professions p WHERE LOWER(p.name) = LOWER(v.name));

-- 3. Re-activate the 7 canonical niches
UPDATE professions SET is_active = TRUE
WHERE LOWER(name) IN (
  'fashion & beauty', 'food', 'travel', 'music', 'tech', 'education', 'comedy & entertainment'
);
