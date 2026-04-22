# Windmill Python Script: Blockly Code Analyzer
# Analyzes student Blockly code and provides feedback

import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional
from wmill import wmill

# Block type mappings to semantic meanings
BLOCK_INFO = {
    "robot_move_forward": {"action": "move", "direction": "forward", "unit": "steps"},
    "robot_move_backward": {"action": "move", "direction": "backward", "unit": "steps"},
    "robot_turn_left": {"action": "turn", "direction": "left", "unit": "degrees"},
    "robot_turn_right": {"action": "turn", "direction": "right", "unit": "degrees"},
    "robot_set_speed": {"action": "set_speed", "unit": "0-100"},
    "robot_wait": {"action": "wait", "unit": "seconds"},
    "robot_get_distance": {"action": "sensor", "sensor": "ultrasonic"},
    "robot_get_light_level": {"action": "sensor", "sensor": "light"},
    "robot_play_note": {"action": "play_note", "unit": "Hz"},
    "robot_led_on": {"action": "led", "state": "on"},
    "robot_led_off": {"action": "led", "state": "off"},
    "robot_repeat": {"action": "loop", "unit": "times"},
    "robot_if_sensor": {"action": "conditional", "sensor_check": True},
}

# Reasonable limits for robot commands
LIMITS = {
    "steps": (1, 1000),
    "degrees": (1, 3600),
    "seconds": (0.1, 60),
    "speed": (0, 100),
    "frequency": (20, 20000),
    "repeat_count": (1, 1000),
}


def parse_value(element: ET.Element, name: str) -> Any:
    """Extract value from XML block element."""
    for child in element.findall(f".//*[@name='{name}']"):
        shadow = child.find(".//shadow[@type='math_number']")
        if shadow is not None:
            field = shadow.find("field[@name='NUM']")
            if field is not None:
                try:
                    return float(field.text)
                except (ValueError, TypeError):
                    return None
        field = child.find("field[@name='NUM']")
        if field is not None:
            try:
                return float(field.text)
            except (ValueError, TypeError):
                return None
    return None


def parse_block(element: ET.Element) -> Dict[str, Any]:
    """Parse a single Blockly block element."""
    block_type = element.get("type", "unknown")
    block_data = {
        "type": block_type,
        "id": element.get("id", ""),
        "valid": True,
        "errors": [],
        "warnings": [],
    }

    if block_type not in BLOCK_INFO:
        block_data["valid"] = False
        block_data["errors"].append(f"Unknown block type: {block_type}")
        return block_data

    info = BLOCK_INFO[block_type]

    # Parse specific block types
    if info["action"] == "move":
        value = parse_value(element, "STEPS")
        if value is None:
            block_data["valid"] = False
            block_data["errors"].append("Missing steps value")
        else:
            block_data["value"] = value
            block_data["value_type"] = "steps"
            if not (LIMITS["steps"][0] <= value <= LIMITS["steps"][1]):
                block_data["warnings"].append(
                    f"Steps value {value} outside typical range ({LIMITS['steps']})"
                )

    elif info["action"] == "turn":
        value = parse_value(element, "DEGREES")
        if value is None:
            block_data["valid"] = False
            block_data["errors"].append("Missing degrees value")
        else:
            block_data["value"] = value
            block_data["value_type"] = "degrees"
            if not (LIMITS["degrees"][0] <= value <= LIMITS["degrees"][1]):
                block_data["warnings"].append(
                    f"Degrees value {value} outside typical range ({LIMITS['degrees']})"
                )

    elif info["action"] == "set_speed":
        value = parse_value(element, "SPEED")
        if value is None:
            block_data["warnings"].append("Speed not explicitly set, using default")
        else:
            block_data["value"] = value
            block_data["value_type"] = "speed"
            if not (LIMITS["speed"][0] <= value <= LIMITS["speed"][1]):
                block_data["warnings"].append(
                    f"Speed value {value} outside valid range (0-100)"
                )

    elif info["action"] == "wait":
        value = parse_value(element, "SECONDS")
        if value is None:
            block_data["valid"] = False
            block_data["errors"].append("Missing wait duration")
        else:
            block_data["value"] = value
            block_data["value_type"] = "seconds"
            if not (LIMITS["seconds"][0] <= value <= LIMITS["seconds"][1]):
                block_data["warnings"].append(
                    f"Wait duration {value}s outside typical range ({LIMITS['seconds']})"
                )

    elif info["action"] == "play_note":
        freq = parse_value(element, "FREQUENCY")
        dur = parse_value(element, "DURATION")
        if freq is None:
            block_data["valid"] = False
            block_data["errors"].append("Missing frequency value")
        else:
            block_data["frequency"] = freq
            if not (LIMITS["frequency"][0] <= freq <= LIMITS["frequency"][1]):
                block_data["warnings"].append(
                    f"Frequency {freq}Hz outside audible range"
                )
        if dur is not None:
            block_data["duration"] = dur

    elif info["action"] == "loop":
        value = parse_value(element, "COUNT")
        if value is None:
            block_data["valid"] = False
            block_data["errors"].append("Missing repeat count")
        else:
            block_data["value"] = int(value)
            block_data["value_type"] = "repeat_count"
            if not (1 <= value <= 100):
                block_data["warnings"].append(
                    f"Repeat count {value} is very high"
                )

    return block_data


def analyze_blockly_xml(xml_string: str) -> Dict[str, Any]:
    """Main analysis function for Blockly XML code."""
    result = {
        "valid": True,
        "total_blocks": 0,
        "blocks": [],
        "errors": [],
        "warnings": [],
        "statistics": {
            "move_forward": 0,
            "move_backward": 0,
            "turns": 0,
            "waits": 0,
            "sensors": 0,
            "loops": 0,
            "conditionals": 0,
        },
        "estimated_time_seconds": 0.0,
        "feedback": [],
    }

    try:
        root = ET.fromstring(xml_string)
    except ET.ParseError as e:
        result["valid"] = False
        result["errors"].append(f"XML parse error: {str(e)}")
        return result

    # Find all block elements
    blocks = root.findall(".//block")
    result["total_blocks"] = len(blocks)

    for block_elem in blocks:
        parsed = parse_block(block_elem)
        result["blocks"].append(parsed)

        if not parsed["valid"]:
            result["valid"] = False
            result["errors"].extend(parsed["errors"])

        result["warnings"].extend(parsed["warnings"])

        # Update statistics
        block_type = parsed["type"]
        if block_type == "robot_move_forward":
            result["statistics"]["move_forward"] += 1
            if parsed.get("value"):
                result["estimated_time_seconds"] += parsed["value"] * 0.1
        elif block_type == "robot_move_backward":
            result["statistics"]["move_backward"] += 1
            if parsed.get("value"):
                result["estimated_time_seconds"] += parsed["value"] * 0.1
        elif block_type in ("robot_turn_left", "robot_turn_right"):
            result["statistics"]["turns"] += 1
            result["estimated_time_seconds"] += 0.5
        elif block_type == "robot_wait":
            result["statistics"]["waits"] += 1
            if parsed.get("value"):
                result["estimated_time_seconds"] += parsed["value"]
        elif block_type in ("robot_get_distance", "robot_get_light_level"):
            result["statistics"]["sensors"] += 1
            result["estimated_time_seconds"] += 0.05
        elif block_type == "robot_repeat":
            result["statistics"]["loops"] += 1
        elif block_type == "robot_if_sensor":
            result["statistics"]["conditionals"] += 1

    # Generate feedback
    stats = result["statistics"]

    if stats["move_forward"] == 0 and stats["move_backward"] == 0:
        result["feedback"].append(
            "Tip: Your robot doesn't move forward or backward. "
            "Add some movement blocks to see your robot in action!"
        )

    if stats["turns"] == 0:
        result["feedback"].append(
            "Tip: Try adding turn blocks to navigate around obstacles."
        )

    if stats["waits"] == 0:
        result["feedback"].append(
            "Tip: Adding wait blocks can help your robot complete actions "
            "before moving to the next step."
        )

    if stats["sensors"] == 0:
        result["feedback"].append(
            "Tip: Sensors can help your robot make decisions based on "
            "its environment. Try using the ultrasonic sensor!"
        )

    if stats["loops"] > 0:
        result["feedback"].append(
            f"Great job using {stats['loops']} loop(s)! "
            "Loops help you repeat actions efficiently."
        )

    if result["estimated_time_seconds"] > 30:
        result["feedback"].append(
            f"Estimated runtime: {result['estimated_time_seconds']:.1f} seconds. "
            "That's a long program! Consider if some waits can be shortened."
        )

    if result["valid"] and len(result["errors"]) == 0:
        result["feedback"].insert(
            0, "✓ Your code looks good! No errors found."
        )

    return result


def main(blockly_xml: str) -> Dict[str, Any]:
    """
    Windmill main function entry point.

    Usage:
        main(blockly_xml: str) -> Dict[str, Any]
    """
    result = analyze_blockly_xml(blockly_xml)
    return result


if __name__ == "__main__":
    # Test with sample XML
    sample_xml = """
    <xml>
        <block type="robot_set_speed">
            <value name="SPEED">
                <shadow type="math_number">
                    <field name="NUM">50</field>
                </shadow>
            </value>
        </block>
        <block type="robot_move_forward">
            <value name="STEPS">
                <shadow type="math_number">
                    <field name="NUM">100</field>
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
        <block type="robot_wait">
            <value name="SECONDS">
                <shadow type="math_number">
                    <field name="NUM">2</field>
                </shadow>
            </value>
        </block>
    </xml>
    """
    result = main(sample_xml)
    print(f"Valid: {result['valid']}")
    print(f"Blocks: {result['total_blocks']}")
    print(f"Stats: {result['statistics']}")
    print(f"Feedback: {result['feedback']}")