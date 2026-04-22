-- Migration: Create birthday_party_bookings table
-- For RoboKids Vietnam birthday party service

CREATE TABLE IF NOT EXISTS birthday_party_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_zalo TEXT,
  package_tier TEXT NOT NULL CHECK (package_tier IN ('bronze', 'silver', 'gold')),
  preferred_date DATE NOT NULL,
  preferred_time TIME,
  num_children INTEGER NOT NULL CHECK (num_children > 0),
  total_amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for status filtering (admin queries)
CREATE INDEX IF NOT EXISTS idx_birthday_party_bookings_status ON birthday_party_bookings(status);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_birthday_party_bookings_preferred_date ON birthday_party_bookings(preferred_date);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_birthday_party_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER birthday_party_bookings_updated_at
  BEFORE UPDATE ON birthday_party_bookings
  FOR EACH ROW EXECUTE FUNCTION update_birthday_party_bookings_updated_at();

-- RLS Policies
ALTER TABLE birthday_party_bookings ENABLE ROW LEVEL SECURITY;

-- Public can INSERT (submit inquiry)
CREATE POLICY "public_insert_birthday_bookings"
  ON birthday_party_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role (server) can SELECT/UPDATE (admin operations use service role client)
-- RLS for SELECT/UPDATE is bypassed by the service role key used server-side
CREATE POLICY "service_role_all_birthday_bookings"
  ON birthday_party_bookings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
