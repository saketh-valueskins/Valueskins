-- Migration: Shared JSONB state row powering cross-browser realtime (Supabase-only).
-- The marketplace demo previously synced via Firebase Realtime DB (whole-state PUT,
-- which clobbered concurrent device writes). Instead every write here is a granular
-- per-key JSONB operation, and all clients subscribe to postgres_changes on this row.
-- Run via: supabase db push

-- Single row holding all shared marketplace collections.
CREATE TABLE IF NOT EXISTS public.shared_state (
  id text PRIMARY KEY,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.shared_state (id, state)
VALUES (
  'main',
  '{"deals":{},"campaigns":{},"messages":{},"applications":{},"notifications":{},"events":{}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.shared_state ENABLE ROW LEVEL SECURITY;

-- Realtime subscriptions (postgres_changes) authenticate as anon/authenticated and
-- need a SELECT policy to receive payloads. Writes go through the SECURITY DEFINER
-- functions below, so no UPDATE policy is required.
CREATE POLICY "shared_state_select" ON public.shared_state
  FOR SELECT
  USING (true);

-- Upsert one nested key inside a top-level collection (e.g. campaigns/<id>).
-- Object-in-object merge: never touches sibling keys, so concurrent devices
-- cannot clobber each other's entries.
CREATE OR REPLACE FUNCTION public.upsert_shared_state_path(path text, key text, value jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_state jsonb;
BEGIN
  SELECT state INTO target_state FROM public.shared_state WHERE id = 'main';
  IF target_state IS NULL THEN target_state := '{}'::jsonb; END IF;
  target_state := jsonb_set(target_state, ARRAY[path, key], value);
  UPDATE public.shared_state SET state = target_state, updated_at = now() WHERE id = 'main';
  RETURN true;
END;
$$;

-- Merge a deal patch by replacing each supplied field exactly.
-- Uses per-field jsonb_set (not the || operator) so array fields like
-- chatMessages are replaced, never concatenated.
CREATE OR REPLACE FUNCTION public.merge_shared_deal(deal_key text, updates jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_state jsonb;
  current_deal jsonb;
  field_key text;
  field_value jsonb;
BEGIN
  SELECT state INTO target_state FROM public.shared_state WHERE id = 'main';
  IF target_state IS NULL THEN target_state := '{}'::jsonb; END IF;
  current_deal := COALESCE(target_state -> 'deals' -> deal_key, '{}'::jsonb);
  FOR field_key, field_value IN SELECT * FROM jsonb_each(updates)
  LOOP
    current_deal := jsonb_set(current_deal, ARRAY[field_key], field_value);
  END LOOP;
  target_state := jsonb_set(target_state, ARRAY['deals', deal_key], current_deal);
  UPDATE public.shared_state SET state = target_state, updated_at = now() WHERE id = 'main';
  RETURN true;
END;
$$;

-- Append one message to a deal's message array.
CREATE OR REPLACE FUNCTION public.append_shared_message(deal_key text, value jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_state jsonb;
  msgs jsonb;
BEGIN
  SELECT state INTO target_state FROM public.shared_state WHERE id = 'main';
  IF target_state IS NULL THEN target_state := '{}'::jsonb; END IF;
  msgs := COALESCE(target_state -> 'messages' -> deal_key, '[]'::jsonb) || value;
  target_state := jsonb_set(target_state, ARRAY['messages', deal_key], msgs);
  UPDATE public.shared_state SET state = target_state, updated_at = now() WHERE id = 'main';
  RETURN true;
END;
$$;

-- Replace a deal's message array wholesale.
CREATE OR REPLACE FUNCTION public.set_shared_messages(deal_key text, value jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_state jsonb;
BEGIN
  SELECT state INTO target_state FROM public.shared_state WHERE id = 'main';
  IF target_state IS NULL THEN target_state := '{}'::jsonb; END IF;
  target_state := jsonb_set(target_state, ARRAY['messages', deal_key], value);
  UPDATE public.shared_state SET state = target_state, updated_at = now() WHERE id = 'main';
  RETURN true;
END;
$$;

-- Remove a single nested key.
CREATE OR REPLACE FUNCTION public.delete_shared_key(path text, key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_state jsonb;
  coll jsonb;
BEGIN
  SELECT state INTO target_state FROM public.shared_state WHERE id = 'main';
  IF target_state IS NULL THEN RETURN true; END IF;
  coll := target_state -> path;
  IF coll IS NOT NULL THEN
    coll := coll - key;
    target_state := jsonb_set(target_state, ARRAY[path], coll);
    UPDATE public.shared_state SET state = target_state, updated_at = now() WHERE id = 'main';
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_shared_state_path(text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_shared_deal(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_shared_message(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_shared_messages(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_shared_key(text, text) TO anon, authenticated;

-- Add the table to the Supabase Realtime publication so postgres_changes
-- subscriptions actually receive events.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'shared_state'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_state;
    END IF;
  END IF;
END;
$$;

-- Deal PDF storage bucket. Server-side writes use the service role key, which
-- bypasses storage RLS, so no storage policies are required.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('deals', 'deals', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
