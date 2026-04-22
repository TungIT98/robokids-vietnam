/**
 * Robot block definitions for RoboKids Vietnam STEM platform.
 * These blocks allow students to program robots using visual blocks.
 */

// Block definitions as JSON
export const robotBlockDefinitions: any[] = [
  // 1. move_forward block
  {
    type: 'robot_move_forward',
    message0: 'move forward %1 steps',
    args0: [
      {
        type: 'input_value',
        name: 'STEPS',
        check: 'Number',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#4CAF50',
    tooltip: 'Move the robot forward',
    helpUrl: '',
  },

  // 2. move_backward block
  {
    type: 'robot_move_backward',
    message0: 'move backward %1 steps',
    args0: [
      {
        type: 'input_value',
        name: 'STEPS',
        check: 'Number',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#4CAF50',
    tooltip: 'Move the robot backward',
    helpUrl: '',
  },

  // 3. turn_left block
  {
    type: 'robot_turn_left',
    message0: 'turn left %1 degrees',
    args0: [
      {
        type: 'input_value',
        name: 'DEGREES',
        check: 'Number',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#2196F3',
    tooltip: 'Turn the robot left',
    helpUrl: '',
  },

  // 4. turn_right block
  {
    type: 'robot_turn_right',
    message0: 'turn right %1 degrees',
    args0: [
      {
        type: 'input_value',
        name: 'DEGREES',
        check: 'Number',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#2196F3',
    tooltip: 'Turn the robot right',
    helpUrl: '',
  },

  // 5. set_speed block
  {
    type: 'robot_set_speed',
    message0: 'set speed to %1',
    args0: [
      {
        type: 'input_value',
        name: 'SPEED',
        check: 'Number',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#FF9800',
    tooltip: 'Set robot movement speed (0-100)',
    helpUrl: '',
  },

  // 6. wait block
  {
    type: 'robot_wait',
    message0: 'wait %1 seconds',
    args0: [
      {
        type: 'input_value',
        name: 'SECONDS',
        check: 'Number',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#9C27B0',
    tooltip: 'Wait for a number of seconds',
    helpUrl: '',
  },

  // 7. get_distance block (sensor read - returns value) - Enhanced with trigger/echo pins
  {
    type: 'robot_get_distance',
    message0: 'ultrasonic sensor trigger: %1 echo: %2',
    args0: [
      {
        type: 'field_number',
        name: 'TRIGGER_PIN',
        value: 23,
        min: 0,
        max: 40,
      },
      {
        type: 'field_number',
        name: 'ECHO_PIN',
        value: 24,
        min: 0,
        max: 40,
      },
    ],
    output: 'Number',
    colour: '#00BCD4',
    tooltip: 'Get distance from ultrasonic sensor (HC-SR04). Trigger and Echo are GPIO pin numbers.',
    helpUrl: '',
  },

  // 8. get_light_level block (sensor read - returns value)
  {
    type: 'robot_get_light_level',
    message0: 'light level',
    output: 'Number',
    colour: '#FFEB3B',
    tooltip: 'Get light level from light sensor',
    helpUrl: '',
  },

  // 9. play_note block
  {
    type: 'robot_play_note',
    message0: 'play note frequency %1 Hz for %2 seconds',
    args0: [
      {
        type: 'input_value',
        name: 'FREQUENCY',
        check: 'Number',
      },
      {
        type: 'input_value',
        name: 'DURATION',
        check: 'Number',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#E91E63',
    tooltip: 'Play a musical note',
    helpUrl: '',
  },

  // 10. led_on block
  {
    type: 'robot_led_on',
    message0: 'LED on',
    previousStatement: null,
    nextStatement: null,
    colour: '#F44336',
    tooltip: 'Turn LED on',
    helpUrl: '',
  },

  // 11. led_off block
  {
    type: 'robot_led_off',
    message0: 'LED off',
    previousStatement: null,
    nextStatement: null,
    colour: '#F44336',
    tooltip: 'Turn LED off',
    helpUrl: '',
  },

  // 12. repeat_loop block
  {
    type: 'robot_repeat',
    message0: 'repeat %1 times',
    args0: [
      {
        type: 'input_value',
        name: 'COUNT',
        check: 'Number',
      },
    ],
    message1: '%1',
    args1: [
      {
        type: 'input_statement',
        name: 'DO',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#607D8B',
    tooltip: 'Repeat actions a number of times',
    helpUrl: '',
  },

  // 13. if_sensor block (condition)
  {
    type: 'robot_if_sensor',
    message0: 'if %1 sensor %2 then',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SENSOR',
        options: [
          ['distance', 'DISTANCE'],
          ['light', 'LIGHT'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'CONDITION',
        options: [
          ['<', 'LT'],
          ['>', 'GT'],
          ['=', 'EQ'],
        ],
      },
    ],
    message1: '%1',
    args1: [
      {
        type: 'input_statement',
        name: 'THEN',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#795548',
    tooltip: 'Execute actions based on sensor condition',
    helpUrl: '',
  },
];

/**
 * Toolbox definition for Robot category
 */
export const robotToolboxCategory: string = `
<category name="Robot" colour="#4CAF50">
  <block type="robot_move_forward">
    <value name="STEPS">
      <shadow type="math_number">
        <field name="NUM">10</field>
      </shadow>
    </value>
  </block>
  <block type="robot_move_backward">
    <value name="STEPS">
      <shadow type="math_number">
        <field name="NUM">10</field>
      </shadow>
    </value>
  </block>
  <block type="robot_turn_left">
    <value name="DEGREES">
      <shadow type="math_number">
        <field name="NUM">90</field>
      </shadow>
    </value>
  </block>
  <block type="robot_turn_right">
    <value name="DEGREES">
      <shadow type="math_number">
        <field name="NUM">90</field>
      </shadow>
    </value>
  </block>
  <block type="robot_set_speed">
    <value name="SPEED">
      <shadow type="math_number">
        <field name="NUM">50</field>
      </shadow>
    </value>
  </block>
  <block type="robot_wait">
    <value name="SECONDS">
      <shadow type="math_number">
        <field name="NUM">1</field>
      </shadow>
    </value>
  </block>
  <block type="robot_get_distance">
    <field name="TRIGGER_PIN">23</field>
    <field name="ECHO_PIN">24</field>
  </block>
  <block type="robot_get_light_level"></block>
  <block type="robot_play_note">
    <value name="FREQUENCY">
      <shadow type="math_number">
        <field name="NUM">440</field>
      </shadow>
    </value>
    <value name="DURATION">
      <shadow type="math_number">
        <field name="NUM">1</field>
      </shadow>
    </value>
  </block>
  <block type="robot_led_on"></block>
  <block type="robot_led_off"></block>
  <block type="robot_repeat">
    <value name="COUNT">
      <shadow type="math_number">
        <field name="NUM">4</field>
      </shadow>
    </value>
  </block>
  <block type="robot_if_sensor"></block>
</category>
`;
