const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

interface ApiOptions {
  token?: string | null;
}

// ============================================
// SCHOOL PROFILE API
// ============================================

export const schoolsApi = {
  // List schools (admin/robokids_staff only)
  list: async (params?: { page?: number; limit?: number; search?: string }, options?: ApiOptions) => {
    const { token } = options || {};
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);

    const response = await fetch(`${API_BASE}/api/schools?${query}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch schools');
    return data;
  },

  // Get school details
  get: async (schoolId: string, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch school');
    return data;
  },

  // Create school (admin only)
  create: async (school: {
    name: string;
    address?: string;
    city?: string;
    district?: string;
    phone?: string;
    email?: string;
    principal_name?: string;
    contact_person?: string;
    contact_phone?: string;
    contact_email?: string;
    logo_url?: string;
    subscription_plan?: string;
    subscription_start_date?: string;
    subscription_end_date?: string;
    max_students?: number;
    max_teachers?: number;
  }, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(school),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create school');
    return data;
  },

  // Update school
  update: async (schoolId: string, updates: Record<string, unknown>, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update school');
    return data;
  },

  // ============================================
  // TEACHER MANAGEMENT API
  // ============================================

  // List teachers at school
  listTeachers: async (schoolId: string, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/teachers`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch teachers');
    return data;
  },

  // Add teacher to school
  addTeacher: async (schoolId: string, teacherEmail: string, role: string = 'teacher', options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/teachers`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teacher_email: teacherEmail, role }),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add teacher');
    return data;
  },

  // Bulk import teachers
  bulkImportTeachers: async (schoolId: string, teachers: Array<{ email: string; name?: string; role?: string }>, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/teachers/bulk-import`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teachers }),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to bulk import teachers');
    return data;
  },

  // Remove teacher from school
  removeTeacher: async (schoolId: string, teacherId: string, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/teachers/${teacherId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to remove teacher');
    }
    return { success: true };
  },

  // ============================================
  // CLASS MANAGEMENT API
  // ============================================

  // List classes at school
  listClasses: async (schoolId: string, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/classes`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch classes');
    return data;
  },

  // Create class
  createClass: async (schoolId: string, classData: {
    name: string;
    grade_level: number;
    teacher_id?: string;
    academic_year?: string;
    schedule?: unknown;
    max_students?: number;
  }, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/classes`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(classData),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create class');
    return data;
  },

  // Update class
  updateClass: async (schoolId: string, classId: string, updates: Record<string, unknown>, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/classes/${classId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update class');
    return data;
  },

  // Delete class
  deleteClass: async (schoolId: string, classId: string, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/classes/${classId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete class');
    }
    return { success: true };
  },

  // ============================================
  // STUDENT MANAGEMENT API
  // ============================================

  // List students at school
  listStudents: async (schoolId: string, params?: { class_id?: string; status?: string }, options?: ApiOptions) => {
    const { token } = options || {};
    const query = new URLSearchParams();
    if (params?.class_id) query.set('class_id', params.class_id);
    if (params?.status) query.set('status', params.status);

    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/students?${query}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch students');
    return data;
  },

  // ============================================
  // BATCH STUDENT ONBOARDING API
  // ============================================

  // Validate CSV data before import
  validateCsv: async (schoolId: string, students: Array<{
    name?: string;
    email?: string;
    grade?: number;
    date_of_birth?: string;
    parent_name?: string;
    parent_email?: string;
    parent_phone?: string;
    class_id?: string;
  }>, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/students/validate-csv`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ students }),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to validate CSV');
    return data;
  },

  // Batch import students
  batchImport: async (schoolId: string, students: Array<{
    name?: string;
    email?: string;
    grade?: number;
    date_of_birth?: string;
    parent_name?: string;
    parent_email?: string;
    parent_phone?: string;
    class_id?: string;
  }>, options?: ApiOptions & { create_parent_accounts?: boolean; send_welcome_emails?: boolean; default_grade?: number }) => {
    const { token, create_parent_accounts = true, send_welcome_emails = true, default_grade } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/students/batch-import`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        students,
        create_parent_accounts,
        send_welcome_emails,
        default_grade,
      }),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to batch import students');
    return data;
  },

  // Get import template
  getImportTemplate: async (schoolId: string, options?: ApiOptions) => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/students/import-template`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get import template');
    return data;
  },
};

export default schoolsApi;
