-- Migration 022: Enrollment Pipeline Automation
-- Tracks enrollment funnel: Lead -> Qualify -> Demo -> Enroll -> Onboard

CREATE TABLE IF NOT EXISTS enrollment_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL DEFAULT 'lead' CHECK (current_stage IN ('lead', 'qualified', 'demo_scheduled', 'enrolled', 'onboarded')),
  stage_history JSONB DEFAULT '[]',
  conversion_metrics JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for pipeline queries
CREATE INDEX IF NOT EXISTS idx_pipeline_enrollment_id ON enrollment_pipeline(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_current_stage ON enrollment_pipeline(current_stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_created_at ON enrollment_pipeline(created_at DESC);

-- RLS policies
ALTER TABLE enrollment_pipeline ENABLE ROW LEVEL SECURITY;

-- Service role can do anything
CREATE POLICY "Service role can do everything on enrollment_pipeline"
  ON enrollment_pipeline FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read their own enrollment pipeline
CREATE POLICY "Users can read own enrollment pipeline"
  ON enrollment_pipeline FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.id = enrollment_pipeline.enrollment_id
      AND e.email IN (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

-- Anon can read pipeline status (for webhook verification)
CREATE POLICY "Anyone can read pipeline by enrollment ID"
  ON enrollment_pipeline FOR SELECT
  TO anon
  USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_pipeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_enrollment_pipeline_updated_at
  BEFORE UPDATE ON enrollment_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_updated_at();

-- Function to track stage conversions
CREATE OR REPLACE FUNCTION track_stage_conversion(
  p_enrollment_id UUID,
  p_from_stage TEXT,
  p_to_stage TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Log conversion for analytics (could be expanded to a separate conversions table)
  RAISE NOTICE 'Conversion tracked: enrollment % from % to %', p_enrollment_id, p_from_stage, p_to_stage;
END;
$$ LANGUAGE plpgsql;

-- Auto-create pipeline record when enrollment is created
CREATE OR REPLACE FUNCTION create_pipeline_on_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO enrollment_pipeline (enrollment_id, current_stage, stage_history)
  VALUES (NEW.id, 'lead', '[{"stage": "lead", "timestamp": now()::text, "action": "pipeline_created"}]');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_enrollment_created_pipeline
  AFTER INSERT ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION create_pipeline_on_enrollment();
