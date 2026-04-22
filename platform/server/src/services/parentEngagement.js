/**
 * Parent Engagement Automation Service
 * RoboKids Vietnam - Automated parent communications
 *
 * Features:
 * - Weekly progress reports (AI-generated)
 * - Monthly insights summary
 * - Milestone engagement triggers
 * - Personalized notifications via AI
 */

import { supabaseAdmin } from '../lib/supabase.js';
import { chatWithAI } from './minimax.js';
import { getAgeGroup } from './robobuddy-templates.js';

/**
 * Engagement notification types
 */
export const EngagementType = {
  WEEKLY_PROGRESS: 'weekly_progress',
  MONTHLY_INSIGHTS: 'monthly_insights',
  MILESTONE_REACHED: 'milestone_reached',
  STREAK_WARNING: 'streak_warning',
  CLASS_REMINDER: 'class_reminder',
  ACHIEVEMENT: 'achievement',
};

/**
 * Generate weekly progress report for a student
 */
export async function generateWeeklyProgressReport(studentId, studentName, parentId) {
  // Get this week's progress
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: lessonProgress } = await supabaseAdmin
    .from('lesson_progress')
    .select('*, lessons(title, course_id)')
    .eq('student_id', studentId)
    .gte('updated_at', oneWeekAgo.toISOString());

  const { data: userProgress } = await supabaseAdmin
    .from('user_progress')
    .select('*')
    .eq('user_id', studentId)
    .single();

  const { data: badgesEarned } = await supabaseAdmin
    .from('earned_badges')
    .select('*, badges(name_vi, name_en, icon)')
    .eq('user_id', studentId)
    .gte('earned_at', oneWeekAgo.toISOString());

  // Calculate stats
  const lessonsCompleted = lessonProgress?.filter(lp => lp.completed).length || 0;
  const xpEarned = userProgress?.total_xp || 0;
  const currentLevel = userProgress?.level || 1;
  const currentStreak = userProgress?.current_streak_days || 0;

  // Generate AI-personalized message
  const aiMessage = await generateWeeklyProgressAI(studentName, {
    lessonsCompleted,
    xpEarned,
    currentLevel,
    currentStreak,
    badgesEarned: badgesEarned?.length || 0,
  });

  return {
    studentId,
    studentName,
    parentId,
    period: {
      start: oneWeekAgo.toISOString(),
      end: new Date().toISOString(),
    },
    stats: {
      lessonsCompleted,
      xpEarned,
      currentLevel,
      currentStreak,
      badgesEarned: badgesEarned?.length || 0,
    },
    aiMessage,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate AI-personalized weekly progress message
 */
async function generateWeeklyProgressAI(studentName, stats) {
  const { lessonsCompleted, xpEarned, currentLevel, currentStreak, badgesEarned } = stats;

  const systemPrompt = `Em là RoboBuddy - AI tutor thân thiện của RoboKids Vietnam. Em tạo báo cáo tiến độ học tập hàng tuần cho phụ huynh.

Viết báo cáo ngắn (3-4 câu) bằng tiếng Việt, thân thiện và động viên. Tập trung vào điểm tích cực.`;

  const userPrompt = `Tạo báo cáo tuần cho con "${studentName}" với các thông số:
- Buổi học hoàn thành: ${lessonsCompleted}
- XP kiếm được: ${xpEarned}
- Level hiện tại: ${currentLevel}
- Streak hiện tại: ${currentStreak} ngày
- Huy hiệu mới: ${badgesEarned}

Báo cáo:`;

  try {
    const response = await chatWithAI(systemPrompt, userPrompt, 'vi');
    return response;
  } catch (error) {
    console.error('[ParentEngagement] AI message generation failed:', error);
    return `Con ${studentName} đã có một tuần học tập tốt đẹp! Đạt ${lessonsCompleted} buổi học và ${xpEarned} XP.`;
  }
}

/**
 * Generate monthly insights summary for a student
 */
export async function generateMonthlyInsights(studentId, studentName, parentId) {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // Get month's data
  const { data: lessonProgress } = await supabaseAdmin
    .from('lesson_progress')
    .select('*, lessons(title, course_id)')
    .eq('student_id', studentId)
    .gte('updated_at', oneMonthAgo.toISOString());

  const { data: userProgress } = await supabaseAdmin
    .from('user_progress')
    .select('*')
    .eq('user_id', studentId)
    .single();

  const { data: badgesEarned } = await supabaseAdmin
    .from('earned_badges')
    .select('*, badges(name_vi, name_en, icon)')
    .eq('user_id', studentId)
    .gte('earned_at', oneMonthAgo.toISOString());

  const { data: missionsCompleted } = await supabaseAdmin
    .from('mission_attempts')
    .select('*')
    .eq('user_id', studentId)
    .eq('status', 'completed')
    .gte('completed_at', oneMonthAgo.toISOString());

  // Calculate monthly stats
  const lessonsCompleted = lessonProgress?.filter(lp => lp.completed).length || 0;
  const totalXp = userProgress?.total_xp || 0;
  const currentLevel = userProgress?.level || 1;
  const currentStreak = userProgress?.current_streak_days || 0;

  // Calculate improvement areas
  const strengths = [];
  const areasForImprovement = [];

  if (lessonsCompleted >= 4) strengths.push('Hoàn thành tốt các buổi học');
  if (currentStreak >= 7) strengths.push('Học đều đặn, streak tốt');
  if (badgesEarned?.length > 0) strengths.push('Đạt nhiều thành tích mới');

  if (lessonsCompleted < 3) areasForImprovement.push('Cần chăm chỉ học thêm');
  if (currentStreak < 3) areasForImprovement.push('Duy trì streak đều đặn');

  return {
    studentId,
    studentName,
    parentId,
    period: {
      start: oneMonthAgo.toISOString(),
      end: new Date().toISOString(),
    },
    stats: {
      lessonsCompleted,
      totalXp,
      currentLevel,
      currentStreak,
      badgesEarned: badgesEarned?.length || 0,
      missionsCompleted: missionsCompleted?.length || 0,
    },
    insights: {
      strengths,
      areasForImprovement,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Check and trigger engagement events for all students
 * Called by cron job or manually
 */
export async function processEngagementTriggers() {
  const results = {
    weeklyReports: 0,
    monthlyInsights: 0,
    streakWarnings: 0,
    milestoneAlerts: 0,
  };

  // Get all active enrollments
  const { data: enrollments } = await supabaseAdmin
    .from('enrollments')
    .select('*, students(profile_id, full_name), profiles(id, email)')
    .eq('status', 'enrolled');

  for (const enrollment of enrollments || []) {
    const studentId = enrollment.students?.profile_id;
    const studentName = enrollment.students?.full_name;
    const parentId = enrollment.profiles?.id;

    if (!studentId || !parentId) continue;

    try {
      // Check for streak warning (3 days no activity)
      const { data: userProgress } = await supabaseAdmin
        .from('user_progress')
        .select('current_streak_days, last_activity_at')
        .eq('user_id', studentId)
        .single();

      if (userProgress) {
        const daysSinceActivity = userProgress.last_activity_at
          ? Math.floor((Date.now() - new Date(userProgress.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceActivity >= 3 && daysSinceActivity < 7 && userProgress.current_streak_days > 0) {
          await triggerStreakWarning(parentId, studentName, daysSinceActivity);
          results.streakWarnings++;
        }
      }

      // Check for milestone achievements
      if (userProgress) {
        const milestones = [7, 14, 30, 60, 100, 365];
        for (const milestone of milestones) {
          if (userProgress.current_streak_days === milestone) {
            await triggerMilestoneAlert(parentId, studentId, studentName, 'streak', milestone);
            results.milestoneAlerts++;
          }
        }
      }
    } catch (err) {
      console.error(`[ParentEngagement] Error processing engagement for student ${studentId}:`, err);
    }
  }

  return results;
}

/**
 * Trigger streak warning notification
 */
async function triggerStreakWarning(parentId, studentName, daysInactive) {
  const { data: parentNotifications } = await supabaseAdmin
    .from('parent_notifications')
    .insert({
      parent_id: parentId,
      notification_type: 'streak_warning',
      title: `⚠️ ${studentName} cần duy trì streak!`,
      body: `Con đã ${daysInactive} ngày chưa học bài. Hãy khuyến khích con tiếp tục học để không mất streak!`,
      data: { studentName, daysInactive, type: 'streak_warning' },
    });

  return parentNotifications;
}

/**
 * Trigger milestone achievement notification
 */
async function triggerMilestoneAlert(parentId, studentId, studentName, milestoneType, value) {
  const milestoneMessages = {
    streak: {
      title: `🎉 ${studentName} đạt streak ${value} ngày!`,
      body: `Wow! Con đã duy trì học tập ${value} ngày liên tiếp. Thật là tuyệt vời!`,
    },
    level: {
      title: `⭐ ${studentName} lên level mới!`,
      body: `Chúc mừng con đã đạt level ${value}!`,
    },
  };

  const message = milestoneMessages[milestoneType];

  await supabaseAdmin
    .from('parent_notifications')
    .insert({
      parent_id: parentId,
      notification_type: 'milestone_achievement',
      title: message.title,
      body: message.body,
      data: { studentName, milestoneType, value, type: 'milestone_achievement' },
    });
}

/**
 * Schedule weekly reports for all parents
 */
export async function scheduleWeeklyReports() {
  const { data: enrollments } = await supabaseAdmin
    .from('enrollments')
    .select('*, students(profile_id, full_name), profiles(id)')
    .eq('status', 'enrolled');

  const reports = [];

  for (const enrollment of enrollments || []) {
    const studentId = enrollment.students?.profile_id;
    const studentName = enrollment.students?.full_name;
    const parentId = enrollment.profiles?.id;

    if (studentId && parentId) {
      const report = await generateWeeklyProgressReport(studentId, studentName, parentId);
      reports.push(report);
    }
  }

  return reports;
}
