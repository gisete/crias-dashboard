-- Fixes existing registrations.selected_dates entries that have extra text
-- after the slot parenthesis (e.g. "11 (manhã) 2 VAGAS"), which caused
-- parseDateString in src/lib/data/sessions-sync.ts to fail to match and
-- silently skip session creation when a registration was confirmed.
--
-- Note: 005_populate_sessions.sql has the same underlying parsing issue in
-- its substring patterns (it also expects a bare "N (manhã|tarde)" with
-- nothing trailing). That migration has already been run against production
-- data, so it is intentionally left unmodified — this migration instead
-- normalizes the source data so the app's own session-sync code (and any
-- future manual re-run of the backfill logic) works correctly going forward.

DO $$
DECLARE
  reg RECORD;
  original_date TEXT;
  normalized_date TEXT;
  new_dates TEXT[];
  changed BOOLEAN;
BEGIN
  FOR reg IN SELECT id, selected_dates FROM registrations
  LOOP
    new_dates := ARRAY[]::TEXT[];
    changed := FALSE;

    FOREACH original_date IN ARRAY reg.selected_dates
    LOOP
      normalized_date := (regexp_match(original_date, '^(\d+\s*\((manhã|tarde)\))'))[1];

      IF normalized_date IS NULL THEN
        RAISE NOTICE 'registration %: selected_dates entry "%" does not match the expected pattern, left unchanged', reg.id, original_date;
        new_dates := array_append(new_dates, original_date);
      ELSE
        IF normalized_date IS DISTINCT FROM original_date THEN
          changed := TRUE;
        END IF;
        new_dates := array_append(new_dates, normalized_date);
      END IF;
    END LOOP;

    IF changed THEN
      UPDATE registrations SET selected_dates = new_dates WHERE id = reg.id;
    END IF;
  END LOOP;
END $$;
