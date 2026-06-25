-- Settings table (global defaults like session capacity)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES ('default_session_capacity', '12');

-- Families
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registrations
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id),
  tally_submission_id TEXT UNIQUE,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  plan TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  num_sessions INTEGER NOT NULL,
  num_children INTEGER NOT NULL DEFAULT 1,
  total_price INTEGER NOT NULL,
  selected_dates TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'a_pagar', 'lembrete', 'pago_confirmado', 'cancelado')),
  image_consent TEXT,
  has_photos BOOLEAN DEFAULT FALSE,
  voucher_code TEXT,
  notes TEXT,
  nif TEXT,
  invoice_requested BOOLEAN DEFAULT FALSE,
  webhook_error BOOLEAN DEFAULT FALSE,
  webhook_error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registrations_month_year ON registrations(year, month);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_family ON registrations(family_id);

-- Children
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE
);

CREATE INDEX idx_children_registration ON children(registration_id);

-- Session capacity overrides
CREATE TABLE session_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('manhã', 'tarde')),
  capacity INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month TEXT NOT NULL,
  UNIQUE(date, slot, year, month)
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
