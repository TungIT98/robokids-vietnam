/**
 * Parent Dashboard API service for RoboKids Vietnam
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export interface Student {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  gradeLevel: number | null;
  schoolName: string | null;
}

export interface ParentStudent {
  relationId: string;
  relationship: string;
  isPrimary: boolean;
  linkedAt: string;
  student: Student;
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  relationship: string | null;
  createdAt: string;
}

export interface LessonProgress {
  id: string;
  enrollmentId: string;
  lessonId: string;
  lessonTitle: string | null;
  courseId: string | null;
  courseName: string | null;
  completed: boolean;
  completedAt: string | null;
  timeSpentSeconds: number;
}

export interface Enrollment {
  id: string;
  courseId: string;
  courseName: string | null;
  courseDescription: string | null;
  courseDifficulty: string | null;
  courseThumbnail: string | null;
  enrolledAt: string;
  completedAt: string | null;
  progressPercent: number;
  lessonsCompleted: number;
  totalTimeSpentSeconds: number;
}

export interface Badge {
  id: string;
  badgeKey: string;
  name: string;
  nameVi: string | null;
  nameEn: string | null;
  description: string;
  descriptionVi: string | null;
  descriptionEn: string | null;
  badgeType: string | null;
  iconUrl: string | null;
  colorHex: string | null;
  xpReward: number;
  earnedAt: string;
  earnedContext: Record<string, any>;
}

export interface StudentProgress {
  student: Student;
  progress: {
    totalXp: number;
    currentLevel: number;
    levelTitle: string;
    currentStreakDays: number;
    longestStreakDays: number;
    lessonsCompleted: number;
    coursesCompleted: number;
    totalTimeSpentSeconds: number;
    joinedAt: string | null;
  };
  enrollments: Enrollment[];
  badges: Badge[];
}

interface ProgressResponse {
  studentId: string;
  lessons: LessonProgress[];
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }
  return data;
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export const parentApi = {
  /**
   * Get current parent's profile
   */
  getMe: async (token: string): Promise<Parent> => {
    const response = await fetch(`${API_BASE}/api/parents/me`, {
      headers: authHeaders(token),
    });
    return handleResponse<Parent>(response);
  },

  /**
   * Get list of students linked to a parent
   */
  getStudents: async (token: string, parentId: string): Promise<{ parentId: string; students: ParentStudent[] }> => {
    const response = await fetch(`${API_BASE}/api/parents/${parentId}/students`, {
      headers: authHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Get comprehensive progress for a student
   */
  getStudentProgress: async (token: string, studentId: string): Promise<StudentProgress> => {
    const response = await fetch(`${API_BASE}/api/students/${studentId}/progress`, {
      headers: authHeaders(token),
    });
    return handleResponse<StudentProgress>(response);
  },

  /**
   * Get lesson progress for a student
   */
  getStudentLessons: async (token: string, studentId: string): Promise<ProgressResponse> => {
    const response = await fetch(`${API_BASE}/api/students/${studentId}/progress/lessons`, {
      headers: authHeaders(token),
    });
    return handleResponse<ProgressResponse>(response);
  },

  /**
   * Link a student to a parent
   */
  linkStudent: async (token: string, parentId: string, studentId: string, relationship: string): Promise<any> => {
    const response = await fetch(`${API_BASE}/api/parents/${parentId}/students/${studentId}/link`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ relationship }),
    });
    return handleResponse(response);
  },

  /**
   * Unlink a student from a parent
   */
  unlinkStudent: async (token: string, parentId: string, studentId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/api/parents/${parentId}/students/${studentId}/link`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Create or update parent profile
   */
  upsertParent: async (token: string, data: { name: string; email: string; phone?: string; relationship?: string }): Promise<Parent> => {
    const response = await fetch(`${API_BASE}/api/parents`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<Parent>(response);
  },

  /**
   * Get payment history for parent's enrollments
   */
  getPayments: async (token: string): Promise<Payment[]> => {
    const response = await fetch(`${API_BASE}/api/payments`, {
      headers: authHeaders(token),
    });
    return handleResponse<Payment[]>(response);
  },

  /**
   * Get AI-generated insights for a student's progress
   */
  getStudentInsights: async (token: string, parentId: string, studentId: string): Promise<StudentInsights> => {
    const response = await fetch(`${API_BASE}/api/insights/${parentId}/students/${studentId}/insights`, {
      headers: authHeaders(token),
    });
    return handleResponse<StudentInsights>(response);
  },

  /**
   * Get learning analytics heatmaps for a student
   */
  getStudentHeatmaps: async (token: string, studentId: string): Promise<LearningAnalytics> => {
    const response = await fetch(`${API_BASE}/api/analytics/heatmaps?studentId=${studentId}`, {
      headers: authHeaders(token),
    });
    return handleResponse<LearningAnalytics>(response);
  },
};

export interface Payment {
  id: string;
  enrollment_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paid_at: string | null;
  created_at: string;
  parent_name: string | null;
  child_name: string | null;
}

export interface StudentInsights {
  studentId: string;
  studentName: string | null;
  age: number;
  ageGroup: string;
  analysis: {
    totalXp: number;
    currentLevel: number;
    currentStreakDays: number;
    coursesCompleted: number;
    totalTimeSpentSeconds: number;
    completedLessons: number;
    failedLessons: number;
    averageTimePerLesson: number;
    preferredDifficulty: string | null;
    engagement: 'low' | 'medium' | 'high';
    badgeCount: number;
  };
  insights: string | null;
  generatedAt: string;
}

export interface LearningAnalytics {
  studentId: string;
  studentName: string | null;
  gradeLevel: number;
  ageGroup: string;
  generatedAt: string;
  exerciseAttempts: {
    category: string;
    attempts: number;
    totalAttempts: number;
  }[];
  timePerLesson: {
    lessonId: string;
    lessonTitle: string;
    timeSpentMinutes: number;
    completed: boolean;
  }[];
  topicSuccessRates: {
    topic: string;
    successRate: number;
    completedLessons: number;
    totalLessons: number;
  }[];
  engagementByAgeGroup: {
    ageGroup: string;
    ageGroupKey: string;
    engagement: number;
    activeStudents: number;
    isCurrentStudent: boolean;
  }[];
}
