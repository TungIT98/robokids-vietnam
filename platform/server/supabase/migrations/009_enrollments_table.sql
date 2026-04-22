-- Migration 009: Enrollments table for beta program
-- Supports parent enrollment for RoboKids beta students

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  child_name TEXT NOT NULL,
  child_age INTEGER NOT NULL CHECK (child_age >= 6 AND child_age <= 16),
  class_schedule TEXT NOT NULL,
  consent_data_processing BOOLEAN NOT NULL DEFAULT true,
  consent_marketing BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'enrolled', 'rejected', 'cancelled')),
  notes TEXT,
  enrolled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_email ON enrollments(email);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_created_at ON enrollments(created_at);

-- RLS policies for enrollments
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Service role can do anything (for backend API)
CREATE POLICY "Service role can do everything on enrollments"
  ON enrollments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon to insert (for enrollment form submission)
CREATE POLICY "Anyone can submit enrollment"
  ON enrollments FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to read their own enrollment
-- Fix: compare email field (not id) since enrollments.email matches profiles.email for the user
CREATE POLICY "Users can read own enrollment"
  ON enrollments FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();