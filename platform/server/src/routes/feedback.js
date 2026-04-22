import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

/**
 * POST /api/feedback
 * Submit beta feedback (NPS score + usage data + comments)
 */
router.post('/', async (req, res) => {
  try {
    const {
      student_id,
      parent_email,
      parent_name,
      nps_score,
      lessons_completed,
      total_time_minutes,
      missions_completed,
      feedback_text,
      likes_text,
      improvements_text,
      would_recommend,
      had_technical_issues,
      technical_issues_text,
      submission_week,
    } = req.body;

    // Validate required fields
    if (!parent_email || !parent_name || nps_score === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: parent_email, parent_name, nps_score',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parent_email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate NPS score (0-10)
    const score = parseInt(nps_score);
    if (isNaN(score) || score < 0 || score > 10) {
      return res.status(400).json({ error: 'NPS score must be between 0 and 10' });
    }

    // Validate numeric optional fields
    if (student_id !== undefined && student_id !== null) {
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('id', student_id)
        .single();
      if (!student) {
        return res.status(400).json({ error: 'Invalid student_id' });
      }
    }

    // Create feedback record
    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from('beta_feedback')
      .insert({
        student_id: student_id || null,
        parent_email: parent_email.toLowerCase().trim(),
        parent_name: parent_name.trim(),
        nps_score: score,
        lessons_completed: lessons_completed ? parseInt(lessons_completed) : 0,
        total_time_minutes: total_time_minutes ? parseInt(total_time_minutes) : 0,
        missions_completed: missions_completed ? parseInt(missions_completed) : 0,
        feedback_text: feedback_text ? feedback_text.trim() : null,
        likes_text: likes_text ? likes_text.trim() : null,
        improvements_text: improvements_text ? improvements_text.trim() : null,
        would_recommend: would_recommend !== undefined ? Boolean(would_recommend) : null,
        had_technical_issues: had_technical_issues ? Boolean(had_technical_issues) : false,
        technical_issues_text: technical_issues_text ? technical_issues_text.trim() : null,
        submission_week: submission_week ? parseInt(submission_week) : null,
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Feedback creation error:', feedbackError);
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }

    // Calculate NPS category for response
    const npsCategory = score <= 6 ? 'detractor' : score <= 8 ? 'passive' : 'promoter';

    res.status(201).json({
      success: true,
      feedback_id: feedback.id,
      nps_category: npsCategory,
      message: 'Thank you for your feedback! It helps us improve RoboKids.',
    });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/feedback
 * List all feedback entries (admin only)
 */
router.get('/', async (req, res) => {
  try {
    const { week, category, limit = 100 } = req.query;

    let query = supabaseAdmin
      .from('beta_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (week) {
      query = query.eq('submission_week', parseInt(week));
    }
    if (category) {
      query = query.eq('nps_category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ feedback_entries: data });
  } catch (err) {
    console.error('Error listing feedback:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

/**
 * GET /api/feedback/summary
 * Get weekly summary statistics (for CS reporting)
 */
router.get('/summary', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('beta_feedback_weekly_summary')
      .select('*')
      .order('submission_week', { ascending: false });

    if (error) throw error;

    // Calculate overall NPS if data exists
    const { data: overall } = await supabaseAdmin
      .from('beta_feedback')
      .select('nps_score, nps_category');

    let overallNPS = null;
    if (overall && overall.length > 0) {
      const promoters = overall.filter(f => f.nps_category === 'promoter').length;
      const detractors = overall.filter(f => f.nps_category === 'detractor').length;
      const total = overall.length;
      overallNPS = Math.round(((promoters - detractors) / total) * 100);
    }

    res.json({
      weekly_summaries: data,
      overall_nps: overallNPS,
      total_submissions: overall ? overall.length : 0,
    });
  } catch (err) {
    console.error('Error fetching feedback summary:', err);
    res.status(500).json({ error: 'Failed to fetch feedback summary' });
  }
});

/**
 * GET /api/feedback/trend
 * Get NPS trend data
 */
router.get('/trend', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('beta_nps_trend')
      .select('*')
      .order('submission_date', { ascending: true });

    if (error) throw error;

    res.json({ nps_trend: data });
  } catch (err) {
    console.error('Error fetching NPS trend:', err);
    res.status(500).json({ error: 'Failed to fetch NPS trend' });
  }
});

/**
 * GET /api/feedback/:id
 * Get a specific feedback entry
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('beta_feedback')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Feedback entry not found' });
    }

    res.json({ feedback: data });
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

export default router;
