ALTER TABLE session_children ADD COLUMN IF NOT EXISTS per_session_value NUMERIC(8,2);

-- Backfill from registration's unit_price / num_sessions
-- This fixes the multi-child bug (was incorrectly using total_price)
UPDATE session_children sc
SET per_session_value = CASE
  WHEN r.num_sessions > 0 THEN r.unit_price::numeric / r.num_sessions
  ELSE 0
END
FROM registrations r
WHERE sc.registration_id = r.id
  AND sc.per_session_value IS NULL;
