-- Migration 018: Mentors and Team Mentors Tables
-- Supports mentor management for robotics competition teams

-- ============================================================
-- mentors table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  skills TEXT[] DEFAULT '{}',  -- e.g. ["VEX", "FLL", "robotics", "programming"]
  coaching_experience TEXT,
  availability JSONB DEFAULT '{"weekdays": true, "weekends": true, "hours": "after-school"}',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'unavailable')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for mentors
CREATE INDEX IF NOT EXISTS idx_mentors_email ON public.mentors(email);
CREATE INDEX IF NOT EXISTS idx_mentors_status ON public.mentors(status);
CREATE INDEX IF NOT EXISTS idx_mentors_skills ON public.mentors USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_mentors_created_at ON public.mentors(created_at);

-- ============================================================
-- team_mentors junction table
-- Links mentors to competition teams
-- Note: teams table FK is pending teams table creation
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,  -- FK to teams table (pending creation)
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('primary', 'assistant', 'backup')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for team_mentors
CREATE INDEX IF NOT EXISTS idx_team_mentors_team_id ON public.team_mentors(team_id);
CREATE INDEX IF NOT EXISTS idx_team_mentors_mentor_id ON public.team_mentors(mentor_id);
CREATE INDEX IF NOT EXISTS idx_team_mentors_role ON public.team_mentors(role);

-- Unique constraint: one primary mentor per team
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_mentors_unique_primary
  ON public.team_mentors(team_id)
  WHERE role = 'primary';

-- ============================================================
-- RLS Policies for mentors
-- ============================================================
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_mentors ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for backend API)
CREATE POLICY "Service role can manage mentors" ON public.mentors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage team_mentors" ON public.team_mentors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public can read mentors (for team pages, mentor directories)
CREATE POLICY "Anyone can read mentors" ON public.mentors
  FOR SELECT TO anon USING (true);

-- Authenticated users can insert/update mentors
CREATE POLICY "Authenticated users can insert mentors" ON public.mentors
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update mentors" ON public.mentors
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Team mentors can be read by authenticated users
CREATE POLICY "Anyone can read team_mentors" ON public.team_mentors
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert/update team_mentors (for team assignment)
CREATE POLICY "Authenticated users can insert team_mentors" ON public.team_mentors
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update team_mentors" ON public.team_mentors
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Trigger to update updated_at for mentors
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_mentors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mentors_updated_at
  BEFORE UPDATE ON public.mentors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mentors_updated_at();

-- ============================================================
-- Trigger to update updated_at for team_mentors
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_team_mentors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_mentors_updated_at
  BEFORE UPDATE ON public.team_mentors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_mentors_updated_at();
