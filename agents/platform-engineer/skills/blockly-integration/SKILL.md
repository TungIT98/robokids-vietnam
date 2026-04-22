---
name: blockly-integration
description: >
  Use when: Integrating Blockly editor, creating custom blocks, generating code
  Do NOT use when: Backend API work, styling only
---

# Blockly Integration Skill

## Overview
Blockly is a drag-drop code editor from Google. We use it to let kids program robots.

## Custom Robot Blocks

### Movement Blocks
```javascript
// move_forward block
Blockly.Blocks.move_forward = {
  init: function() {
    this.appendValueInput("SPEED")
      .setCheck("Number")
      .appendField("Di chuyển tới tốc độ");
    this.appendValueInput("TIME")
      .setCheck("Number")
      .appendField("trong thời gian");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(120);
  }
};

// Generator
Blockly.Python.move_forward = function(block) {
  const speed = Blockly.Python.valueToCode(block, 'SPEED', Blockly.Python.ORDER_ATOMIC);
  const time = Blockly.Python.valueToCode(block, 'TIME', Blockly.Python.ORDER_ATOMIC);
  return `robot.move_forward(speed=${speed}, time=${time})\n`;
};
```

### Sensor Blocks
```javascript
Blockly.Blocks.read_ultrasonic = {
  init: function() {
    this.appendDummyInput()
      .appendField("Đọc cảm biến khoảng cách");
    this.setOutput(true, "Number");
    this.setColour(180);
  }
};

Blockly.Python.read_ultrasonic = function(block) {
  return ["robot.read_ultrasonic()", Blockly.Python.ORDER_FUNCTION_CALL];
};
```

## Block Categories
| Category | Color | Blocks |
|----------|-------|--------|
| Movement | Blue (120) | move_forward, turn, stop |
| Sensors | Green (180) | ultrasonic, line_follower |
| Control | Yellow (60) | wait, repeat, if |
| Sound | Purple (270) | play_note, beep |

## Code Generation Flow
1. Kid drags blocks
2. Blocks stored as JSON
3. Generate Python from blocks
4. Send to robot via MQTT
5. Robot executes

## Resources
- Blockly docs: https://developers.google.com/blockly
- Blockly playground: https://blockly-demo.appspot.com
