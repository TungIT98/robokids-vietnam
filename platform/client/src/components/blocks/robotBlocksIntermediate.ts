/**
 * Intermediate (Ages 9-12) Robot block definitions with Vietnamese labels.
 * Adds sensors, loops, and conditional logic.
 */

export const intermediateBlockDefinitions: any[] = [
  // Movement - slightly more technical
  {
    type: 'robot_move_forward',
    message0: 'Tiến tới %1 bước',
    args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#4CAF50',
    tooltip: 'Di chuyển robot tiến tới',
    helpUrl: '',
  },
  {
    type: 'robot_move_backward',
    message0: 'Lùi lại %1 bước',
    args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#4CAF50',
    tooltip: 'Di chuyển robot lùi lại',
    helpUrl: '',
  },
  {
    type: 'robot_turn_left',
    message0: 'Quay trái %1 độ',
    args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#2196F3',
    tooltip: 'Robot quay sang trái',
    helpUrl: '',
  },
  {
    type: 'robot_turn_right',
    message0: 'Quay phải %1 độ',
    args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#2196F3',
    tooltip: 'Robot quay sang phải',
    helpUrl: '',
  },
  {
    type: 'robot_set_speed',
    message0: 'Đặt tốc độ %1',
    args0: [{ type: 'input_value', name: 'SPEED', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#FF9800',
    tooltip: 'Đặt tốc độ robot (0-100)',
    helpUrl: '',
  },
  {
    type: 'robot_wait',
    message0: 'Đợi %1 giây',
    args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#9C27B0',
    tooltip: 'Robot đợi một khoảng thời gian',
    helpUrl: '',
  },
  // Sensors - return values
  {
    type: 'robot_get_distance',
    message0: 'Đọc khoảng cách',
    output: 'Number',
    colour: '#00BCD4',
    tooltip: 'Đọc khoảng cách từ cảm biến siêu âm',
    helpUrl: '',
  },
  {
    type: 'robot_get_light_level',
    message0: 'Đọc ánh sáng',
    output: 'Number',
    colour: '#FFEB3B',
    tooltip: 'Đọc mức sáng từ cảm biến ánh sáng',
    helpUrl: '',
  },
  // Sound
  {
    type: 'robot_play_note',
    message0: 'Phát nốt %1 Hz trong %2 giây',
    args0: [
      { type: 'input_value', name: 'FREQUENCY', check: 'Number' },
      { type: 'input_value', name: 'DURATION', check: 'Number' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#E91E63',
    tooltip: 'Phát một nốt nhạc',
    helpUrl: '',
  },
  // LED
  {
    type: 'robot_led_on',
    message0: 'Bật LED',
    previousStatement: null,
    nextStatement: null,
    colour: '#F44336',
    tooltip: 'Bật đèn LED',
    helpUrl: '',
  },
  {
    type: 'robot_led_off',
    message0: 'Tắt LED',
    previousStatement: null,
    nextStatement: null,
    colour: '#F44336',
    tooltip: 'Tắt đèn LED',
    helpUrl: '',
  },
  // Loop
  {
    type: 'robot_repeat',
    message0: 'Lặp %1 lần',
    args0: [{ type: 'input_value', name: 'COUNT', check: 'Number' }],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#607D8B',
    tooltip: 'Lặp lại các hành động',
    helpUrl: '',
  },
  // Conditional
  {
    type: 'robot_if_sensor',
    message0: 'Nếu %1 %2 thì',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SENSOR',
        options: [['khoảng cách', 'DISTANCE'], ['ánh sáng', 'LIGHT']],
      },
      {
        type: 'field_dropdown',
        name: 'CONDITION',
        options: [['<', 'LT'], ['>', 'GT'], ['=', 'EQ']],
      },
    ],
    message1: 'thì làm: %1',
    args1: [{ type: 'input_statement', name: 'THEN' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#795548',
    tooltip: 'Làm gì đó nếu điều kiện cảm biến đúng',
    helpUrl: '',
  },
];

/**
 * Intermediate robot toolbox category (Vietnamese)
 */
export const intermediateToolboxCategory = `
<category name="Robot" colour="#4CAF50">
  <block type="robot_move_forward">
    <value name="STEPS">
      <shadow type="math_number"><field name="NUM">10</field></shadow>
    </value>
  </block>
  <block type="robot_move_backward">
    <value name="STEPS">
      <shadow type="math_number"><field name="NUM">10</field></shadow>
    </value>
  </block>
  <block type="robot_turn_left">
    <value name="DEGREES">
      <shadow type="math_number"><field name="NUM">90</field></shadow>
    </value>
  </block>
  <block type="robot_turn_right">
    <value name="DEGREES">
      <shadow type="math_number"><field name="NUM">90</field></shadow>
    </value>
  </block>
  <block type="robot_set_speed">
    <value name="SPEED">
      <shadow type="math_number"><field name="NUM">50</field></shadow>
    </value>
  </block>
  <block type="robot_wait">
    <value name="SECONDS">
      <shadow type="math_number"><field name="NUM">1</field></shadow>
    </value>
  </block>
  <block type="robot_get_distance"></block>
  <block type="robot_get_light_level"></block>
  <block type="robot_play_note">
    <value name="FREQUENCY">
      <shadow type="math_number"><field name="NUM">440</field></shadow>
    </value>
    <value name="DURATION">
      <shadow type="math_number"><field name="NUM">1</field></shadow>
    </value>
  </block>
  <block type="robot_led_on"></block>
  <block type="robot_led_off"></block>
  <block type="robot_repeat">
    <value name="COUNT">
      <shadow type="math_number"><field name="NUM">4</field></shadow>
    </value>
  </block>
  <block type="robot_if_sensor"></block>
</category>
`;
