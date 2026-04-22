import { useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type LightDirection = 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT';

interface LightSource {
  position: THREE.Vector3;
  intensity: number;
  color: string;
}

interface LightSensorRaycasterProps {
  robotPosition: { x: number; y: number; z: number };
  robotRotation: number;
  onLightRead?: (direction: LightDirection, value: number) => void;
}

// Light sources in the space environment
const LIGHT_SOURCES: LightSource[] = [
  { position: new THREE.Vector3(10, 20, 10), intensity: 0.8, color: '#ffffff' },
  { position: new THREE.Vector3(-20, 10, -20), intensity: 0.5, color: '#9b59b6' },
  { position: new THREE.Vector3(20, -10, -30), intensity: 0.3, color: '#00f0ff' },
  { position: new THREE.Vector3(0, 3, 1), intensity: 1.0, color: '#ff6b35' }, // Antenna light
];

// Obstacle positions (space station, asteroids approximate bounding boxes)
const OBSTACLES = [
  { position: new THREE.Vector3(15, 5, -20), radius: 4 }, // Space station
  { position: new THREE.Vector3(-20, 8, -30), radius: 3 * 3 }, // Asteroid 1
  { position: new THREE.Vector3(25, -5, -25), radius: 2 * 2 }, // Asteroid 2
  { position: new THREE.Vector3(-10, -8, -35), radius: 4 * 4 }, // Asteroid 3
  { position: new THREE.Vector3(35, 15, -40), radius: 2.5 * 2.5 }, // Asteroid 4
  { position: new THREE.Vector3(-30, 3, -20), radius: 1.5 * 1.5 }, // Asteroid 5
];

function getDirectionVector(direction: LightDirection, robotRotation: number): THREE.Vector3 {
  let angle: number;
  switch (direction) {
    case 'FORWARD':
      angle = -robotRotation;
      break;
    case 'BACKWARD':
      angle = Math.PI - robotRotation;
      break;
    case 'LEFT':
      angle = Math.PI / 2 - robotRotation;
      break;
    case 'RIGHT':
      angle = -Math.PI / 2 - robotRotation;
      break;
    default:
      angle = -robotRotation;
  }

  return new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle));
}

function calculateLightLevel(
  robotPos: { x: number; y: number; z: number },
  direction: LightDirection,
  robotRotation: number
): number {
  const robotPosition = new THREE.Vector3(robotPos.x, robotPos.y, robotPos.z);
  const directionVec = getDirectionVector(direction, robotRotation);

  let totalLight = 0.15; // Base ambient light (space is dark)
  const rayEnd = robotPosition.clone().add(directionVec.clone().multiplyScalar(50));

  // Check each light source
  for (const light of LIGHT_SOURCES) {
    // Check if light source is in the direction of the ray
    const toLight = light.position.clone().sub(robotPosition).normalize();
    const dot = directionVec.dot(toLight);

    if (dot > 0) {
      // Light is in the ray direction
      const distance = robotPosition.distanceTo(light.position);

      // Check if obstacle blocks the light
      let blocked = false;
      for (const obstacle of OBSTACLES) {
        // Ray-sphere intersection test
        const oc = robotPosition.clone().sub(obstacle.position);
        const a = directionVec.dot(directionVec);
        const b = 2 * oc.dot(directionVec);
        const c = oc.dot(oc) - obstacle.radius;
        const discriminant = b * b - 4 * a * c;

        if (discriminant > 0) {
          const t = (-b - Math.sqrt(discriminant)) / (2 * a);
          if (t > 0 && t < distance) {
            blocked = true;
            break;
          }
        }
      }

      if (!blocked) {
        // Light contribution decreases with distance squared
        const contribution = (light.intensity * dot) / (1 + distance * 0.02);
        totalLight += contribution;
      }
    }
  }

  // Convert to 0-100 scale
  const lightPercent = Math.min(100, Math.max(0, totalLight * 100));
  return Math.round(lightPercent);
}

export function useLightSensorRaycaster() {
  const { scene } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());

  const getLightLevel = useCallback(
    (position: { x: number; y: number; z: number }, direction: LightDirection, rotation: number): number => {
      return calculateLightLevel(position, direction, rotation);
    },
    []
  );

  return { getLightLevel, raycaster: raycasterRef.current };
}

export default function LightSensorRaycaster({
  robotPosition,
  robotRotation,
  onLightRead,
}: LightSensorRaycasterProps) {
  // This component doesn't render anything - it's a logic-only component
  // It provides the light calculation via hooks

  const getLightLevel = useCallback(
    (direction: LightDirection): number => {
      return calculateLightLevel(robotPosition, direction, robotRotation);
    },
    [robotPosition, robotRotation]
  );

  // Expose light reading via callback when position/rotation changes
  useFrame(() => {
    // Only trigger callback if needed (e.g., when sensor is actively being read)
    // The actual triggering should be done by the parent component
  });

  // Helper to read all directions at once
  const readAllDirections = useCallback(() => {
    const directions: LightDirection[] = ['FORWARD', 'BACKWARD', 'LEFT', 'RIGHT'];
    const readings: Record<LightDirection, number> = {
      FORWARD: 0,
      BACKWARD: 0,
      LEFT: 0,
      RIGHT: 0,
    };

    for (const dir of directions) {
      readings[dir] = getLightLevel(dir);
      onLightRead?.(dir, readings[dir]);
    }

    return readings;
  }, [getLightLevel, onLightRead]);

  return null; // Render nothing - this is a logic component
}

// Export the pure calculation function for use outside Three.js context
export { calculateLightLevel, getDirectionVector };
