# Windmill Python Script: Robot Path Simulator
# Simulates robot movement based on Blockly code

import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Tuple, Optional
import math

# Robot configuration
ROBOT_CONFIG = {
    "step_size_cm": 2.0,  # cm per step
    "turn_speed_deg_per_sec": 180,  # degrees per second
    "default_speed": 50,  # 0-100
    "start_x": 0.0,
    "start_y": 0.0,
    "start_angle": 0.0,  # degrees, 0 = facing right
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


def simulate_blockly_path(xml_string: str) -> Dict[str, Any]:
    """
    Simulates the robot path based on Blockly XML code.
    Returns the path coordinates and animation keyframes.
    """
    result = {
        "valid": True,
        "path": [],
        "waypoints": [],
        "final_position": {"x": 0, "y": 0, "angle": 0},
        "total_distance_cm": 0.0,
        "total_time_seconds": 0.0,
        "errors": [],
        "animation_frames": [],
    }

    try:
        root = ET.fromstring(xml_string)
    except ET.ParseError as e:
        result["valid"] = False
        result["errors"].append(f"XML parse error: {str(e)}")
        return result

    # Initialize robot state
    x = ROBOT_CONFIG["start_x"]
    y = ROBOT_CONFIG["start_y"]
    angle = ROBOT_CONFIG["start_angle"]  # degrees
    speed = ROBOT_CONFIG["default_speed"]

    # Starting waypoint
    result["waypoints"].append({
        "x": x,
        "y": y,
        "angle": angle,
        "action": "START",
        "time": 0.0,
    })
    result["path"].append([x, y])
    result["animation_frames"].append({
        "time": 0.0,
        "x": x,
        "y": y,
        "angle": angle,
    })

    time_elapsed = 0.0

    # Process blocks
    blocks = root.findall(".//block")
    for i, block in enumerate(blocks):
        block_type = block.get("type", "")

        if block_type == "robot_set_speed":
            value = parse_value(block, "SPEED")
            if value is not None:
                speed = value

        elif block_type == "robot_move_forward":
            value = parse_value(block, "STEPS")
            if value is None:
                result["errors"].append(f"Block {i}: Missing steps value")
                continue

            # Calculate movement
            distance = value * ROBOT_CONFIG["step_size_cm"]
            angle_rad = math.radians(angle)
            dx = distance * math.cos(angle_rad)
            dy = distance * math.sin(angle_rad)

            new_x = x + dx
            new_y = y + dy
            time_taken = (distance / speed) * 2 if speed > 0 else 1
            time_elapsed += time_taken

            # Add path segment
            result["path"].append([new_x, new_y])
            for t in [0.25, 0.5, 0.75, 1.0]:
                result["animation_frames"].append({
                    "time": time_elapsed * t + (time_elapsed - time_taken),
                    "x": x + dx * t,
                    "y": y + dy * t,
                    "angle": angle,
                })

            result["waypoints"].append({
                "x": new_x,
                "y": new_y,
                "angle": angle,
                "action": f"FORWARD {int(value)} steps",
                "time": time_elapsed,
                "distance": distance,
            })

            result["total_distance_cm"] += distance
            x, y = new_x, new_y

        elif block_type == "robot_move_backward":
            value = parse_value(block, "STEPS")
            if value is None:
                result["errors"].append(f"Block {i}: Missing steps value")
                continue

            distance = value * ROBOT_CONFIG["step_size_cm"]
            angle_rad = math.radians(angle)
            dx = -distance * math.cos(angle_rad)
            dy = -distance * math.sin(angle_rad)

            new_x = x + dx
            new_y = y + dy
            time_taken = (distance / speed) * 2 if speed > 0 else 1
            time_elapsed += time_taken

            result["path"].append([new_x, new_y])
            result["waypoints"].append({
                "x": new_x,
                "y": new_y,
                "angle": angle,
                "action": f"BACKWARD {int(value)} steps",
                "time": time_elapsed,
                "distance": distance,
            })

            result["total_distance_cm"] += distance
            x, y = new_x, new_y

        elif block_type == "robot_turn_left":
            value = parse_value(block, "DEGREES")
            if value is None:
                result["errors"].append(f"Block {i}: Missing degrees value")
                continue

            angle = (angle - value) % 360
            time_taken = value / ROBOT_CONFIG["turn_speed_deg_per_sec"]
            time_elapsed += time_taken

            result["waypoints"].append({
                "x": x,
                "y": y,
                "angle": angle,
                "action": f"TURN LEFT {int(value)}°",
                "time": time_elapsed,
            })

        elif block_type == "robot_turn_right":
            value = parse_value(block, "DEGREES")
            if value is None:
                result["errors"].append(f"Block {i}: Missing degrees value")
                continue

            angle = (angle + value) % 360
            time_taken = value / ROBOT_CONFIG["turn_speed_deg_per_sec"]
            time_elapsed += time_taken

            result["waypoints"].append({
                "x": x,
                "y": y,
                "angle": angle,
                "action": f"TURN RIGHT {int(value)}°",
                "time": time_elapsed,
            })

        elif block_type == "robot_wait":
            value = parse_value(block, "SECONDS")
            if value is None:
                result["errors"].append(f"Block {i}: Missing wait duration")
                continue

            time_elapsed += value
            result["waypoints"].append({
                "x": x,
                "y": y,
                "angle": angle,
                "action": f"WAIT {value}s",
                "time": time_elapsed,
            })

    # Final state
    result["total_time_seconds"] = time_elapsed
    result["final_position"] = {
        "x": round(x, 2),
        "y": round(y, 2),
        "angle": round(angle % 360, 1),
        "distance_from_start": round(math.sqrt(x**2 + y**2), 2),
    }

    # Add final animation frame
    result["animation_frames"].append({
        "time": time_elapsed,
        "x": x,
        "y": y,
        "angle": angle,
    })

    return result


def main(blockly_xml: str) -> Dict[str, Any]:
    """
    Windmill main function entry point.

    Usage:
        main(blockly_xml: str) -> Dict[str, Any]
    """
    return simulate_blockly_path(blockly_xml)


if __name__ == "__main__":
    # Test with sample XML
    sample_xml = """
    <xml>
        <block type="robot_move_forward">
            <value name="STEPS">
                <shadow type="math_number">
                    <field name="NUM">10</field>
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
        <block type="robot_move_forward">
            <value name="STEPS">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
    </xml>
    """
    result = main(sample_xml)
    print(f"Valid: {result['valid']}")
    print(f"Final position: {result['final_position']}")
    print(f"Total distance: {result['total_distance_cm']} cm")
    print(f"Total time: {result['total_time_seconds']} seconds")
    print(f"Waypoints: {len(result['waypoints'])}")
    for wp in result['waypoints']:
        print(f"  - {wp}")