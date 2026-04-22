-- Ghost Racing Leaderboard Table
-- Stores race times and ghost trajectories for Ghost Racing Gold Cup

CREATE TABLE IF NOT EXISTS public.ghost_leaderboard (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  race_time_ms INTEGER NOT NULL,
  ghost_path_url TEXT,
  ghost_data JSONB,
  track_id TEXT NOT NULL,
  is_gold_cup BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ghost_leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read leaderboard data
CREATE POLICY "Ghost leaderboard is publicly readable"
  ON public.ghost_leaderboard
  FOR SELECT USING (true);

-- Students can only insert their own times
CREATE POLICY "Students can insert their own race times"
  ON public.ghost_leaderboard
  FOR INSERT WITH CHECK (auth.uid() = (SELECT profile_id FROM public.students WHERE id = student_id));

-- Create indexes for performance
CREATE INDEX idx_ghost_leaderboard_student_id ON public.ghost_leaderboard(student_id);
CREATE INDEX idx_ghost_leaderboard_track_id ON public.ghost_leaderboard(track_id);
CREATE INDEX idx_ghost_leaderboard_race_time_ms ON public.ghost_leaderboard(race_time_ms);
CREATE INDEX idx_ghost_leaderboard_is_gold_cup ON public.ghost_leaderboard(is_gold_cup) WHERE is_gold_cup = true;
CREATE INDEX idx_ghost_leaderboard_track_time ON public.ghost_leaderboard(track_id, race_time_ms);
