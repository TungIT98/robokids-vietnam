-- Migration 017: Parent Notifications Table
-- Supports push notification infrastructure for parents

CREATE TABLE IF NOT EXISTS public.parent_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('class_reminder', 'progress_update', 'enrollment_change', 'ai_recommendation')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_parent_notifications_parent_id ON public.parent_notifications(parent_id);
CREATE INDEX idx_parent_notifications_student_id ON public.parent_notifications(student_id);
CREATE INDEX idx_parent_notifications_is_read ON public.parent_notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_parent_notifications_created_at ON public.parent_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for backend/internal use)
CREATE POLICY "Service role can manage parent_notifications" ON public.parent_notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Parents can view their own notifications
CREATE POLICY "Parents can view own notifications" ON public.parent_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.id = parent_notifications.parent_id AND p.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Parents can update (mark as read) their own notifications
CREATE POLICY "Parents can update own notifications" ON public.parent_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.id = parent_notifications.parent_id AND p.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Internal service can insert notifications for parents
CREATE POLICY "Service can insert parent_notifications" ON public.parent_notifications
  FOR INSERT TO service_role WITH CHECK (true);

-- Trigger to update read_at when is_read changes
CREATE OR REPLACE FUNCTION public.update_parent_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parent_notification_read_at
  BEFORE UPDATE ON public.parent_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_parent_notification_read_at();