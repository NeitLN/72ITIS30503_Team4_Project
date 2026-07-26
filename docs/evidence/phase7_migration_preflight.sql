-- Phase 7 Preflight Checks
-- Run this script to verify existing notification data before applying the Phase 7 migration.
-- This script is read-only and only reports counts.

-- 1. Check for unsupported notification types
SELECT COUNT(*) as unsupported_type_count
FROM public.notifications
WHERE type NOT IN (
  'new_order', 'cancellation', 'packing_needed', 'payment_recorded',
  'allocation_released', 'listing_sold', 'buyer_message', 'incomplete_setup'
);

-- 2. Check for blank or overlong titles
SELECT COUNT(*) as invalid_title_count
FROM public.notifications
WHERE title IS NULL OR char_length(trim(title)) < 1 OR char_length(trim(title)) > 255;

-- 3. Check for blank or overlong bodies
SELECT COUNT(*) as invalid_body_count
FROM public.notifications
WHERE body IS NULL OR char_length(trim(body)) < 1 OR char_length(trim(body)) > 1000;

-- 4. Check for unsafe action_href
-- Reject: external URLs (//), control characters, etc.
-- Accepts: Starts with / (and not //) and no control characters.
SELECT COUNT(*) as unsafe_action_href_count
FROM public.notifications
WHERE action_href IS NOT NULL AND (
  action_href !~ '^/[^[[:cntrl:]]]*$' OR action_href LIKE '//%'
);

-- 5. Check for inconsistent read state (is_read / read_at)
-- This assumes read_at was added but if it doesn't exist yet, we only check if the DB can support it safely when added.
-- Since read_at is added by the migration, this check might fail if run before the column exists.
-- But if the column exists, we verify:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='read_at') THEN
    EXECUTE '
      SELECT COUNT(*)
      FROM public.notifications
      WHERE (is_read = false AND read_at IS NOT NULL)
         OR (is_read = true AND read_at IS NULL)
    ' INTO current_setting('my.inconsistent_read_state_count', true);
    RAISE NOTICE 'Inconsistent read state count: %', current_setting('my.inconsistent_read_state_count');
  END IF;
END $$;

-- 6. Check for duplicate non-null event keys per user
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='event_key') THEN
    EXECUTE '
      SELECT COUNT(*)
      FROM (
        SELECT user_id, event_key
        FROM public.notifications
        WHERE event_key IS NOT NULL
        GROUP BY user_id, event_key
        HAVING COUNT(*) > 1
      ) dupes
    ' INTO current_setting('my.duplicate_event_keys_count', true);
    RAISE NOTICE 'Duplicate event keys count: %', current_setting('my.duplicate_event_keys_count');
  END IF;
END $$;
