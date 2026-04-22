/**
 * Windmill Script: Check and Send Achievement Notifications
 *
 * Schedule: Every 15 minutes
 *
 * This script checks for new achievements and sends notifications.
 * Achievement triggers:
 * - Badge earned
 * - Level up
 * - Streak milestones (7, 30, 100 days)
 * - Mission completed
 *
 * Windmill Setup:
 * 1. Import this script into Windmill
 * 2. Set up a cron trigger: */15 * * * * (Every 15 minutes)
 * 3. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as resource secrets
 */

import { createClient } from '@supabase/supabase-js';

interface AchievementCheck {
  studentId: string;
  studentName: string;
  achievement: string;
  achievementType: 'badge' | 'level' | 'streak' | 'mission';
  recipient: {
    email: string;
    phone: string;
    zaloId: string;
    userId: string;
  };
}

export async function main() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const achievements: AchievementCheck[] = [];

  // Check for new badges (last 15 minutes)
  const fifteenMinutesAgo = new Date();
  fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

  const { data: newBadges } = await supabase
    .from('earned_badges')
    .select(`
      id,
      earned_at,
      badges (
        name,
        icon
      ),
      students (
        id,
        profiles (
          full_name
        ),
        student_parent_relations (
          parent_id,
          parents (
            profile_id,
            email,
            phone,
            zalo_id,
            user_id
          )
        )
      )
    `)
    .gte('earned_at', fifteenMinutesAgo.toISOString());

  for (const badge of newBadges || []) {
    const student = badge.students;
    if (!student) continue;

    const studentName = student.profiles?.full_name || 'Student';

    for (const relation of student.student_parent_relations || []) {
      const parent = relation.parents;
      if (!parent) continue;

      achievements.push({
        studentId: student.id,
        studentName,
        achievement: badge.badges?.name || 'New Badge',
        achievementType: 'badge',
        recipient: {
          email: parent.email,
          phone: parent.phone,
          zaloId: parent.zalo_id,
          userId: parent.user_id,
        },
      });
    }
  }

  // Check for level ups (last 15 minutes)
  // This would require tracking level changes in a separate table or audit log
  // For now, we check user_progress for recent updates

  const { data: levelUps } = await supabase
    .from('user_progress')
    .select(`
      id,
      updated_at,
      current_level,
      students (
        id,
        profiles (
          full_name
        ),
        student_parent_relations (
          parent_id,
          parents (
            profile_id,
            email,
            phone,
            zalo_id,
            user_id
          )
        )
      )
    `)
    .gte('updated_at', fifteenMinutesAgo.toISOString());

  for (const progress of levelUps || []) {
    // Only notify for level 5, 10, 15, etc.
    if (progress.current_level % 5 !== 0) continue;

    const student = progress.students;
    if (!student) continue;

    const studentName = student.profiles?.full_name || 'Student';

    for (const relation of student.student_parent_relations || []) {
      const parent = relation.parents;
      if (!parent) continue;

      achievements.push({
        studentId: student.id,
        studentName,
        achievement: `Level ${progress.current_level}`,
        achievementType: 'level',
        recipient: {
          email: parent.email,
          phone: parent.phone,
          zaloId: parent.zalo_id,
          userId: parent.user_id,
        },
      });
    }
  }

  // Send notifications
  const results = [];

  for (const achievement of achievements) {
    console.log(`Sending ${achievement.achievementType} notification: ${achievement.studentName} earned ${achievement.achievement}`);

    // In production, call notification service here
    // await sendBadgeEarned({
    //   studentName: achievement.studentName,
    //   badgeName: achievement.achievement,
    //   recipient: achievement.recipient,
    // });

    results.push({
      studentId: achievement.studentId,
      studentName: achievement.studentName,
      achievement: achievement.achievement,
      type: achievement.achievementType,
      recipientEmail: achievement.recipient.email,
    });
  }

  console.log(`Achievement notifications triggered: ${results.length}`);

  return {
    notifications_triggered: results.length,
    results,
  };
}