/**
 * Curriculum API routes for RoboKids Vietnam
 * Adapted to work with the actual database schema
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

// Import cache utilities from index (set after index.js exports)
// Cache-Control helpers for performance
const CACHE_MAX_AGE = 60; // 60 seconds cache for public curriculum

const router = express.Router();

/**
 * GET /api/curriculum
 * Returns all difficulty levels with lesson counts (public)
 * Maps to the actual database schema without age_group_configs
 */
router.get('/', async (req, res) => {
  try {
    // Get all lessons grouped by difficulty_level
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('difficulty_level, xp_reward, estimated_minutes');

    if (error) throw error;

    // Group lessons by difficulty
    const byDifficulty = {
      beginner: { count: 0, totalXp: 0, totalMinutes: 0 },
      intermediate: { count: 0, totalXp: 0, totalMinutes: 0 },
      advanced: { count: 0, totalXp: 0, totalMinutes: 0 }
    };

    for (const lesson of lessons) {
      const level = lesson.difficulty_level || 'beginner';
      if (byDifficulty[level]) {
        byDifficulty[level].count++;
        byDifficulty[level].totalXp += lesson.xp_reward || 0;
        byDifficulty[level].totalMinutes += lesson.estimated_minutes || 0;
      }
    }

    const result = Object.entries(byDifficulty).map(([key, value]) => ({
      ageGroup: key,
      totalLessons: value.count,
      totalXp: value.totalXp,
      totalMinutes: value.totalMinutes
    }));

    // Cache-Control for public curriculum overview (stale-while-revalidate)
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.json(result);
  } catch (err) {
    console.error('Error fetching curriculum overview:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/curriculum/:ageGroup
 * Returns curriculum for specified difficulty level with all lessons
 * Maps ageGroup to difficulty_level in the database
 */
router.get('/:ageGroup', async (req, res) => {
  try {
    const { ageGroup } = req.params;
    const validAgeGroups = ['beginner', 'intermediate', 'advanced'];

    // Map age group to difficulty level
    const difficultyMap = {
      'beginner': 'beginner',
      'intermediate': 'intermediate',
      'advanced': 'advanced'
    };

    const difficulty = difficultyMap[ageGroup];

    if (!difficulty) {
      return res.status(400).json({
        error: 'Invalid age group',
        ageGroup,
        availableAgeGroups: validAgeGroups
      });
    }

    // Get lessons for this difficulty level
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('difficulty_level', difficulty)
      .eq('is_active', true)
      .order('sequence_order', { ascending: true });

    if (lessonsError) throw lessonsError;

    // Get missions for these lessons
    const lessonIds = lessons.map(l => l.id);
    const { data: allMissions } = await supabase
      .from('lesson_missions')
      .select('*')
      .in('lesson_id', lessonIds)
      .order('sequence_order', { ascending: true });

    const missionsByLesson = {};
    for (const m of (allMissions || [])) {
      if (!missionsByLesson[m.lesson_id]) {
        missionsByLesson[m.lesson_id] = [];
      }
      missionsByLesson[m.lesson_id].push({
        id: m.id,
        title: m.title_vi,
        titleVi: m.title_vi,
        titleEn: m.title_en,
        descriptionVi: m.description_vi,
        descriptionEn: m.description_en,
        missionType: m.mission_type,
        sequenceOrder: m.sequence_order
      });
    }

    res.json({
      ageGroup,
      difficultyLevel: difficulty,
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
        missions: missionsByLesson[l.id] || []
      }))
    });
  } catch (err) {
    console.error('Error fetching curriculum:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/curriculum/lessons/:idOrSlug
 * Returns specific lesson by ID (UUID) or code
 */
router.get('/lessons/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    // Check if it's a valid UUID (has hyphens and is 36 chars)
    const isUUID = idOrSlug.includes('-') && idOrSlug.length === 36;

    let query = supabase
      .from('lessons')
      .select('*');

    if (isUUID) {
      query = query.eq('id', idOrSlug);
    } else {
      query = query.eq('code', idOrSlug);
    }

    const { data: lesson, error } = await query.single();

    if (error || !lesson) {
      return res.status(404).json({
        error: 'Lesson not found',
        idOrSlug
      });
    }

    // Get missions
    const { data: missions } = await supabase
      .from('lesson_missions')
      .select('*')
      .eq('lesson_id', lesson.id)
      .order('sequence_order', { ascending: true });

    // Get user progress if authenticated
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
              lastAttemptedAt: progress.last_attempted_at
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
      userProgress
    });
  } catch (err) {
    console.error('Error fetching lesson:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/curriculum/lessons/:idOrSlug/progress
 * Save lesson progress (requires auth)
 */
router.post('/lessons/:idOrSlug/progress', authenticate, async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const { completionPercentage, timeSpentMinutes, status } = req.body;
    const userId = req.user.id;

    // Find lesson by code or UUID
    const isUUID = idOrSlug.includes('-') && idOrSlug.length === 36;
    let lessonQuery = isUUID
      ? supabase.from('lessons').select('id').eq('id', idOrSlug)
      : supabase.from('lessons').select('id').eq('code', idOrSlug);

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

    const progressData = {
      user_id: userId,
      lesson_id: lesson.id,
      completion_percentage: completionPercentage || 0,
      time_spent_minutes: timeSpentMinutes || 0,
      last_attempted_at: new Date().toISOString(),
      status: status || (completionPercentage === 100 ? 'completed' : 'in_progress')
    };

    if (existingProgress) {
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
      progressData.attempts_count = 1;
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
 * POST /api/curriculum/lessons/:idOrSlug/complete
 * Mark lesson as complete (requires auth)
 */
router.post('/lessons/:idOrSlug/complete', authenticate, async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const userId = req.user.id;

    // Find lesson by code or UUID
    const isUUID = idOrSlug.includes('-') && idOrSlug.length === 36;
    let lessonQuery = isUUID
      ? supabase.from('lessons').select('id, xp_reward').eq('id', idOrSlug)
      : supabase.from('lessons').select('id, xp_reward').eq('code', idOrSlug);

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

    const completedAt = new Date().toISOString();
    const progressData = {
      user_id: userId,
      lesson_id: lesson.id,
      status: 'completed',
      completion_percentage: 100,
      completed_at: completedAt,
      last_attempted_at: completedAt
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
      completedAt,
      xpEarned: xpReward,
      totalXp: newXp
    });
  } catch (err) {
    console.error('Error completing lesson:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;