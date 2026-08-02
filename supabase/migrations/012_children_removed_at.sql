-- Soft-removal for children dropped from a family's Brevo contact.
-- NULL = active. A hard DELETE would cascade through session_children
-- (ON DELETE CASCADE) and erase the child's past attendance records.
ALTER TABLE children
  ADD COLUMN removed_at TIMESTAMPTZ;
