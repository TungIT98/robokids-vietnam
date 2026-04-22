/**
 * SMS Service for RoboKids Vietnam
 * Supports Twilio and Vietnamese SMS gateways (Esms, Gateway.vn)
 */

const SMS_ENABLED = process.env.SMS_ENABLED === 'true';
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'twilio'; // 'twilio', 'esms', 'gateway'

// Twilio config
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Esms config (Vietnamese SMS gateway)
const ESMS_API_KEY = process.env.ESMS_API_KEY;
const ESMS_SECRET_KEY = process.env.ESMS_SECRET_KEY;
const ESMS_BRAND_NAME = process.env.ESMS_BRAND_NAME || 'RoboKids';

// Gateway.vn config
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY;
const GATEWAY_SECRET_KEY = process.env.GATEWAY_SECRET_KEY;

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(phoneNumber, message) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio credentials not configured');
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: TWILIO_PHONE_NUMBER,
        Body: message,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Twilio API error');
  }

  return { success: true, messageId: data.sid };
}

/**
 * Send SMS via Esms (Vietnamese SMS gateway)
 */
async function sendViaEsms(phoneNumber, message) {
  if (!ESMS_API_KEY || !ESMS_SECRET_KEY) {
    throw new Error('Esms credentials not configured');
  }

  // Esms API endpoint
  const response = await fetch('https://esms.vn/apiservice/sendsms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ApiKey: ESMS_API_KEY,
      SecretKey: ESMS_SECRET_KEY,
      Phone: phoneNumber,
      Content: message,
      Brandname: ESMS_BRAND_NAME,
      SmsType: '2', // 2 = Flash SMS, 4 = Brandname SMS
    }),
  });

  const data = await response.json();

  if (data.code !== '200') {
    throw new Error(data.errorMessage || 'Esms API error');
  }

  return { success: true, messageId: data.CampaignId };
}

/**
 * Send SMS via Gateway.vn
 */
async function sendViaGateway(phoneNumber, message) {
  if (!GATEWAY_API_KEY || !GATEWAY_SECRET_KEY) {
    throw new Error('Gateway credentials not configured');
  }

  const response = await fetch('https://gateway.vn/apis/v4/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': GATEWAY_API_KEY,
      'X-Secret-Key': GATEWAY_SECRET_KEY,
    },
    body: JSON.stringify({
      phone: phoneNumber,
      message: message,
      type: 'OTP', // or 'MARKETING', 'OTP'
    }),
  });

  const data = await response.json();

  if (data.status !== 'success') {
    throw new Error(data.message || 'Gateway API error');
  }

  return { success: true, messageId: data.request_id };
}

/**
 * Send SMS to a phone number
 * @param {string} phoneNumber - Phone number in format +84... or 0...
 * @param {string} message - SMS message content
 * @returns {Promise<{success: boolean, messageId?: string, mock?: boolean}>}
 */
export async function sendSMS(phoneNumber, message) {
  // Normalize phone number to E.164 format for Vietnam
  let normalizedPhone = phoneNumber.trim();
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '+84' + normalizedPhone.slice(1);
  } else if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = '+' + normalizedPhone;
  }

  if (!SMS_ENABLED) {
    console.log(`[SMS DISABLED] Would send SMS to ${normalizedPhone}: ${message.substring(0, 50)}...`);
    return { success: true, mock: true };
  }

  try {
    let result;
    switch (SMS_PROVIDER) {
      case 'esms':
        result = await sendViaEsms(normalizedPhone, message);
        break;
      case 'gateway':
        result = await sendViaGateway(normalizedPhone, message);
        break;
      case 'twilio':
      default:
        result = await sendViaTwilio(normalizedPhone, message);
        break;
    }

    console.log(`[SMS] Sent via ${SMS_PROVIDER} to ${normalizedPhone}:`, result.messageId);
    return result;
  } catch (err) {
    console.error(`[SMS] Failed to send SMS to ${normalizedPhone}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send class reminder SMS
 */
export async function sendClassReminderSMS(phoneNumber, studentName, lessonTitle, dateTime) {
  const message = `📚 RoboKids: Reminder for ${studentName}'s class "${lessonTitle}" on ${dateTime}. Please prepare and join on time! - RoboKids Vietnam`;
  return sendSMS(phoneNumber, message);
}

/**
 * Send enrollment confirmation SMS
 */
export async function sendEnrollmentConfirmationSMS(phoneNumber, studentName, className) {
  const message = `🎉 Welcome ${studentName}! Enrolled in ${className}. Login at robokids.vn to start learning! Questions? Call 1900-xxxx - RoboKids Vietnam`;
  return sendSMS(phoneNumber, message);
}

/**
 * Send payment reminder SMS
 */
export async function sendPaymentReminderSMS(phoneNumber, studentName, amount, dueDate) {
  const message = `💰 RoboKids: Payment reminder for ${studentName}. Amount: ${amount} VND, due ${dueDate}. Please complete payment to continue learning! - RoboKids Vietnam`;
  return sendSMS(phoneNumber, message);
}

/**
 * Send achievement SMS (student milestone)
 */
export async function sendAchievementSMS(phoneNumber, studentName, achievement) {
  const message = `🏆 RoboKids: Congratulations ${studentName}! You earned "${achievement}"! Keep up the great work! - RoboKids Vietnam`;
  return sendSMS(phoneNumber, message);
}

/**
 * Send batch SMS to multiple recipients
 */
export async function sendBatchSMS(recipients) {
  const results = await Promise.allSettled(
    recipients.map(({ phoneNumber, message }) => sendSMS(phoneNumber, message))
  );

  const summary = {
    total: recipients.length,
    successful: 0,
    failed: 0,
    results: [],
  };

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      summary.successful++;
      summary.results.push({
        phone: recipients[index].phoneNumber,
        success: true,
        messageId: result.value.messageId,
      });
    } else {
      summary.failed++;
      summary.results.push({
        phone: recipients[index].phoneNumber,
        success: false,
        error: result.status === 'rejected' ? result.reason.message : result.value.error,
      });
    }
  });

  console.log(`[SMS] Batch send completed: ${summary.successful}/${summary.total} successful`);
  return summary;
}

export default {
  sendSMS,
  sendClassReminderSMS,
  sendEnrollmentConfirmationSMS,
  sendPaymentReminderSMS,
  sendAchievementSMS,
  sendBatchSMS,
};