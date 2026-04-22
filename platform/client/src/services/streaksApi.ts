/**
 * Streaks API Service
 * Handles daily check-in streaks and milestones
 * Uses PocketBase when configured, falls back to Express API
 */

import { pocketbase, isPocketBaseConfigured } from './pocketbase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

// Streak XP multipliers based on streak length
export const STREAK_MULTIPLIERS: Record<string, { minDays: number; maxDays: number; multiplier: number; xpBase: number; label: string }> = {
  starter: { minDays: 1, maxDays: 6, multiplier: 1, xpBase: 10, label: 'Khởi đầu' },
  engaged: { minDays: 7, maxDays: 13, multiplier: 1.5, xpBase: 15, label: 'Tích cực' },
  committed: { minDays: 14, maxDays: 29, multiplier: 2, xpBase: 20, label: 'Cam kết' },
  champion: { minDays: 30, maxDays: 99, multiplier: 2.5, xpBase: 25, label: 'Vô địch' },
  legend: { minDays: 100, maxDays: 999, multiplier: 3, xpBase: 30, label: 'Huyền thoại' },
};

export function getStreakMultiplier(streakDays: number): { multiplier: number; xpBase: number; tier: string; tierLabel: string } {
  const tiers = Object.values(STREAK_MULTIPLIERS);
  for (const tier of tiers) {
    if (streakDays >= tier.minDays && streakDays <= tier.maxDays) {
      return { multiplier: tier.multiplier, xpBase: tier.xpBase, tier: tier.label, tierLabel: tier.label };
    }
  }
  return { multiplier: 1, xpBase: 10, tier: 'Khởi đầu', tierLabel: 'Khởi đầu' };
}

export function calculateStreakXp(streakDays: number): number {
  const { xpBase } = getStreakMultiplier(streakDays);
  return xpBase;
}

export interface StreakInfo {
  studentId: string;
  currentStreak: number;
  longestStreak: number;
  streakFrozen: boolean;
  frozenUntil: string | null;
  nextMilestone: {
    days: number;
    badgeKey: string;
    nameVi: string;
    nameEn: string;
    daysRemaining: number;
  } | null;
  recentCheckins: number;
  totalXp: number;
}

export interface StreakHistory {
  studentId: string;
  period: {
    startDate: string;
    endDate: string;
    months: number;
  };
  stats: {
    totalCheckins: number;
    currentStreak: number;
    averageCheckinsPerWeek: string;
  };
  calendar: {
    date: string;
    checkedIn: boolean;
  }[];
  milestones: {
    id: string;
    badgeKey: string;
    nameVi: string;
    nameEn: string;
    earnedAt: string;
  }[];
}

export interface CheckinResult {
  success: boolean;
  checkinDate: string;
  newStreak: number;
  longestStreak: number;
  xpEarned: number;
  totalXp: number;
  milestoneAwarded: {
    badgeKey: string;
    nameVi: string;
    nameEn: string;
  } | null;
  message: string;
}

export interface Milestone {
  days: number;
  badgeKey: string;
  nameVi: string;
  nameEn: string;
  achieved: boolean;
  daysRemaining: number;
}

export interface MilestoneResult {
  studentId: string;
  currentStreak: number;
  milestones: Milestone[];
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

export const streaksApi = {
  /**
   * Get current streak info for a student
   */
  getStreak: async (studentId: string, token: string): Promise<StreakInfo> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let streak: any = null;
      try {
        streak = await pocketbase.collection('user_streaks').getFirstListItem("user_id='" + studentId + "'");
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!streak) {
        const response = await fetch(`${API_BASE}/api/streaks/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return handleResponse<StreakInfo>(response);
      }

      return {
        studentId: streak.user_id,
        currentStreak: streak.current_streak || 0,
        longestStreak: streak.longest_streak || 0,
        streakFrozen: streak.streak_frozen || false,
        frozenUntil: streak.frozen_until || null,
        nextMilestone: null,
        recentCheckins: streak.recent_checkins || 0,
        totalXp: streak.total_xp || 0,
      };
    }

    const response = await fetch(`${API_BASE}/api/streaks/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<StreakInfo>(response);
  },

  /**
   * Daily check-in to maintain/increase streak
   */
  checkin: async (studentId: string, token: string): Promise<CheckinResult> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const today = new Date().toISOString().split('T')[0];

      // Check if already checked in today
      let existing: any = null;
      try {
        existing = await pocketbase.collection('streak_checkins').getFirstListItem(
          "user_id='" + studentId + "' && checkin_date>='" + today + "'"
        );
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (existing) {
        return {
          success: true,
          checkinDate: existing.checkin_date,
          newStreak: 0,
          longestStreak: 0,
          xpEarned: 0,
          totalXp: 0,
          milestoneAwarded: null,
          message: 'Already checked in today!',
        };
      }

      // Get current streak
      let streak: any = { current_streak: 0, longest_streak: 0 };
      try {
        streak = await pocketbase.collection('user_streaks').getFirstListItem("user_id='" + studentId + "'");
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      const newStreak = (streak?.current_streak || 0) + 1;
      const longestStreak = Math.max(newStreak, streak?.longest_streak || 0);

      // Create checkin record
      try {
        await pocketbase.collection('streak_checkins').create({
          user_id: studentId,
          checkin_date: today,
        });
      } catch (e: any) {
        // Ignore create errors
      }

      // Update streak or create if doesn't exist
      try {
        await pocketbase.collection('user_streaks').update(streak.id, {
          current_streak: newStreak,
          longest_streak: longestStreak,
          recent_checkins: (streak?.current_streak || 0) + 1,
        });
      } catch (e: any) {
        // Create if update failed (streak record doesn't exist)
        try {
          await pocketbase.collection('user_streaks').create({
            user_id: studentId,
            current_streak: newStreak,
            longest_streak: longestStreak,
            recent_checkins: 1,
          });
        } catch (createError: any) {
          // Ignore create errors too
        }
      }

      // Calculate XP based on streak multiplier
      const xpEarned = calculateStreakXp(newStreak);
      const { tierLabel } = getStreakMultiplier(newStreak);

      return {
        success: true,
        checkinDate: today,
        newStreak,
        longestStreak,
        xpEarned,
        totalXp: xpEarned,
        milestoneAwarded: null,
        message: `Check-in thành công! +${xpEarned} XP (${tierLabel})`,
      };
    }

    const response = await fetch(`${API_BASE}/api/streaks/${studentId}/checkin`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse<CheckinResult>(response);
  },

  /**
   * Get streak history (calendar view)
   * @param months - number of months to retrieve (default 1, max 6)
   */
  getHistory: async (studentId: string, token: string, months: number = 1): Promise<StreakHistory> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      let checkins: any[] = [];
      try {
        const result = await pocketbase.collection('streak_checkins').getList(1, 500, {
          filter: "user_id='" + studentId + "' && checkin_date>='" + startDate.toISOString().split('T')[0] + "'",
          sort: '+checkin_date',
        });
        checkins = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      let streak: any = null;
      try {
        streak = await pocketbase.collection('user_streaks').getFirstListItem("user_id='" + studentId + "'");
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      const calendar = checkins.map((c: any) => ({
        date: c.checkin_date,
        checkedIn: true,
      }));

      return {
        studentId,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          months,
        },
        stats: {
          totalCheckins: checkins.length,
          currentStreak: streak?.current_streak || 0,
          averageCheckinsPerWeek: (checkins.length / (months * 4)).toFixed(1),
        },
        calendar,
        milestones: [],
      };
    }

    const response = await fetch(`${API_BASE}/api/streaks/${studentId}/history?months=${months}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<StreakHistory>(response);
  },

  /**
   * Freeze streak for 1 day
   */
  freeze: async (studentId: string, token: string): Promise<{ success: boolean; message: string; frozenUntil: string; freezeCount: number }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const frozenUntilDate = new Date();
      frozenUntilDate.setDate(frozenUntilDate.getDate() + 1);

      try {
        const streak = await pocketbase.collection('user_streaks').getFirstListItem("user_id='" + studentId + "'");
        await pocketbase.collection('user_streaks').update(streak.id, {
          streak_frozen: true,
          frozen_until: frozenUntilDate.toISOString(),
        });
      } catch (e: any) {
        // Ignore if streak doesn't exist
        if (e.status !== 404) console.warn('Failed to freeze streak:', e);
      }

      return {
        success: true,
        message: 'Streak frozen for tomorrow',
        frozenUntil: frozenUntilDate.toISOString(),
        freezeCount: 1,
      };
    }

    const response = await fetch(`${API_BASE}/api/streaks/${studentId}/freeze`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Get all milestone badges and progress
   */
  getMilestones: async (studentId: string, token: string): Promise<MilestoneResult> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let streak: any = { current_streak: 0 };
      try {
        streak = await pocketbase.collection('user_streaks').getFirstListItem("user_id='" + studentId + "'");
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      const milestoneDefinitions = [
        { days: 7, badgeKey: 'streak_7', nameVi: '7 ngày', nameEn: '7 days' },
        { days: 30, badgeKey: 'streak_30', nameVi: '30 ngày', nameEn: '30 days' },
        { days: 100, badgeKey: 'streak_100', nameVi: '100 ngày', nameEn: '100 days' },
      ];

      const currentStreak = streak?.current_streak || 0;
      const milestones: Milestone[] = milestoneDefinitions.map(m => ({
        days: m.days,
        badgeKey: m.badgeKey,
        nameVi: m.nameVi,
        nameEn: m.nameEn,
        achieved: currentStreak >= m.days,
        daysRemaining: Math.max(0, m.days - currentStreak),
      }));

      return { studentId, currentStreak, milestones };
    }

    const response = await fetch(`${API_BASE}/api/streaks/${studentId}/milestones`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<MilestoneResult>(response);
  },
};

export default streaksApi;
