import { useRef } from 'react';
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SpacePhysicsProps {
  children: React.ReactNode;
  gravity?: [number, number, number];
}

// Space gravity presets
export const GRAVITY_PRESETS = {
  earth: [0, -9.81, 0] as [number, number, number],
  moon: [0, -1.62, 0] as [number, number, number],
  mars: [0, -3.71, 0] as [number, number, number],
  space: [0, -2, 0] as [number, number, number], // Low gravity for space station
  microgravity: [0, -0.1, 0] as [number, number, number], // Near-zero for asteroid missions
};

export function SpacePhysics({ children, gravity = GRAVITY_PRESETS.space }: SpacePhysicsProps) {
  return (
    <Physics gravity={gravity}>
      {/* Ground collision with configurable friction */}
      <RigidBody type="fixed" colliders={false} position={[0, -3, 0]} friction={1.5}>
        <CuboidCollider args={[50, 0.1, 50]} friction={1.5} restitution={0.1} />
        {children}
      </RigidBody>
    </Physics>
  );
}

// Physics-enabled ground for SpaceEnvironment
export function PhysicsGround() {
  return (
    <RigidBody type="fixed" colliders={false} position={[0, -3, 0]}>
      <CuboidCollider args={[50, 0.1, 50]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[50, 64]} />
        <meshStandardMaterial
          color="#0a0a1a"
          metalness={0.9}
          roughness={0.1}
          emissive="#00f0ff"
          emissiveIntensity={0.05}
        />
      </mesh>
    </RigidBody>
  );
}

// Physics-enabled asteroid
interface PhysicsAsteroidProps {
  position: [number, number, number];
  scale: number;
}

export function PhysicsAsteroid({ position, scale }: PhysicsAsteroidProps) {
  return (
    <RigidBody type="fixed" position={position} colliders="hull">
      <mesh scale={scale}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#4a5568"
          metalness={0.3}
          roughness={0.9}
          flatShading
        />
      </mesh>
    </RigidBody>
  );
}

// Physics-enabled robot base with vehicle physics (tip-over support)
interface PhysicsRobotBodyProps {
  children: React.ReactNode;
  position?: [number, number, number];
  rotation?: number;
  mass?: number;
  linearDamping?: number;
  angularDamping?: number;
  friction?: number;
  restitution?: number;
  // For tip-over physics - center of mass offset
  centerOfMass?: [number, number, number];
  // Lock rotations except in specific axes for vehicle behavior
  lockRotations?: boolean;
}

export function PhysicsRobotBody({
  children,
  position = [0, 0, 0],
  rotation = 0,
  mass = 1,
  linearDamping = 0.5,
  angularDamping = 0.3,
  friction = 0.5,
  restitution = 0.1,
  centerOfMass = [0, 0, 0],
  lockRotations = true,
}: PhysicsRobotBodyProps) {
  return (
    <RigidBody
      type="dynamic"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="hull"
      mass={mass}
      linearDamping={linearDamping}
      angularDamping={angularDamping}
      friction={friction}
      restitution={restitution}
      // Center of mass affects how vehicle tips - lower = more stable, higher = easier to tip
      // @ts-ignore - Rapier supports centerOfMass as prop
      centerOfMass={centerOfMass}
      // Enable/disable rotations for vehicle behavior
      enabledRotations={!lockRotations ? [true, true, true] : [false, false, true]}
    >
      {children}
    </RigidBody>
  );
}

// Vehicle physics body optimized for car/rover that can tip over
// Key settings for tip-over on sharp turns:
// - Higher center of mass (positive Y) makes vehicle unstable
// - Lower friction on one axis allows sliding
// - angularDamping controls how fast it rotates when tipping
interface VehiclePhysicsBodyProps {
  children: React.ReactNode;
  position?: [number, number, number];
  rotation?: number;
  // Higher centerOfMassY = easier to tip (0.3-0.6 recommended for vehicles)
  centerOfMassY?: number;
  // How easily the vehicle slides laterally
  lateralFriction?: number;
  // How bouncy the vehicle is
  restitution?: number;
  // Mass in kg
  mass?: number;
}

export function VehiclePhysicsBody({
  children,
  position = [0, 0, 0],
  rotation = 0,
  centerOfMassY = 0.4,
  lateralFriction = 0.3,
  restitution = 0.1,
  mass = 2,
}: VehiclePhysicsBodyProps) {
  return (
    <RigidBody
      type="dynamic"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="hull"
      mass={mass}
      // Lower linear damping for more sliding movement
      linearDamping={0.1}
      // Lower angular damping = vehicle tips more easily and spins longer
      angularDamping={0.2}
      // Lower friction = more sliding, especially on turns
      friction={lateralFriction}
      restitution={restitution}
      // Allow rotation on all axes (so it can tip over)
      enabledRotations={[true, true, true]}
      // Offset center of mass upward - this is key for tip-over physics
      // @ts-ignore - Rapier supports centerOfMass as prop
      centerOfMass={[0, centerOfMassY, 0]}
    >
      {children}
    </RigidBody>
  );
}

// Grid lines component for physics scene
export function PhysicsGridLines() {
  return (
    <RigidBody type="fixed" colliders={false} position={[0, -2.99, 0]}>
      <gridHelper args={[100, 100, '#00f0ff', '#1a365d']} />
    </RigidBody>
  );
}

// Car/Rover with tip-over detection and kickout mechanic
// Detects when the car tips over beyond a threshold angle and triggers kickout
interface CarPhysicsBodyProps {
  children: React.ReactNode;
  position?: [number, number, number];
  rotation?: number;
  centerOfMassY?: number;
  lateralFriction?: number;
  restitution?: number;
  mass?: number;
  onTipOver?: () => void;
  onKickout?: () => void;
  tipThreshold?: number; // radians - angle beyond which car is considered tipped
  kickoutForce?: [number, number, number]; // force to apply when kicked out
}

export function CarPhysicsBody({
  children,
  position = [0, 0, 0],
  rotation = 0,
  centerOfMassY = 0.4,
  lateralFriction = 0.3,
  restitution = 0.1,
  mass = 2,
  onTipOver,
  onKickout,
  tipThreshold = Math.PI / 3, // 60 degrees default
  kickoutForce = [0, 10, 5],
}: CarPhysicsBodyProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const hasTipped = useRef(false);
  const kickoutTimer = useRef<NodeJS.Timeout | null>(null);

  // Check rotation each frame for tip-over
  useFrame(() => {
    if (!rigidBodyRef.current) return;

    const rb = rigidBodyRef.current;
    const rot = rb.rotation();

    // Convert quaternion to Euler to check X and Z rotations
    const euler = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w)
    );

    const tiltAngle = Math.abs(euler.x) + Math.abs(euler.z);

    // Check if tipped over
    if (tiltAngle > tipThreshold && !hasTipped.current) {
      hasTipped.current = true;
      onTipOver?.();

      // Trigger kickout after a short delay
      kickoutTimer.current = setTimeout(() => {
        if (rigidBodyRef.current) {
          // Apply kickout impulse
          rigidBodyRef.current.applyImpulse(
            { x: kickoutForce[0], y: kickoutForce[1], z: kickoutForce[2] },
            true
          );
          onKickout?.();
        }
      }, 500); // 500ms delay before kickout
    }

    // Reset tip detection when car is back on ground
    if (tiltAngle < tipThreshold * 0.5) {
      hasTipped.current = false;
    }
  });

  // Cleanup timer on unmount
  if (kickoutTimer.current) {
    clearTimeout(kickoutTimer.current);
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      position={position}
      rotation={[0, rotation, 0]}
      colliders="hull"
      mass={mass}
      linearDamping={0.1}
      angularDamping={0.2}
      friction={lateralFriction}
      restitution={restitution}
      enabledRotations={[true, true, true]}
      // @ts-ignore - Rapier supports centerOfMass as prop
      centerOfMass={[0, centerOfMassY, 0]}
    >
      {children}
    </RigidBody>
  );
}

// Space environment floor with configurable friction
interface SpaceFloorProps {
  position?: [number, number, number];
  friction?: number;
  restitution?: number;
  size?: [number, number, number];
}

export function SpaceFloor({
  position = [0, -3, 0],
  friction = 1.5,
  restitution = 0.1,
  size = [100, 0.1, 100],
}: SpaceFloorProps) {
  return (
    <RigidBody type="fixed" position={position} friction={friction} restitution={restitution}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0], size[2]]} />
        <meshStandardMaterial
          color="#0a0a1a"
          metalness={0.9}
          roughness={0.1}
          emissive="#00f0ff"
          emissiveIntensity={0.02}
        />
      </mesh>
    </RigidBody>
  );
}