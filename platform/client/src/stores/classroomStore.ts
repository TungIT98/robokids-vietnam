/**
 * Classroom Mode Store - Teacher-controlled classroom state management
 * Manages: teacher broadcast, activity locks, student progress, chat moderation
 */

import { create } from 'zustand';

export type LockStatus = 'locked' | 'unlocked' | 'timer';

export interface ClassroomStudent {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: 'online' | 'idle' | 'offline' | 'coding';
  currentActivity: string | null;
  progressPercent: number;
  lastActivityAt: string | null;
  isLocked: boolean;
  lockReason: string | null;
  lockExpiresAt: string | null;
}

export interface BroadcastMessage {
  id: string;
  content: string;
  timestamp: string;
  priority: 'normal' | 'high' | 'urgent';
}

export interface ChatMessage {
  id: string;
  studentId: string;
  studentName: string;
  content: string;
  timestamp: string;
  isFlagged: boolean;
  isMuted: boolean;
}

export interface ClassroomState {
  // Classroom metadata
  classroomId: string | null;
  className: string;
  teacherName: string;
  isActive: boolean;

  // Students
  students: ClassroomStudent[];

  // Teacher controls
  currentActivity: 'coding' | 'reading' | 'quiz' | 'break' | null;
  activityLockStatus: LockStatus;
  lockedActivities: string[]; // IDs of locked activities
  lockReason: string | null;
  lockExpiresAt: string | null;

  // Broadcast
  broadcastMessage: BroadcastMessage | null;
  broadcastHistory: BroadcastMessage[];

  // Chat moderation
  chatMessages: ChatMessage[];
  isChatModerationEnabled: boolean;
  flaggedMessages: string[];

  // Real-time updates
  lastUpdated: string | null;

  // Actions
  setClassroom: (classroomId: string, className: string, teacherName: string) => void;
  setStudents: (students: ClassroomStudent[]) => void;
  updateStudentStatus: (studentId: string, status: ClassroomStudent['status']) => void;
  updateStudentProgress: (studentId: string, progress: number, activity: string) => void;

  // Activity controls
  setCurrentActivity: (activity: ClassroomState['currentActivity']) => void;
  lockActivity: (activityId: string, reason: string, expiresAt?: string) => void;
  unlockActivity: (activityId: string) => void;
  lockAllActivities: (reason: string) => void;
  unlockAllActivities: () => void;
  setActivityLockStatus: (status: LockStatus) => void;

  // Broadcast controls
  broadcast: (content: string, priority?: BroadcastMessage['priority']) => void;
  clearBroadcast: () => void;

  // Chat moderation
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'isFlagged' | 'isMuted'>) => void;
  flagMessage: (messageId: string) => void;
  unflagMessage: (messageId: string) => void;
  muteStudent: (studentId: string) => void;
  unmuteStudent: (studentId: string) => void;
  toggleChatModeration: (enabled: boolean) => void;
  clearChat: () => void;

  // Reset
  resetClassroom: () => void;
}

const initialState = {
  classroomId: null,
  className: '',
  teacherName: '',
  isActive: false,
  students: [],
  currentActivity: null,
  activityLockStatus: 'unlocked' as LockStatus,
  lockedActivities: [],
  lockReason: null,
  lockExpiresAt: null,
  broadcastMessage: null,
  broadcastHistory: [],
  chatMessages: [],
  isChatModerationEnabled: false,
  flaggedMessages: [],
  lastUpdated: null,
};

export const useClassroomStore = create<ClassroomState>((set, get) => ({
  ...initialState,

  setClassroom: (classroomId, className, teacherName) => set({
    classroomId,
    className,
    teacherName,
    isActive: true,
  }),

  setStudents: (students) => set({ students, lastUpdated: new Date().toISOString() }),

  updateStudentStatus: (studentId, status) => {
    const { students } = get();
    set({
      students: students.map(s =>
        s.id === studentId ? { ...s, status } : s
      ),
      lastUpdated: new Date().toISOString(),
    });
  },

  updateStudentProgress: (studentId, progressPercent, currentActivity) => {
    const { students } = get();
    set({
      students: students.map(s =>
        s.id === studentId
          ? { ...s, progressPercent, currentActivity, lastActivityAt: new Date().toISOString() }
          : s
      ),
      lastUpdated: new Date().toISOString(),
    });
  },

  setCurrentActivity: (activity) => set({ currentActivity: activity }),

  lockActivity: (activityId, reason, expiresAt) => {
    const { lockedActivities } = get();
    set({
      activityLockStatus: 'locked',
      lockedActivities: [...lockedActivities.filter(id => id !== activityId), activityId],
      lockReason: reason,
      lockExpiresAt: expiresAt || null,
    });
  },

  unlockActivity: (activityId) => {
    const { lockedActivities } = get();
    set({
      lockedActivities: lockedActivities.filter(id => id !== activityId),
      activityLockStatus: lockedActivities.length <= 1 ? 'unlocked' : 'locked',
    });
  },

  lockAllActivities: (reason) => {
    const { students } = get();
    set({
      activityLockStatus: 'locked',
      lockedActivities: students.map(s => s.id),
      lockReason: reason,
    });
  },

  unlockAllActivities: () => set({
    activityLockStatus: 'unlocked',
    lockedActivities: [],
    lockReason: null,
    lockExpiresAt: null,
  }),

  setActivityLockStatus: (status) => set({ activityLockStatus: status }),

  broadcast: (content, priority = 'normal') => {
    const message: BroadcastMessage = {
      id: `broadcast-${Date.now()}`,
      content,
      timestamp: new Date().toISOString(),
      priority,
    };
    const { broadcastHistory } = get();
    set({
      broadcastMessage: message,
      broadcastHistory: [message, ...broadcastHistory.slice(0, 19)],
    });
  },

  clearBroadcast: () => set({ broadcastMessage: null }),

  addChatMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      isFlagged: false,
      isMuted: false,
    };
    const { chatMessages, isChatModerationEnabled } = get();
    set({
      chatMessages: [...chatMessages, newMessage].slice(-100), // Keep last 100 messages
    });
    // Auto-flag if moderation is enabled and message contains certain keywords
    if (isChatModerationEnabled) {
      const flaggedKeywords = ['spam', 'bad', 'inappropriate'];
      const isFlagged = flaggedKeywords.some(kw => newMessage.content.toLowerCase().includes(kw));
      if (isFlagged) {
        get().flagMessage(newMessage.id);
      }
    }
  },

  flagMessage: (messageId) => {
    const { flaggedMessages, chatMessages } = get();
    set({
      flaggedMessages: [...flaggedMessages.filter(id => id !== messageId), messageId],
      chatMessages: chatMessages.map(m =>
        m.id === messageId ? { ...m, isFlagged: true } : m
      ),
    });
  },

  unflagMessage: (messageId) => {
    const { flaggedMessages, chatMessages } = get();
    set({
      flaggedMessages: flaggedMessages.filter(id => id !== messageId),
      chatMessages: chatMessages.map(m =>
        m.id === messageId ? { ...m, isFlagged: false } : m
      ),
    });
  },

  muteStudent: (studentId) => {
    const { chatMessages } = get();
    set({
      chatMessages: chatMessages.map(m =>
        m.studentId === studentId ? { ...m, isMuted: true } : m
      ),
    });
  },

  unmuteStudent: (studentId) => {
    const { chatMessages } = get();
    set({
      chatMessages: chatMessages.map(m =>
        m.studentId === studentId ? { ...m, isMuted: false } : m
      ),
    });
  },

  toggleChatModeration: (enabled) => set({ isChatModerationEnabled: enabled }),

  clearChat: () => set({ chatMessages: [], flaggedMessages: [] }),

  resetClassroom: () => set(initialState),
}));