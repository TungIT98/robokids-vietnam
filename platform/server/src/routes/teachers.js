import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Role helper
function getUserRole(user) {
  return user.role || user.user_metadata?.role || 'student';
}

// Get teacher profile by teacherId (profile_id)
async function getTeacherByProfileId(profileId) {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('profile_id', profileId)
    .single();
  return { data, error };
}

// Check if authenticated user has access to teacher data
async function canAccessTeacher(teacherProfileId, userId, userRole) {
  // Admin can access all
  if (userRole === 'admin' || userRole === 'robokids_staff') return true;

  // Teacher can access their own data
  if (teacherProfileId === userId) return true;

  // Coordinators/head teachers can access teachers in their school
  const { data: teacher } = await supabase
    .from('teachers')
    .select('school_id')
    .eq('profile_id', teacherProfileId)
    .single();

  if (!teacher) return false;

  const { data: relation } = await supabase
    .from('school_teachers')
    .select('role')
    .eq('school_id', teacher.school_id)
    .eq('teacher_id', userId)
    .in('role', ['head_teacher', 'coordinator'])
    .single();

  return !!relation;
}

/**
 * GET /api/teachers/:teacherId/classes
 * Returns list of classes assigned to teacher
 */
router.get('/:teacherId/classes', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const userRole = getUserRole(req.user);

    // Check access
    if (!await canAccessTeacher(teacherId, req.user.id, userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get teacher's classes
    const { data: classes, error } = await supabase
      .from('school_classes')
      .select(`
        *,
        school:schools(id, name)
      `)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    // Get student count for each class
    const classesWithCount = await Promise.all(
      classes.map(async (cls) => {
        const { count } = await supabase
          .from('student_school_relations')
          .select('*', { count: 'exact' })
          .eq('class_id', cls.id)
          .eq('status', 'active');

        return {
          ...cls,
          student_count: count || 0,
        };
      })
    );

    res.json({ classes: classesWithCount });
  } catch (err) {
    console.error('Error fetching teacher classes:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/teachers/:teacherId/students
 * Returns list of students in teacher's classes
 */
router.get('/:teacherId/students', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const userRole = getUserRole(req.user);

    // Check access
    if (!await canAccessTeacher(teacherId, req.user.id, userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get teacher's classes
    const { data: classes } = await supabase
      .from('school_classes')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('is_active', true);

    if (!classes || classes.length === 0) {
      return res.json({ students: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
    }

    const classIds = classes.map((c) => c.id);

    // Get students from those classes
    const { data: relations, count, error } = await supabase
      .from('student_school_relations')
      .select(`
        *,
        student:students(id, profile_id, grade_level),
        class:school_classes(id, name, grade_level),
        school:schools(id, name)
      `, { count: 'exact' })
      .in('class_id', classIds)
      .eq('status', 'active')
      .order('enrollment_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get student profiles
    const profileIds = relations
      .map((r) => r.student?.profile_id)
      .filter(Boolean);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', profileIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Get progress for students
    const studentIds = relations.map((r) => r.student?.id).filter(Boolean);
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('user_id, current_level, total_xp, current_streak_days')
      .in('user_id', studentIds);

    const progressMap = new Map(progressData?.map((p) => [p.user_id, p]) || []);

    const students = relations.map((rel) => {
      const profile = profileMap.get(rel.student?.profile_id);
      const progress = progressMap.get(rel.student?.id);
      return {
        id: rel.student?.id,
        name: profile?.full_name || 'Unknown',
        email: profile?.email,
        grade_level: rel.student?.grade_level,
        class: rel.class,
        school: rel.school,
        enrollment_date: rel.enrollment_date,
        progress: progress ? {
          level: progress.current_level,
          xp: progress.total_xp,
          streak: progress.current_streak_days,
        } : null,
      };
    });

    res.json({
      students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching teacher students:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/teachers/:teacherId/progress
 * Returns student progress data for teacher's classes
 */
router.get('/:teacherId/progress', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const userRole = getUserRole(req.user);

    // Check access
    if (!await canAccessTeacher(teacherId, req.user.id, userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get teacher's classes
    const { data: classes } = await supabase
      .from('school_classes')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('is_active', true);

    if (!classes || classes.length === 0) {
      return res.json({ progress: [], summary: { total_students: 0, avg_level: 0, avg_xp: 0 } });
    }

    const classIds = classes.map((c) => c.id);

    // Get student relations
    const { data: relations } = await supabase
      .from('student_school_relations')
      .select('student_id, class_id')
      .in('class_id', classIds)
      .eq('status', 'active');

    const studentIds = [...new Set(relations?.map((r) => r.student_id).filter(Boolean) || [])];

    if (studentIds.length === 0) {
      return res.json({ progress: [], summary: { total_students: 0, avg_level: 0, avg_xp: 0 } });
    }

    // Get progress data
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('*')
      .in('user_id', studentIds);

    // Get completed lessons
    const { data: completedLessons } = await supabase
      .from('completed_lessons')
      .select('user_id, lesson_id')
      .in('user_id', studentIds);

    const completionCounts = {};
    completedLessons?.forEach((cl) => {
      completionCounts[cl.user_id] = (completionCounts[cl.user_id] || 0) + 1;
    });

    // Build progress response
    const progress = progressData?.map((p) => ({
      student_id: p.user_id,
      level: p.current_level,
      xp: p.total_xp,
      streak: p.current_streak_days,
      lessons_completed: completionCounts[p.user_id] || 0,
      completion_rate: p.lessons_completed > 0
        ? Math.round((completionCounts[p.user_id] || 0) / p.lessons_completed * 100)
        : 0,
    })) || [];

    // Calculate summary
    const summary = {
      total_students: studentIds.length,
      avg_level: progress.length > 0
        ? Math.round(progress.reduce((sum, p) => sum + p.level, 0) / progress.length * 10) / 10
        : 0,
      avg_xp: progress.length > 0
        ? Math.round(progress.reduce((sum, p) => sum + p.xp, 0) / progress.length)
        : 0,
      avg_streak: progress.length > 0
        ? Math.round(progress.reduce((sum, p) => sum + p.streak, 0) / progress.length * 10) / 10
        : 0,
      total_completed_lessons: Object.values(completionCounts).reduce((sum, c) => sum + c, 0),
    };

    res.json({ progress, summary });
  } catch (err) {
    console.error('Error fetching teacher progress:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/teachers/:teacherId/dashboard-stats
 * Returns aggregate stats for teacher dashboard
 */
router.get('/:teacherId/dashboard-stats', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const userRole = getUserRole(req.user);

    // Check access
    if (!await canAccessTeacher(teacherId, req.user.id, userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get teacher's classes
    const { data: classes } = await supabase
      .from('school_classes')
      .select('id, name, schedule')
      .eq('teacher_id', teacherId)
      .eq('is_active', true);

    const classIds = classes?.map((c) => c.id) || [];

    // Get student count
    const { count: studentCount } = classIds.length > 0
      ? await supabase
          .from('student_school_relations')
          .select('*', { count: 'exact' })
          .in('class_id', classIds)
          .eq('status', 'active')
      : { count: 0 };

    // Get today's classes and upcoming sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get live classes for today
    const { data: todayClasses } = await supabase
      .from('live_classes')
      .select('id, title, scheduled_at, duration_minutes, current_students')
      .eq('teacher_id', teacherId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString())
      .order('scheduled_at', { ascending: true });

    // Get upcoming classes (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: upcomingClasses } = await supabase
      .from('live_classes')
      .select('id, title, scheduled_at, duration_minutes, current_students')
      .eq('teacher_id', teacherId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', tomorrow.toISOString())
      .lt('scheduled_at', nextWeek.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10);

    // Get total students stats
    const studentIds = studentCount > 0
      ? (await supabase
          .from('student_school_relations')
          .select('student_id')
          .in('class_id', classIds)
          .eq('status', 'active'))
          .data?.map((r) => r.student_id) || []
      : [];

    let avgLevel = 0;
    let totalXp = 0;
    let activeStreaks = 0;

    if (studentIds.length > 0) {
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('current_level, total_xp, current_streak_days')
        .in('user_id', studentIds);

      if (progressData && progressData.length > 0) {
        avgLevel = Math.round(progressData.reduce((sum, p) => sum + p.current_level, 0) / progressData.length * 10) / 10;
        totalXp = progressData.reduce((sum, p) => sum + p.total_xp, 0);
        activeStreaks = progressData.filter((p) => p.current_streak_days > 0).length;
      }
    }

    res.json({
      stats: {
        total_students: studentCount || 0,
        total_classes: classes?.length || 0,
        classes_today: todayClasses?.length || 0,
        upcoming_sessions: upcomingClasses?.length || 0,
        avg_student_level: avgLevel,
        total_platform_xp: totalXp,
        students_with_active_streak: activeStreaks,
      },
      today_schedule: todayClasses || [],
      upcoming_classes: upcomingClasses || [],
      classes: classes || [],
    });
  } catch (err) {
    console.error('Error fetching teacher dashboard stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
