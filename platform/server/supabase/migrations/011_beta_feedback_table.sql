-- RoboKids Vietnam Platform Database Schema
-- Migration 011: Beta Feedback Collection System
-- Supports NPS scores, usage data, and parent feedback collection

-- Beta feedback submissions table
CREATE TABLE public.beta_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  parent_email TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  -- NPS Score (0-10)
  nps_score INTEGER NOT NULL CHECK (nps_score >= 0 AND nps_score <= 10),
  -- NPS Category (derived: detractor 0-6, passive 7-8, promoter 9-10)
  nps_category TEXT NOT NULL GENERATED ALWAYS AS (
    CASE
      WHEN nps_score <= 6 THEN 'detractor'
      WHEN nps_score <= 8 THEN 'passive'
      ELSE 'promoter'
    END
  ) STORED,
  -- Usage metrics
  lessons_completed INTEGER DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  missions_completed INTEGER DEFAULT 0,
  -- Qualitative feedback
  feedback_text TEXT,
  -- What they like most
  likes_text TEXT,
  -- What could be improved
  improvements_text TEXT,
  -- Would recommend to others? (secondary NPS validation)
  would_recommend BOOLEAN,
  -- Technical issues encountered
  had_technical_issues BOOLEAN DEFAULT false,
  technical_issues_text TEXT,
  -- Submission timing
  submission_week INTEGER, -- 1, 2, 3, 4... for weekly tracking
  submission_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can submit feedback (beta program openness)
CREATE POLICY "Anyone can submit beta feedback"
  ON public.beta_feedback FOR INSERT
  TO anon
  WITH CHECK (true);

-- Service role can do everything
CREATE POLICY "Service role can manage feedback"
  ON public.beta_feedback FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX idx_beta_feedback_student_id ON public.beta_feedback(student_id);
CREATE INDEX idx_beta_feedback_nps_score ON public.beta_feedback(nps_score);
CREATE INDEX idx_beta_feedback_nps_category ON public.beta_feedback(nps_category);
CREATE INDEX idx_beta_feedback_submission_week ON public.beta_feedback(submission_week);
CREATE INDEX idx_beta_feedback_submission_date ON public.beta_feedback(submission_date);
CREATE INDEX idx_beta_feedback_parent_email ON public.beta_feedback(parent_email);

-- Trigger for updated_at
CREATE TRIGGER update_beta_feedback_updated_at
  BEFORE UPDATE ON public.beta_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Weekly feedback summary view (for CS reporting)
CREATE OR REPLACE VIEW public.beta_feedback_weekly_summary AS
SELECT
  submission_week,
  COUNT(*) as total_submissions,
  AVG(nps_score)::NUMERIC(3,2) as avg_nps_score,
  COUNT(CASE WHEN nps_category = 'promoter' THEN 1 END) as promoters,
  COUNT(CASE WHEN nps_category = 'passive' THEN 1 END) as passives,
  COUNT(CASE WHEN nps_category = 'detractor' THEN 1 END) as detractors,
  AVG(lessons_completed)::NUMERIC(5,2) as avg_lessons_completed,
  AVG(total_time_minutes)::NUMERIC(7,2) as avg_time_minutes,
  AVG(missions_completed)::NUMERIC(5,2) as avg_missions_completed,
  COUNT(CASE WHEN had_technical_issues = true THEN 1 END) as issues_reported,
  MIN(submission_date) as week_start,
  MAX(submission_date) as week_end
FROM beta_feedback
GROUP BY submission_week
ORDER BY submission_week DESC;

-- NPS trend view (for tracking score changes over time)
CREATE OR REPLACE VIEW public.beta_nps_trend AS
SELECT
  submission_date,
  AVG(nps_score) OVER (
    ORDER BY submission_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as rolling_7day_nps,
  COUNT(*) OVER (
    ORDER BY submission_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as rolling_7day_count
FROM beta_feedback
ORDER BY submission_date;
