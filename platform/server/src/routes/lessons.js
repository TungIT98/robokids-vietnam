/**
 * Lessons API routes for RoboKids Vietnam
 * Adapted to work with the actual database schema
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/lessons
 * List all lessons with optional filtering
 * Query params:
 *   difficulty - filter by difficulty_level
 *   limit - max results (default 50)
 *   offset - pagination offset
 */
router.get('/', async (req, res) => {
  try {
    const { difficulty, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('lessons')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('sequence_order', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (difficulty) {
      query = query.eq('difficulty_level', difficulty);
    }

    const { data: lessons, error, count } = await query;

    if (error) throw error;

    res.json({
      lessons: lessons.map(l => ({
        id: l.id,
        code: l.code,
        title: l.title_vi,
        titleVi: l.title_vi,
        titleEn: l.title_en,
        descriptionVi: l.description_vi,
        descriptionEn: l.description_en,
        difficultyLevel: l.difficulty_level,
        estimatedMinutes: l.estimated_minutes,
        xpReward: l.xp_reward,
        sequenceOrder: l.sequence_order,
        contentJson: l.content_json,
        isActive: l.is_active,
        createdAt: l.created_at
      })),
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < (count || 0)
      }
    });
  } catch (err) {
    console.error('Error fetching lessons:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/lessons/:id
 * Get specific lesson by ID (UUID) or code
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's a valid UUID (has hyphens and is 36 chars)
    const isUUID = id.includes('-') && id.length === 36;

    let query = supabase
      .from('lessons')
      .select('*');

    if (isUUID) {
      query = query.eq('id', id);
    } else {
      query = query.eq('code', id);
    }

    const { data: lesson, error } = await query.single();

    if (error || !lesson) {
      return res.status(404).json({
        error: 'Lesson not found',
        id
      });
    }

    // Get lesson missions for this lesson
    const { data: missions } = await supabase
      .from('lesson_missions')
      .select('*')
      .eq('lesson_id', lesson.id)
      .order('sequence_order', { ascending: true });

    // Get user's progress if authenticated
    let userProgress = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: progress } = await supabase
            .from('user_progress')
            .select('*')
            .eq('lesson_id', lesson.id)
            .eq('user_id', user.id)
            .single();
          if (progress) {
            userProgress = {
              completed: progress.status === 'completed',
              completedAt: progress.completed_at,
              completionPercentage: progress.completion_percentage,
              timeSpentMinutes: progress.time_spent_minutes,
              attemptsCount: progress.attempts_count,
            };
          }
        }
      } catch (e) {
        // Ignore auth errors
      }
    }

    res.json({
      id: lesson.id,
      code: lesson.code,
      title: lesson.title_vi,
      titleVi: lesson.title_vi,
      titleEn: lesson.title_en,
      descriptionVi: lesson.description_vi,
      descriptionEn: lesson.description_en,
      difficultyLevel: lesson.difficulty_level,
      estimatedMinutes: lesson.estimated_minutes,
      xpReward: lesson.xp_reward,
      sequenceOrder: lesson.sequence_order,
      contentJson: lesson.content_json,
      isActive: lesson.is_active,
      missions: (missions || []).map(m => ({
        id: m.id,
        title: m.title_vi,
        titleVi: m.title_vi,
        titleEn: m.title_en,
        descriptionVi: m.description_vi,
        descriptionEn: m.description_en,
        missionType: m.mission_type,
        sequenceOrder: m.sequence_order
      })),
      userProgress,
    });
  } catch (err) {
    console.error('Error fetching lesson:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/lessons/:id/progress
 * Get user's progress on a specific lesson (requires auth)
 */
router.get('/:id/progress', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find lesson by code or UUID
    const isUUID = id.includes('-') && id.length === 36;
    let lessonQuery = isUUID
      ? supabase.from('lessons').select('id').eq('id', id)
      : supabase.from('lessons').select('id').eq('code', id);

    const { data: lesson, error: lessonError } = await lessonQuery.single();
    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Get progress from user_progress table
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('lesson_id', lesson.id)
      .eq('user_id', userId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      throw progressError;
    }

    res.json(progress ? {
      completed: progress.status === 'completed',
      completedAt: progress.completed_at,
      completionPercentage: progress.completion_percentage,
      timeSpentMinutes: progress.time_spent_minutes,
      attemptsCount: progress.attempts_count,
      lastAttemptedAt: progress.last_attempted_at,
      score: progress.score
    } : null);
  } catch (err) {
    console.error('Error fetching lesson progress:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/lessons/:id/progress
 * Save lesson progress (requires auth)
 */
router.post('/:id/progress', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { completionPercentage, timeSpentMinutes, status } = req.body;
    const userId = req.user.id;

    // Find lesson by code or UUID
    const isUUID = id.includes('-') && id.length === 36;
    let lessonQuery = isUUID
      ? supabase.from('lessons').select('id').eq('id', id)
      : supabase.from('lessons').select('id').eq('code', id);

    const { data: lesson, error: lessonError } = await lessonQuery.single();
    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Check if progress record exists
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('lesson_id', lesson.id)
      .eq('user_id', userId)
      .single();

    let progressData = {
      user_id: userId,
      lesson_id: lesson.id,
      completion_percentage: completionPercentage || 0,
      time_spent_minutes: timeSpentMinutes || 0,
      attempts_count: existingProgress ? existingProgress.attempts_count + 1 : 1,
      last_attempted_at: new Date().toISOString(),
      status: status || (completionPercentage === 100 ? 'completed' : 'in_progress')
    };

    if (existingProgress) {
      // Update existing progress
      progressData.attempts_count = existingProgress.attempts_count + 1;
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .update(progressData)
        .eq('id', existingProgress.id)
        .select()
        .single();

      if (progressError) throw progressError;

      res.json({
        success: true,
        progress: {
          completed: progress.status === 'completed',
          completionPercentage: progress.completion_percentage,
          timeSpentMinutes: progress.time_spent_minutes,
          attemptsCount: progress.attempts_count
        }
      });
    } else {
      // Insert new progress
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .insert(progressData)
        .select()
        .single();

      if (progressError) throw progressError;

      res.json({
        success: true,
        progress: {
          completed: progress.status === 'completed',
          completionPercentage: progress.completion_percentage,
          timeSpentMinutes: progress.time_spent_minutes,
          attemptsCount: progress.attempts_count
        }
      });
    }
  } catch (err) {
    console.error('Error saving lesson progress:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/lessons/:id/complete
 * Mark lesson as complete (requires auth)
 */
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find lesson by code or UUID
    const isUUID = id.includes('-') && id.length === 36;
    let lessonQuery = isUUID
      ? supabase.from('lessons').select('id, xp_reward').eq('id', id)
      : supabase.from('lessons').select('id, xp_reward').eq('code', id);

    const { data: lesson, error: lessonError } = await lessonQuery.single();
    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Update progress to completed
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('lesson_id', lesson.id)
      .eq('user_id', userId)
      .single();

    const progressData = {
      user_id: userId,
      lesson_id: lesson.id,
      status: 'completed',
      completion_percentage: 100,
      completed_at: new Date().toISOString(),
      last_attempted_at: new Date().toISOString()
    };

    if (existingProgress) {
      await supabase
        .from('user_progress')
        .update(progressData)
        .eq('id', existingProgress.id);
    } else {
      progressData.attempts_count = 1;
      progressData.time_spent_minutes = 0;
      await supabase
        .from('user_progress')
        .insert(progressData);
    }

    // Update XP in student_profiles
    const xpReward = lesson.xp_reward || 10;
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('xp_points')
      .eq('user_id', userId)
      .single();

    const newXp = (studentProfile?.xp_points || 0) + xpReward;

    if (studentProfile) {
      await supabase
        .from('student_profiles')
        .update({ xp_points: newXp })
        .eq('user_id', userId);
    }

    res.json({
      success: true,
      completed: true,
      completedAt: progressData.completed_at,
      xpEarned: xpReward,
      totalXp: newXp
    });
  } catch (err) {
    console.error('Error completing lesson:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;