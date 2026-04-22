import { useRef, Suspense, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Environment model paths - can be configured via props
interface EnvironmentModels {
  spaceStation?: string;
  asteroid1?: string;
  asteroid2?: string;
  ground?: string;
}

interface SpaceStationProps {
  modelPath?: string;
}

// Space Station - either GLB model or procedural fallback
function SpaceStation({ modelPath }: SpaceStationProps) {
  const stationRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (stationRef.current) {
      stationRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  // Load GLB model if path provided
  if (modelPath) {
    const { scene } = useGLTF(modelPath);
    useEffect(() => {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }, [scene]);
    return <primitive object={scene} ref={stationRef} />;
  }

  // Procedural fallback
  return (
    <group ref={stationRef} position={[15, 5, -20]}>
      {/* Main Hub */}
      <mesh>
        <cylinderGeometry args={[2, 2, 1, 16]} />
        <meshStandardMaterial
          color="#4a5568"
          metalness={0.8}
          roughness={0.2}
          emissive="#00f0ff"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Central Module */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 3, 16]} />
        <meshStandardMaterial
          color="#2d3748"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Solar Panels */}
      <mesh position={[4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.1, 6, 2]} />
        <meshStandardMaterial
          color="#1a365d"
          metalness={0.7}
          roughness={0.3}
          emissive="#00f0ff"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[-4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.1, 6, 2]} />
        <meshStandardMaterial
          color="#1a365d"
          metalness={0.7}
          roughness={0.3}
          emissive="#00f0ff"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Connecting Arms */}
      <mesh position={[2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 4, 8]} />
        <meshStandardMaterial color="#718096" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 4, 8]} />
        <meshStandardMaterial color="#718096" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Docking Port */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.5, 16]} />
        <meshStandardMaterial
          color="#ff6b35"
          metalness={0.9}
          roughness={0.1}
          emissive="#ff6b35"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Antenna */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#00f0ff"
          emissive="#00f0ff"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

interface AsteroidProps {
  position: [number, number, number];
  scale: number;
  modelPath?: string;
}

// Asteroid - either GLB model or procedural fallback
function Asteroid({ position, scale, modelPath }: AsteroidProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005;
      meshRef.current.rotation.y += 0.003;
    }
  });

  // Use GLB model if path provided
  if (modelPath) {
    const { scene } = useGLTF(modelPath);
    return (
      <primitive
        object={scene}
        position={position}
        scale={scale}
        ref={meshRef as React.Ref<THREE.Object3D>}
      />
    );
  }

  // Procedural fallback
  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#4a5568"
        metalness={0.3}
        roughness={0.9}
        flatShading
      />
    </mesh>
  );
}

interface SpaceGroundProps {
  modelPath?: string;
}

// Ground plane - either GLB model or procedural fallback
function SpaceGround({ modelPath }: SpaceGroundProps) {
  if (modelPath) {
    const { scene } = useGLTF(modelPath);
    return <primitive object={scene} />;
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <circleGeometry args={[50, 64]} />
      <meshStandardMaterial
        color="#0a0a1a"
        metalness={0.9}
        roughness={0.1}
        emissive="#00f0ff"
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

function GridLines() {
  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 0.5) % 1 - 0.5;
    }
  });

  return (
    <gridHelper
      ref={gridRef}
      args={[100, 100, '#00f0ff', '#1a365d']}
      position={[0, -2.99, 0]}
    />
  );
}

interface SpaceEnvironmentProps {
  models?: EnvironmentModels;
}

export default function SpaceEnvironment({ models }: SpaceEnvironmentProps) {
  const [loading, setLoading] = useState(false);

  // Preload models if paths provided
  useEffect(() => {
    if (models) {
      const paths = Object.values(models).filter(Boolean);
      if (paths.length > 0) {
        setLoading(true);
        // Preload all model URLs
        paths.forEach((path) => {
          if (path) {
            const loader = new THREE.TextureLoader();
            // Just trigger load to cache
            loader.load(path as string);
          }
        });
        setLoading(false);
      }
    }
  }, [models]);

  return (
    <>
      <Suspense fallback={null}>
        <SpaceStation modelPath={models?.spaceStation} />
      </Suspense>

      {/* Asteroids with optional GLB models */}
      <Asteroid position={[-20, 8, -30]} scale={3} modelPath={models?.asteroid1} />
      <Asteroid position={[25, -5, -25]} scale={2} modelPath={models?.asteroid2} />
      <Asteroid position={[-10, -8, -35]} scale={4} />
      <Asteroid position={[35, 15, -40]} scale={2.5} />
      <Asteroid position={[-30, 3, -20]} scale={1.5} />

      <Suspense fallback={null}>
        <SpaceGround modelPath={models?.ground} />
      </Suspense>

      <GridLines />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-20, 10, -20]} intensity={0.5} color="#9b59b6" />
      <pointLight position={[20, -10, -30]} intensity={0.3} color="#00f0ff" />

      {/* Space Skybox - Drei Stars Component */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Distant Nebula Glow */}
      <mesh position={[50, 30, -80]}>
        <sphereGeometry args={[15, 32, 32]} />
        <meshBasicMaterial
          color="#9b59b6"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[-60, -20, -90]}>
        <sphereGeometry args={[20, 32, 32]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}