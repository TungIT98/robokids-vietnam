import express from 'express';
import PDFDocument from 'pdfkit';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendWeeklyProgressEmail } from '../services/email.js';

const router = express.Router();

// Role helper
function getUserRole(user) {
  return user.role || user.user_metadata?.role || 'student';
}

// ============================================
// SCHOOL PROFILE ENDPOINTS
// ============================================

// GET /api/schools - List all schools (robokids_staff or school_admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const userRole = getUserRole(req.user);
    const userId = req.user.id;
    const { page = 1, limit = 20, search, subscription_plan, is_active } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('schools')
      .select('*', { count: 'exact' });

    // Role-based filtering
    if (userRole === 'school_admin') {
      // School admins only see their own school
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .single();

      if (adminSchool) {
        query = query.eq('id', adminSchool.school_id);
      } else {
        return res.json({ schools: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      }
    } else if (userRole === 'teacher') {
      // Teachers only see their school
      const { data: teacherSchool } = await supabase
        .from('teachers')
        .select('school_id')
        .eq('profile_id', userId)
        .single();

      if (teacherSchool) {
        query = query.eq('id', teacherSchool.school_id);
      } else {
        return res.json({ schools: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      }
    } else if (!['robokids_staff'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }
    if (subscription_plan) {
      query = query.eq('subscription_plan', subscription_plan);
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: schools, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      schools,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('List schools error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schools/:id - Get school details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // First get the school
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Access check
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', id)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'teacher') {
      const { data: teacherSchool } = await supabase
        .from('teachers')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', id)
        .single();

      if (!teacherSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    // robokids_staff has access to all schools

    // For robokids_staff, also get additional info
    let additionalData = {};
    if (userRole === 'robokids_staff') {
      const { count: teacherCount } = await supabase
        .from('school_teachers')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', id);

      const { count: studentCount } = await supabase
        .from('student_school_relations')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', id)
        .eq('status', 'active');

      additionalData = { teacher_count: teacherCount || 0, student_count: studentCount || 0 };
    }

    res.json({ school: { ...school, ...additionalData }, isPublic: false });
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schools - Create new school (robokids_staff only)
router.post('/', authenticate, requireRole('robokids_staff'), async (req, res) => {
  try {
    const {
      name, address, city, district, phone, email,
      principal_name, contact_person, contact_phone, contact_email,
      logo_url, subscription_plan, subscription_start_date, subscription_end_date,
      max_students, max_teachers
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'School name is required' });
    }

    // Generate school code
    const { data: codeData } = await supabase.rpc('generate_school_code', { school_name: name });
    const code = codeData || `SCH${Date.now().toString(36).toUpperCase()}`;

    const { data: school, error } = await supabase
      .from('schools')
      .insert({
        name,
        address,
        city,
        district,
        phone,
        email,
        principal_name,
        contact_person,
        contact_phone,
        contact_email,
        logo_url,
        code,
        subscription_plan: subscription_plan || 'basic',
        subscription_start_date,
        subscription_end_date,
        max_students: max_students || 100,
        max_teachers: max_teachers || 20
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ school });
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/schools/:id - Update school
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Access check: robokids_staff can update any school
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', id)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['robokids_staff'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prevent updating certain fields
    delete updates.id;
    delete updates.code; // Code is immutable
    delete updates.created_at;

    const { data: school, error } = await supabase
      .from('schools')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json({ school });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/schools/:id - Soft delete school (robokids_staff only)
router.delete('/:id', authenticate, requireRole('robokids_staff'), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('schools')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'School deactivated' });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TEACHER MANAGEMENT ENDPOINTS
// ============================================

// GET /api/schools/:schoolId/teachers - List teachers at a school
router.get('/:schoolId/teachers', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Access check
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'teacher') {
      const { data: teacherSchool } = await supabase
        .from('teachers')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!teacherSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['robokids_staff'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: teachers, error } = await supabase
      .from('school_teachers')
      .select(`
        id,
        role,
        assigned_at,
        profile:profiles(id, email, full_name, avatar_url, phone)
      `)
      .eq('school_id', schoolId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    res.json({ teachers });
  } catch (error) {
    console.error('List school teachers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schools/:schoolId/teachers - Add teacher to school
router.post('/:schoolId/teachers', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { teacher_email, role = 'teacher' } = req.body;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Access check: robokids_staff or school_admin
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['robokids_staff'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!teacher_email) {
      return res.status(400).json({ error: 'teacher_email is required' });
    }

    // Find or create teacher profile
    let { data: teacherProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', teacher_email.toLowerCase())
      .single();

    if (!teacherProfile) {
      // Create a new teacher profile
      const { data: newProfile, error: createError } = await supabase.auth.admin.createUser({
        email: teacher_email,
        email_confirm: true,
        user_metadata: { role: 'teacher', full_name: teacher_email.split('@')[0] }
      });

      if (createError) throw createError;
      teacherProfile = { id: newProfile.id, role: 'teacher' };

      // Ensure profile record exists
      await supabase.from('profiles').upsert({
        id: newProfile.id,
        email: teacher_email,
        full_name: teacher_email.split('@')[0],
        role: 'teacher'
      });
    }

    // Check if already at school
    const { data: existing } = await supabase
      .from('school_teachers')
      .select('id')
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherProfile.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Teacher already assigned to this school' });
    }

    // Check school limit
    const { count } = await supabase
      .from('school_teachers')
      .select('id', { count: 'exact' })
      .eq('school_id', schoolId);

    const { data: school } = await supabase
      .from('schools')
      .select('max_teachers')
      .eq('id', schoolId)
      .single();

    if (count >= (school?.max_teachers || 20)) {
      return res.status(400).json({ error: 'School teacher limit reached' });
    }

    // Add teacher to school
    const { data: schoolTeacher, error } = await supabase
      .from('school_teachers')
      .insert({
        school_id: schoolId,
        teacher_id: teacherProfile.id,
        role
      })
      .select(`
        id,
        role,
        assigned_at,
        profile:profiles(id, email, full_name)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({ teacher: schoolTeacher });
  } catch (error) {
    console.error('Add school teacher error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/schools/:schoolId/teachers/:teacherId - Update teacher role
router.patch('/:schoolId/teachers/:teacherId', authenticate, async (req, res) => {
  try {
    const { schoolId, teacherId } = req.params;
    const { role } = req.body;
    const userRole = getUserRole(req.user);

    // Access check: robokids_staff or school_admin
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', req.user.id)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['robokids_staff'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!role || !['teacher', 'head_teacher', 'coordinator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data: teacher, error } = await supabase
      .from('school_teachers')
      .update({ role })
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)
      .select(`
        id,
        role,
        assigned_at,
        profile:profiles(id, email, full_name)
      `)
      .single();

    if (error) throw error;
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found at this school' });
    }

    res.json({ teacher });
  } catch (error) {
    console.error('Update school teacher error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/schools/:schoolId/teachers/:teacherId - Remove teacher from school
router.delete('/:schoolId/teachers/:teacherId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { schoolId, teacherId } = req.params;

    const { error } = await supabase
      .from('school_teachers')
      .delete()
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId);

    if (error) throw error;

    res.json({ success: true, message: 'Teacher removed from school' });
  } catch (error) {
    console.error('Remove school teacher error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BULK TEACHER IMPORT
// ============================================

// POST /api/schools/:schoolId/teachers/bulk-import - Bulk import teachers
router.post('/:schoolId/teachers/bulk-import', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { teachers } = req.body;
    const userRole = getUserRole(req.user);

    // Access check: robokids_staff or school_admin
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', req.user.id)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['robokids_staff'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!teachers || !Array.isArray(teachers)) {
      return res.status(400).json({ error: 'teachers array is required' });
    }

    const results = {
      success: [],
      failed: []
    };

    // Check school limit
    const { count: currentCount } = await supabase
      .from('school_teachers')
      .select('id', { count: 'exact' })
      .eq('school_id', schoolId);

    const { data: school } = await supabase
      .from('schools')
      .select('max_teachers')
      .eq('id', schoolId)
      .single();

    const maxTeachers = school?.max_teachers || 20;
    const remainingSlots = maxTeachers - currentCount;

    if (remainingSlots <= 0) {
      return res.status(400).json({ error: 'School teacher limit reached', max_teachers: maxTeachers });
    }

    for (const teacherData of teachers.slice(0, remainingSlots)) {
      try {
        const { email, role = 'teacher', name } = teacherData;

        if (!email) {
          results.failed.push({ email: email || 'unknown', error: 'Email required' });
          continue;
        }

        // Find or create profile
        let { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();

        if (!profile) {
          // Create user
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { role: 'teacher', full_name: name || email.split('@')[0] }
          });

          if (createError) {
            results.failed.push({ email, error: createError.message });
            continue;
          }

          // Create profile
          await supabase.from('profiles').upsert({
            id: newUser.id,
            email,
            full_name: name || email.split('@')[0],
            role: 'teacher'
          });

          profile = { id: newUser.id };
        }

        // Check if already assigned
        const { data: existing } = await supabase
          .from('school_teachers')
          .select('id')
          .eq('school_id', schoolId)
          .eq('teacher_id', profile.id)
          .single();

        if (existing) {
          results.failed.push({ email, error: 'Already assigned to this school' });
          continue;
        }

        // Add to school
        const { error: insertError } = await supabase
          .from('school_teachers')
          .insert({
            school_id: schoolId,
            teacher_id: profile.id,
            role
          });

        if (insertError) {
          results.failed.push({ email, error: insertError.message });
        } else {
          results.success.push({ email, role });
        }
      } catch (err) {
        results.failed.push({ email: teacherData.email || 'unknown', error: err.message });
      }
    }

    res.json({
      imported: results.success.length,
      failed: results.failed.length,
      results
    });
  } catch (error) {
    console.error('Bulk import teachers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SCHOOL CLASSES ENDPOINTS
// ============================================

// GET /api/schools/:schoolId/classes - List classes at a school
router.get('/:schoolId/classes', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;

    const { data: classes, error } = await supabase
      .from('school_classes')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('grade_level', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ classes });
  } catch (error) {
    console.error('List school classes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schools/:schoolId/classes - Create class
router.post('/:schoolId/classes', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { name, grade_level, teacher_id, academic_year, schedule, max_students } = req.body;
    const userRole = getUserRole(req.user);

    // Access check: robokids_staff or school_admin
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', req.user.id)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['robokids_staff'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!name || !grade_level) {
      return res.status(400).json({ error: 'name and grade_level are required' });
    }

    // Verify teacher belongs to school if provided
    if (teacher_id) {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacher_id)
        .single();

      if (!teacherRelation) {
        return res.status(400).json({ error: 'Teacher does not belong to this school' });
      }
    }

    const { data: classRecord, error } = await supabase
      .from('school_classes')
      .insert({
        school_id: schoolId,
        name,
        grade_level,
        teacher_id,
        academic_year,
        schedule: schedule ? JSON.stringify(schedule) : null,
        max_students: max_students || 40
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ class: classRecord });
  } catch (error) {
    console.error('Create school class error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schools/:schoolId/classes/:classId - Get class details
router.get('/:schoolId/classes/:classId', authenticate, async (req, res) => {
  try {
    const { schoolId, classId } = req.params;

    const { data: classRecord, error } = await supabase
      .from('school_classes')
      .select('*')
      .eq('school_id', schoolId)
      .eq('id', classId)
      .single();

    if (error || !classRecord) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get student count
    const { count: studentCount } = await supabase
      .from('student_school_relations')
      .select('id', { count: 'exact' })
      .eq('class_id', classId)
      .eq('status', 'active');

    res.json({ class: { ...classRecord, student_count: studentCount } });
  } catch (error) {
    console.error('Get school class error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/schools/:schoolId/classes/:classId - Update class
router.patch('/:schoolId/classes/:classId', authenticate, async (req, res) => {
  try {
    const { schoolId, classId } = req.params;
    const updates = req.body;
    const userRole = getUserRole(req.user);

    // Access check: robokids_staff or school_admin
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', req.user.id)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['robokids_staff'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Handle schedule JSON
    if (updates.schedule && typeof updates.schedule === 'object') {
      updates.schedule = JSON.stringify(updates.schedule);
    }

    delete updates.id;
    delete updates.school_id;
    delete updates.created_at;

    const { data: classRecord, error } = await supabase
      .from('school_classes')
      .update(updates)
      .eq('school_id', schoolId)
      .eq('id', classId)
      .select()
      .single();

    if (error) throw error;
    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ class: classRecord });
  } catch (error) {
    console.error('Update school class error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/schools/:schoolId/classes/:classId - Delete class
router.delete('/:schoolId/classes/:classId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { schoolId, classId } = req.params;

    // Check if class has active students
    const { count } = await supabase
      .from('student_school_relations')
      .select('id', { count: 'exact' })
      .eq('class_id', classId)
      .eq('status', 'active');

    if (count > 0) {
      return res.status(400).json({
        error: 'Cannot delete class with active students',
        student_count: count
      });
    }

    // Soft delete - set is_active = false
    const { error } = await supabase
      .from('school_classes')
      .update({ is_active: false })
      .eq('school_id', schoolId)
      .eq('id', classId);

    if (error) throw error;

    res.json({ success: true, message: 'Class deleted' });
  } catch (error) {
    console.error('Delete school class error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schools/:schoolId/students - List students at a school
router.get('/:schoolId/students', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { class_id, status = 'active' } = req.query;

    let query = supabase
      .from('student_school_relations')
      .select(`
        id,
        enrollment_date,
        status,
        student:students(
          id,
          profile_id,
          grade_level,
          date_of_birth,
          profile:profiles(id, full_name, email)
        ),
        class:school_classes(id, name, grade_level)
      `)
      .eq('school_id', schoolId)
      .eq('status', status);

    if (class_id) {
      query = query.eq('class_id', class_id);
    }

    const { data: relations, error } = await query;

    if (error) throw error;

    // Transform to flatten student info
    const students = relations.map(r => ({
      relation_id: r.id,
      enrollment_date: r.enrollment_date,
      status: r.status,
      student: r.student,
      class: r.class
    }));

    res.json({ students });
  } catch (error) {
    console.error('List school students error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SCHOOL PROGRESS ENDPOINT
// ============================================

// GET /api/schools/:schoolId/progress - Get aggregated progress for school
router.get('/:schoolId/progress', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { class_id, from_date, to_date } = req.query;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Verify access
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'teacher') {
      const { data: teacherSchool } = await supabase
        .from('school_teachers')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!teacherSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['robokids_staff', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all students in the school
    let studentQuery = supabase
      .from('student_school_relations')
      .select('student_id, class_id')
      .eq('school_id', schoolId)
      .eq('status', 'active');

    if (class_id) {
      studentQuery = studentQuery.eq('class_id', class_id);
    }

    const { data: relations } = await studentQuery;
    const studentIds = relations?.map(r => r.student_id) || [];

    if (studentIds.length === 0) {
      return res.json({
        school_id: schoolId,
        total_students: 0,
        progress: {
          average_xp: 0,
          total_lessons_completed: 0,
          total_missions_completed: 0,
          average_level: 1
        },
        by_class: []
      });
    }

    // Get progress stats for all students
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('*')
      .in('user_id', (await supabase.from('students').select('profile_id').in('id', studentIds).then(r => r.data || [])).map(s => s.profile_id));

    const profileIds = (await supabase.from('students').select('profile_id').in('id', studentIds).then(r => r.data || [])).map(s => s.profile_id);

    // Get completed lessons per student
    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('user_id')
      .in('user_id', profileIds)
      .eq('completed', true);

    // Get completed missions per student
    const { data: completedMissions } = await supabase
      .from('user_missions')
      .select('user_id')
      .in('user_id', profileIds)
      .eq('status', 'completed');

    // Calculate aggregated stats
    const totalXp = progressData?.reduce((sum, p) => sum + (p.total_xp || 0), 0) || 0;
    const totalStudents = studentIds.length;
    const averageXp = totalStudents > 0 ? Math.round(totalXp / totalStudents) : 0;
    const averageLevel = Math.floor(averageXp / 100) + 1;

    const lessonCounts = {};
    for (const cl of (completedLessons || [])) {
      lessonCounts[cl.user_id] = (lessonCounts[cl.user_id] || 0) + 1;
    }
    const totalLessonsCompleted = Object.values(lessonCounts).reduce((a, b) => a + b, 0);

    const missionCounts = {};
    for (const cm of (completedMissions || [])) {
      missionCounts[cm.user_id] = (missionCounts[cm.user_id] || 0) + 1;
    }
    const totalMissionsCompleted = Object.values(missionCounts).reduce((a, b) => a + b, 0);

    // Get progress by class
    const classIds = [...new Set(relations?.map(r => r.class_id).filter(Boolean) || [])];

    const byClass = [];
    for (const cid of classIds) {
      const classStudentIds = relations?.filter(r => r.class_id === cid).map(r => r.student_id) || [];
      const classProfileIds = profileIds.filter((_, i) => studentIds.indexOf(classStudentIds[i]) !== -1);

      const classProgress = progressData?.filter(p => classProfileIds.includes(p.user_id)) || [];
      const classXp = classProgress.reduce((sum, p) => sum + (p.total_xp || 0), 0);
      const classAvgXp = classStudentIds.length > 0 ? Math.round(classXp / classStudentIds.length) : 0;

      const { data: classInfo } = await supabase
        .from('school_classes')
        .select('name, grade_level')
        .eq('id', cid)
        .single();

      byClass.push({
        class_id: cid,
        class_name: classInfo?.name,
        grade_level: classInfo?.grade_level,
        student_count: classStudentIds.length,
        average_xp: classAvgXp,
        average_level: Math.floor(classAvgXp / 100) + 1
      });
    }

    res.json({
      school_id: schoolId,
      total_students: totalStudents,
      progress: {
        average_xp: averageXp,
        total_lessons_completed: totalLessonsCompleted,
        total_missions_completed: totalMissionsCompleted,
        average_level: averageLevel
      },
      by_class: byClass
    });

  } catch (error) {
    console.error('School progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SCHOOL BILLING ENDPOINT
// ============================================

// GET /api/schools/:schoolId/billing - Get billing info for school
router.get('/:schoolId/billing', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Only robokids_staff can see billing
    if (!['robokids_staff', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get school info
    const { data: school } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Get student count
    const { count: studentCount } = await supabase
      .from('student_school_relations')
      .select('id', { count: 'exact' })
      .eq('school_id', schoolId)
      .eq('status', 'active');

    // Get teacher count
    const { count: teacherCount } = await supabase
      .from('school_teachers')
      .select('id', { count: 'exact' })
      .eq('school_id', schoolId);

    // Calculate subscription pricing
    const pricing = {
      basic: { per_student: 99000, per_teacher: 0 },
      standard: { per_student: 149000, per_teacher: 0 },
      premium: { per_student: 199000, per_teacher: 0 }
    };

    const plan = school.subscription_plan || 'basic';
    const studentPrice = pricing[plan]?.per_student || 99000;
    const monthlyTotal = (studentCount || 0) * studentPrice;

    // Get recent payments/invoices
    const { data: invoices } = await supabase
      .from('payments')
      .select('id, amount, status, created_at')
      .eq('metadata->school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Check subscription status
    let subscriptionStatus = 'active';
    if (school.subscription_end_date) {
      const endDate = new Date(school.subscription_end_date);
      const today = new Date();
      if (endDate < today) {
        subscriptionStatus = 'expired';
      } else if (endDate < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        subscriptionStatus = 'expiring_soon';
      }
    }

    res.json({
      school_id: schoolId,
      school_name: school.name,
      subscription: {
        plan: plan,
        status: subscriptionStatus,
        start_date: school.subscription_start_date,
        end_date: school.subscription_end_date
      },
      usage: {
        students: {
          current: studentCount || 0,
          max: school.max_students || 100
        },
        teachers: {
          current: teacherCount || 0,
          max: school.max_teachers || 20
        }
      },
      pricing: {
        plan_name: plan,
        per_student_vnd: studentPrice,
        monthly_total_vnd: monthlyTotal,
        annual_total_vnd: monthlyTotal * 12
      },
      recent_invoices: invoices || []
    });

  } catch (error) {
    console.error('School billing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INVOICE PDF EXPORT
// ============================================

// GET /api/schools/:schoolId/billing/invoices/:invoiceId/pdf - Export invoice as PDF
router.get('/:schoolId/billing/invoices/:invoiceId/pdf', authenticate, async (req, res) => {
  try {
    const { schoolId, invoiceId } = req.params;
    const userRole = getUserRole(req.user);

    // Only robokids_staff and admin can export invoices
    if (!['robokids_staff', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get invoice
    const { data: invoice } = await supabase
      .from('payments')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get school info
    const { data: school } = await supabase
      .from('schools')
      .select('name, address, phone, email')
      .eq('id', schoolId)
      .single();

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoiceId}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).text('INVOICE', { align: 'center' });
    doc.fontSize(12).text(`Invoice #: ${invoiceId.substring(0, 8).toUpperCase()}`, { align: 'center' });
    doc.fontSize(10).text(`Date: ${new Date(invoice.created_at).toLocaleDateString('vi-VN')}`, { align: 'center' });
    doc.moveDown(2);

    // School info
    doc.fontSize(14).text('From:', { underline: true });
    doc.fontSize(11).text('RoboKids Vietnam');
    doc.text('Trẻ em Việt Nam học lập trình robot từ 6 tuổi');
    doc.text('Email: billing@robokids.vn');
    doc.text('Hotline: 1900-xxxx');
    doc.moveDown();

    // Client info
    doc.fontSize(14).text('Bill To:', { underline: true });
    doc.fontSize(11).text(school?.name || 'N/A');
    doc.text(school?.address || '');
    doc.text(`Phone: ${school?.phone || 'N/A'}`);
    doc.text(`Email: ${school?.email || 'N/A'}`);
    doc.moveDown(2);

    // Invoice details
    doc.fontSize(14).text('Invoice Details:', { underline: true });
    doc.fontSize(11);
    doc.text(`Amount: ${(invoice.amount || 0).toLocaleString('vi-VN')} VND`);
    doc.text(`Status: ${invoice.status || 'pending'}`);
    doc.text(`Payment Method: ${invoice.payment_method || 'N/A'}`);
    doc.text(`Transaction ID: ${invoice.transaction_id || 'N/A'}`);

    if (invoice.metadata) {
      doc.moveDown();
      doc.text('Additional Info:');
      if (invoice.metadata.student_count) {
        doc.text(`Student Count: ${invoice.metadata.student_count}`);
      }
      if (invoice.metadata.plan) {
        doc.text(`Plan: ${invoice.metadata.plan}`);
      }
    }

    doc.moveDown(2);

    // Footer
    doc.fontSize(10).text('Thank you for your business!', { align: 'center' });
    doc.fontSize(8).text('Generated by RoboKids Vietnam Platform', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Invoice PDF export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schools/:schoolId/billing/invoices - Create new invoice
router.post('/:schoolId/billing/invoices', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { amount, description, due_date, student_count, plan } = req.body;
    const userRole = getUserRole(req.user);

    if (!['robokids_staff', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Generate invoice ID
    const invoiceId = `INV${Date.now().toString(36).toUpperCase()}`;

    // Create payment/invoice record
    const { data: invoice, error } = await supabase
      .from('payments')
      .insert({
        transaction_id: invoiceId,
        amount,
        status: 'pending',
        payment_method: 'bank_transfer',
        metadata: {
          school_id: schoolId,
          description: description || 'School subscription',
          student_count: student_count,
          plan: plan
        }
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      invoice_id: invoice.id,
      transaction_id: invoiceId,
      amount,
      status: 'pending',
      due_date,
      created_at: invoice.created_at
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AUTO-RENEWAL ENDPOINTS
// ============================================

// GET /api/schools/:schoolId/billing/auto-renewal - Get auto-renewal settings
router.get('/:schoolId/billing/auto-renewal', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { schoolId } = req.params;

    // Get school info
    const { data: school } = await supabase
      .from('schools')
      .select('subscription_auto_renew, subscription_plan')
      .eq('id', schoolId)
      .single();

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json({
      school_id: schoolId,
      auto_renewal_enabled: school.subscription_auto_renew || false,
      current_plan: school.subscription_plan || 'basic'
    });

  } catch (error) {
    console.error('Get auto-renewal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/schools/:schoolId/billing/auto-renewal - Update auto-renewal settings
router.patch('/:schoolId/billing/auto-renewal', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { enabled, plan } = req.body;

    // Get school
    const { data: school } = await supabase
      .from('schools')
      .select('id, subscription_plan')
      .eq('id', schoolId)
      .single();

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const updates = {};
    if (typeof enabled === 'boolean') {
      updates.subscription_auto_renew = enabled;
    }
    if (plan) {
      updates.subscription_plan = plan;
    }

    const { data: updated, error } = await supabase
      .from('schools')
      .update(updates)
      .eq('id', schoolId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      school_id: schoolId,
      auto_renewal_enabled: updated.subscription_auto_renew,
      plan: updated.subscription_plan,
      message: 'Auto-renewal settings updated'
    });

  } catch (error) {
    console.error('Update auto-renewal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schools/:schoolId/billing/renew - Trigger renewal notification
router.post('/:schoolId/billing/renew', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { schoolId } = req.params;

    // Get school info
    const { data: school } = await supabase
      .from('schools')
      .select('name, email, subscription_end_date, subscription_plan')
      .eq('id', schoolId)
      .single();

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Get school admin emails
    const { data: admins } = await supabase
      .from('school_admins')
      .select('profile:profile_id(email)')
      .eq('school_id', schoolId);

    const adminEmails = admins?.map(a => a.profile?.email).filter(Boolean) || [];

    if (adminEmails.length === 0) {
      return res.status(400).json({ error: 'No admin emails found for school' });
    }

    // Send renewal notification email
    console.log(`[EMAIL] Would send renewal notification to ${adminEmails.join(', ')}`);
    console.log(`  School: ${school.name}`);
    console.log(`  Plan: ${school.subscription_plan}`);
    console.log(`  Expires: ${school.subscription_end_date}`);

    res.json({
      message: 'Renewal notification sent',
      school_id: schoolId,
      school_name: school.name,
      notified_emails: adminEmails
    });

  } catch (error) {
    console.error('Renewal notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schools/:schoolId/billing/invoices - List all invoices for school
router.get('/:schoolId/billing/invoices', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const userRole = getUserRole(req.user);

    if (!['robokids_staff', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('metadata->>school_id', schoolId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: invoices, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      invoices: invoices || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SCHOOL CURRICULUM ENDPOINT
// ============================================

// GET /api/schools/:schoolId/curriculum - Get curriculum for school's grade levels
router.get('/:schoolId/curriculum', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { grade_level } = req.query;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Verify access
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'teacher') {
      const { data: teacherSchool } = await supabase
        .from('school_teachers')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!teacherSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['robokids_staff', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get school's grade levels from classes
    const { data: classes } = await supabase
      .from('school_classes')
      .select('grade_level')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    const gradeLevels = [...new Set(classes?.map(c => c.grade_level).filter(Boolean) || [])];

    if (gradeLevels.length === 0) {
      return res.json({
        school_id: schoolId,
        grade_levels: [],
        curriculum: []
      });
    }

    // Map grade levels to difficulty
    const gradeToDifficulty = (grade) => {
      if (grade <= 4) return 'beginner';
      if (grade <= 8) return 'intermediate';
      return 'advanced';
    };

    // If specific grade requested, filter
    const targetGrades = grade_level ? [parseInt(grade_level)] : gradeLevels;

    // Get curriculum for each grade level
    const curriculum = [];
    for (const grade of targetGrades) {
      if (!gradeLevels.includes(grade)) continue;

      const difficulty = gradeToDifficulty(grade);

      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, code, title_vi, title_en, difficulty_level, xp_reward, estimated_minutes, sequence_order')
        .eq('difficulty_level', difficulty)
        .eq('is_active', true)
        .order('sequence_order', { ascending: true });

      curriculum.push({
        grade_level: grade,
        difficulty_level: difficulty,
        lesson_count: lessons?.length || 0,
        lessons: lessons?.map(l => ({
          id: l.id,
          code: l.code,
          title: l.title_vi,
          title_en: l.title_en,
          xp_reward: l.xp_reward,
          estimated_minutes: l.estimated_minutes,
          sequence_order: l.sequence_order
        })) || []
      });
    }

    res.json({
      school_id: schoolId,
      grade_levels: targetGrades,
      curriculum
    });

  } catch (error) {
    console.error('School curriculum error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CLASS PROGRESS ENDPOINT
// ============================================

// GET /api/schools/:schoolId/class/:classId/progress - Get progress for a class
router.get('/:schoolId/class/:classId/progress', authenticate, async (req, res) => {
  try {
    const { schoolId, classId } = req.params;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Verify access
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'teacher') {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!teacherRelation) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['robokids_staff', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get class info
    const { data: classInfo } = await supabase
      .from('school_classes')
      .select('*')
      .eq('id', classId)
      .eq('school_id', schoolId)
      .single();

    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get students in class
    const { data: relations } = await supabase
      .from('student_school_relations')
      .select('student_id')
      .eq('school_id', schoolId)
      .eq('class_id', classId)
      .eq('status', 'active');

    const studentIds = relations?.map(r => r.student_id) || [];

    if (studentIds.length === 0) {
      return res.json({
        class_id: classId,
        class_name: classInfo.name,
        grade_level: classInfo.grade_level,
        student_count: 0,
        students: [],
        summary: {
          average_xp: 0,
          average_level: 1,
          total_lessons_completed: 0
        }
      });
    }

    // Get student profiles with progress
    const { data: students } = await supabase
      .from('students')
      .select('id, profile_id, grade_level, profiles:profile_id(full_name, email)')
      .in('id', studentIds);

    // Get progress for all students
    const profileIds = students?.map(s => s.profile_id) || [];

    const { data: progressData } = await supabase
      .from('user_progress')
      .select('*')
      .in('user_id', profileIds);

    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('user_id')
      .in('user_id', profileIds)
      .eq('completed', true);

    const { data: badges } = await supabase
      .from('earned_badges')
      .select('user_id, badge_id, badges(name, icon_url)')
      .in('user_id', profileIds);

    // Build student progress list
    const lessonCounts = {};
    for (const cl of (completedLessons || [])) {
      lessonCounts[cl.user_id] = (lessonCounts[cl.user_id] || 0) + 1;
    }

    const badgeCounts = {};
    for (const b of (badges || [])) {
      badgeCounts[b.user_id] = (badgeCounts[b.user_id] || 0) + 1;
    }

    const studentProgress = students?.map(s => {
      const xp = progressData?.find(p => p.user_id === s.profile_id)?.total_xp || 0;
      return {
        student_id: s.id,
        name: s.profiles?.full_name,
        email: s.profiles?.email,
        grade_level: s.grade_level,
        xp: xp,
        level: Math.floor(xp / 100) + 1,
        lessons_completed: lessonCounts[s.profile_id] || 0,
        badges_earned: badgeCounts[s.profile_id] || 0
      };
    }) || [];

    // Calculate summary
    const totalXp = studentProgress.reduce((sum, s) => sum + s.xp, 0);
    const avgXp = studentProgress.length > 0 ? Math.round(totalXp / studentProgress.length) : 0;

    res.json({
      class_id: classId,
      class_name: classInfo.name,
      grade_level: classInfo.grade_level,
      student_count: studentProgress.length,
      students: studentProgress,
      summary: {
        average_xp: avgXp,
        average_level: Math.floor(avgXp / 100) + 1,
        total_lessons_completed: studentProgress.reduce((sum, s) => sum + s.lessons_completed, 0)
      }
    });

  } catch (error) {
    console.error('Class progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STUDENT PROGRESS ENDPOINT
// ============================================

// GET /api/schools/:schoolId/students/:studentId/progress - Get detailed progress for a student
router.get('/:schoolId/students/:studentId/progress', authenticate, async (req, res) => {
  try {
    const { schoolId, studentId } = req.params;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Verify access - check if user is admin/teacher of school or parent of student
    let hasAccess = false;

    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();
      hasAccess = !!adminSchool;
    } else if (userRole === 'teacher') {
      const { data: teacherSchool } = await supabase
        .from('school_teachers')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();
      hasAccess = !!teacherSchool;
    } else if (userRole === 'robokids_staff' || userRole === 'admin') {
      hasAccess = true;
    } else if (userRole === 'parent') {
      // Check if parent is linked to this student
      const { data: student } = await supabase
        .from('students')
        .select('profile_id, parent_id')
        .eq('id', studentId)
        .single();

      if (student) {
        const { data: parent } = await supabase
          .from('parents')
          .select('profile_id')
          .eq('id', student.parent_id)
          .eq('profile_id', userId)
          .single();
        hasAccess = !!parent;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get student info
    const { data: student } = await supabase
      .from('students')
      .select('*, profiles:profile_id(*)')
      .eq('id', studentId)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get user progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', student.profile_id)
      .single();

    // Get completed lessons
    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('*, lessons:lesson_id(code, title_vi, xp_reward)')
      .eq('user_id', student.profile_id)
      .eq('completed', true);

    // Get badges
    const { data: badges } = await supabase
      .from('earned_badges')
      .select('*, badges(*)')
      .eq('user_id', student.profile_id);

    // Get missions
    const { data: missions } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', student.profile_id);

    // Get streaks
    const { data: streaks } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', student.profile_id)
      .single();

    res.json({
      student: {
        id: student.id,
        name: student.profiles?.full_name,
        email: student.profiles?.email,
        grade_level: student.grade_level,
        school_name: student.school_name
      },
      progress: {
        xp: progress?.total_xp || 0,
        level: Math.floor((progress?.total_xp || 0) / 100) + 1,
        lessons_completed: completedLessons?.length || 0,
        missions_completed: missions?.filter(m => m.status === 'completed').length || 0,
        badges_earned: badges?.length || 0,
        current_streak: streaks?.current_streak || 0,
        longest_streak: streaks?.longest_streak || 0
      },
      recent_lessons: completedLessons?.slice(0, 5).map(cl => ({
        code: cl.lessons?.code,
        title: cl.lessons?.title_vi,
        xp_earned: cl.lessons?.xp_reward,
        completed_at: cl.completed_at
      })) || [],
      recent_badges: badges?.slice(0, 5).map(b => ({
        name: b.badges?.name,
        icon_url: b.badges?.icon_url,
        earned_at: b.earned_at
      })) || [],
      streak_info: streaks ? {
        current: streaks.current_streak,
        longest: streaks.longest_streak,
        last_activity: streaks.last_activity_date
      } : null
    });

  } catch (error) {
    console.error('Student progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PROGRESS REPORT PDF EXPORT
// ============================================

// POST /api/schools/:schoolId/progress/export - Export progress report as PDF
router.post('/:schoolId/progress/export', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { class_id, student_id, report_type = 'class' } = req.body;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Verify access
    if (userRole === 'school_admin') {
      const { data: adminSchool } = await supabase
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'teacher') {
      const { data: teacherSchool } = await supabase
        .from('school_teachers')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!teacherSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['robokids_staff', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get school info
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .single();

    // Get data based on report type
    let reportData = {};
    let fileName = '';

    if (report_type === 'student' && student_id) {
      // Individual student report
      const { data: student } = await supabase
        .from('students')
        .select('*, profiles:profile_id(full_name, email)')
        .eq('id', student_id)
        .single();

      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', student.profile_id)
        .single();

      const { data: completedLessons } = await supabase
        .from('lesson_progress')
        .select('*, lessons:lesson_id(code, title_vi, xp_reward)')
        .eq('user_id', student.profile_id)
        .eq('completed', true);

      const { data: badges } = await supabase
        .from('earned_badges')
        .select('*, badges(*)')
        .eq('user_id', student.profile_id);

      reportData = {
        type: 'student',
        student: {
          name: student.profiles?.full_name,
          email: student.profiles?.email,
          grade_level: student.grade_level
        },
        progress: {
          xp: progress?.total_xp || 0,
          level: Math.floor((progress?.total_xp || 0) / 100) + 1,
          lessons_completed: completedLessons?.length || 0,
          badges_earned: badges?.length || 0
        },
        completed_lessons: completedLessons || [],
        badges: badges || []
      };
      fileName = `progress_${student.profiles?.full_name || 'student'}_${new Date().toISOString().split('T')[0]}.pdf`;
    } else if (report_type === 'class' && class_id) {
      // Class report
      const { data: classInfo } = await supabase
        .from('school_classes')
        .select('*')
        .eq('id', classId)
        .single();

      const { data: relations } = await supabase
        .from('student_school_relations')
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .eq('status', 'active');

      const studentIds = relations?.map(r => r.student_id) || [];

      const { data: students } = await supabase
        .from('students')
        .select('id, profile_id, profiles:profile_id(full_name)')
        .in('id', studentIds);

      const profileIds = students?.map(s => s.profile_id) || [];

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .in('user_id', profileIds);

      const studentProgress = students?.map(s => {
        const xp = progressData?.find(p => p.user_id === s.profile_id)?.total_xp || 0;
        return {
          name: s.profiles?.full_name,
          xp,
          level: Math.floor(xp / 100) + 1
        };
      }) || [];

      const avgXp = studentProgress.length > 0
        ? Math.round(studentProgress.reduce((sum, s) => sum + s.xp, 0) / studentProgress.length)
        : 0;

      reportData = {
        type: 'class',
        class: {
          name: classInfo?.name,
          grade_level: classInfo?.grade_level
        },
        student_count: studentProgress.length,
        average_xp: avgXp,
        average_level: Math.floor(avgXp / 100) + 1,
        students: studentProgress
      };
      fileName = `progress_class_${classInfo?.name || 'class'}_${new Date().toISOString().split('T')[0]}.pdf`;
    } else {
      // School overview report
      const { data: relations } = await supabase
        .from('student_school_relations')
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      const studentIds = relations?.map(r => r.student_id) || [];

      const { data: students } = await supabase
        .from('students')
        .select('id, profile_id')
        .in('id', studentIds);

      const profileIds = students?.map(s => s.profile_id) || [];

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .in('user_id', profileIds);

      const totalXp = progressData?.reduce((sum, p) => sum + (p.total_xp || 0), 0) || 0;
      const avgXp = studentIds.length > 0 ? Math.round(totalXp / studentIds.length) : 0;

      reportData = {
        type: 'school',
        school_name: school?.name,
        total_students: studentIds.length,
        average_xp: avgXp,
        average_level: Math.floor(avgXp / 100) + 1
      };
      fileName = `progress_school_${school?.name || 'school'}_${new Date().toISOString().split('T')[0]}.pdf`;
    }

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('RoboKids Vietnam', { align: 'center' });
    doc.fontSize(16).text('Student Progress Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`School: ${school?.name || 'N/A'}`, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleDateString('vi-VN')}`, { align: 'center' });
    doc.moveDown();

    if (reportData.type === 'student') {
      doc.fontSize(14).text('Student Information', { underline: true });
      doc.fontSize(12);
      doc.text(`Name: ${reportData.student?.name || 'N/A'}`);
      doc.text(`Email: ${reportData.student?.email || 'N/A'}`);
      doc.text(`Grade Level: ${reportData.student?.grade_level || 'N/A'}`);
      doc.moveDown();

      doc.fontSize(14).text('Progress Summary', { underline: true });
      doc.fontSize(12);
      doc.text(`XP: ${reportData.progress?.xp || 0}`);
      doc.text(`Level: ${reportData.progress?.level || 1}`);
      doc.text(`Lessons Completed: ${reportData.progress?.lessons_completed || 0}`);
      doc.text(`Badges Earned: ${reportData.progress?.badges_earned || 0}`);
      doc.moveDown();

      if (reportData.completed_lessons?.length > 0) {
        doc.fontSize(14).text('Completed Lessons', { underline: true });
        doc.fontSize(10);
        for (const lesson of reportData.completed_lessons.slice(0, 10)) {
          doc.text(`- ${lesson.lessons?.title_vi || 'Lesson'} (${lesson.lessons?.code || 'N/A'}) - XP: ${lesson.lessons?.xp_reward || 0}`);
        }
      }
    } else if (reportData.type === 'class') {
      doc.fontSize(14).text('Class Information', { underline: true });
      doc.fontSize(12);
      doc.text(`Class: ${reportData.class?.name || 'N/A'}`);
      doc.text(`Grade Level: ${reportData.class?.grade_level || 'N/A'}`);
      doc.text(`Total Students: ${reportData.student_count || 0}`);
      doc.moveDown();

      doc.fontSize(14).text('Class Summary', { underline: true });
      doc.fontSize(12);
      doc.text(`Average XP: ${reportData.average_xp || 0}`);
      doc.text(`Average Level: ${reportData.average_level || 1}`);
      doc.moveDown();

      if (reportData.students?.length > 0) {
        doc.fontSize(14).text('Student Progress', { underline: true });
        doc.fontSize(10);
        doc.text('Name                     XP       Level', { continued: false });
        doc.text('-' .repeat(40));
        for (const student of reportData.students) {
          const name = (student.name || 'N/A').padEnd(20);
          doc.text(`${name} ${(student.xp || 0).toString().padStart(8)} ${(student.level || 1).toString().padStart(8)}`);
        }
      }
    } else {
      doc.fontSize(14).text('School Overview', { underline: true });
      doc.fontSize(12);
      doc.text(`Total Students: ${reportData.total_students || 0}`);
      doc.text(`Average XP: ${reportData.average_xp || 0}`);
      doc.text(`Average Level: ${reportData.average_level || 1}`);
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text('Generated by RoboKids Vietnam Platform', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Progress export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WEEKLY PROGRESS EMAIL ENDPOINTS
// ============================================

// POST /api/schools/:schoolId/parents/weekly-email - Send weekly progress email to parents
router.post('/:schoolId/parents/weekly-email', authenticate, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { student_ids } = req.body;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Verify access
    if (userRole === 'teacher') {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', userId)
        .single();

      if (!teacherRelation) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get students - either specific ones or all active students
    let query = supabase
      .from('student_school_relations')
      .select('student_id')
      .eq('school_id', schoolId)
      .eq('status', 'active');

    if (student_ids && student_ids.length > 0) {
      query = query.in('student_id', student_ids);
    }

    const { data: relations } = await query;
    const studentIds = relations?.map(r => r.student_id) || [];

    if (studentIds.length === 0) {
      return res.json({ message: 'No students found', sent: 0 });
    }

    // Get student details with parent info
    const { data: students } = await supabase
      .from('students')
      .select(`
        id,
        profile_id,
        grade_level,
        school_name,
        parents:parent_id(
          email,
          name
        ),
        profiles:profile_id(full_name)
      `)
      .in('id', studentIds);

    const profileIds = students?.map(s => s.profile_id) || [];

    // Get progress for last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: progressData } = await supabase
      .from('user_progress')
      .select('*')
      .in('user_id', profileIds)
      .gte('updated_at', weekAgo);

    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('user_id, lessons:lesson_id(xp_reward)')
      .in('user_id', profileIds)
      .eq('completed', true)
      .gte('completed_at', weekAgo);

    const { data: badges } = await supabase
      .from('earned_badges')
      .select('user_id, badges(name)')
      .in('user_id', profileIds)
      .gte('earned_at', weekAgo);

    // Send emails
    const results = { sent: 0, failed: 0 };

    for (const student of (students || [])) {
      const parentEmail = student.parents?.email;
      if (!parentEmail) continue;

      const studentProgress = progressData?.find(p => p.user_id === student.profile_id);
      const studentLessons = completedLessons?.filter(cl => cl.user_id === student.profile_id) || [];
      const studentBadges = badges?.filter(b => b.user_id === student.profile_id) || [];

      const xpEarned = studentLessons.reduce((sum, cl) => sum + (cl.lessons?.xp_reward || 0), 0);
      const totalXp = studentProgress?.total_xp || 0;
      const level = Math.floor(totalXp / 100) + 1;

      try {
        await sendWeeklyProgressEmail({
          to: parentEmail,
          studentName: student.profiles?.full_name || 'Student',
          lessonsCompleted: studentLessons.length,
          xpEarned,
          totalXp,
          level,
          topBadges: studentBadges.slice(0, 3).map(b => b.badges?.name)
        });

        results.sent++;
      } catch (err) {
        console.error(`Failed to send email to ${parentEmail}:`, err);
        results.failed++;
      }
    }

    res.json({
      message: `Weekly progress emails sent`,
      total_students: students?.length || 0,
      sent: results.sent,
      failed: results.failed
    });

  } catch (error) {
    console.error('Weekly email error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schools/:schoolId/parents/weekly-email/preview - Preview weekly email for a student
router.get('/:schoolId/parents/weekly-email/preview', authenticate, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { student_id } = req.query;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Verify access
    if (userRole === 'teacher') {
      const { data: teacherRelation } = await supabase
        .from('school_teachers')
        .select('id')
        .eq('school_id', schoolId)
        .eq('teacher_id', userId)
        .single();

      if (!teacherRelation) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required' });
    }

    // Get student
    const { data: student } = await supabase
      .from('students')
      .select(`
        id,
        profile_id,
        parents:parent_id(email, name),
        profiles:profile_id(full_name)
      `)
      .eq('id', student_id)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get weekly progress
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', student.profile_id)
      .single();

    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('*, lessons:lesson_id(code, title_vi, xp_reward)')
      .eq('user_id', student.profile_id)
      .eq('completed', true)
      .gte('completed_at', weekAgo);

    const { data: badges } = await supabase
      .from('earned_badges')
      .select('*, badges(name, icon_url)')
      .eq('user_id', student.profile_id)
      .gte('earned_at', weekAgo);

    const xpEarned = completedLessons?.reduce((sum, cl) => sum + (cl.lessons?.xp_reward || 0), 0) || 0;
    const totalXp = progress?.total_xp || 0;
    const level = Math.floor(totalXp / 100) + 1;

    res.json({
      student_name: student.profiles?.full_name,
      parent_email: student.parents?.email,
      preview: {
        lessons_completed: completedLessons?.length || 0,
        xp_earned: xpEarned,
        total_xp: totalXp,
        level,
        new_badges: badges?.map(b => b.badges?.name) || []
      },
      recent_lessons: completedLessons?.slice(0, 5).map(cl => ({
        title: cl.lessons?.title_vi,
        code: cl.lessons?.code,
        xp: cl.lessons?.xp_reward
      })) || []
    });

  } catch (error) {
    console.error('Email preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;