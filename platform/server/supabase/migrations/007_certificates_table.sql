-- RoboKids Vietnam Platform Database Schema
-- Migration 007: Certificates Table
-- Stores PDF certificate records for lesson and course completions

-- Drop existing certificates table if exists
DROP TABLE IF EXISTS public.certificates CASCADE;

-- Certificates table
CREATE TABLE public.certificates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Unique certificate identifier (for verification)
  certificate_id TEXT UNIQUE NOT NULL,

  -- Reference to user (from auth.users)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Certificate type: lesson, beginner_course, intermediate_course, advanced_course
  certificate_type TEXT NOT NULL,

  -- Optional reference to lesson if this is a lesson certificate
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,

  -- Optional course identifier if this is a course certificate
  course_id TEXT,

  -- Course/Lesson name at time of issuance (for historical record)
  course_name TEXT NOT NULL,

  -- PDF storage URL (Supabase Storage)
  pdf_url TEXT,

  -- When the certificate was issued
  issued_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certificates
-- Users can read their own certificates
CREATE POLICY "Users can read own certificates" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own certificates (via API)
CREATE POLICY "Users can insert own certificates" ON public.certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role can manage all certificates" ON public.certificates
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Create indexes
CREATE INDEX idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX idx_certificates_certificate_id ON public.certificates(certificate_id);
CREATE INDEX idx_certificates_type ON public.certificates(certificate_type);
CREATE INDEX idx_certificates_issued_at ON public.certificates(issued_at);

-- Trigger for updated_at
CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();