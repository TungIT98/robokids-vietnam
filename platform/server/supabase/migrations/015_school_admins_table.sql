-- Migration 015: School Admins Table for School Partnership Portal
-- Links profiles to schools as administrators

CREATE TABLE public.school_admins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'owner')),
  is_primary BOOLEAN DEFAULT false,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, profile_id)
);

-- Indexes
CREATE INDEX idx_school_admins_school_id ON public.school_admins(school_id);
CREATE INDEX idx_school_admins_profile_id ON public.school_admins(profile_id);

-- RLS Policies
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;

-- Admins can manage school_admins
CREATE POLICY "Admins can manage school_admins" ON public.school_admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- School admins can view school admins for their school
CREATE POLICY "School admins can view school_admins" ON public.school_admins
  FOR SELECT USING (
    profile_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.school_admins sa
      WHERE sa.school_id = school_admins.school_id
      AND sa.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- School admins can insert school_admins for their school
CREATE POLICY "School admins can create school_admins" ON public.school_admins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.school_admins sa
      WHERE sa.school_id = school_admins.school_id
      AND sa.profile_id = auth.uid()
      AND sa.role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- School admins can delete school_admins for their school (except owners)
CREATE POLICY "School admins can delete school_admins" ON public.school_admins
  FOR DELETE USING (
    profile_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.school_admins sa
      WHERE sa.school_id = school_admins.school_id
      AND sa.profile_id = auth.uid()
      AND sa.role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );