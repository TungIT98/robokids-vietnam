-- RoboKids Vietnam Platform Database Schema
-- Migration 012: Coding Challenge Arena Tables
-- Supports competitive coding challenges with leaderboards and timed submissions

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.challenge_submissions CASCADE;
DROP TABLE IF EXISTS public.challenges CASCADE;
DROP TYPE IF EXISTS challenge_difficulty CASCADE;

-- Challenge difficulty enum
CREATE TYPE challenge_difficulty AS ENUM ('easy', 'medium', 'hard');

-- Challenges table - coding challenge templates
CREATE TABLE public.challenges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Core identifiers
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  title_en TEXT,
  description TEXT NOT NULL,
  description_vi TEXT,
  description_en TEXT,

  -- Challenge metadata
  difficulty challenge_difficulty NOT NULL DEFAULT 'medium',
  time_limit_seconds INTEGER NOT NULL DEFAULT 300,  -- 5 minutes default
  xp_reward INTEGER NOT NULL DEFAULT 100,
  blockly_xml_template TEXT,  -- Pre-loaded Blockly workspace XML

  -- Test cases stored as JSONB
  -- Format: [{ "id": "1", "input": "...", "expected": "...", "description": "..." }]
  test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Challenge settings
  is_active BOOLEAN DEFAULT true,
  min_age_group TEXT,  -- Optional: minimum age group required
  max_age_group TEXT,  -- Optional: maximum age group allowed

  -- Ordering
  order_index INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge submissions table - tracks student attempts
CREATE TABLE public.challenge_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- References
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Submission data
  submitted_xml TEXT,  -- Student's Blockly workspace XML
  test_results JSONB DEFAULT '[]'::jsonb,  -- [{ "test_case_id": "1", "passed": true, "output": "..." }]

  -- Scoring
  test_cases_passed INTEGER DEFAULT 0,
  test_cases_total INTEGER DEFAULT 0,
  score NUMERIC(10, 2) DEFAULT 0,  -- Final calculated score

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,  -- When student started the challenge
  submitted_at TIMESTAMPTZ,  -- When student submitted (NULL if in progress)
  time_taken_seconds INTEGER,  -- Calculated time taken

  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'expired')),

  -- Completion
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_challenges_difficulty ON public.challenges(difficulty);
CREATE INDEX idx_challenges_active ON public.challenges(is_active);
CREATE INDEX idx_submissions_challenge ON public.challenge_submissions(challenge_id);
CREATE INDEX idx_submissions_student ON public.challenge_submissions(student_id);
CREATE INDEX idx_submissions_status ON public.challenge_submissions(status);

-- Leaderboard view: top scores per challenge
CREATE OR REPLACE VIEW public.challenge_leaderboard AS
SELECT
  cs.challenge_id,
  cs.student_id,
  c.title,
  c.difficulty,
  c.xp_reward,
  cs.score,
  cs.test_cases_passed,
  cs.test_cases_total,
  cs.time_taken_seconds,
  cs.completed_at,
  -- Calculate rank within challenge
  RANK() OVER (PARTITION BY cs.challenge_id ORDER BY cs.score DESC, cs.time_taken_seconds ASC NULLS LAST) as rank,
  -- Calculate time bonus
  CASE
    WHEN cs.time_taken_seconds IS NOT NULL AND c.time_limit_seconds > 0 THEN
      CASE
        WHEN cs.time_taken_seconds <= (c.time_limit_seconds * 0.25) THEN 1.5  -- 1.5x if under 25% of time
        WHEN cs.time_taken_seconds <= (c.time_limit_seconds * 0.50) THEN 1.3  -- 1.3x if under 50%
        WHEN cs.time_taken_seconds <= (c.time_limit_seconds * 0.75) THEN 1.1  -- 1.1x if under 75%
        ELSE 1.0
      END
    ELSE 1.0
  END as time_multiplier,
  -- Final XP (with time bonus)
  GREATEST(0, FLOOR(c.xp_reward * (cs.test_cases_passed::numeric / NULLIF(cs.test_cases_total, 0)) *
    (CASE
      WHEN cs.time_taken_seconds IS NOT NULL AND c.time_limit_seconds > 0 THEN
        CASE
          WHEN cs.time_taken_seconds <= (c.time_limit_seconds * 0.25) THEN 1.5
          WHEN cs.time_taken_seconds <= (c.time_limit_seconds * 0.50) THEN 1.3
          WHEN cs.time_taken_seconds <= (c.time_limit_seconds * 0.75) THEN 1.1
          ELSE 1.0
        END
      ELSE 1.0
    END)))::integer as final_xp
FROM challenge_submissions cs
JOIN challenges c ON c.id = cs.challenge_id
WHERE cs.status = 'completed';

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for challenges (read: all authenticated, write: admin only)
CREATE POLICY "Challenges are viewable by authenticated users"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Challenges are insertable by authenticated users"
  ON public.challenges FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for submissions (read: own submissions, write: own submissions)
CREATE POLICY "Users can view own submissions"
  ON public.challenge_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Users can insert own submissions"
  ON public.challenge_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update own submissions"
  ON public.challenge_submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id);

-- Insert sample challenges
INSERT INTO public.challenges (slug, title, title_vi, description, description_vi, difficulty, time_limit_seconds, xp_reward, test_cases, is_active, order_index) VALUES
(
  'first-moves',
  'First Moves',
  'Bước đi đầu tiên',
  'Program your robot to move forward 3 steps!',
  'Lập trình robot của bạn di chuyển về phía trước 3 bước!',
  'easy',
  180,
  50,
  '[
    {"id": "1", "input": "move_forward(3)", "expected": "Robot moved 3 steps forward", "description": "Robot moves forward 3 steps"},
    {"id": "2", "input": "move_forward(1)", "expected": "Robot moved 1 step forward", "description": "Robot moves forward 1 step"}
  ]'::jsonb,
  true,
  1
),
(
  'square-dance',
  'Square Dance',
  'Nhảy ô vuông',
  'Program your robot to trace a square path!',
  'Lập trình robot vẽ một hình vuông!',
  'medium',
  300,
  100,
  '[
    {"id": "1", "input": "repeat(4, [move_forward(2), turn_right(90)])", "expected": "Robot traced a square", "description": "Complete square path"},
    {"id": "2", "input": "repeat(4, [move_forward(1), turn_right(90)])", "expected": "Robot traced a smaller square", "description": "Small square path"}
  ]'::jsonb,
  true,
  2
),
(
  'maze-runner',
  'Maze Runner',
  'Chạy trốn mê cung',
  'Navigate your robot through the maze to reach the goal!',
  'Điều kướng robot vượt qua mê cung để đến đích!',
  'hard',
  420,
  200,
  '[
    {"id": "1", "input": "solve_maze([right, forward, forward, left, forward])", "expected": "Robot reached goal", "description": "Solve the maze"},
    {"id": "2", "input": "find_path()", "expected": "Robot found optimal path", "description": "Find optimal path"},
    {"id": "3", "input": "move_to(target)", "expected": "Robot at target location", "description": "Move to target"}
  ]'::jsonb,
  true,
  3
);