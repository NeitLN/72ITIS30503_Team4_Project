-- C. docs/evidence/phase7_post_migration_verification.sql
-- Run only after the corrective migration has been applied
-- Uses only SELECT or WITH ... SELECT

WITH post_migration_checks AS (
  SELECT
    (SELECT COUNT(*) FROM public.notifications WHERE (is_read = false AND read_at IS NOT NULL) OR (is_read = true AND read_at IS NULL)) as inconsistent_notifications_read_state,
    (SELECT COUNT(*) FROM public.messages WHERE (is_read = false AND read_at IS NOT NULL) OR (is_read = true AND read_at IS NULL)) as inconsistent_messages_read_state,
    (
      SELECT COUNT(*)
      FROM (
        SELECT user_id, event_key
        FROM public.notifications
        WHERE event_key IS NOT NULL
        GROUP BY user_id, event_key
        HAVING COUNT(*) > 1
      ) dupes
    ) as duplicate_event_keys,
    (
      SELECT COUNT(*) FROM public.notifications
      WHERE action_href IS NOT NULL AND (
        action_href = ''
        OR left(action_href, 1) <> '/'
        OR left(action_href, 2) = '//'
        OR strpos(action_href, E'\\') > 0
        OR action_href ~ '[[:cntrl:]]'
        OR action_href ~* '%5c'
      )
    ) as unsafe_action_href_count,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') as conversations_table_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') as messages_table_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_reports') as message_reports_table_exists,
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_action_href_safe') as action_href_safe_constraint_exists,
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_read_state_check') as notif_read_state_constraint_exists,
    EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_read_state_check') as messages_read_state_constraint_exists,
    EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Participants can view their conversations' AND tablename = 'conversations') as conv_select_policy_exists,
    EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Participants can view messages' AND tablename = 'messages') as msg_select_policy_exists
)
SELECT * FROM post_migration_checks;