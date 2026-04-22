import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabase.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate a unique student email for kids who don't have their own email.
 * Format: student.{sanitized_name}.{short_id}@students.robokids.edu.vn
 */
export function generateStudentEmail(name, shortId) {
  const sanitized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  return `student.${sanitized}.${shortId}@students.robokids.edu.vn`;
}

/**
 * Create a new student account.
 * Uses studentEmail if provided; falls back to a generated email using parentEmail as a base.
 * NOTE: parentEmail is only used for linking/notification, not as the student's login email.
 */
export async function createStudent({ name, age, parentEmail, classId, studentEmail }) {
  const tempPassword = generatePassword();
  const client = supabaseAdmin || supabase;

  // Use provided studentEmail or generate one (kids don't have their own email)
  const loginEmail = studentEmail || generateStudentEmail(name, Math.random().toString(36).slice(2, 8));

  const { data, error } = await client.auth.admin.createUser({
    email: loginEmail,
    password: tempPassword,
    user_metadata: {
      role: 'student',
      name,
      age: parseInt(age, 10),
      class_id: classId,
      parent_email: parentEmail,
    },
  });

  if (error) throw error;

  return {
    user: data.user,
    tempPassword,
    loginEmail,
  };
}

/**
 * Batch import students from a list
 */
export async function batchImportStudents(students) {
  const results = { success: [], failed: [] };

  for (const student of students) {
    try {
      const { name, age, parentEmail, classId } = student;

      if (!name || !age || !parentEmail) {
        results.failed.push({ student, error: 'Missing required fields' });
        continue;
      }

      const result = await createStudent({ name, age, parentEmail, classId });
      results.success.push({
        name,
        email: parentEmail,
        tempPassword: result.tempPassword,
        userId: result.user.id,
      });
    } catch (err) {
      results.failed.push({ student, error: err.message });
    }
  }

  return results;
}

/**
 * Generate a random 12-character password
 */
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default supabase;