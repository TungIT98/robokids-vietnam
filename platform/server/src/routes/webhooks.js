import express from 'express';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '../lib/supabase.js';
import { apiKeyAuth, trackUsage, generateApiKey, hashApiKey } from '../middleware/apiKey.js';
import { verifyWebhookSignature, WEBHOOK_EVENTS } from '../services/webhook.js';

const router = express.Router();

// All routes require API key authentication
router.use(apiKeyAuth());
router.use(trackUsage());

/**
 * GET /api/webhooks/clients
 * Get API client info
 */
router.get('/clients/me', async (req, res) => {
  try {
    const { data: client } = await supabaseAdmin
      .from('api_clients')
      .select('*')
      .eq('id', req.apiClient.id)
      .single();

    res.json({ client });
  } catch (err) {
    console.error('Get client error:', err);
    res.status(500).json({ error: 'Failed to get client info' });
  }
});

/**
 * POST /api/webhooks/clients/api-keys
 * Create a new API key for the client
 */
router.post('/clients/api-keys', async (req, res) => {
  try {
    const { name, expires_at } = req.body;

    const { key, prefix, hash } = generateApiKey();

    const { data: apiKey, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        client_id: req.apiClient.id,
        key_hash: hash,
        key_prefix: prefix,
        name: name || `Key ${new Date().toISOString()}`,
        expires_at: expires_at || null
      })
      .select()
      .single();

    if (error) throw error;

    // Return the full key only once
    res.status(201).json({
      api_key: {
        id: apiKey.id,
        key: `rk_${key}`, // Add prefix
        prefix: `rk_${prefix}`,
        name: apiKey.name,
        expires_at: apiKey.expires_at,
        created_at: apiKey.created_at
      },
      warning: 'Store this API key securely. It will not be shown again.'
    });
  } catch (err) {
    console.error('Create API key error:', err);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * GET /api/webhooks/clients/api-keys
 * List API keys for the client
 */
router.get('/clients/api-keys', async (req, res) => {
  try {
    const { data: keys } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, key_prefix, last_used_at, expires_at, created_at, revoked_at')
      .eq('client_id', req.apiClient.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    res.json({ api_keys: keys });
  } catch (err) {
    console.error('List API keys error:', err);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * DELETE /api/webhooks/clients/api-keys/:id
 * Revoke an API key
 */
router.delete('/clients/api-keys/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('client_id', req.apiClient.id);

    if (error) throw error;

    res.json({ message: 'API key revoked' });
  } catch (err) {
    console.error('Revoke API key error:', err);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * GET /api/webhooks/endpoints
 * List webhook endpoints for the client
 */
router.get('/endpoints', async (req, res) => {
  try {
    const { data: webhooks } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('client_id', req.apiClient.id)
      .order('created_at', { ascending: false });

    res.json({ webhooks });
  } catch (err) {
    console.error('List webhooks error:', err);
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

/**
 * POST /api/webhooks/endpoints
 * Create a new webhook endpoint
 */
router.post('/endpoints', async (req, res) => {
  try {
    const { url, event_types, name } = req.body;

    if (!url || !event_types || !Array.isArray(event_types)) {
      return res.status(400).json({
        error: 'URL and event_types array are required'
      });
    }

    // Validate event types
    const validEvents = Object.values(WEBHOOK_EVENTS);
    for (const eventType of event_types) {
      if (!validEvents.includes(eventType)) {
        return res.status(400).json({
          error: `Invalid event type: ${eventType}`,
          valid_types: validEvents
        });
      }
    }

    // Generate webhook secret
    const secret = randomBytes(32).toString('hex');

    const { data: webhook, error } = await supabaseAdmin
      .from('webhooks')
      .insert({
        client_id: req.apiClient.id,
        url,
        secret,
        event_types: event_types,
        name: name || url
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      webhook,
      secret_warning: 'Store this secret securely. It will not be shown again.'
    });
  } catch (err) {
    console.error('Create webhook error:', err);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

/**
 * GET /api/webhooks/endpoints/:id
 * Get webhook endpoint details
 */
router.get('/endpoints/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: webhook, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('client_id', req.apiClient.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Webhook not found' });
      }
      throw error;
    }

    res.json({ webhook });
  } catch (err) {
    console.error('Get webhook error:', err);
    res.status(500).json({ error: 'Failed to get webhook' });
  }
});

/**
 * PATCH /api/webhooks/endpoints/:id
 * Update webhook endpoint
 */
router.patch('/endpoints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { url, event_types, status, name } = req.body;

    const updates = {};
    if (url !== undefined) updates.url = url;
    if (status !== undefined) updates.status = status;
    if (name !== undefined) updates.name = name;
    if (event_types !== undefined) {
      if (!Array.isArray(event_types)) {
        return res.status(400).json({ error: 'event_types must be an array' });
      }
      const validEvents = Object.values(WEBHOOK_EVENTS);
      for (const eventType of event_types) {
        if (!validEvents.includes(eventType)) {
          return res.status(400).json({
            error: `Invalid event type: ${eventType}`,
            valid_types: validEvents
          });
        }
      }
      updates.event_types = event_types;
    }

    const { data: webhook, error } = await supabaseAdmin
      .from('webhooks')
      .update(updates)
      .eq('id', id)
      .eq('client_id', req.apiClient.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ webhook });
  } catch (err) {
    console.error('Update webhook error:', err);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

/**
 * DELETE /api/webhooks/endpoints/:id
 * Delete webhook endpoint
 */
router.delete('/endpoints/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('webhooks')
      .delete()
      .eq('id', id)
      .eq('client_id', req.apiClient.id);

    if (error) throw error;

    res.json({ message: 'Webhook deleted' });
  } catch (err) {
    console.error('Delete webhook error:', err);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

/**
 * POST /api/webhooks/endpoints/:id/test
 * Send a test webhook
 */
router.post('/endpoints/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: webhook, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('client_id', req.apiClient.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Webhook not found' });
      }
      throw error;
    }

    // Trigger test event
    const { triggerWebhook } = await import('../services/webhook.js');
    const result = await triggerWebhook(req.apiClient.id, 'test.event', {
      test: true,
      message: 'This is a test webhook event',
      webhook_id: id
    });

    res.json({
      message: 'Test webhook triggered',
      delivery_id: result.eventId,
      triggered: result.triggered
    });
  } catch (err) {
    console.error('Test webhook error:', err);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

/**
 * GET /api/webhooks/endpoints/:id/deliveries
 * List webhook deliveries
 */
router.get('/endpoints/:id/deliveries', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0, status } = req.query;

    // Verify webhook belongs to client
    const { data: webhook } = await supabaseAdmin
      .from('webhooks')
      .select('id')
      .eq('id', id)
      .eq('client_id', req.apiClient.id)
      .single();

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    let query = supabaseAdmin
      .from('webhook_deliveries')
      .select('*', { count: 'exact' })
      .eq('webhook_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: deliveries, error, count } = await query;

    if (error) throw error;

    res.json({
      deliveries,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('List deliveries error:', err);
    res.status(500).json({ error: 'Failed to list deliveries' });
  }
});

/**
 * POST /api/webhooks/endpoints/:id/rotate-secret
 * Rotate webhook secret
 */
router.post('/endpoints/:id/rotate-secret', async (req, res) => {
  try {
    const { id } = req.params;

    const newSecret = randomBytes(32).toString('hex');

    const { data: webhook, error } = await supabaseAdmin
      .from('webhooks')
      .update({ secret: newSecret })
      .eq('id', id)
      .eq('client_id', req.apiClient.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      webhook,
      secret_warning: 'Store this new secret securely. It will not be shown again.'
    });
  } catch (err) {
    console.error('Rotate secret error:', err);
    res.status(500).json({ error: 'Failed to rotate secret' });
  }
});

/**
 * GET /api/webhooks/events
 * List available webhook event types
 */
router.get('/events', async (req, res) => {
  res.json({
    event_types: Object.entries(WEBHOOK_EVENTS).map(([key, value]) => ({
      key,
      value,
      description: getEventDescription(value)
    }))
  });
});

function getEventDescription(eventType) {
  const descriptions = {
    'enrollment.created': 'Fired when a new enrollment is created',
    'enrollment.updated': 'Fired when an enrollment is updated',
    'enrollment.cancelled': 'Fired when an enrollment is cancelled',
    'lesson.completed': 'Fired when a student completes a lesson',
    'mission.completed': 'Fired when a student completes a mission',
    'badge.earned': 'Fired when a student earns a badge',
    'level.up': 'Fired when a student levels up',
    'streak.updated': "Fired when a student's streak changes",
    'student.registered': 'Fired when a new student registers',
    'course.completed': 'Fired when a student completes a course'
  };
  return descriptions[eventType] || 'Unknown event type';
}

export default router;
