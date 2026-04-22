import { useCallback, useRef } from 'react';
import { generateRobotCommands, RobotCommand } from '../components/generators/robotGenerator';

export interface SimulationCommand {
  type: string;
  params?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  commands: SimulationCommand[];
  error?: string;
}

/**
 * Hook that connects Blockly workspace to robot simulation.
 * Parses Blockly XML → robot commands → executes with real-time feedback.
 */
export function useBlocklySimulation() {
  const commandQueueRef = useRef<SimulationCommand[]>([]);
  const isExecutingRef = useRef(false);

  /**
   * Parse Blockly workspace and generate robot commands.
   * Returns the commands array for execution.
   */
  const parseWorkspace = useCallback((workspace: any): SimulationCommand[] => {
    try {
      const jsonStr = generateRobotCommands(workspace);
      const commands: SimulationCommand[] = JSON.parse(jsonStr);
      return commands;
    } catch (error) {
      console.error('Failed to parse Blockly workspace:', error);
      return [];
    }
  }, []);

  /**
   * Execute a single command and return the result.
   * This is called by the animation loop for smooth physics-based movement.
   */
  const executeSingleCommand = useCallback((
    command: SimulationCommand,
    robotState: { x: number; y: number; z: number; rotation: number },
    deltaTime: number
  ): { newState: typeof robotState; completed: boolean } => {
    const SPEED = 5; // units per second
    const TURN_SPEED = Math.PI / 2; // 90 degrees per second

    let { x, y, z, rotation } = robotState;
    let completed = false;

    switch (command.type) {
      case 'move_forward': {
        const steps = (command.params?.steps as number) || 1;
        const moveAmount = SPEED * deltaTime * steps;
        x += Math.cos(rotation) * moveAmount;
        z -= Math.sin(rotation) * moveAmount;
        completed = true;
        break;
      }
      case 'move_backward': {
        const steps = (command.params?.steps as number) || 1;
        const moveAmount = SPEED * deltaTime * steps;
        x -= Math.cos(rotation) * moveAmount;
        z += Math.sin(rotation) * moveAmount;
        completed = true;
        break;
      }
      case 'turn_left': {
        const degrees = (command.params?.degrees as number) || 90;
        const turnAmount = TURN_SPEED * deltaTime * (degrees / 90);
        rotation += turnAmount;
        if (turnAmount >= TURN_SPEED * deltaTime) {
          completed = true;
        }
        break;
      }
      case 'turn_right': {
        const degrees = (command.params?.degrees as number) || 90;
        const turnAmount = TURN_SPEED * deltaTime * (degrees / 90);
        rotation -= turnAmount;
        if (turnAmount >= TURN_SPEED * deltaTime) {
          completed = true;
        }
        break;
      }
      case 'wait': {
        // Wait is handled by the command queue timing
        completed = true;
        break;
      }
      case 'set_speed': {
        // Speed is informational in simulation
        completed = true;
        break;
      }
      case 'repeat': {
        // Repeat is expanded by the parser, not handled here
        completed = true;
        break;
      }
      case 'if_sensor': {
        // Conditional commands need sensor integration
        completed = true;
        break;
      }
      // Sensor commands complete immediately
      case 'get_distance':
      case 'get_light_level':
      case 'get_camera_light':
      case 'line_tracker':
      case 'led_on':
      case 'led_off':
      case 'play_note':
      case 'set_variable':
      case 'get_variable':
      case 'math_operation':
        completed = true;
        break;
      default:
        completed = true;
    }

    return { newState: { x, y, z, rotation }, completed };
  }, []);

  /**
   * Parse workspace and prepare commands for execution.
   * Returns normalized command list.
   */
  const prepareExecution = useCallback((workspace: any): ExecutionResult => {
    try {
      const commands = parseWorkspace(workspace);

      if (!Array.isArray(commands) || commands.length === 0) {
        return {
          success: false,
          commands: [],
          error: 'Không có lệnh nào để chạy! Thêm các khối robot vào workspace.'
        };
      }

      // Expand repeat commands
      const expandedCommands: SimulationCommand[] = [];
      for (const cmd of commands) {
        if (cmd.type === 'repeat') {
          const count = (cmd.params?.count as number) || 1;
          const subCommands = (cmd.params?.commands as SimulationCommand[]) || [];
          for (let i = 0; i < count; i++) {
            expandedCommands.push(...subCommands);
          }
        } else {
          expandedCommands.push(cmd);
        }
      }

      commandQueueRef.current = expandedCommands;
      isExecutingRef.current = true;

      return {
        success: true,
        commands: expandedCommands
      };
    } catch (error) {
      return {
        success: false,
        commands: [],
        error: 'Không thể phân tích mã Blockly. Kiểm tra lại các khối robot.'
      };
    }
  }, [parseWorkspace]);

  /**
   * Get the next command from the queue without removing it.
   */
  const peekCommand = useCallback((): SimulationCommand | null => {
    return commandQueueRef.current[0] || null;
  }, []);

  /**
   * Mark current command as completed and move to next.
   */
  const advanceCommand = useCallback((): void => {
    commandQueueRef.current.shift();
    if (commandQueueRef.current.length === 0) {
      isExecutingRef.current = false;
    }
  }, []);

  /**
   * Check if execution is in progress.
   */
  const isExecuting = useCallback((): boolean => {
    return isExecutingRef.current;
  }, []);

  /**
   * Get remaining command count.
   */
  const remainingCommands = useCallback((): number => {
    return commandQueueRef.current.length;
  }, []);

  /**
   * Stop execution and clear queue.
   */
  const stopExecution = useCallback((): void => {
    commandQueueRef.current = [];
    isExecutingRef.current = false;
  }, []);

  return {
    parseWorkspace,
    prepareExecution,
    executeSingleCommand,
    peekCommand,
    advanceCommand,
    isExecuting,
    remainingCommands,
    stopExecution
  };
}