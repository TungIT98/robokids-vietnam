/**
 * Zalo OA (Official Account) Service for RoboKids Vietnam
 * Handles Zalo notifications for Vietnamese parents and students
 */

import { supabase } from '../lib/supabase.js';

const ZALO_ENABLED = process.env.ZALO_ENABLED === 'true';
const ZALO_APP_ID = process.env.ZALO_APP_ID;
const ZALO_APP_SECRET = process.env.ZALO_APP_SECRET;
const ZALO_OA_ID = process.env.ZALO_OA_ID || 'RoboKidsVietnam';

// Zalo API endpoints
const ZALO_TOKEN_URL = 'https://oauth.zaloapp.com/v4/oa/access_token';
const ZALO_SEND_URL = 'https://openapi.zalo.me/v3.0/';
const ZALO_USER_URL = 'https://graph.zalo.me/v2.0/';

// In-memory token cache
let zaloAccessToken = null;
let tokenExpiry = 0;

/**
 * Get Zalo OA access token
 */
async function getAccessToken() {
  if (zaloAccessToken && Date.now() < tokenExpiry) {
    return zaloAccessToken;
  }

  if (!ZALO_APP_ID || !ZALO_APP_SECRET) {
    throw new Error('Zalo credentials not configured');
  }

  try {
    const response = await fetch(`${ZALO_TOKEN_URL}?app_id=${ZALO_APP_ID}&app_secret=${ZALO_APP_SECRET}&grant_type=client_credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || 'Failed to get Zalo access token');
    }

    zaloAccessToken = data.access_token;
    // Token typically expires in 3600 seconds, refresh 5 minutes before expiry
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    console.log('[ZALO] Access token refreshed, expires in:', data.expires_in, 'seconds');
    return zaloAccessToken;
  } catch (err) {
    console.error('[ZALO] Failed to get access token:', err.message);
    throw err;
  }
}

/**
 * Send text message via Zalo OA
 */
export async function sendZaloTextMessage(zaloId, message) {
  if (!ZALO_ENABLED) {
    console.log(`[ZALO DISABLED] Would send to ${zaloId}: ${message.substring(0, 50)}...`);
    return { success: true, mock: true };
  }

  try {
    const token = await getAccessToken();

    const response = await fetch(`${ZALO_SEND_URL}oa/message/cs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: {
          oa_id: ZALO_OA_ID,
          user_id: zaloId,
        },
        message: {
          text: message,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || 'Zalo API error');
    }

    console.log(`[ZALO] Message sent to ${zaloId}:`, data.mesage_id);
    return { success: true, messageId: data.mesage_id };
  } catch (err) {
    console.error(`[ZALO] Failed to send message to ${zaloId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send template message via Zalo OA
 */
export async function sendZaloTemplateMessage(zaloId, templateId, templateData) {
  if (!ZALO_ENABLED) {
    console.log(`[ZALO DISABLED] Would send template ${templateId} to ${zaloId}`);
    return { success: true, mock: true };
  }

  try {
    const token = await getAccessToken();

    const response = await fetch(`${ZALO_SEND_URL}oa/message/template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: {
          oa_id: ZALO_OA_ID,
          user_id: zaloId,
        },
        template_id: templateId,
        template_data: templateData,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || 'Zalo API error');
    }

    console.log(`[ZALO] Template message sent to ${zaloId}:`, data.mesage_id);
    return { success: true, messageId: data.mesage_id };
  } catch (err) {
    console.error(`[ZALO] Failed to send template to ${zaloId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send class reminder via Zalo
 */
export async function sendClassReminderZalo(zaloId, studentName, lessonTitle, dateTime, teacherName) {
  return sendZaloTemplateMessage(zaloId, 'robokids_class_reminder', {
    student_name: studentName,
    lesson_title: lessonTitle,
    date_time: dateTime,
    teacher_name: teacherName || 'your teacher',
  });
}

/**
 * Send weekly progress via Zalo
 */
export async function sendWeeklyProgressZalo(zaloId, studentName, lessonsCompleted, xpEarned, level) {
  return sendZaloTemplateMessage(zaloId, 'robokids_weekly_progress', {
    student_name: studentName,
    lessons_completed: String(lessonsCompleted),
    xp_earned: String(xpEarned),
    current_level: String(level),
  });
}

/**
 * Send achievement notification via Zalo
 */
export async function sendAchievementZalo(zaloId, studentName, badgeName, badgeIcon) {
  return sendZaloTemplateMessage(zaloId, 'robokids_achievement', {
    student_name: studentName,
    badge_name: badgeName,
  });
}

/**
 * Send payment confirmation via Zalo
 */
export async function sendPaymentConfirmationZalo(zaloId, studentName, amount, paymentMethod, transactionId) {
  return sendZaloTemplateMessage(zaloId, 'robokids_payment_confirm', {
    student_name: studentName,
    amount: amount,
    payment_method: paymentMethod,
    transaction_id: transactionId,
  });
}

/**
 * Send enrollment confirmation via Zalo
 */
export async function sendEnrollmentConfirmationZalo(zaloId, studentName, className, startDate) {
  return sendZaloTemplateMessage(zaloId, 'robokids_enrollment_confirm', {
    student_name: studentName,
    class_name: className,
    start_date: startDate,
  });
}

/**
 * Get Zalo user info by Zalo ID
 */
export async function getZaloUserInfo(zaloId) {
  try {
    const token = await getAccessToken();

    const response = await fetch(`${ZALO_USER_URL}me?fields=id,name,phone,email&access_token=${token}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || 'Zalo API error');
    }

    return {
      success: true,
      user: {
        zaloId: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
      },
    };
  } catch (err) {
    console.error(`[ZALO] Failed to get user info for ${zaloId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Link Zalo account to a parent in the database
 */
export async function linkZaloAccount(profileId, zaloId, zaloName) {
  const { data, error } = await supabase
    .from('parents')
    .update({
      zalo_id: zaloId,
      zalo_name: zaloName,
      zalo_linked_at: new Date().toISOString(),
    })
    .eq('profile_id', profileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get parent Zalo info from database
 */
export async function getParentZaloInfo(profileId) {
  const { data, error } = await supabase
    .from('parents')
    .select('zalo_id, zalo_name, zalo_linked_at')
    .eq('profile_id', profileId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Check if Zalo account is linked for a profile
 */
export async function isZaloLinked(profileId) {
  const info = await getParentZaloInfo(profileId);
  return info && info.zalo_id && info.zalo_linked_at;
}

/**
 * Send notification to all Zalo-linked parents of a student
 */
export async function notifyStudentParentsZalo(studentId, notificationFn) {
  // Get parent relations for this student
  const { data: relations, error } = await supabase
    .from('student_parent_relations')
    .select(`
      id,
      parent_id,
      parents (
        profile_id,
        zalo_id,
        zalo_name
      )
    `)
    .eq('student_id', studentId);

  if (error || !relations?.length) {
    console.log(`[ZALO] No parents with Zalo linked for student ${studentId}`);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const relation of relations) {
    const zaloId = relation.parents?.zalo_id;
    if (zaloId) {
      const result = await notificationFn(zaloId);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }
  }

  return { sent, failed };
}

export default {
  sendZaloTextMessage,
  sendZaloTemplateMessage,
  sendClassReminderZalo,
  sendWeeklyProgressZalo,
  sendAchievementZalo,
  sendPaymentConfirmationZalo,
  sendEnrollmentConfirmationZalo,
  getZaloUserInfo,
  linkZaloAccount,
  getParentZaloInfo,
  isZaloLinked,
  notifyStudentParentsZalo,
};