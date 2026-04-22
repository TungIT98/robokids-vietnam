/**
 * VoxelCanvas - Main 3D canvas for voxel building
 *
 * Features:
 * - Interactive 3D grid (16x16x16)
 * - Orbit controls for viewing
 * - Ambient and directional lighting
 * - Camera controls
 */

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { VoxelGrid } from './VoxelGrid';

interface VoxelCanvasProps {
  gridSize?: number;
  showGrid?: boolean;
  enableOrbitControls?: boolean;
}

export function VoxelCanvas({
  gridSize = 16,
  showGrid = true,
  enableOrbitControls = true,
}: VoxelCanvasProps) {
  return (
    <Canvas shadows gl={{ antialias: true, alpha: false }}>
      <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={50} />

      {enableOrbitControls && (
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2 - 0.1}
          target={[0, gridSize / 2, 0]}
        />
      )}

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight args={['#87ceeb', '#8b4513', 0.3]} />

      {/* Environment */}
      <Environment preset="city" />

      {/* Main voxel grid */}
      <Suspense fallback={null}>
        <VoxelGrid />
      </Suspense>

      {/* Ground shadows */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.4}
        scale={gridSize * 2}
        blur={2}
        far={gridSize}
      />

      {/* Infinite grid base */}
      <gridHelper
        args={[gridSize * 4, gridSize * 4, '#1f2937', '#1f2937']}
        position={[0, 0.002, 0]}
      />
    </Canvas>
  );
}

export default VoxelCanvas;
