-- Draft / short-lived key-value cache.
--
-- ui-specs/phase-2/_global-provisions.md GP2 part 2 requires drafts to be saved
-- server-side so that a session ending never costs the user an in-flight
-- campaign, deal or profile edit.
--
-- Two routes were already writing to a table named `cache`
-- (pages/api/auth/onboarding-draft.ts and pages/api/drafts/[kind].ts), but no
-- migration ever created it. Both wrap their queries in .catch(), so every
-- write has been failing silently — the onboarding draft feature has never
-- actually persisted anything. This creates the table those routes assume.

CREATE TABLE IF NOT EXISTS cache (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reads always filter on expiry, and the retention sweep deletes by it.
CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache (expires_at);

-- Ownership is enforced in the API layer, not by RLS: the app connects with a
-- single pooled role rather than a per-user auth context, so an auth.uid()
-- policy would never evaluate. Every key is namespaced with the session-derived
-- user id (draft_<kind>_<userId>) and the handler resolves that id from the
-- session cookie, never from client input.

COMMENT ON TABLE cache IS
  'Short-lived key-value store for server-side drafts (GP2). Rows expire via expires_at; keys are namespaced by session-derived user id.';
