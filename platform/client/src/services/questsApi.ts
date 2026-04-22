/**
 * Quests API Service
 * Handles time-limited challenge quests: Weekly, Weekend, Holiday events
 * Uses PocketBase when configured, falls back to Express API
 */

import { pocketbase, isPocketBaseConfigured } from './pocketbase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export type QuestType = 'weekly' | 'weekend' | 'holiday' | 'daily';

export interface Quest {
  id: string;
  slug: string;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  type: QuestType;
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  xpMultiplier: number; // Bonus multiplier during events (e.g., 2x during weekend)
  badgeReward?: {
    key: string;
    name: string;
    nameVi: string;
    emoji: string;
  };
  challengeIds: string[]; // Linked challenges
  startDate: string;
  endDate: string;
  isActive: boolean;
  participantCount: number;
  completionCount: number;
  maxParticipants?: number;
}

export interface QuestAttempt {
  id: string;
  questId: string;
  oduserId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  startedAt: string | null;
  completedAt: string | null;
  progress: number; // 0-100
  challengesCompleted: string[];
  xpEarned: number;
  badgeEarned: boolean;
}

export interface QuestLeaderboardEntry {
  rank: number;
  oduserId: string;
  studentName: string;
  avatarEmoji: string;
  completionTime: number; // seconds
  completedAt: string;
  questId: string;
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

// Default quest definitions (for demo/offline mode)
const DEFAULT_QUESTS: Quest[] = [
  {
    id: 'weekly-1',
    slug: 'weekly-coding-challenge',
    title: 'Weekly Coding Challenge',
    titleVi: 'Thử Thách Lập Trình Tuần Này',
    description: 'Complete 3 coding challenges this week to earn bonus XP!',
    descriptionVi: 'Hoàn thành 3 thử thách lập trình tuần này để nhận XP thưởng!',
    type: 'weekly',
    difficulty: 'medium',
    xpReward: 150,
    xpMultiplier: 1.5,
    badgeReward: {
      key: 'weekly-warrior',
      name: 'Weekly Warrior',
      nameVi: 'Chiến Binh Tuần',
      emoji: '⚔️',
    },
    challengeIds: [],
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Started 2 days ago
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Ends in 5 days
    isActive: true,
    participantCount: 234,
    completionCount: 89,
  },
  {
    id: 'weekend-1',
    slug: 'robot-battle-weekend',
    title: 'Robot Battle Weekend',
    titleVi: 'Cuối Tuần Chiến Đấu Robot',
    description: 'Compete in robot battles all weekend! Top 10 get special badges!',
    descriptionVi: 'Tranh tài robot suốt cuối tuần! Top 10 nhận huy hiệu đặc biệt!',
    type: 'weekend',
    difficulty: 'hard',
    xpReward: 300,
    xpMultiplier: 2.0,
    badgeReward: {
      key: 'battle-champion',
      name: 'Battle Champion',
      nameVi: 'Vô Địch Chiến Đấu',
      emoji: '🏆',
    },
    challengeIds: [],
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    participantCount: 567,
    completionCount: 123,
    maxParticipants: 1000,
  },
  {
    id: 'holiday-1',
    slug: 'tet-challenge-2026',
    title: 'Tết Holiday Special',
    titleVi: 'Thử Thách Tết 2026',
    description: 'Celebrate Tết with special robotics challenges!',
    descriptionVi: 'Kỷ niệm Tết với các thử thách robot đặc biệt!',
    type: 'holiday',
    difficulty: 'easy',
    xpReward: 500,
    xpMultiplier: 3.0,
    badgeReward: {
      key: 'tet-champion',
      name: 'Tết Champion',
      nameVi: 'Vô Địch Tết',
      emoji: '🧧',
    },
    challengeIds: [],
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    participantCount: 1234,
    completionCount: 456,
  },
];

export const questsApi = {
  /**
   * Get all active quests
   */
  getActiveQuests: async (): Promise<Quest[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const now = new Date().toISOString();
        const result = await pocketbase.collection('quests').getList(1, 50, {
          filter: `is_active=true && start_date <= '${now}' && end_date >= '${now}'`,
          sort: '-end_date',
        });

        return result.items.map((q: any) => ({
          id: q.id,
          slug: q.slug,
          title: q.title_vi,
          titleVi: q.title_vi,
          description: q.description_vi,
          descriptionVi: q.description_vi,
          type: q.quest_type,
          difficulty: q.difficulty,
          xpReward: q.xp_reward,
          xpMultiplier: q.xp_multiplier,
          badgeReward: q.badge_key ? {
            key: q.badge_key,
            name: q.badge_name,
            nameVi: q.badge_name_vi,
            emoji: q.badge_emoji || '🏅',
          } : undefined,
          challengeIds: q.challenge_ids || [],
          startDate: q.start_date,
          endDate: q.end_date,
          isActive: q.is_active,
          participantCount: q.participant_count || 0,
          completionCount: q.completion_count || 0,
          maxParticipants: q.max_participants,
        }));
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }
    }

    // Fall back to Express API
    try {
      const response = await fetch(`${API_BASE}/api/quests/active`);
      if (response.ok) {
        const data = await handleResponse<{ quests: Quest[] }>(response);
        return data.quests;
      }
    } catch (e) {
      console.warn('Express API error:', e);
    }

    // Return demo data
    return DEFAULT_QUESTS.filter(q => q.isActive && new Date(q.endDate) > new Date());
  },

  /**
   * Get a specific quest by ID
   */
  getQuest: async (questId: string): Promise<Quest | null> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const quest: any = await pocketbase.collection('quests').getOne(questId);
        return {
          id: quest.id,
          slug: quest.slug,
          title: quest.title_vi,
          titleVi: quest.title_vi,
          description: quest.description_vi,
          descriptionVi: quest.description_vi,
          type: quest.quest_type,
          difficulty: quest.difficulty,
          xpReward: quest.xp_reward,
          xpMultiplier: quest.xp_multiplier,
          badgeReward: quest.badge_key ? {
            key: quest.badge_key,
            name: quest.badge_name,
            nameVi: quest.badge_name_vi,
            emoji: quest.badge_emoji || '🏅',
          } : undefined,
          challengeIds: quest.challenge_ids || [],
          startDate: quest.start_date,
          endDate: quest.end_date,
          isActive: quest.is_active,
          participantCount: quest.participant_count || 0,
          completionCount: quest.completion_count || 0,
          maxParticipants: quest.max_participants,
        };
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }
    }

    // Fall back to Express API
    try {
      const response = await fetch(`${API_BASE}/api/quests/${questId}`);
      if (response.ok) {
        return handleResponse<Quest>(response);
      }
    } catch (e) {
      console.warn('Express API error:', e);
    }

    // Return from defaults
    return DEFAULT_QUESTS.find(q => q.id === questId) || null;
  },

  /**
   * Join a quest (start participating)
   */
  joinQuest: async (token: string, questId: string): Promise<QuestAttempt> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const userId = pocketbase.authStore.model?.id;
      if (!userId) throw new Error('User not authenticated');

      try {
        const attempt = await pocketbase.collection('quest_attempts').create({
          quest_id: questId,
          user_id: userId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          progress: 0,
          challenges_completed: [],
          xp_earned: 0,
          badge_earned: false,
        });

        return {
          id: attempt.id,
          questId: attempt.quest_id,
          oduserId: attempt.user_id,
          status: attempt.status,
          startedAt: attempt.started_at,
          completedAt: null,
          progress: 0,
          challengesCompleted: [],
          xpEarned: 0,
          badgeEarned: false,
        };
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }
    }

    const response = await fetch(`${API_BASE}/api/quests/${questId}/join`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse<QuestAttempt>(response);
  },

  /**
   * Update quest progress
   */
  updateProgress: async (
    token: string,
    questId: string,
    challengeId: string,
    completed: boolean
  ): Promise<{ progress: number; xpEarned: number; badgeEarned: boolean }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const userId = pocketbase.authStore.model?.id;
      if (!userId) throw new Error('User not authenticated');

      try {
        const attempt = await pocketbase.collection('quest_attempts').getFirstListItem(
          `quest_id='${questId}' && user_id='${userId}'`
        );

        const challengesCompleted = attempt.challenges_completed || [];
        if (completed && !challengesCompleted.includes(challengeId)) {
          challengesCompleted.push(challengeId);
        }

        // Get quest to calculate XP
        const quest = await pocketbase.collection('quests').getOne(questId);
        const xpPerChallenge = quest.xp_reward / (quest.challenge_ids?.length || 1);
        const xpEarned = challengesCompleted.length * xpPerChallenge * quest.xp_multiplier;
        const progress = (challengesCompleted.length / (quest.challenge_ids?.length || 1)) * 100;

        await pocketbase.collection('quest_attempts').update(attempt.id, {
          challenges_completed: challengesCompleted,
          xp_earned: xpEarned,
          progress,
          status: progress >= 100 ? 'completed' : 'in_progress',
          completed_at: progress >= 100 ? new Date().toISOString() : null,
        });

        return { progress, xpEarned, badgeEarned: progress >= 100 };
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }
    }

    const response = await fetch(`${API_BASE}/api/quests/${questId}/progress`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ challengeId, completed }),
    });
    return handleResponse(response);
  },

  /**
   * Get user's quest attempt
   */
  getUserAttempt: async (token: string, questId: string): Promise<QuestAttempt | null> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const userId = pocketbase.authStore.model?.id;
      if (!userId) return null;

      try {
        const attempt: any = await pocketbase.collection('quest_attempts').getFirstListItem(
          `quest_id='${questId}' && user_id='${userId}'`
        );

        return {
          id: attempt.id,
          questId: attempt.quest_id,
          oduserId: attempt.user_id,
          status: attempt.status,
          startedAt: attempt.started_at,
          completedAt: attempt.completed_at,
          progress: attempt.progress || 0,
          challengesCompleted: attempt.challenges_completed || [],
          xpEarned: attempt.xp_earned || 0,
          badgeEarned: attempt.badge_earned || false,
        };
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }
    }

    const response = await fetch(`${API_BASE}/api/quests/${questId}/my-attempt`, {
      headers: authHeaders(token),
    });
    if (response.ok) {
      return handleResponse<QuestAttempt>(response);
    }
    return null;
  },

  /**
   * Get quest leaderboard
   */
  getQuestLeaderboard: async (
    questId: string,
    limit: number = 20
  ): Promise<QuestLeaderboardEntry[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const result = await pocketbase.collection('quest_attempts').getList(1, limit, {
          filter: `quest_id='${questId}' && status='completed'`,
          sort: 'completion_time',
          expand: 'users',
        });

        return result.items.map((a: any, idx: number) => ({
          rank: idx + 1,
          oduserId: a.user_id,
          studentName: a.expand?.users?.full_name || 'Unknown',
          avatarEmoji: a.expand?.users?.avatar_emoji || '🤖',
          completionTime: a.completion_time || 0,
          completedAt: a.completed_at,
          questId: a.quest_id,
        }));
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }
    }

    const response = await fetch(`${API_BASE}/api/quests/${questId}/leaderboard?limit=${limit}`);
    if (response.ok) {
      const data = await handleResponse<{ leaderboard: QuestLeaderboardEntry[] }>(response);
      return data.leaderboard;
    }
    return [];
  },

  /**
   * Check if a quest type is currently active
   */
  isQuestTypeActive: (type: QuestType): boolean => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const hour = now.getHours();

    switch (type) {
      case 'daily':
        return true; // Always has daily quests
      case 'weekly':
        // Weekly quests are always available during the week
        return dayOfWeek >= 1 && dayOfWeek <= 6;
      case 'weekend':
        // Weekend: Saturday (6) and Sunday (0)
        return dayOfWeek === 0 || dayOfWeek === 6;
      case 'holiday':
        // Holiday quests would be checked via API
        return false; // Only active when a holiday event is running
      default:
        return false;
    }
  },

  /**
   * Get quest type display info
   */
  getQuestTypeInfo: (type: QuestType): { label: string; labelVi: string; emoji: string; color: string } => {
    switch (type) {
      case 'weekly':
        return { label: 'Weekly', labelVi: 'Tuần', emoji: '📅', color: '#6366f1' };
      case 'weekend':
        return { label: 'Weekend', labelVi: 'Cuối Tuần', emoji: '🎉', color: '#f59e0b' };
      case 'holiday':
        return { label: 'Holiday', labelVi: 'Lễ', emoji: '🎊', color: '#ef4444' };
      case 'daily':
      default:
        return { label: 'Daily', labelVi: 'Ngày', emoji: '🎯', color: '#22c55e' };
    }
  },

  /**
   * Get difficulty display info
   */
  getDifficultyInfo: (difficulty: string): { label: string; emoji: string; color: string } => {
    switch (difficulty) {
      case 'easy':
        return { label: 'Dễ', emoji: '🟢', color: '#22c55e' };
      case 'medium':
        return { label: 'Trung bình', emoji: '🟡', color: '#eab308' };
      case 'hard':
        return { label: 'Khó', emoji: '🔴', color: '#ef4444' };
      default:
        return { label: 'Trung bình', emoji: '🟡', color: '#eab308' };
    }
  },
};

export default questsApi;
