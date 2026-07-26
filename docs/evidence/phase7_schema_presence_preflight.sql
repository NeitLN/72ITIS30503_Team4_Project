-- A. docs/evidence/phase7_schema_presence_preflight.sql
-- Safe to execute before either Phase 7 migration
-- Uses only SELECT or WITH ... SELECT

WITH schema_checks AS (
  SELECT
    EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'notifications'
    ) as has_notifications_table,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'event_key'
    ) as has_event_key_col,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read_at'
    ) as has_read_at_col
)
SELECT * FROM schema_checks;