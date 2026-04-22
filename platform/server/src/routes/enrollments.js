import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createStudent, generateStudentEmail } from '../services/student.js';

const router = express.Router();

/**
 * Helper function to create enrollment status change notification
 * Called after enrollment status is updated
 */
async function createEnrollmentNotification(enrollment, oldStatus, newStatus) {
  try {
    // Skip if no status change
    if (oldStatus === newStatus) return;

    // Map status to notification content
    const notificationContent = {
      enrolled: {
        title: '🎉 Welcome to RoboKids!',
        body: `Your child ${enrollment.child_name} has been enrolled in RoboKids! Check the schedule for upcoming classes.`,
        type: 'enrollment_change'
      },
      rejected: {
        title: 'Enrollment Update',
        body: `Unfortunately, we couldn't process enrollment for ${enrollment.child_name} at this time. Please contact us for more information.`,
        type: 'enrollment_change'
      },
      contacted: {
        title: '📞 We will contact you soon',
        body: `Our team will reach out to you via Zalo within 24 hours regarding enrollment for ${enrollment.child_name}.`,
        type: 'enrollment_change'
      },
      cancelled: {
        title: 'Enrollment Cancelled',
        body: `Enrollment for ${enrollment.child_name} has been cancelled. Contact us if you have questions.`,
        type: 'enrollment_change'
      }
    };

    const content = notificationContent[newStatus];
    if (!content) return;

    // Look up parent by email
    const { data: parent } = await supabaseAdmin
      .from('parents')
      .select('id')
      .eq('email', enrollment.email.toLowerCase())
      .single();

    if (!parent) {
      console.log(`No parent found with email ${enrollment.email} for enrollment notification`);
      return;
    }

    // Create the notification
    await supabaseAdmin
      .from('parent_notifications')
      .insert({
        parent_id: parent.id,
        notification_type: content.type,
        title: content.title,
        body: content.body,
        data: {
          enrollment_id: enrollment.id,
          old_status: oldStatus,
          new_status: newStatus,
          child_name: enrollment.child_name
        }
      });

    console.log(`Enrollment notification created for parent ${parent.id}: ${newStatus}`);
  } catch (err) {
    // Log but don't throw - notification failure shouldn't break enrollment flow
    console.error('Error creating enrollment notification:', err);
  }
}

/**
 * Auto-create student account when enrollment is approved.
 * Called when enrollment status transitions to 'enrolled'.
 */
async function createStudentFromEnrollment(enrollment) {
  try {
    const shortId = enrollment.id.slice(0, 8);
    const studentEmail = generateStudentEmail(enrollment.child_name, shortId);

    // Create student auth account
    const { user, tempPassword, loginEmail } = await createStudent({
      name: enrollment.child_name,
      age: enrollment.child_age,
      parentEmail: enrollment.email,
      studentEmail,
    });

    // Create profile record for the student
    await supabaseAdmin.from('profiles').insert({
      id: user.id,
      email: loginEmail,
      full_name: enrollment.child_name,
      role: 'student',
    });

    // Look up parent account by email to create the relation
    const { data: parent } = await supabaseAdmin
      .from('parents')
      .select('id')
      .eq('email', enrollment.email.toLowerCase())
      .single();

    if (parent) {
      // Create students record
      const { data: studentRecord } = await supabaseAdmin
        .from('students')
        .insert({
          profile_id: user.id,
          date_of_birth: new Date(
            new Date().getFullYear() - enrollment.child_age, 0, 1
          ).toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (studentRecord) {
        // Link student to parent
        await supabaseAdmin.from('student_parent_relations').insert({
          student_id: studentRecord.id,
          parent_id: parent.id,
          relationship: 'parent',
          is_primary: true,
        });
      }
    }

    console.log(`Student account created for enrollment ${enrollment.id}: ${loginEmail} (temp: ${tempPassword})`);
    return { loginEmail, tempPassword, userId: user.id };
  } catch (err) {
    // Log but don't fail the enrollment status update
    console.error('Error auto-creating student account:', err);
    return null;
  }
}

/**
 * POST /api/enrollments
 * Create a new parent enrollment for the beta program
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      parent_name,
      email,
      phone,
      child_name,
      child_age,
      class_schedule,
      consent_data_processing,
      consent_marketing,
    } = req.body;

    // Validate required fields
    if (!parent_name || !email || !phone || !child_name || !child_age || !class_schedule) {
      return res.status(400).json({
        error: 'Missing required fields: parent_name, email, phone, child_name, child_age, class_schedule',
      });
    }

    if (!consent_data_processing) {
      return res.status(400).json({
        error: 'Consent to data processing is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate phone (9-11 digits)
    const phoneDigits = phone.replace(/\s/g, '');
    if (!/^[0-9]{9,11}$/.test(phoneDigits)) {
      return res.status(400).json({ error: 'Invalid phone number (9-11 digits required)' });
    }

    // Validate child age (6-16)
    const age = parseInt(child_age);
    if (isNaN(age) || age < 6 || age > 16) {
      return res.status(400).json({ error: 'Child age must be between 6 and 16' });
    }

    // Check if enrollment already exists for this email
    const { data: existing } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'An enrollment with this email already exists. We will contact you shortly.',
      });
    }

    // Create enrollment record
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .insert({
        parent_name: parent_name.trim(),
        email: email.toLowerCase().trim(),
        phone: phoneDigits,
        child_name: child_name.trim(),
        child_age: age,
        class_schedule,
        consent_data_processing,
        consent_marketing: consent_marketing || false,
        status: 'pending',
      })
      .select()
      .single();

    if (enrollmentError) {
      console.error('Enrollment creation error:', enrollmentError);
      return res.status(500).json({ error: 'Failed to create enrollment record' });
    }

    res.status(201).json({
      success: true,
      enrollment_id: enrollment.id,
      message: 'Enrollment created successfully. We will contact you via Zalo within 24 hours.',
    });
  } catch (err) {
    console.error('Enrollment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/enrollments
 * List all enrollments (admin only)
 */
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ enrollments: data });
  } catch (err) {
    console.error('Error listing enrollments:', err);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

/**
 * GET /api/enrollments/:id
 * Get enrollment by ID
 */
router.get('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json({ enrollment: data });
  } catch (err) {
    console.error('Error fetching enrollment:', err);
    res.status(500).json({ error: 'Failed to fetch enrollment' });
  }
});

/**
 * PATCH /api/enrollments/:id
 * Update enrollment status
 */
router.patch('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Get current enrollment state before update
    const { data: currentEnrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id, status, email, child_name')
      .eq('id', id)
      .single();

    if (!currentEnrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const oldStatus = currentEnrollment.status;

    const updates = {};
    if (status) updates.status = status;
    if (notes) updates.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Trigger enrollment notification if status changed
    if (status && status !== oldStatus) {
      createEnrollmentNotification(data, oldStatus, status).catch(err => {
        console.error('Notification error:', err);
      });

      // Auto-create student account when enrollment is approved
      if (status === 'enrolled' && oldStatus !== 'enrolled') {
        const studentResult = await createStudentFromEnrollment(data);
        if (studentResult) {
          return res.json({
            enrollment: data,
            student_created: true,
            student_login_email: studentResult.loginEmail,
            temp_password: studentResult.tempPassword,
          });
        }
      }
    }

    res.json({ enrollment: data });
  } catch (err) {
    console.error('Error updating enrollment:', err);
    res.status(500).json({ error: 'Failed to update enrollment' });
  }
});

export default router;