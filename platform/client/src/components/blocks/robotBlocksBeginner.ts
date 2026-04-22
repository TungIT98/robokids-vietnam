/**
 * Beginner (Ages 6-8) Robot block definitions with Vietnamese labels.
 * Simple, playful language appropriate for young children.
 */

export const beginnerBlockDefinitions: any[] = [
  // Movement - simple, playful
  {
    type: 'robot_move_forward',
    message0: 'Đi tới %1 bước',
    args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#4CAF50',
    tooltip: 'Di chuyển robot tới',
    helpUrl: '',
  },
  {
    type: 'robot_move_backward',
    message0: 'Đi lùi %1 bước',
    args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#4CAF50',
    tooltip: 'Di chuyển robot lùi lại',
    helpUrl: '',
  },
  {
    type: 'robot_turn_left',
    message0: 'Rẽ trái %1 độ',
    args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#2196F3',
    tooltip: 'Robot rẽ sang trái',
    helpUrl: '',
  },
  {
    type: 'robot_turn_right',
    message0: 'Rẽ phải %1 độ',
    args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#2196F3',
    tooltip: 'Robot rẽ sang phải',
    helpUrl: '',
  },
  {
    type: 'robot_wait',
    message0: 'Chờ %1 giây',
    args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }],
    previousStatement: null,
    nextStatement: null,
    colour: '#9C27B0',
    tooltip: 'Robot đợi một chút',
    helpUrl: '',
  },
  {
    type: 'robot_led_on',
    message0: 'Bật đèn',
    previousStatement: null,
    nextStatement: null,
    colour: '#F44336',
    tooltip: 'Bật đèn LED',
    helpUrl: '',
  },
  {
    type: 'robot_led_off',
    message0: 'Tắt đèn',
    previousStatement: null,
    nextStatement: null,
    colour: '#F44336',
    tooltip: 'Tắt đèn LED',
    helpUrl: '',
  },
];

/**
 * Beginner robot toolbox category (Vietnamese)
 */
export const beginnerToolboxCategory = `
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
  <block type="robot_wait">
    <value name="SECONDS">
      <shadow type="math_number"><field name="NUM">1</field></shadow>
    </value>
  </block>
  <block type="robot_led_on"></block>
  <block type="robot_led_off"></block>
</category>
`;
