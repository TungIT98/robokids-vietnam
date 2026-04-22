/**
 * Enhanced Ultrasonic Sensor with Raycaster Visualization
 *
 * Features:
 * - Trigger pin and Echo pin configuration
 * - 3D raycaster visualization showing ultrasonic beam
 * - Distance reading based on raycasting in 3D scene
 */

import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface UltrasonicConfig {
  triggerPin: number;
  echoPin: number;
  maxDistance: number; // in cm, default 400cm
  coneAngle: number; // beam spread in degrees
}

export interface UltrasonicReading {
  distance: number; // in cm
  timestamp: number;
  hit: boolean;
  hitPoint?: { x: number; y: number; z: number };
}

// Default configuration for HC-SR04 sensor
export const DEFAULT_ULTRASONIC_CONFIG: UltrasonicConfig = {
  triggerPin: 23,
  echoPin: 24,
  maxDistance: 400,
  coneAngle: 30,
};

// Raycaster visualization component
interface UltrasonicVisualizerProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  config: UltrasonicConfig;
  enabled?: boolean;
  onReading?: (reading: UltrasonicReading) => void;
}

export function UltrasonicVisualizer({
  position,
  rotation = [0, 0, 0],
  config,
  enabled = true,
  onReading,
}: UltrasonicVisualizerProps) {
  const { scene, raycaster, camera } = useThree();
  const [beamGeometry, setBeamGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [hitPoint, setHitPoint] = useState<THREE.Vector3 | null>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const targetRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.Line>(null);

  // Cast ray in direction robot is facing
  useFrame(() => {
    if (!enabled) return;

    const origin = new THREE.Vector3(position[0], position[1], position[2]);

    // Direction based on rotation
    const direction = new THREE.Vector3(0, 0, -1);
    const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'YXZ');
    direction.applyEuler(euler);
    direction.normalize();

    // Perform raycast
    raycaster.set(origin, direction);
    raycaster.far = config.maxDistance / 100; // Convert cm to scene units

    const intersects = raycaster.intersectObjects(scene.children, true);

    // Filter out own components
    const filteredIntersects = intersects.filter(
      (i) =>
        i.object !== beamRef.current &&
        i.object !== targetRef.current &&
        i.object !== lineRef.current
    );

    if (filteredIntersects.length > 0) {
      const closest = filteredIntersects[0];
      const distanceCm = closest.distance * 100; // Convert to cm

      setHitPoint(closest.point);

      // Notify reading
      onReading?.({
        distance: distanceCm,
        timestamp: Date.now(),
        hit: true,
        hitPoint: {
          x: closest.point.x,
          y: closest.point.y,
          z: closest.point.z,
        },
      });

      // Update beam geometry
      updateBeamGeometry(origin, closest.point);
    } else {
      setHitPoint(null);

      // No hit - beam goes to max distance
      const maxPoint = origin.clone().add(direction.multiplyScalar(config.maxDistance / 100));

      onReading?.({
        distance: config.maxDistance,
        timestamp: Date.now(),
        hit: false,
      });

      updateBeamGeometry(origin, maxPoint);
    }
  });

  const updateBeamGeometry = (origin: THREE.Vector3, target: THREE.Vector3) => {
    // Create cone/beam visualization
    const beamLength = origin.distanceTo(target);
    const coneRadius = Math.tan((config.coneAngle * Math.PI) / 360) * beamLength;

    // Update beam cone
    if (beamRef.current) {
      beamRef.current.position.copy(origin);
      beamRef.current.position.add(target).multiplyScalar(0.5); // Center of beam
      beamRef.current.scale.set(coneRadius * 2, beamLength, coneRadius * 2);
    }

    // Update target indicator
    if (targetRef.current) {
      targetRef.current.position.copy(target);
      targetRef.current.visible = hitPoint !== null;
    }

    // Update line
    if (lineRef.current) {
      const points = [origin, target];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      lineRef.current.geometry = geometry;
    }
  };

  return (
    <group>
      {/* Ultrasonic sensor body */}
      <mesh position={position} rotation={rotation}>
        <boxGeometry args={[0.3, 0.2, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Trigger pin indicator (transmitter) */}
      <mesh position={[position[0] - 0.05, position[1], position[2] - 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.05, 8]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
      </mesh>

      {/* Echo pin indicator (receiver) */}
      <mesh position={[position[0] + 0.05, position[1], position[2] - 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.05, 8]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>

      {/* Beam visualization cone */}
      <mesh ref={beamRef} visible={enabled}>
        <coneGeometry args={[1, 1, 16, 1, true]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Beam center line */}
      {lineRef.current && <primitive object={lineRef.current} />}

      {/* Hit point indicator */}
      <mesh ref={targetRef} visible={false}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff6600" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

// Hook for getting ultrasonic readings
export function useUltrasonicSensor(
  robotPosition: { x: number; y: number; z: number },
  robotRotation: number,
  config: UltrasonicConfig = DEFAULT_ULTRASONIC_CONFIG,
  enabled: boolean = true
) {
  const [reading, setReading] = useState<UltrasonicReading>({
    distance: config.maxDistance,
    timestamp: Date.now(),
    hit: false,
  });

  const raycaster = useRef(new THREE.Raycaster());
  const { scene } = useThree();

  const measure = useCallback(() => {
    const origin = new THREE.Vector3(robotPosition.x, robotPosition.y, robotPosition.z);

    // Direction robot is facing
    const direction = new THREE.Vector3(
      -Math.sin(robotRotation),
      0,
      -Math.cos(robotRotation)
    );

    raycaster.current.set(origin, direction);
    raycaster.current.far = config.maxDistance / 100;

    const intersects = raycaster.current.intersectObjects(scene.children, true);

    // Filter out sensor's own visualizations
    const filteredIntersects = intersects.filter((i) => {
      const name = i.object.name || '';
      return !name.includes('ultrasonic') && !name.includes('beam');
    });

    if (filteredIntersects.length > 0) {
      const closest = filteredIntersects[0];
      const newReading: UltrasonicReading = {
        distance: closest.distance * 100, // Convert to cm
        timestamp: Date.now(),
        hit: true,
        hitPoint: {
          x: closest.point.x,
          y: closest.point.y,
          z: closest.point.z,
        },
      };
      setReading(newReading);
      return newReading;
    }

    const noHitReading: UltrasonicReading = {
      distance: config.maxDistance,
      timestamp: Date.now(),
      hit: false,
    };
    setReading(noHitReading);
    return noHitReading;
  }, [robotPosition, robotRotation, config, scene]);

  return { reading, measure };
}

// Component that attaches ultrasonic sensor to robot
interface RobotUltrasonicSensorProps {
  robotPosition: { x: number; y: number; z: number };
  robotRotation: number;
  config?: UltrasonicConfig;
  showVisualization?: boolean;
}

export function RobotUltrasonicSensor({
  robotPosition,
  robotRotation,
  config = DEFAULT_ULTRASONIC_CONFIG,
  showVisualization = true,
}: RobotUltrasonicSensorProps) {
  const [currentReading, setCurrentReading] = useState<UltrasonicReading | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const { scene } = useThree();

  useFrame(() => {
    // Calculate sensor position (front of robot)
    const sensorOffset = 0.3; // Distance from robot center to sensor
    const position = {
      x: robotPosition.x + Math.sin(robotRotation) * sensorOffset,
      y: robotPosition.y + 0.1,
      z: robotPosition.z + Math.cos(robotRotation) * sensorOffset,
    };

    // Direction robot is facing
    const direction = new THREE.Vector3(
      -Math.sin(robotRotation),
      0,
      -Math.cos(robotRotation)
    );

    raycaster.current.set(
      new THREE.Vector3(position.x, position.y, position.z),
      direction
    );
    raycaster.current.far = config.maxDistance / 100;

    const intersects = raycaster.current.intersectObjects(scene.children, true);

    const filteredIntersects = intersects.filter((i) => {
      const name = i.object.name || '';
      return !name.includes('ultrasonic') && !name.includes('beam') && !name.includes('sensor');
    });

    if (filteredIntersects.length > 0) {
      const closest = filteredIntersects[0];
      setCurrentReading({
        distance: closest.distance * 100,
        timestamp: Date.now(),
        hit: true,
        hitPoint: {
          x: closest.point.x,
          y: closest.point.y,
          z: closest.point.z,
        },
      });
    } else {
      setCurrentReading({
        distance: config.maxDistance,
        timestamp: Date.now(),
        hit: false,
      });
    }
  });

  if (!showVisualization) return null;

  // Position sensor at front of robot
  const sensorPosition: [number, number, number] = [
    robotPosition.x + Math.sin(robotRotation) * 0.3,
    robotPosition.y + 0.1,
    robotPosition.z + Math.cos(robotRotation) * 0.3,
  ];

  return (
    <UltrasonicVisualizer
      position={sensorPosition}
      rotation={[0, robotRotation, 0]}
      config={config}
      enabled={showVisualization}
      onReading={setCurrentReading}
    />
  );
}

export default RobotUltrasonicSensor;