import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Role helper
function getUserRole(user) {
  return user.role || user.user_metadata?.role || 'student';
}

// Check if user has admin/staff access
function isStaff(userRole) {
  return ['admin', 'robokids_staff', 'coordinator'].includes(userRole);
}

/**
 * GET /api/mentors
 * List all mentors (admin/staff only)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userRole = getUserRole(req.user);

    if (!isStaff(userRole)) {
      return res.status(403).json({ error: 'Access denied. Admin or staff role required.' });
    }

    const { page = 1, limit = 50, status, competition_type } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('mentors')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (competition_type) {
      query = query.eq('competition_type', competition_type);
    }

    const { data: mentors, count, error } = await query;

    if (error) throw error;

    res.json({
      mentors: mentors || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching mentors:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/mentors/:mentorId
 * Get mentor by ID
 */
router.get('/:mentorId', authenticate, async (req, res) => {
  try {
    const { mentorId } = req.params;
    const userRole = getUserRole(req.user);

    if (!isStaff(userRole)) {
      return res.status(403).json({ error: 'Access denied. Admin or staff role required.' });
    }

    const { data: mentor, error } = await supabaseAdmin
      .from('mentors')
      .select('*')
      .eq('id', mentorId)
      .single();

    if (error) throw error;
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    // Get assigned teams if any
    const { data: teamMentors } = await supabaseAdmin
      .from('team_mentors')
      .select('team_id, role, assigned_at')
      .eq('mentor_id', mentorId);

    res.json({ mentor, assigned_teams: teamMentors || [] });
  } catch (err) {
    console.error('Error fetching mentor:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/mentors
 * Create new mentor
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userRole = getUserRole(req.user);

    if (!isStaff(userRole)) {
      return res.status(403).json({ error: 'Access denied. Admin or staff role required.' });
    }

    const {
      profile_id,
      full_name,
      email,
      phone,
      expertise,
      competition_type,
      experience_years,
      availability,
      status = 'active',
      notes,
    } = req.body;

    // Validate required fields
    if (!full_name || !email) {
      return res.status(400).json({ error: 'full_name and email are required' });
    }

    const { data: mentor, error } = await supabaseAdmin
      .from('mentors')
      .insert({
        profile_id,
        full_name,
        email,
        phone,
        expertise,
        competition_type,
        experience_years,
        availability,
        status,
        notes,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ mentor });
  } catch (err) {
    console.error('Error creating mentor:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/mentors/:mentorId
 * Update mentor
 */
router.patch('/:mentorId', authenticate, async (req, res) => {
  try {
    const { mentorId } = req.params;
    const userRole = getUserRole(req.user);

    if (!isStaff(userRole)) {
      return res.status(403).json({ error: 'Access denied. Admin or staff role required.' });
    }

    const {
      full_name,
      email,
      phone,
      expertise,
      competition_type,
      experience_years,
      availability,
      status,
      notes,
    } = req.body;

    const updates = {};

    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (expertise !== undefined) updates.expertise = expertise;
    if (competition_type !== undefined) updates.competition_type = competition_type;
    if (experience_years !== undefined) updates.experience_years = experience_years;
    if (availability !== undefined) updates.availability = availability;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const { data: mentor, error } = await supabaseAdmin
      .from('mentors')
      .update(updates)
      .eq('id', mentorId)
      .select()
      .single();

    if (error) throw error;
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    res.json({ mentor });
  } catch (err) {
    console.error('Error updating mentor:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;