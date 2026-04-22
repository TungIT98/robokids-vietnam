/**
 * Live Classes API routes for RoboKids Vietnam
 * Jitsi-integrated live class sessions
 */

import express from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/live-classes
 * List available live class sessions
 */
router.get('/', async (req, res) => {
  try {
    const { data: sessions, error } = await supabase
      .from('live_classes')
      .select('*')
      .eq('status', 'scheduled')
      .or('status.eq.scheduled,status.eq.live')
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    res.json({
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        teacherId: s.teacher_id,
        scheduledAt: s.scheduled_at,
        durationMinutes: s.duration_minutes,
        maxStudents: s.max_students,
        status: s.status,
        jitsiRoom: s.jitsi_room,
      })),
    });
  } catch (error) {
    console.error('Error fetching live classes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/live-classes/enrollments
 * Get current user's enrolled live class sessions
 */
router.get('/enrollments', authenticate, async (req, res) => {
  try {
    const { data: enrollments, error } = await supabase
      .from('live_class_enrollments')
      .select(`
        *,
        live_class:live_classes(*)
      `)
      .eq('student_id', req.user.id);

    if (error) throw error;

    res.json({
      enrollments: enrollments.map(e => ({
        id: e.id,
        sessionId: e.live_class_id,
        enrolledAt: e.enrolled_at,
        session: e.live_class ? {
          id: e.live_class.id,
          title: e.live_class.title,
          description: e.live_class.description,
          teacherId: e.live_class.teacher_id,
          scheduledAt: e.live_class.scheduled_at,
          durationMinutes: e.live_class.duration_minutes,
          maxStudents: e.live_class.max_students,
          status: e.live_class.status,
          jitsiRoom: e.live_class.jitsi_room,
        } : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/live-classes/:sessionId
 * Get a specific live class session details
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from('live_classes')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Session not found' });
      }
      throw error;
    }

    // Get enrollment count
    const { count: enrolledCount } = await supabase
      .from('live_class_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('live_class_id', sessionId)
      .then(({ count }) => ({ count: count || 0 }));

    res.json({
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        teacherId: session.teacher_id,
        scheduledAt: session.scheduled_at,
        durationMinutes: session.duration_minutes,
        maxStudents: session.max_students,
        enrolledCount,
        status: session.status,
        jitsiRoom: session.jitsi_room,
      },
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/live-classes/:sessionId/enroll
 * Enroll in a live class session
 */
router.post('/:sessionId/enroll', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id;

    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('live_classes')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Session not found' });
      }
      throw sessionError;
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('live_class_enrollments')
      .select('*')
      .eq('live_class_id', sessionId)
      .eq('student_id', studentId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already enrolled in this session' });
    }

    // Check max students
    const { count: enrolledCount } = await supabase
      .from('live_class_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('live_class_id', sessionId)
      .then(({ count }) => ({ count: count || 0 }));

    if (enrolledCount >= session.max_students) {
      return res.status(400).json({ error: 'Session is full' });
    }

    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('live_class_enrollments')
      .insert({
        live_class_id: sessionId,
        student_id: studentId,
        enrolled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (enrollError) throw enrollError;

    res.json({
      enrollment: {
        id: enrollment.id,
        sessionId: enrollment.live_class_id,
        enrolledAt: enrollment.enrolled_at,
      },
    });
  } catch (error) {
    console.error('Error enrolling:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/live-classes/:sessionId/enroll
 * Unenroll from a live class session
 */
router.delete('/:sessionId/enroll', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id;

    const { error } = await supabase
      .from('live_class_enrollments')
      .delete()
      .eq('live_class_id', sessionId)
      .eq('student_id', studentId);

    if (error) throw error;

    res.json({ message: 'Successfully unenrolled' });
  } catch (error) {
    console.error('Error unenrolling:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/live-classes/:sessionId/jitsi
 * Create or get Jitsi room for a session
 */
router.post('/:sessionId/jitsi', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('live_classes')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Session not found' });
      }
      throw sessionError;
    }

    // Generate Jitsi room name if not exists
    if (!session.jitsi_room) {
      const jitsiRoom = `robokids-live-${sessionId}-${Date.now()}`;

      const { data: updated, error: updateError } = await supabase
        .from('live_classes')
        .update({
          jitsi_room: jitsiRoom,
          status: 'live',
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({ jitsiRoom: jitsiRoom });
    }

    res.json({ jitsiRoom: session.jitsi_room });
  } catch (error) {
    console.error('Error creating Jitsi room:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/live-classes/:sessionId/jitsi
 * Get Jitsi room info for a session
 */
router.get('/:sessionId/jitsi', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from('live_classes')
      .select('jitsi_room, status')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Session not found' });
      }
      throw error;
    }

    if (!session.jitsi_room) {
      return res.status(404).json({ error: 'Jitsi room not created yet' });
    }

    res.json({ jitsiRoom: session.jitsi_room });
  } catch (error) {
    console.error('Error fetching Jitsi room:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
