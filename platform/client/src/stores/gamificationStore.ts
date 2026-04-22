/**
 * Gamification Store - Zustand store for leaderboard and gamification state
 * Handles real-time updates, rank animations, and friend comparisons
 */

import { create } from 'zustand';
import { LeaderboardEntry } from '../services/gamificationApi';

export type LeaderboardTimeframe = 'daily' | 'weekly' | 'all';

export interface LeaderboardState {
  // Current leaderboard data
  dailyEntries: LeaderboardEntry[];
  weeklyEntries: LeaderboardEntry[];
  allTimeEntries: LeaderboardEntry[];

  // Previous ranks for animation
  previousRanks: Record<string, number>; // studentId -> previousRank

  // Friend comparison
  friendIds: string[];
  friendEntries: LeaderboardEntry[];

  // Real-time polling
  isPolling: boolean;
  lastUpdated: Date | null;

  // Selected timeframe
  selectedTimeframe: LeaderboardTimeframe;

  // Actions
  setEntries: (timeframe: LeaderboardTimeframe, entries: LeaderboardEntry[]) => void;
  setPreviousRank: (studentId: string, rank: number) => void;
  setFriendIds: (friendIds: string[]) => void;
  setFriendEntries: (entries: LeaderboardEntry[]) => void;
  setTimeframe: (timeframe: LeaderboardTimeframe) => void;
  setPolling: (isPolling: boolean) => void;
  setLastUpdated: (date: Date) => void;
  getRankChange: (studentId: string) => number | null; // positive = moved up, negative = moved down
}

export const useGamificationStore = create<LeaderboardState>((set, get) => ({
  // Initial state
  dailyEntries: [],
  weeklyEntries: [],
  allTimeEntries: [],
  previousRanks: {},
  friendIds: [],
  friendEntries: [],
  isPolling: false,
  lastUpdated: null,
  selectedTimeframe: 'daily',

  setEntries: (timeframe, entries) => {
    const state = get();
    const newPreviousRanks: Record<string, number> = { ...state.previousRanks };

    // Track rank changes for animation
    if (timeframe === 'daily') {
      entries.forEach((entry) => {
        const prevRank = state.dailyEntries.find(e => e.studentId === entry.studentId)?.rank;
        if (prevRank !== undefined) {
          newPreviousRanks[entry.studentId] = prevRank;
        }
      });
      set({ dailyEntries: entries, previousRanks: newPreviousRanks });
    } else if (timeframe === 'weekly') {
      entries.forEach((entry) => {
        const prevRank = state.weeklyEntries.find(e => e.studentId === entry.studentId)?.rank;
        if (prevRank !== undefined) {
          newPreviousRanks[entry.studentId] = prevRank;
        }
      });
      set({ weeklyEntries: entries, previousRanks: newPreviousRanks });
    } else {
      entries.forEach((entry) => {
        const prevRank = state.allTimeEntries.find(e => e.studentId === entry.studentId)?.rank;
        if (prevRank !== undefined) {
          newPreviousRanks[entry.studentId] = prevRank;
        }
      });
      set({ allTimeEntries: entries, previousRanks: newPreviousRanks });
    }
  },

  setPreviousRank: (studentId, rank) => {
    set((state) => ({
      previousRanks: { ...state.previousRanks, [studentId]: rank },
    }));
  },

  setFriendIds: (friendIds) => set({ friendIds }),

  setFriendEntries: (entries) => set({ friendEntries: entries }),

  setTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),

  setPolling: (isPolling) => set({ isPolling }),

  setLastUpdated: (date) => set({ lastUpdated: date }),

  getRankChange: (studentId) => {
    const state = get();
    const previousRank = state.previousRanks[studentId];
    const currentEntries = state.selectedTimeframe === 'daily'
      ? state.dailyEntries
      : state.selectedTimeframe === 'weekly'
        ? state.weeklyEntries
        : state.allTimeEntries;
    const currentEntry = currentEntries.find(e => e.studentId === studentId);

    if (previousRank === undefined || currentEntry === undefined) return null;
    return previousRank - currentEntry.rank; // positive = moved up
  },
}));

// Selectors
export const selectCurrentEntries = (state: LeaderboardState) => {
  switch (state.selectedTimeframe) {
    case 'daily': return state.dailyEntries;
    case 'weekly': return state.weeklyEntries;
    case 'all': return state.allTimeEntries;
  }
};

export const selectCurrentUserRank = (userId: string, state: LeaderboardState) => {
  const entries = selectCurrentEntries(state);
  return entries.find(e => e.studentId === userId)?.rank;
};
