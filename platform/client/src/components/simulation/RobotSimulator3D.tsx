/**
 * RobotSimulator3D - 3D robot visualization for real-time Blockly execution
 *
 * Provides smooth robot animation with direct position control.
 * Includes ESP32 robot twin features: motor simulation, sensor visualization,
 * battery/WiFi status indicators, and real robot mirror mode.
 *
 * Physics-enhanced mode with Rapier for realistic movement, acceleration,
 * collision detection, and momentum effects.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useRobotPOV, POVConnectionState } from '../../hooks/useRobotPOV';

interface Obstacle {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
}

interface RobotSimulator3DProps {
  commands: Array<{ type: string; params?: Record<string, unknown> }>;
  isRunning: boolean;
  onCommandComplete?: (index: number) => void;
  onAllComplete?: () => void;
  showGrid?: boolean;
  /** Enable ESP32 robot twin mode - mirrors real robot via POV connection */
  enableRobotTwin?: boolean;
  /** ESP32-CAM server URL for POV connection */
  povServerUrl?: string;
  /** Simulated battery level (0-100), auto-reduces during use */
  initialBatteryLevel?: number;
  /** Custom obstacles for collision testing */
  obstacles?: Obstacle[];
  /** Enable physics engine (acceleration, collision, momentum) */
  enablePhysics?: boolean;
}

interface RobotState {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

const INITIAL_POSITION: RobotState = { x: 0, y: 0, z: 0 };
const MOVE_SPEED = 3; // units per second
const TURN_SPEED = Math.PI; // radians per second

// Physics constants
const ROBOT_MASS = 1;
const LINEAR_DAMPING = 2.5; // Friction/drag
const ANGULAR_DAMPING = 5.0; // Rotational drag
const ACCELERATION_FORCE = 15; // Force applied for movement
const TURN_TORQUE = 8; // Torque for turning

/**
 * PhysicsRobot - Robot mesh that uses Rapier RigidBody for movement
 * This replaces direct position control with physics-based forces
 */
function PhysicsRobot({
  currentCommand,
  wheelRotation,
  showUltrasonicRay,
  ultrasonicDistance,
  lineFollowLeft,
  lineFollowRight,
  onCollision,
}: {
  currentCommand: string | null;
  wheelRotation: number;
  showUltrasonicRay?: boolean;
  ultrasonicDistance?: number;
  lineFollowLeft?: boolean;
  lineFollowRight?: boolean;
  onCollision?: (obstacleId: string) => void;
}) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const leftWheelRef = useRef<THREE.Group>(null);
  const rightWheelRef = useRef<THREE.Group>(null);
  const backWheelRef = useRef<THREE.Group>(null);
  const ultrasonicRayRef = useRef<THREE.Mesh>(null);
  const [armPhase, setArmPhase] = useState(0);
  const isAnimating = currentCommand === 'wave' || currentCommand === 'dance';
  const lastCommandRef = useRef<string | null>(null);

  // Animate arms for wave/dance commands
  useEffect(() => {
    if (!isAnimating) {
      setArmPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setArmPhase(prev => prev + 0.2);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Apply forces based on current command
  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;
    const body = rigidBodyRef.current;

    // Only apply new forces when command changes
    if (currentCommand !== lastCommandRef.current) {
      lastCommandRef.current = currentCommand;

      const currentRotation = body.rotation();
      const forwardDir = {
        x: Math.sin(currentRotation.y),
        z: -Math.cos(currentRotation.y)
      };

      switch (currentCommand) {
        case 'move_forward': {
          // Apply force in forward direction
          body.applyImpulse({
            x: forwardDir.x * ACCELERATION_FORCE * delta,
            y: 0,
            z: forwardDir.z * ACCELERATION_FORCE * delta
          }, true);
          break;
        }
        case 'move_backward': {
          body.applyImpulse({
            x: -forwardDir.x * ACCELERATION_FORCE * delta,
            y: 0,
            z: -forwardDir.z * ACCELERATION_FORCE * delta
          }, true);
          break;
        }
        case 'turn_left': {
          body.applyTorqueImpulse({ x: 0, y: TURN_TORQUE * delta, z: 0 }, true);
          break;
        }
        case 'turn_right': {
          body.applyTorqueImpulse({ x: 0, y: -TURN_TORQUE * delta, z: 0 }, true);
          break;
        }
      }
    }

    // Animate arms
    if (rightArmRef.current && leftArmRef.current) {
      const armAngle = isAnimating ? Math.sin(armPhase) * 0.5 : 0;
      rightArmRef.current.rotation.z = armAngle;
      leftArmRef.current.rotation.z = -armAngle;
    }

    // Rotate wheels based on movement
    if (leftWheelRef.current && rightWheelRef.current && backWheelRef.current) {
      leftWheelRef.current.rotation.x = wheelRotation;
      rightWheelRef.current.rotation.x = wheelRotation;
      backWheelRef.current.rotation.x = wheelRotation;
    }

    // Update ultrasonic ray
    if (ultrasonicRayRef.current) {
      const rayLength = showUltrasonicRay ? (ultrasonicDistance || 5) : 0;
      ultrasonicRayRef.current.scale.y = rayLength;
      (ultrasonicRayRef.current.material as THREE.MeshBasicMaterial).opacity = showUltrasonicRay ? 0.5 : 0;
    }
  });

  // Get current rotation from rigid body for wheel direction
  const rigidBodyRotation = useCallback(() => {
    if (!rigidBodyRef.current) return { y: 0 };
    const rot = rigidBodyRef.current.rotation();
    return rot;
  }, []);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[0, 0.15, 0]}
      colliders={false}
      mass={ROBOT_MASS}
      linearDamping={LINEAR_DAMPING}
      angularDamping={ANGULAR_DAMPING}
      lockRotations={false}
      enabledRotations={[false, true, false]}
      onCollisionEnter={(e) => {
        if (e.other.rigidBodyObject?.name) {
          onCollision?.(e.other.rigidBodyObject.name);
        }
      }}
    >
      <CuboidCollider args={[0.35, 0.15, 0.25]} name="robotBody" />

      {/* Robot Mesh - uses RigidBody transform */}
      <group>
        {/* ESP32 Robot Body */}
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.3, 0.5]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* ESP32 Dev Board */}
        <mesh castShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[0.4, 0.1, 0.3]} />
          <meshStandardMaterial color="#2d5a27" metalness={0.3} roughness={0.7} />
        </mesh>

        {/* LEDs */}
        <mesh position={[0.12, 0.28, 0.05]}>
          <boxGeometry args={[0.04, 0.04, 0.02]} />
          <meshStandardMaterial
            color={currentCommand ? "#ff5722" : "#4CAF50"}
            emissive={currentCommand ? "#ff5722" : "#4CAF50"}
            emissiveIntensity={1}
          />
        </mesh>
        <mesh position={[0.04, 0.28, 0.05]}>
          <boxGeometry args={[0.04, 0.04, 0.02]} />
          <meshStandardMaterial color="#2196F3" emissive="#2196F3" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[-0.04, 0.28, 0.05]}>
          <boxGeometry args={[0.04, 0.04, 0.02]} />
          <meshStandardMaterial
            color={showUltrasonicRay ? "#ffeb3b" : "#666"}
            emissive={showUltrasonicRay ? "#ffeb3b" : "#666"}
            emissiveIntensity={showUltrasonicRay ? 1 : 0.3}
          />
        </mesh>

        {/* Ultrasonic Sensor */}
        <mesh castShadow position={[0, 0.05, 0.28]}>
          <boxGeometry args={[0.2, 0.1, 0.05]} />
          <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.06, 0.05, 0.31]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 8]} />
          <meshStandardMaterial color="#silver" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[-0.06, 0.05, 0.31]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 8]} />
          <meshStandardMaterial color="#gold" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh
          ref={ultrasonicRayRef}
          position={[0, 0.05, 0.31]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
          <meshBasicMaterial color="#ffeb3b" transparent opacity={0} />
        </mesh>

        {/* Line-follow sensors */}
        <group position={[0, -0.16, 0.15]}>
          <mesh>
            <boxGeometry args={[0.06, 0.02, 0.04]} />
            <meshStandardMaterial
              color={lineFollowLeft ? "#4CAF50" : "#333"}
              emissive={lineFollowLeft ? "#4CAF50" : "#000"}
              emissiveIntensity={lineFollowLeft ? 0.8 : 0}
            />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[0.06, 0.02, 0.04]} />
            <meshStandardMaterial
              color={lineFollowLeft && lineFollowRight ? "#4CAF50" : "#333"}
              emissive={lineFollowLeft && lineFollowRight ? "#4CAF50" : "#000"}
              emissiveIntensity={lineFollowLeft && lineFollowRight ? 0.8 : 0}
            />
          </mesh>
          <mesh position={[0, 0, 0.12]}>
            <boxGeometry args={[0.06, 0.02, 0.04]} />
            <meshStandardMaterial
              color={lineFollowRight ? "#4CAF50" : "#333"}
              emissive={lineFollowRight ? "#4CAF50" : "#000"}
              emissiveIntensity={lineFollowRight ? 0.8 : 0}
            />
          </mesh>
        </group>

        {/* Wheels */}
        <group ref={leftWheelRef} position={[-0.3, -0.15, 0.28]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
            <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
            <meshStandardMaterial color="#4CAF50" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
        <group ref={rightWheelRef} position={[0.3, -0.15, 0.28]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
            <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
            <meshStandardMaterial color="#4CAF50" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
        <group ref={backWheelRef} position={[0, -0.15, -0.28]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.06, 16]} />
            <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>

        {/* Arms */}
        <group ref={rightArmRef} position={[0.42, 0, 0]}>
          <mesh castShadow position={[0.1, 0, 0]}>
            <boxGeometry args={[0.2, 0.08, 0.08]} />
            <meshStandardMaterial color="#388E3C" metalness={0.3} roughness={0.7} />
          </mesh>
          <mesh position={[0.18, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
            <meshStandardMaterial color="#silver" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
        <group ref={leftArmRef} position={[-0.42, 0, 0]}>
          <mesh castShadow position={[-0.1, 0, 0]}>
            <boxGeometry args={[0.2, 0.08, 0.08]} />
            <meshStandardMaterial color="#388E3C" metalness={0.3} roughness={0.7} />
          </mesh>
          <mesh position={[-0.18, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
            <meshStandardMaterial color="#silver" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>

        {/* Direction arrow */}
        <mesh position={[0, 0, 0.3]}>
          <coneGeometry args={[0.06, 0.1, 3]} />
          <meshStandardMaterial color="#ff5722" emissive="#ff5722" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </RigidBody>
  );
}

/**
 * Obstacle mesh with physics collider
 */
function ObstacleMesh({ obstacle }: { obstacle: Obstacle }) {
  return (
    <RigidBody type="fixed" position={obstacle.position} colliders={false} name={obstacle.id}>
      <CuboidCollider args={[obstacle.size[0] / 2, obstacle.size[1] / 2, obstacle.size[2] / 2]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={obstacle.size} />
        <meshStandardMaterial
          color="#8B4513"
          metalness={0.2}
          roughness={0.8}
          emissive="#4a2500"
          emissiveIntensity={0.1}
        />
      </mesh>
    </RigidBody>
  );
}

/**
 * Robot mesh with LED indicator, arm animation, motor simulation,
 * and ESP32 sensor visualizations
 */
function RobotMesh({
  position,
  rotation,
  currentCommand,
  wheelRotation,
  showUltrasonicRay,
  ultrasonicDistance,
  lineFollowLeft,
  lineFollowRight,
}: {
  position: [number, number, number];
  rotation: number;
  currentCommand: string | null;
  wheelRotation: number;
  showUltrasonicRay?: boolean;
  ultrasonicDistance?: number;
  lineFollowLeft?: boolean;
  lineFollowRight?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const leftWheelRef = useRef<THREE.Group>(null);
  const rightWheelRef = useRef<THREE.Group>(null);
  const backWheelRef = useRef<THREE.Group>(null);
  const ultrasonicRayRef = useRef<THREE.Mesh>(null);
  const [armPhase, setArmPhase] = useState(0);
  const isAnimating = currentCommand === 'wave' || currentCommand === 'dance';

  // Animate arms for wave/dance commands
  useEffect(() => {
    if (!isAnimating) {
      setArmPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setArmPhase(prev => prev + 0.2);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...position);
      groupRef.current.rotation.y = rotation;
    }
    if (rightArmRef.current && leftArmRef.current) {
      const armAngle = isAnimating ? Math.sin(armPhase) * 0.5 : 0;
      rightArmRef.current.rotation.z = armAngle;
      leftArmRef.current.rotation.z = -armAngle;
    }
    // Rotate wheels based on movement
    if (leftWheelRef.current && rightWheelRef.current && backWheelRef.current) {
      leftWheelRef.current.rotation.x = wheelRotation;
      rightWheelRef.current.rotation.x = wheelRotation;
      backWheelRef.current.rotation.x = wheelRotation;
    }
    // Update ultrasonic ray visibility and length
    if (ultrasonicRayRef.current) {
      const rayLength = showUltrasonicRay ? (ultrasonicDistance || 5) : 0;
      ultrasonicRayRef.current.scale.y = rayLength;
      (ultrasonicRayRef.current.material as THREE.MeshBasicMaterial).opacity = showUltrasonicRay ? 0.5 : 0;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* ESP32 Robot Body - more compact rectangular design */}
      <mesh castShadow>
        <boxGeometry args={[0.7, 0.3, 0.5]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* ESP32 Dev Board Module on top */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[0.4, 0.1, 0.3]} />
        <meshStandardMaterial color="#2d5a27" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* ESP32 indicator LEDs */}
      <mesh position={[0.12, 0.28, 0.05]}>
        <boxGeometry args={[0.04, 0.04, 0.02]} />
        <meshStandardMaterial
          color={currentCommand ? "#ff5722" : "#4CAF50"}
          emissive={currentCommand ? "#ff5722" : "#4CAF50"}
          emissiveIntensity={1}
        />
      </mesh>
      <mesh position={[0.04, 0.28, 0.05]}>
        <boxGeometry args={[0.04, 0.04, 0.02]} />
        <meshStandardMaterial color="#2196F3" emissive="#2196F3" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-0.04, 0.28, 0.05]}>
        <boxGeometry args={[0.04, 0.04, 0.02]} />
        <meshStandardMaterial
          color={showUltrasonicRay ? "#ffeb3b" : "#666"}
          emissive={showUltrasonicRay ? "#ffeb3b" : "#666"}
          emissiveIntensity={showUltrasonicRay ? 1 : 0.3}
        />
      </mesh>

      {/* Ultrasonic Sensor (HC-SR04) on front */}
      <mesh castShadow position={[0, 0.05, 0.28]}>
        <boxGeometry args={[0.2, 0.1, 0.05]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Ultrasonic transmitter (TX) */}
      <mesh position={[0.06, 0.05, 0.31]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 8]} />
        <meshStandardMaterial color="#silver" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Ultrasonic receiver (RX) */}
      <mesh position={[-0.06, 0.05, 0.31]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 8]} />
        <meshStandardMaterial color="#gold" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Ultrasonic distance ray (visualization) */}
      <mesh
        ref={ultrasonicRayRef}
        position={[0, 0.05, 0.31]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
        <meshBasicMaterial color="#ffeb3b" transparent opacity={0} />
      </mesh>

      {/* Line-follow sensor array (underneath front) */}
      <group position={[0, -0.16, 0.15]}>
        {/* Left infrared sensor */}
        <mesh>
          <boxGeometry args={[0.06, 0.02, 0.04]} />
          <meshStandardMaterial
            color={lineFollowLeft ? "#4CAF50" : "#333"}
            emissive={lineFollowLeft ? "#4CAF50" : "#000"}
            emissiveIntensity={lineFollowLeft ? 0.8 : 0}
          />
        </mesh>
        {/* Center infrared sensor */}
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[0.06, 0.02, 0.04]} />
          <meshStandardMaterial
            color={lineFollowLeft && lineFollowRight ? "#4CAF50" : "#333"}
            emissive={lineFollowLeft && lineFollowRight ? "#4CAF50" : "#000"}
            emissiveIntensity={lineFollowLeft && lineFollowRight ? 0.8 : 0}
          />
        </mesh>
        {/* Right infrared sensor */}
        <mesh position={[0, 0, 0.12]}>
          <boxGeometry args={[0.06, 0.02, 0.04]} />
          <meshStandardMaterial
            color={lineFollowRight ? "#4CAF50" : "#333"}
            emissive={lineFollowRight ? "#4CAF50" : "#000"}
            emissiveIntensity={lineFollowRight ? 0.8 : 0}
          />
        </mesh>
      </group>

      {/* Wheels with motor animation refs */}
      <group ref={leftWheelRef} position={[-0.3, -0.15, 0.28]} rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
          <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Wheel hub */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
          <meshStandardMaterial color="#4CAF50" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
      <group ref={rightWheelRef} position={[0.3, -0.15, 0.28]} rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
          <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
          <meshStandardMaterial color="#4CAF50" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
      <group ref={backWheelRef} position={[0, -0.15, -0.28]} rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 16]} />
          <meshStandardMaterial color="#222" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Arms */}
      <group ref={rightArmRef} position={[0.42, 0, 0]}>
        <mesh castShadow position={[0.1, 0, 0]}>
          <boxGeometry args={[0.2, 0.08, 0.08]} />
          <meshStandardMaterial color="#388E3C" metalness={0.3} roughness={0.7} />
        </mesh>
        {/* Servo motor joint */}
        <mesh position={[0.18, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
          <meshStandardMaterial color="#silver" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      <group ref={leftArmRef} position={[-0.42, 0, 0]}>
        <mesh castShadow position={[-0.1, 0, 0]}>
          <boxGeometry args={[0.2, 0.08, 0.08]} />
          <meshStandardMaterial color="#388E3C" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[-0.18, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
          <meshStandardMaterial color="#silver" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Direction indicator (front arrow) */}
      <mesh position={[0, 0, 0.3]}>
        <coneGeometry args={[0.06, 0.1, 3]} />
        <meshStandardMaterial color="#ff5722" emissive="#ff5722" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/**
 * Path line showing robot's movement trail
 */
function RobotTrail({ positions }: { positions: [number, number, number][] }) {
  if (positions.length < 2) return null;

  const points = positions.map(p => new THREE.Vector3(p[0], 0.02, p[2]));
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color="#4CAF50" transparent opacity={0.4} linewidth={2} />
    </line>
  );
}

/**
 * Main RobotSimulator3D component
 */
export default function RobotSimulator3D({
  commands,
  isRunning,
  onCommandComplete,
  onAllComplete,
  showGrid = true,
  enableRobotTwin = false,
  povServerUrl,
  initialBatteryLevel = 100,
  obstacles = [],
  enablePhysics = false,
}: RobotSimulator3DProps) {
  const [robotState, setRobotState] = useState<RobotState>(INITIAL_POSITION);
  const [targetState, setTargetState] = useState<RobotState>(INITIAL_POSITION);
  const [currentCommandIndex, setCurrentCommandIndex] = useState(0);
  const [currentCommand, setCurrentCommand] = useState<string | null>(null);
  const [trail, setTrail] = useState<[number, number, number][]>([[0, 0, 0]]);
  const [isComplete, setIsComplete] = useState(false);

  // ESP32 twin state
  const [wheelRotation, setWheelRotation] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(initialBatteryLevel);
  const [showUltrasonicRay, setShowUltrasonicRay] = useState(false);
  const [ultrasonicDistance, setUltrasonicDistance] = useState(5);
  const [lineFollowLeft, setLineFollowLeft] = useState(false);
  const [lineFollowRight, setLineFollowRight] = useState(false);

  // Collision feedback state
  const [lastCollision, setLastCollision] = useState<string | null>(null);
  const collisionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // POV connection for robot twin mode
  const pov = useRobotPOV({
    serverUrl: povServerUrl,
    autoConnect: enableRobotTwin && !!povServerUrl,
  });

  // Drain battery during use
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setBatteryLevel(prev => Math.max(0, prev - 0.1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const commandStartTimeRef = useRef<number>(0);
  const commandStartStateRef = useRef<RobotState>(INITIAL_POSITION);
  const animationFrameRef = useRef<number>(0);

  // Reset when commands change
  useEffect(() => {
    setRobotState(INITIAL_POSITION);
    setTargetState(INITIAL_POSITION);
    setCurrentCommandIndex(0);
    setCurrentCommand(null);
    setTrail([[0, 0, 0]]);
    setIsComplete(false);
    commandStartTimeRef.current = 0;
    commandStartStateRef.current = { ...INITIAL_POSITION };
  }, [commands]);

  // Handle animation frame
  useFrame((state, delta) => {
    if (!isRunning || isComplete || currentCommandIndex >= commands.length) return;

    const command = commands[currentCommandIndex];
    if (!command) return;

    // Initialize command execution
    if (!currentCommand) {
      setCurrentCommand(command.type);
      commandStartTimeRef.current = 0;
      commandStartStateRef.current = { ...robotState };
    }

    commandStartTimeRef.current += delta;
    const elapsed = commandStartTimeRef.current;

    // Calculate movement based on command type
    const speed = MOVE_SPEED;
    const turnSpeed = TURN_SPEED;
    let newState = { ...commandStartStateRef.current };
    let completed = false;

    switch (command.type) {
      case 'move_forward': {
        const steps = (command.params?.steps as number) || 1;
        const duration = (steps * 1) / speed; // 1 second per step
        const t = Math.min(elapsed / duration, 1);
        const moveAmount = speed * delta * steps;
        newState.x += Math.cos(robotState.rotation) * moveAmount;
        newState.z -= Math.sin(robotState.rotation) * moveAmount;
        setWheelRotation(prev => prev + moveAmount * 5); // Rotate wheels with movement
        completed = t >= 1;
        break;
      }
      case 'move_backward': {
        const steps = (command.params?.steps as number) || 1;
        const moveAmount = speed * delta * steps;
        newState.x -= Math.cos(robotState.rotation) * moveAmount;
        newState.z += Math.sin(robotState.rotation) * moveAmount;
        setWheelRotation(prev => prev - moveAmount * 5);
        completed = true; // Complete in one frame for smoother feel
        break;
      }
      case 'turn_left': {
        const degrees = (command.params?.degrees as number) || 90;
        const targetRotation = commandStartStateRef.current.rotation + (degrees * Math.PI) / 180;
        const turnAmount = turnSpeed * delta * (degrees / 90);
        newState.rotation += turnAmount;
        setWheelRotation(prev => prev + turnAmount * 0.3); // Slight wheel spin during turns
        if (newState.rotation >= targetRotation) {
          newState.rotation = targetRotation;
          completed = true;
        }
        break;
      }
      case 'turn_right': {
        const degrees = (command.params?.degrees as number) || 90;
        const targetRotation = commandStartStateRef.current.rotation - (degrees * Math.PI) / 180;
        const turnAmount = turnSpeed * delta * (degrees / 90);
        newState.rotation -= turnAmount;
        setWheelRotation(prev => prev - turnAmount * 0.3);
        if (newState.rotation <= targetRotation) {
          newState.rotation = targetRotation;
          completed = true;
        }
        break;
      }
      case 'wait': {
        const seconds = (command.params?.seconds as number) || 1;
        completed = elapsed >= seconds;
        break;
      }
      case 'jump': {
        // Jump animation: up then down
        const jumpDuration = 0.5;
        const t = elapsed / jumpDuration;
        if (t < 1) {
          newState.y = Math.sin(t * Math.PI) * 1; // Arc up then down
        } else {
          newState.y = 0;
          completed = true;
        }
        break;
      }
      case 'dance':
      case 'wave':
        // These complete immediately, animation is visual
        completed = true;
        break;
      // Sensor commands - trigger sensor visualizations
      case 'get_distance':
        // Show ultrasonic sensor reading
        setShowUltrasonicRay(true);
        setUltrasonicDistance(3 + Math.random() * 4); // Simulate 3-7cm distance
        setTimeout(() => setShowUltrasonicRay(false), 500);
        completed = true;
        break;
      case 'get_light_level':
        // No visualization needed for light level
        completed = true;
        break;
      case 'get_camera_light':
        completed = true;
        break;
      case 'line_tracker':
        // Simulate line detection
        const rand = Math.random();
        setLineFollowLeft(rand > 0.5);
        setLineFollowRight(rand > 0.3);
        setTimeout(() => {
          setLineFollowLeft(false);
          setLineFollowRight(false);
        }, 300);
        completed = true;
        break;
      case 'led_on':
      case 'led_off':
      case 'play_note':
      case 'set_speed':
      case 'set_variable':
      case 'get_variable':
      case 'math_operation':
      case 'repeat':
      case 'if_sensor':
        completed = true;
        break;
      default:
        completed = true;
    }

    // Smooth interpolation for position
    const lerpFactor = Math.min(delta * 10, 1); // Smooth but responsive
    setRobotState({
      x: newState.x,
      y: newState.y,
      z: newState.z,
      rotation: newState.rotation
    });

    // Update trail
    setTrail(prev => {
      const newTrail = [...prev];
      const lastPoint = newTrail[newTrail.length - 1];
      if (Math.abs(newState.x - lastPoint[0]) > 0.1 || Math.abs(newState.z - lastPoint[2]) > 0.1) {
        newTrail.push([newState.x, 0, newState.z]);
        if (newTrail.length > 100) newTrail.shift(); // Limit trail length
      }
      return newTrail;
    });

    // Handle command completion
    if (completed) {
      onCommandComplete?.(currentCommandIndex);
      setCurrentCommand(null);
      commandStartTimeRef.current = 0;
      commandStartStateRef.current = { ...newState };

      const nextIndex = currentCommandIndex + 1;
      if (nextIndex >= commands.length) {
        setIsComplete(true);
        onAllComplete?.();
      } else {
        setCurrentCommandIndex(nextIndex);
      }
    }
  });

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle collision event from physics robot
  const handleCollision = useCallback((obstacleId: string) => {
    setLastCollision(obstacleId);
    if (collisionTimeoutRef.current) {
      clearTimeout(collisionTimeoutRef.current);
    }
    collisionTimeoutRef.current = setTimeout(() => setLastCollision(null), 500);
  }, []);

  // Scene content - either physics or standard
  const renderSceneContent = () => (
    <>
      <PerspectiveCamera makeDefault position={[6, 6, 6]} fov={50} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={20}
        target={[0, 0, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.4} color="#4CAF50" />
      <pointLight position={[5, 3, 5]} intensity={0.3} color="#81C784" />

      {/* Ground */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Grid overlay */}
      {showGrid && (
        <Grid
          position={[0, 0.01, 0]}
          args={[30, 30]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#333366"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#4444aa"
          fadeDistance={25}
          fadeStrength={1}
          infiniteGrid={false}
        />
      )}

      {/* Robot trail (non-physics mode only) */}
      {!enablePhysics && <RobotTrail positions={trail} />}

      {/* Robot - use PhysicsRobot in physics mode, RobotMesh otherwise */}
      {enablePhysics ? (
        <PhysicsRobot
          currentCommand={currentCommand}
          wheelRotation={wheelRotation}
          showUltrasonicRay={showUltrasonicRay}
          ultrasonicDistance={ultrasonicDistance}
          lineFollowLeft={lineFollowLeft}
          lineFollowRight={lineFollowRight}
          onCollision={handleCollision}
        />
      ) : (
        <RobotMesh
          position={[robotState.x, robotState.y, robotState.z]}
          rotation={robotState.rotation}
          currentCommand={currentCommand}
          wheelRotation={wheelRotation}
          showUltrasonicRay={showUltrasonicRay}
          ultrasonicDistance={ultrasonicDistance}
          lineFollowLeft={lineFollowLeft}
          lineFollowRight={lineFollowRight}
        />
      )}

      {/* Obstacles (physics mode only) */}
      {enablePhysics && obstacles.map(obstacle => (
        <ObstacleMesh key={obstacle.id} obstacle={obstacle} />
      ))}

      {/* Physics ground plane (invisible collider) */}
      {enablePhysics && (
        <RigidBody type="fixed" position={[0, -0.01, 0]} colliders={false}>
          <CuboidCollider args={[15, 0.01, 15]} />
        </RigidBody>
      )}

      {/* Start marker */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshBasicMaterial color="#4CAF50" transparent opacity={0.5} />
      </mesh>
    </>
  );

  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)', position: 'relative' }}>
      <Canvas shadows>
        {enablePhysics ? (
          <Physics gravity={[0, -9.81, 0]} debug={false}>
            {renderSceneContent()}
          </Physics>
        ) : (
          renderSceneContent()
        )}
      </Canvas>

      {/* Status overlay */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        background: 'rgba(0,0,0,0.85)',
        padding: '12px 16px',
        borderRadius: 12,
        color: 'white',
        fontFamily: "'Courier New', monospace",
        fontSize: 12,
        border: '1px solid rgba(76, 175, 80, 0.5)',
        boxShadow: '0 0 20px rgba(76, 175, 80, 0.2)',
        minWidth: 180
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: isRunning ? '#22c55e' : (isComplete ? '#fbbf24' : '#666')
          }} />
          <span style={{ color: '#aaa' }}>
            {isRunning ? 'ĐANG CHẠY' : (isComplete ? 'HOÀN THÀNH' : 'SẴN SÀNG')}
          </span>
        </div>
        <div style={{ color: '#ccc' }}>
          Lệnh: <span style={{ color: '#4CAF50' }}>{currentCommandIndex + 1}</span> / <span style={{ color: '#aaa' }}>{commands.length}</span>
        </div>
        {currentCommand && (
          <div style={{ color: '#ff5722', marginTop: 4 }}>
            ▶ {currentCommand}
          </div>
        )}
        <div style={{ color: '#666', fontSize: 10, marginTop: 4 }}>
          Vị trí: ({robotState.x.toFixed(1)}, {robotState.z.toFixed(1)}) | Góc: {(robotState.rotation * 180 / Math.PI).toFixed(0)}°
        </div>
      </div>

      {/* ESP32 Robot Twin Status Panel */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        background: 'rgba(0,0,0,0.85)',
        padding: '12px 16px',
        borderRadius: 12,
        color: 'white',
        fontFamily: "'Courier New', monospace",
        fontSize: 11,
        border: '1px solid rgba(33, 150, 243, 0.5)',
        boxShadow: '0 0 20px rgba(33, 150, 243, 0.2)',
        minWidth: 160
      }}>
        {/* Header */}
        <div style={{ color: '#2196F3', fontWeight: 'bold', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🤖</span> ESP32 Robot Twin
          {enableRobotTwin && <span style={{ fontSize: 9, color: '#4CAF50' }}>● LIVE</span>}
        </div>

        {/* Battery Level */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span>🔋</span>
            <span style={{ color: '#aaa' }}>Pin</span>
            <span style={{
              color: batteryLevel > 50 ? '#4CAF50' : batteryLevel > 20 ? '#ff9800' : '#f44336',
              fontWeight: 'bold'
            }}>
              {batteryLevel.toFixed(0)}%
            </span>
          </div>
          {/* Battery bar */}
          <div style={{
            width: '100%',
            height: 8,
            background: '#333',
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${batteryLevel}%`,
              height: '100%',
              background: batteryLevel > 50 ? '#4CAF50' : batteryLevel > 20 ? '#ff9800' : '#f44336',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* WiFi Status */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📶</span>
            <span style={{ color: '#aaa' }}>WiFi</span>
            <span style={{
              color: pov.connectionState === 'connected' ? '#4CAF50' :
                     pov.connectionState === 'connecting' || pov.connectionState === 'reconnecting' ? '#ff9800' : '#666'
            }}>
              {pov.connectionState === 'connected' ? 'Kết nối' :
               pov.connectionState === 'connecting' ? 'Đang kết nối...' :
               pov.connectionState === 'reconnecting' ? 'Mất kết nối...' :
               pov.connectionState === 'error' ? 'Lỗi!' : 'Chưa kết nối'}
            </span>
          </div>
          {pov.connectionState === 'connected' && pov.latencyMs > 0 && (
            <div style={{ color: '#666', fontSize: 10, marginLeft: 22 }}>
              Độ trễ: {pov.latencyMs}ms
            </div>
          )}
        </div>

        {/* Ultrasonic Sensor */}
        {showUltrasonicRay && (
          <div style={{ marginBottom: 8, color: '#ffeb3b' }}>
            <span>📡</span> Siêu âm: {ultrasonicDistance.toFixed(1)} cm
          </div>
        )}

        {/* Line Follow Sensors */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            color: lineFollowLeft ? '#4CAF50' : '#666'
          }}>
            <span>📷</span>
            <span style={{ fontSize: 10 }}>L{lineFollowLeft ? '●' : '○'}</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            color: lineFollowRight ? '#4CAF50' : '#666'
          }}>
            <span>📷</span>
            <span style={{ fontSize: 10 }}>R{lineFollowRight ? '●' : '○'}</span>
          </div>
          <span style={{ color: '#666', fontSize: 10 }}>Line</span>
        </div>

        {/* POV Video Indicator */}
        {pov.videoStream && pov.isStreaming && (
          <div style={{
            marginTop: 8,
            padding: '4px 8px',
            background: 'rgba(76, 175, 80, 0.2)',
            borderRadius: 4,
            color: '#4CAF50',
            fontSize: 10,
            textAlign: 'center'
          }}>
            📹 Camera đang phát
          </div>
        )}

        {/* Physics Mode Indicator */}
        {enablePhysics && (
          <div style={{
            marginTop: 8,
            padding: '4px 8px',
            background: lastCollision ? 'rgba(244, 67, 54, 0.3)' : 'rgba(156, 39, 176, 0.2)',
            borderRadius: 4,
            color: lastCollision ? '#f44336' : '#9C27B0',
            fontSize: 10,
            textAlign: 'center',
            border: `1px solid ${lastCollision ? '#f44336' : '#9C27B0'}`,
            transition: 'all 0.2s ease'
          }}>
            {lastCollision ? `💥 Va chạm: ${lastCollision}` : '⚡ Vật lý: Bật'}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        top: (enableRobotTwin || enablePhysics) ? 240 : 16,
        right: 16,
        background: 'rgba(0,0,0,0.7)',
        padding: 12,
        borderRadius: 8,
        color: 'white',
        fontSize: 10,
        fontFamily: "'Courier New', monospace"
      }}>
        <div style={{ color: '#4CAF50', marginBottom: 4 }}>🎮 Điều khiển:</div>
        <div>🖱️ Kéo: Xoay camera</div>
        <div>🖱️ Cuộn: Zoom</div>
        <div>🖱️ Phải: Di chuyển</div>
        {enableRobotTwin && (
          <>
            <div style={{ color: '#2196F3', marginTop: 8, marginBottom: 4 }}>🤖 Robot Twin:</div>
            <div style={{ color: '#aaa' }}>Kết nối ESP32-CAM</div>
          </>
        )}
        {enablePhysics && (
          <>
            <div style={{ color: '#9C27B0', marginTop: 8, marginBottom: 4 }}>⚡ Vật lý:</div>
            <div style={{ color: '#aaa' }}>Gia tốc, Va chạm</div>
            <div style={{ color: '#666' }}>🔲 Vật cản: {obstacles.length}</div>
          </>
        )}
      </div>
    </div>
  );
}