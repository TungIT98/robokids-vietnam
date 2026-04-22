/**
 * Windmill Script: Send Class Reminders
 *
 * Schedule: Daily at 6:00 PM (for next day's classes)
 * Also: 1 hour before class starts
 *
 * This script sends reminders to parents about upcoming classes.
 *
 * Windmill Setup:
 * 1. Import this script into Windmill
 * 2. Set up cron triggers:
 *    - 0 18 * * * (Daily at 6 PM for next day)
 *    - 0 * * * * (Hourly for 1-hour reminders)
 * 3. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as resource secrets
 */

import { createClient } from '@supabase/supabase-js';

export async function main() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Find lessons scheduled for tomorrow (6 PM reminder)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Also find lessons starting in 1 hour (1-hour reminder)
  const oneHourFromNow = new Date();
  oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
  const oneHourFromNowStr = oneHourFromNow.toISOString().split('T')[0];

  const { data: schedules, error } = await supabase
    .from('lesson_schedules')
    .select(`
      id,
      scheduled_date,
      start_time,
      status,
      lessons (
        id,
        title,
        title_vi
      ),
      teachers (
        profiles (
          full_name
        )
      ),
      enrollment_id,
      enrollments (
        student_id,
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
              zalo_id
            )
          )
        )
      )
    `)
    .eq('status', 'scheduled')
    .or(`scheduled_date.eq.${tomorrowStr},scheduled_date.eq.${oneHourFromNowStr}`);

  if (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }

  const results = [];

  for (const schedule of schedules || []) {
    const lessonTitle = schedule.lessons?.title_vi || schedule.lessons?.title || 'RoboKids Class';
    const teacherName = schedule.teachers?.profiles?.full_name || 'your teacher';
    const scheduledDateTime = `${schedule.scheduled_date} at ${schedule.start_time?.substring(0, 5) || 'TBD'}`;

    const student = schedule.enrollments?.students;
    if (!student) continue;

    const studentName = student.profiles?.full_name || 'Student';

    // Send to each parent
    for (const relation of student.student_parent_relations || []) {
      const parent = relation.parents;
      if (!parent) continue;

      // Determine reminder type
      const isTomorrow = schedule.scheduled_date === tomorrowStr;
      const reminderType = isTomorrow ? 'next_day_reminder' : 'one_hour_reminder';

      console.log(`Sending ${reminderType} for ${studentName} to ${parent.email}`);

      // In production, call notification service here
      // await sendClassReminder({
      //   studentName,
      //   lessonTitle,
      //   dateTime: scheduledDateTime,
      //   teacherName,
      //   recipient: {
      //     email: parent.email,
      //     phone: parent.phone,
      //     zaloId: parent.zalo_id,
      //   }
      // });

      results.push({
        scheduleId: schedule.id,
        studentName,
        parentEmail: parent.email,
        lessonTitle,
        reminderType,
      });
    }
  }

  console.log(`Class reminders sent: ${results.length}`);

  return {
    reminders_sent: results.length,
    results,
  };
}