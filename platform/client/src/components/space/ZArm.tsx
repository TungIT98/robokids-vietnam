import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';

// FABRIK IK Configuration
interface IKChain {
  name: string;
  length: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  radius: number;
}

interface FABRIKJoint {
  position: THREE.Vector3;
  length: number;
}

// FABRIK IK Solver - Forward And Backward Reaching Inverse Kinematics
function solveFABRIK(
  joints: FABRIKJoint[],
  target: THREE.Vector3,
  basePosition: THREE.Vector3,
  maxIterations: number = 10,
  tolerance: number = 0.01
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = joints.map(j => j.position.clone());
  const totalLength = joints.reduce((sum, j) => sum + j.length, 0);

  const distToTarget = basePosition.distanceTo(target);

  // If target is unreachable
  if (distToTarget >= totalLength) {
    // Stretch toward target
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const dir = target.clone().sub(prev).normalize();
      positions[i] = prev.clone().add(dir.multiplyScalar(joints[i - 1].length));
    }
    return positions;
  }

  // Iteratively solve
  for (let iter = 0; iter < maxIterations; iter++) {
    // Backward pass - from end effector to base
    positions[positions.length - 1] = target.clone();
    for (let i = positions.length - 2; i >= 0; i--) {
      const dir = positions[i].clone().sub(positions[i + 1]).normalize();
      positions[i] = positions[i + 1].clone().add(dir.multiplyScalar(joints[i].length));
    }

    // Forward pass - from base to end effector
    positions[0] = basePosition.clone();
    for (let i = 1; i < positions.length; i++) {
      const dir = positions[i].clone().sub(positions[i - 1]).normalize();
      positions[i] = positions[i - 1].clone().add(dir.multiplyScalar(joints[i - 1].length));
    }

    // Check convergence
    if (positions[positions.length - 1].distanceTo(target) < tolerance) {
      break;
    }
  }

  return positions;
}

// Z-Arm segment component
interface ZArmSegmentProps {
  length: number;
  radius: number;
  color: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

function ZArmSegment({ length, radius, color, position, rotation }: ZArmSegmentProps) {
  return (
    <mesh position={position} rotation={rotation}>
      <capsuleGeometry args={[radius, length - radius * 2, 8, 16]} />
      <meshStandardMaterial
        color={color}
        metalness={0.7}
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

// Z-Arm joint component
interface ZArmJointProps {
  radius: number;
  position: THREE.Vector3;
  color: string;
}

function ZArmJoint({ radius, position, color }: ZArmJointProps) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={0.2}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

// Z-Arm gripper component
interface ZArmGripperProps {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  isOpen: boolean;
  onGrip?: () => void;
}

function ZArmGripper({ position, rotation, isOpen, onGrip }: ZArmGripperProps) {
  const leftRef = useRef<THREE.Mesh>(null);
  const rightRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (leftRef.current && rightRef.current) {
      const openAngle = isOpen ? 0.3 : 0;
      leftRef.current.rotation.z = openAngle;
      rightRef.current.rotation.z = -openAngle;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Gripper base */}
      <mesh>
        <boxGeometry args={[0.15, 0.1, 0.1]} />
        <meshStandardMaterial color="#ff6b35" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Left finger */}
      <mesh ref={leftRef} position={[-0.1, -0.05, 0]}>
        <boxGeometry args={[0.15, 0.05, 0.05]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Right finger */}
      <mesh ref={rightRef} position={[0.1, -0.05, 0]}>
        <boxGeometry args={[0.15, 0.05, 0.05]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Grip indicator */}
      <mesh
        position={[0, -0.1, 0]}
        onClick={onGrip}
        visible={false}
      >
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

export interface ZArmProps {
  position?: [number, number, number];
  baseRadius?: number;
  segmentLengths?: number[];
  segmentRadii?: number[];
  baseColor?: string;
  segmentColor?: string;
  jointColor?: string;
  gripperColor?: string;
  onTargetReached?: (position: THREE.Vector3) => void;
  targetTemplate?: 'pick' | 'place' | 'follow';
  targetPosition?: THREE.Vector3;
  isEnabled?: boolean;
}

// Main Z-Arm component with FABRIK IK
export default function ZArm({
  position = [0, 0, 0],
  baseRadius = 0.3,
  segmentLengths = [1.5, 1.2, 0.8],
  segmentRadii = [0.15, 0.12, 0.1],
  baseColor = '#3498db',
  segmentColor = '#4a5568',
  jointColor = '#00f0ff',
  gripperColor = '#ff6b35',
  onTargetReached,
  targetTemplate = 'follow',
  targetPosition,
  isEnabled = true,
}: ZArmProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);

  // IK state
  const [jointPositions, setJointPositions] = useState<THREE.Vector3[]>([]);
  const [gripperOpen, setGripperOpen] = useState(true);
  const [hasGripped, setHasGripped] = useState(false);

  // Base position
  const basePos = useMemo(() => new THREE.Vector3(position[0], position[1], position[2]), [position]);

  // Initialize joint positions
  useEffect(() => {
    const joints: THREE.Vector3[] = [basePos.clone()];
    let cumulativeHeight = 0;
    for (let i = 0; i < segmentLengths.length; i++) {
      cumulativeHeight += segmentLengths[i];
      joints.push(new THREE.Vector3(basePos.x, basePos.y + cumulativeHeight, basePos.z));
    }
    setJointPositions(joints);
  }, [basePos, segmentLengths]);

  // Target for IK
  const [ikTarget, setIkTarget] = useState<THREE.Vector3>(
    targetPosition || new THREE.Vector3(basePos.x + 1, basePos.y + 2, basePos.z)
  );

  // Update target when prop changes
  useEffect(() => {
    if (targetPosition) {
      setIkTarget(targetPosition);
    }
  }, [targetPosition]);

  // FABRIK IK solver
  useFrame(() => {
    if (!isEnabled || jointPositions.length === 0) return;

    // Create joint data for FABRIK
    const joints: FABRIKJoint[] = [];
    for (let i = 0; i < jointPositions.length - 1; i++) {
      joints.push({
        position: jointPositions[i].clone(),
        length: jointPositions[i].distanceTo(jointPositions[i + 1]),
      });
    }

    // Solve FABRIK
    const solved = solveFABRIK(joints, ikTarget, basePos);

    // Calculate segment rotations based on solved positions
    const newPositions = solved;

    // Check if end effector reached target
    if (newPositions[newPositions.length - 1].distanceTo(ikTarget) < 0.1) {
      onTargetReached?.(ikTarget);

      // Auto-grip when close enough
      if (!hasGripped && targetTemplate === 'pick') {
        setGripperOpen(false);
        setHasGripped(true);
      }
    }

    setJointPositions(newPositions);
  });

  // Calculate segment transforms
  const segments = useMemo(() => {
    const result: { pos: THREE.Vector3; rot: THREE.Euler; length: number; radius: number }[] = [];
    for (let i = 0; i < jointPositions.length - 1; i++) {
      const start = jointPositions[i];
      const end = jointPositions[i + 1];
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const dir = end.clone().sub(start);
      const length = dir.length();
      dir.normalize();

      // Calculate rotation to align segment with direction
      const rot = new THREE.Euler();
      rot.x = Math.atan2(-dir.y, Math.sqrt(dir.x * dir.x + dir.z * dir.z));
      rot.y = Math.atan2(dir.x, dir.z);

      result.push({ pos: mid, rot, length, radius: segmentRadii[i] || 0.12 });
    }
    return result;
  }, [jointPositions, segmentRadii]);

  // Target indicator
  const TargetIndicator = () => (
    <mesh
      position={ikTarget.toArray()}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        setIkTarget(e.point);
      }}
    >
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial
        color={gripperColor}
        transparent
        opacity={0.6}
        wireframe
      />
    </mesh>
  );

  return (
    <group ref={groupRef} position={position}>
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[baseRadius, baseRadius * 1.2, 0.2, 16]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.8}
          roughness={0.2}
          emissive={baseColor}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Base ring glow */}
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[baseRadius * 0.8, 0.02, 8, 32]} />
        <meshBasicMaterial
          color={jointColor}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Arm segments */}
      {segments.map((seg, i) => (
        <ZArmSegment
          key={`segment-${i}`}
          length={seg.length}
          radius={seg.radius}
          color={segmentColor}
          position={seg.pos}
          rotation={seg.rot}
        />
      ))}

      {/* Joints */}
      {jointPositions.map((pos, i) => (
        <ZArmJoint
          key={`joint-${i}`}
          radius={segmentRadii[i] ? segmentRadii[i] * 1.2 : 0.15}
          position={pos}
          color={jointColor}
        />
      ))}

      {/* Gripper at end effector */}
      {jointPositions.length > 0 && (
        <ZArmGripper
          position={jointPositions[jointPositions.length - 1]}
          rotation={new THREE.Euler()}
          isOpen={gripperOpen}
          onGrip={() => setGripperOpen(!gripperOpen)}
        />
      )}

      {/* Target indicator */}
      <TargetIndicator />

      {/* IK target control handle */}
      {isEnabled && (
        <Html position={ikTarget.toArray()} center distanceFactor={10}>
          <div
            className="w-6 h-6 rounded-full bg-orange-500/80 border-2 border-white cursor-move flex items-center justify-center"
            style={{ boxShadow: '0 0 10px rgba(255, 107, 53, 0.5)' }}
            title="Drag to move IK target"
          >
            ⚡
          </div>
        </Html>
      )}

      {/* Debug info */}
      {/* <Html position={[0, 4, 0]} center distanceFactor={15}>
        <div className="bg-black/70 text-white text-xs p-2 rounded font-mono">
          <div>Joints: {jointPositions.length}</div>
          <div>Target: {ikTarget.x.toFixed(1)}, {ikTarget.y.toFixed(1)}, {ikTarget.z.toFixed(1)}</div>
          <div>Gripper: {gripperOpen ? 'OPEN' : 'CLOSED'}</div>
        </div>
      </Html> */}
    </group>
  );
}

// Z-Arm with RigidBody physics for pick-and-place
interface PhysicsZArmProps extends ZArmProps {
  friction?: number;
  restitution?: number;
}

export function PhysicsZArm({
  friction = 0.5,
  restitution = 0.1,
  ...props
}: PhysicsZArmProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);

  return (
    <group {...props}>
      {/* Physics-enabled base */}
      <RigidBody
        ref={rigidBodyRef}
        type="fixed"
        position={props.position}
        friction={friction}
        restitution={restitution}
      >
        <ZArm {...props} />
      </RigidBody>
    </group>
  );
}
