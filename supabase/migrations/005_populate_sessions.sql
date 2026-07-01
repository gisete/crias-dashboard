-- One-time backfill of sessions / session_children from existing pago_confirmado
-- registrations. Safe to re-run: both inserts use ON CONFLICT DO NOTHING.
DO $$
DECLARE
  default_capacity INTEGER;
  reg RECORD;
  child_row RECORD;
  date_str TEXT;
  parsed_day TEXT;
  parsed_slot TEXT;
  session_uuid UUID;
BEGIN
  SELECT (value #>> '{}')::integer INTO default_capacity
  FROM settings
  WHERE key = 'default_session_capacity';

  IF default_capacity IS NULL THEN
    default_capacity := 16;
  END IF;

  FOR reg IN
    SELECT id, month, year, selected_dates
    FROM registrations
    WHERE status = 'pago_confirmado'
  LOOP
    FOREACH date_str IN ARRAY reg.selected_dates
    LOOP
      parsed_day := substring(date_str FROM '^(\d+)\s*\(');
      parsed_slot := substring(date_str FROM '\((manhã|tarde)\)');

      IF parsed_day IS NULL OR parsed_slot IS NULL THEN
        CONTINUE;
      END IF;

      INSERT INTO sessions (date, slot, month, year, capacity)
      VALUES (parsed_day, parsed_slot, reg.month, reg.year, default_capacity)
      ON CONFLICT (date, slot, month, year) DO NOTHING;

      SELECT id INTO session_uuid
      FROM sessions
      WHERE date = parsed_day
        AND slot = parsed_slot
        AND month = reg.month
        AND year = reg.year;

      FOR child_row IN
        SELECT id FROM children WHERE registration_id = reg.id
      LOOP
        INSERT INTO session_children (session_id, child_id, registration_id)
        VALUES (session_uuid, child_row.id, reg.id)
        ON CONFLICT (session_id, child_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
