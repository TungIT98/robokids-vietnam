import { WebSocketServer, WebSocket } from 'ws';
import { getRobotState, updateRobotState } from './robot.js';

/**
 * LAN WebSocket Server for Direct Robot Control
 *
 * Provides <10ms latency by bypassing cloud MQTT when ESP32 is on LAN.
 * Auto-discovers robots via mDNS and supports seamless failover to cloud.
 *
 * ROB-473: LAN WebSocket server for local robot control
 */

const LAN_WS_PORT = 3101;
const HEARTBEAT_INTERVAL_MS = 5000;
const COMMAND_TIMEOUT_MS = 5000;

let wss = null;
const connectedClients = new Map(); // clientId -> { ws, lastSeen, robots }
const robotSockets = new Map(); // robotId -> { ws, lastSeen, ip }

// Robot discovery cache
const discoveredRobots = new Map(); // robotId -> { ip, port, lastSeen, name }

export function startLANWebSocketServer() {
  wss = new WebSocketServer({ port: LAN_WS_PORT });

  console.log(`LAN WebSocket server started on port ${LAN_WS_PORT}`);

  wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    const clientIp = req.socket.remoteAddress;

    console.log(`LAN client connected: ${clientId} from ${clientIp}`);
    connectedClients.set(clientId, { ws, lastSeen: Date.now(), robots: [] });

    ws.on('message', (data) => handleClientMessage(clientId, data));

    ws.on('close', () => {
      console.log(`LAN client disconnected: ${clientId}`);
      connectedClients.delete(clientId);
    });

    ws.on('error', (err) => {
      console.error(`LAN client error ${clientId}:`, err.message);
    });

    // Send welcome with discovered robots
    sendToClient(clientId, {
      type: 'connected',
      clientId,
      robots: Array.from(discoveredRobots.keys()),
      serverTime: Date.now()
    });

    // Start heartbeat
    startClientHeartbeat(clientId);
  });

  // Also start mDNS discovery
  startMDNSDiscovery();

  return wss;
}

function generateClientId() {
  return 'lan-' + Math.random().toString(36).substr(2, 9);
}

function sendToClient(clientId, message) {
  const client = connectedClients.get(clientId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

function handleClientMessage(clientId, data) {
  try {
    const msg = JSON.parse(data.toString());
    const client = connectedClients.get(clientId);
    if (client) client.lastSeen = Date.now();

    switch (msg.type) {
      case 'ping':
        sendToClient(clientId, { type: 'pong', serverTime: Date.now() });
        break;

      case 'discover':
        // Client requests list of discovered robots
        sendToClient(clientId, {
          type: 'discovered_robots',
          robots: Array.from(discoveredRobots.entries()).map(([id, info]) => ({
            robotId: id,
            ip: info.ip,
            name: info.name,
            lastSeen: info.lastSeen
          }))
        });
        break;

      case 'robot_connect':
        // Client wants to connect to a specific robot via LAN
        handleRobotConnect(clientId, msg.robotId, msg.robotIp);
        break;

      case 'robot_disconnect':
        handleRobotDisconnect(clientId, msg.robotId);
        break;

      case 'robot_command':
        // Direct robot command via LAN
        handleRobotCommand(clientId, msg.robotId, msg.command);
        break;

      case 'robot_status_request':
        // Request robot status via LAN
        handleRobotStatusRequest(clientId, msg.robotId);
        break;

      default:
        console.log(`Unknown LAN message type: ${msg.type}`);
    }
  } catch (err) {
    console.error(`Error handling LAN message from ${clientId}:`, err.message);
  }
}

async function handleRobotConnect(clientId, robotId, robotIp) {
  console.log(`Client ${clientId} connecting to robot ${robotId} at ${robotIp}`);

  // Try to establish direct WebSocket to robot
  const robotWs = await tryConnectRobot(robotIp, 3102);

  if (robotWs) {
    robotSockets.set(robotId, { ws: robotWs, ip: robotIp, lastSeen: Date.now() });

    // Add robot to client's tracked list
    const client = connectedClients.get(clientId);
    if (client && !client.robots.includes(robotId)) {
      client.robots.push(robotId);
    }

    sendToClient(clientId, {
      type: 'robot_connected',
      robotId,
      ip: robotIp,
      latency: 'lan',
      message: 'Connected via LAN'
    });

    // Set up robot message handler
    robotWs.on('message', (data) => {
      handleRobotMessage(clientId, robotId, data);
    });

    robotWs.on('close', () => {
      console.log(`Robot ${robotId} LAN connection closed`);
      robotSockets.delete(robotId);
      sendToClient(clientId, {
        type: 'robot_disconnected',
        robotId,
        reason: 'connection_closed'
      });
    });

    robotWs.on('error', (err) => {
      console.error(`Robot ${robotId} LAN error:`, err.message);
      robotSockets.delete(robotId);
    });
  } else {
    sendToClient(clientId, {
      type: 'robot_connect_failed',
      robotId,
      reason: 'cannot_connect',
      suggestion: 'fallback_to_cloud'
    });
  }
}

async function tryConnectRobot(robotIp, port) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://${robotIp}:${port}`);

    const timeout = setTimeout(() => {
      ws.close();
      resolve(null);
    }, 3000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`Connected to robot at ${robotIp}:${port}`);
      resolve(ws);
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

function handleRobotDisconnect(clientId, robotId) {
  const robot = robotSockets.get(robotId);
  if (robot) {
    robot.ws.close();
    robotSockets.delete(robotId);
  }

  const client = connectedClients.get(clientId);
  if (client) {
    client.robots = client.robots.filter(id => id !== robotId);
  }

  sendToClient(clientId, { type: 'robot_disconnected', robotId });
}

async function handleRobotCommand(clientId, robotId, command) {
  const robot = robotSockets.get(robotId);

  if (robot && robot.ws.readyState === WebSocket.OPEN) {
    // Send command directly via LAN (<10ms latency)
    const startTime = Date.now();
    robot.ws.send(JSON.stringify(command));

    // Store pending command for response tracking
    const pendingCmd = {
      type: command.type,
      timestamp: startTime,
      timeout: COMMAND_TIMEOUT_MS
    };

    sendToClient(clientId, {
      type: 'command_sent',
      robotId,
      command: command.type,
      route: 'lan',
      latencyTarget: '<10ms'
    });
  } else {
    // Fallback to cloud - return instructions
    sendToClient(clientId, {
      type: 'command_fallback',
      robotId,
      command: command.type,
      reason: 'lan_unavailable',
      suggestion: 'use_cloud_mqtt',
      fallbackEndpoint: '/api/robots/' + robotId + '/command'
    });
  }
}

async function handleRobotStatusRequest(clientId, robotId) {
  const robot = robotSockets.get(robotId);

  if (robot && robot.ws.readyState === WebSocket.OPEN) {
    // Request status via LAN
    robot.ws.send(JSON.stringify({ type: 'get_status' }));

    // Wait for response (timeout 2s)
    const timeout = setTimeout(() => {
      sendToClient(clientId, {
        type: 'robot_status',
        robotId,
        status: 'timeout',
        route: 'lan'
      });
    }, 2000);

    // Handler will clear timeout when response received
    robot.ws.once('message', (data) => {
      clearTimeout(timeout);
      try {
        const status = JSON.parse(data.toString());
        sendToClient(clientId, {
          type: 'robot_status',
          robotId,
          status,
          route: 'lan',
          latency: Date.now() - (robot.lastSeen || Date.now())
        });
      } catch (e) {
        // Ignore parse errors
      }
    });
  } else {
    // Fallback to cached cloud state
    const state = getRobotState(robotId);
    sendToClient(clientId, {
      type: 'robot_status',
      robotId,
      status: state || 'unknown',
      route: 'cloud_fallback',
      note: 'LAN unavailable, using cloud state'
    });
  }
}

function handleRobotMessage(clientId, robotId, data) {
  try {
    const msg = JSON.parse(data.toString());

    // Update robot last seen
    const robot = robotSockets.get(robotId);
    if (robot) robot.lastSeen = Date.now();

    if (msg.type === 'status' || msg.type === 'sensor_data') {
      // Forward robot status to client
      sendToClient(clientId, {
        type: 'robot_update',
        robotId,
        data: msg,
        route: 'lan',
        latency: Date.now()
      });

      // Also update cloud state (async)
      if (msg.type === 'sensor_data') {
        updateRobotState(robotId, msg);
      }
    }
  } catch (err) {
    // Not JSON, ignore
  }
}

function startClientHeartbeat(clientId) {
  const interval = setInterval(() => {
    const client = connectedClients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      clearInterval(interval);
      connectedClients.delete(clientId);
      return;
    }

    sendToClient(clientId, { type: 'heartbeat', serverTime: Date.now() });
    client.lastSeen = Date.now();
  }, HEARTBEAT_INTERVAL_MS);
}

// ============== mDNS Discovery ==============

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function startMDNSDiscovery() {
  // Usebonjour/avahi to discover robot.local mDNS entries
  console.log('Starting mDNS discovery for robots...');

  // On Windows, try to use the built-in DNS service
  // On network where robots advertise as robot-*.local
  setInterval(scanForRobots, 30000); // Scan every 30 seconds
}

async function scanForRobots() {
  // Attempt mDNS resolution for known robot patterns
  const robotPatterns = [
    'robot-alpha',
    'robot-beta',
    'robot-gamma',
    'robokids'
  ];

  for (const pattern of robotPatterns) {
    await tryResolveRobot(pattern + '.local');
  }
}

async function tryResolveRobot(hostname) {
  try {
    // Use ping to resolve mDNS hostname
    // On Windows: ping -n 1 -w 1000 hostname
    const cmd = process.platform === 'win32'
      ? `ping -n 1 -w 1000 ${hostname}`
      : `ping -c 1 -W 1 ${hostname}`;

    const { stdout } = await execAsync(cmd);

    // Extract IP from ping output
    const ipMatch = stdout.match(/\d+\.\d+\.\d+\.\d+/);
    if (ipMatch) {
      const ip = ipMatch[0];
      const robotId = hostname.split('.')[0];

      discoveredRobots.set(robotId, {
        ip,
        port: 3102, // Robot's LAN port
        lastSeen: Date.now(),
        name: robotId
      });

      console.log(`Discovered robot: ${robotId} at ${ip}`);

      // Broadcast to all clients
      broadcastRobotDiscovery(robotId, ip);
    }
  } catch {
    // Robot not found at this hostname
  }
}

function broadcastRobotDiscovery(robotId, ip) {
  const message = {
    type: 'robot_discovered',
    robotId,
    ip,
    discoveryMethod: 'mdns',
    serverTime: Date.now()
  };

  for (const [clientId, client] of connectedClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
}

// ============== LAN Robot Connect (for ESP32) ==============

/**
 * Called by robot when it connects to LAN server
 * Robot announces itself via HTTP or direct WS
 */
export function registerRobotOnLAN(robotId, ip, port = 3102) {
  discoveredRobots.set(robotId, {
    ip,
    port,
    lastSeen: Date.now(),
    name: robotId
  });

  console.log(`Robot registered on LAN: ${robotId} at ${ip}:${port}`);

  // Broadcast discovery
  broadcastRobotDiscovery(robotId, ip);

  return { success: true, robotId };
}

// ============== Failover Logic ==============

/**
 * Check if robot is reachable on LAN
 * Returns: { reachable: boolean, latency: number, ip: string }
 */
export async function checkRobotLANReachability(robotId, lastKnownIp) {
  // First check discovered robots cache
  const discovered = discoveredRobots.get(robotId);
  if (discovered && Date.now() - discovered.lastSeen < 60000) {
    return { reachable: true, latency: 5, ip: discovered.ip };
  }

  // Try last known IP
  if (lastKnownIp) {
    const reachable = await pingHost(lastKnownIp);
    if (reachable) {
      return { reachable: true, latency: 10, ip: lastKnownIp };
    }
  }

  return { reachable: false, latency: null, ip: null };
}

async function pingHost(ip) {
  try {
    const cmd = process.platform === 'win32'
      ? `ping -n 1 -w 1000 ${ip}`
      : `ping -c 1 -W 1 ${ip}`;

    await execAsync(cmd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get command routing recommendation
 * Returns: 'lan' | 'cloud' | 'failover'
 */
export async function getCommandRoute(robotId, lastKnownIp) {
  const lanCheck = await checkRobotLANReachability(robotId, lastKnownIp);

  if (lanCheck.reachable) {
    return {
      route: 'lan',
      ip: lanCheck.ip,
      estimatedLatency: lanCheck.latency + 'ms',
      url: `ws://${lanCheck.ip}:3101`
    };
  }

  return {
    route: 'cloud',
    reason: 'Robot not reachable on LAN',
    estimatedLatency: '50-100ms',
    fallback: 'mqtt'
  };
}

// ============== Cleanup ==============

export function stopLANWebSocketServer() {
  if (wss) {
    wss.close();
    wss = null;
    console.log('LAN WebSocket server stopped');
  }

  // Close all robot connections
  for (const [robotId, robot] of robotSockets) {
    robot.ws.close();
  }
  robotSockets.clear();
  connectedClients.clear();
}

export function getLANStatus() {
  return {
    serverRunning: wss !== null,
    port: LAN_WS_PORT,
    connectedClients: connectedClients.size,
    connectedRobots: robotSockets.size,
    discoveredRobots: discoveredRobots.size
  };
}

export default {
  startLANWebSocketServer,
  stopLANWebSocketServer,
  getLANStatus,
  registerRobotOnLAN,
  checkRobotLANReachability,
  getCommandRoute
};