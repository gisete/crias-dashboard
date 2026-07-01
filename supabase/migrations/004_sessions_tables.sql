-- Drop unused session_overrides table
DROP TABLE IF EXISTS session_overrides;

-- Sessions: one row per date+slot in a month
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('manhã', 'tarde')),
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 16,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, slot, month, year)
);

-- Session children: one row per child assigned to a session
CREATE TABLE session_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  present BOOLEAN,
  marked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, child_id)
);

CREATE INDEX idx_session_children_session ON session_children(session_id);
CREATE INDEX idx_session_children_registration ON session_children(registration_id);
CREATE INDEX idx_sessions_month_year ON sessions(year, month);
