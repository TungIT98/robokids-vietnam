import React, { useEffect, useRef, useState } from 'react';
import Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import './generators/robotGenerator';
import { robotBlockDefinitions, robotToolboxCategory } from './blocks/robotBlocks';

/**
 * Robot command types
 */
interface RobotCommand {
  type: string;
  params?: Record<string, unknown>;
}

interface RepeatCommand extends RobotCommand {
  type: 'repeat';
  params: {
    count: number;
    commands: RobotCommand[];
  };
}

interface ConditionalCommand extends RobotCommand {
  type: 'if_sensor';
  params: {
    sensor: 'DISTANCE' | 'LIGHT';
    condition: 'LT' | 'GT' | 'EQ';
    then: RobotCommand[];
  };
}

/**
 * Code generators for robot blocks
 */
javascriptGenerator.forBlock['robot_move_forward'] = function (block) {
  const steps = javascriptGenerator.valueToCode(block, 'STEPS', 0) || '0';
  const command: RobotCommand = {
    type: 'move_forward',
    params: { steps: parseInt(steps, 10) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_move_backward'] = function (block) {
  const steps = javascriptGenerator.valueToCode(block, 'STEPS', 0) || '0';
  const command: RobotCommand = {
    type: 'move_backward',
    params: { steps: parseInt(steps, 10) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_turn_left'] = function (block) {
  const degrees = javascriptGenerator.valueToCode(block, 'DEGREES', 0) || '0';
  const command: RobotCommand = {
    type: 'turn_left',
    params: { degrees: parseInt(degrees, 10) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_turn_right'] = function (block) {
  const degrees = javascriptGenerator.valueToCode(block, 'DEGREES', 0) || '0';
  const command: RobotCommand = {
    type: 'turn_right',
    params: { degrees: parseInt(degrees, 10) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_set_speed'] = function (block) {
  const speed = javascriptGenerator.valueToCode(block, 'SPEED', 0) || '50';
  const command: RobotCommand = {
    type: 'set_speed',
    params: { speed: parseInt(speed, 10) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_wait'] = function (block) {
  const seconds = javascriptGenerator.valueToCode(block, 'SECONDS', 0) || '1';
  const command: RobotCommand = {
    type: 'wait',
    params: { seconds: parseFloat(seconds) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_get_distance'] = function () {
  const command: RobotCommand = { type: 'get_distance' };
  return [JSON.stringify(command), 0];
};

javascriptGenerator.forBlock['robot_get_light_level'] = function () {
  const command: RobotCommand = { type: 'get_light_level' };
  return [JSON.stringify(command), 0];
};

javascriptGenerator.forBlock['robot_play_note'] = function (block) {
  const frequency = javascriptGenerator.valueToCode(block, 'FREQUENCY', 0) || '440';
  const duration = javascriptGenerator.valueToCode(block, 'DURATION', 0) || '1';
  const command: RobotCommand = {
    type: 'play_note',
    params: {
      frequency: parseInt(frequency, 10),
      duration: parseFloat(duration),
    },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_led_on'] = function () {
  const command: RobotCommand = { type: 'led_on' };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_led_off'] = function () {
  const command: RobotCommand = { type: 'led_off' };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_repeat'] = function (block) {
  const count = javascriptGenerator.valueToCode(block, 'COUNT', 0) || '1';
  const branchCode = javascriptGenerator.statementToCode(block, 'DO');
  const commands: RobotCommand[] = branchCode
    .split(',\n')
    .filter((c: string) => c.trim())
    .map((c: string) => {
      try {
        return JSON.parse(c.trim());
      } catch {
        return null;
      }
    })
    .filter((c): c is RobotCommand => c !== null);
  const command: RepeatCommand = {
    type: 'repeat',
    params: {
      count: parseInt(count, 10),
      commands,
    },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_if_sensor'] = function (block) {
  const sensor = block.getFieldValue('SENSOR');
  const condition = block.getFieldValue('CONDITION');
  const branchCode = javascriptGenerator.statementToCode(block, 'THEN');
  const commands: RobotCommand[] = branchCode
    .split(',\n')
    .filter((c: string) => c.trim())
    .map((c: string) => {
      try {
        return JSON.parse(c.trim());
      } catch {
        return null;
      }
    })
    .filter((c): c is RobotCommand => c !== null);
  const command: ConditionalCommand = {
    type: 'if_sensor',
    params: {
      sensor: sensor as 'DISTANCE' | 'LIGHT',
      condition: condition as 'LT' | 'GT' | 'EQ',
      then: commands,
    },
  };
  return JSON.stringify(command) + ',\n';
};

/**
 * Generate robot commands JSON from workspace
 */
function generateRobotCommands(workspace: Blockly.Workspace): string {
  const code = javascriptGenerator.workspaceToCode(workspace);
  const commands = code
    .split(',\n')
    .filter((c: string) => c.trim())
    .map((c: string) => {
      try {
        return JSON.parse(c.trim());
      } catch {
        return null;
      }
    })
    .filter((c: unknown) => c !== null);
  return JSON.stringify(commands, null, 2);
}

/**
 * BlocklyComponent - Main Blockly workspace with Robot blocks
 */
const BlocklyComponent: React.FC = () => {
  const blocklyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');

  useEffect(() => {
    if (!blocklyRef.current || workspaceRef.current) return;

    // Register robot block definitions
    Blockly.defineBlocksWithJsonArray(robotBlockDefinitions as any[]);

    // Inject Blockly workspace
    const workspace = Blockly.inject(blocklyRef.current, {
      toolbox: robotToolboxCategory,
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true,
      },
      trashcan: true,
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
    });

    workspaceRef.current = workspace;

    // Listen for changes
    workspace.addChangeListener(() => {
      const code = generateRobotCommands(workspace);
      setGeneratedCode(code);
    });

    return () => {
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, []);

  return (
    <div className="blockly-wrapper">
      <div ref={blocklyRef} className="blockly-workspace" />
      {generatedCode && (
        <div className="generated-commands">
          <h3>Robot Commands:</h3>
          <pre>{generatedCode}</pre>
        </div>
      )}
    </div>
  );
};

export default BlocklyComponent;
