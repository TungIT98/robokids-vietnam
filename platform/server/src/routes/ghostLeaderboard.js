import express from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/ghost-leaderboard
 * Submit a new race time (auth required)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { race_time_ms, ghost_path_url, ghost_data, track_id, is_gold_cup } = req.body;
    const userId = req.user.id;

    if (!race_time_ms || !track_id) {
      return res.status(400).json({ error: 'race_time_ms and track_id are required' });
    }

    // Get student's id from profile
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', userId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Insert the race time
    const { data: entry, error: insertError } = await supabase
      .from('ghost_leaderboard')
      .insert({
        student_id: student.id,
        race_time_ms,
        ghost_path_url: ghost_path_url || null,
        ghost_data: ghost_data || null,
        track_id,
        is_gold_cup: is_gold_cup || false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting race time:', insertError);
      return res.status(500).json({ error: 'Failed to submit race time' });
    }

    // Calculate rank for this entry
    const { count: rank } = await supabase
      .from('ghost_leaderboard')
      .select('*', { count: 'exact', head: true })
      .eq('track_id', track_id)
      .lt('race_time_ms', race_time_ms);

    res.status(201).json({
      ...entry,
      rank: rank + 1
    });
  } catch (err) {
    console.error('Ghost leaderboard submit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ghost-leaderboard
 * Get top times, optionally filtered by track_id
 * Query params: track_id (optional), limit (default 50)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { track_id, limit = 50 } = req.query;

    let query = supabase
      .from('ghost_leaderboard')
      .select(`
        id,
        race_time_ms,
        ghost_path_url,
        track_id,
        is_gold_cup,
        created_at,
        student:students(id, profile:profiles(full_name, avatar_url))
      `)
      .order('race_time_ms', { ascending: true })
      .limit(parseInt(limit));

    if (track_id) {
      query = query.eq('track_id', track_id);
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    // Add rank to each entry
    const rankedEntries = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

    res.json({ entries: rankedEntries });
  } catch (err) {
    console.error('Ghost leaderboard fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ghost-leaderboard/gold-cup
 * Get the current Gold Cup winner
 */
router.get('/gold-cup', async (req, res) => {
  try {
    const { track_id } = req.query;

    let query = supabase
      .from('ghost_leaderboard')
      .select(`
        id,
        race_time_ms,
        ghost_path_url,
        ghost_data,
        track_id,
        created_at,
        student:students(id, profile:profiles(full_name, avatar_url))
      `)
      .eq('is_gold_cup', true)
      .order('race_time_ms', { ascending: true })
      .limit(1);

    if (track_id) {
      query = query.eq('track_id', track_id);
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error('Error fetching gold cup winner:', error);
      return res.status(500).json({ error: 'Failed to fetch gold cup winner' });
    }

    if (!entries || entries.length === 0) {
      return res.status(404).json({ error: 'No Gold Cup winner found' });
    }

    res.json({ gold_cup_winner: entries[0] });
  } catch (err) {
    console.error('Ghost leaderboard gold-cup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ghost-leaderboard/my-best/:trackId
 * Get authenticated user's best time for a track
 */
router.get('/my-best/:trackId', authenticate, async (req, res) => {
  try {
    const { trackId } = req.params;
    const userId = req.user.id;

    // Get student's id from profile
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', userId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get best time for this student on this track
    const { data: entries, error } = await supabase
      .from('ghost_leaderboard')
      .select('*')
      .eq('student_id', student.id)
      .eq('track_id', trackId)
      .order('race_time_ms', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error fetching best time:', error);
      return res.status(500).json({ error: 'Failed to fetch best time' });
    }

    if (!entries || entries.length === 0) {
      return res.json({ best_time: null, message: 'No times recorded for this track' });
    }

    // Calculate rank
    const { count: rank } = await supabase
      .from('ghost_leaderboard')
      .select('*', { count: 'exact', head: true })
      .eq('track_id', trackId)
      .lt('race_time_ms', entries[0].race_time_ms);

    res.json({
      best_time: {
        ...entries[0],
        rank: rank + 1
      }
    });
  } catch (err) {
    console.error('Ghost leaderboard my-best error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
