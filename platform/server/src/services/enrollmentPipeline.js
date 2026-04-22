/**
 * Enrollment Pipeline Automation Service
 * RoboKids Vietnam - Automated enrollment flow
 *
 * Pipeline Stages:
 * 1. lead - Initial contact captured
 * 2. qualified - Lead validated and qualified
 * 3. demo_scheduled - Demo session booked
 * 4. enrolled - Payment completed, student registered
 * 5. onboarded - Student started first lesson
 *
 * Conversion Tracking at each stage
 */

import { supabaseAdmin } from '../lib/supabase.js';

// Pipeline stages in order
export const PipelineStage = {
  LEAD: 'lead',
  QUALIFIED: 'qualified',
  DEMO_SCHEDULED: 'demo_scheduled',
  ENROLLED: 'enrolled',
  ONBOARDED: 'onboarded',
};

// Stage transitions with valid paths
const VALID_TRANSITIONS = {
  [PipelineStage.LEAD]: [PipelineStage.QUALIFIED, PipelineStage.QUALIFIED], // Can skip to qualified
  [PipelineStage.QUALIFIED]: [PipelineStage.DEMO_SCHEDULED],
  [PipelineStage.DEMO_SCHEDULED]: [PipelineStage.ENROLLED, PipelineStage.QUALIFIED], // Can revert
  [PipelineStage.ENROLLED]: [PipelineStage.ONBOARDED],
  [PipelineStage.ONBOARDED]: [], // Terminal state
};

/**
 * Create a new enrollment pipeline record
 */
export async function createPipelineRecord(enrollmentId, initialStage = PipelineStage.LEAD) {
  const { data, error } = await supabaseAdmin
    .from('enrollment_pipeline')
    .insert({
      enrollment_id: enrollmentId,
      current_stage: initialStage,
      stage_history: [{
        stage: initialStage,
        timestamp: new Date().toISOString(),
        action: 'pipeline_created',
      }],
      conversion_metrics: {
        days_in_stage: 0,
        interactions_count: 0,
        last_interaction_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update pipeline stage and track conversion
 */
export async function advancePipelineStage(enrollmentId, newStage, metadata = {}) {
  // Get current pipeline record
  const { data: pipeline, error: findError } = await supabaseAdmin
    .from('enrollment_pipeline')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .single();

  if (findError || !pipeline) {
    throw new Error('Pipeline record not found');
  }

  const currentStage = pipeline.current_stage;

  // Validate transition
  if (!isValidTransition(currentStage, newStage)) {
    throw new Error(`Invalid stage transition: ${currentStage} -> ${newStage}`);
  }

  // Calculate time in previous stage
  const lastStageEntry = pipeline.stage_history[pipeline.stage_history.length - 1];
  const timeInPreviousStage = lastStageEntry
    ? Math.floor((Date.now() - new Date(lastStageEntry.timestamp).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Update pipeline record
  const { data, error } = await supabaseAdmin
    .from('enrollment_pipeline')
    .update({
      current_stage: newStage,
      stage_history: [
        ...pipeline.stage_history,
        {
          stage: newStage,
          timestamp: new Date().toISOString(),
          action: metadata.action || 'stage_advanced',
          previous_stage: currentStage,
          time_in_previous_stage_days: timeInPreviousStage,
          metadata,
        },
      ],
      conversion_metrics: {
        ...pipeline.conversion_metrics,
        last_interaction_at: new Date().toISOString(),
        interactions_count: (pipeline.conversion_metrics?.interactions_count || 0) + 1,
      },
      completed_at: newStage === PipelineStage.ONBOARDED ? new Date().toISOString() : null,
    })
    .eq('enrollment_id', enrollmentId)
    .select()
    .single();

  if (error) throw error;

  // Update conversion metrics
  await trackConversion(enrollmentId, currentStage, newStage);

  return data;
}

/**
 * Check if a stage transition is valid
 */
function isValidTransition(fromStage, toStage) {
  const validNextStages = VALID_TRANSITIONS[fromStage] || [];
  return validNextStages.includes(toStage);
}

/**
 * Track conversion between stages
 */
async function trackConversion(enrollmentId, fromStage, toStage) {
  try {
    // Update overall conversion stats
    await supabaseAdmin.rpc('track_stage_conversion', {
      p_enrollment_id: enrollmentId,
      p_from_stage: fromStage,
      p_to_stage: toStage,
    });
  } catch (err) {
    // Don't fail the main operation if tracking fails
    console.error('Conversion tracking error:', err);
  }
}

/**
 * Get pipeline statistics
 */
export async function getPipelineStats() {
  const { data, error } = await supabaseAdmin
    .from('enrollment_pipeline')
    .select('*');

  if (error) throw error;

  const stats = {
    total_leads: 0,
    by_stage: {},
    conversion_rates: {},
    avg_time_in_stage: {},
  };

  // Count by stage
  for (const record of data) {
    stats.total_leads++;
    stats.by_stage[record.current_stage] = (stats.by_stage[record.current_stage] || 0) + 1;
  }

  // Calculate conversion rates
  const stageOrder = Object.values(PipelineStage);
  for (let i = 0; i < stageOrder.length - 1; i++) {
    const fromStage = stageOrder[i];
    const toStage = stageOrder[i + 1];
    const fromCount = stats.by_stage[fromStage] || 0;
    const toCount = stats.by_stage[toStage] || 0;

    if (fromCount > 0) {
      stats.conversion_rates[`${fromStage}_to_${toStage}`] = {
        from: fromCount,
        to: toCount,
        rate: ((toCount / fromCount) * 100).toFixed(2) + '%',
      };
    }
  }

  return stats;
}

/**
 * Get enrollment pipeline record
 */
export async function getPipelineByEnrollmentId(enrollmentId) {
  const { data, error } = await supabaseAdmin
    .from('enrollment_pipeline')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
