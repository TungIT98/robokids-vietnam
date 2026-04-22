import { useRef, useState, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

interface SpaceRobotProps {
  position?: [number, number, number];
  onCommand?: (command: string) => void;
  isExecuting?: boolean;
  currentCommand?: string | null;
  modelPath?: string;
}

// Loading fallback component
function RobotLoadingFallback() {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.4, 0.8, 8, 16]} />
        <meshStandardMaterial color="#4a5568" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// GLB Model component - only rendered when modelPath is valid
function GLBRobotModel({ modelPath, onAnimUpdate, currentCommand }: { modelPath: string; onAnimUpdate: (group: THREE.Group | null) => void; currentCommand: string | null }) {
  const { scene, animations } = useGLTF(modelPath);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Set up animation mixer if animations exist
    if (animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(clone);
      // Find appropriate animation based on command
      const animName = currentCommand === 'dance' ? 'Dance' :
                       currentCommand === 'wave' ? 'Wave' :
                       currentCommand === 'jump' ? 'Jump' :
                       'Idle';
      const clip = THREE.AnimationClip.findByName(animations, animName) || animations[0];
      if (clip) {
        actionRef.current = mixerRef.current.clipAction(clip);
        actionRef.current.play();
      }
    }

    onAnimUpdate(clone);
    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current?.uncacheRoot(mixerRef.current.getRoot());
      onAnimUpdate(null);
    };
  }, [scene, animations]);

  // Update animation based on command
  useEffect(() => {
    if (mixerRef.current && actionRef.current) {
      const animName = currentCommand === 'dance' ? 'Dance' :
                       currentCommand === 'wave' ? 'Wave' :
                       currentCommand === 'jump' ? 'Jump' :
                       'Idle';
      const clip = THREE.AnimationClip.findByName(animations, animName);
      if (clip) {
        actionRef.current = mixerRef.current!.clipAction(clip);
        actionRef.current.reset().play();
      }
    }
  }, [currentCommand, animations]);

  // Update mixer in frame
  useFrame((state, delta) => {
    mixerRef.current?.update(delta);
  });

  return <primitive object={scene} />;
}

// Procedural robot (fallback when no GLB model)
function ProceduralRobot({
  isExecuting,
  currentCommand
}: {
  isExecuting: boolean;
  currentCommand: string | null;
}) {
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);

  const [thrusterIntensity, setThrusterIntensity] = useState(0);
  const [dancePhase, setDancePhase] = useState(0);
  const [wavePhase, setWavePhase] = useState(0);
  const [walkPhase, setWalkPhase] = useState(0);
  const [jumpPhase, setJumpPhase] = useState(0);
  const [idlePhase, setIdlePhase] = useState(0);
  const [animState, setAnimState] = useState<'idle' | 'walk' | 'jump' | 'dance' | 'wave'>('idle');

  useFrame((state, delta) => {
    // Determine animation state
    let newAnimState: 'idle' | 'walk' | 'jump' | 'dance' | 'wave' = 'idle';
    if (currentCommand === 'dance') newAnimState = 'dance';
    else if (currentCommand === 'wave') newAnimState = 'wave';
    else if (currentCommand === 'jump') newAnimState = 'jump';
    else if (isExecuting) newAnimState = 'walk';

    // Thruster effects when executing
    if (isExecuting) {
      setThrusterIntensity(Math.sin(state.clock.elapsedTime * 20) * 0.5 + 0.5);
    } else {
      setThrusterIntensity(0);
    }

    // Update animation phases based on state
    if (newAnimState === 'dance') {
      setDancePhase((prev) => (prev + delta * 8) % (Math.PI * 2));
    } else {
      setDancePhase(0);
    }

    if (newAnimState === 'wave') {
      setWavePhase((prev) => (prev + delta * 10) % (Math.PI * 2));
      if (rightArmRef.current) {
        rightArmRef.current.rotation.z = -0.3 + Math.sin(wavePhase) * 0.5;
      }
    } else {
      setWavePhase(0);
      if (rightArmRef.current) {
        rightArmRef.current.rotation.z = -0.3;
      }
    }

    // Walk animation - arm and leg swing
    if (newAnimState === 'walk') {
      setWalkPhase((prev) => (prev + delta * 12) % (Math.PI * 2));
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = Math.sin(walkPhase) * 0.5;
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -Math.sin(walkPhase) * 0.5;
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = -Math.sin(walkPhase) * 0.4;
      }
      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(walkPhase) * 0.4;
      }
      // Subtle body bob
      if (bodyRef.current) {
        bodyRef.current.position.y = 0.5 + Math.abs(Math.sin(walkPhase * 2)) * 0.1;
      }
    } else {
      setWalkPhase(0);
      // Reset limbs to default positions with smooth interpolation
      const resetSpeed = delta * 8;
      if (rightArmRef.current) rightArmRef.current.rotation.x *= (1 - resetSpeed);
      if (leftArmRef.current) leftArmRef.current.rotation.x *= (1 - resetSpeed);
      if (rightLegRef.current) rightLegRef.current.rotation.x *= (1 - resetSpeed);
      if (leftLegRef.current) leftLegRef.current.rotation.x *= (1 - resetSpeed);
      if (bodyRef.current) bodyRef.current.position.y = 0.5;
    }

    // Jump animation - crouch then spring up
    if (newAnimState === 'jump') {
      setJumpPhase((prev) => (prev + delta * 6) % (Math.PI * 2));
      const jumpProgress = Math.sin(jumpPhase);
      if (bodyRef.current) {
        bodyRef.current.position.y = 0.5 + Math.max(0, jumpProgress) * 1.5;
      }
      // Tuck legs during jump
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.abs(jumpProgress) * 0.8;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.abs(jumpProgress) * 0.8;
    } else {
      setJumpPhase(0);
    }

    // Idle animation - subtle breathing and sway
    setIdlePhase((prev) => prev + delta * 1.5);
    if (newAnimState === 'idle' && bodyRef.current) {
      // Subtle breathing
      const breathe = Math.sin(idlePhase) * 0.02;
      bodyRef.current.scale.y = 1 + breathe;
      // Subtle sway
      bodyRef.current.rotation.z = Math.sin(idlePhase * 0.7) * 0.02;
    } else if (bodyRef.current) {
      // Smooth reset scale
      bodyRef.current.scale.y = THREE.MathUtils.lerp(bodyRef.current.scale.y, 1, delta * 4);
      bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, 0, delta * 4);
    }

    setAnimState(newAnimState);
  });

  return (
    <>
      {/* Space Suit Body */}
      <mesh ref={bodyRef} position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.4, 0.8, 8, 16]} />
        <meshStandardMaterial
          color="#e0e0e0"
          metalness={0.6}
          roughness={0.3}
          emissive="#00f0ff"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Space Helmet */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.9}
          roughness={0.1}
          emissive="#00f0ff"
          emissiveIntensity={0.3}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Helmet Visor */}
      <mesh position={[0, 1.3, 0.2]}>
        <sphereGeometry args={[0.28, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#00f0ff"
          metalness={1}
          roughness={0}
          emissive="#00f0ff"
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Left Arm */}
      <mesh ref={leftArmRef} position={[-0.55, 0.6, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.1, 0.5, 8, 16]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Right Arm */}
      <mesh ref={rightArmRef} position={[0.55, 0.6, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.1, 0.5, 8, 16]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Left Leg */}
      <mesh ref={leftLegRef} position={[-0.2, -0.3, 0]} rotation={[0, 0, 0.1]}>
        <capsuleGeometry args={[0.12, 0.5, 8, 16]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Right Leg */}
      <mesh ref={rightLegRef} position={[0.2, -0.3, 0]} rotation={[0, 0, -0.1]}>
        <capsuleGeometry args={[0.12, 0.5, 8, 16]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Backpack */}
      <mesh position={[0, 0.5, -0.35]}>
        <boxGeometry args={[0.4, 0.5, 0.2]} />
        <meshStandardMaterial
          color="#3498db"
          metalness={0.7}
          roughness={0.2}
          emissive="#3498db"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Antenna */}
      <mesh position={[0.15, 1.7, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#ff6b35" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.15, 1.88, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color="#ff6b35"
          emissive="#ff6b35"
          emissiveIntensity={1}
        />
      </mesh>

      {/* Thruster Effects */}
      {isExecuting && (
        <>
          <mesh position={[-0.15, -0.6, 0]}>
            <coneGeometry args={[0.08, thrusterIntensity * 0.5, 8]} />
            <meshBasicMaterial
              color="#00f0ff"
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh position={[0.15, -0.6, 0]}>
            <coneGeometry args={[0.08, thrusterIntensity * 0.5, 8]} />
            <meshBasicMaterial
              color="#00f0ff"
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}

      {/* Neon Glow Ring */}
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.02, 16, 32]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

export default function SpaceRobot({
  position = [0, 0, 0],
  onCommand,
  isExecuting = false,
  currentCommand,
  modelPath
}: SpaceRobotProps) {
  const robotRef = useRef<THREE.Group>(null);
  const [rotation, setRotation] = useState(0);
  const [jumpPhase, setJumpPhase] = useState(0);

  // Animation for the main group (rotation + dance + jump)
  useFrame((state, delta) => {
    if (robotRef.current) {
      robotRef.current.rotation.y = rotation;

      // Jump animation - move whole robot up then down
      if (currentCommand === 'jump') {
        setJumpPhase((prev) => (prev + delta * 6) % (Math.PI * 2));
        robotRef.current.position.y = Math.max(0, Math.sin(jumpPhase)) * 2;
      }
      // Dance animation - bob up and down
      else if (currentCommand === 'dance') {
        setJumpPhase(0);
        robotRef.current.position.y = Math.sin(state.clock.elapsedTime * 8) * 0.3;
        robotRef.current.rotation.y += delta * 4;
      } else {
        setJumpPhase(0);
        // Smooth landing
        robotRef.current.position.y = THREE.MathUtils.lerp(robotRef.current.position.y, 0, delta * 8);
      }
    }
  });

  const handleMove = (direction: 'forward' | 'backward' | 'left' | 'right') => {
    if (!onCommand) return;
    onCommand(direction);
  };

  return (
    <group ref={robotRef} position={position}>
      {/* Use GLB model if path provided, otherwise procedural fallback */}
      {modelPath ? (
        <Suspense fallback={<RobotLoadingFallback />}>
          <GLBRobotModel modelPath={modelPath} onAnimUpdate={() => {}} currentCommand={currentCommand ?? null} />
        </Suspense>
      ) : (
        <ProceduralRobot isExecuting={isExecuting} currentCommand={currentCommand ?? null} />
      )}

      {/* Control Buttons UI */}
      <Html position={[0, 2.5, 0]} center distanceFactor={10}>
        <div className="flex gap-1">
          <button
            onClick={() => handleMove('forward')}
            className="w-8 h-8 bg-cyan-500/80 hover:bg-cyan-400 rounded-lg text-white font-bold text-sm transition-all"
            style={{ boxShadow: '0 0 10px #00f0ff' }}
          >
            ▲
          </button>
          <button
            onClick={() => handleMove('left')}
            className="w-8 h-8 bg-purple-500/80 hover:bg-purple-400 rounded-lg text-white font-bold text-sm transition-all"
            style={{ boxShadow: '0 0 10px #9b59b6' }}
          >
            ◀
          </button>
          <button
            onClick={() => handleMove('right')}
            className="w-8 h-8 bg-purple-500/80 hover:bg-purple-400 rounded-lg text-white font-bold text-sm transition-all"
            style={{ boxShadow: '0 0 10px #9b59b6' }}
          >
            ▶
          </button>
          <button
            onClick={() => handleMove('backward')}
            className="w-8 h-8 bg-orange-500/80 hover:bg-orange-400 rounded-lg text-white font-bold text-sm transition-all"
            style={{ boxShadow: '0 0 10px #ff6b35' }}
          >
            ▼
          </button>
        </div>
      </Html>

      {/* Status Indicator */}
      {isExecuting && (
        <Html position={[0, -1.2, 0]} center distanceFactor={10}>
          <div
            className="px-3 py-1 rounded-full text-white text-xs font-bold animate-pulse"
            style={{ background: 'linear-gradient(90deg, #00f0ff, #9b59b6)', boxShadow: '0 0 20px #00f0ff' }}
          >
            ⚡ Executing...
          </div>
        </Html>
      )}
    </group>
  );
}