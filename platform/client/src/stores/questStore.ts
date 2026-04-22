/**
 * Quest Store - Zustand store for time-limited quest state
 * Manages active quests, user progress, and quest timers
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Quest, QuestAttempt, QuestType } from '../services/questsApi';

interface QuestTimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  totalMs: number;
}

interface QuestProgress {
  questId: string;
  progress: number;
  xpEarned: number;
  badgeEarned: boolean;
  challengesCompleted: string[];
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
}

interface QuestState {
  // Active quests
  activeQuests: Quest[];

  // User's quest progress
  questProgress: Record<string, QuestProgress>;

  // Selected quest filter
  selectedType: QuestType | 'all';

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveQuests: (quests: Quest[]) => void;
  setSelectedType: (type: QuestType | 'all') => void;
  updateQuestProgress: (questId: string, progress: QuestProgress) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getFilteredQuests: () => Quest[];
  getQuestProgress: (questId: string) => QuestProgress | null;
  getTimeRemaining: (endDate: string) => QuestTimeRemaining;
  getActiveQuestCount: () => number;
  getTotalXpAvailable: () => number;
}

// Calculate time remaining for a quest
function calculateTimeRemaining(endDate: string): QuestTimeRemaining {
  const now = new Date().getTime();
  const expiry = new Date(endDate).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, totalMs: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
    totalMs: diff,
  };
}

// Load persisted progress from localStorage
function loadPersistedProgress(): Record<string, QuestProgress> {
  try {
    const stored = localStorage.getItem('robokids-quest-progress');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load quest progress:', e);
  }
  return {};
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeQuests: [],
      questProgress: loadPersistedProgress(),
      selectedType: 'all',
      isLoading: false,
      error: null,

      setActiveQuests: (quests) => set({ activeQuests: quests }),

      setSelectedType: (type) => set({ selectedType: type }),

      updateQuestProgress: (questId, progress) => {
        set((state) => ({
          questProgress: {
            ...state.questProgress,
            [questId]: progress,
          },
        }));
        // Persist to localStorage
        localStorage.setItem(
          'robokids-quest-progress',
          JSON.stringify(get().questProgress)
        );
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      getFilteredQuests: () => {
        const state = get();
        if (state.selectedType === 'all') {
          return state.activeQuests;
        }
        return state.activeQuests.filter((q) => q.type === state.selectedType);
      },

      getQuestProgress: (questId) => {
        return get().questProgress[questId] || null;
      },

      getTimeRemaining: (endDate) => {
        return calculateTimeRemaining(endDate);
      },

      getActiveQuestCount: () => {
        const state = get();
        return state.activeQuests.filter(
          (q) => !calculateTimeRemaining(q.endDate).expired
        ).length;
      },

      getTotalXpAvailable: () => {
        const state = get();
        return state.activeQuests
          .filter((q) => !calculateTimeRemaining(q.endDate).expired)
          .reduce((total, quest) => {
            const progress = state.questProgress[quest.id];
            if (progress?.status === 'completed') {
              return total; // Don't count completed quests
            }
            const remainingXp = quest.xpReward - (progress?.xpEarned || 0);
            return total + Math.max(0, remainingXp);
          }, 0);
      },
    }),
    {
      name: 'robokids-quest-store',
      partialize: (state) => ({
        questProgress: state.questProgress,
        selectedType: state.selectedType,
      }),
    }
  )
);

// Selectors
export const selectActiveQuests = (state: QuestState) => state.activeQuests;
export const selectFilteredQuests = (state: QuestState) => {
  if (state.selectedType === 'all') {
    return state.activeQuests;
  }
  return state.activeQuests.filter((q) => q.type === state.selectedType);
};
export const selectIsLoading = (state: QuestState) => state.isLoading;
export const selectError = (state: QuestState) => state.error;
