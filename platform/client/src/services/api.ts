import PocketBase from 'pocketbase';

// PocketBase client - uses VITE_POCKETBASE_URL from environment
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090');

interface SignupData {
  email: string;
  password: string;
  passwordConfirm: string;
  full_name: string;
  role: 'parent' | 'student';
  date_of_birth?: string;
  grade_level?: number;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    role?: string;
    full_name?: string;
  };
  token?: string;
  email_verification_required?: boolean;
}

// Helper to convert PocketBase user to AuthResponse format
function pbUserToAuthResponse(pbUser: any, token?: string): AuthResponse {
  return {
    user: {
      id: pbUser.id,
      email: pbUser.email,
      role: pbUser.role,
      full_name: pbUser.full_name,
    },
    token: token,
  };
}

export const authApi = {
  register: async (data: SignupData): Promise<AuthResponse> => {
    try {
      // PocketBase requires passwordConfirm for registration
      const formData = {
        email: data.email,
        password: data.password,
        passwordConfirm: data.passwordConfirm || data.password,
        full_name: data.full_name,
        role: data.role,
        date_of_birth: data.date_of_birth,
        grade_level: data.grade_level,
      };

      const result = await pb.collection('users').create(formData);

      // Auto-login after registration
      const authResult = await pb.collection('users').authWithPassword(data.email, data.password);

      return pbUserToAuthResponse(authResult.record, authResult.token);
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  },

  signup: async (data: SignupData): Promise<AuthResponse> => {
    return authApi.register(data);
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      const authResult = await pb.collection('users').authWithPassword(data.email, data.password);
      return pbUserToAuthResponse(authResult.record, authResult.token);
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  },

  logout: async (): Promise<void> => {
    pb.authStore.clear();
  },

  getSession: async (): Promise<{ user: any }> => {
    if (!pb.authStore.isValid) {
      throw new Error('Not authenticated');
    }
    return { user: pb.authStore.model };
  },

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    try {
      await pb.collection('users').requestPasswordReset(email);
      return { message: 'Password reset email sent' };
    } catch (error: any) {
      throw new Error(error.message || 'Password reset failed');
    }
  },

  verifyAge: async (dateOfBirth: string): Promise<{ age: number; requires_parental_consent: boolean; message: string }> => {
    // Calculate age from date of birth
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const requires_parental_consent = age < 13;
    return {
      age,
      requires_parental_consent,
      message: requires_parental_consent
        ? 'Student under 13 requires parental consent'
        : 'Age verified successfully',
    };
  },

  linkStudent: async (_token: string, _studentEmail: string): Promise<{ message: string }> => {
    // PocketBase handles relationships via collection references
    throw new Error('linkStudent not implemented for PocketBase - use school_students collection');
  },

  getMe: async (): Promise<{ user: any }> => {
    if (!pb.authStore.isValid) {
      throw new Error('Not authenticated');
    }
    try {
      const user = await pb.collection('users').authRefresh();
      return { user: user.record };
    } catch {
      return { user: pb.authStore.model };
    }
  },

  updateProfile: async (_token: string, updates: { full_name?: string; avatar_url?: string; date_of_birth?: string; grade_level?: number }): Promise<{ user: any }> => {
    if (!pb.authStore.isValid) {
      throw new Error('Not authenticated');
    }
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) throw new Error('Not authenticated');

      const updatedUser = await pb.collection('users').update(userId, updates);
      return { user: updatedUser };
    } catch (error: any) {
      throw new Error(error.message || 'Profile update failed');
    }
  },
};

// API_BASE for Express.js/Cloudflare Worker endpoints (AI, live-classes, schools)
// Uses VITE_API_URL or falls back to localhost for development
const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3200';

export const aiApi = {
  chat: async (messages: { role: 'user' | 'assistant'; content: string }[], token?: string, age?: number): Promise<{ response: string }> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, age }),
    });
    return handleResponse<{ response: string }>(response);
  },

  analyze: async (blocklyXml: string, token?: string, age?: number): Promise<{ response: string }> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/api/ai/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ blocklyXml, age }),
    });
    return handleResponse<{ response: string }>(response);
  },

  explainBlock: async (blockType: string, blockFields: Record<string, any>, blockId: string, token?: string, age?: number): Promise<{ response: string; blockType: string }> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/api/ai/explain-block`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ blockType, blockFields, blockId, age }),
    });
    return handleResponse<{ response: string; blockType: string }>(response);
  },

  getHint: async (lessonId: string, context: string, token?: string, age?: number): Promise<{ hint: string; difficulty: string }> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/api/ai/hint`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ lessonId, context, age }),
    });
    return handleResponse<{ hint: string; difficulty: string }>(response);
  },

  getRecommendations: async (token: string): Promise<{ recommendations: any[] }> => {
    const response = await fetch(`${API_BASE}/api/ai/recommendations`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<{ recommendations: any[] }>(response);
  },

  // Proactive AI Tutor (RoboBuddy Space Academy Phase 2)
  proactiveEvent: async (studentId: string, eventType: string, data?: Record<string, any>, age?: number): Promise<{ recorded: boolean }> => {
    const response = await fetch(`${API_BASE}/api/ai/proactive/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, eventType, data, age }),
    });
    return handleResponse<{ recorded: boolean }>(response);
  },

  proactiveCheck: async (studentId: string): Promise<{ shouldIntervene: boolean; type: string | null; message: string | null }> => {
    const response = await fetch(`${API_BASE}/api/ai/proactive/check/${studentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<{ shouldIntervene: boolean; type: string | null; message: string | null }>(response);
  },

  proactiveIntervene: async (studentId: string, interventionType: string, age?: number): Promise<{ recorded: boolean; suggestion: string | null }> => {
    const response = await fetch(`${API_BASE}/api/ai/proactive/intervene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, interventionType, age }),
    });
    return handleResponse<{ recorded: boolean; suggestion: string | null }>(response);
  },

  proactiveAnalytics: async (studentId: string): Promise<any> => {
    const response = await fetch(`${API_BASE}/api/ai/proactive/analytics/${studentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<any>(response);
  },

  proactiveDifficulty: async (studentId: string): Promise<any> => {
    const response = await fetch(`${API_BASE}/api/ai/proactive/difficulty/${studentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<any>(response);
  },

  proactiveSupport: async (studentId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE}/api/ai/proactive/support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    return handleResponse<{ message: string }>(response);
  },

  proactiveClear: async (studentId: string): Promise<{ cleared: boolean }> => {
    const response = await fetch(`${API_BASE}/api/ai/proactive/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    return handleResponse<{ cleared: boolean }>(response);
  },

  proactiveProactiveMessage: async (studentId: string, context?: string, age?: number, currentLesson?: number): Promise<{ message: string; intervention: boolean }> => {
    const response = await fetch(`${API_BASE}/api/ai/proactive/proactive-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, context, age, currentLesson }),
    });
    return handleResponse<{ message: string; intervention: boolean }>(response);
  },

  prewarm: async (options?: { age?: number; currentLesson?: number }): Promise<{ prewarmed: boolean }> => {
    const response = await fetch(`${API_BASE}/api/ai/prewarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    return handleResponse<{ prewarmed: boolean }>(response);
  },

  getCacheStats: async (): Promise<{ semanticCache: { size: number; maxSize: number } }> => {
    const response = await fetch(`${API_BASE}/api/ai/cache/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },
};

export const liveClassApi = {
  getSessions: async (token: string): Promise<{ sessions: any[] }> => {
    const response = await fetch(`${API_BASE}/api/live-classes`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<{ sessions: any[] }>(response);
  },

  getSession: async (sessionId: string, token: string): Promise<{ session: any }> => {
    const response = await fetch(`${API_BASE}/api/live-classes/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<{ session: any }>(response);
  },

  enroll: async (sessionId: string, token: string): Promise<{ enrollment: any }> => {
    const response = await fetch(`${API_BASE}/api/live-classes/${sessionId}/enroll`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<{ enrollment: any }>(response);
  },

  unenroll: async (sessionId: string, token: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE}/api/live-classes/${sessionId}/enroll`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<{ message: string }>(response);
  },

  getEnrollments: async (token: string): Promise<{ enrollments: any[] }> => {
    const response = await fetch(`${API_BASE}/api/live-classes/enrollments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<{ enrollments: any[] }>(response);
  },

  createJitsiRoom: async (sessionId: string, token: string): Promise<{ jitsiRoom: string }> => {
    const response = await fetch(`${API_BASE}/api/live-classes/${sessionId}/jitsi`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<{ jitsiRoom: string }>(response);
  },

  getJitsiRoom: async (sessionId: string, token: string): Promise<{ jitsiRoom: string }> => {
    const response = await fetch(`${API_BASE}/api/live-classes/${sessionId}/jitsi`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleResponse<{ jitsiRoom: string }>(response);
  },
};

export const schoolApi = {
  // Get schools list (role-filtered)
  getSchools: async (token: string, page = 1, limit = 20): Promise<{ schools: any[]; pagination: any }> => {
    const response = await fetch(`${API_BASE}/api/schools?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  // Get single school details
  getSchool: async (token: string, schoolId: string): Promise<{ school: any }> => {
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  // Create school (robokids_staff only)
  createSchool: async (token: string, data: {
    name: string;
    address?: string;
    city?: string;
    contact_email?: string;
    contact_phone?: string;
  }): Promise<{ school: any }> => {
    const response = await fetch(`${API_BASE}/api/schools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Update school
  updateSchool: async (token: string, schoolId: string, updates: {
    name?: string;
    address?: string;
    city?: string;
    contact_email?: string;
    contact_phone?: string;
  }): Promise<{ school: any }> => {
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  // Get school teachers
  getTeachers: async (token: string, schoolId: string): Promise<{ teachers: any[] }> => {
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/teachers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  // Add teacher to school
  addTeacher: async (token: string, schoolId: string, email: string, role = 'teacher'): Promise<{ teacher: any }> => {
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ teacher_email: email, role }),
    });
    return handleResponse(response);
  },

  // Bulk import teachers
  bulkImportTeachers: async (token: string, schoolId: string, teachers: { email: string; name?: string; role?: string }[]): Promise<{ imported: number; failed: number; results: any }> => {
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/teachers/bulk-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ teachers }),
    });
    return handleResponse(response);
  },

  // Get school classes
  getClasses: async (token: string, schoolId: string): Promise<{ classes: any[] }> => {
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/classes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  // Create class
  createClass: async (token: string, schoolId: string, data: {
    name: string;
    grade_level: number;
    teacher_id?: string;
    academic_year?: string;
    max_students?: number;
  }): Promise<{ class: any }> => {
    const response = await fetch(`${API_BASE}/api/schools/${schoolId}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Get school students
  getStudents: async (token: string, schoolId: string, classId?: string): Promise<{ students: any[] }> => {
    const url = classId
      ? `${API_BASE}/api/schools/${schoolId}/students?class_id=${classId}`
      : `${API_BASE}/api/schools/${schoolId}/students`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  // Invite user to school (robokids_staff only)
  inviteUser: async (token: string, email: string, role: 'school_admin' | 'teacher', schoolId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE}/api/schools/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, role, school_id: schoolId }),
    });
    return handleResponse(response);
  },
};

// Handle API response helper
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'An error occurred');
  }
  return data;
}

export default authApi;