import { useState, useRef, useCallback, useEffect } from 'react';

export interface TrajectoryPoint {
  timestamp: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  command?: string;
}

export interface GhostPath {
  id: string;
  name: string;
  createdAt: number;
  totalDuration: number;
  trajectory: TrajectoryPoint[];
}

export interface UseGhostRecorderReturn {
  /** Whether currently recording */
  isRecording: boolean;
  /** Current recording duration in ms */
  recordingDuration: number;
  /** Start recording trajectory */
  startRecording: () => void;
  /** Stop recording and return ghost path */
  stopRecording: (name?: string) => GhostPath | null;
  /** Discard current recording */
  discardRecording: () => void;
  /** Recorded trajectory points */
  currentTrajectory: TrajectoryPoint[];
  /** Recorded ghost paths stored locally */
  savedGhosts: GhostPath[];
  /** Delete a saved ghost */
  deleteGhost: (id: string) => void;
  /** Export ghost path as JSON string */
  exportGhost: (ghost: GhostPath) => string;
  /** Import ghost path from JSON string */
  importGhost: (json: string) => GhostPath | null;
}

const STORAGE_KEY = 'robokids_ghost_paths';
const MAX_TRAJECTORY_POINTS = 1000; // Cap to prevent memory issues

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function loadGhosts(): GhostPath[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGhosts(ghosts: GhostPath[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ghosts));
  } catch (err) {
    console.error('Failed to save ghosts:', err);
  }
}

export function useGhostRecorder(): UseGhostRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentTrajectory, setCurrentTrajectory] = useState<TrajectoryPoint[]>([]);
  const [savedGhosts, setSavedGhosts] = useState<GhostPath[]>(() => loadGhosts());

  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trajectoryRef = useRef<TrajectoryPoint[]>([]);

  // Update duration counter
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - startTimeRef.current);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = useCallback(() => {
    trajectoryRef.current = [];
    setCurrentTrajectory([]);
    startTimeRef.current = Date.now();
    setRecordingDuration(0);
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback((name?: string): GhostPath | null => {
    if (!isRecording) return null;

    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const trajectory = trajectoryRef.current;
    if (trajectory.length === 0) return null;

    const ghost: GhostPath = {
      id: generateId(),
      name: name || `Ghost ${new Date().toLocaleTimeString()}`,
      createdAt: Date.now(),
      totalDuration: Date.now() - startTimeRef.current,
      trajectory,
    };

    // Save to local storage
    const updatedGhosts = [...savedGhosts, ghost];
    setSavedGhosts(updatedGhosts);
    saveGhosts(updatedGhosts);

    setCurrentTrajectory([]);
    setRecordingDuration(0);

    return ghost;
  }, [isRecording, savedGhosts]);

  const discardRecording = useCallback(() => {
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    trajectoryRef.current = [];
    setCurrentTrajectory([]);
    setRecordingDuration(0);
  }, []);

  const deleteGhost = useCallback((id: string) => {
    const updated = savedGhosts.filter((g) => g.id !== id);
    setSavedGhosts(updated);
    saveGhosts(updated);
  }, [savedGhosts]);

  const exportGhost = useCallback((ghost: GhostPath): string => {
    return JSON.stringify(ghost, null, 2);
  }, []);

  const importGhost = useCallback((json: string): GhostPath | null => {
    try {
      const ghost = JSON.parse(json) as GhostPath;
      // Validate structure
      if (!ghost.id || !ghost.name || !Array.isArray(ghost.trajectory)) {
        throw new Error('Invalid ghost path structure');
      }
      // Assign new ID to avoid conflicts
      ghost.id = generateId();
      ghost.name = `${ghost.name} (imported)`;
      ghost.createdAt = Date.now();

      const updated = [...savedGhosts, ghost];
      setSavedGhosts(updated);
      saveGhosts(updated);
      return ghost;
    } catch (err) {
      console.error('Failed to import ghost:', err);
      return null;
    }
  }, [savedGhosts]);

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    discardRecording,
    currentTrajectory,
    savedGhosts,
    deleteGhost,
    exportGhost,
    importGhost,
  };
}

// ============================================
// Ghost Playback Hook
// ============================================

export interface UseGhostPlaybackOptions {
  /** Ghost path to replay */
  ghost: GhostPath;
  /** Playback speed multiplier */
  speed?: number;
  /** Whether to loop */
  loop?: boolean;
  /** Callback when playback ends */
  onComplete?: () => void;
}

export interface UseGhostPlaybackReturn {
  /** Current playback position (0-1) */
  progress: number;
  /** Current trajectory point being played */
  currentPoint: TrajectoryPoint | null;
  /** Current interpolated position */
  currentPosition: { x: number; y: number; z: number };
  /** Current interpolated rotation */
  currentRotation: number;
  /** Whether is playing */
  isPlaying: boolean;
  /** Start playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Reset to beginning */
  reset: () => void;
  /** Seek to position (0-1) */
  seek: (position: number) => void;
}

export function useGhostPlayback(
  options: UseGhostPlaybackOptions
): UseGhostPlaybackReturn {
  const { ghost, speed = 1, loop = false, onComplete } = options;

  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const trajectory = ghost.trajectory;
  const totalDuration = ghost.totalDuration;

  const getInterpolatedPoint = useCallback(
    (t: number): { position: { x: number; y: number; z: number }; rotation: number } => {
      if (trajectory.length === 0) {
        return { position: { x: 0, y: 0, z: 0 }, rotation: 0 };
      }
      if (trajectory.length === 1) {
        return {
          position: trajectory[0].position,
          rotation: trajectory[0].rotation,
        };
      }

      // Find surrounding points
      let prev = trajectory[0];
      let next = trajectory[trajectory.length - 1];

      for (let i = 0; i < trajectory.length - 1; i++) {
        if (trajectory[i].timestamp <= t && trajectory[i + 1].timestamp >= t) {
          prev = trajectory[i];
          next = trajectory[i + 1];
          break;
        }
      }

      // Interpolate
      const alpha =
        next.timestamp === prev.timestamp
          ? 0
          : (t - prev.timestamp) / (next.timestamp - prev.timestamp);

      return {
        position: {
          x: prev.position.x + (next.position.x - prev.position.x) * alpha,
          y: prev.position.y + (next.position.y - prev.position.y) * alpha,
          z: prev.position.z + (next.position.z - prev.position.z) * alpha,
        },
        rotation: prev.rotation + (next.rotation - prev.rotation) * alpha,
      };
    },
    [trajectory]
  );

  const currentPoint = trajectory.length > 0 ? trajectory[Math.floor(progress * (trajectory.length - 1))] : null;
  const interpolated = getInterpolatedPoint(progress * totalDuration);

  const animate = useCallback(
    (timestamp: number) => {
      if (!isPlaying) return;

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
        startTimeRef.current = timestamp - pausedTimeRef.current;
      }

      const elapsed = (timestamp - startTimeRef.current) * speed;
      const newProgress = Math.min(elapsed / totalDuration, 1);

      setProgress(newProgress);

      if (newProgress >= 1) {
        if (loop) {
          pausedTimeRef.current = 0;
          lastTimeRef.current = 0;
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setIsPlaying(false);
          pausedTimeRef.current = 0;
          lastTimeRef.current = 0;
          onComplete?.();
        }
      } else {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    },
    [isPlaying, speed, totalDuration, loop, onComplete]
  );

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animate]);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    pausedTimeRef.current = progress * totalDuration;
    lastTimeRef.current = 0;
    setIsPlaying(false);
  }, [progress, totalDuration]);

  const reset = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    pausedTimeRef.current = 0;
    lastTimeRef.current = 0;
    setProgress(0);
    setIsPlaying(false);
  }, []);

  const seek = useCallback(
    (position: number) => {
      const clampedPosition = Math.max(0, Math.min(1, position));
      pausedTimeRef.current = clampedPosition * totalDuration;
      lastTimeRef.current = 0;
      setProgress(clampedPosition);
    },
    [totalDuration]
  );

  return {
    progress,
    currentPoint,
    currentPosition: interpolated.position,
    currentRotation: interpolated.rotation,
    isPlaying,
    play,
    pause,
    reset,
    seek,
  };
}