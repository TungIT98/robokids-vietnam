/**
 * Advanced Curriculum (Ages 13-16) Block Configuration
 * Full technical block set with maximum complexity.
 */

import { AgeGroupBlockConfig } from '../models/lesson';

export const advancedBlockConfig: AgeGroupBlockConfig = {
  ageGroup: 'advanced',
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
    robot_move_forward: 'Di chuyển thẳng',
    robot_move_backward: 'Di chuyển lùi',
    robot_turn_left: 'Góc quay trái',
    robot_turn_right: 'Góc quay phải',
    robot_set_speed: 'Thiết lập tốc độ',
    robot_wait: 'Trì hoãn',
    robot_get_distance: 'ultrasonic()',
    robot_get_light_level: 'lightSensor()',
    robot_play_note: 'playNote()',
    robot_led_on: 'LED bật',
    robot_led_off: 'LED tắt',
    robot_repeat: 'vòng lặp',
    robot_if_sensor: 'điều kiện',
  },
  showCodePreview: true,
  maxLoopDepth: 5,
  maxBlocks: 50,
};
