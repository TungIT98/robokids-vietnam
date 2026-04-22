/**
 * Streak Tracking API routes for RoboKids Vietnam
 * Daily check-in, streak calculation, milestone tracking
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Milestone thresholds
const MILESTONES = [
  { days: 7, badge_key: 'streak_7', name_vi: '7 Ngày Liên Tục', name_en: '7 Day Streak' },
  { days: 30, badge_key: 'streak_30', name_vi: '30 Ngày Liên Tục', name_en: '30 Day Streak' },
  { days: 100, badge_key: 'streak_100', name_vi: '100 Ngày Liên Tục', name_en: '100 Day Streak' },
];

/**
 * Calculate consecutive streak from check-in dates
 */
function calculateConsecutiveStreak(checkinDates) {
  if (!checkinDates || checkinDates.length === 0) return 0;

  // Get unique dates only
  const uniqueDates = [...new Set(checkinDates.map(d => d.split('T')[0]))].sort().reverse();

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday to be active
  if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday)) {
    return 0;
  }

  // Start counting from the most recent valid date
  let currentDate = uniqueDates.includes(today) ? today : yesterday;
  let streak = 1; // Include the starting date

  // Convert to Set for O(1) lookup
  const dateSet = new Set(uniqueDates);

  while (true) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    if (dateSet.has(prevDateStr)) {
      streak++;
      currentDate = prevDateStr;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get all checkin dates for a student within a range
 */
async function getCheckinDates(studentProfileId, startDate = null) {
  let query = supabase
    .from('streak_checkins')
    .select('checkin_date')
    .eq('user_id', studentProfileId)
    .order('checkin_date', { ascending: false });

  if (startDate) {
    query = query.gte('checkin_date', startDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(d => d.checkin_date);
}

/**
 * Award streak milestone badge if achieved
 */
async function checkAndAwardMilestoneBadge(userId, streakDays) {
  const milestone = MILESTONES.find(m => m.days === streakDays);

  if (!milestone) return null;

  // Check if badge exists
  const { data: badge } = await supabase
    .from('badges')
    .select('id')
    .eq('badge_key', milestone.badge_key)
    .single();

  if (!badge) return null;

  // Check if already earned
  const { data: existing } = await supabase
    .from('earned_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_id', badge.id)
    .single();

  if (existing) return null;

  // Award the badge
  const { data: earned, error } = await supabase
    .from('earned_badges')
    .insert({
      user_id: userId,
      badge_id: badge.id,
      earned_context: { streak_days: streakDays, milestone: milestone.days }
    })
    .select()
    .single();

  if (error) {
    console.error('Error awarding milestone badge:', error);
    return null;
  }

  return milestone;
}

/**
 * GET /api/streaks/:studentId
 * Get current streak info for a student
 */
router.get('/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const requestingUserId = req.user.id;

    // Get student profile
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Authorization: parent linked to student, admin/teacher, or own profile
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', requestingUserId)
      .single();

    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';
    const isOwnProfile = student.profile_id === requestingUserId;

    // Check parent relation
    let isParent = false;
    if (!isOwnProfile && !isAdminOrTeacher) {
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('profile_id', requestingUserId)
        .single();

      if (parent) {
        const { data: relation } = await supabase
          .from('student_parent_relations')
          .select('id')
          .eq('student_id', studentId)
          .eq('parent_id', parent.id)
          .single();

        isParent = !!relation;
      }
    }

    if (!isParent && !isAdminOrTeacher && !isOwnProfile) {
      return res.status(403).json({ error: 'Not authorized to view this student\'s streak' });
    }

    // Get user_progress for streak data
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('current_streak_days, longest_streak_days, streak_frozen_until, total_xp')
      .eq('user_id', student.profile_id)
      .single();

    // Get recent checkins (last 100 days to calculate streak)
    const checkinDates = await getCheckinDates(student.profile_id);

    // Calculate current streak
    const currentStreak = calculateConsecutiveStreak(checkinDates);

    // Check for streak freeze
    const streakFrozen = userProgress?.streak_frozen_until
      ? new Date(userProgress.streak_frozen_until) > new Date()
      : false;

    // Check next milestone
    const nextMilestone = MILESTONES.find(m => m.days > currentStreak);

    // Get streak history for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const recentCheckins = checkinDates.filter(d => d >= thirtyDaysAgo);

    res.json({
      studentId,
      currentStreak,
      longestStreak: userProgress?.longest_streak_days || currentStreak,
      streakFrozen,
      frozenUntil: userProgress?.streak_frozen_until || null,
      nextMilestone: nextMilestone ? {
        days: nextMilestone.days,
        badgeKey: nextMilestone.badge_key,
        nameVi: nextMilestone.name_vi,
        nameEn: nextMilestone.name_en,
        daysRemaining: nextMilestone.days - currentStreak
      } : null,
      recentCheckins: recentCheckins.length,
      totalXp: userProgress?.total_xp || 0
    });
  } catch (err) {
    console.error('Error fetching streak:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/streaks/:studentId/checkin
 * Daily check-in to maintain/increase streak
 */
router.post('/:studentId/checkin', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const requestingUserId = req.user.id;

    // Get student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Authorization: only the student themselves can check in
    if (student.profile_id !== requestingUserId) {
      // Check if admin/teacher
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', requestingUserId)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
        return res.status(403).json({ error: 'Only the student can check in for themselves' });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const userId = student.profile_id;

    // Check if already checked in today
    const { data: existingCheckin } = await supabase
      .from('streak_checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('checkin_date', today)
      .single();

    if (existingCheckin) {
      return res.status(409).json({
        error: 'Already checked in today',
        checkinDate: today,
        message: 'Bạn đã điểm danh hôm nay rồi!'
      });
    }

    // Create checkin record
    const { data: checkin, error: checkinError } = await supabase
      .from('streak_checkins')
      .insert({
        user_id: userId,
        checkin_date: today
      })
      .select()
      .single();

    if (checkinError) {
      console.error('Checkin error:', checkinError);
      return res.status(500).json({ error: 'Failed to check in' });
    }

    // Calculate new streak
    const checkinDates = await getCheckinDates(userId);
    const newStreak = calculateConsecutiveStreak(checkinDates);

    // Get current user_progress
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('id, current_streak_days, longest_streak_days, total_xp')
      .eq('user_id', userId)
      .single();

    const longestStreak = Math.max(
      userProgress?.longest_streak_days || 0,
      newStreak
    );

    // Update user_progress
    const updates = {
      current_streak_days: newStreak,
      longest_streak_days: longestStreak,
      last_checkin: today
    };

    if (userProgress) {
      await supabase
        .from('user_progress')
        .update(updates)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_progress')
        .insert({
          user_id: userId,
          ...updates
        });
    }

    // Check for milestone badge
    const milestoneAwarded = await checkAndAwardMilestoneBadge(userId, newStreak);

    // Award XP for checkin (5 XP per day)
    const xpReward = 5;
    const newTotalXp = (userProgress?.total_xp || 0) + xpReward;

    await supabase
      .from('user_progress')
      .update({ total_xp: newTotalXp })
      .eq('user_id', userId);

    res.status(201).json({
      success: true,
      checkinDate: today,
      newStreak,
      longestStreak,
      xpEarned: xpReward,
      totalXp: newTotalXp,
      milestoneAwarded: milestoneAwarded ? {
        badgeKey: milestoneAwarded.badge_key,
        nameVi: milestoneAwarded.name_vi,
        nameEn: milestoneAwarded.name_en
      } : null,
      message: newStreak >= 7
        ? `Tiếp tục phong độ! streak của bạn là ${newStreak} ngày!`
        : 'Check-in thành công! Giữ vững streak nhé!'
    });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/streaks/:studentId/history
 * Get streak history (calendar view) for a student
 * Query params: months (default 1, max 6)
 */
router.get('/:studentId/history', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { months = 1 } = req.query;
    const requestingUserId = req.user.id;

    // Get student
    const { data: student } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', studentId)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Authorization check
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', requestingUserId)
      .single();

    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';
    const isOwnProfile = student.profile_id === requestingUserId;

    let isParent = false;
    if (!isOwnProfile && !isAdminOrTeacher) {
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('profile_id', requestingUserId)
        .single();

      if (parent) {
        const { data: relation } = await supabase
          .from('student_parent_relations')
          .select('id')
          .eq('student_id', studentId)
          .eq('parent_id', parent.id)
          .single();

        isParent = !!relation;
      }
    }

    if (!isParent && !isAdminOrTeacher && !isOwnProfile) {
      return res.status(403).json({ error: 'Not authorized to view this student\'s streak history' });
    }

    // Limit months to 6 max
    const numMonths = Math.min(parseInt(months) || 1, 6);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - numMonths);
    startDate.setDate(1);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get checkins in range
    const { data: checkins, error: checkinsError } = await supabase
      .from('streak_checkins')
      .select('checkin_date')
      .eq('user_id', student.profile_id)
      .gte('checkin_date', startDateStr)
      .order('checkin_date', { ascending: true });

    if (checkinsError) throw checkinsError;

    // Get milestone achievements in range
    const { data: earnedBadges } = await supabase
      .from('earned_badges')
      .select(`
        id,
        earned_at,
        badge_id,
        badges (
          id,
          badge_key,
          name_vi,
          name_en
        )
      `)
      .eq('user_id', student.profile_id)
      .like('badge_id', 'streak_%')
      .gte('earned_at', startDateStr);

    // Build calendar data
    const checkinSet = new Set((checkins || []).map(c => c.checkin_date));
    const calendarData = [];

    const currentDate = new Date(startDate);
    const today = new Date();

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      calendarData.push({
        date: dateStr,
        checkedIn: checkinSet.has(dateStr)
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count stats
    const totalCheckins = checkins?.length || 0;
    const checkinDates = (checkins || []).map(c => c.checkin_date);
    const currentStreak = calculateConsecutiveStreak(checkinDates);

    res.json({
      studentId,
      period: {
        startDate: startDateStr,
        endDate: today.toISOString().split('T')[0],
        months: numMonths
      },
      stats: {
        totalCheckins,
        currentStreak,
        averageCheckinsPerWeek: numMonths > 0
          ? (totalCheckins / (numMonths * 4)).toFixed(1)
          : 0
      },
      calendar: calendarData,
      milestones: (earnedBadges || []).map(eb => ({
        id: eb.id,
        badgeKey: eb.badges?.badge_key,
        nameVi: eb.badges?.name_vi,
        nameEn: eb.badges?.name_en,
        earnedAt: eb.earned_at
      }))
    });
  } catch (err) {
    console.error('Error fetching streak history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/streaks/:studentId/freeze
 * Freeze streak for 1 day (for missed check-ins)
 * Uses streak_freeze currency if available
 */
router.post('/:studentId/freeze', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const requestingUserId = req.user.id;

    // Get student
    const { data: student } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', studentId)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Only student themselves can freeze
    if (student.profile_id !== requestingUserId) {
      return res.status(403).json({ error: 'Only the student can freeze their streak' });
    }

    // Get user progress for freeze count
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('streak_freeze_count, streak_frozen_until, current_streak_days')
      .eq('user_id', student.profile_id)
      .single();

    // Check if already frozen
    if (userProgress?.streak_frozen_until) {
      const frozenUntil = new Date(userProgress.streak_frozen_until);
      if (frozenUntil > new Date()) {
        return res.status(400).json({
          error: 'Streak already frozen',
          frozenUntil: userProgress.streak_frozen_until
        });
      }
    }

    // Calculate freeze expiration (end of next day)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Update freeze
    await supabase
      .from('user_progress')
      .update({
        streak_frozen_until: tomorrow.toISOString(),
        streak_freeze_count: (userProgress?.streak_freeze_count || 0) + 1
      })
      .eq('user_id', student.profile_id);

    res.json({
      success: true,
      message: 'Streak frozen until tomorrow',
      frozenUntil: tomorrow.toISOString(),
      freezeCount: (userProgress?.streak_freeze_count || 0) + 1
    });
  } catch (err) {
    console.error('Error freezing streak:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/streaks/:studentId/milestones
 * Get all milestone badges and progress
 */
router.get('/:studentId/milestones', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const requestingUserId = req.user.id;

    // Get student
    const { data: student } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', studentId)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Authorization check
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', requestingUserId)
      .single();

    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';
    const isOwnProfile = student.profile_id === requestingUserId;

    let isParent = false;
    if (!isOwnProfile && !isAdminOrTeacher) {
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('profile_id', requestingUserId)
        .single();

      if (parent) {
        const { data: relation } = await supabase
          .from('student_parent_relations')
          .select('id')
          .eq('student_id', studentId)
          .eq('parent_id', parent.id)
          .single();

        isParent = !!relation;
      }
    }

    if (!isParent && !isAdminOrTeacher && !isOwnProfile) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get current streak
    const checkinDates = await getCheckinDates(student.profile_id);
    const currentStreak = calculateConsecutiveStreak(checkinDates);

    // Get earned badges
    const { data: earnedBadges } = await supabase
      .from('earned_badges')
      .select('badge_id, badges(badge_key)')
      .eq('user_id', student.profile_id);

    const earnedBadgeKeys = (earnedBadges || [])
      .map(eb => eb.badges?.badge_key)
      .filter(Boolean);

    res.json({
      studentId,
      currentStreak,
      milestones: MILESTONES.map(m => ({
        days: m.days,
        badgeKey: m.badge_key,
        nameVi: m.name_vi,
        nameEn: m.name_en,
        achieved: earnedBadgeKeys.includes(m.badge_key),
        daysRemaining: m.days - currentStreak > 0 ? m.days - currentStreak : 0
      }))
    });
  } catch (err) {
    console.error('Error fetching milestones:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;