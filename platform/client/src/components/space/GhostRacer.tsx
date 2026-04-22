import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useGhostPlayback, GhostPath } from '../../hooks/useGhostRecorder';
import * as THREE from 'three';

interface GhostRacerProps {
  /** Ghost path to replay */
  ghost: GhostPath;
  /** Playback speed multiplier */
  speed?: number;
  /** Whether to auto-play */
  autoPlay?: boolean;
  /** Opacity of ghost (0-1) */
  opacity?: number;
}

/**
 * GhostRacer - Renders a ghost robot replaying a recorded path
 * Used in SpaceAcademySimulator for ghost racing feature
 */
export default function GhostRacer({
  ghost,
  speed = 1,
  autoPlay = false,
  opacity = 0.5,
}: GhostRacerProps) {
  const meshRef = useRef<THREE.Mesh>(null);

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

  // Update mesh position and rotation each frame
  useFrame(() => {
    if (meshRef.current && playback.isPlaying) {
      meshRef.current.position.set(
        playback.currentPosition.x,
        playback.currentPosition.y,
        playback.currentPosition.z
      );
      meshRef.current.rotation.y = playback.currentRotation;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={[ghost.trajectory[0]?.position.x || 0, ghost.trajectory[0]?.position.y || 0, ghost.trajectory[0]?.position.z || 0]}>
        {/* Ghost robot body - semi-transparent cyan */}
        <boxGeometry args={[0.8, 0.5, 1.2]} />
        <meshStandardMaterial
          color="#00ffff"
          transparent
          opacity={opacity}
          emissive="#00ffff"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Ghost trail effect */}
      {playback.currentPoint && (
        <mesh position={[playback.currentPosition.x, 0.05, playback.currentPosition.z]}>
          <ringGeometry args={[0.3, 0.5, 16]} />
          <meshStandardMaterial
            color="#00ffff"
            transparent
            opacity={opacity * 0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// ============================================
// Ghost Path Renderer (2D overlay for debugging)
// ============================================

interface GhostPathDebugProps {
  ghost: GhostPath;
  /** Scale factor for visualization */
  scale?: number;
}

export function GhostPathDebug({ ghost, scale = 1 }: GhostPathDebugProps) {
  const points = useMemo(() => {
    return ghost.trajectory.map((p) => [p.position.x * scale, p.position.z * scale] as [number, number]);
  }, [ghost.trajectory, scale]);

  return (
    <Line
      points={points}
      color="#00ffff"
      lineWidth={2}
      transparent
      opacity={0.4}
    />
  );
}