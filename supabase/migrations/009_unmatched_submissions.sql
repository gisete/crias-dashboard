CREATE TABLE unmatched_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  month TEXT NOT NULL DEFAULT '',
  year INTEGER NOT NULL,
  month_id UUID REFERENCES months(id),
  plan TEXT DEFAULT '',
  unit_price NUMERIC DEFAULT 0,
  num_sessions INTEGER DEFAULT 0,
  has_photos BOOLEAN DEFAULT false,
  selected_dates TEXT[] DEFAULT '{}',
  image_consent TEXT,
  nif TEXT,
  voucher_code TEXT,
  notes TEXT,
  tally_submission_id TEXT UNIQUE,
  submitted_at TIMESTAMPTZ,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'notified', 'discarded')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
