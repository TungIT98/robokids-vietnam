/**
 * Advanced (Ages 13-16) Robot block definitions with Vietnamese technical labels.
 * Full block set with proper technical terminology.
 */

export const advancedBlockDefinitions: any[] = [
  // Movement - full technical terms
  {
    type: 'robot_move_forward',
    message0: 'Di chuyển thẳng %1 bước',
    args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#4CAF50',
    tooltip: 'Di chuyển robot thẳng về phía trước',
    helpUrl: '',
  },
  {
    type: 'robot_move_backward',
    message0: 'Di chuyển lùi %1 bước',
    args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#4CAF50',
    tooltip: 'Di chuyển robot lùi về phía sau',
    helpUrl: '',
  },
  {
    type: 'robot_turn_left',
    message0: 'Góc quay trái %1 độ',
    args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#2196F3',
    tooltip: 'Robot quay một góc sang trái',
    helpUrl: '',
  },
  {
    type: 'robot_turn_right',
    message0: 'Góc quay phải %1 độ',
    args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#2196F3',
    tooltip: 'Robot quay một góc sang phải',
    helpUrl: '',
  },
  {
    type: 'robot_set_speed',
    message0: 'Thiết lập tốc độ %1',
    args0: [{ type: 'input_value', name: 'SPEED', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#FF9800',
    tooltip: 'Đặt tốc độ robot (0-100)',
    helpUrl: '',
  },
  {
    type: 'robot_wait',
    message0: 'Trì hoãn %1 giây',
    args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#9C27B0',
    tooltip: 'Robot dừng lại trong khoảng thời gian',
    helpUrl: '',
  },
  // Sensors
  {
    type: 'robot_get_distance',
    message0: 'ultrasonic()',
    output: 'Number',
    colour: '#00BCD4',
    tooltip: 'Đọc khoảng cách từ cảm biến siêu âm (cm)',
    helpUrl: '',
  },
  {
    type: 'robot_get_light_level',
    message0: 'lightSensor()',
    output: 'Number',
    colour: '#FFEB3B',
    tooltip: 'Đọc cường độ ánh sáng (0-100)',
    helpUrl: '',
  },
  // Camera Light Sensor with directional raycasting
  {
    type: 'robot_camera_light_sensor',
    message0: 'cameraLightSensor() hướng: %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'DIRECTION',
        options: [
          ['phía trước', 'FORWARD'],
          ['phía sau', 'BACKWARD'],
          ['bên trái', 'LEFT'],
          ['bên phải', 'RIGHT'],
        ],
      },
    ],
    output: 'Number',
    colour: '#FFEB3B',
    tooltip: 'Đọc ánh sáng camera với raycasting 3D (0-100)',
    helpUrl: '',
  },
  // Line Tracker with 3-sensor IR array (LEFT, CENTER, RIGHT)
  {
    type: 'robot_line_tracker',
    message0: 'lineTracker()',
    output: 'String',
    colour: '#9C27B0',
    tooltip: 'Đọc cảm biến hồng ngoại dò line (LEFT/CENTER/RIGHT/NONE)',
    helpUrl: '',
  },
  // Sound
  {
    type: 'robot_play_note',
    message0: 'playNote(%1 Hz, %2 giây)',
    args0: [
      { type: 'input_value', name: 'FREQUENCY', check: 'Number' },
      { type: 'input_value', name: 'DURATION', check: 'Number' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#E91E63',
    tooltip: 'Phát một nốt nhạc với tần số và thời lượng',
    helpUrl: '',
  },
  // LED
  {
    type: 'robot_led_on',
    message0: 'LED bật',
    previousStatement: null,
    nextStatement: null,
    colour: '#F44336',
    tooltip: 'Bật đèn LED',
    helpUrl: '',
  },
  {
    type: 'robot_led_off',
    message0: 'LED tắt',
    previousStatement: null,
    nextStatement: null,
    colour: '#F44336',
    tooltip: 'Tắt đèn LED',
    helpUrl: '',
  },
  // Loop
  {
    type: 'robot_repeat',
    message0: 'vòng lặp %1 lần',
    args0: [{ type: 'input_value', name: 'COUNT', check: 'Number' }],
    message1: 'làm: %1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#607D8B',
    tooltip: 'Lặp lại các lệnh trong vòng lặp',
    helpUrl: '',
  },
  // Conditional
  {
    type: 'robot_if_sensor',
    message0: 'nếu %1 %2 thì',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SENSOR',
        options: [['ultrasonic()', 'DISTANCE'], ['lightSensor()', 'LIGHT']],
      },
      {
        type: 'field_dropdown',
        name: 'CONDITION',
        options: [['<', 'LT'], ['>', 'GT'], ['=', 'EQ']],
      },
    ],
    message1: 'thực hiện: %1',
    args1: [{ type: 'input_statement', name: 'THEN' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#795548',
    tooltip: 'Thực hiện lệnh nếu điều kiện cảm biến thỏa mãn',
    helpUrl: '',
  },
];

/**
 * Advanced robot toolbox category (Vietnamese)
 */
export const advancedToolboxCategory = `
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
  <block type="robot_camera_light_sensor"></block>
  <block type="robot_line_tracker"></block>
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
