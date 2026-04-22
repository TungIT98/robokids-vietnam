/**
 * Variable block definitions for Intermediate (Ages 9-12) and Advanced.
 * Allows storing sensor values, counters, and named variables.
 */

// Define the variable blocks
export const variableBlockDefinitions: any[] = [
  // Set variable
  {
    type: 'robot_set_variable',
    message0: 'đặt %1 = %2',
    args0: [
      {
        type: 'field_variable',
        name: 'VAR',
        variable: 'item',
      },
      { type: 'input_value', name: 'VALUE', check: 'Number' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: '#5C6BC0',
    tooltip: 'Lưu một giá trị vào biến',
    helpUrl: '',
  },
  // Get variable
  {
    type: 'robot_get_variable',
    message0: '%1',
    args0: [
      {
        type: 'field_variable',
        name: 'VAR',
        variable: 'item',
      },
    ],
    output: 'Number',
    colour: '#5C6BC0',
    tooltip: 'Lấy giá trị của biến',
    helpUrl: '',
  },
  // Math operation with variables
  {
    type: 'robot_math_variable',
    message0: '%1 %2 %3',
    args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      {
        type: 'field_dropdown',
        name: 'OP',
        options: [['+', 'ADD'], ['-', 'SUBTRACT'], ['×', 'MULTIPLY'], ['÷', 'DIVIDE']],
      },
      { type: 'input_value', name: 'B', check: 'Number' },
    ],
    output: 'Number',
    colour: '#5C6BC0',
    tooltip: 'Tính toán với hai số',
    helpUrl: '',
  },
];

/**
 * Variable toolbox category (Vietnamese)
 */
export const variableToolboxCategory = `
<category name="Biến" colour="#5C6BC0">
  <block type="robot_set_variable">
    <value name="VALUE">
      <shadow type="math_number"><field name="NUM">0</field></shadow>
    </value>
  </block>
  <block type="robot_get_variable"></block>
  <block type="robot_math_variable">
    <value name="A">
      <shadow type="math_number"><field name="NUM">0</field></shadow>
    </value>
    <value name="B">
      <shadow type="math_number"><field name="NUM">0</field></shadow>
    </value>
  </block>
  <block type="math_arithmetic">
    <field name="OP">ADD</field>
    <value name="A">
      <shadow type="math_number"><field name="NUM">0</field></shadow>
    </value>
    <value name="B">
      <shadow type="math_number"><field name="NUM">0</field></shadow>
    </value>
  </block>
</category>
`;