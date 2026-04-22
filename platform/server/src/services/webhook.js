import { createHmac } from 'crypto';
import { supabaseAdmin } from '../lib/supabase.js';

// Event types for webhooks
export const WEBHOOK_EVENTS = {
  ENROLLMENT_CREATED: 'enrollment.created',
  ENROLLMENT_UPDATED: 'enrollment.updated',
  ENROLLMENT_CANCELLED: 'enrollment.cancelled',
  LESSON_COMPLETED: 'lesson.completed',
  MISSION_COMPLETED: 'mission.completed',
  BADGE_EARNED: 'badge.earned',
  LEVEL_UP: 'level.up',
  STREAK_UPDATED: 'streak.updated',
  STUDENT_REGISTERED: 'student.registered',
  COURSE_COMPLETED: 'course.completed'
};

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 5,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 3600000, // 1 hour
  backoffMultiplier: 2
};

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
  return { timestamp, signature };
}

/**
 * Verify webhook signature from incoming request
 */
export function verifyWebhookSignature(payload, signature, timestamp, secret, toleranceSeconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > toleranceSeconds) {
    return false; // Timestamp too old
  }
  const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
  return signature === expectedSignature;
}

/**
 * Calculate next retry delay with exponential backoff
 */
function calculateRetryDelay(attempt) {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Deliver a webhook
 */
async function deliverWebhook(delivery) {
  const { deliveryRecord, webhook, payload } = delivery;

  const { timestamp, signature } = generateWebhookSignature(payload, webhook.secret);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Webhook-Event': deliveryRecord.event_type,
        'X-Webhook-Delivery-Id': deliveryRecord.id
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30s timeout
    });

    const responseBody = await response.text().catch(() => '');

    // Update delivery record
    const updates = {
      status: response.ok ? 'success' : 'failed',
      attempts: deliveryRecord.attempts + 1,
      last_attempt_at: new Date().toISOString(),
      response_status: response.status,
      response_body: responseBody.substring(0, 10000), // Limit stored response
      completed_at: response.ok ? new Date().toISOString() : null
    };

    await supabaseAdmin
      .from('webhook_deliveries')
      .update(updates)
      .eq('id', deliveryRecord.id);

    // Update webhook status
    await supabaseAdmin
      .from('webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_success_at: response.ok ? new Date().toISOString() : undefined,
        last_failure_at: !response.ok ? new Date().toISOString() : undefined,
        failure_count: !response.ok ? webhook.failure_count + 1 : 0
      })
      .eq('id', webhook.id);

    return { success: response.ok, status: response.status };
  } catch (error) {
    // Update delivery as failed
    const retrying = deliveryRecord.attempts + 1 < RETRY_CONFIG.maxAttempts;
    const nextRetryAt = retrying ? new Date(Date.now() + calculateRetryDelay(deliveryRecord.attempts + 1)).toISOString() : null;

    await supabaseAdmin
      .from('webhook_deliveries')
      .update({
        status: retrying ? 'retrying' : 'failed',
        attempts: deliveryRecord.attempts + 1,
        last_attempt_at: new Date().toISOString(),
        next_retry_at: nextRetryAt,
        completed_at: retrying ? null : new Date().toISOString()
      })
      .eq('id', deliveryRecord.id);

    // Update webhook failure count
    await supabaseAdmin
      .from('webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_failure_at: new Date().toISOString(),
        failure_count: webhook.failure_count + 1
      })
      .eq('id', webhook.id);

    return { success: false, error: error.message, retrying };
  }
}

/**
 * Trigger webhook for an event
 */
export async function triggerWebhook(clientId, eventType, payload) {
  // Find active webhooks for this client and event type
  const { data: webhooks } = await supabaseAdmin
    .from('webhooks')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .contains('event_types', [eventType]);

  if (!webhooks || webhooks.length === 0) {
    return { triggered: 0 };
  }

  const eventId = crypto.randomUUID();
  const deliveries = [];

  for (const webhook of webhooks) {
    // Create delivery record
    const { data: deliveryRecord, error } = await supabaseAdmin
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        event_id: eventId,
        event_type: eventType,
        payload: {
          ...payload,
          event_type: eventType,
          event_id: eventId,
          timestamp: new Date().toISOString()
        },
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create webhook delivery record:', error);
      continue;
    }

    deliveries.push({ deliveryRecord, webhook, payload: deliveryRecord.payload });
  }

  // Deliver webhooks asynchronously
  for (const delivery of deliveries) {
    deliverWebhook(delivery).catch(err => {
      console.error('Webhook delivery failed:', err);
    });
  }

  return { triggered: deliveries.length, eventId };
}

/**
 * Process pending webhook retries
 */
export async function processWebhookRetries() {
  // Find deliveries that are due for retry
  const { data: dueDeliveries } = await supabaseAdmin
    .from('webhook_deliveries')
    .select('*, webhooks(*)')
    .eq('status', 'retrying')
    .lt('next_retry_at', new Date().toISOString())
    .lt('attempts', RETRY_CONFIG.maxAttempts)
    .limit(100);

  if (!dueDeliveries || dueDeliveries.length === 0) {
    return { processed: 0 };
  }

  let processed = 0;
  for (const delivery of dueDeliveries) {
    const webhook = delivery.webhooks;
    if (!webhook) continue;

    const result = await deliverWebhook({
      deliveryRecord: delivery,
      webhook,
      payload: delivery.payload
    });

    if (result.success || !result.retrying) {
      processed++;
    }
  }

  return { processed };
}

/**
 * Disable webhooks with too many failures
 */
export async function disableFailingWebhooks() {
  const { data: failingWebhooks } = await supabaseAdmin
    .from('webhooks')
    .select('id')
    .eq('status', 'active')
    .gte('failure_count', 10);

  if (!failingWebhooks || failingWebhooks.length === 0) {
    return { disabled: 0 };
  }

  await supabaseAdmin
    .from('webhooks')
    .update({ status: 'failed' })
    .in('id', failingWebhooks.map(w => w.id));

  return { disabled: failingWebhooks.length };
}

// Start webhook retry processor
const RETRY_INTERVAL = 60000; // 1 minute
setInterval(async () => {
  try {
    await processWebhookRetries();
    await disableFailingWebhooks();
  } catch (err) {
    console.error('Webhook retry processor error:', err);
  }
}, RETRY_INTERVAL);

export default {
  WEBHOOK_EVENTS,
  triggerWebhook,
  processWebhookRetries,
  generateWebhookSignature,
  verifyWebhookSignature
};
