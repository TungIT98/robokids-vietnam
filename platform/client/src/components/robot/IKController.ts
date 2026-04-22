/**
 * Z-Arm IKController - Inverse Kinematics for 3-Segment Robotic Arm
 *
 * Solves IK for a 3-DOF arm with:
 * - Joint 1: Base rotation (yaw) - rotates around Y axis
 * - Joint 2: Shoulder pitch - rotates around Z axis
 * - Joint 3: Elbow pitch - rotates around Z axis
 * - Joint 4: Wrist pitch - rotates around Z axis
 *
 * Uses analytical IK solver with trigonometry.
 */

export interface JointAngles {
  joint1: number; // Base yaw in radians
  joint2: number; // Shoulder pitch in radians
  joint3: number; // Elbow pitch in radians
  joint4: number; // Wrist pitch in radians
}

export interface ArmSegment {
  length: number;
}

export interface IKResult {
  success: boolean;
  angles?: JointAngles;
  endEffectorPosition?: { x: number; y: number; z: number };
  error?: string;
}

export interface JointLimits {
  joint1Min: number;
  joint1Max: number;
  joint2Min: number;
  joint2Max: number;
  joint3Min: number;
  joint3Max: number;
  joint4Min: number;
  joint4Max: number;
}

// Default segment lengths (in mm or arbitrary units)
const DEFAULT_SEGMENTS: ArmSegment[] = [
  { length: 100 }, // Base to shoulder
  { length: 80 },  // Shoulder to elbow
  { length: 60 },  // Elbow to wrist
  { length: 40 },  // Wrist to end effector
];

// Default joint limits (in radians)
const DEFAULT_LIMITS: JointLimits = {
  joint1Min: -Math.PI,
  joint1Max: Math.PI,
  joint2Min: -Math.PI / 4,
  joint2Max: Math.PI / 2,
  joint3Min: -Math.PI / 2,
  joint3Max: Math.PI / 2,
  joint4Min: -Math.PI / 2,
  joint4Max: Math.PI / 2,
};

export class ZArmIKController {
  private segments: ArmSegment[];
  private limits: JointLimits;
  private currentAngles: JointAngles;
  private currentPosition: { x: number; y: number; z: number };

  constructor(
    segments: ArmSegment[] = DEFAULT_SEGMENTS,
    limits: JointLimits = DEFAULT_LIMITS
  ) {
    this.segments = segments;
    this.limits = limits;
    this.currentAngles = { joint1: 0, joint2: 0, joint3: 0, joint4: 0 };
    this.currentPosition = { x: 0, y: 0, z: 0 };
  }

  /**
   * Calculate total arm reach
   */
  get totalReach(): number {
    return this.segments.reduce((sum, seg) => sum + seg.length, 0);
  }

  /**
   * Get total height of arm when fully extended upward
   */
  get totalHeight(): number {
    return this.segments.reduce((sum, seg) => sum + seg.length, 0);
  }

  /**
   * Solve inverse kinematics for a target position
   * Uses analytical 2D IK for the arm in the vertical plane,
   * then calculates base rotation based on target azimuth.
   *
   * @param targetX Target X coordinate (horizontal, perpendicular to base)
   * @param targetY Target Y coordinate (vertical height)
   * @param targetZ Target Z coordinate (horizontal, along base axis)
   * @returns IKResult with joint angles or error
   */
  solve(targetX: number, targetY: number, targetZ: number): IKResult {
    // Calculate azimuth angle (base rotation)
    const azimuth = Math.atan2(targetX, targetZ);
    const horizontalDistance = Math.sqrt(targetX * targetX + targetZ * targetZ);
    const verticalDistance = targetY;

    // Effective 2D problem: reach from base to target in sagittal plane
    const reach2D = Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);

    // Check if target is reachable
    const L2 = this.segments[1].length; // Upper arm
    const L3 = this.segments[2].length; // Forearm
    const L4 = this.segments[3].length; // Wrist

    // Minimum and maximum reach (considering wrist segment)
    const minReach = Math.abs(L2 - L3 - L4);
    const maxReach = L2 + L3 + L4;

    if (reach2D < minReach * 0.8) {
      return {
        success: false,
        error: `Target too close. Minimum reach: ${minReach.toFixed(1)}`,
      };
    }

    if (reach2D > maxReach * 1.0) {
      return {
        success: false,
        error: `Target too far. Maximum reach: ${maxReach.toFixed(1)}`,
      };
    }

    // Clamp to reachable range
    const clampedReach = Math.max(minReach, Math.min(maxReach, reach2D));

    // Calculate joint angles using law of cosines
    // For 2-link planar arm:
    // cos(theta3) = (L2^2 + L3^2 - d^2) / (2 * L2 * L3)
    // theta2 = atan2(sin(theta3) * L3 / d, ...)
    // theta3 = atan2(dy, dx) - theta2

    const Ltotal = clampedReach;

    // Wrist always points downward (perpendicular to forearm)
    // So we treat the arm as a 3-segment chain

    // Law of cosines for elbow angle
    const cosElbow = (L2 * L2 + L3 * L3 - L4 * L4 - Ltotal * Ltotal) /
                     (2 * L2 * Math.sqrt(L3 * L3 + L4 * L4));

    // Clamp to valid range for acos
    const clampedCosElbow = Math.max(-1, Math.min(1, cosElbow));
    const elbowAngle = Math.acos(clampedCosElbow);

    // Angle to target from shoulder
    const angleToTarget = Math.atan2(verticalDistance, horizontalDistance);

    // Shoulder angle (accounts for elbow offset)
    const effectiveForearm = Math.sqrt(L3 * L3 + L4 * L4);
    const cosShoulderOffset = (L2 * L2 + Ltotal * Ltotal - (L3 * L3 + L4 * L4)) /
                               (2 * L2 * Ltotal);
    const clampedCosShoulder = Math.max(-1, Math.min(1, cosShoulderOffset));
    const shoulderOffset = Math.acos(clampedCosShoulder);
    const shoulderAngle = angleToTarget - shoulderOffset;

    // Calculate actual end effector position with clamped values
    const actualEndPos = this.forwardKinematics(azimuth, shoulderAngle, elbowAngle, 0);

    // Apply joint limits
    const angles: JointAngles = {
      joint1: this.clamp(azimuth, this.limits.joint1Min, this.limits.joint1Max),
      joint2: this.clamp(-shoulderAngle - elbowAngle / 2, this.limits.joint2Min, this.limits.joint2Max),
      joint3: this.clamp(-elbowAngle, this.limits.joint3Min, this.limits.joint3Max),
      joint4: this.clamp(elbowAngle / 2, this.limits.joint4Min, this.limits.joint4Max),
    };

    this.currentAngles = angles;
    this.currentPosition = { x: targetX, y: targetY, z: targetZ };

    return {
      success: true,
      angles,
      endEffectorPosition: this.forwardKinematics(angles.joint1, angles.joint2, angles.joint3, angles.joint4),
    };
  }

  /**
   * Forward kinematics: calculate end effector position from joint angles
   */
  forwardKinematics(
    joint1: number,
    joint2: number,
    joint3: number,
    joint4: number
  ): { x: number; y: number; z: number } {
    // Joint 1 rotates around Y axis
    const cos1 = Math.cos(joint1);
    const sin1 = Math.sin(joint1);

    // Calculate positions in 2D sagittal plane, then rotate by joint1
    // Segment 1 (shoulder)
    const x1 = this.segments[0].length * sin1;
    const z1 = this.segments[0].length * cos1;

    // Segment 2 (upper arm)
    const angle2 = joint2;
    const x2 = this.segments[1].length * Math.sin(angle2) * cos1;
    const y2 = this.segments[1].length * Math.cos(angle2);
    const z2 = this.segments[1].length * Math.sin(angle2) * sin1;

    // Segment 3 (forearm)
    const angle3 = joint2 + joint3;
    const x3 = this.segments[2].length * Math.sin(angle3) * cos1;
    const y3 = this.segments[2].length * Math.cos(angle3);
    const z3 = this.segments[2].length * Math.sin(angle3) * sin1;

    // Segment 4 (wrist to end effector)
    const angle4 = joint2 + joint3 + joint4;
    const x4 = this.segments[3].length * Math.sin(angle4) * cos1;
    const y4 = this.segments[3].length * Math.cos(angle4);
    const z4 = this.segments[3].length * Math.sin(angle4) * sin1;

    return {
      x: x1 + x2 + x3 + x4,
      y: y2 + y3 + y4,
      z: z1 + z2 + z3 + z4,
    };
  }

  /**
   * Move arm to a specific position (async with interpolation)
   */
  async moveTo(
    x: number,
    y: number,
    z: number,
    duration: number = 1000,
    onUpdate?: (angles: JointAngles, progress: number) => void
  ): Promise<IKResult> {
    const result = this.solve(x, y, z);
    if (!result.success) return result;

    const startAngles = { ...this.currentAngles };
    const targetAngles = result.angles!;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeInOutCubic(progress);

        const interpolatedAngles: JointAngles = {
          joint1: startAngles.joint1 + (targetAngles.joint1 - startAngles.joint1) * eased,
          joint2: startAngles.joint2 + (targetAngles.joint2 - startAngles.joint2) * eased,
          joint3: startAngles.joint3 + (targetAngles.joint3 - startAngles.joint3) * eased,
          joint4: startAngles.joint4 + (targetAngles.joint4 - startAngles.joint4) * eased,
        };

        this.currentAngles = interpolatedAngles;
        onUpdate?.(interpolatedAngles, progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve(result);
        }
      };
      animate();
    });
  }

  /**
   * Get current joint angles
   */
  getCurrentAngles(): JointAngles {
    return { ...this.currentAngles };
  }

  /**
   * Get current end effector position
   */
  getCurrentPosition(): { x: number; y: number; z: number } {
    return { ...this.currentPosition };
  }

  /**
   * Convert joint angles to degrees for display
   */
  anglesToDegrees(angles: JointAngles): { joint1: number; joint2: number; joint3: number; joint4: number } {
    return {
      joint1: (angles.joint1 * 180 / Math.PI),
      joint2: (angles.joint2 * 180 / Math.PI),
      joint3: (angles.joint3 * 180 / Math.PI),
      joint4: (angles.joint4 * 180 / Math.PI),
    };
  }

  /**
   * Convert degrees to radians for input
   */
  degreesToRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  /**
   * Helper: clamp value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Helper: ease in out cubic
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

// Export singleton instance for global use
export const zArmIK = new ZArmIKController();

export default ZArmIKController;
