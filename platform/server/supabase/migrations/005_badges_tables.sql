-- RoboKids Vietnam Platform Database Schema
-- Migration 005: Badges and Earned Badges Tables
-- Tracks achievement badges and user badge acquisitions

-- Drop existing tables if exists
DROP TABLE IF EXISTS public.earned_badges CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;

-- Badges table - defines all available badges in the platform
CREATE TABLE public.badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Badge identification
  badge_key TEXT UNIQUE NOT NULL, -- e.g., 'first_lesson', 'streak_7_days', 'mission_master'
  name_vi TEXT NOT NULL,         -- Vietnamese name
  name_en TEXT NOT NULL,         -- English name
  description_vi TEXT,           -- Vietnamese description
  description_en TEXT,           -- English description

  -- Badge properties
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'lesson',      -- Completed a lesson
    'streak',      -- Streak-based achievement
    'mission',     -- Mission/challenge completion
    'level',       -- Level-based achievement
    'special',     -- Special event badges
    'course',      -- Course completion
    'milestone'    -- Platform milestones
  )),

  -- Criteria (stored as JSONB for flexibility)
  criteria JSONB NOT NULL DEFAULT '{}', -- e.g., {"lessons_completed": 5, "streak_days": 7}
  xp_reward INTEGER DEFAULT 10,          -- XP awarded when earned

  -- Badge visual
  icon_url TEXT,                         -- URL to badge icon
  color_hex TEXT DEFAULT '#FFD700',     -- Badge color for display

  -- Availability
  is_active BOOLEAN DEFAULT true,
  available_from TIMESTAMPTZ,           -- When badge becomes available
  available_to TIMESTAMPTZ,             -- When badge expires (null = never)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Earned badges table - tracks which users have earned which badges
CREATE TABLE public.earned_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- References
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,

  -- When earned
  earned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Context of how earned (stored as JSONB for flexibility)
  -- e.g., {"lesson_slug": "hello-robot", "mission_id": null, "streak_days": 3}
  earned_context JSONB DEFAULT '{}',

  -- Prevent duplicate badge grants
  UNIQUE(user_id, badge_id)
);

-- Enable Row Level Security
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earned_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges
-- Badges are publicly readable
CREATE POLICY "Badges are publicly readable" ON public.badges
  FOR SELECT USING (is_active = true);

-- Only admins can insert/update/delete badges
CREATE POLICY "Admins can manage badges" ON public.badges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- RLS Policies for earned_badges
-- Users can view their own earned badges
CREATE POLICY "Users can view own earned badges" ON public.earned_badges
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert earned badges (via service role)
CREATE POLICY "Service role can insert earned badges" ON public.earned_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own earned badges (for rare undo scenarios)
CREATE POLICY "Users can delete own earned badges" ON public.earned_badges
  FOR DELETE USING (auth.uid() = user_id);

-- Teachers and admins can view all earned badges
CREATE POLICY "Teachers can view all earned badges" ON public.earned_badges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Create indexes
CREATE INDEX idx_badges_badge_key ON public.badges(badge_key);
CREATE INDEX idx_badges_badge_type ON public.badges(badge_type);
CREATE INDEX idx_badges_is_active ON public.badges(is_active);
CREATE INDEX idx_earned_badges_user_id ON public.earned_badges(user_id);
CREATE INDEX idx_earned_badges_badge_id ON public.earned_badges(badge_id);
CREATE INDEX idx_earned_badges_earned_at ON public.earned_badges(earned_at);

-- Trigger for updated_at on badges
CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON public.badges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed initial badges
INSERT INTO public.badges (badge_key, name_vi, name_en, description_vi, description_en, badge_type, criteria, xp_reward, color_hex) VALUES
  -- Lesson badges
  ('first_lesson', 'Khám phá đầu tiên', 'First Discovery', 'Hoàn thành bài học đầu tiên', 'Completed your first lesson', 'lesson', '{"lessons_completed": 1}', 10, '#4CAF50'),
  ('lessons_5', 'Người học chăm chỉ', 'Dedicated Learner', 'Hoàn thành 5 bài học', 'Completed 5 lessons', 'lesson', '{"lessons_completed": 5}', 25, '#2196F3'),
  ('lessons_10', 'Chuyên gia Robot', 'Robot Expert', 'Hoàn thành 10 bài học', 'Completed 10 lessons', 'lesson', '{"lessons_completed": 10}', 50, '#9C27B0'),
  ('lessons_25', 'Bậc thầy Robot', 'Robot Master', 'Hoàn thành 25 bài học', 'Completed 25 lessons', 'lesson', '{"lessons_completed": 25}', 100, '#FF9800'),

  -- Streak badges
  ('streak_3_days', 'Khởi đầu tuyệt vời', 'Great Start', '3 ngày liên tiếp học tập', '3 days learning streak', 'streak', '{"streak_days": 3}', 15, '#00BCD4'),
  ('streak_7_days', 'Một tuần kiên trì', 'Week Warrior', '7 ngày liên tiếp học tập', '7 days learning streak', 'streak', '{"streak_days": 7}', 35, '#3F51B5'),
  ('streak_14_days', 'Hai tuần không ngừng', 'Two Week Champion', '14 ngày liên tiếp học tập', '14 days learning streak', 'streak', '{"streak_days": 14}', 70, '#E91E63'),
  ('streak_30_days', 'Huyền thoại một tháng', 'Monthly Legend', '30 ngày liên tiếp học tập', '30 days learning streak', 'streak', '{"streak_days": 30}', 150, '#FFD700'),

  -- Level badges
  ('level_5', 'Cấp độ 5', 'Level 5', 'Đạt cấp độ 5', 'Reached level 5', 'level', '{"min_level": 5}', 30, '#8BC34A'),
  ('level_10', 'Cấp độ 10', 'Level 10', 'Đạt cấp độ 10', 'Reached level 10', 'level', '{"min_level": 10}', 60, '#FF5722'),
  ('level_20', 'Cấp độ 20', 'Level 20', 'Đạt cấp độ 20', 'Reached level 20', 'level', '{"min_level": 20}', 120, '#673AB7'),

  -- Mission badges
  ('first_mission', 'Nhà thám hiểm', 'First Explorer', 'Hoàn thành nhiệm vụ đầu tiên', 'Completed your first mission', 'mission', '{"missions_completed": 1}', 20, '#00BCD4'),
  ('missions_5', 'Chiến binh nhiệm vụ', 'Mission Warrior', 'Hoàn thành 5 nhiệm vụ', 'Completed 5 missions', 'mission', '{"missions_completed": 5}', 50, '#009688'),
  ('missions_10', 'Vua nhiệm vụ', 'Mission King', 'Hoàn thành 10 nhiệm vụ', 'Completed 10 missions', 'mission', '{"missions_completed": 10}', 100, '#FFC107'),

  -- Course badges
  ('first_course', 'Khóa học đầu tiên', 'First Course', 'Hoàn thành khóa học đầu tiên', 'Completed your first course', 'course', '{"courses_completed": 1}', 40, '#4CAF50'),
  ('courses_3', 'Học viên chính thức', 'Official Student', 'Hoàn thành 3 khóa học', 'Completed 3 courses', 'course', '{"courses_completed": 3}', 80, '#2196F3');

-- Function to check and award badges based on criteria
CREATE OR REPLACE FUNCTION public.check_and_award_badges(
  p_user_id UUID,
  p_badge_type TEXT,
  p_criteria JSONB
)
RETURNS TABLE awarded_badge_id UUID) AS $$
DECLARE
  v_badge RECORD;
  v_already_earned BOOLEAN;
BEGIN
  -- Find badges matching the type and criteria that user hasn't earned yet
  FOR v_badge IN
    SELECT b.id, b.badge_key, b.criteria, b.xp_reward
    FROM public.badges b
    WHERE b.badge_type = p_badge_type
      AND b.is_active = true
      AND (b.available_from IS NULL OR b.available_from <= NOW())
      AND (b.available_to IS NULL OR b.available_to >= NOW())
      AND NOT EXISTS (
        SELECT 1 FROM public.earned_badges eb
        WHERE eb.user_id = p_user_id AND eb.badge_id = b.id
      )
  LOOP
    -- Check if criteria matches (simple JSONB containment check)
    IF v_badge.criteria @> p_criteria THEN
      -- Award the badge
      INSERT INTO public.earned_badges (user_id, badge_id, earned_context)
      VALUES (p_user_id, v_badge.id, p_criteria)
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      -- Award XP to user
      UPDATE public.user_progress
      SET total_xp = total_xp + v_badge.xp_reward
      WHERE user_id = p_user_id;

      awarded_badge_id := v_badge.id;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
