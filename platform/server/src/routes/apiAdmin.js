import express from 'express';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { generateApiKey, hashApiKey } from '../middleware/apiKey.js';
import { WEBHOOK_EVENTS } from '../services/webhook.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * GET /api/admin/api-clients
 * List all API clients
 */
router.get('/api-clients', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, tier } = req.query;

    let query = supabaseAdmin
      .from('api_clients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (tier) query = query.eq('tier', tier);

    const { data: clients, error, count } = await query;

    if (error) throw error;

    res.json({
      clients,
      pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (err) {
    console.error('List API clients error:', err);
    res.status(500).json({ error: 'Failed to list API clients' });
  }
});

/**
 * POST /api/admin/api-clients
 * Create a new API client
 */
router.post('/api-clients', async (req, res) => {
  try {
    const { name, email, company, tier = 'free' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const { data: client, error } = await supabaseAdmin
      .from('api_clients')
      .insert({ name, email, company, tier })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ client });
  } catch (err) {
    console.error('Create API client error:', err);
    res.status(500).json({ error: 'Failed to create API client' });
  }
});

/**
 * GET /api/admin/api-clients/:id
 * Get API client details
 */
router.get('/api-clients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: client, error } = await supabaseAdmin
      .from('api_clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'API client not found' });
      }
      throw error;
    }

    // Get API keys
    const { data: apiKeys } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, key_prefix, last_used_at, expires_at, created_at, revoked_at')
      .eq('client_id', id)
      .is('revoked_at', null);

    // Get webhooks
    const { data: webhooks } = await supabaseAdmin
      .from('webhooks')
      .select('id, url, event_types, status, failure_count, last_triggered_at')
      .eq('client_id', id);

    // Get usage stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { count: monthUsage } = await supabaseAdmin
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id)
      .gte('created_at', monthStart.toISOString());

    res.json({
      client,
      api_keys: apiKeys || [],
      webhooks: webhooks || [],
      usage_this_month: monthUsage || 0
    });
  } catch (err) {
    console.error('Get API client error:', err);
    res.status(500).json({ error: 'Failed to get API client' });
  }
});

/**
 * PATCH /api/admin/api-clients/:id
 * Update API client
 */
router.patch('/api-clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, company, tier, status } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (company !== undefined) updates.company = company;
    if (tier !== undefined) updates.tier = tier;
    if (status !== undefined) updates.status = status;

    const { data: client, error } = await supabaseAdmin
      .from('api_clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ client });
  } catch (err) {
    console.error('Update API client error:', err);
    res.status(500).json({ error: 'Failed to update API client' });
  }
});

/**
 * POST /api/admin/api-clients/:id/api-keys
 * Create API key for client
 */
router.post('/api-clients/:id/api-keys', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, expires_at } = req.body;

    // Verify client exists
    const { data: client } = await supabaseAdmin
      .from('api_clients')
      .select('id')
      .eq('id', id)
      .single();

    if (!client) {
      return res.status(404).json({ error: 'API client not found' });
    }

    const { key, prefix, hash } = generateApiKey();

    const { data: apiKey, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        client_id: id,
        key_hash: hash,
        key_prefix: prefix,
        name: name || `Key ${new Date().toISOString()}`,
        expires_at: expires_at || null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      api_key: {
        id: apiKey.id,
        key: `rk_${key}`,
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
 * DELETE /api/admin/api-clients/:id
 * Delete API client (and cascade)
 */
router.delete('/api-clients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('api_clients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'API client deleted' });
  } catch (err) {
    console.error('Delete API client error:', err);
    res.status(500).json({ error: 'Failed to delete API client' });
  }
});

/**
 * GET /api/admin/api-usage
 * Get overall API usage stats
 */
router.get('/api-usage', async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    const now = new Date();
    let startDate;

    switch (period) {
      case 'hour':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Get usage by endpoint
    const { data: endpointUsage } = await supabaseAdmin
      .from('api_usage')
      .select('endpoint, method, count')
        .gte('created_at', startDate.toISOString());

    // Get usage by client
    const { data: clientUsage } = await supabaseAdmin
      .from('api_usage')
      .select('client_id, api_clients(name)')
        .gte('created_at', startDate.toISOString());

    // Group by endpoint
    const endpointStats = {};
    for (const u of endpointUsage || []) {
      const key = `${u.method} ${u.endpoint}`;
      endpointStats[key] = (endpointStats[key] || 0) + 1;
    }

    // Group by client
    const clientStats = {};
    for (const u of clientUsage || []) {
      if (!u.api_clients) continue;
      const name = u.api_clients.name;
      clientStats[name] = (clientStats[name] || 0) + 1;
    }

    // Total counts
    const { count: totalRequests } = await supabaseAdmin
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    res.json({
      period,
      start_date: startDate.toISOString(),
      total_requests: totalRequests || 0,
      by_endpoint: endpointStats,
      by_client: clientStats
    });
  } catch (err) {
    console.error('Get API usage error:', err);
    res.status(500).json({ error: 'Failed to get API usage' });
  }
});

/**
 * GET /api/admin/rate-limits
 * Get rate limit configuration
 */
router.get('/rate-limits', async (req, res) => {
  try {
    const { data: limits } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .order('requests_per_month', { ascending: true });

    res.json({ tiers: limits });
  } catch (err) {
    console.error('Get rate limits error:', err);
    res.status(500).json({ error: 'Failed to get rate limits' });
  }
});

/**
 * PATCH /api/admin/rate-limits/:tier
 * Update rate limit for a tier
 */
router.patch('/rate-limits/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    const { requests_per_minute, requests_per_day, requests_per_month, concurrent_requests } = req.body;

    const updates = {};
    if (requests_per_minute !== undefined) updates.requests_per_minute = requests_per_minute;
    if (requests_per_day !== undefined) updates.requests_per_day = requests_per_day;
    if (requests_per_month !== undefined) updates.requests_per_month = requests_per_month;
    if (concurrent_requests !== undefined) updates.concurrent_requests = concurrent_requests;

    const { data: limit, error } = await supabaseAdmin
      .from('rate_limits')
      .update(updates)
      .eq('tier', tier)
      .select()
      .single();

    if (error) throw error;

    res.json({ tier: limit });
  } catch (err) {
    console.error('Update rate limit error:', err);
    res.status(500).json({ error: 'Failed to update rate limit' });
  }
});

/**
 * GET /api/admin/openapi.json
 * Get OpenAPI documentation
 */
router.get('/openapi.json', async (req, res) => {
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'RoboKids Vietnam API',
      description: 'Public API for RoboKids Vietnam STEM Robotics Education Platform',
      version: '1.0.0',
      contact: { email: 'api@robokids.vn' }
    },
    servers: [
      { url: 'https://api.robokids.vn', description: 'Production' },
      { url: 'http://localhost:3100', description: 'Development' }
    ],
    auth: {
      type: 'apiKey',
      in: 'header',
      name: 'X-Api-Key',
      description: 'API key obtained from the developer portal'
    },
    endpoints: {
      '/public/students': {
        get: {
          tags: ['Students'],
          summary: 'List students',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
            { name: 'search', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'List of students' }
          }
        }
      },
      '/public/students/{id}': {
        get: {
          tags: ['Students'],
          summary: 'Get student details',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Student details' },
            '404': { description: 'Student not found' }
          }
        }
      },
      '/public/students/{id}/progress': {
        get: {
          tags: ['Students'],
          summary: 'Get student progress',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Student progress data' }
          }
        }
      },
      '/public/enrollments': {
        get: {
          tags: ['Enrollments'],
          summary: 'List enrollments',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'offset', in: 'query', schema: { type: 'integer' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'student_id', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'List of enrollments' }
          }
        }
      },
      '/public/lessons': {
        get: {
          tags: ['Lessons'],
          summary: 'List lessons',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'age_group', in: 'query', schema: { type: 'string' } },
            { name: 'difficulty', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'List of lessons' }
          }
        }
      },
      '/public/courses': {
        get: {
          tags: ['Courses'],
          summary: 'List courses',
          responses: {
            '200': { description: 'List of courses' }
          }
        }
      },
      '/public/usage': {
        get: {
          tags: ['Usage'],
          summary: 'Get API usage statistics',
          responses: {
            '200': { description: 'Usage statistics' }
          }
        }
      }
    },
    webhookEvents: Object.entries(WEBHOOK_EVENTS).map(([key, value]) => ({
      type: key,
      event: value,
      description: getEventDescription(value)
    }))
  };

  res.json(openApiSpec);
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
    'streak.updated': 'Fired when a student\'s streak changes',
    'student.registered': 'Fired when a new student registers',
    'course.completed': 'Fired when a student completes a course'
  };
  return descriptions[eventType] || 'Unknown event type';
}

export default router;
