-- RoboKids Vietnam Platform Database Schema
-- Migration 006: Parent Dashboard Tables
-- Supports parent access to children's learning progress

-- Parents table (extends profiles with parent-specific fields)
CREATE TABLE public.parents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  relationship TEXT, -- e.g., 'mother', 'father', 'guardian'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student-Parent relations table (explicit many-to-many)
CREATE TABLE public.student_parent_relations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE NOT NULL,
  relationship TEXT NOT NULL, -- e.g., 'mother', 'father', 'guardian'
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, parent_id)
);

-- Enable Row Level Security
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parent_relations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parents table
-- Parents can view their own record
CREATE POLICY "Parents can view own record" ON public.parents
  FOR SELECT USING (auth.uid() = profile_id);

-- Users can update their own parent record
CREATE POLICY "Parents can update own record" ON public.parents
  FOR UPDATE USING (auth.uid() = profile_id);

-- Parents can insert their own record (self-registration)
CREATE POLICY "Parents can insert own record" ON public.parents
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Teachers and admins can view all parents
CREATE POLICY "Teachers can view all parents" ON public.parents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- RLS Policies for student_parent_relations
-- Parents can view relations involving their children
CREATE POLICY "Parents can view their student relations" ON public.student_parent_relations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.id = parent_id AND p.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Parents can insert relations for their own children
CREATE POLICY "Parents can insert their student relations" ON public.student_parent_relations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.id = parent_id AND p.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Parents can update relations for their own children
CREATE POLICY "Parents can update their student relations" ON public.student_parent_relations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.id = parent_id AND p.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Parents can delete relations for their own children
CREATE POLICY "Parents can delete their student relations" ON public.student_parent_relations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.id = parent_id AND p.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Create indexes
CREATE INDEX idx_parents_profile_id ON public.parents(profile_id);
CREATE INDEX idx_student_parent_relations_student_id ON public.student_parent_relations(student_id);
CREATE INDEX idx_student_parent_relations_parent_id ON public.student_parent_relations(parent_id);

-- Trigger for updated_at on parents
CREATE TRIGGER update_parents_updated_at
  BEFORE UPDATE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enhanced RLS policy for students - parents can access via student_parent_relations
-- Drop existing parent policy first
DROP POLICY IF EXISTS "Parents can view their children" ON public.students;

-- New parent policy using explicit relations table
CREATE POLICY "Parents can view their children via relation" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_parent_relations spr
      JOIN public.parents p ON p.id = spr.parent_id
      WHERE spr.student_id = students.id AND p.profile_id = auth.uid()
    )
    OR
    -- Fallback: direct parent_id link for existing data
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Enhanced RLS for enrollments - parents can view via student relations
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.enrollments;

CREATE POLICY "Parents can view children enrollments" ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_parent_relations spr
      JOIN public.parents p ON p.id = spr.parent_id
      WHERE spr.student_id = enrollments.student_id AND p.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Enhanced RLS for lesson_progress - parents can view via student relations
DROP POLICY IF EXISTS "Users can manage own lesson progress" ON public.lesson_progress;

CREATE POLICY "Parents can view children lesson progress" ON public.lesson_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_parent_relations spr
      JOIN public.parents p ON p.id = spr.parent_id
      JOIN public.enrollments e ON e.student_id = spr.student_id
      WHERE e.id = lesson_progress.enrollment_id AND p.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Enhanced RLS for user_progress - parents can view children's progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;

CREATE POLICY "Parents can view children progress" ON public.user_progress
  FOR SELECT USING (
    -- Parent viewing child's progress via relation
    EXISTS (
      SELECT 1 FROM public.student_parent_relations spr
      JOIN public.parents pa ON pa.id = spr.parent_id
      JOIN public.students s ON s.id = spr.student_id
      WHERE s.profile_id = user_progress.user_id AND pa.profile_id = auth.uid()
    )
    OR
    -- User viewing own progress
    auth.uid() = user_id
    OR
    -- Admin/teacher viewing all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Parents can update children progress" ON public.user_progress
  FOR UPDATE USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Parents can insert own progress" ON public.user_progress
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Enhanced RLS for earned_badges - parents can view via child profile
DROP POLICY IF EXISTS "Users can view own earned badges" ON public.earned_badges;

CREATE POLICY "Parents can view children earned badges" ON public.earned_badges
  FOR SELECT USING (
    -- Parent viewing child's badges
    EXISTS (
      SELECT 1 FROM public.student_parent_relations spr
      JOIN public.parents pa ON pa.id = spr.parent_id
      JOIN public.students s ON s.id = spr.student_id
      WHERE s.profile_id = earned_badges.user_id AND pa.profile_id = auth.uid()
    )
    OR
    -- User viewing own badges
    auth.uid() = earned_badges.user_id
    OR
    -- Admin/teacher viewing all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );
