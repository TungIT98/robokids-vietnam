-- RoboKids Vietnam Platform Database Schema
-- Migration 004: Missions Table
-- Gamification: Daily/weekly missions, achievements, and learning journeys

-- Drop existing missions tables if exist
DROP TABLE IF EXISTS public.mission_templates CASCADE;
DROP TABLE IF EXISTS public.user_missions CASCADE;
DROP TYPE IF EXISTS mission_type CASCADE;
DROP TYPE IF EXISTS mission_status CASCADE;

-- Mission type enum
CREATE TYPE mission_type AS ENUM ('daily', 'weekly', 'challenge', 'journey', 'achievement');

-- Mission status enum
CREATE TYPE mission_status AS ENUM ('active', 'completed', 'expired', 'cancelled');

-- Mission templates - predefined mission definitions
CREATE TABLE public.mission_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Mission identifiers
  slug TEXT UNIQUE NOT NULL,                    -- URL-friendly identifier
  mission_type mission_type NOT NULL DEFAULT 'daily',

  -- Bilingual content
  title TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  title_en TEXT,
  description_vi TEXT,
  description_en TEXT,

  -- Requirements to complete
  required_lessons TEXT[] DEFAULT '{}',          -- Array of lesson slugs required
  required_lesson_count INTEGER DEFAULT 1,      -- Alternative: count of lessons to complete
  required_xp INTEGER DEFAULT 0,                -- XP needed to complete
  required_streak_days INTEGER DEFAULT 0,       -- Streak days needed

  -- Time bounds (for daily/weekly)
  time_start TIME,                              -- When mission becomes available
  time_end TIME,                                -- When mission expires (daily missions)
  day_of_week INTEGER[],                       -- Days of week active (weekly missions) [0=Sun, 1=Mon, ...]

  -- Rewards
  xp_reward INTEGER DEFAULT 10,                -- XP awarded on completion
  badge_reward TEXT,                           -- Badge ID awarded on completion

  -- Visual/config
  icon_emoji TEXT DEFAULT '🎯',
  color_hex TEXT DEFAULT '#6366f1',

  -- Constraints
  min_age INTEGER,
  max_age INTEGER,
  age_group_filter age_group[],               -- Which age groups can see this
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User missions - individual mission progress per user
CREATE TABLE public.user_missions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- References
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_template_id UUID REFERENCES public.mission_templates(id) ON DELETE CASCADE,

  -- Status tracking
  status mission_status DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                      -- When this instance expires

  -- Progress
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  lessons_completed TEXT[] DEFAULT '{}',        -- Lesson slugs completed for this mission
  xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one active mission instance per user per template
  UNIQUE(user_id, mission_template_id, started_at)
);

-- Enable Row Level Security
ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mission_templates
-- Anyone can read active mission templates
CREATE POLICY "Mission templates are publicly readable" ON public.mission_templates
  FOR SELECT USING (is_active = true);

-- Only admins can manage mission templates
CREATE POLICY "Admins can manage mission templates" ON public.mission_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for user_missions
-- Users can read their own missions
CREATE POLICY "Users can read own missions" ON public.user_missions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own missions
CREATE POLICY "Users can insert own missions" ON public.user_missions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own missions
CREATE POLICY "Users can update own missions" ON public.user_missions
  FOR UPDATE USING (auth.uid() = user_id);

-- Teachers and admins can view all user missions
CREATE POLICY "Teachers can view all user missions" ON public.user_missions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- Create indexes
CREATE INDEX idx_mission_templates_type ON public.mission_templates(mission_type);
CREATE INDEX idx_mission_templates_age_group ON public.mission_templates(age_group_filter);
CREATE INDEX idx_user_missions_user_id ON public.user_missions(user_id);
CREATE INDEX idx_user_missions_status ON public.user_missions(status);
CREATE INDEX idx_user_missions_template_id ON public.user_missions(mission_template_id);

-- Trigger for updated_at
CREATE TRIGGER update_mission_templates_updated_at
  BEFORE UPDATE ON public.mission_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_missions_updated_at
  BEFORE UPDATE ON public.user_missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed mission templates
INSERT INTO public.mission_templates (slug, mission_type, title, title_vi, description_vi, required_lessons, required_lesson_count, xp_reward, badge_reward, icon_emoji, color_hex, age_group_filter) VALUES
-- Daily missions
(
  'daily-starter',
  'daily',
  'Daily Starter',
  'Khởi động hàng ngày',
  'Hoàn thành 1 bài học để bắt đầu ngày mới!',
  ARRAY['hello-robot'],
  1,
  10,
  'daily-starter',
  '🌅',
  '#22c55e',
  ARRAY['beginner']::age_group[]
),
(
  'daily-explorer',
  'daily',
  'Daily Explorer',
  'Khám phá hàng ngày',
  'Hoàn thành bất kỳ 1 bài học mới nào',
  '{}',
  1,
  15,
  'daily-explorer',
  '🔍',
  '#3b82f6',
  ARRAY['beginner', 'intermediate', 'advanced']::age_group[]
),
(
  'daily-champion',
  'daily',
  'Daily Champion',
  'Vô địch hàng ngày',
  'Hoàn thành 2 bài học trong ngày',
  '{}',
  2,
  30,
  'daily-champion',
  '🏆',
  '#f59e0b',
  ARRAY['beginner', 'intermediate', 'advanced']::age_group[]
),

-- Weekly missions
(
  'weekly-journey',
  'weekly',
  'Weekly Journey',
  'Hành trình tuần này',
  'Hoàn thành 5 bài học trong tuần',
  '{}',
  5,
  100,
  'weekly-journey',
  '🚀',
  '#8b5cf6',
  ARRAY['beginner', 'intermediate', 'advanced']::age_group[]
),
(
  'weekly-streak',
  'weekly',
  'Streak Master',
  'Siêu duy trì',
  'Duy trì streak 7 ngày liên tiếp',
  '{}',
  0,
  150,
  'streak-master',
  '🔥',
  '#ef4444',
  ARRAY['beginner', 'intermediate', 'advanced']::age_group[]
),
(
  'weekly-beginner-master',
  'weekly',
  'Beginner Master',
  'Bậc thầy Nhập môn',
  'Hoàn thành tất cả 10 bài học Nhập môn',
  ARRAY['hello-robot', 'robot-dance', 'light-show', 'maze-runner-1', 'maze-runner-2', 'robot-artist', 'animal-robot', 'robot-chef', 'follow-leader', 'robot-olympics'],
  10,
  200,
  'beginner-master',
  '🎓',
  '#10b981',
  ARRAY['beginner']::age_group[]
),

-- Challenge missions
(
  'challenge-maze-runner',
  'challenge',
  'Maze Runner Challenge',
  'Thử thách thoát mê cung',
  'Hoàn thành cả 2 bài Maze Runner',
  ARRAY['maze-runner-1', 'maze-runner-2'],
  2,
  50,
  'maze-master',
  '🧩',
  '#6366f1',
  ARRAY['beginner']::age_group[]
),
(
  'challenge-creativity',
  'challenge',
  'Creative Challenge',
  'Thử thách sáng tạo',
  'Hoàn thành 3 bài học sáng tạo',
  '{}',
  3,
  40,
  'creative-star',
  '🎨',
  '#ec4899',
  ARRAY['beginner', 'intermediate', 'advanced']::age_group[]
);

-- Function to check and award daily missions
CREATE OR REPLACE FUNCTION public.check_daily_missions()
RETURNS TRIGGER AS $$
DECLARE
  daily_template record;
  existing_mission record;
  lesson_count integer;
BEGIN
  -- Check if this is a lesson completion event
  IF NEW.completed = true AND NEW.completed_at IS NOT NULL THEN
    -- Find active daily missions for this user
    FOR daily_template IN
      SELECT mt.id, mt.slug, mt.required_lesson_count, mt.xp_reward, mt.badge_reward
      FROM public.mission_templates mt
      WHERE mt.mission_type = 'daily'
      AND mt.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.user_missions um
        WHERE um.user_id = NEW.user_id
        AND um.mission_template_id = mt.id
        AND um.status = 'completed'
        AND um.started_at >= CURRENT_DATE
      )
    LOOP
      -- Count completed lessons today for this user
      SELECT COUNT(*) INTO lesson_count
      FROM public.lesson_progress lp
      JOIN public.lessons l ON l.id = lp.lesson_id
      WHERE lp.user_id = NEW.user_id
      AND lp.completed = true
      AND DATE(lp.completed_at) = CURRENT_DATE;

      -- Check if daily mission is now complete
      IF lesson_count >= daily_template.required_lesson_count THEN
        UPDATE public.user_missions
        SET status = 'completed',
            completed_at = NOW(),
            progress_percent = 100
        WHERE user_id = NEW.user_id
        AND mission_template_id = daily_template.id
        AND status = 'active';

        -- Award XP
        UPDATE public.user_progress
        SET total_xp = total_xp + daily_template.xp_reward
        WHERE user_id = NEW.user_id;

        -- Award badge if applicable
        IF daily_template.badge_reward IS NOT NULL THEN
          UPDATE public.user_progress
          SET badges_earned = array_append(badges_earned, daily_template.badge_reward)
          WHERE user_id = NEW.user_id;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger would be attached to lesson_progress, but since the table
-- structure may vary, we're providing the function for application-level calls
-- or for attaching to the actual lesson_progress table as needed.

-- Function to initialize daily missions for a user
CREATE OR REPLACE FUNCTION public.initialize_daily_missions(user_uuid UUID)
RETURNS void AS $$
DECLARE
  template record;
BEGIN
  -- Create active daily mission instances for user
  FOR template IN
    SELECT id FROM public.mission_templates
    WHERE mission_type = 'daily'
    AND is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_missions um
      WHERE um.user_id = user_uuid
      AND um.mission_template_id = template.id
      AND um.started_at >= CURRENT_DATE
    )
  LOOP
    INSERT INTO public.user_missions (user_id, mission_template_id, expires_at)
    VALUES (user_uuid, template.id, CURRENT_DATE + INTERVAL '1 day');
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;