import express from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * GET /api/admin/stats
 * Get platform statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Count total users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' });

    // Count students
    const { count: totalStudents } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .eq('user_metadata->>role', 'student');

    // Count active enrollments
    const { count: activeEnrollments } = await supabaseAdmin
      .from('enrollments')
      .select('*', { count: 'exact' })
      .eq('status', 'active');

    // Count lessons completed
    const { count: lessonsCompleted } = await supabaseAdmin
      .from('completed_lessons')
      .select('*', { count: 'exact' });

    // Count total missions
    const { count: totalMissions } = await supabaseAdmin
      .from('missions')
      .select('*', { count: 'exact' });

    res.json({
      stats: {
        totalUsers,
        totalStudents,
        activeEnrollments,
        lessonsCompleted,
        totalMissions,
      },
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/users
 * List users with pagination
 * Query params: page (default 1), limit (default 20)
 */
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Get total count
    const { count: totalCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' });

    // Get paginated users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, user_metadata, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (usersError) throw usersError;

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/users
 * Create a new admin/staff account
 */
router.post('/users', async (req, res) => {
  try {
    const { email, password, full_name, role = 'admin' } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full_name are required' });
    }

    if (!['admin', 'teacher', 'customer_success'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin, teacher, or customer_success' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    // Create user in Supabase Auth with admin role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create profile record
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role
      }
    });
  } catch (err) {
    console.error('Error creating admin user:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user information
 * SECURITY: Prevents privilege escalation by blocking role changes via user_metadata
 */
router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_metadata, email } = req.body;

    if (!user_metadata && !email) {
      return res.status(400).json({
        error: 'At least one field (user_metadata or email) is required',
      });
    }

    // SECURITY: Block role changes to prevent privilege escalation
    if (user_metadata && user_metadata.role !== undefined) {
      console.warn(`[ADMIN AUDIT] SECURITY: Attempted role change for user ${id} by admin ${req.user?.id}`);
      return res.status(403).json({
        error: 'Role changes are not allowed through this endpoint. Use the admin role assignment flow.',
        security: true
      });
    }

    // SECURITY: Block email changes (should use separate verification flow)
    if (email !== undefined) {
      console.warn(`[ADMIN AUDIT] SECURITY: Attempted email change for user ${id} by admin ${req.user?.id}`);
      return res.status(403).json({
        error: 'Email changes are not allowed through this endpoint.',
        security: true
      });
    }

    // Log all admin user update attempts
    console.log(`[ADMIN AUDIT] User update attempt: target=${id}, admin=${req.user?.id}, fields=${Object.keys(user_metadata || {}).join(',')}`);

    const updateData = {};
    if (user_metadata) updateData.user_metadata = user_metadata;
    // Note: email changes blocked above

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, email, user_metadata, created_at')
      .single();

    if (updateError) throw updateError;

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[ADMIN AUDIT] User update success: target=${id}, admin=${req.user?.id}`);

    res.json({
      success: true,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
