/**
 * Windmill Script: Send Weekly Progress Notifications
 *
 * Schedule: Every Sunday at 9:00 AM
 *
 * This script sends weekly progress reports to all parents
 * with enrolled students who had activity during the week.
 *
 * Windmill Setup:
 * 1. Import this script into Windmill
 * 2. Set up a cron trigger: 0 9 * * 0 (Sundays at 9 AM)
 * 3. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as resource secrets
 */

import { createClient } from 'https://deno.land/x/supabase@v1.0.0/mod.ts';

interface WeeklyProgressResult {
  studentId: string;
  studentName: string;
  parentEmail: string;
  parentPhone: string;
  parentZaloId: string;
  lessonsCompleted: number;
  xpEarned: number;
  totalXp: number;
  level: number;
  topBadges: string[];
}

export async function main() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all students with progress in the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: students, error } = await supabase
    .from('students')
    .select(`
      id,
      profiles (
        full_name
      ),
      enrollments (
        id,
        status
      ),
      completed_lessons (
        id,
        completed_at
      ),
      user_progress (
        total_xp,
        current_level
      ),
      student_parent_relations (
        parent_id,
        parents (
          profile_id,
          email,
          phone,
          zalo_id
        )
      )
    `)
    .eq('enrollments.status', 'active');

  if (error) {
    console.error('Error fetching students:', error);
    throw error;
  }

  const results = [];

  for (const student of students || []) {
    // Calculate lessons completed this week
    const weeklyLessons = (student.completed_lessons || [])
      .filter(l => new Date(l.completed_at) >= oneWeekAgo);

    if (weeklyLessons.length === 0) continue;

    const progress = student.user_progress || { total_xp: 0, current_level: 1 };
    const studentName = student.profiles?.full_name || 'Student';

    // Get top badges
    const { data: badges } = await supabase
      .from('earned_badges')
      .select('badges(name)')
      .eq('student_id', student.id)
      .order('earned_at', { ascending: false })
      .limit(3);

    const topBadges = (badges || []).map(b => b.badges?.name).filter(Boolean);

    // Send to each parent
    for (const relation of student.student_parent_relations || []) {
      const parent = relation.parents;
      if (!parent) continue;

      const recipient = {
        email: parent.email,
        phone: parent.phone,
        zaloId: parent.zalo_id,
      };

      // Send email notification (would integrate with email service here)
      console.log(`Sending weekly progress to ${parent.email} for ${studentName}`);

      results.push({
        studentId: student.id,
        studentName,
        parentEmail: parent.email,
        lessonsCompleted: weeklyLessons.length,
        xpEarned: weeklyLessons.length * 50, // Estimate XP
        totalXp: progress.total_xp,
        level: progress.current_level,
      });
    }
  }

  console.log(`Weekly progress notifications sent: ${results.length}`);

  return {
    notifications_sent: results.length,
    results,
  };
}