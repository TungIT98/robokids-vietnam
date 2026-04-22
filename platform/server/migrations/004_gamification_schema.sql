-- RoboKids Vietnam - Gamification Schema Migration
-- Creates tables for badges, XP system, and extends streak tracking

-- ============================================
-- BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key VARCHAR(100) UNIQUE NOT NULL,
  name_vi VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_vi TEXT,
  description_en TEXT,
  icon VARCHAR(255),
  type VARCHAR(50) NOT NULL DEFAULT 'achievement',
  criteria_json JSONB DEFAULT '{}',
  xp_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EARNED BADGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS earned_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  earned_context JSONB DEFAULT '{}',
  UNIQUE(user_id, badge_id)
);

-- ============================================
-- XP POINTS TABLE (Transaction Log)
-- ============================================
CREATE TABLE IF NOT EXISTS xp_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason VARCHAR(255) NOT NULL,
  source_type VARCHAR(50),
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER LEVEL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  level_xp INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STREAK CHECKINS TABLE (already exists in streaks.js, adding if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS streak_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);

-- ============================================
-- SEED DATA: 4 Space Academy Badge Definitions
-- ============================================
INSERT INTO badges (badge_key, name_vi, name_en, description_vi, description_en, icon, type, criteria_json, xp_reward) VALUES
(
  'earth_explorer',
  'Earth Explorer',
  'Earth Explorer',
  'Hoàn thành bài học đầu tiên',
  'Completed your first lesson',
  'earth',
  'milestone',
  '{"type": "lesson_complete", "count": 1}',
  50
),
(
  'mars_pioneer',
  'Mars Pioneer',
  'Mars Pioneer',
  'Hoàn thành thử thách đầu tiên',
  'Completed your first challenge',
  'mars',
  'milestone',
  '{"type": "challenge_complete", "count": 1}',
  75
),
(
  'jupiter_master',
  'Jupiter Master',
  'Jupiter Master',
  'Hoàn thành toàn bộ module học tập',
  'Completed an entire learning module',
  'jupiter',
  'milestone',
  '{"type": "module_complete", "count": 1}',
  150
),
(
  'galaxy_master',
  'Galaxy Master',
  'Galaxy Master',
  'Hoàn thành toàn bộ khóa học',
  'Completed an entire course',
  'galaxy',
  'milestone',
  '{"type": "course_complete", "count": 1}',
  300
),
(
  'streak_7',
  '7 Ngày Liên Tục',
  '7 Day Streak',
  'Điểm danh 7 ngày liên tục',
  'Checked in 7 days in a row',
  'streak',
  'streak',
  '{"type": "streak", "days": 7}',
  25
),
(
  'streak_30',
  '30 Ngày Liên Tục',
  '30 Day Streak',
  'Điểm danh 30 ngày liên tục',
  'Checked in 30 days in a row',
  'streak',
  'streak',
  '{"type": "streak", "days": 30}',
  100
),
(
  'streak_100',
  '100 Ngày Liên Tục',
  '100 Day Streak',
  'Điểm danh 100 ngày liên tục',
  'Checked in 100 days in a row',
  'streak',
  'streak',
  '{"type": "streak", "days": 100}',
  500
)
ON CONFLICT (badge_key) DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE earned_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_checkins ENABLE ROW LEVEL SECURITY;

-- Badges: everyone can read, service role can write
CREATE POLICY "Badges are viewable by everyone" ON badges FOR SELECT USING (true);
CREATE POLICY "Service role can insert badges" ON badges FOR INSERT WITH CHECK (true);

-- Earned badges: users can read their own, service role can write
CREATE POLICY "Users can view their own earned badges" ON earned_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage earned badges" ON earned_badges FOR ALL USING (true);

-- XP points: users can read their own, service role can write
CREATE POLICY "Users can view their own XP" ON xp_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage XP" ON xp_points FOR ALL USING (true);

-- User levels: users can read their own, service role can write
CREATE POLICY "Users can view their own level" ON user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage levels" ON user_levels FOR ALL USING (true);

-- Streak checkins: users can read/write their own
CREATE POLICY "Users can manage their own checkins" ON streak_checkins FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_earned_badges_user_id ON earned_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_earned_badges_badge_id ON earned_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_xp_points_user_id ON xp_points(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_points_created_at ON xp_points(created_at);
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_checkins_user_id ON streak_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_checkins_date ON streak_checkins(checkin_date);