-- Migration 014: Parent Invitations Table for School Partnership Portal
-- Tracks parent invitations sent during student batch import

CREATE TABLE public.parent_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  parent_email TEXT NOT NULL,
  parent_name TEXT,
  student_name TEXT,
  access_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'expired', 'cancelled')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  resend_count INTEGER DEFAULT 0,
  last_resent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_parent_invitations_school_id ON public.parent_invitations(school_id);
CREATE INDEX idx_parent_invitations_student_id ON public.parent_invitations(student_id);
CREATE INDEX idx_parent_invitations_parent_email ON public.parent_invitations(parent_email);
CREATE INDEX idx_parent_invitations_access_code ON public.parent_invitations(access_code);
CREATE INDEX idx_parent_invitations_status ON public.parent_invitations(status);

-- RLS Policies
ALTER TABLE public.parent_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invitations
CREATE POLICY "Admins can manage parent_invitations" ON public.parent_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- School admins and teachers can view invitations for their school
CREATE POLICY "School staff can view parent_invitations" ON public.parent_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.school_teachers st
      WHERE st.school_id = parent_invitations.school_id
      AND st.teacher_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.school_admins sa
      WHERE sa.school_id = parent_invitations.school_id
      AND sa.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Teachers can create invitations for their school
CREATE POLICY "School staff can create parent_invitations" ON public.parent_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.school_teachers st
      WHERE st.school_id = parent_invitations.school_id
      AND st.teacher_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.school_admins sa
      WHERE sa.school_id = parent_invitations.school_id
      AND sa.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Parents can view their own invitations by email (for acceptance)
CREATE POLICY "Parents can view own invitations" ON public.parent_invitations
  FOR SELECT USING (
    parent_email = (
      SELECT email FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_parent_invitations_updated_at
  BEFORE UPDATE ON public.parent_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to generate unique access code
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;