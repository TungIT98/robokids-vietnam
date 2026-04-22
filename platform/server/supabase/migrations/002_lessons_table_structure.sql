-- RoboKids Vietnam Platform Database Schema
-- Migration 002: Enhanced Lessons Table Structure
-- Supports rich curriculum data with age groups, steps, Blockly blocks, and progress tracking

-- Drop the basic lessons table if it exists (created in 001)
DROP TABLE IF EXISTS public.lesson_steps CASCADE;
DROP TABLE IF EXISTS public.lesson_progress CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;

-- Age groups enum
DROP TYPE IF EXISTS age_group CASCADE;
CREATE TYPE age_group AS ENUM ('beginner', 'intermediate', 'advanced');

-- Lesson difficulty enum
DROP TYPE IF EXISTS lesson_difficulty CASCADE;
CREATE TYPE lesson_difficulty AS ENUM ('basic', 'intermediate', 'advanced');

-- Lesson category enum
DROP TYPE IF EXISTS lesson_category CASCADE;
CREATE TYPE lesson_category AS ENUM ('movement', 'creativity', 'challenges', 'sensors', 'loops', 'variables', 'functions', 'math', 'logic');

-- Lessons table - main curriculum content
CREATE TABLE public.lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Core identifiers
  slug TEXT UNIQUE NOT NULL,          -- URL-friendly identifier (e.g., 'hello-robot')
  legacy_id TEXT,                     -- Original curriculum ID (e.g., 'beginner-01')

  -- Bilingual content
  title TEXT NOT NULL,                -- Display title (defaults to title_vi)
  title_vi TEXT NOT NULL,              -- Vietnamese title
  title_en TEXT,                       -- English title
  description_vi TEXT,                 -- Vietnamese description
  description_en TEXT,                -- English description

  -- Curriculum organization
  age_group age_group NOT NULL DEFAULT 'beginner',  -- beginner (6-8), intermediate (9-11), advanced (12-14)
  category lesson_category DEFAULT 'movement',
  difficulty lesson_difficulty DEFAULT 'basic',
  order_index INTEGER NOT NULL DEFAULT 0,  -- Position within age group curriculum

  -- Metadata
  estimated_minutes INTEGER DEFAULT 15,   -- Estimated completion time
  version INTEGER DEFAULT 1,
  author TEXT DEFAULT 'Content Creator',
  content_rating INTEGER DEFAULT 4 CHECK (content_rating >= 1 AND content_rating <= 5),

  -- Blockly configuration
  starter_xml TEXT,                       -- Initial Blockly workspace XML
  available_blocks JSONB DEFAULT '[]',     -- Array of available block IDs for this lesson
  block_config JSONB,                      -- Additional block configuration (labels, constraints)

  -- Navigation
  next_lesson_slug TEXT,                   -- Slug of the next lesson
  previous_lesson_slug TEXT,              -- Slug of the previous lesson

  -- Tags for discovery
  tags TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_age_group CHECK (age_group IN ('beginner', 'intermediate', 'advanced'))
);

-- Lesson Steps table - individual steps within a lesson
CREATE TABLE public.lesson_steps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Reference to parent lesson
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,

  -- Step identifiers
  step_key TEXT NOT NULL,                 -- e.g., 'step-1-1' for ordering
  step_order INTEGER NOT NULL DEFAULT 1,  -- Display order within lesson

  -- Bilingual content
  title TEXT NOT NULL,
  title_vi TEXT,
  title_en TEXT,
  description_vi TEXT,                    -- Instructions for this step
  description_en TEXT,

  -- Blockly configuration for this step
  allowed_blocks JSONB DEFAULT '[]',      -- Which blocks can be used in this step
  suggested_blocks JSONB DEFAULT '[]',     -- Blocks suggested to use
  blocked_blocks JSONB DEFAULT '[]',      -- Blocks not allowed

  -- Hints
  hint_vi TEXT,
  hint_en TEXT,

  -- Validation
  expected_output JSONB,                  -- Expected Blockly XML or output for validation

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(lesson_id, step_key)
);

-- Lesson Objectives table - learning objectives
CREATE TABLE public.lesson_objectives (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,

  -- Bilingual objectives
  objective_text_vi TEXT NOT NULL,
  objective_text_en TEXT,

  order_index INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lesson_id, objective_text_vi)
);

-- Curriculum Age Group Config - defines available blocks per age group
CREATE TABLE public.age_group_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  age_group age_group NOT NULL UNIQUE,

  -- Block configuration
  available_blocks JSONB NOT NULL DEFAULT '[]',
  disabled_blocks JSONB DEFAULT '[]',

  -- UI constraints
  show_code_preview BOOLEAN DEFAULT false,
  max_loop_depth INTEGER DEFAULT 1,
  max_nested_blocks INTEGER DEFAULT 10,

  -- Bilingual labels
  block_labels_vi JSONB DEFAULT '{}',     -- { "robot_move_forward": "Đi tới" }
  block_labels_en JSONB DEFAULT '{}',     -- { "robot_move_forward": "Move forward" }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Re-create lesson_progress with enhanced structure
CREATE TABLE public.lesson_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- References
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,

  -- Progress tracking
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,

  -- Step-level progress (which steps completed)
  completed_steps JSONB DEFAULT '[]',    -- Array of completed step_keys

  -- Workspace snapshot
  last_workspace_xml TEXT,               -- Last saved Blockly workspace

  -- Scores/ratings
  student_rating INTEGER CHECK (student_rating >= 1 AND student_rating <= 5),

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint - one progress record per user per lesson
  UNIQUE(user_id, lesson_id)
);

-- Enable Row Level Security
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_group_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Lessons
-- Anyone can read lessons (public curriculum)
CREATE POLICY "Lessons are publicly readable" ON public.lessons
  FOR SELECT USING (true);

-- Only admins can insert/update/delete lessons
CREATE POLICY "Admins can manage lessons" ON public.lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for Lesson Steps
CREATE POLICY "Lesson steps are publicly readable" ON public.lesson_steps
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage lesson steps" ON public.lesson_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for Lesson Objectives
CREATE POLICY "Lesson objectives are publicly readable" ON public.lesson_objectives
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage lesson objectives" ON public.lesson_objectives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for Age Group Configs
CREATE POLICY "Age group configs are publicly readable" ON public.age_group_configs
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage age group configs" ON public.age_group_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for Lesson Progress
-- Users can read their own progress
CREATE POLICY "Users can read own lesson progress" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can create own lesson progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own lesson progress" ON public.lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Teachers and admins can view student progress
CREATE POLICY "Teachers can view student progress" ON public.lesson_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- Create indexes
CREATE INDEX idx_lessons_slug ON public.lessons(slug);
CREATE INDEX idx_lessons_age_group ON public.lessons(age_group);
CREATE INDEX idx_lessons_order ON public.lessons(age_group, order_index);
CREATE INDEX idx_lesson_steps_lesson_id ON public.lesson_steps(lesson_id);
CREATE INDEX idx_lesson_objectives_lesson_id ON public.lesson_objectives(lesson_id);
CREATE INDEX idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_completed ON public.lesson_progress(completed);

-- Seed age group configurations
INSERT INTO public.age_group_configs (age_group, available_blocks, disabled_blocks, show_code_preview, max_loop_depth, block_labels_vi, block_labels_en) VALUES
(
  'beginner',
  '["robot_led_on", "robot_led_off", "robot_move_forward", "robot_move_backward", "robot_turn_left", "robot_turn_right", "robot_wait"]'::jsonb,
  '[]'::jsonb,
  false,
  1,
  '{"robot_led_on": "Bật đèn", "robot_led_off": "Tắt đèn", "robot_move_forward": "Đi tới", "robot_move_backward": "Đi lùi", "robot_turn_left": "Rẽ trái", "robot_turn_right": "Rẽ phải", "robot_wait": "Chờ"}'::jsonb,
  '{"robot_led_on": "Turn on LED", "robot_led_off": "Turn off LED", "robot_move_forward": "Move forward", "robot_move_backward": "Move backward", "robot_turn_left": "Turn left", "robot_turn_right": "Turn right", "robot_wait": "Wait"}'::jsonb
),
(
  'intermediate',
  '["robot_led_on", "robot_led_off", "robot_move_forward", "robot_move_backward", "robot_turn_left", "robot_turn_right", "robot_wait", "robot_sensor_start", "robot_sensor_read", "robot_play_note", "robot_repeat"]'::jsonb,
  '[]'::jsonb,
  false,
  3,
  '{"robot_led_on": "Bật đèn", "robot_led_off": "Tắt đèn", "robot_move_forward": "Đi tới", "robot_move_backward": "Đi lùi", "robot_turn_left": "Rẽ trái", "robot_turn_right": "Rẽ phải", "robot_wait": "Chờ", "robot_sensor_start": "Bật cảm biến", "robot_sensor_read": "Đọc cảm biến", "robot_play_note": "Phát nhạc", "robot_repeat": "Lặp lại"}'::jsonb,
  '{"robot_led_on": "Turn on LED", "robot_led_off": "Turn off LED", "robot_move_forward": "Move forward", "robot_move_backward": "Move backward", "robot_turn_left": "Turn left", "robot_turn_right": "Turn right", "robot_wait": "Wait", "robot_sensor_start": "Start sensor", "robot_sensor_read": "Read sensor", "robot_play_note": "Play note", "robot_repeat": "Repeat"}'::jsonb
),
(
  'advanced',
  '["robot_led_on", "robot_led_off", "robot_move_forward", "robot_move_backward", "robot_turn_left", "robot_turn_right", "robot_wait", "robot_sensor_start", "robot_sensor_read", "robot_play_note", "robot_repeat", "robot_variable_set", "robot_if", "robot_math", "robot_compare"]'::jsonb,
  '[]'::jsonb,
  true,
  5,
  '{"robot_led_on": "Bật đèn", "robot_led_off": "Tắt đèn", "robot_move_forward": "Đi tới", "robot_move_backward": "Đi lùi", "robot_turn_left": "Rẽ trái", "robot_turn_right": "Rẽ phải", "robot_wait": "Chờ", "robot_sensor_start": "Bật cảm biến", "robot_sensor_read": "Đọc cảm biến", "robot_play_note": "Phát nhạc", "robot_repeat": "Lặp lại", "robot_variable_set": "Đặt biến", "robot_if": "Nếu thì", "robot_math": "Tính toán", "robot_compare": "So sánh"}'::jsonb,
  '{"robot_led_on": "Turn on LED", "robot_led_off": "Turn off LED", "robot_move_forward": "Move forward", "robot_move_backward": "Move backward", "robot_turn_left": "Turn left", "robot_turn_right": "Turn right", "robot_wait": "Wait", "robot_sensor_start": "Start sensor", "robot_sensor_read": "Read sensor", "robot_play_note": "Play note", "robot_repeat": "Repeat", "robot_variable_set": "Set variable", "robot_if": "If then", "robot_math": "Calculate", "robot_compare": "Compare"}'::jsonb
);

-- Seed beginner lessons from existing curriculum
INSERT INTO public.lessons (slug, legacy_id, title, title_vi, title_en, description_vi, description_en, age_group, category, difficulty, order_index, estimated_minutes, starter_xml, available_blocks, next_lesson_slug, tags, version, author) VALUES
(
  'hello-robot',
  'beginner-01',
  'Xin chào Robot!',
  'Xin chào Robot!',
  'Hello Robot!',
  'Bài học đầu tiên - làm quen với robot và các lệnh di chuyển cơ bản',
  'First lesson - getting started with robot and basic movement commands',
  'beginner',
  'movement',
  'basic',
  1,
  15,
  '<xml><block type="robot_led_on" x="100" y="50"></block></xml>',
  '["robot_led_on", "robot_move_forward", "robot_wait", "robot_led_off"]'::jsonb,
  'robot-dance',
  '["basics", "movement", "first-steps"]',
  1,
  'Content Creator'
),
(
  'robot-dance',
  'beginner-02',
  'Điệu nhảy Robot',
  'Điệu nhảy Robot',
  'Robot Dance',
  'Học cách tạo chuỗi lệnh liên tiếp để robot nhảy theo nhịp',
  'Learn to create sequential command chains for robot dance routines',
  'beginner',
  'movement',
  'basic',
  2,
  20,
  '<xml></xml>',
  '["robot_led_on", "robot_move_forward", "robot_turn_left", "robot_turn_right", "robot_wait", "robot_led_off"]'::jsonb,
  'light-show',
  '["movement", "dance", "sequences"]',
  1,
  'Content Creator'
),
(
  'light-show',
  'beginner-03',
  'Sân khấu đèn LED',
  'Sân khấu đèn LED',
  'LED Light Show',
  'Điều khiển đèn LED của robot để tạo hiệu ứng ánh sáng',
  'Control robot LED lights to create light effects',
  'beginner',
  'creativity',
  'basic',
  3,
  15,
  '<xml></xml>',
  '["robot_led_on", "robot_led_off", "robot_wait"]'::jsonb,
  'maze-runner',
  '["creativity", "led", "lights"]',
  1,
  'Content Creator'
),
(
  'maze-runner',
  'beginner-04',
  'Robot vượt mê cung',
  'Robot vượt mê cung',
  'Maze Runner',
  'Điều khiển robot di chuyển qua một mê cung đơn giản',
  'Navigate a robot through a simple maze',
  'beginner',
  'challenges',
  'basic',
  4,
  25,
  '<xml></xml>',
  '["robot_move_forward", "robot_turn_left", "robot_turn_right", "robot_wait"]'::jsonb,
  'follow-line',
  '["challenges", "maze", "navigation"]',
  1,
  'Content Creator'
),
(
  'follow-line',
  'beginner-05',
  'Robot đi theo đường',
  'Robot đi theo đường',
  'Follow the Line',
  'Sử dụng cảm biến để robot di chuyển theo đường vẽ',
  'Use sensors to make robot follow a drawn path',
  'beginner',
  'sensors',
  'basic',
  5,
  30,
  '<xml></xml>',
  '["robot_sensor_start", "robot_move_forward", "robot_turn_left", "robot_turn_right", "robot_wait"]'::jsonb,
  NULL,
  '["sensors", "line-following", "advanced-beginner"]',
  1,
  'Content Creator'
);

-- Seed lesson steps for hello-robot lesson
INSERT INTO public.lesson_steps (lesson_id, step_key, step_order, title, title_vi, description_vi, allowed_blocks, hint_vi)
SELECT
  l.id,
  'step-1-1',
  1,
  'Bật đèn robot',
  'Bật đèn robot',
  'Trước tiên, hãy bật đèn robot để Robot thức dậy!',
  '["robot_led_on"]'::jsonb,
  'Tìm khối "Bật đèn" trong danh mục Robot và kéo nó vào workspace'
FROM public.lessons l WHERE l.slug = 'hello-robot';

INSERT INTO public.lesson_steps (lesson_id, step_key, step_order, title, title_vi, description_vi, allowed_blocks, hint_vi)
SELECT
  l.id,
  'step-1-2',
  2,
  'Di chuyển tới',
  'Di chuyển tới',
  'Bây giờ hãy làm robot di chuyển tới với tốc độ 10 bước!',
  '["robot_move_forward"]'::jsonb,
  'Kéo khối "Di chuyển tới" và nối với khối bật đèn'
FROM public.lessons l WHERE l.slug = 'hello-robot';

INSERT INTO public.lesson_steps (lesson_id, step_key, step_order, title, title_vi, description_vi, allowed_blocks, hint_vi)
SELECT
  l.id,
  'step-1-3',
  3,
  'Chờ một chút',
  'Chờ một chút',
  'Robot cần nghỉ ngơi! Thêm khối chờ 2 giây.',
  '["robot_wait"]'::jsonb,
  'Khối chờ giúp robot dừng lại trước khi làm gì tiếp theo'
FROM public.lessons l WHERE l.slug = 'hello-robot';

-- Seed lesson objectives for hello-robot
INSERT INTO public.lesson_objectives (lesson_id, objective_text_vi, objective_text_en, order_index)
SELECT
  l.id,
  'Hiểu cách robot di chuyển tới',
  'Understand how the robot moves forward',
  1
FROM public.lessons l WHERE l.slug = 'hello-robot';

INSERT INTO public.lesson_objectives (lesson_id, objective_text_vi, objective_text_en, order_index)
SELECT
  l.id,
  'Sử dụng khối move_forward',
  'Use the move_forward block',
  2
FROM public.lessons l WHERE l.slug = 'hello-robot';

-- Triggers for updated_at
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_lesson_steps_updated_at
  BEFORE UPDATE ON public.lesson_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_age_group_configs_updated_at
  BEFORE UPDATE ON public.age_group_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
