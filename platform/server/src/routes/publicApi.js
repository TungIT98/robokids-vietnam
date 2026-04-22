import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { apiKeyAuth, optionalApiKeyAuth, trackUsage } from '../middleware/apiKey.js';
import { triggerWebhook, WEBHOOK_EVENTS } from '../services/webhook.js';

const router = express.Router();

// Apply auth and usage tracking to all routes
router.use(apiKeyAuth());
router.use(trackUsage());

/**
 * GET /api/public/students
 * List students visible to the API client
 */
router.get('/students', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;

    let query = supabaseAdmin
      .from('students')
      .select('*, profiles(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`profiles.full_name.ilike.%${search}%`);
    }

    // Filter based on client relationship (for now, return all - implement filtering based on client setup)
    const { data: students, error, count } = await query;

    if (error) throw error;

    res.json({
      students,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('List students error:', err);
    res.status(500).json({ error: 'Failed to list students' });
  }
});

/**
 * GET /api/public/students/:id
 * Get student details
 */
router.get('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: student, error } = await supabaseAdmin
      .from('students')
      .select('*, profiles(full_name, email, avatar_url)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Student not found' });
      }
      throw error;
    }

    res.json({ student });
  } catch (err) {
    console.error('Get student error:', err);
    res.status(500).json({ error: 'Failed to get student' });
  }
});

/**
 * GET /api/public/students/:id/progress
 * Get student progress
 */
router.get('/students/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;

    // Check student exists
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', id)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get XP and level
    const { data: progress } = await supabaseAdmin
      .from('user_progress')
      .select('*')
      .eq('user_id', id)
      .single();

    // Get completed lessons
    const { data: completedLessons } = await supabaseAdmin
      .from('completed_lessons')
      .select('*, lessons(title, xp_reward)')
      .eq('user_id', id)
      .order('completed_at', { ascending: false })
      .limit(50);

    // Get earned badges
    const { data: badges } = await supabaseAdmin
      .from('earned_badges')
      .select('*, badges(name, description, icon)')
      .eq('user_id', id)
      .order('earned_at', { ascending: false });

    res.json({
      student_id: id,
      progress: progress || { xp: 0, level: 1, streak: 0 },
      completed_lessons: completedLessons || [],
      badges: badges || []
    });
  } catch (err) {
    console.error('Get student progress error:', err);
    res.status(500).json({ error: 'Failed to get student progress' });
  }
});

/**
 * GET /api/public/enrollments
 * List enrollments
 */
router.get('/enrollments', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, student_id } = req.query;

    let query = supabaseAdmin
      .from('enrollments')
      .select('*, students(profiles(full_name)), courses(name, description)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (student_id) {
      query = query.eq('student_id', student_id);
    }

    const { data: enrollments, error, count } = await query;

    if (error) throw error;

    res.json({
      enrollments,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('List enrollments error:', err);
    res.status(500).json({ error: 'Failed to list enrollments' });
  }
});

/**
 * GET /api/public/enrollments/:id
 * Get enrollment details
 */
router.get('/enrollments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: enrollment, error } = await supabaseAdmin
      .from('enrollments')
      .select('*, students(profiles(full_name, email)), courses(name, description)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Enrollment not found' });
      }
      throw error;
    }

    res.json({ enrollment });
  } catch (err) {
    console.error('Get enrollment error:', err);
    res.status(500).json({ error: 'Failed to get enrollment' });
  }
});

/**
 * GET /api/public/lessons
 * List available lessons
 */
router.get('/lessons', async (req, res) => {
  try {
    const { limit = 50, offset = 0, age_group, difficulty } = req.query;

    let query = supabaseAdmin
      .from('lessons')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true })
      .range(offset, offset + limit - 1);

    if (age_group) {
      query = query.eq('age_group', age_group);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data: lessons, error, count } = await query;

    if (error) throw error;

    res.json({
      lessons,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('List lessons error:', err);
    res.status(500).json({ error: 'Failed to list lessons' });
  }
});

/**
 * GET /api/public/lessons/:id
 * Get lesson details
 */
router.get('/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: lesson, error } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Lesson not found' });
      }
      throw error;
    }

    res.json({ lesson });
  } catch (err) {
    console.error('Get lesson error:', err);
    res.status(500).json({ error: 'Failed to get lesson' });
  }
});

/**
 * GET /api/public/courses
 * List available courses
 */
router.get('/courses', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data: courses, error, count } = await supabaseAdmin
      .from('courses')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      courses,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('List courses error:', err);
    res.status(500).json({ error: 'Failed to list courses' });
  }
});

/**
 * GET /api/public/usage
 * Get API usage stats for the authenticated client
 */
router.get('/usage', async (req, res) => {
  try {
    const clientId = req.apiClient.id;

    // Get usage stats
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's usage
    const { count: todayCount } = await supabaseAdmin
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('created_at', dayStart.toISOString());

    // This month's usage
    const { count: monthCount } = await supabaseAdmin
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('created_at', monthStart.toISOString());

    // Recent requests
    const { data: recentRequests } = await supabaseAdmin
      .from('api_usage')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Endpoint breakdown
    const { data: endpointStats } = await supabaseAdmin
      .from('api_usage')
      .select('endpoint, method')
      .eq('client_id', clientId)
      .gte('created_at', dayStart.toISOString());

    const endpointCounts = {};
    for (const req of endpointStats || []) {
      const key = `${req.method} ${req.endpoint}`;
      endpointCounts[key] = (endpointCounts[key] || 0) + 1;
    }

    res.json({
      client: {
        id: req.apiClient.id,
        name: req.apiClient.name,
        tier: req.apiClient.tier
      },
      usage: {
        today: todayCount || 0,
        this_month: monthCount || 0,
        limits: {
          per_day: req.rateLimit.limit.perDay,
          per_month: req.rateLimit.limit.perMonth
        },
        remaining: req.rateLimit.remaining
      },
      recent_requests: recentRequests || [],
      endpoint_breakdown: endpointCounts
    });
  } catch (err) {
    console.error('Get usage error:', err);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

/**
 * GET /api/public/rate-limits
 * Get rate limits for all tiers
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

export default router;
