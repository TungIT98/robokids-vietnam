/**
 * Parent Engagement API Routes
 * RoboKids Vietnam - Automated parent communications
 *
 * Endpoints:
 * - POST /api/engagement/weekly-report - Generate weekly progress report
 * - POST /api/engagement/monthly-insights - Generate monthly insights
 * - POST /api/engagement/process-triggers - Process engagement triggers
 * - POST /api/engagement/trigger - Trigger specific engagement event
 */

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  generateWeeklyProgressReport,
  generateMonthlyInsights,
  processEngagementTriggers,
  EngagementType,
} from '../services/parentEngagement.js';

const router = express.Router();

/**
 * POST /api/engagement/weekly-report
 * Generate weekly progress report for a student
 */
router.post('/weekly-report', authenticate, async (req, res) => {
  try {
    const { student_id, student_name } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'student_id required' });
    }

    // Get student's parent
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('profile_id, full_name, parents(parent_id)')
      .eq('profile_id', student_id)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const parentId = student.parents?.parent_id;
    const name = student_name || student.full_name;

    const report = await generateWeeklyProgressReport(student_id, name, parentId);

    res.json({
      success: true,
      report,
    });
  } catch (err) {
    console.error('[ParentEngagement] Weekly report error:', err);
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

/**
 * POST /api/engagement/monthly-insights
 * Generate monthly insights summary
 */
router.post('/monthly-insights', authenticate, async (req, res) => {
  try {
    const { student_id, student_name } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'student_id required' });
    }

    // Get student's parent
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('profile_id, full_name, parents(parent_id)')
      .eq('profile_id', student_id)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const parentId = student.parents?.parent_id;
    const name = student_name || student.full_name;

    const insights = await generateMonthlyInsights(student_id, name, parentId);

    res.json({
      success: true,
      insights,
    });
  } catch (err) {
    console.error('[ParentEngagement] Monthly insights error:', err);
    res.status(500).json({ error: 'Failed to generate monthly insights' });
  }
});

/**
 * POST /api/engagement/process-triggers
 * Process engagement triggers for all students
 * Called by cron job or Pipedream
 */
router.post('/process-triggers', async (req, res) => {
  try {
    // Optional: Verify Pipedream secret
    const { pipedream_secret } = req.headers;
    if (process.env.PIPEDREAM_SECRET && pipedream_secret !== process.env.PIPEDREAM_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = await processEngagementTriggers();

    res.json({
      success: true,
      results,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ParentEngagement] Process triggers error:', err);
    res.status(500).json({ error: 'Failed to process engagement triggers' });
  }
});

/**
 * POST /api/engagement/trigger
 * Trigger specific engagement event
 */
router.post('/trigger', authenticate, async (req, res) => {
  try {
    const { engagement_type, student_id, parent_id, data } = req.body;

    if (!engagement_type || !student_id) {
      return res.status(400).json({ error: 'engagement_type and student_id required' });
    }

    // Get student info if not provided
    let studentName = data?.student_name;
    let parentId = parent_id;

    if (!studentName || !parentId) {
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('full_name, parents(parent_id)')
        .eq('profile_id', student_id)
        .single();

      if (student) {
        studentName = studentName || student.full_name;
        parentId = parentId || student.parents?.parent_id;
      }
    }

    // Create notification based on engagement type
    const notificationContent = getEngagementNotification(engagement_type, studentName, data);

    if (parentId && notificationContent) {
      await supabaseAdmin
        .from('parent_notifications')
        .insert({
          parent_id: parentId,
          notification_type: engagement_type,
          title: notificationContent.title,
          body: notificationContent.body,
          data: { student_id, student_name: studentName, type: engagement_type, ...data },
        });

      return res.json({
        success: true,
        message: 'Engagement notification triggered',
        notification: notificationContent,
      });
    }

    res.json({
      success: false,
      message: 'Parent not found or invalid engagement type',
    });
  } catch (err) {
    console.error('[ParentEngagement] Trigger error:', err);
    res.status(500).json({ error: 'Failed to trigger engagement' });
  }
});

/**
 * Get notification content for engagement type
 */
function getEngagementNotification(engagementType, studentName, data) {
  const notifications = {
    [EngagementType.STREAK_WARNING]: {
      title: `⚠️ ${studentName} cần duy trì streak!`,
      body: `Con đã ${data?.daysInactive || 0} ngày chưa học bài. Hãy khuyến khích con tiếp tục học!`,
    },
    [EngagementType.MILESTONE_REACHED]: {
      title: `🎉 ${studentName} đạt thành tích mới!`,
      body: data?.milestoneType === 'streak'
        ? `Wow! Con đã đạt streak ${data?.value} ngày. Thật là tuyệt vời!`
        : `Chúc mừng con đã đạt level ${data?.value || 'mới'}!`,
    },
    [EngagementType.ACHIEVEMENT]: {
      title: `🏆 ${studentName} đạt huy hiệu mới!`,
      body: `Con đã đạt được huy hiệu "${data?.badgeName || 'mới'}"! Hãy tiếp tục phấn đấu nhé!`,
    },
    [EngagementType.CLASS_REMINDER]: {
      title: `📅 Nhắc nhở lịch học`,
      body: `Lịch học của con "${studentName}" vào ngày mai. Hãy chuẩn bị để tham gia đúng giờ!`,
    },
  };

  return notifications[engagementType];
}

/**
 * GET /api/engagement/notifications/:parentId
 * Get engagement notifications for a parent
 */
router.get('/notifications/:parentId', authenticate, async (req, res) => {
  try {
    const { parentId } = req.params;
    const { limit = 20, unread_only } = req.query;

    let query = supabaseAdmin
      .from('parent_notifications')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (unread_only === 'true') {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      notifications: data,
      count: data?.length || 0,
    });
  } catch (err) {
    console.error('[ParentEngagement] Notifications error:', err);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

export default router;
