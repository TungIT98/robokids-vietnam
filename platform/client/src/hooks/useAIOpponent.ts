/**
 * useAIOpponent - AI Racing Opponent Hook
 *
 * Generates AI-controlled ghost paths for Ghost Racing mode.
 * AI follows optimal racing line with randomization for varied difficulty.
 */

import { useState, useCallback, useRef } from 'react';
import { GhostPath, TrajectoryPoint } from './useGhostRecorder';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'champion';

export interface AIOpponentConfig {
  /** Difficulty level affects speed and path deviation */
  difficulty: DifficultyLevel;
  /** Track ID for leaderboard submission */
  trackId: string;
  /** Base track waypoints (optimal racing line) */
  waypoints: Array<{ x: number; y: number; z: number }>;
  /** Total track length in meters (for time calculation) */
  trackLengthMeters: number;
  /** AI robot name */
  name?: string;
}

export interface UseAIOpponentReturn {
  /** Current AI ghost path */
  aiGhost: GhostPath | null;
  /** Current difficulty level */
  difficulty: DifficultyLevel;
  /** AI's predicted race time in ms */
  predictedTimeMs: number;
  /** Whether AI is generating */
  isGenerating: boolean;
  /** Generate new AI opponent */
  generateOpponent: () => GhostPath;
  /** Change difficulty */
  setDifficulty: (level: DifficultyLevel) => void;
  /** Submit AI time to leaderboard */
  submitToLeaderboard: (token: string, isGoldCup?: boolean) => Promise<{ success: boolean; rank?: number }>;
  /** Reset AI opponent */
  reset: () => void;
}

// Difficulty presets
const DIFFICULTY_PRESETS: Record<DifficultyLevel, { speedMultiplier: number; maxDeviation: number; pathSmoothness: number }> = {
  easy: { speedMultiplier: 0.6, maxDeviation: 1.5, pathSmoothness: 0.3 },
  medium: { speedMultiplier: 0.8, maxDeviation: 0.8, pathSmoothness: 0.6 },
  hard: { speedMultiplier: 0.95, maxDeviation: 0.3, pathSmoothness: 0.85 },
  champion: { speedMultiplier: 1.05, maxDeviation: 0.1, pathSmoothness: 0.98 },
};

// Base speed in m/s for champion (realistic racing speed)
const BASE_SPEED_MPS = 2.5;

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Generate AI ghost path following waypoints with difficulty-based randomization
 */
function generateAIGhostPath(config: AIOpponentConfig, difficulty: DifficultyLevel): GhostPath {
  const { waypoints, trackLengthMeters, name = 'AI Racer' } = config;
  const preset = DIFFICULTY_PRESETS[difficulty];

  const trajectory: TrajectoryPoint[] = [];

  // Calculate total waypoint distance for interpolation
  const segmentDistances: number[] = [];
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1].x - waypoints[i].x;
    const dy = waypoints[i + 1].y - waypoints[i].y;
    const dz = waypoints[i + 1].z - waypoints[i].z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    segmentDistances.push(dist);
    totalDistance += dist;
  }

  // Determine race duration based on speed and track length
  const speed = BASE_SPEED_MPS * preset.speedMultiplier;
  const totalDuration = Math.round((trackLengthMeters / speed) * 1000);

  // Timestamp increment per trajectory point
  const timestampStep = 50; // 50ms between points (20Hz)

  // Generate trajectory points
  let currentTime = 0;
  let pathProgress = 0; // 0-1 progress along waypoints

  while (currentTime <= totalDuration) {
    // Calculate position along waypoints
    const targetDistance = (currentTime / totalDuration) * totalDistance;
    let accumulatedDist = 0;
    let currentSegment = 0;

    for (let i = 0; i < segmentDistances.length; i++) {
      if (accumulatedDist + segmentDistances[i] >= targetDistance) {
        currentSegment = i;
        break;
      }
      accumulatedDist += segmentDistances[i];
    }

    if (currentSegment >= waypoints.length - 1) {
      currentSegment = waypoints.length - 2;
    }

    const segmentProgress = segmentDistances[currentSegment] > 0
      ? (targetDistance - accumulatedDist) / segmentDistances[currentSegment]
      : 0;

    const wp1 = waypoints[currentSegment];
    const wp2 = waypoints[currentSegment + 1];

    // Base position (linear interpolation)
    let x = wp1.x + (wp2.x - wp1.x) * segmentProgress;
    let y = wp1.y + (wp2.y - wp1.y) * segmentProgress;
    let z = wp1.z + (wp2.z - wp1.z) * segmentProgress;

    // Calculate direction for perpendicular deviation
    const dx = wp2.x - wp1.x;
    const dz = wp2.z - wp1.z;
    const segmentLength = Math.sqrt(dx * dx + dz * dz) || 1;
    const perpX = -dz / segmentLength;
    const perpZ = dx / segmentLength;

    // Add randomness based on difficulty
    if (preset.maxDeviation > 0) {
      const seed = Math.sin(currentTime * 0.01) * 0.5 + 0.5; // Pseudo-random based on time
      const deviation = (Math.random() - 0.5) * 2 * preset.maxDeviation * (1 - preset.pathSmoothness + seed * preset.pathSmoothness);
      x += perpX * deviation;
      z += perpZ * deviation;
    }

    // Calculate rotation (facing direction of travel)
    const rotation = Math.atan2(dx, dz);

    trajectory.push({
      timestamp: currentTime,
      position: { x, y, z },
      rotation,
    });

    currentTime += timestampStep;
  }

  // Ensure we end at the final waypoint
  const finalWaypoint = waypoints[waypoints.length - 1];
  if (trajectory.length > 0) {
    trajectory[trajectory.length - 1] = {
      timestamp: totalDuration,
      position: { x: finalWaypoint.x, y: finalWaypoint.y, z: finalWaypoint.z },
      rotation: trajectory[trajectory.length - 1].rotation,
    };
  }

  return {
    id: generateId(),
    name: `${name} (${difficulty})`,
    createdAt: Date.now(),
    totalDuration,
    trajectory,
  };
}

/**
 * Calculate predicted race time from ghost path
 */
function calculateRaceTime(ghost: GhostPath): number {
  return ghost.totalDuration;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export function useAIOpponent(config: AIOpponentConfig): UseAIOpponentReturn {
  const [difficulty, setDifficultyState] = useState<DifficultyLevel>('medium');
  const [aiGhost, setAiGhost] = useState<GhostPath | null>(null);
  const [predictedTimeMs, setPredictedTimeMs] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const configRef = useRef(config);
  configRef.current = config;

  const generateOpponent = useCallback(() => {
    setIsGenerating(true);

    // Small delay to show generating state
    setTimeout(() => {
      const ghost = generateAIGhostPath(configRef.current, difficulty);
      setAiGhost(ghost);
      setPredictedTimeMs(calculateRaceTime(ghost));
      setIsGenerating(false);
    }, 100);

    return aiGhost || generateAIGhostPath(configRef.current, difficulty);
  }, [difficulty]);

  const setDifficulty = useCallback((level: DifficultyLevel) => {
    setDifficultyState(level);
  }, []);

  const submitToLeaderboard = useCallback(async (token: string, isGoldCup = false) => {
    if (!aiGhost) {
      return { success: false };
    }

    try {
      const response = await fetch(`${API_BASE}/api/ghost-leaderboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          race_time_ms: predictedTimeMs,
          ghost_data: aiGhost,
          track_id: configRef.current.trackId,
          is_gold_cup: isGoldCup,
        }),
      });

      if (!response.ok) {
        return { success: false };
      }

      const data = await response.json();
      return { success: true, rank: data.rank };
    } catch (err) {
      console.error('Failed to submit AI time:', err);
      return { success: false };
    }
  }, [aiGhost, predictedTimeMs]);

  const reset = useCallback(() => {
    setAiGhost(null);
    setPredictedTimeMs(0);
  }, []);

  return {
    aiGhost,
    difficulty,
    predictedTimeMs,
    isGenerating,
    generateOpponent,
    setDifficulty,
    submitToLeaderboard,
    reset,
  };
}

// Predefined track waypoints for demo tracks
export const DEMO_TRACK_WAYPOINTS: Record<string, Array<{ x: number; y: number; z: number }>> = {
  // Simple oval track
  oval: [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    { x: 20, y: 0, z: 5 },
    { x: 20, y: 0, z: 15 },
    { x: 10, y: 0, z: 20 },
    { x: 0, y: 0, z: 15 },
    { x: 0, y: 0, z: 5 },
  ],
  // Figure-8 track
  figure8: [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    { x: 15, y: 0, z: 5 },
    { x: 15, y: 0, z: 10 },
    { x: 10, y: 0, z: 15 },
    { x: 0, y: 0, z: 15 },
    { x: -5, y: 0, z: 10 },
    { x: -5, y: 0, z: 5 },
    { x: 0, y: 0, z: 0 },
  ],
  // Straight sprint
  straight: [
    { x: 0, y: 0, z: 0 },
    { x: 30, y: 0, z: 0 },
  ],
};

// Default track lengths in meters
export const DEMO_TRACK_LENGTHS: Record<string, number> = {
  oval: 60,
  figure8: 80,
  straight: 30,
};
