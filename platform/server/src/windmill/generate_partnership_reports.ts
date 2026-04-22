/**
 * Windmill Script: Generate Partnership Reports
 *
 * Schedule: Monthly on the 1st at 6:00 AM
 *
 * This script generates monthly reports for school partnerships including:
 * - Total students per school
 * - Revenue per school
 * - Engagement metrics
 * - Activity breakdown
 *
 * Windmill Setup:
 * 1. Import this script into Windmill
 * 2. Set up a cron trigger: 0 6 1 * * (1st of month at 6 AM)
 * 3. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as resource secrets
 */

import { createClient } from '@supabase/supabase-js';

interface SchoolReport {
  schoolId: string;
  schoolName: string;
  totalStudents: number;
  activeEnrollments: number;
  lessonsCompleted: number;
  totalRevenue: number;
  avgXpPerStudent: number;
  topPerformingStudents: Array<{
    name: string;
    xp: number;
    level: number;
  }>;
}

interface ReportResult {
  month: string;
  year: number;
  schools: SchoolReport[];
  generatedAt: string;
}

export async function main(): Promise<ReportResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();

  // Get first day of last month for filtering
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const { data: schools, error } = await supabase
    .from('schools')
    .select(`
      id,
      name,
      school_partnerships (
        id,
        current_stage
      )
    `)
    .not('school_partnerships', 'is', null);

  if (error) {
    console.error('Error fetching schools:', error);
    throw error;
  }

  const reports: SchoolReport[] = [];

  for (const school of schools || []) {
    // Count active students at this school
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact' })
      .eq('school_id', school.id);

    // Count active enrollments
    const { count: enrollmentCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact' })
      .eq('school_id', school.id)
      .eq('status', 'active');

    // Get lessons completed by school's students last month
    const { data: completedLessons } = await supabase
      .from('completed_lessons')
      .select('id')
      .gte('completed_at', lastMonthStart.toISOString())
      .lte('completed_at', lastMonthEnd.toISOString())
      .eq('students.school_id', school.id);

    // Calculate revenue from invoices
    const { data: invoices } = await supabase
      .from('school_invoices')
      .select('total_amount')
      .eq('school_id', school.id)
      .eq('status', 'paid');

    const totalRevenue = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    // Get top performing students by XP
    const { data: topStudents } = await supabase
      .from('user_progress')
      .select(`
        total_xp,
        current_level,
        students (
          profiles (
            full_name
          )
        )
      `)
      .eq('students.school_id', school.id)
      .order('total_xp', { ascending: false })
      .limit(5);

    const avgXpPerStudent = studentCount
      ? (topStudents?.reduce((sum, p) => sum + (p.total_xp || 0), 0) || 0) / studentCount
      : 0;

    reports.push({
      schoolId: school.id,
      schoolName: school.name,
      totalStudents: studentCount || 0,
      activeEnrollments: enrollmentCount || 0,
      lessonsCompleted: completedLessons?.length || 0,
      totalRevenue,
      avgXpPerStudent: Math.round(avgXpPerStudent),
      topPerformingStudents: (topStudents || []).map(p => ({
        name: p.students?.profiles?.full_name || 'Unknown',
        xp: p.total_xp || 0,
        level: p.current_level || 1,
      })),
    });
  }

  const result: ReportResult = {
    month,
    year,
    schools: reports,
    generatedAt: new Date().toISOString(),
  };

  console.log(`Partnership reports generated for ${month} ${year}: ${reports.length} schools`);

  return result;
}