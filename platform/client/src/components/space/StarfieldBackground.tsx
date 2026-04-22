import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Star {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  opacity: number;
  twinkleSpeed: number;
}

function Stars({ count = 2000 }: { count?: number }) {
  const meshRef = useRef<THREE.Points>(null);

  const [positions, sizes, opacities, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const op = new Float32Array(count);
    const sp = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      sz[i] = Math.random() * 0.5 + 0.1;
      op[i] = Math.random();
      sp[i] = Math.random() * 0.02 + 0.005;
    }

    return [pos, sz, op, sp];
  }, [count]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.1;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Nebula() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={[20, 10, -30]}>
      <sphereGeometry args={[15, 32, 32]} />
      <meshBasicMaterial
        color="#9b59b6"
        transparent
        opacity={0.15}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function Nebula2() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = -state.clock.elapsedTime * 0.015;
    }
  });

  return (
    <mesh ref={meshRef} position={[-25, -15, -40]}>
      <sphereGeometry args={[20, 32, 32]} />
      <meshBasicMaterial
        color="#00f0ff"
        transparent
        opacity={0.1}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function Planet({ position, color, size }: { position: [number, number, number]; color: string; size: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2}
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}

export default function StarfieldBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      <Canvas gl={{ antialias: true, alpha: true }} style={{ width: '100%', height: '100%' }}>
        <perspectiveCamera position={[0, 0, 30]} fov={60} />
        <color attach="background" args={['#0a0a1a']} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#00f0ff" />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#9b59b6" />
        <Stars count={2000} />
        <Nebula />
        <Nebula2 />
        <Planet position={[40, 20, -50]} color="#ff6b35" size={8} />
        <Planet position={[-50, -30, -60]} color="#3498db" size={12} />
      </Canvas>
    </div>
  );
}