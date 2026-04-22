/**
 * Parent-Teacher Messaging API Service for RoboKids Vietnam
 * Handles in-app messaging between parents and teachers
 */

import PocketBase from 'pocketbase';
import pocketbase from './pocketbase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

// ============================================
// Types
// ============================================

export interface Message {
  id: string;
  sender_id: string;
  sender_type: 'parent' | 'teacher' | 'student';
  receiver_id: string;
  receiver_type: 'parent' | 'teacher' | 'student';
  student_id?: string;
  content: string;
  message_type: 'text' | 'progress_update' | 'behavior_alert' | 'appointment_request' | 'appointment_confirmed' | 'appointment_cancelled';
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  participant_parent_id: string;
  participant_teacher_id: string;
  student_id?: string;
  last_message_at: string;
  last_message_preview?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
  // Expanded relations
  parent?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  teacher?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  student?: {
    id: string;
    full_name: string;
  };
}

export interface Appointment {
  id: string;
  parent_id: string;
  teacher_id: string;
  student_id?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  appointment_type: 'parent_teacher_meeting' | 'progress_review' | 'behavior_discussion' | 'enrollment_inquiry' | 'other';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes?: string;
  meeting_link?: string;
  created_at: string;
  updated_at: string;
  // Expanded relations
  parent?: {
    id: string;
    full_name: string;
  };
  teacher?: {
    id: string;
    full_name: string;
  };
  student?: {
    id: string;
    full_name: string;
  };
}

export interface BehaviorAlert {
  id: string;
  teacher_id: string;
  parent_id: string;
  student_id: string;
  alert_type: 'positive' | 'negative' | 'warning';
  category: 'participation' | 'homework' | 'behavior' | 'achievement' | 'attendance' | 'other';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  is_read: boolean;
  read_at?: string;
  created_at: string;
  // Expanded relations
  teacher?: {
    id: string;
    full_name: string;
  };
  parent?: {
    id: string;
    full_name: string;
  };
  student?: {
    id: string;
    full_name: string;
  };
}

export interface SendMessageData {
  receiver_id: string;
  receiver_type: 'parent' | 'teacher' | 'student';
  student_id?: string;
  content: string;
  message_type?: 'text' | 'progress_update' | 'behavior_alert' | 'appointment_request';
}

export interface CreateAppointmentData {
  teacher_id: string;
  student_id?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes?: number;
  appointment_type: Appointment['appointment_type'];
  notes?: string;
}

export interface CreateBehaviorAlertData {
  parent_id: string;
  student_id: string;
  alert_type: BehaviorAlert['alert_type'];
  category: BehaviorAlert['category'];
  title: string;
  description: string;
  severity?: BehaviorAlert['severity'];
}

// ============================================
// Helper Functions
// ============================================

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'An error occurred');
  }
  return data;
}

function authHeaders(token?: string) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

// ============================================
// Messaging API (uses Express backend)
// ============================================

export const messagingApi = {
  /**
   * Get all conversations for the current user (parent or teacher)
   */
  getConversations: async (token: string): Promise<{ conversations: Conversation[] }> => {
    const response = await fetch(`${API_BASE}/api/messaging/conversations`, {
      headers: authHeaders(token),
    });
    return handleResponse<{ conversations: Conversation[] }>(response);
  },

  /**
   * Get messages in a conversation
   */
  getMessages: async (token: string, conversationId: string, limit = 50, offset = 0): Promise<{ messages: Message[]; total: number }> => {
    const response = await fetch(`${API_BASE}/api/messaging/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`, {
      headers: authHeaders(token),
    });
    return handleResponse<{ messages: Message[]; total: number }>(response);
  },

  /**
   * Send a message
   */
  sendMessage: async (token: string, data: SendMessageData): Promise<{ message: Message }> => {
    const response = await fetch(`${API_BASE}/api/messaging/messages`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: Message }>(response);
  },

  /**
   * Mark messages as read
   */
  markAsRead: async (token: string, conversationId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/api/messaging/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse<{ success: boolean }>(response);
  },

  /**
   * Get or create a conversation with a teacher/parent
   */
  getOrCreateConversation: async (token: string, participantId: string, participantType: 'parent' | 'teacher', studentId?: string): Promise<{ conversation: Conversation }> => {
    const response = await fetch(`${API_BASE}/api/messaging/conversations`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ participant_id: participantId, participant_type: participantType, student_id: studentId }),
    });
    return handleResponse<{ conversation: Conversation }>(response);
  },
};

// ============================================
// Appointments API
// ============================================

export const appointmentsApi = {
  /**
   * Get appointments for current user
   */
  getAppointments: async (token: string, status?: Appointment['status']): Promise<{ appointments: Appointment[] }> => {
    const url = status ? `${API_BASE}/api/appointments?status=${status}` : `${API_BASE}/api/appointments`;
    const response = await fetch(url, {
      headers: authHeaders(token),
    });
    return handleResponse<{ appointments: Appointment[] }>(response);
  },

  /**
   * Get single appointment
   */
  getAppointment: async (token: string, appointmentId: string): Promise<{ appointment: Appointment }> => {
    const response = await fetch(`${API_BASE}/api/appointments/${appointmentId}`, {
      headers: authHeaders(token),
    });
    return handleResponse<{ appointment: Appointment }>(response);
  },

  /**
   * Create appointment request
   */
  createAppointment: async (token: string, data: CreateAppointmentData): Promise<{ appointment: Appointment }> => {
    const response = await fetch(`${API_BASE}/api/appointments`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ appointment: Appointment }>(response);
  },

  /**
   * Update appointment status
   */
  updateAppointmentStatus: async (token: string, appointmentId: string, status: Appointment['status'], notes?: string): Promise<{ appointment: Appointment }> => {
    const response = await fetch(`${API_BASE}/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ status, notes }),
    });
    return handleResponse<{ appointment: Appointment }>(response);
  },

  /**
   * Cancel appointment
   */
  cancelAppointment: async (token: string, appointmentId: string, reason?: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/api/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    });
    return handleResponse<{ success: boolean }>(response);
  },

  /**
   * Confirm appointment
   */
  confirmAppointment: async (token: string, appointmentId: string, meetingLink?: string): Promise<{ appointment: Appointment }> => {
    const response = await fetch(`${API_BASE}/api/appointments/${appointmentId}/confirm`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ meeting_link: meetingLink }),
    });
    return handleResponse<{ appointment: Appointment }>(response);
  },

  /**
   * Get available time slots for a teacher
   */
  getAvailableSlots: async (token: string, teacherId: string, date: string): Promise<{ slots: string[] }> => {
    const response = await fetch(`${API_BASE}/api/appointments/available-slots?teacher_id=${teacherId}&date=${date}`, {
      headers: authHeaders(token),
    });
    return handleResponse<{ slots: string[] }>(response);
  },
};

// ============================================
// Behavior Alerts API
// ============================================

export const behaviorApi = {
  /**
   * Get behavior alerts for parent
   */
  getAlerts: async (token: string, studentId?: string, unreadOnly = false): Promise<{ alerts: BehaviorAlert[]; unread_count: number }> => {
    let url = `${API_BASE}/api/behavior-alerts?unread_only=${unreadOnly}`;
    if (studentId) url += `&student_id=${studentId}`;
    const response = await fetch(url, {
      headers: authHeaders(token),
    });
    return handleResponse<{ alerts: BehaviorAlert[]; unread_count: number }>(response);
  },

  /**
   * Create behavior alert (teacher only)
   */
  createAlert: async (token: string, data: CreateBehaviorAlertData): Promise<{ alert: BehaviorAlert }> => {
    const response = await fetch(`${API_BASE}/api/behavior-alerts`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ alert: BehaviorAlert }>(response);
  },

  /**
   * Mark alert as read
   */
  markAsRead: async (token: string, alertId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/api/behavior-alerts/${alertId}/read`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse<{ success: boolean }>(response);
  },

  /**
   * Mark all alerts as read
   */
  markAllAsRead: async (token: string, studentId?: string): Promise<{ success: boolean }> => {
    const url = studentId ? `${API_BASE}/api/behavior-alerts/read-all?student_id=${studentId}` : `${API_BASE}/api/behavior-alerts/read-all`;
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse<{ success: boolean }>(response);
  },
};

// ============================================
// PocketBase Real-time Subscriptions
// ============================================

// Note: These functions use PocketBase subscriptions for real-time updates
// The PocketBase client must be authenticated before subscribing

export function subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
  return pocketbase.collection('messages').subscribe('*', (e) => {
    if (e.action === 'create' && e.record.conversation_id === conversationId) {
      callback(e.record as Message);
    }
  });
}

export function subscribeToConversations(callback: (conversation: Conversation) => void) {
  return pocketbase.collection('conversations').subscribe('*', (e) => {
    if (e.action === 'update') {
      callback(e.record as Conversation);
    }
  });
}

export function subscribeToAppointments(callback: (appointment: Appointment) => void) {
  return pocketbase.collection('appointments').subscribe('*', (e) => {
    callback(e.record as Appointment);
  });
}

export function subscribeToBehaviorAlerts(parentId: string, callback: (alert: BehaviorAlert) => void) {
  return pocketbase.collection('behavior_alerts').subscribe('*', (e) => {
    if (e.action === 'create' && e.record.parent_id === parentId) {
      callback(e.record as BehaviorAlert);
    }
  });
}

export function unsubscribeAll() {
  pocketbase.collection('messages').unsubscribe();
  pocketbase.collection('conversations').unsubscribe();
  pocketbase.collection('appointments').unsubscribe();
  pocketbase.collection('behavior_alerts').unsubscribe();
}
