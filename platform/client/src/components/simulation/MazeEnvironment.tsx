/**
 * MazeEnvironment - 3D maze/challenge environment for robot simulation
 *
 * Features:
 * - Pre-built maze maps (easy, medium, hard)
 * - Obstacle avoidance courses
 * - Line-following tracks
 * - Custom map editor integration
 *
 * Visual design: Colorful, kid-friendly with fun elements
 */

import { useMemo, useState } from 'react';
import * as THREE from 'three';

export type MazeType = 'maze' | 'obstacle' | 'line_following' | 'custom';

export interface MazeCell {
  type: 'wall' | 'path' | 'start' | 'end' | 'obstacle' | 'line';
  x: number;
  z: number;
}

export interface MazePreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cells: MazeCell[];
  startPosition: [number, number, number];
  startRotation: number;
  endPosition: [number, number, number];
  color: string;
}

const WALL_COLOR = '#4a5568';
const PATH_COLOR = '#e5e7eb';
const LINE_COLOR = '#1f2937';
const OBSTACLE_COLOR = '#ef4444';
const START_COLOR = '#22c55e';
const END_COLOR = '#f59e0b';

interface MazeEnvironmentProps {
  mazeType: MazeType;
  mazePreset?: MazePreset;
  customCells?: MazeCell[];
  showGrid?: boolean;
  onReachEnd?: () => void;
}

// Pre-built maze presets
export const MAZE_PRESETS: Record<string, MazePreset> = {
  maze_easy: {
    id: 'maze_easy',
    name: 'Mê cung Dễ',
    emoji: '🌱',
    description: 'Đường đi đơn giản cho người mới',
    difficulty: 'easy',
    color: '#22c55e',
    startPosition: [0, 0, 0],
    startRotation: 0,
    endPosition: [4, 0, 4],
    cells: [
      // Row 0
      { type: 'wall', x: 0, z: 0 }, { type: 'wall', x: 1, z: 0 }, { type: 'wall', x: 2, z: 0 }, { type: 'wall', x: 3, z: 0 }, { type: 'wall', x: 4, z: 0 }, { type: 'wall', x: 5, z: 0 },
      // Row 1
      { type: 'wall', x: 0, z: 1 }, { type: 'path', x: 1, z: 1 }, { type: 'path', x: 2, z: 1 }, { type: 'wall', x: 3, z: 1 }, { type: 'path', x: 4, z: 1 }, { type: 'wall', x: 5, z: 1 },
      // Row 2
      { type: 'wall', x: 0, z: 2 }, { type: 'wall', x: 1, z: 2 }, { type: 'path', x: 2, z: 2 }, { type: 'wall', x: 3, z: 2 }, { type: 'path', x: 4, z: 2 }, { type: 'wall', x: 5, z: 2 },
      // Row 3
      { type: 'wall', x: 0, z: 3 }, { type: 'path', x: 1, z: 3 }, { type: 'path', x: 2, z: 3 }, { type: 'path', x: 3, z: 3 }, { type: 'wall', x: 4, z: 3 }, { type: 'wall', x: 5, z: 3 },
      // Row 4
      { type: 'wall', x: 0, z: 4 }, { type: 'wall', x: 1, z: 4 }, { type: 'wall', x: 2, z: 4 }, { type: 'path', x: 3, z: 4 }, { type: 'path', x: 4, z: 4 }, { type: 'wall', x: 5, z: 4 },
      // Row 5
      { type: 'wall', x: 0, z: 5 }, { type: 'wall', x: 1, z: 5 }, { type: 'wall', x: 2, z: 5 }, { type: 'wall', x: 3, z: 5 }, { type: 'wall', x: 4, z: 5 }, { type: 'wall', x: 5, z: 5 },
    ],
  },
  maze_medium: {
    id: 'maze_medium',
    name: 'Mê Cung Trung Bình',
    emoji: '🏃',
    description: 'Thử thách với nhiều ngã rẽ',
    difficulty: 'medium',
    color: '#f59e0b',
    startPosition: [0, 0, 0],
    startRotation: 0,
    endPosition: [5, 0, 5],
    cells: [
      // Row 0
      { type: 'wall', x: 0, z: 0 }, { type: 'wall', x: 1, z: 0 }, { type: 'wall', x: 2, z: 0 }, { type: 'wall', x: 3, z: 0 }, { type: 'wall', x: 4, z: 0 }, { type: 'wall', x: 5, z: 0 }, { type: 'wall', x: 6, z: 0 },
      // Row 1
      { type: 'wall', x: 0, z: 1 }, { type: 'path', x: 1, z: 1 }, { type: 'wall', x: 2, z: 1 }, { type: 'path', x: 3, z: 1 }, { type: 'path', x: 4, z: 1 }, { type: 'wall', x: 5, z: 1 }, { type: 'wall', x: 6, z: 1 },
      // Row 2
      { type: 'wall', x: 0, z: 2 }, { type: 'path', x: 1, z: 2 }, { type: 'wall', x: 2, z: 2 }, { type: 'path', x: 3, z: 2 }, { type: 'wall', x: 4, z: 2 }, { type: 'path', x: 5, z: 2 }, { type: 'wall', x: 6, z: 2 },
      // Row 3
      { type: 'wall', x: 0, z: 3 }, { type: 'path', x: 1, z: 3 }, { type: 'path', x: 2, z: 3 }, { type: 'wall', x: 3, z: 3 }, { type: 'path', x: 4, z: 3 }, { type: 'path', x: 5, z: 3 }, { type: 'wall', x: 6, z: 3 },
      // Row 4
      { type: 'wall', x: 0, z: 4 }, { type: 'wall', x: 1, z: 4 }, { type: 'wall', x: 2, z: 4 }, { type: 'wall', x: 3, z: 4 }, { type: 'path', x: 4, z: 4 }, { type: 'wall', x: 5, z: 4 }, { type: 'wall', x: 6, z: 4 },
      // Row 5
      { type: 'wall', x: 0, z: 5 }, { type: 'path', x: 1, z: 5 }, { type: 'path', x: 2, z: 5 }, { type: 'path', x: 3, z: 5 }, { type: 'path', x: 4, z: 5 }, { type: 'path', x: 5, z: 5 }, { type: 'wall', x: 6, z: 5 },
      // Row 6
      { type: 'wall', x: 0, z: 6 }, { type: 'wall', x: 1, z: 6 }, { type: 'wall', x: 2, z: 6 }, { type: 'wall', x: 3, z: 6 }, { type: 'wall', x: 4, z: 6 }, { type: 'wall', x: 5, z: 6 }, { type: 'wall', x: 6, z: 6 },
    ],
  },
  obstacle_course: {
    id: 'obstacle_course',
    name: 'Vượt Chướng Ngại',
    emoji: '🚧',
    description: 'Tránh các chướng ngại vật để đến đích',
    difficulty: 'medium',
    color: '#ef4444',
    startPosition: [0, 0, 0],
    startRotation: 0,
    endPosition: [5, 0, 5],
    cells: [
      { type: 'path', x: 0, z: 0 }, { type: 'path', x: 1, z: 0 }, { type: 'path', x: 2, z: 0 }, { type: 'path', x: 3, z: 0 }, { type: 'path', x: 4, z: 0 }, { type: 'path', x: 5, z: 0 },
      { type: 'path', x: 0, z: 1 }, { type: 'obstacle', x: 1, z: 1 }, { type: 'path', x: 2, z: 1 }, { type: 'obstacle', x: 3, z: 1 }, { type: 'path', x: 4, z: 1 }, { type: 'obstacle', x: 5, z: 1 },
      { type: 'path', x: 0, z: 2 }, { type: 'path', x: 1, z: 2 }, { type: 'path', x: 2, z: 2 }, { type: 'path', x: 3, z: 2 }, { type: 'obstacle', x: 4, z: 2 }, { type: 'path', x: 5, z: 2 },
      { type: 'path', x: 0, z: 3 }, { type: 'obstacle', x: 1, z: 3 }, { type: 'path', x: 2, z: 3 }, { type: 'path', x: 3, z: 3 }, { type: 'path', x: 4, z: 3 }, { type: 'path', x: 5, z: 3 },
      { type: 'path', x: 0, z: 4 }, { type: 'path', x: 1, z: 4 }, { type: 'obstacle', x: 2, z: 4 }, { type: 'path', x: 3, z: 4 }, { type: 'obstacle', x: 4, z: 4 }, { type: 'path', x: 5, z: 4 },
      { type: 'path', x: 0, z: 5 }, { type: 'path', x: 1, z: 5 }, { type: 'path', x: 2, z: 5 }, { type: 'path', x: 3, z: 5 }, { type: 'path', x: 4, z: 5 }, { type: 'path', x: 5, z: 5 },
    ],
  },
  line_following: {
    id: 'line_following',
    name: 'Đường Đi Theo Vạch',
    emoji: '🛤️',
    description: 'Robot đi theo đường line đen trên nền trắng',
    difficulty: 'easy',
    color: '#6366f1',
    startPosition: [0, 0, 0],
    startRotation: 0,
    endPosition: [5, 0, 5],
    cells: [
      { type: 'path', x: 0, z: 0 }, { type: 'line', x: 1, z: 0 }, { type: 'line', x: 2, z: 0 }, { type: 'line', x: 3, z: 0 }, { type: 'line', x: 4, z: 0 }, { type: 'path', x: 5, z: 0 },
      { type: 'path', x: 0, z: 1 }, { type: 'path', x: 1, z: 1 }, { type: 'path', x: 2, z: 1 }, { type: 'path', x: 3, z: 1 }, { type: 'path', x: 4, z: 1 }, { type: 'path', x: 5, z: 1 },
      { type: 'path', x: 0, z: 2 }, { type: 'line', x: 1, z: 2 }, { type: 'line', x: 2, z: 2 }, { type: 'line', x: 3, z: 2 }, { type: 'line', x: 4, z: 2 }, { type: 'path', x: 5, z: 2 },
      { type: 'path', x: 0, z: 3 }, { type: 'path', x: 1, z: 3 }, { type: 'path', x: 2, z: 3 }, { type: 'path', x: 3, z: 3 }, { type: 'path', x: 4, z: 3 }, { type: 'path', x: 5, z: 3 },
      { type: 'path', x: 0, z: 4 }, { type: 'line', x: 1, z: 4 }, { type: 'line', x: 2, z: 4 }, { type: 'line', x: 3, z: 4 }, { type: 'line', x: 4, z: 4 }, { type: 'path', x: 5, z: 4 },
      { type: 'path', x: 0, z: 5 }, { type: 'path', x: 1, z: 5 }, { type: 'path', x: 2, z: 5 }, { type: 'path', x: 3, z: 5 }, { type: 'path', x: 4, z: 5 }, { type: 'path', x: 5, z: 5 },
    ],
  },
};

interface MazeEnvironmentMeshProps {
  preset: MazePreset;
  cellSize: number;
}

function MazeEnvironmentMesh({ preset, cellSize }: MazeEnvironmentMeshProps) {
  const wallHeight = 1.5;
  const wallThickness = 0.2;

  const geometries = useMemo(() => {
    const wallGeometry = new THREE.BoxGeometry(cellSize, wallHeight, wallThickness);
    const pathGeometry = new THREE.BoxGeometry(cellSize * 0.9, 0.05, cellSize * 0.9);
    const obstacleGeometry = new THREE.CylinderGeometry(cellSize * 0.25, cellSize * 0.25, wallHeight * 0.8, 16);
    const lineGeometry = new THREE.BoxGeometry(cellSize * 0.6, 0.02, cellSize * 0.6);
    const startGeometry = new THREE.BoxGeometry(cellSize * 0.8, 0.1, cellSize * 0.8);
    const endGeometry = new THREE.BoxGeometry(cellSize * 0.8, 0.1, cellSize * 0.8);

    const materials = {
      wall: new THREE.MeshStandardMaterial({ color: WALL_COLOR }),
      path: new THREE.MeshStandardMaterial({ color: PATH_COLOR }),
      obstacle: new THREE.MeshStandardMaterial({ color: OBSTACLE_COLOR }),
      line: new THREE.MeshStandardMaterial({ color: LINE_COLOR }),
      start: new THREE.MeshStandardMaterial({ color: START_COLOR, emissive: START_COLOR, emissiveIntensity: 0.3 }),
      end: new THREE.MeshStandardMaterial({ color: END_COLOR, emissive: END_COLOR, emissiveIntensity: 0.3 }),
    };

    return { wallGeometry, pathGeometry, obstacleGeometry, lineGeometry, startGeometry, endGeometry, materials };
  }, [cellSize]);

  return (
    <group>
      {preset.cells.map((cell, index) => {
        const posX = cell.x * cellSize;
        const posZ = cell.z * cellSize;

        switch (cell.type) {
          case 'wall':
            return (
              <mesh
                key={`wall-${index}`}
                geometry={geometries.wallGeometry}
                material={geometries.materials.wall}
                position={[posX, wallHeight / 2, posZ]}
              />
            );
          case 'path':
            return (
              <mesh
                key={`path-${index}`}
                geometry={geometries.pathGeometry}
                material={geometries.materials.path}
                position={[posX, 0, posZ]}
              />
            );
          case 'obstacle':
            return (
              <mesh
                key={`obstacle-${index}`}
                geometry={geometries.obstacleGeometry}
                material={geometries.materials.obstacle}
                position={[posX, wallHeight * 0.4, posZ]}
              />
            );
          case 'line':
            return (
              <mesh
                key={`line-${index}`}
                geometry={geometries.lineGeometry}
                material={geometries.materials.line}
                position={[posX, 0.02, posZ]}
              />
            );
          default:
            return null;
        }
      })}

      {/* Start marker */}
      <mesh
        geometry={geometries.startGeometry}
        material={geometries.materials.start}
        position={[
          preset.startPosition[0] * cellSize,
          0.05,
          preset.startPosition[2] * cellSize
        ]}
      />
      {/* Start flag */}
      <mesh position={[
        preset.startPosition[0] * cellSize,
        1,
        preset.startPosition[2] * cellSize
      ]}>
        <cylinderGeometry args={[0.05, 0.05, 1.5, 8]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>

      {/* End marker */}
      <mesh
        geometry={geometries.endGeometry}
        material={geometries.materials.end}
        position={[
          preset.endPosition[0] * cellSize,
          0.05,
          preset.endPosition[2] * cellSize
        ]}
      />
      {/* End flag */}
      <mesh position={[
        preset.endPosition[0] * cellSize,
        1,
        preset.endPosition[2] * cellSize
      ]}>
        <cylinderGeometry args={[0.05, 0.05, 1.5, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh
        position={[
          preset.endPosition[0] * cellSize + 0.3,
          1.5,
          preset.endPosition[2] * cellSize
        ]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <boxGeometry args={[0.6, 0.4, 0.05]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}

export default function MazeEnvironment({
  mazeType,
  mazePreset,
  customCells,
  showGrid = true,
  onReachEnd
}: MazeEnvironmentProps) {
  const cellSize = 2;

  const activePreset = useMemo(() => {
    if (mazeType === 'custom' && customCells) {
      return {
        id: 'custom',
        name: 'Bản đồ tùy chỉnh',
        emoji: '🎨',
        description: 'Bản đồ do giáo viên tạo',
        difficulty: 'medium' as const,
        color: '#8b5cf6',
        startPosition: [0, 0, 0] as [number, number, number],
        startRotation: 0,
        endPosition: [5, 0, 5] as [number, number, number],
        cells: customCells,
      };
    }

    const presetMap: Record<MazeType, string> = {
      maze: 'maze_medium',
      obstacle: 'obstacle_course',
      line_following: 'line_following',
      custom: 'maze_medium',
    };

    return MAZE_PRESETS[presetMap[mazeType]] || MAZE_PRESETS.maze_easy;
  }, [mazeType, customCells]);

  // Calculate grid size
  const maxX = Math.max(...activePreset.cells.map(c => c.x)) + 1;
  const maxZ = Math.max(...activePreset.cells.map(c => c.z)) + 1;

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[maxX * cellSize / 2 - cellSize / 2, 0, maxZ * cellSize / 2 - cellSize / 2]} receiveShadow>
        <planeGeometry args={[maxX * cellSize + 4, maxZ * cellSize + 4]} />
        <meshStandardMaterial color="#f3f4f6" />
      </mesh>

      {/* Grid */}
      {showGrid && (
        <gridHelper
          args={[Math.max(maxX, maxZ) * cellSize, Math.max(maxX, maxZ), '#d1d5db', '#e5e7eb']}
          position={[maxX * cellSize / 2 - cellSize / 2, 0.01, maxZ * cellSize / 2 - cellSize / 2]}
        />
      )}

      {/* Maze walls and obstacles */}
      <MazeEnvironmentMesh preset={activePreset} cellSize={cellSize} />

      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />

      {/* Directional light for shadows */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Challenge info label */}
      <group position={[0, 3, maxZ * cellSize - cellSize]}>
        <mesh>
          <planeGeometry args={[8, 1.5]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[7.8, 1.3]} />
          <meshBasicMaterial color="white" transparent opacity={0} />
        </mesh>
      </group>
    </group>
  );
}

// Preset selector component for UI
interface MazePresetSelectorProps {
  selectedPreset: string;
  onSelectPreset: (presetId: string) => void;
}

export function MazePresetSelector({ selectedPreset, onSelectPreset }: MazePresetSelectorProps) {
  const presets = Object.values(MAZE_PRESETS);

  return (
    <div style={presetStyles.container}>
      <h3 style={presetStyles.title}>🗺️ Chọn bản đồ</h3>
      <div style={presetStyles.grid}>
        {presets.map(preset => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset.id)}
            style={{
              ...presetStyles.card,
              ...(selectedPreset === preset.id ? presetStyles.cardSelected : {}),
              borderColor: selectedPreset === preset.id ? preset.color : '#e5e7eb',
            }}
          >
            <span style={presetStyles.emoji}>{preset.emoji}</span>
            <span style={presetStyles.name}>{preset.name}</span>
            <span style={presetStyles.difficulty}>
              {preset.difficulty === 'easy' ? '🟢 Dễ' : preset.difficulty === 'medium' ? '🟡 TB' : '🔴 Khó'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const presetStyles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 16px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 12px',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cardSelected: {
    backgroundColor: '#eff6ff',
  },
  emoji: {
    fontSize: '32px',
  },
  name: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  difficulty: {
    fontSize: '11px',
    color: '#6b7280',
  },
};
