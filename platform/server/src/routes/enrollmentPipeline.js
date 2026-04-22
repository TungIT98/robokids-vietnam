/**
 * Enrollment Pipeline API Routes
 * RoboKids Vietnam - Automated enrollment flow via Pipedream
 *
 * Endpoints for Pipedream webhook integrations:
 * - POST /api/pipeline/webhook - Generic webhook receiver
 * - POST /api/pipeline/lead - Create lead record
 * - POST /api/pipeline/qualify - Mark lead as qualified
 * - POST /api/pipeline/demo - Schedule demo
 * - POST /api/pipeline/enroll - Mark as enrolled
 * - POST /api/pipeline/onboard - Mark as onboarded
 * - GET /api/pipeline/stats - Get pipeline statistics
 * - GET /api/pipeline/:enrollmentId - Get pipeline status
 */

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  PipelineStage,
  createPipelineRecord,
  advancePipelineStage,
  getPipelineStats,
  getPipelineByEnrollmentId,
} from '../services/enrollmentPipeline.js';

const router = express.Router();

/**
 * POST /api/pipeline/webhook
 * Generic Pipedream webhook receiver
 * Accepts events from Pipedream workflows
 */
router.post('/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;

    console.log('[Pipeline Webhook] Received event:', event, data);

    // Route based on event type
    switch (event) {
      case 'lead.created':
        return handleLeadCreated(data);
      case 'lead.qualified':
        return handleLeadQualified(data);
      case 'demo.scheduled':
        return handleDemoScheduled(data);
      case 'demo.completed':
        return handleDemoCompleted(data);
      case 'enrollment.created':
        return handleEnrollmentCreated(data);
      case 'payment.completed':
        return handlePaymentCompleted(data);
      case 'student.onboarded':
        return handleStudentOnboarded(data);
      default:
        console.warn('[Pipeline Webhook] Unknown event type:', event);
        return res.json({ received: true, processed: false, reason: 'unknown_event' });
    }
  } catch (err) {
    console.error('[Pipeline Webhook] Error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }

  async function handleLeadCreated(data) {
    const { enrollment_id } = data;
    if (!enrollment_id) {
      return res.status(400).json({ error: 'enrollment_id required' });
    }
    const pipeline = await createPipelineRecord(enrollment_id, PipelineStage.LEAD);
    return res.json({ success: true, pipeline });
  }

  async function handleLeadQualified(data) {
    const { enrollment_id, qualification_data } = data;
    const pipeline = await advancePipelineStage(enrollment_id, PipelineStage.QUALIFIED, {
      action: 'lead_qualified',
      qualification_data,
    });
    return res.json({ success: true, pipeline });
  }

  async function handleDemoScheduled(data) {
    const { enrollment_id, demo_date, demo_type } = data;
    const pipeline = await advancePipelineStage(enrollment_id, PipelineStage.DEMO_SCHEDULED, {
      action: 'demo_scheduled',
      demo_date,
      demo_type,
    });
    return res.json({ success: true, pipeline });
  }

  async function handleDemoCompleted(data) {
    // Demo completed doesn't change stage, just records the completion
    return res.json({ success: true, message: 'Demo completion recorded' });
  }

  async function handleEnrollmentCreated(data) {
    const { enrollment_id } = data;
    const pipeline = await advancePipelineStage(enrollment_id, PipelineStage.ENROLLED, {
      action: 'enrollment_created',
    });
    return res.json({ success: true, pipeline });
  }

  async function handlePaymentCompleted(data) {
    const { enrollment_id, payment_id, amount } = data;
    const pipeline = await advancePipelineStage(enrollment_id, PipelineStage.ENROLLED, {
      action: 'payment_completed',
      payment_id,
      amount,
    });
    return res.json({ success: true, pipeline });
  }

  async function handleStudentOnboarded(data) {
    const { enrollment_id, student_id } = data;
    const pipeline = await advancePipelineStage(enrollment_id, PipelineStage.ONBOARDED, {
      action: 'student_onboarded',
      student_id,
    });
    return res.json({ success: true, pipeline });
  }
});

/**
 * POST /api/pipeline/lead
 * Create a new lead in the pipeline
 */
router.post('/lead', async (req, res) => {
  try {
    const { enrollment_id } = req.body;

    if (!enrollment_id) {
      return res.status(400).json({ error: 'enrollment_id required' });
    }

    // Check if pipeline record already exists
    const existing = await getPipelineByEnrollmentId(enrollment_id);
    if (existing) {
      return res.status(409).json({ error: 'Pipeline record already exists', pipeline: existing });
    }

    const pipeline = await createPipelineRecord(enrollment_id, PipelineStage.LEAD);
    res.status(201).json({ success: true, pipeline });
  } catch (err) {
    console.error('[Pipeline] Error creating lead:', err);
    res.status(500).json({ error: 'Failed to create pipeline record' });
  }
});

/**
 * POST /api/pipeline/qualify
 * Mark a lead as qualified
 */
router.post('/qualify', async (req, res) => {
  try {
    const { enrollment_id, qualification_data } = req.body;

    if (!enrollment_id) {
      return res.status(400).json({ error: 'enrollment_id required' });
    }

    const pipeline = await advancePipelineStage(enrollment_id, PipelineStage.QUALIFIED, {
      action: 'manual_qualification',
      qualification_data: qualification_data || {},
    });

    res.json({ success: true, pipeline });
  } catch (err) {
    console.error('[Pipeline] Error qualifying lead:', err);
    if (err.message.includes('Invalid stage transition')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update pipeline' });
  }
});

/**
 * POST /api/pipeline/demo
 * Schedule a demo session
 */
router.post('/demo', async (req, res) => {
  try {
    const { enrollment_id, demo_date, demo_type = 'robotics_demo', notes } = req.body;

    if (!enrollment_id || !demo_date) {
      return res.status(400).json({ error: 'enrollment_id and demo_date required' });
    }

    const pipeline = await advancePipelineStage(enrollment_id, PipelineStage.DEMO_SCHEDULED, {
      action: 'demo_scheduled',
      demo_date,
      demo_type,
      notes,
    });

    res.json({ success: true, pipeline });
  } catch (err) {
    console.error('[Pipeline] Error scheduling demo:', err);
    if (err.message.includes('Invalid stage transition')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to schedule demo' });
  }
});

/**
 * POST /api/pipeline/enroll
 * Mark as enrolled (payment completed)
 */
router.post('/enroll', async (req, res) => {
  try {
    const { enrollment_id, payment_id, amount } = req.body;

    if (!enrollment_id) {
      return res.status(400).json({ error: 'enrollment_id required' });
    }

    const pipeline = await advancePipelineStage(enrollment_id, PipelineStage.ENROLLED, {
      action: 'enrollment_completed',
      payment_id,
      amount,
    });

    res.json({ success: true, pipeline });
  } catch (err) {
    console.error('[Pipeline] Error marking enrolled:', err);
    if (err.message.includes('Invalid stage transition')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update enrollment' });
  }
});

/**
 * POST /api/pipeline/onboard
 * Mark as onboarded (first lesson completed)
 */
router.post('/onboard', async (req, res) => {
  try {
    const { enrollment_id, student_id, first_lesson_id } = req.body;

    if (!enrollment_id) {
      return res.status(400).json({ error: 'enrollment_id required' });
    }

    const pipeline = await advancePipelineStage(enrollment_id, PipelineStage.ONBOARDED, {
      action: 'student_onboarded',
      student_id,
      first_lesson_id,
    });

    res.json({ success: true, pipeline });
  } catch (err) {
    console.error('[Pipeline] Error marking onboarded:', err);
    if (err.message.includes('Invalid stage transition')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update onboard status' });
  }
});

/**
 * GET /api/pipeline/stats
 * Get pipeline statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getPipelineStats();
    res.json(stats);
  } catch (err) {
    console.error('[Pipeline] Error getting stats:', err);
    res.status(500).json({ error: 'Failed to get pipeline stats' });
  }
});

/**
 * GET /api/pipeline/:enrollmentId
 * Get pipeline status for an enrollment
 */
router.get('/:enrollmentId', async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const pipeline = await getPipelineByEnrollmentId(enrollmentId);

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline record not found' });
    }

    res.json(pipeline);
  } catch (err) {
    console.error('[Pipeline] Error getting pipeline:', err);
    res.status(500).json({ error: 'Failed to get pipeline record' });
  }
});

/**
 * GET /api/pipeline
 * List all enrollments in pipeline
 */
router.get('/', async (req, res) => {
  try {
    const { stage, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('enrollment_pipeline')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (stage) {
      query = query.eq('current_stage', stage);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      pipeline: data,
      count: data.length,
    });
  } catch (err) {
    console.error('[Pipeline] Error listing pipeline:', err);
    res.status(500).json({ error: 'Failed to list pipeline' });
  }
});

export default router;
