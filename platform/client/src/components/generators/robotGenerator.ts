import { javascriptGenerator, Order } from 'blockly/javascript';

/**
 * Robot command code generator for Blockly.
 * Generates JSON command objects that can be sent to the robot.
 */

export interface RobotCommand {
  type: string;
  params?: Record<string, unknown>;
}

export interface RepeatCommand extends RobotCommand {
  type: 'repeat';
  params: {
    count: number;
    commands: RobotCommand[];
  };
}

export interface ConditionalCommand extends RobotCommand {
  type: 'if_sensor';
  params: {
    sensor: 'DISTANCE' | 'LIGHT';
    condition: 'LT' | 'GT' | 'EQ';
    value?: number;
    then: RobotCommand[];
  };
}

// Define code generators for each robot block
javascriptGenerator.forBlock['robot_move_forward'] = function (block) {
  const steps =
    javascriptGenerator.valueToCode(block, 'STEPS', Order.ATOMIC) || '0';
  const command: RobotCommand = {
    type: 'move_forward',
    params: { steps: parseInt(steps, 10) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_move_backward'] = function (block) {
  const steps =
    javascriptGenerator.valueToCode(block, 'STEPS', Order.ATOMIC) || '0';
  const command: RobotCommand = {
    type: 'move_backward',
    params: { steps: parseInt(steps, 10) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_turn_left'] = function (block) {
  const degrees =
    javascriptGenerator.valueToCode(block, 'DEGREES', Order.ATOMIC) || '0';
  const command: RobotCommand = {
    type: 'turn_left',
    params: { degrees: parseInt(degrees, 10) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_turn_right'] = function (block) {
  const degrees =
    javascriptGenerator.valueToCode(block, 'DEGREES', Order.ATOMIC) || '0';
  const command: RobotCommand = {
    type: 'turn_right',
    params: { degrees: parseInt(degrees, 10) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_set_speed'] = function (block) {
  const speed =
    javascriptGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '50';
  const command: RobotCommand = {
    type: 'set_speed',
    params: { speed: parseInt(speed, 10) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_wait'] = function (block) {
  const seconds =
    javascriptGenerator.valueToCode(block, 'SECONDS', Order.ATOMIC) || '1';
  const command: RobotCommand = {
    type: 'wait',
    params: { seconds: parseFloat(seconds) },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_get_distance'] = function (block) {
  const triggerPin = block.getFieldValue('TRIGGER_PIN') || 23;
  const echoPin = block.getFieldValue('ECHO_PIN') || 24;
  const command: RobotCommand = {
    type: 'get_distance',
    params: {
      triggerPin: parseInt(triggerPin, 10),
      echoPin: parseInt(echoPin, 10),
    },
  };
  return [JSON.stringify(command), 0];
};

javascriptGenerator.forBlock['robot_get_light_level'] = function () {
  const command: RobotCommand = {
    type: 'get_light_level',
  };
  return [JSON.stringify(command), 0];
};

javascriptGenerator.forBlock['robot_camera_light_sensor'] = function (block) {
  const direction = block.getFieldValue('DIRECTION') || 'FORWARD';
  const command: RobotCommand = {
    type: 'get_camera_light',
    params: { direction },
  };
  return [JSON.stringify(command), 0];
};

javascriptGenerator.forBlock['robot_line_tracker'] = function () {
  const command: RobotCommand = {
    type: 'line_tracker',
  };
  return [JSON.stringify(command), 0];
};

javascriptGenerator.forBlock['robot_play_note'] = function (block) {
  const frequency =
    javascriptGenerator.valueToCode(block, 'FREQUENCY', Order.ATOMIC) || '440';
  const duration =
    javascriptGenerator.valueToCode(block, 'DURATION', Order.ATOMIC) || '1';
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
  const command: RobotCommand = {
    type: 'led_on',
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_led_off'] = function () {
  const command: RobotCommand = {
    type: 'led_off',
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_repeat'] = function (block) {
  const count =
    javascriptGenerator.valueToCode(block, 'COUNT', Order.ATOMIC) || '1';
  const branchCode = javascriptGenerator.statementToCode(block, 'DO');
  const commands = branchCode
    .split(',\n')
    .filter((c: string) => c.trim())
    .map((c: string) => JSON.parse(c.trim()));
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
  const commands = branchCode
    .split(',\n')
    .filter((c: string) => c.trim())
    .map((c: string) => JSON.parse(c.trim()));
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

// Variable block generators
javascriptGenerator.forBlock['robot_set_variable'] = function (block) {
  const variable = block.getFieldValue('VAR');
  const value =
    javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  const command: RobotCommand = {
    type: 'set_variable',
    params: {
      name: variable,
      value: parseFloat(value),
    },
  };
  return JSON.stringify(command) + ',\n';
};

javascriptGenerator.forBlock['robot_get_variable'] = function (block) {
  const variable = block.getFieldValue('VAR');
  const command: RobotCommand = {
    type: 'get_variable',
    params: { name: variable },
  };
  return [JSON.stringify(command), 0];
};

javascriptGenerator.forBlock['robot_math_variable'] = function (block) {
  const op = block.getFieldValue('OP');
  const a =
    javascriptGenerator.valueToCode(block, 'A', Order.ATOMIC) || '0';
  const b =
    javascriptGenerator.valueToCode(block, 'B', Order.ATOMIC) || '0';
  const operatorMap: Record<string, string> = {
    ADD: '+',
    SUBTRACT: '-',
    MULTIPLY: '*',
    DIVIDE: '/',
  };
  const command: RobotCommand = {
    type: 'math_operation',
    params: {
      operator: operatorMap[op] || '+',
      a: parseFloat(a),
      b: parseFloat(b),
    },
  };
  return [JSON.stringify(command), 0];
};

/**
 * Generate robot commands JSON from Blockly workspace
 */
export function generateRobotCommands(workspace: any): string {
  const code = javascriptGenerator.workspaceToCode(workspace);
  // Parse individual JSON commands and wrap in array
  const commands = code
    .split(',\n')
    .filter((c) => c.trim())
    .map((c) => {
      try {
        return JSON.parse(c.trim());
      } catch {
        return null;
      }
    })
    .filter((c) => c !== null);
  return JSON.stringify(commands, null, 2);
}
