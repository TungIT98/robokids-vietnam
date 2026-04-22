-- Mobile Device Tokens and Push Notification Preferences
-- Migration: 008_mobile_device_tokens

-- Device tokens table for FCM push notifications
CREATE TABLE public.device_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  fcm_token TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')) DEFAULT 'android',
  device_name TEXT,
  app_version TEXT,
  push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate tokens per user
  UNIQUE(user_id, fcm_token)
);

-- Push notification categories/preferences
CREATE TABLE public.push_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  lesson_reminders BOOLEAN DEFAULT true,
  lesson_reminder_time TIME DEFAULT '18:00:00',
  weekly_progress BOOLEAN DEFAULT true,
  weekly_progress_day TEXT DEFAULT 'sunday' CHECK (weekly_progress_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  badge_earned BOOLEAN DEFAULT true,
  mission_available BOOLEAN DEFAULT true,
  parent_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_published to lessons table for mobile app filtering
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Update existing lessons to be published
UPDATE public.lessons SET is_published = true WHERE is_published IS NULL;

-- Tutorials table for guided lessons
CREATE TABLE public.tutorials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title_vi TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_vi TEXT,
  description_en TEXT,
  content_vi TEXT,
  content_en TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'getting-started', 'blocks', 'robot', 'parent')),
  age_group TEXT CHECK (age_group IN ('beginner', 'intermediate', 'advanced', 'all')),
  order_index INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  video_url TEXT,
  duration_minutes INTEGER,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tutorial progress tracking
CREATE TABLE public.tutorial_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tutorial_id UUID REFERENCES public.tutorials(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  last_position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tutorial_id)
);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Device tokens: users can manage their own tokens
CREATE POLICY "Users can view own device tokens" ON public.device_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device tokens" ON public.device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device tokens" ON public.device_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own device tokens" ON public.device_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Push preferences: users can manage their own preferences
CREATE POLICY "Users can view own push preferences" ON public.push_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push preferences" ON public.push_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push preferences" ON public.push_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Tutorials: publicly readable when published
CREATE POLICY "Published tutorials are publicly readable" ON public.tutorials
  FOR SELECT USING (is_published = true);

-- Tutorial progress: users can manage their own progress
CREATE POLICY "Users can manage own tutorial progress" ON public.tutorial_progress
  FOR ALL USING (auth.uid() = user_id);

-- Parent access to child's data via RLS
-- Parents can view their children's device tokens and push preferences
CREATE POLICY "Parents can view children's device tokens" ON public.device_tokens
  FOR SELECT USING (
    auth.uid() IN (
      SELECT parent_id FROM public.students
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children's push preferences" ON public.push_preferences
  FOR SELECT USING (
    auth.uid() IN (
      SELECT parent_id FROM public.students
      WHERE profile_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_device_tokens_user_id ON public.device_tokens(user_id);
CREATE INDEX idx_device_tokens_fcm_token ON public.device_tokens(fcm_token);
CREATE INDEX idx_push_preferences_user_id ON public.push_preferences(user_id);
CREATE INDEX idx_tutorials_slug ON public.tutorials(slug);
CREATE INDEX idx_tutorials_published ON public.tutorials(is_published);
CREATE INDEX idx_tutorial_progress_user_id ON public.tutorial_progress(user_id);
CREATE INDEX idx_tutorial_progress_tutorial_id ON public.tutorial_progress(tutorial_id);

-- Trigger for push_preferences updated_at
CREATE TRIGGER update_push_preferences_updated_at
  BEFORE UPDATE ON public.push_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger for device_tokens updated_at
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger for tutorials updated_at
CREATE TRIGGER update_tutorials_updated_at
  BEFORE UPDATE ON public.tutorials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger for tutorial_progress updated_at
CREATE TRIGGER update_tutorial_progress_updated_at
  BEFORE UPDATE ON public.tutorial_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to update last_used_at on device token
CREATE OR REPLACE FUNCTION public.update_device_token_last_used()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_device_token_used
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_device_token_last_used();
