/**
 * Parent Notifications API routes for RoboKids Vietnam
 * Endpoints for parent-facing push notification infrastructure
 */

import express from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { sendNotification, sendClassReminder, sendWeeklyProgress, sendBadgeEarned } from '../services/notifications.js';

const router = express.Router();

const VALID_NOTIFICATION_TYPES = ['class_reminder', 'progress_update', 'enrollment_change', 'ai_recommendation', 'badge_earned', 'level_up', 'mission_complete'];

/**
 * Verify parent has access to a student
 * Returns parent relation if valid, null otherwise
 */
async function verifyParentChildAccess(parentProfileId, childStudentId) {
  const { data: parent } = await supabase
    .from('parents')
    .select('id')
    .eq('profile_id', parentProfileId)
    .single();

  if (!parent) return null;

  const { data: relation } = await supabase
    .from('student_parent_relations')
    .select('id, relationship, is_primary')
    .eq('student_id', childStudentId)
    .eq('parent_id', parent.id)
    .single();

  return relation;
}

/**
 * Get parent record for a profile
 */
async function getParentForProfile(profileId) {
  const { data: parent } = await supabase
    .from('parents')
    .select('id')
    .eq('profile_id', profileId)
    .single();
  return parent;
}

/**
 * GET /api/parent-notifications
 * List notifications for the authenticated parent
 * Query params: limit (default 20), offset (default 0), unread_only (default false)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const { limit = 20, offset = 0, unread_only = false } = req.query;

    // Get parent record for this user
    const parent = await getParentForProfile(requestingUserId);

    if (!parent) {
      return res.status(403).json({ error: 'No parent account found for this user' });
    }

    // Build query for notifications
    let query = supabase
      .from('parent_notifications')
      .select(`
        id,
        student_id,
        notification_type,
        title,
        body,
        data,
        is_read,
        read_at,
        created_at,
        students (
          id,
          profiles (
            id,
            full_name
          )
        )
      `)
      .eq('parent_id', parent.id)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (unread_only === 'true' || unread_only === true) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    // Get total count (unread)
    const { count: unreadCount } = await supabase
      .from('parent_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', parent.id)
      .eq('is_read', false);

    // Get total count (all)
    const { count: totalCount } = await supabase
      .from('parent_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', parent.id);

    res.json({
      notifications: (notifications || []).map(n => ({
        id: n.id,
        studentId: n.student_id,
        studentName: n.students?.profiles?.full_name || null,
        type: n.notification_type,
        title: n.title,
        body: n.body,
        data: n.data || {},
        isRead: n.is_read,
        readAt: n.read_at,
        createdAt: n.created_at
      })),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalCount || 0,
        unreadCount: unreadCount || 0
      }
    });
  } catch (err) {
    console.error('Error listing notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/parent-notifications
 * Create a new notification (internal/admin use)
 * Body: { parent_id, student_id?, notification_type, title, body, data? }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const { parent_id, student_id, notification_type, title, body, data = {} } = req.body;

    // Validate required fields
    if (!parent_id || !notification_type || !title || !body) {
      return res.status(400).json({
        error: 'Missing required fields: parent_id, notification_type, title, body'
      });
    }

    // Validate notification type
    if (!VALID_NOTIFICATION_TYPES.includes(notification_type)) {
      return res.status(400).json({
        error: `Invalid notification_type. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`
      });
    }

    // Verify the requester is admin/teacher or the notification is for their linked student
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', requestingUserId)
      .single();

    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';

    // If not admin/teacher, verify they have access to the parent_id
    if (!isAdminOrTeacher) {
      const parent = await getParentForProfile(requestingUserId);
      if (!parent || parent.id !== parent_id) {
        return res.status(403).json({ error: 'Not authorized to create notifications for this parent' });
      }
    }

    // Verify parent exists
    const { data: parentExists, error: parentError } = await supabase
      .from('parents')
      .select('id')
      .eq('id', parent_id)
      .single();

    if (parentError || !parentExists) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Verify student exists if provided
    if (student_id) {
      const { data: studentExists } = await supabase
        .from('students')
        .select('id')
        .eq('id', student_id)
        .single();

      if (!studentExists) {
        return res.status(404).json({ error: 'Student not found' });
      }
    }

    // Create the notification
    const { data: notification, error: createError } = await supabase
      .from('parent_notifications')
      .insert({
        parent_id,
        student_id: student_id || null,
        notification_type,
        title,
        body,
        data
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating notification:', createError);
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    // TODO: Send push notification via FCM if device tokens exist

    res.status(201).json({
      success: true,
      notification: {
        id: notification.id,
        parentId: notification.parent_id,
        studentId: notification.student_id,
        type: notification.notification_type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        isRead: notification.is_read,
        createdAt: notification.created_at
      }
    });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/parent-notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    // Get parent record for this user
    const parent = await getParentForProfile(requestingUserId);

    if (!parent) {
      return res.status(403).json({ error: 'No parent account found for this user' });
    }

    // Verify the notification exists and belongs to this parent
    const { data: notification, error: notifError } = await supabase
      .from('parent_notifications')
      .select('id, parent_id, is_read')
      .eq('id', id)
      .single();

    if (notifError || !notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.parent_id !== parent.id) {
      return res.status(403).json({ error: 'Not authorized to update this notification' });
    }

    // Mark as read
    const { data: updated, error: updateError } = await supabase
      .from('parent_notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error marking notification as read:', updateError);
      return res.status(500).json({ error: 'Failed to update notification' });
    }

    res.json({
      success: true,
      notification: {
        id: updated.id,
        isRead: updated.is_read,
        readAt: updated.read_at
      }
    });
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/parent-notifications/mark-all-read
 * Mark all notifications as read for the authenticated parent
 */
router.post('/mark-all-read', authenticate, async (req, res) => {
  try {
    const requestingUserId = req.user.id;

    // Get parent record for this user
    const parent = await getParentForProfile(requestingUserId);

    if (!parent) {
      return res.status(403).json({ error: 'No parent account found for this user' });
    }

    // Mark all unread as read
    const { error: updateError } = await supabase
      .from('parent_notifications')
      .update({ is_read: true })
      .eq('parent_id', parent.id)
      .eq('is_read', false);

    if (updateError) {
      console.error('Error marking all notifications as read:', updateError);
      return res.status(500).json({ error: 'Failed to update notifications' });
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/parent-notifications/:id
 * Delete a notification (soft delete by marking read, or hard delete for admin)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    // Get parent record for this user
    const parent = await getParentForProfile(requestingUserId);

    if (!parent) {
      // Check if admin
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', requestingUserId)
        .single();

      const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';

      if (!isAdminOrTeacher) {
        return res.status(403).json({ error: 'No parent account found for this user' });
      }

      // Admin can delete any notification
      const { error: deleteError } = await supabase
        .from('parent_notifications')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting notification:', deleteError);
        return res.status(500).json({ error: 'Failed to delete notification' });
      }

      return res.json({ success: true, message: 'Notification deleted' });
    }

    // Verify the notification belongs to this parent
    const { data: notification } = await supabase
      .from('parent_notifications')
      .select('id, parent_id')
      .eq('id', id)
      .single();

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.parent_id !== parent.id) {
      return res.status(403).json({ error: 'Not authorized to delete this notification' });
    }

    const { error: deleteError } = await supabase
      .from('parent_notifications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting notification:', deleteError);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/parent-notifications/class-reminder
 * Trigger class reminder notifications for a lesson schedule
 * Internal endpoint for scheduled jobs/cron
 * Body: { lesson_schedule_id } or { enrollment_id, lesson_id, scheduled_date }
 */
router.post('/class-reminder', authenticate, async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const { lesson_schedule_id, enrollment_id, lesson_id, scheduled_date } = req.body;

    // Verify admin/teacher
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', requestingUserId)
      .single();

    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';

    if (!isAdminOrTeacher) {
      return res.status(403).json({ error: 'Not authorized to send class reminders' });
    }

    // Get lesson schedule info
    let scheduleInfo;
    if (lesson_schedule_id) {
      const { data: schedule } = await supabase
        .from('lesson_schedules')
        .select(`
          id,
          enrollment_id,
          scheduled_date,
          start_time,
          lessons (
            id,
            title,
            title_vi,
            title_en
          ),
          teachers (
            id,
            profiles (
              full_name
            )
          )
        `)
        .eq('id', lesson_schedule_id)
        .single();

      if (!schedule) {
        return res.status(404).json({ error: 'Lesson schedule not found' });
      }
      scheduleInfo = schedule;
    } else if (enrollment_id && lesson_id) {
      // Query by enrollment_id and lesson_id
      const { data: schedule } = await supabase
        .from('lesson_schedules')
        .select(`
          id,
          enrollment_id,
          scheduled_date,
          start_time,
          lessons (
            id,
            title,
            title_vi,
            title_en
          ),
          teachers (
            id,
            profiles (
              full_name
            )
          )
        `)
        .eq('enrollment_id', enrollment_id)
        .eq('lesson_id', lesson_id)
        .single();

      if (!schedule) {
        return res.status(404).json({ error: 'Lesson schedule not found' });
      }
      scheduleInfo = schedule;
    } else {
      return res.status(400).json({
        error: 'Missing required fields: lesson_schedule_id OR (enrollment_id and lesson_id)'
      });
    }

    // Get enrollment with student info
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        students (
          id,
          profiles (
            full_name
          )
        )
      `)
      .eq('id', scheduleInfo.enrollment_id)
      .single();

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Get parent(s) linked to this student
    const { data: parentRelations } = await supabase
      .from('student_parent_relations')
      .select(`
        id,
        parent_id,
        parents (
          id,
          profile_id
        )
      `)
      .eq('student_id', enrollment.student_id);

    if (!parentRelations || parentRelations.length === 0) {
      return res.json({
        success: true,
        message: 'No parents linked to student for this enrollment',
        notificationsSent: 0
      });
    }

    const lessonTitle = scheduleInfo.lessons?.title_vi || scheduleInfo.lessons?.title || 'RoboKids class';
    const teacherName = scheduleInfo.teachers?.profiles?.full_name || 'your teacher';
    const scheduledDateStr = new Date(scheduleInfo.scheduled_date).toLocaleDateString('vi-VN');
    const startTime = scheduleInfo.start_time?.substring(0, 5) || '';
    const scheduledDateTime = `${scheduledDateStr} at ${startTime}`;
    const studentName = enrollment.students?.profiles?.full_name || 'Student';

    // Create notifications for all linked parents
    const notificationsToInsert = parentRelations.map(relation => ({
      parent_id: relation.parent_id,
      student_id: enrollment.student_id,
      notification_type: 'class_reminder',
      title: `📅 Class Reminder: ${lessonTitle}`,
      body: `Reminder: ${lessonTitle} tomorrow (${scheduledDateStr} at ${startTime}) with ${teacherName}. Don't forget to prepare!`,
      data: {
        lesson_schedule_id: scheduleInfo.id,
        lesson_id: scheduleInfo.lessons?.id,
        enrollment_id: enrollment.id,
        student_id: enrollment.student_id,
        student_name: studentName,
        scheduled_date: scheduleInfo.scheduled_date,
        start_time: scheduleInfo.start_time
      }
    }));

    const { error: insertError } = await supabaseAdmin
      .from('parent_notifications')
      .insert(notificationsToInsert);

    if (insertError) {
      console.error('Error sending class reminders:', insertError);
      return res.status(500).json({ error: 'Failed to send class reminders' });
    }

    // Send real-time notifications via SMS, Push, and Zalo
    const notificationResults = [];
    for (const relation of parentRelations) {
      const parent = relation.parents;
      if (!parent) continue;

      const recipient = {
        email: parent.profile_id, // Will need to fetch email from profiles
        phone: parent.phone,
        zaloId: parent.zalo_id,
      };

      // Get parent email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', parent.profile_id)
        .single();

      if (profile?.email) {
        recipient.email = profile.email;
      }

      try {
        const result = await sendClassReminder({
          studentName,
          lessonTitle,
          dateTime: scheduledDateTime,
          teacherName,
          recipient,
        });
        notificationResults.push({ parentId: relation.parent_id, ...result });
      } catch (err) {
        console.error('Error sending real-time notification:', err);
      }
    }

    res.json({
      success: true,
      message: `Class reminder sent to ${notificationsToInsert.length} parent(s)`,
      notificationsSent: notificationsToInsert.length,
      realTimeNotifications: notificationResults,
      lessonTitle,
      scheduledDate: scheduleInfo.scheduled_date
    });
  } catch (err) {
    console.error('Error sending class reminder:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/parent-notifications/achievement
 * Send achievement notification to parents of a student
 * Body: { student_id, badge_name, badge_icon? }
 */
router.post('/achievement', authenticate, async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const { student_id, badge_name, badge_icon } = req.body;

    // Verify admin/teacher
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', requestingUserId)
      .single();

    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';

    if (!isAdminOrTeacher) {
      return res.status(403).json({ error: 'Not authorized to send achievement notifications' });
    }

    if (!student_id || !badge_name) {
      return res.status(400).json({ error: 'Missing required fields: student_id, badge_name' });
    }

    // Get student info
    const { data: student } = await supabase
      .from('students')
      .select(`
        id,
        profiles (
          full_name
        )
      `)
      .eq('id', student_id)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentName = student.profiles?.full_name || 'Student';

    // Get parent relations
    const { data: parentRelations } = await supabase
      .from('student_parent_relations')
      .select(`
        id,
        parent_id,
        parents (
          id,
          profile_id,
          phone,
          zalo_id
        )
      `)
      .eq('student_id', student_id);

    // Create in-app notifications
    const notificationsToInsert = (parentRelations || []).map(relation => ({
      parent_id: relation.parent_id,
      student_id: student_id,
      notification_type: 'badge_earned',
      title: `🏆 Badge Earned: ${badge_name}`,
      body: `Congratulations! ${studentName} earned the "${badge_name}" badge!`,
      data: {
        student_id,
        student_name: studentName,
        badge_name,
        badge_icon,
      }
    }));

    if (notificationsToInsert.length > 0) {
      await supabaseAdmin
        .from('parent_notifications')
        .insert(notificationsToInsert);
    }

    // Send real-time notifications
    const notificationResults = [];
    for (const relation of parentRelations || []) {
      const parent = relation.parents;
      if (!parent) continue;

      // Get parent email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', parent.profile_id)
        .single();

      const recipient = {
        email: profile?.email,
        phone: parent.phone,
        zaloId: parent.zalo_id,
        userId: requestingUserId, // For push to student's device
      };

      try {
        const result = await sendBadgeEarned({
          studentName,
          badgeName: badge_name,
          recipient,
        });
        notificationResults.push({ parentId: relation.parent_id, ...result });
      } catch (err) {
        console.error('Error sending achievement notification:', err);
      }
    }

    res.json({
      success: true,
      message: `Achievement notification sent to ${notificationResults.length} parent(s)`,
      notificationsCreated: notificationsToInsert.length,
      realTimeNotifications: notificationResults,
      studentName,
      badgeName: badge_name,
    });
  } catch (err) {
    console.error('Error sending achievement notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/parent-notifications/send
 * Generic notification sender
 * Body: { channel: 'email'|'sms'|'push'|'zalo'|'all', student_id?, parent_id?, type, data }
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const requestingUserId = req.user.id;
    const { channel, student_id, parent_id, type, data } = req.body;

    // Verify admin/teacher
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', requestingUserId)
      .single();

    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';

    if (!isAdminOrTeacher) {
      return res.status(403).json({ error: 'Not authorized to send notifications' });
    }

    if (!channel || !type || !data) {
      return res.status(400).json({ error: 'Missing required fields: channel, type, data' });
    }

    if (!student_id && !parent_id) {
      return res.status(400).json({ error: 'Must provide either student_id or parent_id' });
    }

    let recipient = {};

    if (parent_id) {
      // Get parent info directly
      const { data: parent } = await supabase
        .from('parents')
        .select('profile_id, phone, zalo_id')
        .eq('id', parent_id)
        .single();

      if (parent) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', parent.profile_id)
          .single();

        recipient = {
          email: profile?.email,
          phone: parent.phone,
          zaloId: parent.zalo_id,
        };
      }
    } else if (student_id) {
      // Get parent info via student
      const { data: relations } = await supabase
        .from('student_parent_relations')
        .select(`
          parent_id,
          parents (
            profile_id,
            phone,
            zalo_id
          )
        `)
        .eq('student_id', student_id);

      if (relations && relations.length > 0) {
        const parent = relations[0].parents;
        if (parent) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', parent.profile_id)
            .single();

          recipient = {
            email: profile?.email,
            phone: parent.phone,
            zaloId: parent.zalo_id,
          };
        }
      }
    }

    const result = await sendNotification({
      channel,
      recipient,
      type,
      data,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Error sending notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;