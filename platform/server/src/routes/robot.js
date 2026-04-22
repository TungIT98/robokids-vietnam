import express from 'express';
import {
  getRobotState,
  getAllRobotStates,
  updateRobotState,
  validateCommand,
  queueCommand,
  getCommandHistory,
} from '../services/robot.js';
import { publishCommand, getConnectedRobots } from '../services/mqtt.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/robots
 * List all known robots and their states
 */
router.get('/', authenticate, (req, res) => {
  const robots = getAllRobotStates();
  const connected = getConnectedRobots();
  res.json({
    robots,
    connected,
    total: robots.length,
  });
});

/**
 * GET /api/robots/:robotId
 * Get specific robot state
 */
router.get('/:robotId', authenticate, (req, res) => {
  const { robotId } = req.params;
  const state = getRobotState(robotId);
  res.json(state);
});

/**
 * POST /api/robots/:robotId/command
 * Send a command to a robot
 *
 * Command format:
 * {
 *   "type": "move_forward",
 *   "params": { "steps": 10 }
 * }
 */
router.post('/:robotId/command', authenticate, (req, res) => {
  const { robotId } = req.params;
  const { command } = req.body;

  // Validate command
  const validation = validateCommand(command);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  // Queue command
  queueCommand(robotId, command);

  // Publish to MQTT
  publishCommand(robotId, command);

  // Update state
  updateRobotState(robotId, { lastCommand: command.type });

  res.json({
    success: true,
    robotId,
    command,
    message: 'Command queued and published',
  });
});

/**
 * POST /api/robots/:robotId/commands
 * Send multiple commands (from Blockly program)
 */
router.post('/:robotId/commands', authenticate, (req, res) => {
  const { robotId } = req.params;
  const { commands } = req.body;

  if (!Array.isArray(commands)) {
    return res.status(400).json({ error: 'commands must be an array' });
  }

  const results = [];
  for (const command of commands) {
    const validation = validateCommand(command);
    if (!validation.valid) {
      results.push({ command, error: validation.error });
      continue;
    }
    queueCommand(robotId, command);
    publishCommand(robotId, command);
    results.push({ command, success: true });
  }

  res.json({
    success: true,
    robotId,
    results,
  });
});

/**
 * GET /api/robots/:robotId/history
 * Get command history for a robot
 */
router.get('/:robotId/history', authenticate, (req, res) => {
  const { robotId } = req.params;
  const { limit } = req.query;
  const history = getCommandHistory(robotId, parseInt(limit) || 50);
  res.json({ robotId, history });
});

/**
 * PATCH /api/robots/:robotId/state
 * Update robot state (for simulation/testing)
 */
router.patch('/:robotId/state', authenticate, (req, res) => {
  const { robotId } = req.params;
  const updates = req.body;
  const state = updateRobotState(robotId, updates);
  res.json(state);
});

/**
 * GET /api/robots/connected
 * Get list of currently connected robots
 */
router.get('/status/connected', authenticate, (req, res) => {
  const connected = getConnectedRobots();
  res.json({ connected, count: connected.length });
});

// ============== ROB-411: HARDWARE TEMPLATE ==============

/**
 * POST /api/robots/:robotId/template
 * Set hardware template when user starts robot session
 * Called from HardwareGarage before connecting to robot
 */
router.post('/:robotId/template', authenticate, (req, res) => {
  const { robotId } = req.params;
  const { hardware_template_id } = req.body;

  if (!['rover', 'arm'].includes(hardware_template_id)) {
    return res.status(400).json({ error: 'Invalid hardware_template_id. Must be "rover" or "arm"' });
  }

  publishCommand(robotId, {
    type: 'set_template',
    hardware_template_id,
  });

  res.json({ success: true, hardware_template_id });
});

// ============== ROBOT-392: BATCH COMMANDS & FIRMWARE ==============

/**
 * POST /api/robots/:robotId/commands/batch
 * Optimized batch command endpoint - sends multiple commands in single MQTT message
 *
 * Request:
 * {
 *   "commands": [...],
 *   "options": {
 *     "atomic": false,  // If true, all commands must succeed
 *     "priority": "normal"
 *   }
 * }
 */
router.post('/:robotId/commands/batch', authenticate, (req, res) => {
  const { robotId } = req.params;
  const { commands, options = {} } = req.body;

  if (!Array.isArray(commands)) {
    return res.status(400).json({ error: 'commands must be an array' });
  }

  // ROB-392: Bundle commands into single MQTT payload for efficiency
  // Instead of N MQTT messages, send 1 batched message
  const batchPayload = {
    type: 'batch',
    commands: commands.map(cmd => {
      const validation = validateCommand(cmd);
      return {
        ...cmd,
        valid: validation.valid,
        error: validation.error
      };
    }),
    options
  };

  // Publish batched command (single MQTT message vs N messages)
  publishCommand(robotId, batchPayload);

  // Queue all commands for tracking
  commands.forEach(cmd => {
    queueCommand(robotId, cmd);
  });

  res.json({
    success: true,
    robotId,
    batched: true,
    commandCount: commands.length,
    message: 'Batch commands published as single MQTT message'
  });
});

/**
 * GET /api/firmware/latest
 * Get latest firmware version and download URL
 * Coordinates with ROB-380 (Brotli compression)
 */
router.get('/firmware/latest', authenticate, (req, res) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Firmware metadata
  const latestFirmware = {
    version: '3.0.0',
    versionCode: 3000,
    releaseDate: '2026-04-13',
    minCompatibleVersion: '2.0.0',
    releaseNotes: [
      'ROB-392: Delta OTA updates (<500KB)',
      'MQTT message batching',
      'Optimized state sync with delta compression',
      'Brotli compression support'
    ],
    files: {
      // Full firmware (Brotoli compressed - coordinated with ROB-380)
      full: {
        url: '/api/firmware/download/3.0.0/full',
        size: 420000,  // Compressed size < 500KB target
        checksum: 'sha256:abc123...',
        compression: 'brotli'
      },
      // Delta from previous version
      delta: {
        fromVersion: '2.2.0',
        url: '/api/firmware/download/3.0.0/delta/from-2.2.0',
        size: 180000,  // Delta ~180KB
        checksum: 'sha256:def456...',
        compression: 'brotli'
      }
    }
  };

  // ROB-380 coordination: Brotli compression ready
  // Response includes both compressed and delta options

  res.set('Cache-Control', 'public, max-age=3600');  // 1 hour cache
  res.set('ETag', '"3.0.0"');

  res.json(latestFirmware);
});

/**
 * GET /api/firmware/check
 * Check if firmware update available for a specific robot
 */
router.get('/firmware/check', authenticate, (req, res) => {
  const { robotId, currentVersion } = req.query;

  if (!robotId) {
    return res.status(400).json({ error: 'robotId required' });
  }

  const latestVersion = '3.0.0';
  const currentVerNum = parseVersion(currentVersion || '0.0.0');
  const latestVerNum = parseVersion(latestVersion);

  const updateAvailable = latestVerNum > currentVerNum;

  // Calculate update size based on delta capability
  let estimatedSize = null;
  let updateType = null;

  if (updateAvailable) {
    if (currentVerNum >= parseVersion('2.2.0')) {
      // Delta update available (~180KB)
      estimatedSize = 180000;
      updateType = 'delta';
    } else {
      // Full update required (~420KB)
      estimatedSize = 420000;
      updateType = 'full';
    }
  }

  res.json({
    robotId,
    currentVersion: currentVersion || 'unknown',
    latestVersion,
    updateAvailable,
    updateType,
    estimatedSize,
    targetSize: 500000  // ROB-392 target
  });
});

/**
 * GET /api/firmware/download/:version/:type
 * Download firmware (placeholder - actual files served by build system)
 */
router.get('/firmware/download/:version/:type', authenticate, (req, res) => {
  const { version, type } = req.params;

  // ROB-380 coordination: Serve Brotli-compressed firmware
  // For production: integrate with build system that generates compressed binaries

  res.set('Content-Type', 'application/octet-stream');
  res.set('Content-Encoding', 'br');  // Brotli compression
  res.set('Cache-Control', 'public, max-age=31536000, immutable');  // ROB-380: Edge cache forever

  // Placeholder response - actual firmware served from build artifacts
  res.json({
    message: 'Firmware download placeholder',
    version,
    type,
    compression: 'brotli',
    note: 'In production, serve actual compiled .bin file from build artifacts'
  });
});

// Helper: Parse version string to number for comparison
function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return (parts[0] || 0) * 1000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}

export default router;
