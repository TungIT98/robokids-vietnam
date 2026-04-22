import * as THREE from 'three';

export type LinePosition = 'LEFT' | 'CENTER' | 'RIGHT' | 'NONE';

interface LinePoint {
  x: number;
  z: number;
}

// Define a track path using line points - a circular/oval track in the space environment
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
  { x: 0, z: 0 }, // Close the loop
];

// Line width tolerance for detection (in world units)
const LINE_WIDTH = 0.8;

// Sensor offsets from robot center (left, center, right)
const SENSOR_OFFSETS = [
  { name: 'LEFT' as LinePosition, offsetX: -0.4, offsetZ: 0 },
  { name: 'CENTER' as LinePosition, offsetX: 0, offsetZ: 0 },
  { name: 'RIGHT' as LinePosition, offsetX: 0.4, offsetZ: 0 },
];

/**
 * Check if a point is near any line segment in the track
 */
function isPointNearLine(px: number, pz: number): boolean {
  for (let i = 0; i < TRACK_LINES.length - 1; i++) {
    const p1 = TRACK_LINES[i];
    const p2 = TRACK_LINES[i + 1];

    // Distance from point to line segment
    const dist = pointToSegmentDistance(px, pz, p1.x, p1.z, p2.x, p2.z);
    if (dist <= LINE_WIDTH) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate perpendicular distance from point (px, pz) to line segment (x1,z1) to (x2,z2)
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
    // Segment is a point
    return Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2);
  }

  // Project point onto line segment
  let t = ((px - x1) * dx + (pz - z1) * dz) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;

  return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2);
}

/**
 * Read line tracker sensors at robot position
 * Returns which sensor(s) detect the line: LEFT, CENTER, RIGHT, or combined NONE/LEFT/CENTER/RIGHT
 */
export function readLineTracker(
  robotX: number,
  robotZ: number,
  robotRotation: number
): LinePosition {
  // Calculate sensor positions based on robot rotation
  const cosR = Math.cos(robotRotation);
  const sinR = Math.sin(robotRotation);

  const detections: LinePosition[] = [];

  for (const sensor of SENSOR_OFFSETS) {
    // Transform sensor offset by robot rotation
    const sensorWorldX = robotX + sensor.offsetX * cosR - sensor.offsetZ * sinR;
    const sensorWorldZ = robotZ + sensor.offsetX * sinR + sensor.offsetZ * cosR;

    if (isPointNearLine(sensorWorldX, sensorWorldZ)) {
      detections.push(sensor.name);
    }
  }

  if (detections.length === 0) {
    return 'NONE';
  }
  if (detections.length === 1) {
    return detections[0];
  }
  if (detections.includes('CENTER')) {
    return 'CENTER';
  }
  if (detections.includes('LEFT') && detections.includes('RIGHT')) {
    return 'CENTER'; // Both sides see line, assume centered
  }
  if (detections.includes('LEFT')) {
    return 'LEFT';
  }
  if (detections.includes('RIGHT')) {
    return 'RIGHT';
  }
  return 'NONE';
}

/**
 * Get all sensor detections as individual values
 */
export function readLineTrackerAllSensors(
  robotX: number,
  robotZ: number,
  robotRotation: number
): { left: boolean; center: boolean; right: boolean } {
  const cosR = Math.cos(robotRotation);
  const sinR = Math.sin(robotRotation);

  const result = { left: false, center: false, right: false };

  for (const sensor of SENSOR_OFFSETS) {
    const sensorWorldX = robotX + sensor.offsetX * cosR - sensor.offsetZ * sinR;
    const sensorWorldZ = robotZ + sensor.offsetX * sinR + sensor.offsetZ * cosR;
    const onLine = isPointNearLine(sensorWorldX, sensorWorldZ);

    if (sensor.name === 'LEFT') result.left = onLine;
    if (sensor.name === 'CENTER') result.center = onLine;
    if (sensor.name === 'RIGHT') result.right = onLine;
  }

  return result;
}

/**
 * Get track line points for rendering
 */
export function getTrackLinePoints(): LinePoint[] {
  return TRACK_LINES;
}

export default function LineTrackerRaycaster() {
  // This component is logic-only - no rendering
  return null;
}
