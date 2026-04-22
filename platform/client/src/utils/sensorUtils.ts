/**
 * Pure sensor calculation utilities for SpaceAcademy simulator.
 * These functions can be used without React/Three.js context.
 */

import * as THREE from 'three';

export type LightDirection = 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT';
export type LinePosition = 'LEFT' | 'CENTER' | 'RIGHT' | 'NONE';

interface LightSource {
  position: THREE.Vector3;
  intensity: number;
  color: string;
}

interface Obstacle {
  position: THREE.Vector3;
  radius: number;
}

interface LinePoint {
  x: number;
  z: number;
}

// Light sources in the space environment
const LIGHT_SOURCES: LightSource[] = [
  { position: new THREE.Vector3(10, 20, 10), intensity: 0.8, color: '#ffffff' },
  { position: new THREE.Vector3(-20, 10, -20), intensity: 0.5, color: '#9b59b6' },
  { position: new THREE.Vector3(20, -10, -30), intensity: 0.3, color: '#00f0ff' },
  { position: new THREE.Vector3(0, 3, 1), intensity: 1.0, color: '#ff6b35' }, // Antenna light
];

// Obstacle positions (space station, asteroids approximate bounding boxes)
const OBSTACLES: Obstacle[] = [
  { position: new THREE.Vector3(15, 5, -20), radius: 4 }, // Space station
  { position: new THREE.Vector3(-20, 8, -30), radius: 9 }, // Asteroid 1
  { position: new THREE.Vector3(25, -5, -25), radius: 4 }, // Asteroid 2
  { position: new THREE.Vector3(-10, -8, -35), radius: 16 }, // Asteroid 3
  { position: new THREE.Vector3(35, 15, -40), radius: 6.25 }, // Asteroid 4
  { position: new THREE.Vector3(-30, 3, -20), radius: 2.25 }, // Asteroid 5
];

// Define a track path using line points - a circular/oval track
const TRACK_LINES: LinePoint[] = [
  { x: 0, z: 0 },
  { x: 5, z: 0 },
  { x: 10, z: 0 },
  { x: 15, z: 5 },
  { x: 15, z: 10 },
  { x: 10, z: 15 },
  { x: 5, z: 15 },
  { x: 0, z: 10 },
  { x: -5, z: 5 },
  { x: -5, z: 0 },
  { x: 0, z: 0 },
];

const LINE_WIDTH = 0.8;

// Sensor offsets from robot center for line tracking (left, center, right)
const LINE_SENSOR_OFFSETS = [
  { name: 'LEFT' as LinePosition, offsetX: -0.4, offsetZ: 0 },
  { name: 'CENTER' as LinePosition, offsetX: 0, offsetZ: 0 },
  { name: 'RIGHT' as LinePosition, offsetX: 0.4, offsetZ: 0 },
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

/**
 * Calculate light level at robot position using raycasting simulation.
 * Returns value 0-100.
 */
export function calculateLightLevel(
  robotPos: { x: number; y: number; z: number },
  direction: LightDirection,
  robotRotation: number
): number {
  const robotPosition = new THREE.Vector3(robotPos.x, robotPos.y, robotPos.z);
  const directionVec = getDirectionVector(direction, robotRotation);

  let totalLight = 0.15; // Base ambient light (space is dark)

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

/**
 * Calculate distance using ultrasonic sensor simulation.
 * Returns distance in cm (simulated as 20-200 range).
 */
export function calculateDistance(
  robotPos: { x: number; y: number; z: number },
  direction: LightDirection,
  robotRotation: number
): number {
  const directionVec = getDirectionVector(direction, robotRotation);
  const robotPosition = new THREE.Vector3(robotPos.x, robotPos.y, robotPos.z);

  // Check for obstacle intersection in the direction
  let minDistance = Infinity;

  for (const obstacle of OBSTACLES) {
    const oc = robotPosition.clone().sub(obstacle.position);
    const a = directionVec.dot(directionVec);
    const b = 2 * oc.dot(directionVec);
    const c = oc.dot(oc) - obstacle.radius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant >= 0) {
      const t = (-b - Math.sqrt(discriminant)) / (2 * a);
      if (t > 0 && t < minDistance) {
        minDistance = t;
      }
    }
  }

  // Convert to cm (simulated scale)
  if (minDistance === Infinity) {
    return 200; // No obstacle detected, return max distance
  }

  // Scale to realistic ultrasonic range (20-200 cm)
  const distanceCm = Math.round(20 + (minDistance * 9));
  return Math.min(200, Math.max(20, distanceCm));
}

/**
 * Check if a point is near any line segment in the track
 */
function isPointNearLine(px: number, pz: number): boolean {
  for (let i = 0; i < TRACK_LINES.length - 1; i++) {
    const p1 = TRACK_LINES[i];
    const p2 = TRACK_LINES[i + 1];
    const dist = pointToSegmentDistance(px, pz, p1.x, p1.z, p2.x, p2.z);
    if (dist <= LINE_WIDTH) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate perpendicular distance from point to line segment
 */
function pointToSegmentDistance(
  px: number, pz: number,
  x1: number, z1: number,
  x2: number, z2: number
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lengthSq = dx * dx + dz * dz;

  if (lengthSq === 0) {
    return Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2);
  }

  let t = ((px - x1) * dx + (pz - z1) * dz) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;

  return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2);
}

/**
 * Read line tracker sensors at robot position.
 * Returns LEFT, CENTER, RIGHT, or NONE.
 */
export function readLineTracker(
  robotX: number,
  robotZ: number,
  robotRotation: number
): LinePosition {
  const cosR = Math.cos(robotRotation);
  const sinR = Math.sin(robotRotation);

  const detections: LinePosition[] = [];

  for (const sensor of LINE_SENSOR_OFFSETS) {
    // Transform sensor offset by robot rotation
    const sensorWorldX = robotX + sensor.offsetX * cosR - sensor.offsetZ * sinR;
    const sensorWorldZ = robotZ + sensor.offsetX * sinR + sensor.offsetZ * cosR;

    if (isPointNearLine(sensorWorldX, sensorWorldZ)) {
      detections.push(sensor.name);
    }
  }

  if (detections.length === 0) return 'NONE';
  if (detections.length === 1) return detections[0];
  if (detections.includes('CENTER')) return 'CENTER';
  if (detections.includes('LEFT') && detections.includes('RIGHT')) return 'CENTER';
  if (detections.includes('LEFT')) return 'LEFT';
  if (detections.includes('RIGHT')) return 'RIGHT';
  return 'NONE';
}

/**
 * Get ambient light level (non-directional).
 * Returns value 0-100.
 */
export function getAmbientLightLevel(robotPos: { x: number; y: number; z: number }): number {
  const robotPosition = new THREE.Vector3(robotPos.x, robotPos.y, robotPos.z);
  let totalLight = 0.15; // Base ambient light

  for (const light of LIGHT_SOURCES) {
    const distance = robotPosition.distanceTo(light.position);
    const contribution = (light.intensity * 0.3) / (1 + distance * 0.02);
    totalLight += contribution;
  }

  return Math.min(100, Math.max(0, Math.round(totalLight * 100)));
}