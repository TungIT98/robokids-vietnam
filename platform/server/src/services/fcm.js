/**
 * FCM (Firebase Cloud Messaging) Service for RoboKids Vietnam
 * Handles push notification delivery to mobile devices
 */

import { supabase } from '../lib/supabase.js';

// Firebase Admin SDK - initialized lazily
let firebaseAdmin = null;

async function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;

  try {
    const { default: admin } = await import('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    firebaseAdmin = admin;
    return firebaseAdmin;
  } catch (err) {
    console.warn('Firebase Admin SDK not available:', err.message);
    return null;
  }
}

/**
 * Send push notification to a single FCM token
 */
export async function sendPushNotification(fcmToken, notification) {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    console.warn('FCM not available - notification not sent');
    return { success: false, error: 'FCM not configured' };
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'robokids_lessons',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
            'mutable-content': 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('FCM notification sent:', response);
    return { success: true, messageId: response };
  } catch (err) {
    console.error('FCM send error:', err);

    // Handle invalid token errors
    if (err.code === 'messaging/invalid-argument' || err.code === 'messaging/registration-token-not-registered') {
      // Mark token as invalid for cleanup
      await markTokenInvalid(fcmToken);
    }

    return { success: false, error: err.message };
  }
}

/**
 * Send push notification to multiple FCM tokens
 */
export async function sendMulticastNotification(fcmTokens, notification) {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    console.warn('FCM not available - notification not sent');
    return { success: false, error: 'FCM not configured' };
  }

  try {
    const message = {
      tokens: fcmTokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'robokids_lessons',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    const results = {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses.map((r, i) => ({
        token: fcmTokens[i],
        success: r.success,
        error: r.error?.message || null,
      })),
    };

    // Clean up invalid tokens
    for (const res of results.responses) {
      if (!res.success && res.error) {
        await markTokenInvalid(res.token);
      }
    }

    return results;
  } catch (err) {
    console.error('FCM multicast error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send lesson reminder to user
 */
export async function sendLessonReminder(userId, lessonTitle) {
  const { data: tokens, error } = await supabase
    .from('device_tokens')
    .select('fcm_token')
    .eq('user_id', userId)
    .eq('push_enabled', true);

  if (error || !tokens?.length) {
    return { success: false, error: 'No tokens found' };
  }

  const fcmTokens = tokens.map(t => t.fcm_token);

  return sendMulticastNotification(fcmTokens, {
    title: '📚 Time to learn!',
    body: `Continue with "${lessonTitle}" - your robot is waiting!`,
    data: {
      type: 'lesson_reminder',
      lessonTitle,
    },
  });
}

/**
 * Send badge earned notification
 */
export async function sendBadgeEarnedNotification(userId, badgeName) {
  const { data: tokens, error } = await supabase
    .from('device_tokens')
    .select('fcm_token')
    .eq('user_id', userId)
    .eq('push_enabled', true);

  if (error || !tokens?.length) {
    return { success: false, error: 'No tokens found' };
  }

  const fcmTokens = tokens.map(t => t.fcm_token);

  return sendMulticastNotification(fcmTokens, {
    title: '🏆 Badge Earned!',
    body: `Congratulations! You earned the "${badgeName}" badge!`,
    data: {
      type: 'badge_earned',
      badgeName,
    },
  });
}

/**
 * Send mission available notification
 */
export async function sendMissionAvailableNotification(userId, missionTitle) {
  const { data: tokens, error } = await supabase
    .from('device_tokens')
    .select('fcm_token')
    .eq('user_id', userId)
    .eq('push_enabled', true);

  if (error || !tokens?.length) {
    return { success: false, error: 'No tokens found' };
  }

  const fcmTokens = tokens.map(t => t.fcm_token);

  return sendMulticastNotification(fcmTokens, {
    title: '🚀 New Mission Available!',
    body: `${missionTitle} - Are you ready for the challenge?`,
    data: {
      type: 'mission_available',
      missionTitle,
    },
  });
}

/**
 * Send weekly progress summary to parent
 */
export async function sendWeeklyProgressNotification(userId, progressData) {
  const { data: tokens, error } = await supabase
    .from('device_tokens')
    .select('fcm_token')
    .eq('user_id', userId)
    .eq('push_enabled', true);

  if (error || !tokens?.length) {
    return { success: false, error: 'No tokens found' };
  }

  const fcmTokens = tokens.map(t => t.fcm_token);

  return sendMulticastNotification(fcmTokens, {
    title: '📊 Weekly Progress Report',
    body: `${progressData.studentName} completed ${progressData.lessonsCompleted} lessons this week!`,
    data: {
      type: 'weekly_progress',
      ...progressData,
    },
  });
}

/**
 * Mark FCM token as invalid when it fails
 */
async function markTokenInvalid(fcmToken) {
  try {
    // Just log for now - tokens can be cleaned up periodically
    console.warn('Invalid FCM token detected:', fcmToken.substring(0, 20) + '...');
  } catch (err) {
    console.error('Error marking token invalid:', err);
  }
}

/**
 * Register or update a device token
 */
export async function registerDeviceToken(userId, fcmToken, deviceInfo = {}) {
  const { data, error } = await supabase
    .from('device_tokens')
    .upsert({
      user_id: userId,
      fcm_token: fcmToken,
      device_type: deviceInfo.deviceType || 'android',
      device_name: deviceInfo.deviceName || null,
      app_version: deviceInfo.appVersion || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,fcm_token',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a device token (logout)
 */
export async function removeDeviceToken(userId, fcmToken) {
  const { error } = await supabase
    .from('device_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('fcm_token', fcmToken);

  if (error) throw error;
  return { success: true };
}

/**
 * Get user's push preferences
 */
export async function getPushPreferences(userId) {
  const { data, error } = await supabase
    .from('push_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Update user's push preferences
 */
export async function updatePushPreferences(userId, preferences) {
  const { data, error } = await supabase
    .from('push_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export default {
  sendPushNotification,
  sendMulticastNotification,
  sendLessonReminder,
  sendBadgeEarnedNotification,
  sendMissionAvailableNotification,
  sendWeeklyProgressNotification,
  registerDeviceToken,
  removeDeviceToken,
  getPushPreferences,
  updatePushPreferences,
};
