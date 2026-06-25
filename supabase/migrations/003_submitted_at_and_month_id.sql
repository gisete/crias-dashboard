-- submitted_at: original Tally submission timestamp for audit purposes
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- month_id: FK to months table for structured month lookups
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS month_id UUID REFERENCES months(id);
