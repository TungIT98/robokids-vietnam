/**
 * Intermediate Curriculum (Ages 9-12) Block Configuration
 * Adds sensors, loops, and conditional logic.
 */

import { AgeGroupBlockConfig } from '../models/lesson';

export const intermediateBlockConfig: AgeGroupBlockConfig = {
  ageGroup: 'intermediate',
  availableBlocks: [
    'robot_move_forward',
    'robot_move_backward',
    'robot_turn_left',
    'robot_turn_right',
    'robot_set_speed',
    'robot_wait',
    'robot_get_distance',
    'robot_get_light_level',
    'robot_play_note',
    'robot_led_on',
    'robot_led_off',
    'robot_repeat',
    'robot_if_sensor',
  ],
  disabledBlocks: [],
  blockLabelsVi: {
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
  },
  showCodePreview: true,
  maxLoopDepth: 3,
  maxBlocks: 20,
};
