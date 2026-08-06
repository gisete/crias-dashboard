ALTER TABLE session_children ADD COLUMN IF NOT EXISTS has_photos BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: preserve current display exactly by mirroring the registration's has_photos
UPDATE session_children sc
SET has_photos = true
FROM registrations r
WHERE sc.registration_id = r.id
  AND r.has_photos = true
  AND sc.has_photos = false;
