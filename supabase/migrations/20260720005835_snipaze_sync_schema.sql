/*
# Snipaze multi-device sync schema

Creates the tables, RPCs, and tombstone purge function that power cross-device
sync for the Snipaze browser extension. Identity is established by a Google OAuth
access token obtained via chrome.identity; the sync-pull/sync-push edge functions
verify that token against Google's userinfo endpoint and extract the user's email.
That email is the per-user partition key for every row. There is no Supabase Auth
session; all access goes through the service-role key inside the edge functions
(which bypass RLS), so policies are TO anon, authenticated with USING/WITH CHECK
(true) - the real per-email enforcement lives in the RPC WHERE clauses.

1. New Tables
- `sync_sequence_counter` - singleton row holding the global monotonic cursor.
- `notes` - note rows partitioned by (email, id), with revision, sync_sequence,
  server_updated_at, and soft-delete deleted_at columns.
- `categories` - category rows partitioned by (email, name), same sync columns.
2. RPCs
- `next_sync_sequence()` - atomically increments and returns the next sequence.
- `upsert_note_if_newer` / `upsert_category_if_newer` - conditional write guarded
  by current_row.revision = p_base_server_revision; also accepts when the row is
  missing or soft-deleted with base revision 0 (revive). Returns accepted/conflict.
- `delete_note_if_revision` / `delete_category_if_revision` - revision-guarded
  soft delete; no revive clause.
- `purge_deleted_sync_tombstones(p_retention_days default 90)` - hard-deletes
  tombstones older than the cutoff; execute revoked from anon + authenticated.
3. Security
- RLS enabled on notes and categories; permissive anon+authenticated policies
  because the tables are only touched via the service-role key in edge functions.
*/

CREATE TABLE IF NOT EXISTS sync_sequence_counter (
  id integer PRIMARY KEY DEFAULT 1,
  value bigint NOT NULL DEFAULT 0,
  CONSTRAINT sync_sequence_counter_singleton CHECK (id = 1)
);

INSERT INTO sync_sequence_counter (id, value) VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION next_sync_sequence()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE sync_sequence_counter
  SET value = value + 1
  WHERE id = 1
  RETURNING value;
$$;

CREATE TABLE IF NOT EXISTS notes (
  id text NOT NULL,
  email text NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  content_html text NOT NULL DEFAULT '',
  image_data_url text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  created_at bigint NOT NULL DEFAULT 0,
  updated_at bigint NOT NULL DEFAULT 0,
  revision integer NOT NULL DEFAULT 0,
  sync_sequence bigint NOT NULL DEFAULT 0,
  server_updated_at bigint NOT NULL DEFAULT 0,
  deleted_at bigint,
  PRIMARY KEY (email, id)
);

CREATE INDEX IF NOT EXISTS notes_sync_sequence_idx
  ON notes (email, sync_sequence);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notes" ON notes;
CREATE POLICY "anon_select_notes" ON notes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_notes" ON notes;
CREATE POLICY "anon_insert_notes" ON notes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_notes" ON notes;
CREATE POLICY "anon_update_notes" ON notes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_notes" ON notes;
CREATE POLICY "anon_delete_notes" ON notes FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS categories (
  email text NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  created_at bigint NOT NULL DEFAULT 0,
  revision integer NOT NULL DEFAULT 0,
  sync_sequence bigint NOT NULL DEFAULT 0,
  server_updated_at bigint NOT NULL DEFAULT 0,
  deleted_at bigint,
  PRIMARY KEY (email, name)
);

CREATE INDEX IF NOT EXISTS categories_sync_sequence_idx
  ON categories (email, sync_sequence);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION upsert_note_if_newer(
  p_id text,
  p_email text,
  p_title text DEFAULT '',
  p_content text DEFAULT '',
  p_content_html text DEFAULT '',
  p_image_data_url text DEFAULT '',
  p_category text DEFAULT '',
  p_type text DEFAULT 'manual',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_pinned boolean DEFAULT false,
  p_created_at bigint DEFAULT 0,
  p_updated_at bigint DEFAULT 0,
  p_base_server_revision integer DEFAULT 0
)
RETURNS TABLE(
  status text,
  revision integer,
  sync_sequence bigint,
  server_updated_at bigint,
  client_updated_at bigint,
  id text,
  title text,
  content text,
  content_html text,
  image_data_url text,
  category text,
  type text,
  metadata jsonb,
  pinned boolean,
  created_at bigint,
  updated_at bigint,
  deleted_at bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_row notes%ROWTYPE;
  new_revision integer;
  new_sync_sequence bigint;
  new_server_updated_at bigint;
BEGIN
  SELECT * INTO current_row FROM notes
    WHERE email = p_email AND id = p_id FOR UPDATE;

  IF current_row.id IS NULL
     OR (current_row.deleted_at is not null and p_base_server_revision = 0)
     OR current_row.revision = p_base_server_revision THEN

    new_revision := COALESCE(current_row.revision, 0) + 1;
    new_sync_sequence := next_sync_sequence();
    new_server_updated_at := EXTRACT(EPOCH FROM now()) * 1000;

    INSERT INTO notes (
      email, id, title, content, content_html, image_data_url,
      category, type, metadata, pinned, created_at, updated_at,
      revision, sync_sequence, server_updated_at, deleted_at
    ) VALUES (
      p_email, p_id, p_title, p_content, p_content_html, p_image_data_url,
      p_category, p_type, p_metadata, p_pinned, p_created_at, p_updated_at,
      new_revision, new_sync_sequence, new_server_updated_at, NULL
    )
    ON CONFLICT (email, id) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      content_html = EXCLUDED.content_html,
      image_data_url = EXCLUDED.image_data_url,
      category = EXCLUDED.category,
      type = EXCLUDED.type,
      metadata = EXCLUDED.metadata,
      pinned = EXCLUDED.pinned,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at,
      revision = new_revision,
      sync_sequence = new_sync_sequence,
      server_updated_at = new_server_updated_at,
      deleted_at = NULL;

    RETURN QUERY SELECT
      'accepted'::text,
      new_revision,
      new_sync_sequence,
      new_server_updated_at,
      p_updated_at,
      p_id,
      p_title,
      p_content,
      p_content_html,
      p_image_data_url,
      p_category,
      p_type,
      p_metadata,
      p_pinned,
      p_created_at,
      p_updated_at,
      NULL::bigint;
  ELSE
    RETURN QUERY SELECT
      'conflict'::text,
      current_row.revision,
      current_row.sync_sequence,
      current_row.server_updated_at,
      NULL::bigint,
      current_row.id,
      current_row.title,
      current_row.content,
      current_row.content_html,
      current_row.image_data_url,
      current_row.category,
      current_row.type,
      current_row.metadata,
      current_row.pinned,
      current_row.created_at,
      current_row.updated_at,
      current_row.deleted_at;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION upsert_category_if_newer(
  p_email text,
  p_name text,
  p_color text DEFAULT 'blue',
  p_created_at bigint DEFAULT 0,
  p_base_server_revision integer DEFAULT 0
)
RETURNS TABLE(
  status text,
  revision integer,
  sync_sequence bigint,
  server_updated_at bigint,
  client_created_at bigint,
  name text,
  color text,
  created_at bigint,
  deleted_at bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_row categories%ROWTYPE;
  new_revision integer;
  new_sync_sequence bigint;
  new_server_updated_at bigint;
BEGIN
  SELECT * INTO current_row FROM categories
    WHERE email = p_email AND name = p_name FOR UPDATE;

  IF current_row.name IS NULL
     OR (current_row.deleted_at is not null and p_base_server_revision = 0)
     OR current_row.revision = p_base_server_revision THEN

    new_revision := COALESCE(current_row.revision, 0) + 1;
    new_sync_sequence := next_sync_sequence();
    new_server_updated_at := EXTRACT(EPOCH FROM now()) * 1000;

    INSERT INTO categories (
      email, name, color, created_at,
      revision, sync_sequence, server_updated_at, deleted_at
    ) VALUES (
      p_email, p_name, p_color, p_created_at,
      new_revision, new_sync_sequence, new_server_updated_at, NULL
    )
    ON CONFLICT (email, name) DO UPDATE SET
      color = EXCLUDED.color,
      created_at = EXCLUDED.created_at,
      revision = new_revision,
      sync_sequence = new_sync_sequence,
      server_updated_at = new_server_updated_at,
      deleted_at = NULL;

    RETURN QUERY SELECT
      'accepted'::text,
      new_revision,
      new_sync_sequence,
      new_server_updated_at,
      p_created_at,
      p_name,
      p_color,
      p_created_at,
      NULL::bigint;
  ELSE
    RETURN QUERY SELECT
      'conflict'::text,
      current_row.revision,
      current_row.sync_sequence,
      current_row.server_updated_at,
      NULL::bigint,
      current_row.name,
      current_row.color,
      current_row.created_at,
      current_row.deleted_at;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_note_if_revision(
  p_id text,
  p_email text,
  p_base_server_revision integer DEFAULT 0
)
RETURNS TABLE(
  status text,
  revision integer,
  sync_sequence bigint,
  server_updated_at bigint,
  id text,
  deleted_at bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_row notes%ROWTYPE;
  new_revision integer;
  new_sync_sequence bigint;
  new_server_updated_at bigint;
BEGIN
  SELECT * INTO current_row FROM notes
    WHERE email = p_email AND id = p_id FOR UPDATE;

  IF current_row.id IS NULL THEN
    RETURN QUERY SELECT
      'accepted'::text,
      0,
      next_sync_sequence(),
      EXTRACT(EPOCH FROM now()) * 1000,
      p_id,
      NULL::bigint;
    RETURN;
  END IF;

  IF current_row.revision = p_base_server_revision THEN
    new_revision := current_row.revision + 1;
    new_sync_sequence := next_sync_sequence();
    new_server_updated_at := EXTRACT(EPOCH FROM now()) * 1000;

    UPDATE notes SET
      revision = new_revision,
      sync_sequence = new_sync_sequence,
      server_updated_at = new_server_updated_at,
      deleted_at = new_server_updated_at
    WHERE email = p_email AND id = p_id;

    RETURN QUERY SELECT
      'accepted'::text,
      new_revision,
      new_sync_sequence,
      new_server_updated_at,
      p_id,
      new_server_updated_at;
  ELSE
    RETURN QUERY SELECT
      'conflict'::text,
      current_row.revision,
      current_row.sync_sequence,
      current_row.server_updated_at,
      current_row.id,
      current_row.deleted_at;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_category_if_revision(
  p_email text,
  p_name text,
  p_base_server_revision integer DEFAULT 0
)
RETURNS TABLE(
  status text,
  revision integer,
  sync_sequence bigint,
  server_updated_at bigint,
  name text,
  deleted_at bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_row categories%ROWTYPE;
  new_revision integer;
  new_sync_sequence bigint;
  new_server_updated_at bigint;
BEGIN
  SELECT * INTO current_row FROM categories
    WHERE email = p_email AND name = p_name FOR UPDATE;

  IF current_row.name IS NULL THEN
    RETURN QUERY SELECT
      'accepted'::text,
      0,
      next_sync_sequence(),
      EXTRACT(EPOCH FROM now()) * 1000,
      p_name,
      NULL::bigint;
    RETURN;
  END IF;

  IF current_row.revision = p_base_server_revision THEN
    new_revision := current_row.revision + 1;
    new_sync_sequence := next_sync_sequence();
    new_server_updated_at := EXTRACT(EPOCH FROM now()) * 1000;

    UPDATE categories SET
      revision = new_revision,
      sync_sequence = new_sync_sequence,
      server_updated_at = new_server_updated_at,
      deleted_at = new_server_updated_at
    WHERE email = p_email AND name = p_name;

    RETURN QUERY SELECT
      'accepted'::text,
      new_revision,
      new_sync_sequence,
      new_server_updated_at,
      p_name,
      new_server_updated_at;
  ELSE
    RETURN QUERY SELECT
      'conflict'::text,
      current_row.revision,
      current_row.sync_sequence,
      current_row.server_updated_at,
      current_row.name,
      current_row.deleted_at;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION purge_deleted_sync_tombstones(
  p_retention_days integer default 90
)
RETURNS TABLE(purged_notes bigint, purged_categories bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff_ms bigint;
  purged_n bigint;
  purged_c bigint;
BEGIN
  cutoff_ms := EXTRACT(EPOCH FROM now()) * 1000 - (p_retention_days * 24 * 60 * 60 * 1000);

  DELETE FROM notes
    WHERE deleted_at is not null AND deleted_at < cutoff_ms;
  GET DIAGNOSTICS purged_n = ROW_COUNT;

  DELETE FROM categories
    WHERE deleted_at is not null AND deleted_at < cutoff_ms;
  GET DIAGNOSTICS purged_c = ROW_COUNT;

  RETURN QUERY SELECT purged_n, purged_c;
END;
$$;

REVOKE EXECUTE ON FUNCTION purge_deleted_sync_tombstones(integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION purge_deleted_sync_tombstones(integer) FROM anon;
