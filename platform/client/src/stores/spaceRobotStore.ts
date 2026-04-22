import { create } from 'zustand';
import { gamificationApi } from '../services/gamificationApi';
import {
  calculateLightLevel,
  calculateDistance,
  readLineTracker,
  getAmbientLightLevel,
  LightDirection,
  LinePosition
} from '../utils/sensorUtils';

export type RobotCommand =
  | 'move_forward'
  | 'move_backward'
  | 'turn_left'
  | 'turn_right'
  | 'jump'
  | 'dance'
  | 'wave'
  | 'get_distance'
  | 'get_light_level'
  | 'get_camera_light'
  | 'line_tracker';

export type SensorResult = {
  type: 'distance' | 'light' | 'camera_light' | 'line';
  value: number | string;
};

export interface Mission {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  targetPosition: { x: number; y: number; z: number };
  completed: boolean;
  requiredCommands: RobotCommand[];
}

export type HardwareTemplate = 'rover' | 'arm' | null;

interface SpaceRobotState {
  position: { x: number; y: number; z: number };
  rotation: number;
  isExecuting: boolean;
  currentCommand: RobotCommand | null;
  commandHistory: RobotCommand[];
  missions: Mission[];
  activeMissionId: string | null;
  score: number;
  xpEarned: number;
  lastBadgeEarned: string | null;
  hardwareTemplateId: HardwareTemplate;
  connectedRobotId: string | null;

  // Sensor state
  cameraLightDirection: LightDirection;
  lastSensorReading: number | string | null;

  // Robot internal state visualization (ROB-697)
  batteryLevel: number; // 0-100 percentage
  batteryCharging: boolean;
  ledColor: string; // hex color
  ledOn: boolean;
  motorSpeed: number; // 0-100 percentage
  signalStrength: number; // 0-100 percentage
  wifiConnected: boolean;

  // Actions
  executeCommand: (command: RobotCommand) => void;
  readSensor: (sensorType: 'get_distance' | 'get_light_level' | 'get_camera_light' | 'line_tracker', direction?: LightDirection) => number | string;
  setPosition: (position: { x: number; y: number; z: number }) => void;
  setRotation: (rotation: number) => void;
  setExecuting: (executing: boolean) => void;
  setActiveMission: (missionId: string | null) => void;
  completeMission: (missionId: string) => void;
  awardXP: (amount: number) => Promise<void>;
  setHardwareTemplate: (id: HardwareTemplate) => void;
  setConnectedRobotId: (id: string | null) => void;
  setCameraLightDirection: (direction: LightDirection) => void;
  resetRobot: () => void;
  setBatteryLevel: (level: number) => void;
  setLedState: (on: boolean, color?: string) => void;
  setMotorSpeed: (speed: number) => void;
  setSignalStrength: (strength: number) => void;
}

const initialMissions: Mission[] = [
  {
    id: 'mission-1',
    title: '🚀 First Steps',
    description: 'Move the robot forward to reach the first checkpoint',
    difficulty: 'beginner',
    targetPosition: { x: 5, y: 0, z: 0 },
    completed: false,
    requiredCommands: ['move_forward'],
  },
  {
    id: 'mission-2',
    title: '🌟 Galaxy Tour',
    description: 'Navigate through space to visit the nebula',
    difficulty: 'beginner',
    targetPosition: { x: 10, y: 0, z: 5 },
    completed: false,
    requiredCommands: ['move_forward', 'turn_right', 'move_forward'],
  },
  {
    id: 'mission-3',
    title: '🛸 Asteroid Dance',
    description: 'Perform a dance routine around the asteroid field',
    difficulty: 'intermediate',
    targetPosition: { x: 0, y: 0, z: 0 },
    completed: false,
    requiredCommands: ['turn_left', 'move_forward', 'turn_right', 'move_backward', 'dance'],
  },
  {
    id: 'mission-4',
    title: '🌌 Space Station Rescue',
    description: 'Navigate to the space station and signal for docking',
    difficulty: 'advanced',
    targetPosition: { x: 15, y: 5, z: -20 },
    completed: false,
    requiredCommands: ['move_forward', 'turn_right', 'move_forward', 'jump', 'wave'],
  },
];

export const useSpaceRobotStore = create<SpaceRobotState>((set, get) => ({
  position: { x: 0, y: 0, z: 0 },
  rotation: 0,
  isExecuting: false,
  currentCommand: null,
  commandHistory: [],
  missions: initialMissions,
  activeMissionId: null,
  score: 0,
  xpEarned: 0,
  lastBadgeEarned: null,
  hardwareTemplateId: null,
  connectedRobotId: null,
  cameraLightDirection: 'FORWARD',
  lastSensorReading: null,

  // Robot internal state (ROB-697)
  batteryLevel: 100,
  batteryCharging: false,
  ledColor: '#00f0ff',
  ledOn: false,
  motorSpeed: 0,
  signalStrength: 85,
  wifiConnected: true,

  executeCommand: (command: RobotCommand) => {
    set({ isExecuting: true, currentCommand: command, motorSpeed: 75 });

    setTimeout(() => {
      const state = get();
      let newPosition = { ...state.position };
      let newRotation = state.rotation;

      switch (command) {
        case 'move_forward':
          newPosition.x += Math.cos(state.rotation) * 1;
          newPosition.z -= Math.sin(state.rotation) * 1;
          break;
        case 'move_backward':
          newPosition.x -= Math.cos(state.rotation) * 1;
          newPosition.z += Math.sin(state.rotation) * 1;
          break;
        case 'turn_left':
          newRotation += Math.PI / 4;
          break;
        case 'turn_right':
          newRotation -= Math.PI / 4;
          break;
        case 'jump':
          newPosition.y = 1;
          setTimeout(() => {
            set((s) => ({ position: { ...s.position, y: 0 } }));
          }, 500);
          break;
        case 'dance':
          newRotation += Math.PI * 2;
          break;
        case 'wave':
          break;
        // Sensor commands don't change position
        case 'get_distance':
        case 'get_light_level':
        case 'get_camera_light':
        case 'line_tracker':
          break;
      }

      // Drain battery slightly when executing commands
      const newBattery = Math.max(0, state.batteryLevel - 0.5);

      set({
        position: newPosition,
        rotation: newRotation,
        isExecuting: false,
        currentCommand: null,
        commandHistory: command.startsWith('get_') || command === 'line_tracker'
          ? state.commandHistory
          : [...state.commandHistory, command],
        motorSpeed: 0,
        batteryLevel: newBattery,
      });
    }, 1000);
  },

  readSensor: (sensorType, direction) => {
    const state = get();
    let reading: number | string;

    switch (sensorType) {
      case 'get_distance':
        reading = calculateDistance(state.position, 'FORWARD', state.rotation);
        break;
      case 'get_light_level':
        reading = getAmbientLightLevel(state.position);
        break;
      case 'get_camera_light':
        reading = calculateLightLevel(state.position, direction || state.cameraLightDirection, state.rotation);
        break;
      case 'line_tracker':
        reading = readLineTracker(state.position.x, state.position.z, state.rotation);
        break;
      default:
        reading = 0;
    }

    set({ lastSensorReading: reading });
    return reading;
  },

  setPosition: (position) => set({ position }),
  setRotation: (rotation) => set({ rotation }),
  setExecuting: (executing) => set({ isExecuting: executing }),
  setActiveMission: (missionId) => set({ activeMissionId: missionId }),
  completeMission: async (missionId) => {
    const missions = get().missions.map((m) =>
      m.id === missionId ? { ...m, completed: true } : m
    );
    const completedCount = missions.filter((m) => m.completed).length;
    set({ missions, score: completedCount * 100 });

    // Award XP for mission completion
    const token = localStorage.getItem('token') || '';
    const studentId = localStorage.getItem('studentId') || '';
    if (!studentId || !token) return;

    // Determine XP reward based on difficulty
    const mission = missions.find(m => m.id === missionId);
    if (mission) {
      const xpReward = mission.difficulty === 'beginner' ? 50 :
                       mission.difficulty === 'intermediate' ? 100 : 200;
      try {
        await gamificationApi.awardXP(token, studentId, xpReward, `Completed: ${mission.title}`);
        set({ xpEarned: xpReward });
      } catch (err) {
        console.error('Failed to award mission XP:', err);
      }
    }
  },
  awardXP: async (amount: number) => {
    const token = localStorage.getItem('token') || '';
    const studentId = localStorage.getItem('studentId') || '';
    if (!studentId || !token) return;

    try {
      const result = await gamificationApi.awardXP(token, studentId, amount, 'Space Academy practice');
      set({ xpEarned: amount });
      if (result.levelUp) {
        // Level up notification could be handled here
        console.log('Level up! New level:', result.newLevel);
      }
    } catch (err) {
      console.error('Failed to award XP:', err);
    }
  },
  setHardwareTemplate: (id) => set({ hardwareTemplateId: id }),
  setConnectedRobotId: (id) => set({ connectedRobotId: id }),
  setCameraLightDirection: (direction) => set({ cameraLightDirection: direction }),

  resetRobot: () =>
    set({
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      isExecuting: false,
      currentCommand: null,
      commandHistory: [],
      xpEarned: 0,
      lastBadgeEarned: null,
      cameraLightDirection: 'FORWARD',
      lastSensorReading: null,
      batteryLevel: 100,
      batteryCharging: false,
      ledOn: false,
      ledColor: '#00f0ff',
      motorSpeed: 0,
    }),

  setBatteryLevel: (level) => set({ batteryLevel: Math.max(0, Math.min(100, level)) }),
  setLedState: (on, color) => set({ ledOn: on, ledColor: color || '#00f0ff' }),
  setMotorSpeed: (speed) => set({ motorSpeed: Math.max(0, Math.min(100, speed)) }),
  setSignalStrength: (strength) => set({ signalStrength: Math.max(0, Math.min(100, strength)) }),
}));