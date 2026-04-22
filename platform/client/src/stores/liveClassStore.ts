/**
 * LiveClass store - manages live class booking state with Zustand
 */

import { create } from 'zustand';

export interface LiveClassSession {
  id: string;
  title: string;
  teacherName: string;
  teacherAvatar: string;
  scheduledAt: string;
  duration: number;
  maxStudents: number;
  currentStudents: number;
  meetingLink: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  price: number;
  description: string;
}

interface LiveClassState {
  sessions: LiveClassSession[];
  enrolledSessions: string[]; // session IDs the student is enrolled in
  isLoading: boolean;
  error: string | null;

  // Actions
  setSessions: (sessions: LiveClassSession[]) => void;
  enrollInSession: (sessionId: string) => void;
  unenrollFromSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<LiveClassSession>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useLiveClassStore = create<LiveClassState>((set, get) => ({
  sessions: [],
  enrolledSessions: [],
  isLoading: false,
  error: null,

  setSessions: (sessions) => set({ sessions }),

  enrollInSession: (sessionId) => {
    const { sessions, enrolledSessions } = get();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Update current students count
    const updatedSessions = sessions.map(s =>
      s.id === sessionId
        ? { ...s, currentStudents: s.currentStudents + 1 }
        : s
    );

    set({
      sessions: updatedSessions,
      enrolledSessions: [...enrolledSessions, sessionId]
    });
  },

  unenrollFromSession: (sessionId) => {
    const { sessions, enrolledSessions } = get();

    const updatedSessions = sessions.map(s =>
      s.id === sessionId
        ? { ...s, currentStudents: Math.max(0, s.currentStudents - 1) }
        : s
    );

    set({
      sessions: updatedSessions,
      enrolledSessions: enrolledSessions.filter(id => id !== sessionId)
    });
  },

  updateSession: (sessionId, updates) => {
    const { sessions } = get();
    set({
      sessions: sessions.map(s =>
        s.id === sessionId ? { ...s, ...updates } : s
      )
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),
}));