-- Purely additive: new nullable integer column, then backfill from existing data
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS foto_sessions INTEGER;

UPDATE registrations SET foto_sessions = CASE WHEN has_photos THEN num_sessions ELSE 0 END
WHERE foto_sessions IS NULL;
