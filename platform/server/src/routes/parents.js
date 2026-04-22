/**
 * Parent Dashboard API routes for RoboKids Vietnam
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/parents/:id/students
 * List all students associated with a parent
 * Accessible by the parent themselves or admin/teacher
 */
router.get('/:id/students', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    // Verify the parent exists
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .select('*')
      .eq('id', id)
      .single();

    if (parentError || !parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Check authorization: requester must be the parent OR admin/teacher
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', requestingUserId)
      .single();

    const isParent = parent.profile_id === requestingUserId;
    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';

    if (!isParent && !isAdminOrTeacher) {
      return res.status(403).json({ error: 'Not authorized to view this parent\'s students' });
    }

    // Get students via student_parent_relations
    const { data: relations, error: relationsError } = await supabase
      .from('student_parent_relations')
      .select(`
        id,
        relationship,
        is_primary,
        created_at,
        students (
          id,
          profile_id,
          grade_level,
          school_name,
          date_of_birth,
          emergency_contact,
          emergency_phone,
          created_at,
          profiles (
            id,
            full_name,
            email,
            avatar_url
          )
        )
      `)
      .eq('parent_id', id);

    if (relationsError) {
      console.error('Error fetching student relations:', relationsError);
      return res.status(500).json({ error: 'Failed to fetch students' });
    }

    const students = (relations || [])
      .filter(r => r.students)
      .map(r => ({
        relationId: r.id,
        relationship: r.relationship,
        isPrimary: r.is_primary,
        linkedAt: r.created_at,
        student: {
          id: r.students.id,
          profileId: r.students.profile_id,
          name: r.students.profiles?.full_name || null,
          email: r.students.profiles?.email || null,
          avatarUrl: r.students.profiles?.avatar_url || null,
          gradeLevel: r.students.grade_level,
          schoolName: r.students.school_name,
          dateOfBirth: r.students.date_of_birth,
          emergencyContact: r.students.emergency_contact,
          emergencyPhone: r.students.emergency_phone,
          createdAt: r.students.created_at
        }
      }));

    res.json({
      parentId: id,
      students
    });
  } catch (err) {
    console.error('Error fetching parent students:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/parents/me
 * Get current parent's profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: parent, error } = await supabase
      .from('parents')
      .select('*')
      .eq('profile_id', req.user.id)
      .single();

    if (error || !parent) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }

    res.json({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
      relationship: parent.relationship,
      createdAt: parent.created_at
    });
  } catch (err) {
    console.error('Error fetching parent profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/parents
 * Create or update parent profile
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, email, phone, relationship } = req.body;
    const profileId = req.user.id;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if parent already exists
    const { data: existing } = await supabase
      .from('parents')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (existing) {
      // Update existing
      const { data: updated, error } = await supabase
        .from('parents')
        .update({ name, email, phone, relationship })
        .eq('profile_id', profileId)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        relationship: updated.relationship,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      });
    }

    // Create new
    const { data: created, error: createError } = await supabase
      .from('parents')
      .insert({ profile_id: profileId, name, email, phone, relationship })
      .select()
      .single();

    if (createError) throw createError;

    res.status(201).json({
      id: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      relationship: created.relationship,
      createdAt: created.created_at
    });
  } catch (err) {
    console.error('Error creating/updating parent:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/parents/:id/students/:studentId/link
 * Link a student to a parent
 */
router.post('/:id/students/:studentId/link', authenticate, async (req, res) => {
  try {
    const { id: parentId, studentId } = req.params;
    const { relationship, isPrimary = true } = req.body;
    const requestingUserId = req.user.id;

    // Verify parent exists and requester is the parent
    const { data: parent } = await supabase
      .from('parents')
      .select('id, profile_id')
      .eq('id', parentId)
      .single();

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    if (parent.profile_id !== requestingUserId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!relationship) {
      return res.status(400).json({ error: 'Relationship is required' });
    }

    // Verify student exists
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if relation already exists
    const { data: existing } = await supabase
      .from('student_parent_relations')
      .select('id')
      .eq('student_id', studentId)
      .eq('parent_id', parentId)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Student already linked to this parent' });
    }

    // Create relation
    const { data: relation, error } = await supabase
      .from('student_parent_relations')
      .insert({
        student_id: studentId,
        parent_id: parentId,
        relationship,
        is_primary: isPrimary
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: relation.id,
      studentId: relation.student_id,
      parentId: relation.parent_id,
      relationship: relation.relationship,
      isPrimary: relation.is_primary,
      createdAt: relation.created_at
    });
  } catch (err) {
    console.error('Error linking student to parent:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/parents/:id/students/:studentId/link
 * Unlink a student from a parent
 */
router.delete('/:id/students/:studentId/link', authenticate, async (req, res) => {
  try {
    const { id: parentId, studentId } = req.params;
    const requestingUserId = req.user.id;

    // Verify parent and authorization
    const { data: parent } = await supabase
      .from('parents')
      .select('id, profile_id')
      .eq('id', parentId)
      .single();

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    if (parent.profile_id !== requestingUserId) {
      // Check if admin/teacher
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', requestingUserId)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    const { error } = await supabase
      .from('student_parent_relations')
      .delete()
      .eq('student_id', studentId)
      .eq('parent_id', parentId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Error unlinking student from parent:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
