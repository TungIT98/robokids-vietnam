-- Migration: Create birthday_party_leads table
-- For tracking paid ad leads from Facebook/Zalo for Birthday Party bookings

CREATE TABLE IF NOT EXISTS birthday_party_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Lead source tracking
  source TEXT NOT NULL CHECK (source IN ('facebook', 'zalo', 'organic', 'referral')),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Ad variation tracking (for A/B testing)
  ad_variation TEXT,
  ad_set_id TEXT,

  -- Parent information
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_zalo TEXT,
  parent_email TEXT,

  -- Child info
  child_age_group TEXT CHECK (child_age_group IN ('6-8', '9-12', '13-16')),

  -- Lead status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'booked', 'lost', 'unqualified')),
  contacted_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,

  -- Booking reference (if converted)
  booking_id UUID REFERENCES birthday_party_bookings(id) ON DELETE SET NULL,

  -- Cost tracking (for ROI analysis)
  ad_spend_cents INTEGER,
  cost_per_lead_cents INTEGER,

  -- Notes
  notes TEXT,

  -- Sales agent assigned
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Updated timestamp
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_leads_source ON birthday_party_leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_status ON birthday_party_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON birthday_party_leads(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON birthday_party_leads(created_at);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_birthday_party_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER birthday_party_leads_updated_at
  BEFORE UPDATE ON birthday_party_leads
  FOR EACH ROW EXECUTE FUNCTION update_birthday_party_leads_updated_at();

-- RLS Policies
ALTER TABLE birthday_party_leads ENABLE ROW LEVEL SECURITY;

-- Public can INSERT (lead capture from ads)
CREATE POLICY "public_insert_birthday_leads"
  ON birthday_party_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Service role can do everything (server-side admin operations)
CREATE POLICY "service_role_all_birthday_leads"
  ON birthday_party_leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read leads (for sales agents)
CREATE POLICY "authenticated_read_birthday_leads"
  ON birthday_party_leads FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can update leads (for sales agents updating status)
CREATE POLICY "authenticated_update_birthday_leads"
  ON birthday_party_leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);