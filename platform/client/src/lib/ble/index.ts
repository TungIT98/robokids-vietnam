/**
 * BLE Robot Service for RoboKids Web/Capacitor App
 *
 * Handles Bluetooth Low Energy communication with ESP32 robot
 * using @capacitor-community/bluetooth-le for native BLE access.
 *
 * Based on the robot_mqtt.ino firmware GATT service:
 *   Service UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
 *   Command Characteristic: beb5483e-36e1-4688-b7f5-ea07361b26a8 (write)
 *   Status Characteristic: beb5483f-36e1-4688-b7f5-ea07361b26a8 (notify)
 *   Sensor Characteristic: beb54840-36e1-4688-b7f5-ea07361b26a8 (notify)
 */

import { BluetoothLe, Device, DeviceId } from '@capacitor-community/bluetooth-le';

// BLE Service and Characteristic UUIDs (from robot_mqtt.ino)
const ROBOT_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const COMMAND_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const STATUS_CHAR_UUID = 'beb5483f-36e1-4688-b7f5-ea07361b26a8';
const SENSOR_CHAR_UUID = 'beb54840-36e1-4688-b7f5-ea07361b26a8';

// Robot prefix for scanning
const ROBOT_NAME_PREFIX = 'RoboKids';

// Command types matching the ESP32 firmware
export type RobotCommandType =
  | 'move_forward'
  | 'move_backward'
  | 'turn_left'
  | 'turn_right'
  | 'turn_left_degrees'
  | 'turn_right_degrees'
  | 'stop'
  | 'set_speed'
  | 'read_sensors'
  | 'display_text'
  | 'set_led_color'
  | 'play_note';

export interface RobotCommand {
  type: RobotCommandType;
  params?: Record<string, number | string>;
}

export interface RobotStatus {
  robotId: string;
  battery: number;
  distance: number;
  light: number;
  lineSensors: {
    left: boolean;
    center: boolean;
    right: boolean;
  };
  connected: boolean;
}

export interface DiscoveredRobot {
  id: string;
  name: string;
  rssi: number;
}

// BLE connection state
export type BLEConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

// Event emitter for BLE events
type ListenerFn = (...args: unknown[]) => void;
class BLEEventEmitter {
  private listeners: Map<string, Set<ListenerFn>> = new Map();

  on(event: string, listener: ListenerFn): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(...args);
      } catch (e) {
        console.error('[BLEEventEmitter] Listener error:', e);
      }
    });
  }
}

const emitter = new BLEEventEmitter();

// Singleton BLE instance
const ble = BluetoothLe;

// Parse status data from robot notification (base64 -> JSON)
function parseStatusData(base64Data: string): Partial<RobotStatus> | null {
  try {
    const jsonString = atob(base64Data);
    const data = JSON.parse(jsonString);
    return {
      robotId: '',
      battery: data.battery ?? 0,
      distance: data.distance ?? 0,
      light: data.light ?? 0,
      lineSensors: {
        left: data.lineSensors?.left ?? false,
        center: data.lineSensors?.center ?? false,
        right: data.lineSensors?.right ?? false,
      },
      connected: true,
    };
  } catch {
    // Sensor data is optional - return null if parse fails
    return null;
  }
}

// Encode command to base64 for BLE write
function encodeCommand(command: RobotCommand): string {
  const payload = { cmd: command.type, ...command.params };
  return btoa(JSON.stringify(payload));
}

// BLE device wrapper
class BLEDeviceWrapper {
  private device: Device | null = null;
  private statusCallback: ((status: RobotStatus) => void) | null = null;

  async connect(deviceId: string): Promise<boolean> {
    try {
      // Disconnect existing device first
      await this.disconnect();

      // Connect to device
      this.device = await ble.connect({ deviceId });

      // Discover services and characteristics
      await ble.discoverServices({ deviceId });

      // Subscribe to status notifications
      await ble.startNotifications({
        deviceId,
        service: ROBOT_SERVICE_UUID,
        characteristic: STATUS_CHAR_UUID,
      });

      await ble.startNotifications({
        deviceId,
        service: ROBOT_SERVICE_UUID,
        characteristic: SENSOR_CHAR_UUID,
      });

      // Set up event listener for notifications
      ble.addListener('onCharacteristicChanged', (event) => {
        if (event.deviceId === deviceId && event.value) {
          const parsed = parseStatusData(event.value);
          if (parsed && this.statusCallback) {
            this.statusCallback({ ...parsed, robotId: deviceId } as RobotStatus);
          }
        }
      });

      // Handle disconnection
      ble.addListener('onDisconnected', (event) => {
        if (event.deviceId === deviceId) {
          this.device = null;
          emitter.emit('disconnected', null);
        }
      });

      emitter.emit('connected', deviceId);
      return true;
    } catch (err) {
      console.error('[BLEDevice] Connect error:', err);
      this.device = null;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        await ble.disconnect({ deviceId: this.device.deviceId });
      } catch (e) {
        console.error('[BLEDevice] Disconnect error:', e);
      }
      this.device = null;
    }
  }

  async sendCommand(command: RobotCommand): Promise<boolean> {
    if (!this.device) return false;
    try {
      await ble.write({
        deviceId: this.device.deviceId,
        service: ROBOT_SERVICE_UUID,
        characteristic: COMMAND_CHAR_UUID,
        value: encodeCommand(command),
      });
      return true;
    } catch (err) {
      console.error('[BLEDevice] Send command error:', err);
      return false;
    }
  }

  setStatusCallback(callback: (status: RobotStatus) => void): void {
    this.statusCallback = callback;
  }
}

const bleDevice = new BLEDeviceWrapper();

// React hook for BLE
export function useBLE() {
  let connectionState: BLEConnectionState = 'disconnected';
  let discoveredRobots: DiscoveredRobot[] = [];
  let connectedRobot: DiscoveredRobot | null = null;
  let robotStatus: RobotStatus | null = null;
  let error: string | null = null;

  const listenersRef: (() => void)[] = [];

  // Initialize BLE
  const initialize = async (): Promise<boolean> => {
    try {
      await ble.initialize();
      return true;
    } catch (err) {
      console.error('[BLE] Init error:', err);
      return false;
    }
  };

  // Request BLE permissions and start scanning
  const startScanning = async (): Promise<void> => {
    try {
      error = null;
      connectionState = 'scanning';
      discoveredRobots = [];

      // Start scanning for devices
      await ble.requestDevice({
        services: [ROBOT_SERVICE_UUID],
        namePrefix: ROBOT_NAME_PREFIX,
      }).then(async (device) => {
        if (device?.deviceId) {
          emitter.emit('discovered', {
            id: device.deviceId,
            name: device.name || 'RoboKids Robot',
            rssi: -100,
          } as DiscoveredRobot);
        }
      }).catch(() => {
        // User cancelled or no device found
        connectionState = 'disconnected';
      });
    } catch (err) {
      connectionState = 'error';
      error = 'Failed to start scanning';
    }
  };

  // Stop scanning
  const stopScanning = async (): Promise<void> => {
    try {
      await ble.stopScan();
    } catch (e) {
      // Ignore
    }
    if (connectionState === 'scanning') {
      connectionState = 'disconnected';
    }
  };

  // Connect to a robot
  const connectToRobot = async (robotId: string): Promise<boolean> => {
    connectionState = 'connecting';
    error = null;

    const success = await bleDevice.connect(robotId);
    if (success) {
      connectedRobot = { id: robotId, name: '', rssi: -100 };
      connectionState = 'connected';
    } else {
      connectionState = 'error';
      error = 'Failed to connect';
    }
    return success;
  };

  // Disconnect from robot
  const disconnect = async (): Promise<void> => {
    await bleDevice.disconnect();
    connectedRobot = null;
    robotStatus = null;
    connectionState = 'disconnected';
  };

  // Send command to connected robot
  const sendCommand = async (command: RobotCommand): Promise<boolean> => {
    if (connectionState !== 'connected') {
      error = 'Not connected to any robot';
      return false;
    }
    return bleDevice.sendCommand(command);
  };

  // Convenience movement methods
  const moveForward = (speed = 50, duration = 1000) =>
    sendCommand({ type: 'move_forward', params: { speed, duration } });

  const moveBackward = (speed = 50, duration = 1000) =>
    sendCommand({ type: 'move_backward', params: { speed, duration } });

  const turnLeft = (degrees = 90) =>
    sendCommand({ type: 'turn_left_degrees', params: { degrees } });

  const turnRight = (degrees = 90) =>
    sendCommand({ type: 'turn_right_degrees', params: { degrees } });

  const stop = () => sendCommand({ type: 'stop' });

  const setSpeed = (speed: number) => sendCommand({ type: 'set_speed', params: { speed } });

  return {
    // State
    connectionState,
    discoveredRobots,
    connectedRobot,
    robotStatus,
    error,
    // Methods
    initialize,
    startScanning,
    stopScanning,
    connectToRobot,
    disconnect,
    sendCommand,
    moveForward,
    moveBackward,
    turnLeft,
    turnRight,
    stop,
    setSpeed,
  };
}

export default useBLE;