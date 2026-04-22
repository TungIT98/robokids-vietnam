/**
 * Live Class API - PocketBase SDK implementation
 * Replaces Express.js-based liveClassApi in api.ts
 *
 * STACK-2026: PocketBase is the primary backend
 * Uses PocketBase SDK directly instead of REST API
 */

import pocketbase from './pocketbase';
import type PocketBase from 'pocketbase';

export interface LiveClass {
  id: string;
  title: string;
  description: string;
  teacher_id: string;
  teacher_name: string;
  teacher_avatar: string;
  scheduled_at: string;
  duration: number;
  max_students: number;
  price: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  meeting_link: string;
  jitsi_room: string;
}

export interface LiveClassEnrollment {
  id: string;
  live_class: string;
  student: string;
  enrolled_at: string;
  payment_status: 'pending' | 'paid' | 'refunded';
}

// Format PocketBase record to LiveClass interface
function formatLiveClass(record: any): LiveClass {
  return {
    id: record.id,
    title: record.title || '',
    description: record.description || '',
    teacher_id: record.teacher_id || '',
    teacher_name: record.teacher_name || 'Teacher',
    teacher_avatar: record.teacher_avatar || '👨‍🏫',
    scheduled_at: record.scheduled_at || '',
    duration: record.duration || 45,
    max_students: record.max_students || 6,
    price: record.price || 15,
    status: record.status || 'scheduled',
    meeting_link: record.meeting_link || '',
    jitsi_room: record.jitsi_room || '',
  };
}

// Format enrollment record
function formatEnrollment(record: any): any {
  return {
    id: record.id,
    sessionId: record.live_class,
    enrolledAt: record.enrolled_at,
    session: record.expand?.live_class ? formatLiveClass(record.expand.live_class) : null,
  };
}

export const liveClassApi = {
  /**
   * Get all scheduled/live class sessions
   */
  getSessions: async (): Promise<{ sessions: LiveClass[] }> => {
    try {
      const result = await pocketbase.collection('live_classes').getList(1, 50, {
        filter: "status='scheduled' || status='live'",
        sort: 'scheduled_at',
      });

      return {
        sessions: result.items.map(formatLiveClass),
      };
    } catch (error: any) {
      console.error('Error fetching live classes:', error);
      throw new Error(error.message || 'Failed to fetch live classes');
    }
  },

  /**
   * Get a specific session by ID
   */
  getSession: async (sessionId: string): Promise<{ session: LiveClass }> => {
    try {
      const record = await pocketbase.collection('live_classes').getOne(sessionId);
      return { session: formatLiveClass(record) };
    } catch (error: any) {
      console.error('Error fetching session:', error);
      throw new Error(error.message || 'Failed to fetch session');
    }
  },

  /**
   * Get current user's enrolled sessions
   */
  getEnrollments: async (): Promise<{ enrollments: any[] }> => {
    try {
      if (!pocketbase.authStore.isValid) {
        throw new Error('Not authenticated');
      }

      const userId = pocketbase.authStore.model?.id;
      const result = await pocketbase.collection('live_class_enrollments').getList(1, 50, {
        filter: `student='${userId}'`,
        expand: 'live_class',
      });

      return {
        enrollments: result.items.map(formatEnrollment),
      };
    } catch (error: any) {
      console.error('Error fetching enrollments:', error);
      throw new Error(error.message || 'Failed to fetch enrollments');
    }
  },

  /**
   * Enroll in a live class session
   */
  enroll: async (sessionId: string): Promise<{ enrollment: any }> => {
    try {
      if (!pocketbase.authStore.isValid) {
        throw new Error('Not authenticated');
      }

      const userId = pocketbase.authStore.model?.id;

      // Check if already enrolled
      const existing = await pocketbase.collection('live_class_enrollments').getList(1, 1, {
        filter: `live_class='${sessionId}' && student='${userId}'`,
      });

      if (existing.totalItems > 0) {
        throw new Error('Already enrolled in this session');
      }

      // Create enrollment
      const record = await pocketbase.collection('live_class_enrollments').create({
        live_class: sessionId,
        student: userId,
        enrolled_at: new Date().toISOString(),
        payment_status: 'pending',
      });

      return {
        enrollment: {
          id: record.id,
          sessionId: record.live_class,
          enrolledAt: record.enrolled_at,
        },
      };
    } catch (error: any) {
      console.error('Error enrolling:', error);
      throw new Error(error.message || 'Failed to enroll');
    }
  },

  /**
   * Unenroll from a live class session
   */
  unenroll: async (sessionId: string): Promise<{ message: string }> => {
    try {
      if (!pocketbase.authStore.isValid) {
        throw new Error('Not authenticated');
      }

      const userId = pocketbase.authStore.model?.id;

      // Find and delete enrollment
      const result = await pocketbase.collection('live_class_enrollments').getList(1, 1, {
        filter: `live_class='${sessionId}' && student='${userId}'`,
      });

      if (result.totalItems > 0) {
        await pocketbase.collection('live_class_enrollments').delete(result.items[0].id);
      }

      return { message: 'Successfully unenrolled' };
    } catch (error: any) {
      console.error('Error unenrolling:', error);
      throw new Error(error.message || 'Failed to unenroll');
    }
  },

  /**
   * Create or get Jitsi room for a session
   */
  createJitsiRoom: async (sessionId: string): Promise<{ jitsiRoom: string }> => {
    try {
      const record = await pocketbase.collection('live_classes').getOne(sessionId);

      // Generate Jitsi room if not exists
      if (!record.jitsi_room) {
        const jitsiRoom = `robokids-live-${sessionId}-${Date.now()}`;
        await pocketbase.collection('live_classes').update(sessionId, {
          jitsi_room: jitsiRoom,
          status: 'live',
        });
        return { jitsiRoom };
      }

      return { jitsiRoom: record.jitsi_room };
    } catch (error: any) {
      console.error('Error creating Jitsi room:', error);
      throw new Error(error.message || 'Failed to create Jitsi room');
    }
  },

  /**
   * Get Jitsi room info for a session
   */
  getJitsiRoom: async (sessionId: string): Promise<{ jitsiRoom: string }> => {
    try {
      const record = await pocketbase.collection('live_classes').getOne(sessionId, {
        fields: 'jitsi_room,status',
      });

      if (!record.jitsi_room) {
        throw new Error('Jitsi room not created yet');
      }

      return { jitsiRoom: record.jitsi_room };
    } catch (error: any) {
      console.error('Error fetching Jitsi room:', error);
      throw new Error(error.message || 'Failed to fetch Jitsi room');
    }
  },
};

export default liveClassApi;