/**
 * AIOpponent - AI Racing Opponent Component
 *
 * Renders an AI-controlled ghost racer that competes against students.
 * AI follows optimal racing path with difficulty-based randomization.
 */

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGhostPlayback, GhostPath } from '../../hooks/useGhostRecorder';
import { DifficultyLevel } from '../../hooks/useAIOpponent';

interface AIOpponentProps {
  /** AI ghost path to follow */
  ghost: GhostPath;
  /** Playback speed multiplier */
  speed?: number;
  /** Difficulty level (affects appearance) */
  difficulty?: DifficultyLevel;
  /** Whether to auto-play */
  autoPlay?: boolean;
  /** Opacity of AI ghost */
  opacity?: number;
  /** Callback when race completes */
  onComplete?: (timeMs: number) => void;
  /** Whether AI should show as racing */
  isRacing?: boolean;
}

// Difficulty colors
const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  easy: '#22c55e',     // Green
  medium: '#3b82f6',   // Blue
  hard: '#f97316',     // Orange
  champion: '#ef4444', // Red
};

// Difficulty names
const DIFFICULTY_NAMES: Record<DifficultyLevel, string> = {
  easy: 'Rookie',
  medium: 'Racer',
  hard: 'Pro',
  champion: 'Champion',
};

export default function AIOpponent({
  ghost,
  speed = 1,
  difficulty = 'medium',
  autoPlay = false,
  opacity = 0.6,
  onComplete,
  isRacing = false,
}: AIOpponentProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<THREE.Group>(null);

  const playback = useGhostPlayback({
    ghost,
    speed,
    loop: false,
  });

  // Auto-play if enabled
  useMemo(() => {
    if (autoPlay) {
      playback.play();
    }
  }, [autoPlay]);

  // Handle race completion
  useEffect(() => {
    if (playback.progress >= 1 && !playback.isPlaying && ghost.totalDuration > 0) {
      onComplete?.(ghost.totalDuration);
    }
  }, [playback.progress, playback.isPlaying, ghost.totalDuration, onComplete]);

  const color = DIFFICULTY_COLORS[difficulty];
  const label = DIFFICULTY_NAMES[difficulty];

  // Update mesh position and rotation each frame
  useFrame(() => {
    if (meshRef.current && playback.isPlaying) {
      meshRef.current.position.set(
        playback.currentPosition.x,
        playback.currentPosition.y + 0.25, // Slightly above ground
        playback.currentPosition.z
      );
      meshRef.current.rotation.y = playback.currentRotation;
    }

    // Trail follows AI
    if (trailRef.current) {
      trailRef.current.position.set(
        playback.currentPosition.x,
        0.05,
        playback.currentPosition.z
      );
    }

    // Text label follows AI
    if (textRef.current) {
      textRef.current.position.set(
        playback.currentPosition.x,
        playback.currentPosition.y + 1.2,
        playback.currentPosition.z
      );
    }
  });

  return (
    <group>
      {/* AI Robot body */}
      <mesh
        ref={meshRef}
        position={[
          ghost.trajectory[0]?.position.x || 0,
          (ghost.trajectory[0]?.position.y || 0) + 0.25,
          ghost.trajectory[0]?.position.z || 0,
        ]}
      >
        {/* Robot body - colored based on difficulty */}
        <boxGeometry args={[0.8, 0.5, 1.2]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* AI indicator stripe */}
      <mesh position={[
        ghost.trajectory[0]?.position.x || 0,
        (ghost.trajectory[0]?.position.y || 0) + 0.5,
        ghost.trajectory[0]?.position.z || 0,
      ]}>
        <boxGeometry args={[0.6, 0.1, 0.8]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>

      {/* Trail effect */}
      {playback.currentPoint && (
        <mesh
          ref={trailRef}
          position={[
            playback.currentPosition.x,
            0.05,
            playback.currentPosition.z,
          ]}
        >
          <ringGeometry args={[0.3, 0.5, 16]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={opacity * 0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Floating label */}
      <group ref={textRef}>
        <Text
          position={[0, 0, 0]}
          fontSize={0.3}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          🤖 {label}
        </Text>
      </group>

      {/* Racing state indicator */}
      {isRacing && playback.isPlaying && (
        <mesh
          position={[
            playback.currentPosition.x - 0.6,
            playback.currentPosition.y + 0.5,
            playback.currentPosition.z,
          ]}
        >
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={2}
          />
        </mesh>
      )}
    </group>
  );
}

// ============================================
// AI Difficulty Selector Component
// ============================================

interface AIDifficultySelectorProps {
  difficulty: DifficultyLevel;
  onChange: (difficulty: DifficultyLevel) => void;
  disabled?: boolean;
}

export function AIDifficultySelector({
  difficulty,
  onChange,
  disabled = false,
}: AIDifficultySelectorProps) {
  const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard', 'champion'];

  return (
    <div style={styles.selectorContainer}>
      <span style={styles.selectorLabel}>AI Difficulty:</span>
      <div style={styles.buttonGroup}>
        {difficulties.map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            disabled={disabled}
            style={{
              ...styles.difficultyButton,
              backgroundColor: difficulty === level ? DIFFICULTY_COLORS[level] : '#333',
              color: difficulty === level ? '#fff' : '#aaa',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {DIFFICULTY_NAMES[level]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// AI Race Controls Component
// ============================================

interface AIRaceControlsProps {
  isRacing: boolean;
  hasOpponent: boolean;
  onStartRace: () => void;
  onStopRace: () => void;
  raceTimeMs?: number;
}

export function AIRaceControls({
  isRacing,
  hasOpponent,
  onStartRace,
  onStopRace,
  raceTimeMs,
}: AIRaceControlsProps) {
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.controlsContainer}>
      {!isRacing ? (
        <button
          onClick={onStartRace}
          disabled={!hasOpponent}
          style={{
            ...styles.raceButton,
            opacity: hasOpponent ? 1 : 0.5,
            backgroundColor: '#22c55e',
          }}
        >
          🏁 Bắt đầu đua
        </button>
      ) : (
        <button
          onClick={onStopRace}
          style={{
            ...styles.raceButton,
            backgroundColor: '#ef4444',
          }}
        >
          ⏹ Dừng đua
        </button>
      )}

      {raceTimeMs !== undefined && (
        <div style={styles.timeDisplay}>
          <span style={styles.timeLabel}>Thời gian AI:</span>
          <span style={styles.timeValue}>⏱ {formatTime(raceTimeMs)}</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  selectorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
  },
  selectorLabel: {
    fontSize: '14px',
    color: '#fff',
    fontWeight: 600,
  },
  buttonGroup: {
    display: 'flex',
    gap: '4px',
  },
  difficultyButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  controlsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '12px',
  },
  raceButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  timeDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: '12px',
    color: '#aaa',
  },
  timeValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: 'monospace',
  },
};
