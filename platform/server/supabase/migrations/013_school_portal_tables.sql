-- RoboKids Vietnam Platform Database Schema
-- Migration 013: School Partnership Portal Tables
-- Supports school profiles, teacher accounts, and school relationships

-- Schools table
CREATE TABLE public.schools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  district TEXT,
  phone TEXT,
  email TEXT,
  principal_name TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  logo_url TEXT,
  code TEXT UNIQUE, -- School code for identification
  is_active BOOLEAN DEFAULT true,
  subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'standard', 'premium')),
  subscription_start_date DATE,
  subscription_end_date DATE,
  max_students INTEGER DEFAULT 100,
  max_teachers INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers table (linked to profiles with role='teacher')
CREATE TABLE public.teachers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL UNIQUE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  employee_id TEXT, -- School employee ID
  subjects TEXT[], -- Array of subjects taught
  is_class_teacher BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- School-Teacher relations (many-to-many via schools_teachers)
CREATE TABLE public.school_teachers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'teacher' CHECK (role IN ('teacher', 'head_teacher', 'coordinator')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, teacher_id)
);

-- Classes table (linked to school)
CREATE TABLE public.school_classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL, -- e.g., "Grade 5A"
  grade_level INTEGER CHECK (grade_level >= 1 AND grade_level <= 12),
  academic_year TEXT, -- e.g., "2025-2026"
  schedule TEXT, -- JSON string for schedule
  max_students INTEGER DEFAULT 40,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student-School relations (for tracking which school a student belongs to)
CREATE TABLE public.student_school_relations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'graduated', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, school_id)
);

-- Enable Row Level Security
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_school_relations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schools
-- Admins can do everything
-- Teachers can view their school's info
CREATE POLICY "Admins can manage schools" ON public.schools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Teachers can view school info" ON public.schools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.school_teachers st
      WHERE st.school_id = schools.id AND st.teacher_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Schools are publicly readable for lookup" ON public.schools
  FOR SELECT USING (is_active = true);

-- RLS Policies for teachers
CREATE POLICY "Admins can manage teachers" ON public.teachers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Teachers can view own record" ON public.teachers
  FOR SELECT USING (
    profile_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.school_teachers st
      JOIN public.schools s ON s.id = st.school_id
      WHERE st.teacher_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.school_teachers st2
        WHERE st2.school_id = s.id AND st2.teacher_id = auth.uid()
        AND st2.role IN ('head_teacher', 'coordinator')
      )
    )
  );

-- RLS Policies for school_teachers
CREATE POLICY "Admins can manage school_teachers" ON public.school_teachers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Teachers can view school teachers" ON public.school_teachers
  FOR SELECT USING (
    teacher_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.school_teachers st2
      WHERE st2.school_id = school_teachers.school_id
      AND st2.teacher_id = auth.uid()
      AND st2.role IN ('head_teacher', 'coordinator')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "School coordinators can manage teachers" ON public.school_teachers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.school_teachers st
      WHERE st.school_id = school_teachers.school_id
      AND st.teacher_id = auth.uid()
      AND st.role IN ('head_teacher', 'coordinator')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for school_classes
CREATE POLICY "Admins can manage school_classes" ON public.school_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Teachers can view class info" ON public.school_classes
  FOR SELECT USING (
    teacher_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.school_teachers st
      WHERE st.school_id = school_classes.school_id
      AND st.teacher_id = auth.uid()
      AND st.role IN ('head_teacher', 'coordinator')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for student_school_relations
CREATE POLICY "Admins can manage student_school_relations" ON public.student_school_relations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Teachers can view student relations" ON public.student_school_relations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.school_teachers st
      WHERE st.school_id = student_school_relations.school_id
      AND st.teacher_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Parents can view their children's school relations
    EXISTS (
      SELECT 1 FROM public.student_parent_relations spr
      JOIN public.parents p ON p.id = spr.parent_id
      WHERE spr.student_id = student_school_relations.student_id
      AND p.profile_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_schools_code ON public.schools(code);
CREATE INDEX idx_schools_is_active ON public.schools(is_active);
CREATE INDEX idx_teachers_profile_id ON public.teachers(profile_id);
CREATE INDEX idx_teachers_school_id ON public.teachers(school_id);
CREATE INDEX idx_school_teachers_school_id ON public.school_teachers(school_id);
CREATE INDEX idx_school_teachers_teacher_id ON public.school_teachers(teacher_id);
CREATE INDEX idx_school_classes_school_id ON public.school_classes(school_id);
CREATE INDEX idx_school_classes_teacher_id ON public.school_classes(teacher_id);
CREATE INDEX idx_student_school_relations_student_id ON public.student_school_relations(student_id);
CREATE INDEX idx_student_school_relations_school_id ON public.student_school_relations(school_id);
CREATE INDEX idx_student_school_relations_class_id ON public.student_school_relations(class_id);

-- Trigger for updated_at on schools
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger for updated_at on teachers
CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger for updated_at on school_classes
CREATE TRIGGER update_school_classes_updated_at
  BEFORE UPDATE ON public.school_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to generate school code
CREATE OR REPLACE FUNCTION public.generate_school_code(school_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  code_suffix INTEGER;
  final_code TEXT;
BEGIN
  -- Get first 3 letters of school name, uppercase
  base_code := UPPER(SUBSTRING(school_name FROM 1 FOR 3));

  -- Find max suffix for this base code
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(code FROM 4) AS INTEGER)
  ), 0) INTO code_suffix
  FROM public.schools
  WHERE code LIKE base_code || '%';

  -- Generate new code
  final_code := base_code || LPAD((code_suffix + 1)::TEXT, 4, '0');

  RETURN final_code;
END;
$$ LANGUAGE plpgsql;