/**
 * School Partnership Workflow Service
 * RoboKids Vietnam - B2B school automation
 *
 * Features:
 * - LOI signature tracking
 * - Demo session scheduling
 * - Classroom roster sync
 * - Invoice generation
 * - Partnership renewal reminders
 */

import { supabaseAdmin } from '../lib/supabase.js';

/**
 * Partnership stages
 */
export const PartnershipStage = {
  LOI_PENDING: 'loi_pending',
  LOI_SIGNED: 'loi_signed',
  DEMO_SCHEDULED: 'demo_scheduled',
  DEMO_COMPLETED: 'demo_completed',
  CONTRACT_NEGOTIATION: 'contract_negotiation',
  ACTIVE: 'active',
  RENEWAL_DUE: 'renewal_due',
  EXPIRED: 'expired',
};

/**
 * Create partnership record for a school
 */
export async function createPartnership(schoolId, partnershipData = {}) {
  const { data, error } = await supabaseAdmin
    .from('school_partnerships')
    .insert({
      school_id: schoolId,
      current_stage: PartnershipStage.LOI_PENDING,
      stage_history: [{
        stage: PartnershipStage.LOI_PENDING,
        timestamp: new Date().toISOString(),
        action: 'partnership_created',
      }],
      ...partnershipData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Advance partnership to next stage
 */
export async function advancePartnershipStage(schoolId, newStage, metadata = {}) {
  const { data: partnership, error: findError } = await supabaseAdmin
    .from('school_partnerships')
    .select('*')
    .eq('school_id', schoolId)
    .single();

  if (findError || !partnership) {
    throw new Error('Partnership record not found');
  }

  const currentStage = partnership.current_stage;

  const { data, error } = await supabaseAdmin
    .from('school_partnerships')
    .update({
      current_stage: newStage,
      stage_history: [
        ...(partnership.stage_history || []),
        {
          stage: newStage,
          timestamp: new Date().toISOString(),
          action: metadata.action || 'stage_advanced',
          previous_stage: currentStage,
          metadata,
        },
      ],
      loi_signed_at: newStage === PartnershipStage.LOI_SIGNED ? new Date().toISOString() : partnership.loi_signed_at,
      demo_scheduled_at: newStage === PartnershipStage.DEMO_SCHEDULED ? new Date().toISOString() : partnership.demo_scheduled_at,
      demo_completed_at: newStage === PartnershipStage.DEMO_COMPLETED ? new Date().toISOString() : partnership.demo_completed_at,
      activated_at: newStage === PartnershipStage.ACTIVE ? new Date().toISOString() : partnership.activated_at,
    })
    .eq('school_id', schoolId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Track LOI signature
 */
export async function trackLOISignature(schoolId, signatureData) {
  const { data, error } = await supabaseAdmin
    .from('school_partnerships')
    .update({
      loi_document_url: signatureData.document_url,
      loi_signed_by: signatureData.signed_by,
      loi_signed_at: new Date().toISOString(),
      loi_additional_notes: signatureData.notes,
      current_stage: PartnershipStage.LOI_SIGNED,
      stage_history: signatureData.stage_history,
    })
    .eq('school_id', schoolId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Schedule demo session
 */
export async function scheduleDemoSession(schoolId, demoData) {
  const { data, error } = await supabaseAdmin
    .from('school_partnerships')
    .update({
      demo_date: demoData.demo_date,
      demo_type: demoData.demo_type || 'robotics_demo',
      demo_location: demoData.location,
      demo_notes: demoData.notes,
      demo_scheduled_at: new Date().toISOString(),
      current_stage: PartnershipStage.DEMO_SCHEDULED,
    })
    .eq('school_id', schoolId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Sync classroom roster from school
 */
export async function syncClassroomRoster(schoolId, rosterData) {
  const { students, classrooms } = rosterData;
  const results = {
    students_added: 0,
    students_updated: 0,
    classrooms_added: 0,
    classrooms_updated: 0,
  };

  // Sync classrooms first
  for (const classroom of classrooms || []) {
    const { data: existing } = await supabaseAdmin
      .from('school_classrooms')
      .select('id')
      .eq('school_id', schoolId)
      .eq('external_id', classroom.external_id)
      .single();

    if (existing) {
      await supabaseAdmin
        .from('school_classrooms')
        .update({
          name: classroom.name,
          grade_level: classroom.grade_level,
          student_count: classroom.student_count,
          synced_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      results.classrooms_updated++;
    } else {
      await supabaseAdmin
        .from('school_classrooms')
        .insert({
          school_id: schoolId,
          external_id: classroom.external_id,
          name: classroom.name,
          grade_level: classroom.grade_level,
          student_count: classroom.student_count,
          synced_at: new Date().toISOString(),
        });
      results.classrooms_added++;
    }
  }

  // Sync students
  for (const student of students || []) {
    const { data: existing } = await supabaseAdmin
      .from('school_students')
      .select('id')
      .eq('school_id', schoolId)
      .eq('external_id', student.external_id)
      .single();

    if (existing) {
      await supabaseAdmin
        .from('school_students')
        .update({
          full_name: student.full_name,
          grade_level: student.grade_level,
          classroom_external_id: student.classroom_external_id,
          synced_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      results.students_updated++;
    } else {
      await supabaseAdmin
        .from('school_students')
        .insert({
          school_id: schoolId,
          external_id: student.external_id,
          full_name: student.full_name,
          grade_level: student.grade_level,
          classroom_external_id: student.classroom_external_id,
          synced_at: new Date().toISOString(),
        });
      results.students_added++;
    }
  }

  // Update last sync timestamp
  await supabaseAdmin
    .from('school_partnerships')
    .update({ last_roster_sync: new Date().toISOString() })
    .eq('school_id', schoolId);

  return results;
}

/**
 * Generate invoice for school partnership
 */
export async function generatePartnershipInvoice(schoolId, invoiceData) {
  const {
    description,
    amount,
    quantity = 1,
    billing_period_start,
    billing_period_end,
    due_date,
  } = invoiceData;

  // Get school info
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('name, code')
    .eq('id', schoolId)
    .single();

  const invoiceNumber = `INV-${school?.code || 'SCH'}-${Date.now().toString(36).toUpperCase()}`;

  const { data: invoice, error } = await supabaseAdmin
    .from('school_invoices')
    .insert({
      school_id: schoolId,
      invoice_number: invoiceNumber,
      description,
      amount,
      quantity,
      total_amount: amount * quantity,
      billing_period_start,
      billing_period_end,
      due_date,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return { ...invoice, school_name: school?.name };
}

/**
 * Check for partnerships due for renewal
 */
export async function getPartnershipsDueForRenewal() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: partnerships } = await supabaseAdmin
    .from('school_partnerships')
    .select('*, schools(name, code, subscription_plan)')
    .eq('current_stage', PartnershipStage.ACTIVE)
    .lte('contract_end_date', thirtyDaysFromNow.toISOString());

  return partnerships || [];
}

/**
 * Trigger renewal reminders
 */
export async function triggerRenewalReminders() {
  const duePartnerships = await getPartnershipsDueForRenewal();
  const reminders = [];

  for (const partnership of duePartnerships) {
    // Check if reminder already sent recently
    if (partnership.renewal_reminder_sent_at) {
      const daysSinceReminder = Math.floor(
        (Date.now() - new Date(partnership.renewal_reminder_sent_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceReminder < 7) continue; // Only send reminder once a week
    }

    // Create notification for staff
    await supabaseAdmin
      .from('staff_notifications')
      .insert({
        user_id: partnership.school_id, // In real system, would notify assigned staff
        notification_type: 'renewal_reminder',
        title: `Partnership Renewal Due: ${partnership.schools?.name}`,
        body: `Partnership contract for ${partnership.schools?.name} expires on ${new Date(partnership.contract_end_date).toLocaleDateString()}. Contact school to renew.`,
        data: {
          school_id: partnership.school_id,
          school_name: partnership.schools?.name,
          contract_end_date: partnership.contract_end_date,
        },
      });

    // Update reminder sent timestamp
    await supabaseAdmin
      .from('school_partnerships')
      .update({ renewal_reminder_sent_at: new Date().toISOString() })
      .eq('id', partnership.id);

    reminders.push({
      school_id: partnership.school_id,
      school_name: partnership.schools?.name,
      contract_end_date: partnership.contract_end_date,
    });
  }

  return reminders;
}
