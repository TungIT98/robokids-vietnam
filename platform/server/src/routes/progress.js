/**
 * Progress API routes for RoboKids Vietnam
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { WorkflowEventType } from '../services/workflowEngine.js';
import workflowEngine from '../services/workflowEngine.js';

const router = express.Router();

/**
 * GET /api/progress/stats
 * Get user progress statistics (requires auth)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user progress record
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      throw progressError;
    }

    // Get completed lessons count
    const { count: completedLessons } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', true);

    // Get total lessons count
    const { count: totalLessons } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    // Get active missions count
    const { count: activeMissions } = await supabase
      .from('user_missions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    // Get completed missions count
    const { count: completedMissions } = await supabase
      .from('user_missions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    // Calculate level from XP (each level = 100 XP)
    const totalXp = progress?.total_xp || 0;
    const level = Math.floor(totalXp / 100) + 1;
    const xpForNextLevel = (level * 100) - totalXp;
    const xpInCurrentLevel = totalXp - ((level - 1) * 100);

    // Get streak info
    const { data: recentProgress } = await supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(7);

    // Calculate current streak
    let currentStreak = 0;
    if (recentProgress && recentProgress.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const dates = recentProgress
        .filter(p => p.completed_at)
        .map(p => p.completed_at.split('T')[0]);

      const uniqueDates = [...new Set(dates)];

      // Check if today or yesterday in the dates
      if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
        currentStreak = 1;
        let checkDate = new Date(uniqueDates.includes(today) ? today : yesterday);

        for (let i = 1; i < uniqueDates.length; i++) {
          const prevDate = new Date(checkDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = prevDate.toISOString().split('T')[0];

          if (uniqueDates.includes(prevDateStr)) {
            currentStreak++;
            checkDate = prevDateStr;
          } else {
            break;
          }
        }
      }
    }

    // Get badges
    const badgesEarned = progress?.badges_earned || [];

    res.json({
      xp: totalXp,
      level,
      xpForNextLevel,
      xpInCurrentLevel,
      currentStreak,
      completedLessons: completedLessons || 0,
      totalLessons: totalLessons || 0,
      activeMissions: activeMissions || 0,
      completedMissions: completedMissions || 0,
      badgesEarned,
      joinedAt: progress?.created_at || null
    });
  } catch (err) {
    console.error('Error fetching progress stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/progress/badges
 * Get all badges (earned and available) for user (requires auth)
 */
router.get('/badges', async (req, res) => {
  try {
    // Get all available badges
    const { data: allBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*');

    if (badgesError) throw badgesError;

    // Get user's earned badges
    let earnedBadgeIds = [];
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: progress } = await supabase
            .from('user_progress')
            .select('badges_earned')
            .eq('user_id', user.id)
            .single();
          earnedBadgeIds = progress?.badges_earned || [];
        }
      } catch (e) {
        // Ignore auth errors
      }
    }

    res.json(allBadges.map(badge => ({
      id: badge.id,
      badgeKey: badge.badge_key,
      nameVi: badge.name_vi,
      nameEn: badge.name_en,
      descriptionVi: badge.description_vi,
      descriptionEn: badge.description_en,
      type: badge.badge_type,
      xpReward: badge.xp_reward,
      iconUrl: badge.icon_url,
      colorHex: badge.color_hex,
      earned: earnedBadgeIds.includes(badge.badge_key)
    })));
  } catch (err) {
    console.error('Error fetching badges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/progress/lessons
 * Get user's lesson progress (requires auth)
 */
router.get('/lessons', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: progress, error } = await supabase
      .from('lesson_progress')
      .select(`
        *,
        lessons(
          id,
          slug,
          title_vi,
          title_en,
          age_group,
          category,
          difficulty,
          estimated_minutes
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json(progress.map(p => ({
      lessonId: p.lesson_id,
      lesson: p.lessons ? {
        id: p.lessons.id,
        slug: p.lessons.slug,
        title: p.lessons.title_vi,
        titleEn: p.lessons.title_en,
        ageGroup: p.lessons.age_group,
        category: p.lessons.category,
        difficulty: p.lessons.difficulty,
        estimatedMinutes: p.lessons.estimated_minutes
      } : null,
      completed: p.completed,
      completedAt: p.completed_at,
      completedSteps: p.completed_steps,
      timeSpentSeconds: p.time_spent_seconds,
      studentRating: p.student_rating,
      startedAt: p.started_at,
      lastWorkspaceXml: p.last_workspace_xml
    })));
  } catch (err) {
    console.error('Error fetching lesson progress:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/progress/lesson/:id/complete
 * Mark a lesson as complete (requires auth)
 */
router.post('/lesson/:id/complete', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find lesson by slug or UUID
    const isUUID = id.includes('-') && id.length === 36;
    let lessonQuery = isUUID
      ? supabase.from('lessons').select('id').eq('id', id)
      : supabase.from('lessons').select('id').eq('slug', id);

    const { data: lesson, error: lessonError } = await lessonQuery.single();
    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Upsert progress with completion
    const { data: progress, error: progressError } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: userId,
        lesson_id: lesson.id,
        completed: true,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (progressError) throw progressError;

    // Update user XP
    const { data: currentProgress } = await supabase
      .from('user_progress')
      .select('total_xp')
      .eq('user_id', userId)
      .single();

    const newXp = (currentProgress?.total_xp || 0) + 10;

    if (currentProgress) {
      await supabase
        .from('user_progress')
        .update({ total_xp: newXp })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_progress')
        .insert({ user_id: userId, total_xp: newXp });
    }

    // Trigger workflow engine for lesson completion (async - don't wait)
    workflowEngine.emit(WorkflowEventType.LESSON_COMPLETE, {
      userId,
      lessonId: lesson.id,
      lessonSlug: id,
      xpEarned: 10,
      completedAt: progress.completed_at,
    }).catch(err => {
      console.error('[Progress] Workflow trigger failed:', err);
    });

    res.json({
      success: true,
      completed: true,
      completedAt: progress.completed_at,
      xpEarned: 10,
      totalXp: newXp
    });
  } catch (err) {
    console.error('Error completing lesson:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/progress/xp
 * Add XP to user account (requires auth)
 */
router.post('/xp', authenticate, async (req, res) => {
  try {
    const { xp, reason } = req.body;
    const userId = req.user.id;

    if (!xp || typeof xp !== 'number' || xp <= 0) {
      return res.status(400).json({ error: 'Valid XP amount required' });
    }

    // Get or create user progress
    const { data: currentProgress } = await supabase
      .from('user_progress')
      .select('total_xp')
      .eq('user_id', userId)
      .single();

    const currentXp = currentProgress?.total_xp || 0;
    const newXp = currentXp + xp;

    if (currentProgress) {
      await supabase
        .from('user_progress')
        .update({ total_xp: newXp })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_progress')
        .insert({ user_id: userId, total_xp: newXp });
    }

    res.json({
      success: true,
      xpAdded: xp,
      reason: reason || 'XP reward',
      totalXp: newXp
    });
  } catch (err) {
    console.error('Error adding XP:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Map grade_level to age_group
 * Grades 1-3 (ages 6-8) → beginner
 * Grades 4-6 (ages 9-12) → intermediate
 * Grades 7-12 (ages 13-16) → advanced
 */
function gradeLevelToAgeGroup(gradeLevel) {
  if (gradeLevel >= 1 && gradeLevel <= 3) return 'beginner';
  if (gradeLevel >= 4 && gradeLevel <= 6) return 'intermediate';
  return 'advanced';
}

/**
 * Get league division based on XP
 */
function getLeagueDivision(xp) {
  if (xp >= 1000) return 'platinum';
  if (xp >= 500) return 'gold';
  if (xp >= 200) return 'silver';
  return 'bronze';
}

/**
 * GET /api/progress/leaderboard
 * Get XP leaderboard (public)
 * Query params:
 *   limit - max entries (default 20)
 *   timeframe - 'all', 'weekly', or 'monthly' (default 'all')
 *   age_group - 'beginner', 'intermediate', 'advanced', or 'all' (default 'all')
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 20, timeframe = 'all', age_group = 'all' } = req.query;

    // Get all student profile IDs for age_group filtering
    let studentProfileIds = null;
    if (age_group !== 'all') {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('profile_id, grade_level');

      if (studentsError) throw studentsError;

      studentProfileIds = (students || [])
        .filter(s => gradeLevelToAgeGroup(s.grade_level) === age_group)
        .map(s => s.profile_id);

      // If no students in that age group, return empty
      if (studentProfileIds.length === 0) {
        return res.json([]);
      }
    }

    // Helper to filter by age_group
    const filterByAgeGroup = (entries) => {
      if (age_group === 'all' || !studentProfileIds) return entries;
      return entries.filter(e => studentProfileIds.includes(e.userId));
    };

    if (timeframe === 'weekly' || timeframe === 'monthly') {
      // Get XP earned this period from all sources
      const days = timeframe === 'weekly' ? 7 : 30;
      const periodAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Get period XP from lesson completions (XP per lesson is 10)
      let lessonQuery = supabase
        .from('lesson_progress')
        .select('user_id')
        .gte('completed_at', periodAgo)
        .eq('completed', true);

      const { data: periodLessons, error: lessonsError } = await lessonQuery;
      if (lessonsError) throw lessonsError;

      // Get period XP from mission completions
      let missionQuery = supabase
        .from('user_missions')
        .select('user_id, xp_earned')
        .gte('completed_at', periodAgo)
        .eq('status', 'completed');

      const { data: periodMissions, error: missionsError } = await missionQuery;
      if (missionsError) throw missionsError;

      // Sum XP per user (10 XP per lesson, mission XP from xp_earned)
      const periodXpMap = {};
      for (const lp of (periodLessons || [])) {
        periodXpMap[lp.user_id] = (periodXpMap[lp.user_id] || 0) + 10;
      }
      for (const um of (periodMissions || [])) {
        periodXpMap[um.user_id] = (periodXpMap[um.user_id] || 0) + (um.xp_earned || 0);
      }

      // Get profiles for top users
      const sortedUsers = Object.entries(periodXpMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, parseInt(limit));

      const userIds = sortedUsers.map(([uid]) => uid);

      if (userIds.length === 0) {
        return res.json([]);
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = {};
      for (const p of (profiles || [])) {
        profileMap[p.id] = p;
      }

      const result = sortedUsers.map(([userId, xp], index) => ({
        rank: index + 1,
        userId,
        name: profileMap[userId]?.full_name || 'Anonymous',
        avatarUrl: profileMap[userId]?.avatar_url,
        xp,
        league: getLeagueDivision(xp)
      }));

      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      res.json(filterByAgeGroup(result));
    } else {
      // All-time leaderboard
      let query = supabase
        .from('user_progress')
        .select(`
          user_id,
          total_xp,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .order('total_xp', { ascending: false })
        .limit(parseInt(limit) * 3); // Fetch more to account for filtering

      const { data: leaderboard, error } = await query;
      if (error) throw error;

      let result = (leaderboard || [])
        .filter(e => e.profiles) // Must have profile
        .map((entry, index) => ({
          rank: 0, // Will be recalculated after filtering
          userId: entry.user_id,
          name: entry.profiles?.full_name || 'Anonymous',
          avatarUrl: entry.profiles?.avatar_url,
          xp: entry.total_xp,
          league: getLeagueDivision(entry.total_xp)
        }));

      // Apply age_group filter
      result = filterByAgeGroup(result);

      // Recalculate ranks after filtering
      result.sort((a, b) => b.xp - a.xp);
      result = result.slice(0, parseInt(limit));
      result.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      res.json(result);
    }
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;