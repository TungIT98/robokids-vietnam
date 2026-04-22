/**
 * Team Store - Zustand store for group challenges and team missions
 * Manages team state, members, and collaborative progress
 */

import { create } from 'zustand';

export interface Team {
  id: string;
  name: string;
  avatar: string;
  members: TeamMember[];
  totalXP: number;
  rank: number;
  missionsCompleted: number;
  challengesWon: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: 'leader' | 'member';
  xp: number;
  missionsCompleted: number;
  isOnline: boolean;
}

export interface TeamChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'coding' | 'robot_design' | 'rescue';
  teamSize: { min: number; max: number };
  maxTeams: number;
  currentTeams: number;
  rewardXP: number;
  rewardBadge?: string;
  startsAt: string;
  endsAt: string;
  status: 'upcoming' | 'registration' | 'in_progress' | 'completed';
  prize: string;
}

export interface TeamMission {
  id: string;
  title: string;
  description: string;
  type: 'group' | 'peer_teaching' | 'design';
  xpReward: number;
  badgeReward?: string;
  requiredMembers: number;
  deadline: string;
  status: 'available' | 'in_progress' | 'completed' | 'expired';
  teamId?: string;
}

interface TeamState {
  // User's team
  myTeam: Team | null;
  isTeamLeader: boolean;

  // Team challenges
  availableChallenges: TeamChallenge[];
  myTeamChallenges: TeamChallenge[];

  // Team missions
  availableMissions: TeamMission[];
  activeMissions: TeamMission[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Team leaderboard
  teamLeaderboard: Team[];
  myTeamRank: number | null;

  // Actions
  setMyTeam: (team: Team | null) => void;
  setIsTeamLeader: (isLeader: boolean) => void;
  setAvailableChallenges: (challenges: TeamChallenge[]) => void;
  setMyTeamChallenges: (challenges: TeamChallenge[]) => void;
  setAvailableMissions: (missions: TeamMission[]) => void;
  setActiveMissions: (missions: TeamMission[]) => void;
  setTeamLeaderboard: (teams: Team[]) => void;
  setMyTeamRank: (rank: number | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Team actions
  createTeam: (name: string, token: string) => Promise<Team>;
  joinTeam: (teamId: string, token: string) => Promise<void>;
  leaveTeam: (token: string) => Promise<void>;
  inviteToTeam: (playerId: string, token: string) => Promise<void>;

  // Challenge actions
  registerForChallenge: (challengeId: string, token: string) => Promise<void>;
  submitChallenge: (challengeId: string, submission: any, token: string) => Promise<{ success: boolean; xpEarned: number; badgeEarned?: string }>;

  // Mission actions
  startTeamMission: (missionId: string, token: string) => Promise<void>;
  submitTeamMission: (missionId: string, submission: any, token: string) => Promise<{ success: boolean; xpEarned: number; badgeEarned?: string }>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  // Initial state
  myTeam: null,
  isTeamLeader: false,
  availableChallenges: [],
  myTeamChallenges: [],
  availableMissions: [],
  activeMissions: [],
  isLoading: false,
  error: null,
  teamLeaderboard: [],
  myTeamRank: null,

  setMyTeam: (team) => set({ myTeam: team }),
  setIsTeamLeader: (isLeader) => set({ isTeamLeader: isLeader }),
  setAvailableChallenges: (challenges) => set({ availableChallenges: challenges }),
  setMyTeamChallenges: (challenges) => set({ myTeamChallenges: challenges }),
  setAvailableMissions: (missions) => set({ availableMissions: missions }),
  setActiveMissions: (missions) => set({ activeMissions: missions }),
  setTeamLeaderboard: (teams) => set({ teamLeaderboard: teams }),
  setMyTeamRank: (rank) => set({ myTeamRank: rank }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  createTeam: async (name, token) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';
    const response = await fetch(`${API_BASE}/api/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!response.ok) throw new Error('Failed to create team');
    const { team } = await response.json();
    set({ myTeam: team, isTeamLeader: true });
    return team;
  },

  joinTeam: async (teamId, token) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';
    const response = await fetch(`${API_BASE}/api/teams/${teamId}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to join team');
    const { team } = await response.json();
    set({ myTeam: team, isTeamLeader: false });
  },

  leaveTeam: async (token) => {
    const { myTeam } = get();
    if (!myTeam) return;
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';
    const response = await fetch(`${API_BASE}/api/teams/${myTeam.id}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to leave team');
    set({ myTeam: null, isTeamLeader: false });
  },

  inviteToTeam: async (playerId, token) => {
    const { myTeam } = get();
    if (!myTeam) throw new Error('Not in a team');
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';
    const response = await fetch(`${API_BASE}/api/teams/${myTeam.id}/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId })
    });
    if (!response.ok) throw new Error('Failed to invite player');
  },

  registerForChallenge: async (challengeId, token) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';
    const response = await fetch(`${API_BASE}/api/team-challenges/${challengeId}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to register for challenge');
  },

  submitChallenge: async (challengeId, submission, token) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';
    const response = await fetch(`${API_BASE}/api/team-challenges/${challengeId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    });
    if (!response.ok) throw new Error('Failed to submit challenge');
    return response.json();
  },

  startTeamMission: async (missionId, token) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';
    const response = await fetch(`${API_BASE}/api/team-missions/${missionId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to start mission');
    const { mission } = await response.json();
    set({ activeMissions: [...get().activeMissions, mission] });
  },

  submitTeamMission: async (missionId, submission, token) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';
    const response = await fetch(`${API_BASE}/api/team-missions/${missionId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    });
    if (!response.ok) throw new Error('Failed to submit mission');
    const result = await response.json();
    set({
      activeMissions: get().activeMissions.filter(m => m.id !== missionId)
    });
    return result;
  },
}));
