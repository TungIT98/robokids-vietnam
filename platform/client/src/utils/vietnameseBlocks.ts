/**
 * Vietnamese Block Labels for RoboKids Vietnam
 * Generates Vietnamese-labeled versions of robot blocks for different age groups.
 */

import { AgeGroupBlockConfig } from '../models/lesson';

export interface BlockLabelOverride {
  type: string;
  labelVi: string;
}

/**
 * Get default Vietnamese labels for robot blocks (beginner age group)
 */
export const defaultVietnameseLabels: Record<string, string> = {
  robot_move_forward: 'Di chuyển tới',
  robot_move_backward: 'Di chuyển lùi',
  robot_turn_left: 'Rẽ trái',
  robot_turn_right: 'Rẽ phải',
  robot_set_speed: 'Đặt tốc độ',
  robot_wait: 'Chờ',
  robot_get_distance: 'Cảm biến khoảng cách',
  robot_get_light_level: 'Cảm biến ánh sáng',
  robot_play_note: 'Chơi nốt nhạc',
  robot_led_on: 'Bật đèn',
  robot_led_off: 'Tắt đèn',
  robot_repeat: 'Lặp lại',
  robot_if_sensor: 'Nếu cảm biến',
};

/**
 * Intermediate labels (ages 9-12) - slightly more technical
 */
export const intermediateVietnameseLabels: Record<string, string> = {
  robot_move_forward: 'Tiến tới',
  robot_move_backward: 'Lùi lại',
  robot_turn_left: 'Quay trái',
  robot_turn_right: 'Quay phải',
  robot_set_speed: 'Đặt tốc độ',
  robot_wait: 'Đợi',
  robot_get_distance: 'Đọc khoảng cách',
  robot_get_light_level: 'Đọc ánh sáng',
  robot_play_note: 'Phát nốt nhạc',
  robot_led_on: 'Bật LED',
  robot_led_off: 'Tắt LED',
  robot_repeat: 'Lặp',
  robot_if_sensor: 'Nếu',
};

/**
 * Advanced labels (ages 13-16) - full technical terms
 */
export const advancedVietnameseLabels: Record<string, string> = {
  robot_move_forward: 'Di chuyển thẳng',
  robot_move_backward: 'Di chuyển lùi',
  robot_turn_left: 'Góc quay trái',
  robot_turn_right: 'Góc quay phải',
  robot_set_speed: 'Thiết lập tốc độ',
  robot_wait: 'Trì hoãn',
  robot_get_distance: ' ultrasonic()',
  robot_get_light_level: ' lightSensor()',
  robot_play_note: 'playNote()',
  robot_led_on: 'LED bật',
  robot_led_off: 'LED tắt',
  robot_repeat: 'vòng lặp',
  robot_if_sensor: 'điều kiện',
};

/**
 * Get labels for age group
 */
export function getVietnameseLabelsForAgeGroup(
  ageGroup: 'beginner' | 'intermediate' | 'advanced'
): Record<string, string> {
  switch (ageGroup) {
    case 'beginner':
      return defaultVietnameseLabels;
    case 'intermediate':
      return intermediateVietnameseLabels;
    case 'advanced':
      return advancedVietnameseLabels;
    default:
      return defaultVietnameseLabels;
  }
}

/**
 * Generate a Vietnamese toolbox XML for a specific age group config
 * This replaces block message labels in the toolbox
 */
export function generateVietnameseToolbox(
  config: AgeGroupBlockConfig
): string {
  // Start with base category
  let toolbox = `<category name="Robot" colour="#4CAF50">\n`;

  for (const blockType of config.availableBlocks) {
    toolbox += `  <block type="${blockType}"></block>\n`;
  }

  toolbox += `</category>`;

  return toolbox;
}
