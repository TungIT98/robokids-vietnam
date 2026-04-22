/**
 * Parent-facing Student Progress API for RoboKids Vietnam
 * GET /api/students/:id/progress - parent/teacher view of student progress
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/students/:id/progress
 * Get comprehensive progress for a specific student
 * Accessible by parent linked to student, or admin/teacher
 */
router.get('/:id/progress', authenticate, async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const requestingUserId = req.user.id;

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
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
      `)
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Authorization: must be parent of this student OR admin/teacher
    // First get parent's id from their profile_id
    const { data: parentRecord } = await supabase
      .from('parents')
      .select('id')
      .eq('profile_id', requestingUserId)
      .single();

    const { data: parentRelation } = await supabase
      .from('student_parent_relations')
      .select('id')
      .eq('student_id', studentId)
      .eq('parent_id', parentRecord?.id)
      .single();

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', requestingUserId)
      .single();

    const isParent = !!parentRelation;
    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';
    const isOwnProfile = student.profile_id === requestingUserId;

    if (!isParent && !isAdminOrTeacher && !isOwnProfile) {
      return res.status(403).json({ error: 'Not authorized to view this student\'s progress' });
    }

    // Get user_progress (overall progress)
    const { data: userProgress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', student.profile_id)
      .single();

    // Get enrollments with course info
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        course_id,
        enrolled_at,
        completed_at,
        progress_percent,
        courses (
          id,
          title,
          description,
          difficulty,
          thumbnail_url
        )
      `)
      .eq('student_id', studentId);

    if (enrollmentsError) throw enrollmentsError;

    // Get lesson progress for all enrollments
    const enrollmentIds = (enrollments || []).map(e => e.id);

    let lessonProgress = [];
    if (enrollmentIds.length > 0) {
      const { data: lp, error: lpError } = await supabase
        .from('lesson_progress')
        .select(`
          id,
          enrollment_id,
          lesson_id,
          completed,
          completed_at,
          time_spent_seconds,
          lessons (
            id,
            title,
            order_index
          )
        `)
        .in('enrollment_id', enrollmentIds);

      if (!lpError) {
        lessonProgress = lp || [];
      }
    }

    // Get earned badges for this student
    const { data: earnedBadges, error: badgesError } = await supabase
      .from('earned_badges')
      .select(`
        id,
        earned_at,
        earned_context,
        badges (
          id,
          badge_key,
          name_vi,
          name_en,
          description_vi,
          description_en,
          badge_type,
          icon_url,
          color_hex,
          xp_reward
        )
      `)
      .eq('user_id', student.profile_id);

    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
    }

    // Calculate stats
    const totalLessonsCompleted = lessonProgress.filter(lp => lp.completed).length;
    const totalTimeSpentSeconds = lessonProgress.reduce((sum, lp) => sum + (lp.time_spent_seconds || 0), 0);
    const totalXp = userProgress?.total_xp || 0;
    const currentLevel = userProgress?.current_level || 1;
    const currentStreak = userProgress?.current_streak_days || 0;
    const coursesCompleted = enrollments?.filter(e => e.completed_at).length || 0;

    // Format response
    res.json({
      student: {
        id: student.id,
        name: student.profiles?.full_name || null,
        email: student.profiles?.email || null,
        avatarUrl: student.profiles?.avatar_url || null,
        gradeLevel: student.grade_level,
        schoolName: student.school_name
      },
      progress: {
        totalXp,
        currentLevel,
        levelTitle: userProgress?.level_title || 'Beginner',
        currentStreakDays: currentStreak,
        longestStreakDays: userProgress?.longest_streak_days || 0,
        lessonsCompleted: totalLessonsCompleted,
        coursesCompleted,
        totalTimeSpentSeconds,
        joinedAt: userProgress?.created_at || null
      },
      enrollments: (enrollments || []).map(e => ({
        id: e.id,
        courseId: e.course_id,
        courseName: e.courses?.title || null,
        courseDescription: e.courses?.description || null,
        courseDifficulty: e.courses?.difficulty || null,
        courseThumbnail: e.courses?.thumbnail_url || null,
        enrolledAt: e.enrolled_at,
        completedAt: e.completed_at,
        progressPercent: e.progress_percent || 0,
        lessonsCompleted: lessonProgress.filter(lp => lp.enrollment_id === e.id && lp.completed).length,
        totalTimeSpentSeconds: lessonProgress
          .filter(lp => lp.enrollment_id === e.id)
          .reduce((sum, lp) => sum + (lp.time_spent_seconds || 0), 0)
      })),
      badges: (earnedBadges || []).map(eb => ({
        id: eb.badges?.id || null,
        badgeKey: eb.badges?.badge_key || null,
        name: eb.badges?.name_en || eb.badges?.name_vi || null,
        nameVi: eb.badges?.name_vi || null,
        nameEn: eb.badges?.name_en || null,
        description: eb.badges?.description_en || eb.badges?.description_vi || null,
        descriptionVi: eb.badges?.description_vi || null,
        descriptionEn: eb.badges?.description_en || null,
        badgeType: eb.badges?.badge_type || null,
        iconUrl: eb.badges?.icon_url || null,
        colorHex: eb.badges?.color_hex || null,
        xpReward: eb.badges?.xp_reward || 0,
        earnedAt: eb.earned_at,
        earnedContext: eb.earned_context || {}
      }))
    });
  } catch (err) {
    console.error('Error fetching student progress:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/students/:id/progress/lessons
 * Get lesson progress for a specific student (for parent dashboard)
 */
router.get('/:id/progress/lessons', authenticate, async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const requestingUserId = req.user.id;

    // Verify authorization (same as above)
    const { data: student } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', studentId)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const { data: parentRelation } = await supabase
      .from('student_parent_relations')
      .select('id')
      .eq('student_id', studentId)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', requestingUserId)
      .single();

    const isParent = !!parentRelation;
    const isAdminOrTeacher = profile?.role === 'admin' || profile?.role === 'teacher';
    const isOwnProfile = student.profile_id === requestingUserId;

    if (!isParent && !isAdminOrTeacher && !isOwnProfile) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id, course_id, courses(title)')
      .eq('student_id', studentId);

    const enrollmentIds = (enrollments || []).map(e => e.id);

    // Get lesson progress
    let lessonProgress = [];
    if (enrollmentIds.length > 0) {
      const { data: lp } = await supabase
        .from('lesson_progress')
        .select(`
          id,
          enrollment_id,
          lesson_id,
          completed,
          completed_at,
          time_spent_seconds,
          lessons (
            id,
            title,
            order_index,
            courses (
              id,
              title
            )
          )
        `)
        .in('enrollment_id', enrollmentIds);

      lessonProgress = lp || [];
    }

    res.json({
      studentId,
      lessons: lessonProgress.map(lp => ({
        id: lp.id,
        enrollmentId: lp.enrollment_id,
        lessonId: lp.lesson_id,
        lessonTitle: lp.lessons?.title || null,
        courseId: lp.lessons?.courses?.id || null,
        courseName: lp.lessons?.courses?.title || null,
        completed: lp.completed,
        completedAt: lp.completed_at,
        timeSpentSeconds: lp.time_spent_seconds || 0
      }))
    });
  } catch (err) {
    console.error('Error fetching lesson progress:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
