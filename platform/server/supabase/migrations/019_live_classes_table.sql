-- Live Classes and Enrollments tables for Jitsi integration
-- RoboKids Vietnam

-- Live Classes table
CREATE TABLE IF NOT EXISTS live_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_students INTEGER DEFAULT 20,
  current_students INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  jitsi_room TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Class Enrollments table
CREATE TABLE IF NOT EXISTS live_class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(live_class_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_classes_status ON live_classes(status);
CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled_at ON live_classes(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_class_enrollments_class_id ON live_class_enrollments(live_class_id);
CREATE INDEX IF NOT EXISTS idx_live_class_enrollments_student_id ON live_class_enrollments(student_id);

-- RLS Policies
ALTER TABLE live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_class_enrollments ENABLE ROW LEVEL SECURITY;

-- Everyone can read live classes
CREATE POLICY "Public can read live_classes" ON live_classes
  FOR SELECT USING (true);

-- Users can read their enrollments
CREATE POLICY "Users can read own enrollments" ON live_class_enrollments
  FOR SELECT USING (student_id = auth.uid());

-- Users can enroll themselves
CREATE POLICY "Users can enroll in live_classes" ON live_class_enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Users can unenroll themselves
CREATE POLICY "Users can unenroll from live_classes" ON live_class_enrollments
  FOR DELETE USING (student_id = auth.uid());

-- Teachers/admins can manage live_classes (via service role)
CREATE POLICY "Service role can manage live_classes" ON live_classes
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
