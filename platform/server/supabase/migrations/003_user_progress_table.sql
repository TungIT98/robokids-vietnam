-- RoboKids Vietnam Platform Database Schema
-- Migration 003: User Progress Table
-- Tracks overall user progress across the platform (XP, levels, streak, achievements)

-- Drop existing user_progress table if exists
DROP TABLE IF EXISTS public.user_progress CASCADE;

-- User progress table - overall platform progress per user
CREATE TABLE public.user_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Reference to user (from auth.users)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Gamification: XP and level
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  level_title TEXT DEFAULT 'Beginner',

  -- Streak tracking
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,

  -- Completion stats
  lessons_completed INTEGER DEFAULT 0,
  courses_completed INTEGER DEFAULT 0,
  total_time_spent_seconds INTEGER DEFAULT 0,

  -- Badges/achievements (stored as JSONB array of badge IDs)
  badges_earned JSONB DEFAULT '[]',

  -- Last workspace state (for resume functionality)
  last_lesson_slug TEXT,
  last_workspace_xml TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_progress
-- Users can read their own progress
CREATE POLICY "Users can read own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own progress (automatic on signup)
CREATE POLICY "Users can insert own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Teachers and admins can view all progress
CREATE POLICY "Teachers can view all progress" ON public.user_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- Create indexes
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_current_level ON public.user_progress(current_level);
CREATE INDEX idx_user_progress_total_xp ON public.user_progress(total_xp);

-- Trigger for updated_at
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to initialize user_progress on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Create initial progress record for new users
  INSERT INTO public.user_progress (user_id, level_title)
  VALUES (NEW.id, 'Beginner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user_progress on profile creation
-- Note: This runs after the profile insert (triggered by auth.users insert)
CREATE OR REPLACE TRIGGER on_profile_created_progress
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_progress();

-- Function to update streak on activity
CREATE OR REPLACE FUNCTION public.update_streak_on_activity()
RETURNS TRIGGER AS $$
DECLARE
  last_date DATE;
  days_diff INTEGER;
BEGIN
  -- Get last activity date
  last_date := COALESCE(OLD.last_activity_date, CURRENT_DATE);

  -- Calculate days since last activity
  days_diff := CURRENT_DATE - last_date;

  -- If activity is today or yesterday, increment streak
  IF days_diff = 0 THEN
    -- Same day, no change to streak
    NEW.current_streak_days := OLD.current_streak_days;
  ELSIF days_diff = 1 THEN
    -- Consecutive day, increment streak
    NEW.current_streak_days := OLD.current_streak_days + 1;
    -- Update longest streak if needed
    IF NEW.current_streak_days > OLD.longest_streak_days THEN
      NEW.longest_streak_days := NEW.current_streak_days;
    END IF;
  ELSE
    -- Streak broken, reset to 1
    NEW.current_streak_days := 1;
  END IF;

  -- Update last activity date
  NEW.last_activity_date := CURRENT_DATE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;