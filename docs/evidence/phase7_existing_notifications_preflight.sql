-- B. docs/evidence/phase7_existing_notifications_preflight.sql
-- Run only when public.notifications already exists
-- Uses only SELECT or WITH ... SELECT

WITH notification_counts AS (
  SELECT
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (
      WHERE type NOT IN (
        'new_order', 'cancellation', 'packing_needed', 'payment_recorded',
        'allocation_released', 'listing_sold', 'buyer_message', 'incomplete_setup'
      )
    ) as unsupported_types_count,
    COUNT(*) FILTER (
      WHERE title IS NULL OR char_length(trim(title)) < 1 OR char_length(trim(title)) > 255
    ) as invalid_title_count,
    COUNT(*) FILTER (
      WHERE body IS NULL OR char_length(trim(body)) < 1 OR char_length(trim(body)) > 1000
    ) as invalid_body_count,
    COUNT(*) FILTER (
      WHERE action_href IS NOT NULL AND (
        action_href = ''
        OR left(action_href, 1) <> '/'
        OR left(action_href, 2) = '//'
        OR strpos(action_href, E'\\') > 0
        OR action_href ~ '[[:cntrl:]]'
        OR action_href ~* '%5c'
      )
    ) as unsafe_action_href_count
  FROM public.notifications
)
SELECT * FROM notification_counts;