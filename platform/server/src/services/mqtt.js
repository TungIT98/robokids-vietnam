import mqtt from 'mqtt';
import Aedes from 'aedes';
import { createServer } from 'net';

/**
 * MQTT Service for RoboKids Robot Communication
 *
 * This service manages:
 * - Embedded MQTT broker (Aedes)
 * - Connection to robot devices
 * - Command publishing and status subscription
 */

// MQTT Broker instance
let broker = null;
let brokerClient = null;
const connectedClients = new Map();
const commandCallbacks = new Map();

const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_USERNAME = process.env.MQTT_USERNAME || 'robokids';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'robot2026';

/**
 * Start the embedded MQTT broker
 */
export async function startBroker() {
  return new Promise((resolve, reject) => {
    const aedes = Aedes();

    broker = createServer(aedes.handle);

    broker.listen(MQTT_PORT, () => {
      console.log(`MQTT Broker running on port ${MQTT_PORT}`);
      resolve();
    });

    broker.on('error', (err) => {
      console.error('MQTT Broker error:', err);
      reject(err);
    });

    // Handle client connections
    aedes.on('client', (client) => {
      console.log(`Robot connected: ${client.id}`);
      connectedClients.set(client.id, {
        connectedAt: new Date(),
        client,
      });
    });

    aedes.on('clientDisconnect', (client) => {
      console.log(`Robot disconnected: ${client.id}`);
      connectedClients.delete(client.id);
    });

    // Handle incoming messages
    aedes.on('publish', (packet, client) => {
      if (!client) return;

      const topic = packet.topic;
      const payload = packet.payload.toString();

      // Handle status updates from robots
      if (topic.startsWith('robot/') && topic.endsWith('/status')) {
        handleRobotStatus(client.id, topic, payload);
      }

      // Handle sensor data from robots
      if (topic.startsWith('robot/') && topic.endsWith('/sensor')) {
        handleSensorData(client.id, topic, payload);
      }
    });

    // Create mqtt.js client for publishing commands (connects to local broker)
    brokerClient = mqtt.connect(`mqtt://localhost:${MQTT_PORT}`, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      clientId: 'server-publisher-' + Math.random().toString(16).substr(2, 8),
    });

    brokerClient.on('connect', () => {
      console.log('MQTT publisher client connected to broker');
    });

    brokerClient.on('error', (err) => {
      console.error('MQTT publisher client error:', err);
    });
  });
}

/**
 * Stop the MQTT broker
 */
export async function stopBroker() {
  if (brokerClient) {
    brokerClient.end();
    brokerClient = null;
  }
  if (broker) {
    broker.close();
    broker = null;
  }
}

/**
 * Get connected robot clients
 */
export function getConnectedRobots() {
  return Array.from(connectedClients.keys());
}

/**
 * Handle robot status updates
 */
function handleRobotStatus(clientId, topic, payload) {
  try {
    const status = JSON.parse(payload);
    console.log(`Robot ${clientId} status:`, status);

    // Notify command callbacks
    const callback = commandCallbacks.get(`status:${clientId}`);
    if (callback) {
      callback(status);
    }
  } catch (err) {
    console.error(`Invalid status payload from ${clientId}:`, err.message);
  }
}

/**
 * Handle sensor data from robots
 */
function handleSensorData(clientId, topic, payload) {
  try {
    const sensorData = JSON.parse(payload);
    console.log(`Robot ${clientId} sensor data:`, sensorData);

    // Notify command callbacks
    const callback = commandCallbacks.get(`sensor:${clientId}`);
    if (callback) {
      callback(sensorData);
    }
  } catch (err) {
    console.error(`Invalid sensor payload from ${clientId}:`, err.message);
  }
}

/**
 * Publish command to a specific robot
 */
export function publishCommand(robotId, command) {
  const topic = `robot/${robotId}/command`;
  const payload = JSON.stringify(command);

  console.log(`Publishing command to ${robotId}:`, command);

  // Publish via mqtt.js client connected to broker
  if (brokerClient && brokerClient.connected) {
    brokerClient.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error(`Failed to publish to ${topic}:`, err);
      } else {
        console.log(`Published to ${topic}:`, payload);
      }
    });
  } else {
    console.warn('MQTT broker client not connected, command not published');
  }

  return { topic, payload, robotId, command };
}

// ROB-392: Batch publish multiple commands as single MQTT message
// Reduces connection overhead and payload size
export function publishBatch(robotId, commands) {
  const topic = `robot/${robotId}/command`;
  const payload = JSON.stringify({
    type: 'batch',
    commands,
    timestamp: Date.now()
  });

  console.log(`Publishing batch of ${commands.length} commands to ${robotId}`);

  if (brokerClient && brokerClient.connected) {
    brokerClient.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error(`Failed to publish batch to ${topic}:`, err);
      } else {
        console.log(`Batch published to ${topic}`);
      }
    });
  } else {
    console.warn('MQTT broker client not connected, batch not published');
  }

  return { topic, payload, robotId, commandCount: commands.length };
}

/**
 * Subscribe to robot status updates
 */
export function subscribeToRobotStatus(robotId, callback) {
  commandCallbacks.set(`status:${robotId}`, callback);
}

/**
 * Subscribe to robot sensor data
 */
export function subscribeToSensorData(robotId, callback) {
  commandCallbacks.set(`sensor:${robotId}`, callback);
}

/**
 * Create MQTT client connection for external use
 */
export function createClient(options = {}) {
  const client = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883', {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    ...options,
  });

  return client;
}

export default {
  startBroker,
  stopBroker,
  getConnectedRobots,
  publishCommand,
  subscribeToRobotStatus,
  subscribeToSensorData,
  createClient,
};
