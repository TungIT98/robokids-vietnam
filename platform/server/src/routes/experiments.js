import express from 'express';
import crypto from 'crypto';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { analyzeExperimentResults, calculateMinSampleSize } from '../services/statistics.js';

const router = express.Router();

/**
 * Consistent hash for variant assignment
 * Ensures same user always gets same variant for same experiment
 */
function consistentHash(userId, experimentId, variants) {
  const hashInput = `${userId}:${experimentId}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  const hashNum = parseInt(hash.substring(0, 8), 16);
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let bucket = hashNum % totalWeight;

  for (const variant of variants) {
    bucket -= variant.weight;
    if (bucket < 0) {
      return variant;
    }
  }
  return variants[0];
}

/**
 * GET /api/experiments
 * List experiments (public for active, admin for all)
 */
router.get('/', async (req, res) => {
  try {
    const { status, include_archived } = req.query;

    let query = supabase
      .from('experiments')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    } else if (!include_archived) {
      query = query.neq('status', 'archived');
    }

    const { data: experiments, error } = await query;

    if (error) throw error;

    // For each experiment, get its variants
    const experimentsWithVariants = await Promise.all(
      experiments.map(async (exp) => {
        const { data: variants } = await supabase
          .from('variants')
          .select('*')
          .eq('experiment_id', exp.id)
          .order('created_at');

        return { ...exp, variants: variants || [] };
      })
    );

    res.json({ experiments: experimentsWithVariants });
  } catch (err) {
    console.error('List experiments error:', err);
    res.status(500).json({ error: 'Failed to list experiments' });
  }
});

/**
 * GET /api/experiments/:id
 * Get single experiment details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: experiment, error } = await supabase
      .from('experiments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Experiment not found' });
      }
      throw error;
    }

    const { data: variants } = await supabase
      .from('variants')
      .select('*')
      .eq('experiment_id', id)
      .order('created_at');

    res.json({ experiment: { ...experiment, variants: variants || [] } });
  } catch (err) {
    console.error('Get experiment error:', err);
    res.status(500).json({ error: 'Failed to get experiment' });
  }
});

/**
 * POST /api/experiments
 * Create new experiment (admin only)
 */
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, status = 'draft', start_date, end_date, variants } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Experiment name is required' });
    }

    const { data: experiment, error } = await supabaseAdmin
      .from('experiments')
      .insert({
        name,
        description,
        status,
        start_date: start_date || null,
        end_date: end_date || null
      })
      .select()
      .single();

    if (error) throw error;

    // Create variants if provided
    if (variants && Array.isArray(variants) && variants.length > 0) {
      const variantInserts = variants.map((v, index) => ({
        experiment_id: experiment.id,
        name: v.name,
        description: v.description || null,
        weight: v.weight || Math.floor(100 / variants.length),
        is_control: index === 0,
        metadata: v.metadata || {}
      }));

      const { data: createdVariants, error: variantError } = await supabaseAdmin
        .from('variants')
        .insert(variantInserts)
        .select();

      if (variantError) {
        console.error('Variant creation error:', variantError);
      }

      experiment.variants = createdVariants || [];
    }

    res.status(201).json({ experiment });
  } catch (err) {
    console.error('Create experiment error:', err);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

/**
 * PATCH /api/experiments/:id
 * Update experiment (admin only)
 */
router.patch('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, start_date, end_date } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;

    const { data: experiment, error } = await supabaseAdmin
      .from('experiments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ experiment });
  } catch (err) {
    console.error('Update experiment error:', err);
    res.status(500).json({ error: 'Failed to update experiment' });
  }
});

/**
 * POST /api/experiments/:id/variants
 * Add variant to experiment (admin only)
 */
router.post('/:id/variants', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, weight, is_control, metadata } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Variant name is required' });
    }

    // Check if experiment exists
    const { data: experiment } = await supabase
      .from('experiments')
      .select('id')
      .eq('id', id)
      .single();

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    // If is_control, unset other controls
    if (is_control) {
      await supabaseAdmin
        .from('variants')
        .update({ is_control: false })
        .eq('experiment_id', id);
    }

    const { data: variant, error } = await supabaseAdmin
      .from('variants')
      .insert({
        experiment_id: id,
        name,
        description,
        weight: weight || 50,
        is_control: is_control || false,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ variant });
  } catch (err) {
    console.error('Create variant error:', err);
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

/**
 * POST /api/experiments/:id/assign
 * Get variant assignment for a user
 * Uses consistent hashing for deterministic assignment
 */
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, override_variant_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Check if experiment is active
    const { data: experiment } = await supabase
      .from('experiments')
      .select('*')
      .eq('id', id)
      .single();

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    if (experiment.status !== 'running') {
      return res.status(400).json({ error: 'Experiment is not running' });
    }

    // Check date constraints
    const now = new Date();
    if (experiment.start_date && new Date(experiment.start_date) > now) {
      return res.status(400).json({ error: 'Experiment has not started yet' });
    }
    if (experiment.end_date && new Date(experiment.end_date) < now) {
      return res.status(400).json({ error: 'Experiment has ended' });
    }

    // Check for existing assignment
    const { data: existingAssignment } = await supabase
      .from('assignments')
      .select('*, variants(*)')
      .eq('experiment_id', id)
      .eq('user_id', user_id)
      .single();

    if (existingAssignment) {
      return res.json({
        assignment: existingAssignment,
        isOverride: false
      });
    }

    // Get variants
    const { data: variants } = await supabase
      .from('variants')
      .select('*')
      .eq('experiment_id', id)
      .order('created_at');

    if (!variants || variants.length === 0) {
      return res.status(400).json({ error: 'No variants defined for experiment' });
    }

    // Override for testing
    let selectedVariant;
    if (override_variant_id) {
      selectedVariant = variants.find(v => v.id === override_variant_id);
      if (!selectedVariant) {
        return res.status(400).json({ error: 'Invalid override variant_id' });
      }
    } else {
      selectedVariant = consistentHash(user_id, id, variants);
    }

    // Create assignment
    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({
        user_id,
        experiment_id: id,
        variant_id: selectedVariant.id,
        override: !!override_variant_id
      })
      .select()
      .single();

    if (error) {
      // Handle race condition - assignment was created by another request
      if (error.code === '23505') {
        const { data: retryAssignment } = await supabase
          .from('assignments')
          .select('*, variants(*)')
          .eq('experiment_id', id)
          .eq('user_id', user_id)
          .single();
        return res.json({ assignment: retryAssignment, isOverride: false });
      }
      throw error;
    }

    res.json({
      assignment: { ...assignment, variants: selectedVariant },
      isOverride: !!override_variant_id
    });
  } catch (err) {
    console.error('Assign variant error:', err);
    res.status(500).json({ error: 'Failed to assign variant' });
  }
});

/**
 * GET /api/experiments/:id/assignments
 * List all assignments for an experiment (admin only)
 */
router.get('/:id/assignments', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const { data: assignments, error, count } = await supabase
      .from('assignments')
      .select('*, variants(*)', { count: 'exact' })
      .eq('experiment_id', id)
      .order('assigned_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get variant distribution summary
    const distribution = {};
    for (const a of assignments) {
      const variantName = a.variants?.name || 'unknown';
      distribution[variantName] = (distribution[variantName] || 0) + 1;
    }

    res.json({
      assignments,
      distribution,
      total: count
    });
  } catch (err) {
    console.error('List assignments error:', err);
    res.status(500).json({ error: 'Failed to list assignments' });
  }
});

/**
 * POST /api/experiments/:id/events
 * Track metric event
 */
router.post('/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, metric_name, metric_value } = req.body;

    if (!metric_name || metric_value === undefined) {
      return res.status(400).json({ error: 'metric_name and metric_value are required' });
    }

    // Verify experiment exists
    const { data: experiment } = await supabase
      .from('experiments')
      .select('id')
      .eq('id', id)
      .single();

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    // Get variant for user if user_id provided
    let variantId = null;
    if (user_id) {
      const { data: assignment } = await supabase
        .from('assignments')
        .select('variant_id')
        .eq('experiment_id', id)
        .eq('user_id', user_id)
        .single();

      variantId = assignment?.variant_id;
    }

    // Insert metric
    const { data: metric, error } = await supabaseAdmin
      .from('metrics')
      .insert({
        experiment_id: id,
        variant_id: variantId,
        metric_name,
        metric_value,
        user_id: user_id || null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ metric });
  } catch (err) {
    console.error('Track event error:', err);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * POST /api/experiments/:id/events/batch
 * Track multiple metric events at once
 */
router.post('/:id/events/batch', async (req, res) => {
  try {
    const { id } = req.params;
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'events array is required' });
    }

    // Verify experiment exists
    const { data: experiment } = await supabase
      .from('experiments')
      .select('id')
      .eq('id', id)
      .single();

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    // Get assignments for all user_ids to map them to variant_ids
    const userIds = [...new Set(events.filter(e => e.user_id).map(e => e.user_id))];
    let assignmentsMap = {};

    if (userIds.length > 0) {
      const { data: assignments } = await supabase
        .from('assignments')
        .select('user_id, variant_id')
        .eq('experiment_id', id)
        .in('user_id', userIds);

      assignmentsMap = assignments.reduce((acc, a) => {
        acc[a.user_id] = a.variant_id;
        return acc;
      }, {});
    }

    // Prepare metrics for insert
    const metricsToInsert = events.map(event => ({
      experiment_id: id,
      variant_id: event.user_id ? assignmentsMap[event.user_id] || null : null,
      metric_name: event.metric_name,
      metric_value: event.metric_value,
      user_id: event.user_id || null
    }));

    const { data: metrics, error } = await supabaseAdmin
      .from('metrics')
      .insert(metricsToInsert)
      .select();

    if (error) throw error;

    res.status(201).json({ tracked: metrics.length, metrics });
  } catch (err) {
    console.error('Batch track events error:', err);
    res.status(500).json({ error: 'Failed to track events' });
  }
});

/**
 * GET /api/experiments/:id/results
 * Get statistical results for an experiment
 */
router.get('/:id/results', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get experiment with variants
    const { data: experiment } = await supabase
      .from('experiments')
      .select('*')
      .eq('id', id)
      .single();

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    const { data: variants } = await supabase
      .from('variants')
      .select('*')
      .eq('experiment_id', id);

    if (!variants || variants.length === 0) {
      return res.json({ experiment, results: { error: 'No variants defined' } });
    }

    // Get all metrics for this experiment grouped by variant
    const { data: allMetrics } = await supabase
      .from('metrics')
      .select('*')
      .eq('experiment_id', id);

    // Get assignment counts per variant
    const { data: assignments } = await supabase
      .from('assignments')
      .select('variant_id')
      .eq('experiment_id', id);

    const assignmentCounts = {};
    for (const a of assignments) {
      assignmentCounts[a.variant_id] = (assignmentCounts[a.variant_id] || 0) + 1;
    }

    // Group metrics by variant
    const metricsByVariant = {};
    for (const variant of variants) {
      metricsByVariant[variant.id] = allMetrics.filter(m => m.variant_id === variant.id);
    }

    // Calculate statistical significance
    const analysis = analyzeExperimentResults(metricsByVariant);

    // Add variant info and assignment counts
    const variantResults = {};
    for (const [variantId, result] of Object.entries(analysis.variants || {})) {
      const variant = variants.find(v => v.id === variantId);
      variantResults[variantId] = {
        ...result,
        variant: variant || { id: variantId, name: 'Unknown' },
        assignments: assignmentCounts[variantId] || 0
      };
    }

    const controlVariant = variants.find(v => v.is_control);
    const controlId = controlVariant?.id || variants[0]?.id;

    res.json({
      experiment: {
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        start_date: experiment.start_date,
        end_date: experiment.end_date
      },
      variants: variants.map(v => ({
        ...v,
        assignments: assignmentCounts[v.id] || 0
      })),
      results: {
        controlVariantId: analysis.controlVariantId,
        analysis: variantResults,
        summary: {
          ...analysis.summary,
          controlAssignments: assignmentCounts[controlId] || 0
        }
      },
      raw: {
        totalMetrics: allMetrics.length,
        variantDistribution: Object.fromEntries(
          variants.map(v => [v.name, assignmentCounts[v.id] || 0])
        )
      }
    });
  } catch (err) {
    console.error('Get results error:', err);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

/**
 * GET /api/experiments/:id/sample-size
 * Estimate required sample size for an experiment
 */
router.get('/:id/sample-size', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { baseline_rate = 0.1, mde = 0.1, confidence = 0.95, power = 0.8 } = req.query;

    const minSampleSize = calculateMinSampleSize(
      parseFloat(baseline_rate),
      parseFloat(mde),
      parseFloat(confidence),
      parseFloat(power)
    );

    res.json({
      experiment_id: id,
      parameters: {
        baseline_rate: parseFloat(baseline_rate),
        minimum_detectable_effect: parseFloat(mde),
        confidence_level: parseFloat(confidence),
        power: parseFloat(power)
      },
      required_sample_size_per_variant: minSampleSize,
      total_required: minSampleSize * 2
    });
  } catch (err) {
    console.error('Sample size error:', err);
    res.status(500).json({ error: 'Failed to calculate sample size' });
  }
});

/**
 * POST /api/experiments/:id/start
 * Start a draft experiment
 */
router.post('/:id/start', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: experiment, error } = await supabaseAdmin
      .from('experiments')
      .update({ status: 'running' })
      .eq('id', id)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) throw error;
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found or not in draft status' });
    }

    res.json({ experiment });
  } catch (err) {
    console.error('Start experiment error:', err);
    res.status(500).json({ error: 'Failed to start experiment' });
  }
});

/**
 * POST /api/experiments/:id/pause
 * Pause a running experiment
 */
router.post('/:id/pause', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: experiment, error } = await supabaseAdmin
      .from('experiments')
      .update({ status: 'paused' })
      .eq('id', id)
      .eq('status', 'running')
      .select()
      .single();

    if (error) throw error;
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found or not running' });
    }

    res.json({ experiment });
  } catch (err) {
    console.error('Pause experiment error:', err);
    res.status(500).json({ error: 'Failed to pause experiment' });
  }
});

/**
 * POST /api/experiments/:id/complete
 * Complete a running or paused experiment
 */
router.post('/:id/complete', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: experiment, error } = await supabaseAdmin
      .from('experiments')
      .update({ status: 'completed' })
      .eq('id', id)
      .in('status', ['running', 'paused'])
      .select()
      .single();

    if (error) throw error;
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found or not in progress' });
    }

    res.json({ experiment });
  } catch (err) {
    console.error('Complete experiment error:', err);
    res.status(500).json({ error: 'Failed to complete experiment' });
  }
});

/**
 * DELETE /api/experiments/:id
 * Archive an experiment (admin only)
 */
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Archive instead of hard delete
    const { error } = await supabaseAdmin
      .from('experiments')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Experiment archived' });
  } catch (err) {
    console.error('Archive experiment error:', err);
    res.status(500).json({ error: 'Failed to archive experiment' });
  }
});

export default router;
