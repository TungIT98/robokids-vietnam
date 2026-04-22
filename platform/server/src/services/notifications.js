/**
 * Unified Notification Service for RoboKids Vietnam
 * Orchestrates multi-channel notifications: Email, SMS, Push (FCM), Zalo OA
 *
 * Usage:
 *   import { sendNotification } from './services/notifications.js';
 *   await sendNotification({
 *     channel: 'email', // 'email' | 'sms' | 'push' | 'zalo' | 'all'
 *     recipient: { email: 'parent@example.com', phone: '+84...', userId: '...', zaloId: '...' },
 *     type: 'class_reminder',
 *     data: { studentName, lessonTitle, dateTime, teacherName }
 *   });
 */

import { sendWelcomeEmail, sendWeeklyProgressEmail } from './email.js';
import { sendSMS, sendClassReminderSMS, sendEnrollmentConfirmationSMS, sendAchievementSMS } from './sms.js';
import {
  sendLessonReminder,
  sendBadgeEarnedNotification,
  sendMissionAvailableNotification,
  sendWeeklyProgressNotification,
  sendPushNotification,
} from './fcm.js';
import {
  sendClassReminderZalo,
  sendWeeklyProgressZalo,
  sendAchievementZalo,
  sendEnrollmentConfirmationZalo,
  sendPaymentConfirmationZalo,
  notifyStudentParentsZalo,
} from './zalo.js';

/**
 * Notification types and their templates
 */
const NOTIFICATION_TEMPLATES = {
  class_reminder: {
    email: {
      subject: '📅 Class Reminder - RoboKids Vietnam',
      body: (data) => `Reminder: ${data.studentName}'s class "${data.lessonTitle}" is scheduled for ${data.dateTime} with ${data.teacherName}.`,
    },
    sms: {
      template: 'class_reminder',
      body: (data) => `📚 RoboKids: ${data.studentName}'s class "${data.lessonTitle}" on ${data.dateTime}. Prepare and join on time!`,
    },
    push: {
      title: '📅 Class Reminder',
      body: (data) => `${data.studentName}'s class "${data.lessonTitle}" starts soon!`,
      data: { type: 'class_reminder' },
    },
    zalo: {
      template: 'robokids_class_reminder',
    },
  },

  weekly_progress: {
    email: {
      subject: '📊 Weekly Progress Report - RoboKids Vietnam',
    },
    sms: {
      template: 'progress',
      body: (data) => `📊 RoboKids: ${data.studentName} completed ${data.lessonsCompleted} lessons, earned ${data.xpEarned} XP this week! Level ${data.level} now!`,
    },
    push: {
      title: '📊 Weekly Progress',
      body: (data) => `${data.studentName} completed ${data.lessonsCompleted} lessons this week!`,
      data: { type: 'weekly_progress' },
    },
    zalo: {
      template: 'robokids_weekly_progress',
    },
  },

  badge_earned: {
    email: {
      subject: '🏆 New Badge Earned! - RoboKids Vietnam',
      body: (data) => `Congratulations! ${data.studentName} earned the "${data.badgeName}" badge!`,
    },
    sms: {
      template: 'achievement',
      body: (data) => `🏆 RoboKids: ${data.studentName} earned "${data.badgeName}" badge! Keep learning!`,
    },
    push: {
      title: '🏆 Badge Earned!',
      body: (data) => `${data.studentName} earned the "${data.badgeName}" badge!`,
      data: { type: 'badge_earned' },
    },
    zalo: {
      template: 'robokids_achievement',
    },
  },

  enrollment_confirmed: {
    email: {
      subject: '🎉 Enrollment Confirmed - RoboKids Vietnam',
      body: (data) => `Welcome ${data.studentName}! You are enrolled in ${data.className}. First class: ${data.startDate}. Let's start learning!`,
    },
    sms: {
      template: 'enrollment',
      body: (data) => `🎉 Welcome ${data.studentName}! Enrolled in ${data.className}. Login at robokids.vn to start!`,
    },
    push: {
      title: '🎉 Enrollment Confirmed',
      body: (data) => `${data.studentName} is now enrolled in ${data.className}!`,
      data: { type: 'enrollment_confirmed' },
    },
    zalo: {
      template: 'robokids_enrollment_confirm',
    },
  },

  payment_confirmed: {
    email: {
      subject: '💰 Payment Confirmed - RoboKids Vietnam',
      body: (data) => `Payment of ${data.amount} VND received for ${data.studentName}. Transaction: ${data.transactionId}.`,
    },
    sms: {
      template: 'payment',
      body: (data) => `💰 RoboKids: Payment of ${data.amount} VND confirmed for ${data.studentName}. Transaction: ${data.transactionId}.`,
    },
    push: {
      title: '💰 Payment Confirmed',
      body: (data) => `Payment of ${data.amount} VND received for ${data.studentName}`,
      data: { type: 'payment_confirmed' },
    },
    zalo: {
      template: 'robokids_payment_confirm',
    },
  },

  mission_available: {
    push: {
      title: '🚀 New Mission Available!',
      body: (data) => `${data.missionTitle} - Are you ready for the challenge?`,
      data: { type: 'mission_available' },
    },
    sms: {
      template: 'mission',
      body: (data) => `🚀 RoboKids: New mission "${data.missionTitle}" available! Complete it to earn XP!`,
    },
  },

  lesson_reminder: {
    push: {
      title: '📚 Time to learn!',
      body: (data) => `Continue with "${data.lessonTitle}" - your robot is waiting!`,
      data: { type: 'lesson_reminder' },
    },
  },

  welcome: {
    email: {
      subject: '🎉 Welcome to RoboKids Vietnam!',
      body: (data) => `Welcome ${data.studentName}! Your account is ready. Email: ${data.email}, Temp Password: ${data.tempPassword}. Login and change your password!`,
    },
  },
};

/**
 * Send notification via a specific channel
 */
async function sendViaChannel(channel, recipient, type, data) {
  const template = NOTIFICATION_TEMPLATES[type]?.[channel];

  if (!template) {
    return { channel, success: false, error: `No template for ${type}:${channel}` };
  }

  try {
    switch (channel) {
      case 'email':
        if (!recipient.email) return { channel, success: false, error: 'No email provided' };
        const emailResult = await sendWelcomeEmail({
          to: recipient.email,
          studentName: data.studentName,
          tempPassword: data.tempPassword,
          lessonsCompleted: data.lessonsCompleted,
          xpEarned: data.xpEarned,
          totalXp: data.totalXp,
          level: data.level,
          topBadges: data.topBadges,
        });
        return { channel, ...emailResult };

      case 'sms':
        if (!recipient.phone) return { channel, success: false, error: 'No phone provided' };
        const smsResult = await sendSMS(recipient.phone, template.body(data));
        return { channel, ...smsResult };

      case 'push':
        if (!recipient.userId) return { channel, success: false, error: 'No userId provided' };
        const pushResult = await sendPushNotification(recipient.userId, {
          title: template.title,
          body: template.body(data),
          data: { ...template.data, ...data },
        });
        return { channel, ...pushResult };

      case 'zalo':
        if (!recipient.zaloId) return { channel, success: false, error: 'No zaloId provided' };
        switch (type) {
          case 'class_reminder':
            return { channel, ...(await sendClassReminderZalo(recipient.zaloId, data.studentName, data.lessonTitle, data.dateTime, data.teacherName)) };
          case 'weekly_progress':
            return { channel, ...(await sendWeeklyProgressZalo(recipient.zaloId, data.studentName, data.lessonsCompleted, data.xpEarned, data.level)) };
          case 'badge_earned':
            return { channel, ...(await sendAchievementZalo(recipient.zaloId, data.studentName, data.badgeName)) };
          case 'enrollment_confirmed':
            return { channel, ...(await sendEnrollmentConfirmationZalo(recipient.zaloId, data.studentName, data.className, data.startDate)) };
          case 'payment_confirmed':
            return { channel, ...(await sendPaymentConfirmationZalo(recipient.zaloId, data.studentName, data.amount, data.paymentMethod, data.transactionId)) };
          default:
            return { channel, success: false, error: `No Zalo template for ${type}` };
        }

      default:
        return { channel, success: false, error: `Unknown channel: ${channel}` };
    }
  } catch (err) {
    console.error(`[NOTIFICATION] ${channel} failed:`, err.message);
    return { channel, success: false, error: err.message };
  }
}

/**
 * Send a notification
 * @param {Object} params
 * @param {string|string[]} params.channel - 'email' | 'sms' | 'push' | 'zalo' | 'all' (or array of channels)
 * @param {Object} params.recipient - { email?, phone?, userId?, zaloId? }
 * @param {string} params.type - Notification type (see NOTIFICATION_TEMPLATES)
 * @param {Object} params.data - Template data
 * @returns {Promise<{results: Array, summary: Object}>}
 */
export async function sendNotification({ channel, recipient, type, data }) {
  const channels = channel === 'all'
    ? ['email', 'sms', 'push', 'zalo']
    : Array.isArray(channel) ? channel : [channel];

  // Filter channels based on available recipient info
  const availableChannels = channels.filter(ch => {
    switch (ch) {
      case 'email': return !!recipient.email;
      case 'sms': return !!recipient.phone;
      case 'push': return !!recipient.userId;
      case 'zalo': return !!recipient.zaloId;
      default: return false;
    }
  });

  if (availableChannels.length === 0) {
    return {
      results: [],
      summary: { total: 0, successful: 0, failed: 0, error: 'No valid channel for recipient' },
    };
  }

  // Send to all available channels in parallel
  const results = await Promise.allSettled(
    availableChannels.map(ch => sendViaChannel(ch, recipient, type, data))
  );

  const summary = {
    total: availableChannels.length,
    successful: 0,
    failed: 0,
  };

  const processedResults = results.map((result, index) => {
    const channelName = availableChannels[index];
    if (result.status === 'fulfilled') {
      if (result.value.success) summary.successful++;
      else summary.failed++;
      return result.value;
    } else {
      summary.failed++;
      return { channel: channelName, success: false, error: result.reason.message };
    }
  });

  console.log(`[NOTIFICATION] ${type} to ${recipient.email || recipient.phone || recipient.zaloId}: ${summary.successful}/${summary.total} successful`);

  return { results: processedResults, summary };
}

/**
 * Send class reminder to all parent channels
 */
export async function sendClassReminder({ studentName, lessonTitle, dateTime, teacherName, recipient }) {
  return sendNotification({
    channel: 'all',
    recipient,
    type: 'class_reminder',
    data: { studentName, lessonTitle, dateTime, teacherName },
  });
}

/**
 * Send weekly progress to all parent channels
 */
export async function sendWeeklyProgress({ studentName, lessonsCompleted, xpEarned, totalXp, level, topBadges, recipient }) {
  // Email uses its own template format
  if (recipient.email) {
    await sendWeeklyProgressEmail({
      to: recipient.email,
      studentName,
      lessonsCompleted,
      xpEarned,
      totalXp,
      level,
      topBadges,
    });
  }

  // SMS notification
  if (recipient.phone) {
    await sendSMS(recipient.phone, `📊 RoboKids: ${studentName} completed ${lessonsCompleted} lessons, earned ${xpEarned} XP! Level ${level}. Check app for details!`);
  }

  // Push notification
  if (recipient.userId) {
    await sendWeeklyProgressNotification(recipient.userId, {
      studentName,
      lessonsCompleted,
      xpEarned,
      level,
    });
  }

  // Zalo notification
  if (recipient.zaloId) {
    await sendWeeklyProgressZalo(recipient.zaloId, studentName, lessonsCompleted, xpEarned, level);
  }

  return { success: true };
}

/**
 * Send badge earned notification
 */
export async function sendBadgeEarned({ studentName, badgeName, recipient }) {
  // Push notification
  if (recipient.userId) {
    await sendBadgeEarnedNotification(recipient.userId, badgeName);
  }

  // SMS notification
  if (recipient.phone) {
    await sendAchievementSMS(recipient.phone, studentName, badgeName);
  }

  // Zalo notification
  if (recipient.zaloId) {
    await sendAchievementZalo(recipient.zaloId, studentName, badgeName);
  }

  return { success: true };
}

/**
 * Send mission available notification
 */
export async function sendMissionAvailable({ missionTitle, userId }) {
  if (userId) {
    return await sendMissionAvailableNotification(userId, missionTitle);
  }
  return { success: false, error: 'No userId provided' };
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(userId) {
  return {
    email: true,
    sms: true,
    push: true,
    zalo: true,
  };
}

export default {
  sendNotification,
  sendClassReminder,
  sendWeeklyProgress,
  sendBadgeEarned,
  sendMissionAvailable,
  getNotificationPreferences,
};