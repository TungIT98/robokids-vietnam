/**
 * VoxelGrid - 3D voxel grid system for RoboKids
 *
 * Features:
 * - 16x16x16 interactive grid
 * - Click to add/remove voxels
 * - Color picker integration
 * - Grid visualization with guides
 */

import { useRef, useState, useCallback } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVoxelBuilderStore, Voxel } from '../../stores/voxelStore';

interface VoxelGridProps {
  onVoxelClick?: (x: number, y: number, z: number) => void;
}

const GRID_SIZE = 16;
const CELL_SIZE = 1;
const GRID_COLOR = '#374151';
const HOVER_COLOR = '#4ade80';

export function VoxelGrid({ onVoxelClick }: VoxelGridProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; z: number } | null>(null);

  const {
    voxels,
    gridSize,
    selectedTool,
    selectedColor,
    addVoxel,
    removeVoxel,
    setSelectedVoxel,
  } = useVoxelBuilderStore();

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const point = e.point;
    const x = Math.floor(point.x + gridSize / 2);
    const y = Math.floor(point.y + 0.5); // Start from ground level
    const z = Math.floor(point.z + gridSize / 2);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && z >= 0 && z < gridSize) {
      setHoveredCell({ x, y, z });
    } else {
      setHoveredCell(null);
    }
  }, [gridSize]);

  const handlePointerLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!hoveredCell) return;

    const { x, y, z } = hoveredCell;

    if (selectedTool === 'add') {
      addVoxel(x, y, z);
    } else if (selectedTool === 'remove') {
      removeVoxel(x, y, z);
    }

    onVoxelClick?.(x, y, z);
    setSelectedVoxel({ x, y, z, color: selectedColor });
  }, [hoveredCell, selectedTool, selectedColor, addVoxel, removeVoxel, onVoxelClick, setSelectedVoxel]);

  // Create grid lines
  const gridLines = useCallback(() => {
    const lines: JSX.Element[] = [];
    const halfSize = gridSize / 2;

    // Vertical lines on XZ plane (bottom)
    for (let i = 0; i <= gridSize; i++) {
      const offset = i - halfSize;
      lines.push(
        <line key={`x-${i}`}>
          <bufferGeometry
            ref={(ref) => {
              if (ref) {
                const positions = ref.attributes.position;
                positions.setXYZ(0, offset - 0.5, 0, -halfSize + 0.5);
                positions.setXYZ(1, offset - 0.5, 0, halfSize - 0.5);
                positions.needsUpdate = true;
              }
            }}
          />
          <lineBasicMaterial color={GRID_COLOR} transparent opacity={0.3} />
        </line>,
        <line key={`z-${i}`}>
          <bufferGeometry
            ref={(ref) => {
              if (ref) {
                const positions = ref.attributes.position;
                positions.setXYZ(0, -halfSize + 0.5, 0, offset - 0.5);
                positions.setXYZ(1, halfSize - 0.5, 0, offset - 0.5);
                positions.needsUpdate = true;
              }
            }}
          />
          <lineBasicMaterial color={GRID_COLOR} transparent opacity={0.3} />
        </line>
      );
    }

    return lines;
  }, [gridSize]);

  return (
    <group>
      {/* Ground plane for raycasting */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Grid helper */}
      <gridHelper
        args={[gridSize, gridSize, GRID_COLOR, GRID_COLOR]}
        position={[0, 0.001, 0]}
      />

      {/* Hover indicator */}
      {hoveredCell && selectedTool === 'add' && (
        <mesh
          position={[hoveredCell.x - gridSize / 2 + 0.5, hoveredCell.y + 0.5, hoveredCell.z - gridSize / 2 + 0.5]}
        >
          <boxGeometry args={[0.95, 0.95, 0.95]} />
          <meshBasicMaterial color={HOVER_COLOR} transparent opacity={0.4} />
        </mesh>
      )}

      {/* Rendered voxels */}
      {voxels.map((voxel, index) => (
        <VoxelBlock key={`${voxel.x}-${voxel.y}-${voxel.z}-${index}`} voxel={voxel} />
      ))}
    </group>
  );
}

interface VoxelBlockProps {
  voxel: Voxel;
  isSelected?: boolean;
}

function VoxelBlock({ voxel, isSelected }: VoxelBlockProps) {
  const { gridSize, selectedTool, selectedColor, removeVoxel, paintVoxel } = useVoxelBuilderStore();
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (selectedTool === 'remove') {
      removeVoxel(voxel.x, voxel.y, voxel.z);
    } else if (selectedTool === 'paint') {
      paintVoxel(voxel.x, voxel.y, voxel.z, selectedColor);
    }
  }, [selectedTool, removeVoxel, paintVoxel, voxel, selectedColor]);

  return (
    <mesh
      position={[
        voxel.x - gridSize / 2 + 0.5,
        voxel.y + 0.5,
        voxel.z - gridSize / 2 + 0.5,
      ]}
      onClick={handleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      <meshStandardMaterial
        color={voxel.color}
        metalness={0.1}
        roughness={0.8}
        emissive={isSelected || hovered ? voxel.color : '#000000'}
        emissiveIntensity={isSelected ? 0.5 : hovered ? 0.2 : 0}
      />
    </mesh>
  );
}

export default VoxelGrid;
