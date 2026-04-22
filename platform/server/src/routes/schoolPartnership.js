/**
 * School Partnership Workflow API Routes
 * RoboKids Vietnam - B2B school automation
 *
 * Endpoints:
 * - POST /api/school-partnership/webhook - Generic webhook
 * - POST /api/school-partnership/:schoolId/loi - Track LOI signature
 * - POST /api/school-partnership/:schoolId/demo - Schedule demo
 * - POST /api/school-partnership/:schoolId/roster - Sync roster
 * - POST /api/school-partnership/:schoolId/invoice - Generate invoice
 * - POST /api/school-partnership/process-renewals - Check renewal reminders
 */

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createPartnership,
  advancePartnershipStage,
  trackLOISignature,
  scheduleDemoSession,
  syncClassroomRoster,
  generatePartnershipInvoice,
  triggerRenewalReminders,
  PartnershipStage,
} from '../services/schoolPartnership.js';

const router = express.Router();

/**
 * POST /api/school-partnership/webhook
 * Generic webhook receiver for school partnership events
 */
router.post('/webhook', async (req, res) => {
  try {
    const { event, school_id, data } = req.body;

    console.log('[SchoolPartnership Webhook] Event:', event, 'School:', school_id);

    switch (event) {
      case 'loi.signed':
        return handleLOISigned(school_id, data);
      case 'demo.scheduled':
        return handleDemoScheduled(school_id, data);
      case 'roster.sync':
        return handleRosterSync(school_id, data);
      case 'invoice.generated':
        return handleInvoiceGenerated(school_id, data);
      default:
        return res.json({ received: true, processed: false });
    }
  } catch (err) {
    console.error('[SchoolPartnership Webhook] Error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }

  async function handleLOISigned(schoolId, loiData) {
    const partnership = await trackLOISignature(schoolId, loiData);
    return res.json({ success: true, partnership });
  }

  async function handleDemoScheduled(schoolId, demoData) {
    const partnership = await scheduleDemoSession(schoolId, demoData);
    return res.json({ success: true, partnership });
  }

  async function handleRosterSync(schoolId, rosterData) {
    const results = await syncClassroomRoster(schoolId, rosterData);
    return res.json({ success: true, results });
  }

  async function handleInvoiceGenerated(schoolId, invoiceData) {
    const invoice = await generatePartnershipInvoice(schoolId, invoiceData);
    return res.json({ success: true, invoice });
  }
});

/**
 * POST /api/school-partnership/:schoolId/loi
 * Track LOI signature
 */
router.post('/:schoolId/loi', authenticate, requireRole('robokids_staff', 'school_admin'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { document_url, signed_by, notes } = req.body;

    if (!document_url || !signed_by) {
      return res.status(400).json({ error: 'document_url and signed_by required' });
    }

    // Get existing partnership
    const { data: existing } = await supabaseAdmin
      .from('school_partnerships')
      .select('*')
      .eq('school_id', schoolId)
      .single();

    let partnership;
    if (existing) {
      partnership = await trackLOISignature(schoolId, { document_url, signed_by, notes });
    } else {
      // Create new partnership with LOI
      partnership = await createPartnership(schoolId, {
        loi_document_url: document_url,
        loi_signed_by: signed_by,
        loi_signed_at: new Date().toISOString(),
        loi_additional_notes: notes,
        current_stage: PartnershipStage.LOI_SIGNED,
        stage_history: [{
          stage: PartnershipStage.LOI_SIGNED,
          timestamp: new Date().toISOString(),
          action: 'loi_signed',
        }],
      });
    }

    res.json({ success: true, partnership });
  } catch (err) {
    console.error('[SchoolPartnership] LOI error:', err);
    res.status(500).json({ error: 'Failed to track LOI' });
  }
});

/**
 * POST /api/school-partnership/:schoolId/demo
 * Schedule demo session
 */
router.post('/:schoolId/demo', authenticate, requireRole('robokids_staff', 'school_admin'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { demo_date, demo_type, location, notes } = req.body;

    if (!demo_date) {
      return res.status(400).json({ error: 'demo_date required' });
    }

    const partnership = await scheduleDemoSession(schoolId, { demo_date, demo_type, location, notes });
    res.json({ success: true, partnership });
  } catch (err) {
    console.error('[SchoolPartnership] Demo scheduling error:', err);
    res.status(500).json({ error: 'Failed to schedule demo' });
  }
});

/**
 * POST /api/school-partnership/:schoolId/roster
 * Sync classroom roster
 */
router.post('/:schoolId/roster', authenticate, requireRole('robokids_staff', 'school_admin'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { students, classrooms } = req.body;

    if (!students && !classrooms) {
      return res.status(400).json({ error: 'students or classrooms data required' });
    }

    const results = await syncClassroomRoster(schoolId, { students, classrooms });
    res.json({ success: true, results });
  } catch (err) {
    console.error('[SchoolPartnership] Roster sync error:', err);
    res.status(500).json({ error: 'Failed to sync roster' });
  }
});

/**
 * POST /api/school-partnership/:schoolId/invoice
 * Generate partnership invoice
 */
router.post('/:schoolId/invoice', authenticate, requireRole('robokids_staff'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { description, amount, quantity, billing_period_start, billing_period_end, due_date } = req.body;

    if (!description || !amount) {
      return res.status(400).json({ error: 'description and amount required' });
    }

    const invoice = await generatePartnershipInvoice(schoolId, {
      description,
      amount,
      quantity,
      billing_period_start,
      billing_period_end,
      due_date,
    });

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    console.error('[SchoolPartnership] Invoice generation error:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

/**
 * POST /api/school-partnership/process-renewals
 * Process partnership renewal reminders
 */
router.post('/process-renewals', authenticate, requireRole('robokids_staff'), async (req, res) => {
  try {
    const reminders = await triggerRenewalReminders();
    res.json({
      success: true,
      reminders_sent: reminders.length,
      reminders,
      processed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[SchoolPartnership] Renewal processing error:', err);
    res.status(500).json({ error: 'Failed to process renewals' });
  }
});

/**
 * GET /api/school-partnership/:schoolId
 * Get partnership details
 */
router.get('/:schoolId', authenticate, requireRole('robokids_staff', 'school_admin'), async (req, res) => {
  try {
    const { schoolId } = req.params;

    const { data: partnership, error } = await supabaseAdmin
      .from('school_partnerships')
      .select('*, schools(name, code)')
      .eq('school_id', schoolId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!partnership) {
      return res.status(404).json({ error: 'Partnership not found' });
    }

    res.json(partnership);
  } catch (err) {
    console.error('[SchoolPartnership] Get error:', err);
    res.status(500).json({ error: 'Failed to get partnership' });
  }
});

/**
 * GET /api/school-partnership
 * List all partnerships
 */
router.get('/', authenticate, requireRole('robokids_staff'), async (req, res) => {
  try {
    const { stage, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('school_partnerships')
      .select('*, schools(name, code, subscription_plan)')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (stage) {
      query = query.eq('current_stage', stage);
    }

    const { data: partnerships, error } = await query;

    if (error) throw error;

    res.json({
      partnerships,
      count: partnerships?.length || 0,
    });
  } catch (err) {
    console.error('[SchoolPartnership] List error:', err);
    res.status(500).json({ error: 'Failed to list partnerships' });
  }
});

export default router;
