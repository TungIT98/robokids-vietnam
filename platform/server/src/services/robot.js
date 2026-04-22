/**
 * Robot Service
 *
 * Manages robot state, command execution, and command queue.
 * Commands from Blockly are validated and sent to robots via MQTT.
 */

// Robot command queue and state
const robotStates = new Map();
const commandQueue = new Map();

/**
 * Robot command schema validator
 */
const VALID_COMMANDS = [
  'move_forward',
  'move_backward',
  'turn_left',
  'turn_right',
  'set_speed',
  'wait',
  'get_distance',
  'get_light_level',
  'play_note',
  'led_on',
  'led_off',
  'repeat',
  'if_sensor',
];

/**
 * Validate robot command
 */
export function validateCommand(command) {
  if (!command || typeof command !== 'object') {
    return { valid: false, error: 'Command must be an object' };
  }

  if (!command.type || !VALID_COMMANDS.includes(command.type)) {
    return { valid: false, error: `Invalid command type: ${command.type}` };
  }

  // Validate specific command parameters
  const { type, params } = command;

  switch (type) {
    case 'move_forward':
    case 'move_backward':
      if (params && typeof params.steps !== 'number') {
        return { valid: false, error: 'steps must be a number' };
      }
      break;

    case 'turn_left':
    case 'turn_right':
      if (params && typeof params.degrees !== 'number') {
        return { valid: false, error: 'degrees must be a number' };
      }
      break;

    case 'set_speed':
      if (params && (typeof params.speed !== 'number' || params.speed < 0 || params.speed > 100)) {
        return { valid: false, error: 'speed must be a number between 0 and 100' };
      }
      break;

    case 'wait':
      if (params && typeof params.seconds !== 'number') {
        return { valid: false, error: 'seconds must be a number' };
      }
      break;

    case 'play_note':
      if (params && (typeof params.frequency !== 'number' || typeof params.duration !== 'number')) {
        return { valid: false, error: 'frequency and duration must be numbers' };
      }
      break;

    case 'repeat':
      if (!params || !Array.isArray(params.commands)) {
        return { valid: false, error: 'repeat requires commands array' };
      }
      break;

    case 'if_sensor':
      if (!params || !['DISTANCE', 'LIGHT'].includes(params.sensor)) {
        return { valid: false, error: 'if_sensor requires sensor type' };
      }
      break;
  }

  return { valid: true };
}

/**
 * Get robot state
 */
export function getRobotState(robotId) {
  return robotStates.get(robotId) || {
    robotId,
    status: 'offline',
    battery: 100,
    position: { x: 0, y: 0, heading: 0 },
    sensors: {
      distance: 0,
      light: 0,
    },
    lastCommand: null,
    lastUpdate: null,
  };
}

/**
 * Update robot state
 */
export function updateRobotState(robotId, updates) {
  const current = getRobotState(robotId);
  const updated = {
    ...current,
    ...updates,
    lastUpdate: new Date().toISOString(),
  };
  robotStates.set(robotId, updated);
  return updated;
}

/**
 * Get all robot states
 */
export function getAllRobotStates() {
  return Array.from(robotStates.values());
}

/**
 * Add command to robot queue
 */
export function queueCommand(robotId, command) {
  if (!commandQueue.has(robotId)) {
    commandQueue.set(robotId, []);
  }
  commandQueue.get(robotId).push({
    command,
    timestamp: new Date().toISOString(),
    status: 'pending',
  });
}

/**
 * Get next command from robot queue
 */
export function getNextCommand(robotId) {
  const queue = commandQueue.get(robotId) || [];
  const pending = queue.find((c) => c.status === 'pending');
  if (pending) {
    pending.status = 'executing';
    pending.startedAt = new Date().toISOString();
  }
  return pending;
}

/**
 * Complete a command
 */
export function completeCommand(robotId, commandIndex) {
  const queue = commandQueue.get(robotId) || [];
  if (queue[commandIndex]) {
    queue[commandIndex].status = 'completed';
    queue[commandIndex].completedAt = new Date().toISOString();
  }
}

/**
 * Get command history for robot
 */
export function getCommandHistory(robotId, limit = 50) {
  const queue = commandQueue.get(robotId) || [];
  return queue.slice(-limit);
}

export default {
  validateCommand,
  getRobotState,
  updateRobotState,
  getAllRobotStates,
  queueCommand,
  getNextCommand,
  completeCommand,
  getCommandHistory,
};
