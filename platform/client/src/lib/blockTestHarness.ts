import { RobotCommand, RepeatCommand, ConditionalCommand } from '../components/generators/robotGenerator';

/**
 * Block Test Harness - Run Blockly blocks in simulation without real hardware
 *
 * This module provides utilities to:
 * 1. Parse generated robot commands from Blockly workspace
 * 2. Execute commands in a simulated 3D environment
 * 3. Validate block outputs (sensor readings, etc.)
 * 4. Track execution state for debugging
 */

export interface SimulationConfig {
  // Robot physical properties
  robotRadius: number; // meters
  maxSpeed: number; // steps per second
  turnSpeed: number; // degrees per second

  // Arena bounds
  arenaBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };

  // Sensor simulation parameters
  sensors: {
    ultrasonic: {
      maxDistance: number; // cm
      minDistance: number; // cm
    };
    light: {
      minValue: number;
      maxValue: number;
    };
  };
}

export interface RobotState {
  position: { x: number; z: number };
  rotation: number; // radians
  speed: number;
  ledOn: boolean;
  variables: Record<string, number>;
}

export interface ExecutionResult {
  success: boolean;
  commands: RobotCommand[];
  finalState: RobotState;
  executionLog: LogEntry[];
  errors: string[];
  warnings: string[];
}

export interface LogEntry {
  timestamp: number;
  command: RobotCommand;
  state: RobotState;
  message: string;
}

export interface SensorReadings {
  distance: number;
  light: number;
}

/**
 * Default simulation configuration
 */
export const DEFAULT_SIM_CONFIG: SimulationConfig = {
  robotRadius: 0.05, // 5cm
  maxSpeed: 100,
  turnSpeed: 180,
  arenaBounds: {
    minX: -2,
    maxX: 2,
    minZ: -2,
    maxZ: 2,
  },
  sensors: {
    ultrasonic: {
      maxDistance: 400,
      minDistance: 2,
    },
    light: {
      minValue: 0,
      maxValue: 100,
    },
  },
};

/**
 * Execute robot commands in simulation
 */
export function executeCommands(
  commands: RobotCommand[],
  config: SimulationConfig = DEFAULT_SIM_CONFIG,
  initialState?: Partial<RobotState>
): ExecutionResult {
  const state: RobotState = {
    position: { x: 0, z: 0 },
    rotation: 0,
    speed: 50,
    ledOn: false,
    variables: {},
    ...initialState,
  };

  const log: LogEntry[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let startTime = Date.now();

  for (const command of commands) {
    try {
      executeCommand(command, state, config, log, warnings);
    } catch (err) {
      errors.push(`Command ${command.type} failed: ${err}`);
    }
  }

  return {
    success: errors.length === 0,
    commands,
    finalState: state,
    executionLog: log,
    errors,
    warnings,
  };
}

function executeCommand(
  command: RobotCommand,
  state: RobotState,
  config: SimulationConfig,
  log: LogEntry[],
  warnings: string[]
) {
  const timestamp = Date.now();

  switch (command.type) {
    case 'move_forward':
    case 'move_backward': {
      const direction = command.type === 'move_forward' ? 1 : -1;
      const steps = (command.params?.steps as number) || 0;
      const effectiveSpeed = (state.speed / 100) * config.maxSpeed;
      const distance = (steps / effectiveSpeed) * 0.1; // scaled distance

      const dx = Math.sin(state.rotation) * distance * direction;
      const dz = Math.cos(state.rotation) * distance * direction;

      state.position.x += dx;
      state.position.z += dz;

      // Clamp to arena bounds
      state.position.x = clamp(
        state.position.x,
        config.arenaBounds.minX,
        config.arenaBounds.maxX
      );
      state.position.z = clamp(
        state.position.z,
        config.arenaBounds.minZ,
        config.arenaBounds.maxZ
      );

      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `${command.type} ${steps} steps to (${state.position.x.toFixed(2)}, ${state.position.z.toFixed(2)})`,
      });
      break;
    }

    case 'turn_left':
    case 'turn_right': {
      const direction = command.type === 'turn_left' ? 1 : -1;
      const degrees = (command.params?.degrees as number) || 0;
      const radians = degrees * (Math.PI / 180) * direction;
      state.rotation += radians;
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `${command.type} ${degrees}° → rotation ${(state.rotation * 180 / Math.PI).toFixed(1)}°`,
      });
      break;
    }

    case 'set_speed': {
      const speed = (command.params?.speed as number) || 50;
      state.speed = Math.max(0, Math.min(100, speed));
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `set speed to ${state.speed}`,
      });
      break;
    }

    case 'wait': {
      const seconds = (command.params?.seconds as number) || 1;
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `wait ${seconds}s`,
      });
      break;
    }

    case 'get_distance': {
      // Simulated ultrasonic reading
      const distance = simulateUltrasonic(state.position, config);
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `get_distance → ${distance.toFixed(1)}cm`,
      });
      break;
    }

    case 'get_light_level': {
      // Simulated light level reading
      const light = simulateLightLevel(state.position, config);
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `get_light_level → ${light.toFixed(1)}%`,
      });
      break;
    }

    case 'led_on':
    case 'led_off': {
      state.ledOn = command.type === 'led_on';
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: command.type === 'led_on' ? 'LED on' : 'LED off',
      });
      break;
    }

    case 'set_variable': {
      const name = command.params?.name as string;
      const value = command.params?.value as number;
      state.variables[name] = value;
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `set ${name} = ${value}`,
      });
      break;
    }

    case 'get_variable': {
      const name = command.params?.name as string;
      const value = state.variables[name] ?? 0;
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `get ${name} → ${value}`,
      });
      break;
    }

    case 'math_operation': {
      const operator = command.params?.operator as string;
      const a = command.params?.a as number;
      const b = command.params?.b as number;
      let result = 0;
      switch (operator) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/': result = b !== 0 ? a / b : 0; break;
      }
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `${a} ${operator} ${b} = ${result}`,
      });
      break;
    }

    case 'repeat': {
      const repeatCmd = command as RepeatCommand;
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `repeat ${repeatCmd.params.count} times`,
      });
      break;
    }

    case 'if_sensor': {
      const condCmd = command as ConditionalCommand;
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `if sensor ${condCmd.params.sensor} ${condCmd.params.condition}`,
      });
      break;
    }

    case 'play_note': {
      const freq = command.params?.frequency as number;
      const dur = command.params?.duration as number;
      log.push({
        timestamp,
        command,
        state: { ...state },
        message: `play note ${freq}Hz for ${dur}s`,
      });
      break;
    }

    default:
      warnings.push(`Unknown command type: ${(command as any).type}`);
  }
}

/**
 * Simulate ultrasonic sensor reading based on robot position
 * In a real 3D scene, this would use raycasting
 */
function simulateUltrasonic(
  position: { x: number; z: number },
  config: SimulationConfig
): number {
  // Simulate by distance from arena center
  const distFromCenter = Math.sqrt(position.x ** 2 + position.z ** 2);
  const normalized = distFromCenter / config.arenaBounds.maxX;
  const distance = config.sensors.ultrasonic.maxDistance * (1 - normalized * 0.7);
  return Math.max(
    config.sensors.ultrasonic.minDistance,
    Math.min(config.sensors.ultrasonic.maxDistance, distance)
  );
}

/**
 * Simulate light sensor reading
 * In a real 3D scene, this would use raycasting to detect light sources
 */
function simulateLightLevel(
  position: { x: number; z: number },
  config: SimulationConfig
): number {
  // Simulate by position (brighter in corners)
  const cornerFactor = Math.abs(position.x * position.z) / (config.arenaBounds.maxX ** 2);
  const light = 50 + cornerFactor * 50;
  return Math.max(
    config.sensors.light.minValue,
    Math.min(config.sensors.light.maxValue, light)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validate that commands can be executed
 * Returns list of issues without actually executing
 */
export function validateCommands(commands: RobotCommand[]): string[] {
  const issues: string[] = [];

  for (const command of commands) {
    if (!command.type) {
      issues.push('Command missing type field');
    }

    switch (command.type) {
      case 'move_forward':
      case 'move_backward':
        if (typeof command.params?.steps !== 'number') {
          issues.push(`${command.type}: steps must be a number`);
        }
        break;

      case 'turn_left':
      case 'turn_right':
        if (typeof command.params?.degrees !== 'number') {
          issues.push(`${command.type}: degrees must be a number`);
        }
        break;

      case 'set_speed':
        const speed = command.params?.speed as number;
        if (typeof speed !== 'number' || speed < 0 || speed > 100) {
          issues.push(`${command.type}: speed must be 0-100`);
        }
        break;

      case 'wait':
      case 'play_note':
        if (typeof command.params?.seconds !== 'number' && typeof command.params?.duration !== 'number') {
          issues.push(`${command.type}: duration must be a number`);
        }
        break;
    }
  }

  return issues;
}
