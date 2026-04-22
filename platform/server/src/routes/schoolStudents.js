import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for CSV upload (memory storage for parsing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// ============================================
// CSV BATCH STUDENT ONBOARDING
// ============================================

/**
 * POST /api/schools/:schoolId/students/batch-import
 * Bulk import students from CSV data
 * CSV format: name,email,grade,date_of_birth,parent_name,parent_email,parent_phone,class_id
 */
router.post('/:schoolId/students/batch-import', authenticate, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { students, create_parent_accounts = true, send_welcome_emails = true, default_grade } = req.body;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'students array is required' });
    }

    // Verify school exists
    const { data: school } = await supabase
      .from('schools')
      .select('id, max_students, name')
      .eq('id', schoolId)
      .single();

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Check if user has access to this school
    if (req.user.role !== 'admin') {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', req.user.id)
        .single();

      if (!teacherRelation) {
        return res.status(403).json({ error: 'Access denied: not a teacher at this school' });
      }
    }

    // Get current student count
    const { count: currentCount } = await supabase
      .from('student_school_relations')
      .select('id', { count: 'exact' })
      .eq('school_id', schoolId)
      .eq('status', 'active');

    const maxStudents = school.max_students || 100;
    const remainingSlots = maxStudents - currentCount;

    if (remainingSlots <= 0) {
      return res.status(400).json({ error: 'School student limit reached', max_students: maxStudents });
    }

    // Process validation
    const validationErrors = [];
    const validStudents = [];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const rowNum = i + 2; // CSV row (1 = header, 2 = first data row)

      // Required fields validation
      if (!student.name && !student.email) {
        validationErrors.push({ row: rowNum, error: 'Name or email is required' });
        continue;
      }

      // Email format validation
      if (student.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.parent_email)) {
        validationErrors.push({ row: rowNum, error: `Invalid parent email: ${student.parent_email}` });
        continue;
      }

      // Grade level validation
      if (student.grade && (student.grade < 1 || student.grade > 12)) {
        validationErrors.push({ row: rowNum, error: `Invalid grade: ${student.grade}` });
        continue;
      }

      // Date of birth validation
      if (student.date_of_birth) {
        const dob = new Date(student.date_of_birth);
        if (isNaN(dob.getTime())) {
          validationErrors.push({ row: rowNum, error: `Invalid date_of_birth: ${student.date_of_birth}` });
          continue;
        }
        // Must be at least 5 years old and no more than 20
        const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 5 || age > 20) {
          validationErrors.push({ row: rowNum, error: `Age must be between 5-20 years` });
          continue;
        }
      }

      validStudents.push({
        ...student,
        row: rowNum
      });
    }

    // Limit to remaining slots
    const studentsToProcess = validStudents.slice(0, remainingSlots);

    // Check for duplicates within the import
    const seenEmails = new Set();
    const duplicateEmails = [];
    for (const student of studentsToProcess) {
      if (student.parent_email) {
        if (seenEmails.has(student.parent_email.toLowerCase())) {
          duplicateEmails.push(student.parent_email);
        }
        seenEmails.add(student.parent_email.toLowerCase());
      }
    }

    if (duplicateEmails.length > 0) {
      return res.status(400).json({
        error: 'Duplicate parent emails in import',
        duplicates: [...new Set(duplicateEmails)]
      });
    }

    // Check for existing students in the school
    const parentEmails = studentsToProcess
      .filter(s => s.parent_email)
      .map(s => s.parent_email.toLowerCase());

    const { data: existingParents } = await supabase
      .from('parents')
      .select('email, id, profile_id')
      .in('email', parentEmails);

    const existingEmailMap = new Map();
    if (existingParents) {
      for (const p of existingParents) {
        existingEmailMap.set(p.email.toLowerCase(), p);
      }
    }

    // Process each student
    const results = {
      success: [],
      failed: [],
      duplicates: [],
      warnings: []
    };

    for (const student of studentsToProcess) {
      try {
        const { name, email: studentEmail, grade, date_of_birth, parent_name, parent_email, parent_phone, class_id } = student;

        // Check if parent already exists
        let parentProfileId = null;
        let parentId = null;

        if (parent_email && existingEmailMap.has(parent_email.toLowerCase())) {
          const existingParent = existingEmailMap.get(parent_email.toLowerCase());
          parentProfileId = existingParent.profile_id;
          parentId = existingParent.id;
          results.warnings.push({
            row: student.row,
            message: `Parent ${parent_email} already exists, linking to existing account`
          });
        } else if (parent_email && create_parent_accounts) {
          // Create parent account
          const tempPassword = generateTempPassword();
          const { data: newParentUser, error: createError } = await supabase.auth.admin.createUser({
            email: parent_email,
            email_confirm: true,
            user_metadata: {
              role: 'parent',
              full_name: parent_name || parent_email.split('@')[0]
            }
          });

          if (createError) {
            results.failed.push({
              row: student.row,
              name,
              error: `Failed to create parent account: ${createError.message}`
            });
            continue;
          }

          parentProfileId = newParentUser.id;

          // Create parent profile
          await supabase.from('profiles').upsert({
            id: newParentUser.id,
            email: parent_email,
            full_name: parent_name || parent_email.split('@')[0],
            role: 'parent'
          });

          // Create parent record
          const { data: newParent } = await supabase
            .from('parents')
            .insert({
              profile_id: newParentUser.id,
              name: parent_name || parent_email.split('@')[0],
              email: parent_email,
              phone: parent_phone
            })
            .select()
            .single();

          parentId = newParent?.id;
        }

        // Create student profile
        const studentTempPassword = generateTempPassword();
        const studentUserEmail = studentEmail || `${parent_email.split('@')[0]}_${Date.now()}@student.robokids.local`;

        const { data: newStudentUser, error: studentCreateError } = await supabase.auth.admin.createUser({
          email: studentUserEmail,
          email_confirm: true,
          user_metadata: {
            role: 'student',
            full_name: name,
            age: grade ? 6 + grade : 10
          }
        });

        if (studentCreateError) {
          results.failed.push({
            row: student.row,
            name,
            error: `Failed to create student account: ${studentCreateError.message}`
          });
          continue;
        }

        // Create student profile
        await supabase.from('profiles').upsert({
          id: newStudentUser.id,
          email: studentUserEmail,
          full_name: name,
          role: 'student',
          date_of_birth: date_of_birth || null
        });

        // Create student record
        const { data: studentRecord, error: studentError } = await supabase
          .from('students')
          .insert({
            profile_id: newStudentUser.id,
            parent_id: parentProfileId,
            grade_level: grade || default_grade || 1,
            date_of_birth: date_of_birth || null,
            school_name: school.name
          })
          .select()
          .single();

        if (studentError) {
          results.failed.push({
            row: student.row,
            name,
            error: `Failed to create student record: ${studentError.message}`
          });
          continue;
        }

        // Link to school
        const { error: linkError } = await supabase
          .from('student_school_relations')
          .insert({
            student_id: studentRecord.id,
            school_id: schoolId,
            class_id: class_id || null,
            status: 'active'
          });

        if (linkError) {
          results.warnings.push({
            row: student.row,
            message: `Student created but school linking failed: ${linkError.message}`
          });
        }

        // Link parent to student if both exist
        if (parentId && studentRecord) {
          await supabase
            .from('student_parent_relations')
            .upsert({
              student_id: studentRecord.id,
              parent_id: parentId,
              relationship: 'parent',
              is_primary: true
            }, {
              onConflict: 'student_id,parent_id'
            });
        }

        results.success.push({
          row: student.row,
          student_id: studentRecord.id,
          student_name: name,
          parent_id: parentId,
          parent_email: parent_email,
          temp_password: send_welcome_emails ? null : studentTempPassword // Only show if not sending email
        });

      } catch (err) {
        results.failed.push({
          row: student.row,
          name: student.name,
          error: err.message
        });
      }
    }

    // If over limit, note it
    if (validStudents.length > remainingSlots) {
      results.warnings.push({
        row: -1,
        message: `Import limited to ${remainingSlots} students (school max: ${maxStudents})`
      });
    }

    res.json({
      imported: results.success.length,
      failed: results.failed.length,
      duplicates: results.duplicates.length,
      warnings: results.warnings.length,
      results,
      validation_errors: validationErrors
    });

  } catch (error) {
    console.error('Batch import students error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/schools/:schoolId/students/validate-csv
 * Validate CSV data before importing
 */
router.post('/:schoolId/students/validate-csv', authenticate, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'students array is required' });
    }

    // Verify school access
    if (req.user.role !== 'admin') {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', req.user.id)
        .single();

      if (!teacherRelation) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get current count
    const { count: currentCount } = await supabase
      .from('student_school_relations')
      .select('id', { count: 'exact' })
      .eq('school_id', schoolId)
      .eq('status', 'active');

    const { data: school } = await supabase
      .from('schools')
      .select('max_students')
      .eq('id', schoolId)
      .single();

    const maxStudents = school?.max_students || 100;
    const remainingSlots = maxStudents - currentCount;

    // Validation results
    const results = {
      valid: [],
      errors: [],
      warnings: []
    };

    // Check for duplicate emails within the batch
    const seenEmails = new Map();
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const rowNum = i + 2;

      const errors = [];
      const warnings = [];

      // Required fields
      if (!student.name && !student.email) {
        errors.push('Name or email is required');
      }

      // Email format
      if (student.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.parent_email)) {
        errors.push(`Invalid parent email format`);
      }

      // Grade validation
      if (student.grade && (student.grade < 1 || student.grade > 12)) {
        errors.push(`Grade must be 1-12`);
      }

      // Age validation
      if (student.date_of_birth) {
        const dob = new Date(student.date_of_birth);
        if (isNaN(dob.getTime())) {
          errors.push('Invalid date of birth');
        } else {
          const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          if (age < 5 || age > 20) {
            errors.push('Age must be between 5-20 years');
          }
        }
      }

      // Check duplicates within batch
      if (student.parent_email) {
        const normalizedEmail = student.parent_email.toLowerCase();
        if (seenEmails.has(normalizedEmail)) {
          warnings.push(`Duplicate email in import (row ${seenEmails.get(normalizedEmail)})`);
        }
        seenEmails.set(normalizedEmail, rowNum);
      }

      if (errors.length > 0) {
        results.errors.push({ row: rowNum, errors });
      } else {
        results.valid.push({ row: rowNum, name: student.name });
      }

      if (warnings.length > 0) {
        results.warnings.push({ row: rowNum, warnings });
      }
    }

    res.json({
      valid_count: results.valid.length,
      error_count: results.errors.length,
      warning_count: results.warnings.length,
      would_fill: Math.min(results.valid.length, remainingSlots),
      remaining_slots: remainingSlots,
      max_students: maxStudents,
      ...results
    });

  } catch (error) {
    console.error('Validate CSV error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schools/:schoolId/students/import-template
 * Get CSV template for student import
 */
router.get('/:schoolId/students/import-template', authenticate, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { schoolId } = req.params;

    // Verify access
    if (req.user.role !== 'admin') {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', req.user.id)
        .single();

      if (!teacherRelation) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get classes for dropdown reference
    const { data: classes } = await supabase
      .from('school_classes')
      .select('id, name, grade_level')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('grade_level', { ascending: true });

    const template = {
      filename: 'student_import_template.csv',
      headers: ['name', 'email', 'grade', 'date_of_birth', 'parent_name', 'parent_email', 'parent_phone', 'class_id'],
      description: {
        name: 'Student full name (required)',
        email: 'Student email (optional, will be generated if not provided)',
        grade: 'Grade level 1-12 (optional, defaults to 1)',
        date_of_birth: 'Format: YYYY-MM-DD (optional)',
        parent_name: 'Parent/guardian full name (optional)',
        parent_email: 'Parent email (required for account creation)',
        parent_phone: 'Parent phone number (optional)',
        class_id: `Class ID from: ${classes?.map(c => `${c.name} (${c.id})`).join(', ') || 'no classes yet'}`
      }
    };

    res.json({ template });
  } catch (error) {
    console.error('Get import template error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schools/:schoolId/students/import-status/:jobId
 * Check status of a batch import job
 */
router.get('/:schoolId/students/import-status/:jobId', authenticate, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { schoolId, jobId } = req.params;

    // Verify access
    if (req.user.role !== 'admin') {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', req.user.id)
        .single();

      if (!teacherRelation) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // For now, return a placeholder since we don't have a job tracking system yet
    // In production, you'd have a batch_jobs table
    res.json({
      job_id: jobId,
      status: 'completed',
      message: 'Job tracking not yet implemented - import was synchronous'
    });
  } catch (error) {
    console.error('Get import status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PARENT INVITATION ENDPOINTS
// ============================================

/**
 * POST /api/schools/:schoolId/parents/invite
 * Send parent invitations for students imported via batch
 * Body: { student_ids: string[] } or { invitation_ids: string[] }
 */
router.post('/:schoolId/parents/invite', authenticate, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { student_ids, invitation_ids, resend = false } = req.body;

    // Verify school access
    if (req.user.role !== 'admin') {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', req.user.id)
        .single();

      if (!teacherRelation) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if ((!student_ids || !student_ids.length) && (!invitation_ids || !invitation_ids.length)) {
      return res.status(400).json({ error: 'student_ids or invitation_ids is required' });
    }

    let invitations = [];

    if (invitation_ids && invitation_ids.length) {
      // Get existing invitations
      const { data } = await supabase
        .from('parent_invitations')
        .select('*')
        .eq('school_id', schoolId)
        .in('id', invitation_ids)
        .eq('status', resend ? 'sent' : 'pending');

      invitations = data || [];
    } else if (student_ids && student_ids.length) {
      // Create new invitations for students
      const { data: students } = await supabase
        .from('students')
        .select(`
          id,
          profile_id,
          grade_level,
          profiles:profile_id(full_name, email)
        `)
        .in('id', student_ids);

      if (!students || students.length === 0) {
        return res.status(404).json({ error: 'No students found' });
      }

      // Get existing pending invitations
      const studentIds = students.map(s => s.id);
      const { data: existingInvites } = await supabase
        .from('parent_invitations')
        .select('*')
        .eq('school_id', schoolId)
        .in('student_id', studentIds)
        .eq('status', 'pending');

      const existingMap = new Map();
      if (existingInvites) {
        for (const inv of existingInvites) {
          existingMap.set(inv.student_id, inv);
        }
      }

      // Create invitations for students without pending invites
      const newInvites = [];
      for (const student of students) {
        if (existingMap.has(student.id)) {
          continue; // Skip students with pending invite
        }

        const accessCode = generateAccessCode();
        const parentEmail = student.profiles?.email || null;
        const parentName = student.profiles?.full_name || null;

        newInvites.push({
          school_id: schoolId,
          student_id: student.id,
          parent_email: parentEmail,
          parent_name: parentName,
          student_name: student.profiles?.full_name,
          access_code: accessCode,
          status: 'pending',
          invited_by: req.user.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      }

      if (newInvites.length > 0) {
        const { data: created } = await supabase
          .from('parent_invitations')
          .insert(newInvites)
          .select();

        invitations = created || [];
      }
    }

    // Send invitation emails
    const results = {
      sent: [],
      failed: [],
      skipped: []
    };

    for (const invite of invitations) {
      try {
        // Update status to sent
        await supabase
          .from('parent_invitations')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', invite.id);

        // TODO: Send actual email when email service is configured
        console.log(`[EMAIL] Would send parent invitation to ${invite.parent_email}`);
        console.log(`  Access code: ${invite.access_code}`);
        console.log(`  Student: ${invite.student_name}`);

        results.sent.push({
          id: invite.id,
          parent_email: invite.parent_email,
          student_name: invite.student_name,
          access_code: invite.access_code
        });
      } catch (err) {
        results.failed.push({
          id: invite.id,
          parent_email: invite.parent_email,
          error: err.message
        });
      }
    }

    res.json({
      total: invitations.length,
      sent: results.sent.length,
      failed: results.failed.length,
      results
    });

  } catch (error) {
    console.error('Parent invite error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schools/:schoolId/parents/invite/status
 * Get status of parent invitations for a school
 */
router.get('/:schoolId/parents/invite/status', authenticate, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { status, from_date, to_date } = req.query;

    // Verify school access
    if (req.user.role !== 'admin') {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', req.user.id)
        .single();

      if (!teacherRelation) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    let query = supabase
      .from('parent_invitations')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId);

    if (status) {
      query = query.eq('status', status);
    }
    if (from_date) {
      query = query.gte('created_at', from_date);
    }
    if (to_date) {
      query = query.lte('created_at', to_date);
    }

    const { data: invitations, error, count } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by status
    const stats = {
      total: count || 0,
      pending: 0,
      sent: 0,
      accepted: 0,
      expired: 0,
      cancelled: 0
    };

    for (const inv of (invitations || [])) {
      if (stats.hasOwnProperty(inv.status)) {
        stats[inv.status]++;
      }
    }

    res.json({
      statistics: stats,
      invitations: invitations || []
    });

  } catch (error) {
    console.error('Get invite status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/schools/:schoolId/parents/invite/resend
 * Resend invitation emails
 */
router.post('/:schoolId/parents/invite/resend', authenticate, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { invitation_ids } = req.body;

    if (!invitation_ids || !invitation_ids.length) {
      return res.status(400).json({ error: 'invitation_ids is required' });
    }

    // Verify school access
    if (req.user.role !== 'admin') {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', req.user.id)
        .single();

      if (!teacherRelation) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get invitations
    const { data: invitations } = await supabase
      .from('parent_invitations')
      .select('*')
      .eq('school_id', schoolId)
      .in('id', invitation_ids);

    if (!invitations || invitations.length === 0) {
      return res.status(404).json({ error: 'No invitations found' });
    }

    const results = {
      sent: [],
      failed: []
    };

    for (const invite of invitations) {
      try {
        // Update resend count and status
        await supabase
          .from('parent_invitations')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            resend_count: (invite.resend_count || 0) + 1,
            last_resent_at: new Date().toISOString()
          })
          .eq('id', invite.id);

        console.log(`[EMAIL] Resending invitation to ${invite.parent_email}`);
        console.log(`  Access code: ${invite.access_code}`);

        results.sent.push({
          id: invite.id,
          parent_email: invite.parent_email
        });
      } catch (err) {
        results.failed.push({
          id: invite.id,
          error: err.message
        });
      }
    }

    res.json({
      total: invitations.length,
      sent: results.sent.length,
      failed: results.failed.length,
      results
    });

  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/schools/:schoolId/students/import (multipart/form-data with CSV)
 * Import students from CSV file upload
 */
router.post('/:schoolId/students/import', authenticate, requireRole('admin', 'teacher'), upload.single('csv'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { create_parent_accounts = true, send_welcome_emails = true, default_grade, class_id } = req.body;

    // Verify school exists
    const { data: school } = await supabase
      .from('schools')
      .select('id, max_students, name')
      .eq('id', schoolId)
      .single();

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Verify school access
    if (req.user.role !== 'admin') {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', req.user.id)
        .single();

      if (!teacherRelation) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Parse CSV file if uploaded
    let students = [];
    if (req.file) {
      const csvContent = req.file.buffer.toString('utf8');
      students = await parseCSV(csvContent);
    } else if (req.body.students) {
      students = typeof req.body.students === 'string' ? JSON.parse(req.body.students) : req.body.students;
    }

    if (!students || students.length === 0) {
      return res.status(400).json({ error: 'No student data provided' });
    }

    if (students.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 students per import' });
    }

    // Check school capacity
    const { count: currentCount } = await supabase
      .from('student_school_relations')
      .select('id', { count: 'exact' })
      .eq('school_id', schoolId)
      .eq('status', 'active');

    const maxStudents = school.max_students || 100;
    const remainingSlots = maxStudents - currentCount;

    if (remainingSlots <= 0) {
      return res.status(400).json({ error: 'School student limit reached', max_students: maxStudents });
    }

    // Process students
    const results = {
      success: [],
      failed: [],
      invitations_created: 0
    };

    for (const student of students.slice(0, remainingSlots)) {
      try {
        const { name, email: studentEmail, grade, date_of_birth, parent_name, parent_email, parent_phone } = student;

        if (!name) {
          results.failed.push({ name: name || 'unknown', error: 'Name is required' });
          continue;
        }

        // Create parent account if email provided and flag set
        let parentProfileId = null;
        let parentId = null;

        if (parent_email && create_parent_accounts) {
          const tempPassword = generateTempPassword();

          // Check if parent exists
          let { data: existingParent } = await supabase
            .from('parents')
            .select('id, profile_id, email')
            .eq('email', parent_email.toLowerCase())
            .single();

          if (!existingParent) {
            // Create parent user
            const { data: newParentUser, error: createError } = await supabase.auth.admin.createUser({
              email: parent_email,
              email_confirm: true,
              user_metadata: {
                role: 'parent',
                full_name: parent_name || parent_email.split('@')[0]
              }
            });

            if (createError) {
              results.failed.push({ name, error: `Failed to create parent: ${createError.message}` });
              continue;
            }

            parentProfileId = newParentUser.id;

            // Create parent profile
            await supabase.from('profiles').upsert({
              id: newParentUser.id,
              email: parent_email,
              full_name: parent_name || parent_email.split('@')[0],
              role: 'parent'
            });

            // Create parent record
            const { data: newParent } = await supabase
              .from('parents')
              .insert({
                profile_id: newParentUser.id,
                name: parent_name || parent_email.split('@')[0],
                email: parent_email,
                phone: parent_phone
              })
              .select()
              .single();

            parentId = newParent?.id;
          } else {
            parentProfileId = existingParent.profile_id;
            parentId = existingParent.id;
          }
        }

        // Create student user
        const studentUserEmail = studentEmail || `${parent_email?.split('@')[0]}_${Date.now()}@student.robokids.local`;
        const studentTempPassword = generateTempPassword();

        const { data: newStudentUser, error: studentCreateError } = await supabase.auth.admin.createUser({
          email: studentUserEmail,
          email_confirm: true,
          user_metadata: {
            role: 'student',
            full_name: name,
            age: grade ? 6 + parseInt(grade) : 10
          }
        });

        if (studentCreateError) {
          results.failed.push({ name, error: `Failed to create student: ${studentCreateError.message}` });
          continue;
        }

        // Create student profile
        await supabase.from('profiles').upsert({
          id: newStudentUser.id,
          email: studentUserEmail,
          full_name: name,
          role: 'student',
          date_of_birth: date_of_birth || null
        });

        // Create student record
        const { data: studentRecord, error: studentError } = await supabase
          .from('students')
          .insert({
            profile_id: newStudentUser.id,
            parent_id: parentProfileId,
            grade_level: grade || default_grade || 1,
            date_of_birth: date_of_birth || null,
            school_name: school.name
          })
          .select()
          .single();

        if (studentError) {
          results.failed.push({ name, error: `Failed to create student record: ${studentError.message}` });
          continue;
        }

        // Link to school
        await supabase.from('student_school_relations').insert({
          student_id: studentRecord.id,
          school_id: schoolId,
          class_id: class_id || null,
          status: 'active'
        });

        // Link parent to student
        if (parentId && studentRecord) {
          await supabase.from('student_parent_relations').upsert({
            student_id: studentRecord.id,
            parent_id: parentId,
            relationship: 'parent',
            is_primary: true
          }, { onConflict: 'student_id,parent_id' });
        }

        // Create parent invitation if parent email exists
        if (parent_email && parentId) {
          const accessCode = generateAccessCode();
          await supabase.from('parent_invitations').insert({
            school_id: schoolId,
            student_id: studentRecord.id,
            parent_email: parent_email.toLowerCase(),
            parent_name: parent_name,
            student_name: name,
            access_code: accessCode,
            status: 'pending',
            invited_by: req.user.id,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });
          results.invitations_created++;
        }

        results.success.push({
          student_id: studentRecord.id,
          student_name: name,
          parent_email: parent_email,
          temp_password: send_welcome_emails ? null : studentTempPassword
        });

      } catch (err) {
        results.failed.push({ name: student.name || 'unknown', error: err.message });
      }
    }

    res.json({
      imported: results.success.length,
      failed: results.failed.length,
      invitations_created: results.invitations_created,
      results
    });

  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to parse CSV content
function parseCSV(csvContent) {
  return new Promise((resolve, reject) => {
    const records = [];
    const parser = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
    parser.on('readable', function() {
      let record;
      while (record = parser.read()) {
        records.push(record);
      }
    });
    parser.on('error', reject);
    parser.on('end', () => resolve(records));
  });
}

// Helper function to generate temp password
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Helper function to generate access code
function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default router;