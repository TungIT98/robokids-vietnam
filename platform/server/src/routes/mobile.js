/**
 * Mobile App API routes for RoboKids Vietnam
 * Endpoints optimized for React Native mobile app
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import {
  registerDeviceToken,
  removeDeviceToken,
  getPushPreferences,
  updatePushPreferences,
  sendLessonReminder,
  sendBadgeEarnedNotification,
} from '../services/fcm.js';

const router = express.Router();

/**
 * Map grade_level to age_group
 * Grades 1-3 (ages 6-8) → beginner
 * Grades 4-6 (ages 9-11) → intermediate
 * Grades 7-12 (ages 12-14) → advanced
 */
function gradeLevelToAgeGroup(gradeLevel) {
  if (!gradeLevel) return 'beginner';
  if (gradeLevel >= 1 && gradeLevel <= 3) return 'beginner';
  if (gradeLevel >= 4 && gradeLevel <= 6) return 'intermediate';
  return 'advanced';
}

/**
 * GET /api/mobile/parents/:parentId/students
 * List all children for a parent (used by Parent App)
 */
router.get('/parents/:parentId/students', authenticate, async (req, res) => {
  try {
    const { parentId } = req.params;
    const requestingUserId = req.user.id;

    // Verify the parent record
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .select('id, profile_id')
      .eq('id', parentId)
      .single();

    if (parentError || !parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Check authorization: must be the parent themselves
    if (parent.profile_id !== requestingUserId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get student's relations
    const { data: relations, error: relationsError } = await supabase
      .from('student_parent_relations')
      .select(`
        id,
        relationship,
        is_primary,
        created_at,
        students (
          id,
          profile_id,
          grade_level,
          school_name,
          profiles (
            id,
            full_name,
            email,
            avatar_url
          )
        )
      `)
      .eq('parent_id', parentId);

    if (relationsError) throw relationsError;

    const students = (relations || [])
      .filter(r => r.students)
      .map(r => ({
        relationId: r.id,
        relationship: r.relationship,
        isPrimary: r.is_primary,
        linkedAt: r.created_at,
        student: {
          id: r.students.id,
          profileId: r.students.profile_id,
          name: r.students.profiles?.full_name || null,
          email: r.students.profiles?.email || null,
          avatarUrl: r.students.profiles?.avatar_url || null,
          gradeLevel: r.students.grade_level,
          schoolName: r.students.school_name,
          ageGroup: gradeLevelToAgeGroup(r.students.grade_level),
        }
      }));

    res.json({ students });
  } catch (err) {
    console.error('Error fetching parent students:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/mobile/parents/:parentId/students/:studentId/progress
 * Get progress summary for a specific child (parent view)
 */
router.get('/parents/:parentId/students/:studentId/progress', authenticate, async (req, res) => {
  try {
    const { parentId, studentId } = req.params;
    const requestingUserId = req.user.id;

    // Verify parent
    const { data: parent } = await supabase
      .from('parents')
      .select('id, profile_id')
      .eq('id', parentId)
      .single();

    if (!parent || parent.profile_id !== requestingUserId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify relation
    const { data: relation } = await supabase
      .from('student_parent_relations')
      .select('id')
      .eq('parent_id', parentId)
      .eq('student_id', studentId)
      .single();

    if (!relation) {
      return res.status(403).json({ error: 'Not authorized to view this student' });
    }

    // Get student with profile
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        profile_id,
        grade_level,
        school_name,
        profiles (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const profileId = student.profile_id;
    const studentAgeGroup = gradeLevelToAgeGroup(student.grade_level);

    // Get user progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', profileId)
      .single();

    // Get completed lessons count
    const { count: completedLessons } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileId)
      .eq('completed', true);

    // Get total lessons for age group
    const { count: totalLessons } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('age_group', studentAgeGroup)
      .eq('is_published', true);

    // Get active/completed missions
    const { count: activeMissions } = await supabase
      .from('user_missions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileId)
      .eq('status', 'active');

    const { count: completedMissions } = await supabase
      .from('user_missions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileId)
      .eq('status', 'completed');

    // Calculate level from XP
    const totalXp = progress?.total_xp || 0;
    const level = Math.floor(totalXp / 100) + 1;
    const xpForNextLevel = (level * 100) - totalXp;
    const xpInCurrentLevel = totalXp - ((level - 1) * 100);

    // Get badges
    const badgesEarned = progress?.badges_earned || [];

    // Get recent activity (last 7 days)
    const { data: recentProgress } = await supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('user_id', profileId)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(7);

    let recentDaysActive = 0;
    if (recentProgress && recentProgress.length > 0) {
      const dates = recentProgress
        .filter(p => p.completed_at)
        .map(p => p.completed_at.split('T')[0]);
      recentDaysActive = [...new Set(dates)].length;
    }

    res.json({
      student: {
        id: student.id,
        name: student.profiles?.full_name || null,
        avatarUrl: student.profiles?.avatar_url || null,
        gradeLevel: student.grade_level,
        schoolName: student.school_name,
        ageGroup: studentAgeGroup,
      },
      xp: totalXp,
      level,
      xpForNextLevel,
      xpInCurrentLevel,
      completedLessons: completedLessons || 0,
      totalLessons: totalLessons || 0,
      activeMissions: activeMissions || 0,
      completedMissions: completedMissions || 0,
      badgesEarned,
      recentDaysActive,
      joinedAt: progress?.created_at || null,
    });
  } catch (err) {
    console.error('Error fetching student progress:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/mobile/parents/:parentId/students/:studentId/progress/charts
 * Get weekly/monthly progress chart data for a specific child
 */
router.get('/parents/:parentId/students/:studentId/progress/charts', authenticate, async (req, res) => {
  try {
    const { parentId, studentId } = req.params;
    const { period = 'weekly' } = req.query; // 'weekly' or 'monthly'
    const requestingUserId = req.user.id;

    // Verify parent
    const { data: parent } = await supabase
      .from('parents')
      .select('id, profile_id')
      .eq('id', parentId)
      .single();

    if (!parent || parent.profile_id !== requestingUserId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify relation
    const { data: relation } = await supabase
      .from('student_parent_relations')
      .select('id')
      .eq('parent_id', parentId)
      .eq('student_id', studentId)
      .single();

    if (!relation) {
      return res.status(403).json({ error: 'Not authorized to view this student' });
    }

    // Get student with profile
    const { data: student } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', studentId)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const profileId = student.profile_id;

    // Calculate date range
    const now = new Date();
    let startDate;
    if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get lesson progress in date range
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('completed_at, time_spent_seconds, completed')
      .eq('user_id', profileId)
      .gte('completed_at', startDate.toISOString())
      .order('completed_at', { ascending: true });

    // Get XP changes (from user_progress_history if available, or estimate from lessons)
    const { data: progressHistory } = await supabase
      .from('user_progress_history')
      .select('xp_gained, recorded_at')
      .eq('user_id', profileId)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    // Group by week or month
    const weeklyData = {};
    const monthlyData = {};

    // Initialize weekly buckets (last 4 weeks)
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyData[weekKey] = { lessonsCompleted: 0, timeSpentMinutes: 0, xpGained: 0 };
    }

    // Initialize monthly buckets (last 12 months)
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { lessonsCompleted: 0, timeSpentMinutes: 0, xpGained: 0 };
    }

    // Process lesson progress
    if (lessonProgress) {
      for (const lp of lessonProgress) {
        if (!lp.completed_at) continue;

        const completedDate = new Date(lp.completed_at);
        const weekKey = new Date(completedDate.getTime() - completedDate.getDay() * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;

        if (weeklyData[weekKey] !== undefined) {
          weeklyData[weekKey].lessonsCompleted += 1;
          weeklyData[weekKey].timeSpentMinutes += Math.round((lp.time_spent_seconds || 0) / 60);
        }

        if (monthlyData[monthKey] !== undefined) {
          monthlyData[monthKey].lessonsCompleted += 1;
          monthlyData[monthKey].timeSpentMinutes += Math.round((lp.time_spent_seconds || 0) / 60);
        }
      }
    }

    // Process XP from progress history
    if (progressHistory) {
      for (const ph of progressHistory) {
        if (!ph.recorded_at) continue;

        const recordedDate = new Date(ph.recorded_at);
        const weekKey = new Date(recordedDate.getTime() - recordedDate.getDay() * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthKey = `${recordedDate.getFullYear()}-${String(recordedDate.getMonth() + 1).padStart(2, '0')}`;

        if (weeklyData[weekKey] !== undefined) {
          weeklyData[weekKey].xpGained += ph.xp_gained || 0;
        }

        if (monthlyData[monthKey] !== undefined) {
          monthlyData[monthKey].xpGained += ph.xp_gained || 0;
        }
      }
    }

    // Estimate XP from lessons if no history (roughly 10 XP per lesson)
    if (!progressHistory || progressHistory.length === 0) {
      for (const weekKey in weeklyData) {
        weeklyData[weekKey].xpGained = weeklyData[weekKey].lessonsCompleted * 10;
      }
      for (const monthKey in monthlyData) {
        monthlyData[monthKey].xpGained = monthlyData[monthKey].lessonsCompleted * 10;
      }
    }

    // Format response
    const formatWeekly = () => {
      return Object.entries(weeklyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-4)
        .map(([weekStart, data]) => {
          const date = new Date(weekStart);
          const weekEnd = new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000);
          return {
            label: `${date.getDate()}/${date.getMonth() + 1}`,
            lessonsCompleted: data.lessonsCompleted,
            timeSpentMinutes: data.timeSpentMinutes,
            xpGained: data.xpGained,
          };
        });
    };

    const formatMonthly = () => {
      const monthNames = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
      return Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([monthKey, data]) => {
          const [year, month] = monthKey.split('-');
          return {
            label: monthNames[parseInt(month) - 1],
            lessonsCompleted: data.lessonsCompleted,
            timeSpentMinutes: data.timeSpentMinutes,
            xpGained: data.xpGained,
          };
        });
    };

    res.json({
      weekly: formatWeekly(),
      monthly: formatMonthly(),
    });
  } catch (err) {
    console.error('Error fetching chart data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/mobile/students/:id/lessons
 * Get lessons available for a specific student
 * Student can access their own lessons, parent can access their children's
 */
router.get('/students/:id/lessons', async (req, res) => {
  try {
    const { id } = req.params;
    const { ageGroup, category, limit = 50, offset = 0 } = req.query;

    // Verify student exists and get their profile
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        profile_id,
        grade_level
      `)
      .eq('id', id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Derive age group from grade level
    const studentAgeGroup = gradeLevelToAgeGroup(student.grade_level);

    // Get lessons for student's age group
    let query = supabase
      .from('lessons')
      .select(`
        id,
        slug,
        title_vi,
        title_en,
        description_vi,
        description_en,
        age_group,
        category,
        difficulty,
        estimated_minutes,
        order_index,
        tags
      `, { count: 'exact' })
      .eq('is_published', true)
      .order('order_index', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Filter by student's age group by default
    if (ageGroup) {
      query = query.eq('age_group', ageGroup);
    } else {
      // Use student's derived age group based on grade level
      query = query.eq('age_group', studentAgeGroup);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: lessons, count, error: lessonsError } = await query
      .then(({ data, count, error }) => ({ data, count, error }));

    if (lessonsError) throw lessonsError;

    // Get student's progress on these lessons
    let progressMap = {};
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('lesson_id, completed, completed_at, completed_steps')
            .eq('user_id', user.id);

          progressMap = (progress || []).reduce((acc, p) => {
            acc[p.lesson_id] = p;
            return acc;
          }, {});
        }
      } catch (e) {
        // Ignore auth errors
      }
    }

    res.json({
      lessons: lessons.map(l => ({
        id: l.id,
        slug: l.slug,
        title: l.title_vi,
        titleVi: l.title_vi,
        titleEn: l.title_en,
        descriptionVi: l.description_vi,
        descriptionEn: l.description_en,
        ageGroup: l.age_group,
        category: l.category,
        difficulty: l.difficulty,
        estimatedMinutes: l.estimated_minutes,
        orderIndex: l.order_index,
        tags: l.tags,
        progress: progressMap[l.id] ? {
          completed: progressMap[l.id].completed,
          completedAt: progressMap[l.id].completed_at,
          completedSteps: progressMap[l.id].completed_steps,
        } : null,
      })),
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < (count || 0),
      },
    });
  } catch (err) {
    console.error('Error fetching student lessons:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/mobile/students/:id/progress
 * Get overall progress summary for a student
 */
router.get('/students/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        profile_id,
        grade_level
      `)
      .eq('id', id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const profileId = student.profile_id;
    const studentAgeGroup = gradeLevelToAgeGroup(student.grade_level);

    // Get user progress record
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', profileId)
      .single();

    // Get completed lessons count
    const completedLessons = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact' })
      .eq('user_id', profileId)
      .eq('completed', true)
      .then(({ count }) => count || 0);

    // Get total lessons for student's age group
    const totalLessons = await supabase
      .from('lessons')
      .select('*', { count: 'exact' })
      .eq('age_group', studentAgeGroup)
      .eq('is_published', true)
      .then(({ count }) => count || 0);

    // Get active missions count
    const activeMissions = await supabase
      .from('user_missions')
      .select('*', { count: 'exact' })
      .eq('user_id', profileId)
      .eq('status', 'active')
      .then(({ count }) => count || 0);

    // Get completed missions count
    const completedMissions = await supabase
      .from('user_missions')
      .select('*', { count: 'exact' })
      .eq('user_id', profileId)
      .eq('status', 'completed')
      .then(({ count }) => count || 0);

    // Calculate level from XP
    const totalXp = progress?.total_xp || 0;
    const level = Math.floor(totalXp / 100) + 1;
    const xpForNextLevel = (level * 100) - totalXp;
    const xpInCurrentLevel = totalXp - ((level - 1) * 100);

    // Get streak info
    const { data: recentProgress } = await supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('user_id', profileId)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(7);

    let currentStreak = 0;
    if (recentProgress && recentProgress.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const dates = recentProgress
        .filter(p => p.completed_at)
        .map(p => p.completed_at.split('T')[0]);

      const uniqueDates = [...new Set(dates)];

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
      studentId: id,
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
      joinedAt: progress?.created_at || null,
    });
  } catch (err) {
    console.error('Error fetching student progress:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/mobile/students/:id/badges
 * Get badges for a student
 */
router.get('/students/:id/badges', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const profileId = student.profile_id;

    // Get all available badges
    const { data: allBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*');

    if (badgesError) throw badgesError;

    // Get user's earned badges
    const { data: progress } = await supabase
      .from('user_progress')
      .select('badges_earned')
      .eq('user_id', profileId)
      .single();

    const earnedBadgeIds = progress?.badges_earned || [];

    res.json(allBadges.map(badge => ({
      id: badge.id,
      slug: badge.slug,
      name: badge.name,
      nameVi: badge.name_vi,
      nameEn: badge.name_en,
      description: badge.description,
      descriptionVi: badge.description_vi,
      descriptionEn: badge.description_en,
      iconEmoji: badge.icon_emoji,
      colorHex: badge.color_hex,
      category: badge.category,
      rarity: badge.rarity,
      earned: earnedBadgeIds.includes(badge.slug),
    })));
  } catch (err) {
    console.error('Error fetching student badges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/mobile/tutorials
 * List all published tutorials
 */
router.get('/tutorials', async (req, res) => {
  try {
    const { category, ageGroup, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('tutorials')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .order('order_index', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (ageGroup) {
      query = query.or(`age_group.eq.${ageGroup},age_group.eq.all`);
    }

    const { data: tutorials, count, error } = await query
      .then(({ data, count, error }) => ({ data, count, error }));

    if (error) throw error;

    res.json({
      tutorials: tutorials.map(t => ({
        id: t.id,
        slug: t.slug,
        title: t.title_vi,
        titleVi: t.title_vi,
        titleEn: t.title_en,
        description: t.description_vi,
        descriptionVi: t.description_vi,
        descriptionEn: t.description_en,
        category: t.category,
        ageGroup: t.age_group,
        thumbnailUrl: t.thumbnail_url,
        videoUrl: t.video_url,
        durationMinutes: t.duration_minutes,
      })),
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < (count || 0),
      },
    });
  } catch (err) {
    console.error('Error fetching tutorials:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/mobile/tutorials/:id
 * Get a specific tutorial by ID or slug
 */
router.get('/tutorials/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's a UUID
    const isUUID = id.includes('-') && id.length === 36;

    let query = supabase
      .from('tutorials')
      .select('*');

    if (isUUID) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: tutorial, error } = await query.single();

    if (error || !tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    // Get user's progress if authenticated
    let userProgress = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: progress } = await supabase
            .from('tutorial_progress')
            .select('*')
            .eq('tutorial_id', tutorial.id)
            .eq('user_id', user.id)
            .single();
          userProgress = progress;
        }
      } catch (e) {
        // Ignore auth errors
      }
    }

    res.json({
      id: tutorial.id,
      slug: tutorial.slug,
      title: tutorial.title_vi,
      titleVi: tutorial.title_vi,
      titleEn: tutorial.title_en,
      description: tutorial.description_vi,
      descriptionVi: tutorial.description_vi,
      descriptionEn: tutorial.description_en,
      content: tutorial.content_vi,
      contentVi: tutorial.content_vi,
      contentEn: tutorial.content_en,
      category: tutorial.category,
      ageGroup: tutorial.age_group,
      thumbnailUrl: tutorial.thumbnail_url,
      videoUrl: tutorial.video_url,
      durationMinutes: tutorial.duration_minutes,
      userProgress: userProgress ? {
        completed: userProgress.completed,
        completedAt: userProgress.completed_at,
        progressPercent: userProgress.progress_percent,
        lastPosition: userProgress.last_position,
      } : null,
    });
  } catch (err) {
    console.error('Error fetching tutorial:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/mobile/devices/fcm-token
 * Register or update FCM device token
 */
router.post('/devices/fcm-token', authenticate, async (req, res) => {
  try {
    const { fcmToken, deviceType, deviceName, appVersion } = req.body;
    const userId = req.user.id;

    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    const device = await registerDeviceToken(userId, fcmToken, {
      deviceType: deviceType || 'android',
      deviceName,
      appVersion,
    });

    res.json({
      success: true,
      device: {
        id: device.id,
        deviceType: device.device_type,
        deviceName: device.device_name,
        pushEnabled: device.push_enabled,
      },
    });
  } catch (err) {
    console.error('Error registering device token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/mobile/devices/fcm-token
 * Remove FCM device token (device logout)
 */
router.delete('/devices/fcm-token', authenticate, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;

    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    await removeDeviceToken(userId, fcmToken);

    res.json({ success: true });
  } catch (err) {
    console.error('Error removing device token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/mobile/push-preferences
 * Get user's push notification preferences
 */
router.get('/push-preferences', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    let preferences = await getPushPreferences(userId);

    if (!preferences) {
      // Return defaults if no preferences set
      preferences = {
        lesson_reminders: true,
        lesson_reminder_time: '18:00:00',
        weekly_progress: true,
        weekly_progress_day: 'sunday',
        badge_earned: true,
        mission_available: true,
        parent_alerts: true,
      };
    }

    res.json({
      lessonReminders: preferences.lesson_reminders,
      lessonReminderTime: preferences.lesson_reminder_time,
      weeklyProgress: preferences.weekly_progress,
      weeklyProgressDay: preferences.weekly_progress_day,
      badgeEarned: preferences.badge_earned,
      missionAvailable: preferences.mission_available,
      parentAlerts: preferences.parent_alerts,
    });
  } catch (err) {
    console.error('Error fetching push preferences:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/mobile/push-preferences
 * Update user's push notification preferences
 */
router.patch('/push-preferences', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      lessonReminders,
      lessonReminderTime,
      weeklyProgress,
      weeklyProgressDay,
      badgeEarned,
      missionAvailable,
      parentAlerts,
    } = req.body;

    const preferences = await updatePushPreferences(userId, {
      lesson_reminders: lessonReminders,
      lesson_reminder_time: lessonReminderTime,
      weekly_progress: weeklyProgress,
      weekly_progress_day: weeklyProgressDay,
      badge_earned: badgeEarned,
      mission_available: missionAvailable,
      parent_alerts: parentAlerts,
    });

    res.json({
      success: true,
      preferences: {
        lessonReminders: preferences.lesson_reminders,
        lessonReminderTime: preferences.lesson_reminder_time,
        weeklyProgress: preferences.weekly_progress,
        weeklyProgressDay: preferences.weekly_progress_day,
        badgeEarned: preferences.badge_earned,
        missionAvailable: preferences.mission_available,
        parentAlerts: preferences.parent_alerts,
      },
    });
  } catch (err) {
    console.error('Error updating push preferences:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/mobile/notifications/test
 * Send a test notification (dev only)
 */
router.post('/notifications/test', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await sendLessonReminder(userId, 'Test Lesson');

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to send notification' });
    }

    res.json({ success: true, result });
  } catch (err) {
    console.error('Error sending test notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
