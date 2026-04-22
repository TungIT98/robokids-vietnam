/**
 * Parent Mobile API routes for RoboKids Vietnam
 * Endpoints for parent mobile app features
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Verify parent has access to child student
 * Returns parent relation if valid, null otherwise
 */
async function verifyParentChildAccess(parentProfileId, childStudentId) {
  // Get parent record
  const { data: parent } = await supabase
    .from('parents')
    .select('id')
    .eq('profile_id', parentProfileId)
    .single();

  if (!parent) return null;

  // Check relation
  const { data: relation } = await supabase
    .from('student_parent_relations')
    .select('id, relationship, is_primary')
    .eq('student_id', childStudentId)
    .eq('parent_id', parent.id)
    .single();

  return relation;
}

/**
 * GET /api/parent/:childId/progress
 * Get comprehensive progress for a specific child student
 * Accessible by parent linked to child, or admin/teacher
 */
router.get('/:childId/progress', authenticate, async (req, res) => {
  try {
    const { childId } = req.params;
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
      .eq('id', childId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Authorization check
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', requestingUserId)
      .single();

    const parentRelation = await verifyParentChildAccess(requestingUserId, childId);
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
      .eq('student_id', childId);

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
 * GET /api/parent/:childId/schedule
 * Get lesson schedule for a specific child student
 * Accessible by parent linked to child, or admin/teacher
 */
router.get('/:childId/schedule', authenticate, async (req, res) => {
  try {
    const { childId } = req.params;
    const { start_date, end_date } = req.query;
    const requestingUserId = req.user.id;

    // Verify student exists
    const { data: student } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', childId)
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

    const parentRelation = await verifyParentChildAccess(requestingUserId, childId);
    const isParent = !!parentRelation;
    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';
    const isOwnProfile = student.profile_id === requestingUserId;

    if (!isParent && !isAdminOrTeacher && !isOwnProfile) {
      return res.status(403).json({ error: 'Not authorized to view this student\'s schedule' });
    }

    // Get enrollments for the student
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        id,
        course_id,
        enrolled_at,
        status,
        courses (
          id,
          title,
          description
        )
      `)
      .eq('student_id', childId)
      .eq('status', 'active');

    if (!enrollments || enrollments.length === 0) {
      return res.json({
        studentId: childId,
        schedule: [],
        message: 'No active enrollments'
      });
    }

    // Get scheduled lessons from lesson_schedules table
    const enrollmentIds = enrollments.map(e => e.id);

    let scheduleQuery = supabase
      .from('lesson_schedules')
      .select(`
        id,
        enrollment_id,
        scheduled_date,
        start_time,
        end_time,
        status,
        location,
        teacher_id,
        lessons (
          id,
          title,
          title_vi,
          title_en,
          estimated_minutes
        ),
        teachers (
          id,
          profile_id,
          profiles (
            id,
            full_name
          )
        )
      `)
      .in('enrollment_id', enrollmentIds)
      .order('scheduled_date', { ascending: true });

    // Filter by date range if provided
    if (start_date) {
      scheduleQuery = scheduleQuery.gte('scheduled_date', start_date);
    }
    if (end_date) {
      scheduleQuery = scheduleQuery.lte('scheduled_date', end_date);
    }

    const { data: schedules, error: scheduleError } = await scheduleQuery;

    if (scheduleError) {
      console.error('Error fetching schedule:', scheduleError);
      return res.status(500).json({ error: 'Failed to fetch schedule' });
    }

    // Format response with course info
    const enrollmentMap = {};
    for (const e of enrollments) {
      enrollmentMap[e.id] = e;
    }

    res.json({
      studentId: childId,
      studentName: student.profiles?.full_name || null,
      schedule: (schedules || []).map(s => ({
        id: s.id,
        enrollmentId: s.enrollment_id,
        scheduledDate: s.scheduled_date,
        startTime: s.start_time,
        endTime: s.end_time,
        status: s.status,
        location: s.location,
        lessonId: s.lessons?.id,
        lessonTitle: s.lessons?.title_vi || s.lessons?.title || null,
        lessonTitleEn: s.lessons?.title_en || null,
        estimatedMinutes: s.lessons?.estimated_minutes || 45,
        courseId: enrollmentMap[s.enrollment_id]?.course_id,
        courseName: enrollmentMap[s.enrollment_id]?.courses?.title || null,
        teacherId: s.teacher_id,
        teacherName: s.teachers?.profiles?.full_name || null
      }))
    });
  } catch (err) {
    console.error('Error fetching student schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/parent/:childId/payments
 * Get payment history for a specific child student's enrollments
 * Accessible by parent linked to child, or admin/teacher
 */
router.get('/:childId/payments', authenticate, async (req, res) => {
  try {
    const { childId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const requestingUserId = req.user.id;

    // Verify student exists
    const { data: student } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', childId)
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

    const parentRelation = await verifyParentChildAccess(requestingUserId, childId);
    const isParent = !!parentRelation;
    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';
    const isOwnProfile = student.profile_id === requestingUserId;

    if (!isParent && !isAdminOrTeacher && !isOwnProfile) {
      return res.status(403).json({ error: 'Not authorized to view this student\'s payments' });
    }

    // Get enrollments for the student
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id, course_id, courses(title)')
      .eq('student_id', childId);

    const enrollmentIds = (enrollments || []).map(e => e.id);

    if (enrollmentIds.length === 0) {
      return res.json({
        studentId: childId,
        payments: [],
        totalAmount: 0,
        count: 0
      });
    }

    // Get payments for these enrollments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        currency,
        payment_method,
        status,
        paid_at,
        created_at,
        provider_transaction_id,
        provider_message
      `)
      .in('enrollment_id', enrollmentIds)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }

    // Get enrollment info for each payment
    const enrollmentMap = {};
    for (const e of enrollments) {
      enrollmentMap[e.id] = e;
    }

    // Calculate totals
    const totalAmount = (payments || [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({
      studentId: childId,
      payments: (payments || []).map(p => ({
        id: p.id,
        enrollmentId: p.enrollment_id,
        courseName: enrollmentMap[p.enrollment_id]?.courses?.title || null,
        amount: p.amount,
        currency: p.currency || 'VND',
        paymentMethod: p.payment_method,
        status: p.status,
        paidAt: p.paid_at,
        createdAt: p.created_at,
        transactionId: p.provider_transaction_id,
        message: p.provider_message
      })),
      totalAmount,
      count: payments?.length || 0
    });
  } catch (err) {
    console.error('Error fetching student payments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/parent/teacher-message
 * Send a message to a teacher (from parent)
 * Body: { child_id, teacher_id, message, type }
 */
router.post('/teacher-message', authenticate, async (req, res) => {
  try {
    const { child_id, teacher_id, message, type = 'general' } = req.body;
    const senderUserId = req.user.id;

    if (!child_id || !teacher_id || !message) {
      return res.status(400).json({
        error: 'Missing required fields: child_id, teacher_id, message'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: 'Message too long (max 2000 characters)'
      });
    }

    // Verify child student exists and parent has access
    const { data: student } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', child_id)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Authorization: must be parent of this student
    const parentRelation = await verifyParentChildAccess(senderUserId, child_id);

    if (!parentRelation) {
      return res.status(403).json({
        error: 'Not authorized to send messages for this student'
      });
    }

    // Verify teacher exists
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, profile_id')
      .eq('id', teacher_id)
      .single();

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Create the message
    const { data: newMessage, error: messageError } = await supabase
      .from('parent_teacher_messages')
      .insert({
        parent_id: parentRelation.parent_id,
        student_id: child_id,
        teacher_id: teacher_id,
        message: message,
        message_type: type,
        sent_by: senderUserId,
        status: 'sent'
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error sending message:', messageError);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    // TODO: Optionally send push notification to teacher via FCM

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: newMessage.id,
        childId: child_id,
        teacherId: teacher_id,
        message: newMessage.message,
        type: newMessage.message_type,
        sentAt: newMessage.created_at
      }
    });
  } catch (err) {
    console.error('Error sending teacher message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/parent/:childId/messages
 * Get message history between parent and teachers for a child
 * Accessible by parent linked to child, or admin/teacher
 */
router.get('/:childId/messages', authenticate, async (req, res) => {
  try {
    const { childId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const requestingUserId = req.user.id;

    // Verify student exists
    const { data: student } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('id', childId)
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

    const parentRelation = await verifyParentChildAccess(requestingUserId, childId);
    const isParent = !!parentRelation;
    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';
    const isOwnProfile = student.profile_id === requestingUserId;

    if (!isParent && !isAdminOrTeacher && !isOwnProfile) {
      return res.status(403).json({ error: 'Not authorized to view messages' });
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('parent_teacher_messages')
      .select(`
        id,
        message,
        message_type,
        status,
        created_at,
        parent_id,
        teacher_id,
        parent_profile:parent_id (
          id,
          full_name
        ),
        teacher_profile:teacher_id (
          id,
          full_name
        )
      `)
      .eq('student_id', childId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({
      studentId: childId,
      messages: (messages || []).map(m => ({
        id: m.id,
        message: m.message,
        type: m.message_type,
        status: m.status,
        sentAt: m.created_at,
        senderName: m.parent_profile?.full_name || m.teacher_profile?.full_name || null,
        senderType: m.parent_profile ? 'parent' : 'teacher'
      })),
      count: messages?.length || 0
    });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;