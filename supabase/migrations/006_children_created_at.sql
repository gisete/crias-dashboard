-- created_at is needed to preserve stable child ordering when re-syncing
-- family/children data from Brevo (positional matching against existing rows).
ALTER TABLE children ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
