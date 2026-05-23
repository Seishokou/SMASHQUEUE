-- Run this once before schema.sql if your Supabase project already had
-- court_status values ('open', 'playing') from an older version.
--
-- Supabase/Postgres may require this enum change to be committed before
-- the value is used in table defaults, inserts, updates, or triggers.

alter type public.court_status add value if not exists 'available' before 'open';
