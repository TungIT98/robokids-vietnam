/**
 * Challenges API Service
 * Handles coding challenges and leaderboard
 * Uses PocketBase when configured, falls back to Express API
 */

import { pocketbase, isPocketBaseConfigured } from './pocketbase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  titleVi: string;
  titleEn?: string;
  description: string;
  descriptionVi: string;
  descriptionEn?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimitSeconds: number;
  estimatedMinutes: number;
  xpReward: number;
  starterXml: string;
  availableBlocks: string[];
  testCases: TestCase[];
  isActive: boolean;
  minAgeGroup?: number;
  maxAgeGroup?: number;
  createdAt: string;
  userSubmission?: {
    id: string;
    status: string;
    startedAt: string;
    timeTakenSeconds: number;
  } | null;
}

export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface ChallengeAttempt {
  id: string;
  challengeId: string;
  status: 'in_progress' | 'submitted' | 'graded' | 'expired' | 'completed';
  score: number | null;
  submittedAt: string | null;
  timeSpentSeconds: number | null;
  blocklyXml: string | null;
  startedAt?: string;
  timeLimitSeconds?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  timeSpentSeconds: number;
  completedAt: string;
  challengeId: string;
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

export const challengesApi = {
  getChallenges: async (params?: { difficulty?: string; search?: string }): Promise<Challenge[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let filter = "is_active=true";
      if (params?.difficulty) {
        filter += " && difficulty='" + params.difficulty + "'";
      }

      let challenges: any[] = [];
      try {
        const result = await pocketbase.collection('challenges').getList(1, 500, {
          filter,
          sort: '-created_at',
        });
        challenges = result.items;
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }

      if (challenges.length === 0) {
        // Fall back to Express
        const searchParams = new URLSearchParams();
        if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
        if (params?.search) searchParams.set('search', params.search);
        const url = `${API_BASE}/api/challenges${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        const resp = await handleResponse<{ challenges: Challenge[] }>(await fetch(url));
        return resp.challenges;
      }

      return challenges.map((c: any) => ({
        id: c.id,
        slug: c.slug,
        title: c.title_vi,
        titleVi: c.title_vi,
        titleEn: c.title_en,
        description: c.description_vi,
        descriptionVi: c.description_vi,
        descriptionEn: c.description_en,
        difficulty: c.difficulty,
        timeLimitSeconds: c.time_limit_seconds,
        estimatedMinutes: Math.ceil((c.time_limit_seconds || 300) / 60),
        xpReward: c.xp_reward || 50,
        starterXml: c.blockly_xml_template || '',
        availableBlocks: c.available_blocks || [],
        testCases: [],
        isActive: c.is_active,
        createdAt: c.created_at,
      }));
    }

    const searchParams = new URLSearchParams();
    if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
    if (params?.search) searchParams.set('search', params.search);

    const url = `${API_BASE}/api/challenges${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const data = await handleResponse<{ challenges: Challenge[]; pagination: any }>(await fetch(url));
    return data.challenges.map(c => ({
      ...c,
      estimatedMinutes: Math.ceil((c.timeLimitSeconds || 300) / 60),
      starterXml: (c as any).blocklyXmlTemplate || '',
      availableBlocks: (c as any).availableBlocks || [],
    }));
  },

  getChallenge: async (id: string): Promise<Challenge> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let challenge: any = null;
      try {
        challenge = await pocketbase.collection('challenges').getFirstListItem("id='" + id + "'");
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }

      if (!challenge) {
        const response = await fetch(`${API_BASE}/api/challenges/${id}`);
        return handleResponse<Challenge>(response);
      }

      return {
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title_vi,
        titleVi: challenge.title_vi,
        titleEn: challenge.title_en,
        description: challenge.description_vi,
        descriptionVi: challenge.description_vi,
        descriptionEn: challenge.description_en,
        difficulty: challenge.difficulty,
        timeLimitSeconds: challenge.time_limit_seconds,
        estimatedMinutes: Math.ceil((challenge.time_limit_seconds || 300) / 60),
        xpReward: challenge.xp_reward || 50,
        starterXml: challenge.blockly_xml_template || '',
        availableBlocks: challenge.available_blocks || [],
        testCases: [],
        isActive: challenge.is_active,
        createdAt: challenge.created_at,
      };
    }

    const response = await fetch(`${API_BASE}/api/challenges/${id}`);
    const data = await handleResponse<Challenge>(response);
    return {
      ...data,
      estimatedMinutes: Math.ceil((data.timeLimitSeconds || 300) / 60),
      starterXml: (data as any).blocklyXmlTemplate || '',
      availableBlocks: (data as any).availableBlocks || [],
    };
  },

  startAttempt: async (challengeId: string, token: string): Promise<ChallengeAttempt> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const userId = pocketbase.authStore.model?.id;
      if (!userId) throw new Error('User not authenticated');

      let attempt: any = null;
      try {
        attempt = await pocketbase.collection('challenge_attempts').create({
          challenge_id: challengeId,
          user_id: userId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          time_limit_seconds: 300,
        });
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }

      if (!attempt) {
        // Fall back to Express
        const response = await fetch(`${API_BASE}/api/challenges/${challengeId}/start`, {
          method: 'POST',
          headers: authHeaders(token),
        });
        const resp = await handleResponse<{ submission: ChallengeAttempt }>(response);
        return resp.submission;
      }

      return {
        id: attempt.id,
        challengeId: attempt.challenge_id,
        status: attempt.status,
        score: null,
        submittedAt: null,
        blocklyXml: null,
        startedAt: attempt.started_at,
        timeSpentSeconds: 0,
      };
    }

    const response = await fetch(`${API_BASE}/api/challenges/${challengeId}/start`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    const data = await handleResponse<{ submission: ChallengeAttempt; isResumed: boolean }>(response);
    return data.submission;
  },

  submitAttempt: async (
    challengeId: string,
    attemptId: string,
    blocklyXml: string,
    token: string
  ): Promise<{ success: boolean; score: number; feedback: string }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let attempt: any = null;
      try {
        attempt = await pocketbase.collection('challenge_attempts').update(attemptId, {
          status: 'submitted',
          blockly_xml: blocklyXml,
          submitted_at: new Date().toISOString(),
        });
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }

      if (!attempt) {
        // Fall back to Express
        const response = await fetch(`${API_BASE}/api/challenges/${challengeId}/submit`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ submission_id: attemptId, submitted_xml: blocklyXml }),
        });
        const data = await handleResponse<{ submission: any; message: string }>(response);
        return {
          success: data.submission.status !== 'expired',
          score: data.submission.score || 0,
          feedback: data.message,
        };
      }

      return {
        success: true,
        score: 0,
        feedback: 'Submitted successfully',
      };
    }

    const response = await fetch(`${API_BASE}/api/challenges/${challengeId}/submit`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ submission_id: attemptId, submitted_xml: blocklyXml }),
    });
    const data = await handleResponse<{ submission: any; message: string }>(response);
    return {
      success: data.submission.status !== 'expired',
      score: data.submission.score || 0,
      feedback: data.message,
    };
  },

  getLeaderboard: async (params?: {
    challengeId?: string;
    timeframe?: 'daily' | 'weekly' | 'all';
  }): Promise<LeaderboardEntry[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let filter = "status='submitted'";
      if (params?.challengeId) {
        filter += " && challenge_id='" + params.challengeId + "'";
      }

      let attempts: any[] = [];
      try {
        const result = await pocketbase.collection('challenge_attempts').getList(1, 100, {
          filter,
          sort: '-score',
          expand: 'users',
        });
        attempts = result.items;
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }

      if (attempts.length === 0) {
        const searchParams = new URLSearchParams();
        if (params?.challengeId) searchParams.set('challenge_id', params.challengeId);
        if (params?.timeframe) searchParams.set('timeframe', params.timeframe);
        const url = `${API_BASE}/api/challenges/leaderboard${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        const resp = await handleResponse<{ leaderboard: any[] }>(await fetch(url));
        return resp.leaderboard.map(entry => ({
          rank: entry.rank || 0,
          userId: entry.studentId || entry.userId || '',
          name: entry.title || entry.name || 'Unknown',
          avatarUrl: entry.avatarUrl || null,
          score: entry.score || 0,
          timeSpentSeconds: entry.timeTakenSeconds || entry.timeSpentSeconds || 0,
          completedAt: entry.completedAt || entry.completed_at || '',
          challengeId: entry.challengeId || entry.challenge_id || '',
        }));
      }

      return attempts.map((e: any, idx: number) => ({
        rank: idx + 1,
        userId: e.user_id,
        name: e.expand?.users?.full_name || 'Unknown',
        avatarUrl: null,
        score: e.score || 0,
        timeSpentSeconds: e.time_taken_seconds || 0,
        completedAt: e.submitted_at,
        challengeId: e.challenge_id,
      }));
    }

    const searchParams = new URLSearchParams();
    if (params?.challengeId) searchParams.set('challenge_id', params.challengeId);
    if (params?.timeframe) searchParams.set('timeframe', params.timeframe);

    const url = `${API_BASE}/api/challenges/leaderboard${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const data = await handleResponse<{ leaderboard: any[] }>(await fetch(url));
    return data.leaderboard.map(entry => ({
      rank: entry.rank || 0,
      userId: entry.studentId || entry.userId || '',
      name: entry.title || entry.name || 'Unknown',
      avatarUrl: entry.avatarUrl || null,
      score: entry.score || 0,
      timeSpentSeconds: entry.timeTakenSeconds || entry.timeSpentSeconds || 0,
      completedAt: entry.completedAt || entry.completed_at || '',
      challengeId: entry.challengeId || entry.challenge_id || '',
    }));
  },

  getUserAttempts: async (challengeId: string, token: string): Promise<ChallengeAttempt[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const userId = pocketbase.authStore.model?.id;
      if (!userId) return [];

      let attempts: any[] = [];
      try {
        const result = await pocketbase.collection('challenge_attempts').getList(1, 100, {
          filter: "challenge_id='" + challengeId + "' && user_id='" + userId + "'",
          sort: '-started_at',
        });
        attempts = result.items;
      } catch (e: any) {
        if (e.status !== 404) console.warn('PocketBase error:', e);
      }

      if (attempts.length === 0) {
        const response = await fetch(`${API_BASE}/api/challenges/${challengeId}/submissions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await handleResponse<{ submissions: ChallengeAttempt[] }>(response);
        return data.submissions;
      }

      return attempts.map((a: any) => ({
        id: a.id,
        challengeId: a.challenge_id,
        status: a.status,
        score: a.score,
        submittedAt: a.submitted_at,
        timeSpentSeconds: a.time_taken_seconds,
        blocklyXml: a.blockly_xml,
        startedAt: a.started_at,
        timeLimitSeconds: a.time_limit_seconds,
      }));
    }

    const response = await fetch(`${API_BASE}/api/challenges/${challengeId}/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse<{ submissions: ChallengeAttempt[] }>(response);
    return data.submissions;
  },
};

export default challengesApi;
