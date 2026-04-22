-- Migration 023: School Partnership Workflow
-- B2B school automation tables

-- School partnerships tracking
CREATE TABLE IF NOT EXISTS school_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL DEFAULT 'loi_pending' CHECK (current_stage IN (
    'loi_pending', 'loi_signed', 'demo_scheduled', 'demo_completed',
    'contract_negotiation', 'active', 'renewal_due', 'expired'
  )),
  stage_history JSONB DEFAULT '[]',
  loi_document_url TEXT,
  loi_signed_by TEXT,
  loi_signed_at TIMESTAMPTZ,
  loi_additional_notes TEXT,
  demo_date TIMESTAMPTZ,
  demo_type TEXT DEFAULT 'robotics_demo',
  demo_location TEXT,
  demo_notes TEXT,
  demo_scheduled_at TIMESTAMPTZ,
  demo_completed_at TIMESTAMPTZ,
  contract_start_date DATE,
  contract_end_date DATE,
  contract_document_url TEXT,
  activated_at TIMESTAMPTZ,
  last_roster_sync TIMESTAMPTZ,
  renewal_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- School classrooms (synced from school system)
CREATE TABLE IF NOT EXISTS school_classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  grade_level INTEGER,
  student_count INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, external_id)
);

-- School students (synced from school system)
CREATE TABLE IF NOT EXISTS school_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  grade_level INTEGER,
  classroom_external_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, external_id)
);

-- School invoices
CREATE TABLE IF NOT EXISTS school_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL,
  billing_period_start DATE,
  billing_period_end DATE,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partnerships_school_id ON school_partnerships(school_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_stage ON school_partnerships(current_stage);
CREATE INDEX IF NOT EXISTS idx_partnerships_contract_end ON school_partnerships(contract_end_date);
CREATE INDEX IF NOT EXISTS idx_classrooms_school ON school_classrooms(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON school_students(school_id);
CREATE INDEX IF NOT EXISTS idx_invoices_school ON school_invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON school_invoices(status);

-- RLS
ALTER TABLE school_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_invoices ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role can do everything on school_partnerships"
  ON school_partnerships FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on school_classrooms"
  ON school_classrooms FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on school_students"
  ON school_students FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on school_invoices"
  ON school_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated can read
CREATE POLICY "Authenticated can read school_partnerships"
  ON school_partnerships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read school_classrooms"
  ON school_classrooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read school_students"
  ON school_students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read school_invoices"
  ON school_invoices FOR SELECT TO authenticated USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_school_partnerships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_school_partnerships_updated_at
  BEFORE UPDATE ON school_partnerships FOR EACH ROW EXECUTE FUNCTION update_school_partnerships_updated_at();
CREATE TRIGGER update_school_classrooms_updated_at
  BEFORE UPDATE ON school_classrooms FOR EACH ROW EXECUTE FUNCTION update_school_partnerships_updated_at();
CREATE TRIGGER update_school_students_updated_at
  BEFORE UPDATE ON school_students FOR EACH ROW EXECUTE FUNCTION update_school_partnerships_updated_at();
CREATE TRIGGER update_school_invoices_updated_at
  BEFORE UPDATE ON school_invoices FOR EACH ROW EXECUTE FUNCTION update_school_partnerships_updated_at();
