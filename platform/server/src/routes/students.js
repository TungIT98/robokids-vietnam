import express from 'express';
import { createStudent, batchImportStudents, default as supabase } from '../services/student.js';
import { sendWelcomeEmail } from '../services/email.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/students
 * Create a single student account
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, age, parentEmail, classId } = req.body;

    if (!name || !age || !parentEmail) {
      return res.status(400).json({
        error: 'Missing required fields: name, age, parentEmail',
      });
    }

    const result = await createStudent({ name, age, parentEmail, classId });

    // Send welcome email
    await sendWelcomeEmail({
      to: parentEmail,
      studentName: name,
      email: parentEmail,
      tempPassword: result.tempPassword,
    });

    res.status(201).json({
      success: true,
      userId: result.user.id,
      tempPassword: result.tempPassword,
      message: 'Student account created. Welcome email sent.',
    });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/students/batch-import
 * Batch import students from a list
 */
router.post('/batch-import', authenticate, async (req, res) => {
  try {
    const { students } = req.body;

    if (!Array.isArray(students)) {
      return res.status(400).json({ error: 'students must be an array' });
    }

    if (students.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 students per batch' });
    }

    const results = await batchImportStudents(students);

    // Send welcome emails for successful imports
    const emailPromises = results.success.map((s) =>
      sendWelcomeEmail({
        to: s.email,
        studentName: s.name,
        email: s.email,
        tempPassword: s.tempPassword,
      }).catch((err) => {
        console.error(`Failed to send welcome email to ${s.email}:`, err);
        return null;
      })
    );

    await Promise.allSettled(emailPromises);

    res.status(200).json({
      total: students.length,
      success: results.success.length,
      failed: results.failed.length,
      results,
    });
  } catch (err) {
    console.error('Error batch importing students:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/students
 * List all students (admin only)
 */
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, user_metadata')
      .eq('user_metadata->>role', 'student');

    if (error) throw error;

    res.json({ students: data });
  } catch (err) {
    console.error('Error listing students:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;