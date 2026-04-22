/**
 * Intermediate Curriculum (Ages 9-12)
 * Focus: Sensors, loops, conditions, line-following, music, mini competitions
 */

import { Curriculum, Lesson, AgeGroupBlockConfig } from '../models/lesson';

// Age-group block configuration for intermediate (9-12)
export const intermediateBlockConfig: AgeGroupBlockConfig = {
  ageGroup: 'intermediate',
  availableBlocks: [
    'robot_move_forward',
    'robot_move_backward',
    'robot_turn_left',
    'robot_turn_right',
    'robot_wait',
    'robot_set_speed',
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
    robot_move_forward: 'Đi tới',
    robot_move_backward: 'Đi lùi',
    robot_turn_left: 'Rẽ trái',
    robot_turn_right: 'Rẽ phải',
    robot_wait: 'Chờ',
    robot_set_speed: 'Đặt tốc độ',
    robot_get_distance: 'Khoảng cách',
    robot_get_light_level: 'Mức sáng',
    robot_play_note: 'Chơi nốt nhạc',
    robot_led_on: 'Bật đèn',
    robot_led_off: 'Tắt đèn',
    robot_repeat: 'Lặp lại',
    robot_if_sensor: 'Nếu cảm biến',
  },
  showCodePreview: true,
  maxLoopDepth: 3,
};

// Lesson 1: Sensor Explorer (Distance sensor)
const lesson1SensorExplorer: Lesson = {
  id: 'intermediate-01',
  slug: 'sensor-explorer',
  title: 'Khám phá cảm biến',
  titleVi: 'Khám phá cảm biến',
  titleEn: 'Sensor Explorer',
  descriptionVi: 'Học cách robot đo khoảng cách bằng cảm biến siêu âm',
  descriptionEn: 'Learn how robots measure distance using ultrasonic sensors',
  ageGroup: 'intermediate',
  category: 'sensors',
  difficulty: 'basic',
  estimatedMinutes: 20,
  objectives: ['Đọc giá trị cảm biến khoảng cách', 'Hiểu cách robot "nhìn" vật cản'],
  objectivesVi: ['Đọc giá trị cảm biến khoảng cách', 'Hiểu cách robot "nhìn" vật cản'],
  steps: [
    {
      id: 'step-1-1',
      order: 1,
      title: 'Đo khoảng cách',
      descriptionVi: 'Robot có thể đo khoảng cách đến vật cản! Sử dụng khối "Khoảng cách" để xem robot "thấy" bao xa.',
      allowedBlocks: ['robot_get_distance'],
      labelVi: 'Đo khoảng cách',
      labelEn: 'Measure distance',
      hint: 'Kéo khối "Khoảng cách" vào workspace và nhấn chạy để xem giá trị',
    },
    {
      id: 'step-1-2',
      order: 2,
      title: 'Di chuyển và đo',
      descriptionVi: 'Di chuyển robot 20 bước rồi đo lại khoảng cách mới.',
      allowedBlocks: ['robot_move_forward', 'robot_get_distance'],
      labelVi: 'Di chuyển và đo',
      labelEn: 'Move and measure',
    },
    {
      id: 'step-1-3',
      order: 3,
      title: 'Dừng trước tường',
      descriptionVi: 'Robot đi tới cho đến khi cách vật cản dưới 10 đơn vị.',
      allowedBlocks: ['robot_move_forward', 'robot_get_distance'],
      labelVi: 'Dừng trước tường',
      labelEn: 'Stop before wall',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_wait', 'robot_get_distance', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'smart-detour',
  tags: ['sensors', 'distance', 'exploration'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 2: Smart Detour (If sensor + distance)
const lesson2SmartDetour: Lesson = {
  id: 'intermediate-02',
  slug: 'smart-detour',
  title: 'Đường vòng thông minh',
  titleVi: 'Đường vòng thông minh',
  titleEn: 'Smart Detour',
  descriptionVi: 'Sử dụng khối Nếu cảm biến để phát hiện vật cản và rẽ đường',
  descriptionEn: 'Use the If Sensor block to detect obstacles and find alternate routes',
  ageGroup: 'intermediate',
  category: 'sensors',
  difficulty: 'basic',
  estimatedMinutes: 25,
  objectives: ['Sử dụng khối "Nếu cảm biến"', 'Phát hiện vật cản và rẽ'],
  objectivesVi: ['Sử dụng khối "Nếu cảm biến"', 'Phát hiện vật cản và rẽ'],
  steps: [
    {
      id: 'step-2-1',
      order: 1,
      title: 'Kiểm tra khoảng cách',
      descriptionVi: 'Nếu khoảng cách nhỏ hơn 15, robot cần rẽ phải.',
      allowedBlocks: ['robot_get_distance', 'robot_if_sensor'],
      labelVi: 'Kiểm tra khoảng cách',
      labelEn: 'Check distance',
    },
    {
      id: 'step-2-2',
      order: 2,
      title: 'Thêm lệnh rẽ',
      descriptionVi: 'Khi điều kiện đúng, thêm lệnh rẽ phải 90 độ.',
      allowedBlocks: ['robot_if_sensor', 'robot_turn_right'],
      labelVi: 'Thêm lệnh rẽ',
      labelEn: 'Add turn command',
    },
    {
      id: 'step-2-3',
      order: 3,
      title: 'Chạy thử',
      descriptionVi: 'Đặt robot gần tường và chạy chương trình!',
      allowedBlocks: ['robot_if_sensor', 'robot_turn_right', 'robot_move_forward'],
      labelVi: 'Chạy thử',
      labelEn: 'Test run',
    },
  ],
  starterXml: `<xml>
    <block type="robot_move_forward" x="100" y="50">
      <value name="STEPS">
        <shadow type="math_number"><field name="NUM">30</field></shadow>
      </value>
    </block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_get_distance', 'robot_if_sensor', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'loop-jam',
  tags: ['sensors', 'conditions', 'obstacle-avoidance'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 3: Loop Jam (Repeat loops)
const lesson3LoopJam: Lesson = {
  id: 'intermediate-03',
  slug: 'loop-jam',
  title: 'Vòng lặp vui nhộn',
  titleVi: 'Vòng lặp vui nhộn',
  titleEn: 'Loop Jam',
  descriptionVi: 'Học cách sử dụng vòng lặp để lặp lại hành động nhiều lần',
  descriptionEn: 'Learn to use loops to repeat actions multiple times',
  ageGroup: 'intermediate',
  category: 'loops',
  difficulty: 'basic',
  estimatedMinutes: 20,
  objectives: ['Sử dụng khối "Lặp lại"', 'Lặp chuỗi hành động nhiều lần'],
  objectivesVi: ['Sử dụng khối "Lặp lại"', 'Lặp chuỗi hành động nhiều lần'],
  steps: [
    {
      id: 'step-3-1',
      order: 1,
      title: 'Tạo vòng lặp',
      descriptionVi: 'Sử dụng khối "Lặp lại" 4 lần để robot nhảy 4 bước.',
      allowedBlocks: ['robot_repeat'],
      labelVi: 'Tạo vòng lặp',
      labelEn: 'Create a loop',
      hint: 'Đặt khối "Di chuyển tới" bên trong khối "Lặp lại"',
    },
    {
      id: 'step-3-2',
      order: 2,
      title: 'Thêm xoay',
      descriptionVi: 'Sau mỗi lần đi, robot xoay trái. Lặp 4 lần!',
      allowedBlocks: ['robot_repeat', 'robot_turn_left'],
      labelVi: 'Thêm xoay',
      labelEn: 'Add turning',
    },
    {
      id: 'step-3-3',
      order: 3,
      title: 'Tạo hình vuông',
      descriptionVi: 'Robot di chuyển tạo thành hình vuông!',
      allowedBlocks: ['robot_repeat', 'robot_turn_left', 'robot_move_forward'],
      labelVi: 'Tạo hình vuông',
      labelEn: 'Draw a square',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'light-disco',
  tags: ['loops', 'repeat', 'geometry'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

// Lesson 4: Light Disco (Light sensor + loops)
const lesson4LightDisco: Lesson = {
  id: 'intermediate-04',
  slug: 'light-disco',
  title: 'Đèn LED cảm biến sáng',
  titleVi: 'Đèn LED cảm biến sáng',
  titleEn: 'Light Disco',
  descriptionVi: 'Điều khiển LED theo cảm biến ánh sáng để tạo đèn nhấp nháy theo môi trường',
  descriptionEn: 'Control LEDs based on light sensor readings to create ambient light effects',
  ageGroup: 'intermediate',
  category: 'sensors',
  difficulty: 'basic',
  estimatedMinutes: 20,
  objectives: ['Đọc giá trị cảm biến ánh sáng', 'Bật đèn LED theo mức sáng'],
  objectivesVi: ['Đọc giá trị cảm biến ánh sáng', 'Bật đèn LED theo mức sáng'],
  steps: [
    {
      id: 'step-4-1',
      order: 1,
      title: 'Đo mức sáng',
      descriptionVi: 'Robot có cảm biến ánh sáng! Đo mức sáng hiện tại.',
      allowedBlocks: ['robot_get_light_level'],
      labelVi: 'Đo mức sáng',
      labelEn: 'Measure light level',
    },
    {
      id: 'step-4-2',
      order: 2,
      title: 'Nếu tối thì bật đèn',
      descriptionVi: 'Nếu mức sáng dưới 50, bật đèn LED.',
      allowedBlocks: ['robot_get_light_level', 'robot_if_sensor', 'robot_led_on'],
      labelVi: 'Nếu tối thì bật đèn',
      labelEn: 'If dark, turn on LED',
    },
    {
      id: 'step-4-3',
      order: 3,
      title: 'Lặp kiểm tra',
      descriptionVi: 'Robot liên tục kiểm tra và bật/tắt đèn theo ánh sáng!',
      allowedBlocks: ['robot_repeat', 'robot_get_light_level', 'robot_if_sensor', 'robot_led_on', 'robot_led_off'],
      labelVi: 'Lặp kiểm tra',
      labelEn: 'Repeat check',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_off" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_wait', 'robot_get_light_level', 'robot_if_sensor', 'robot_led_on', 'robot_led_off', 'robot_repeat'],
  nextLessonSlug: 'melody-maker',
  tags: ['sensors', 'light', 'led', 'automation'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 5: Melody Maker (Music composition)
const lesson5MelodyMaker: Lesson = {
  id: 'intermediate-05',
  slug: 'melody-maker',
  title: 'Nhạc sĩ Robot',
  titleVi: 'Nhạc sĩ Robot',
  titleEn: 'Melody Maker',
  descriptionVi: 'Sáng tác nhạc với robot bằng cách lập trình chuỗi nốt nhạc',
  descriptionEn: 'Compose music with robots by programming note sequences',
  ageGroup: 'intermediate',
  category: 'music',
  difficulty: 'basic',
  estimatedMinutes: 25,
  objectives: ['Sử dụng khối "Chơi nốt nhạc"', 'Tạo giai điệu với nhiều nốt'],
  objectivesVi: ['Sử dụng khối "Chơi nốt nhạc"', 'Tạo giai điệu với nhiều nốt'],
  steps: [
    {
      id: 'step-5-1',
      order: 1,
      title: 'Chơi một nốt',
      descriptionVi: 'Robot có thể chơi nhạc! Chơi nốt "C" (Do).',
      allowedBlocks: ['robot_play_note'],
      labelVi: 'Chơi một nốt',
      labelEn: 'Play one note',
      hint: 'Tìm khối "Chơi nốt nhạc" trong danh mục Robot',
    },
    {
      id: 'step-5-2',
      order: 2,
      title: 'Tạo chuỗi nốt',
      descriptionVi: 'Chơi chuỗi: C - D - E - F (Do - Re - Mi - Fa).',
      allowedBlocks: ['robot_play_note', 'robot_wait'],
      labelVi: 'Tạo chuỗi nốt',
      labelEn: 'Create note sequence',
    },
    {
      id: 'step-5-3',
      order: 3,
      title: 'Lặp giai điệu',
      descriptionVi: 'Lặp lại giai điệu 3 lần để tạo bài hát!',
      allowedBlocks: ['robot_play_note', 'robot_wait', 'robot_repeat'],
      labelVi: 'Lặp giai điệu',
      labelEn: 'Loop the melody',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_play_note', 'robot_wait', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'speed-demon',
  tags: ['music', 'creativity', 'sequences'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

// Lesson 6: Speed Demon (Speed control + loops)
const lesson6SpeedDemon: Lesson = {
  id: 'intermediate-06',
  slug: 'speed-demon',
  title: 'Siêu tốc độ',
  titleVi: 'Siêu tốc độ',
  titleEn: 'Speed Demon',
  descriptionVi: 'Học cách điều chỉnh tốc độ robot và kết hợp với vòng lặp',
  descriptionEn: 'Learn to control robot speed and combine it with loops',
  ageGroup: 'intermediate',
  category: 'movement',
  difficulty: 'intermediate',
  estimatedMinutes: 20,
  objectives: ['Điều chỉnh tốc độ robot', 'Kết hợp tốc độ với vòng lặp'],
  objectivesVi: ['Điều chỉnh tốc độ robot', 'Kết hợp tốc độ với vòng lặp'],
  steps: [
    {
      id: 'step-6-1',
      order: 1,
      title: 'Đặt tốc độ chậm',
      descriptionVi: 'Đặt tốc độ 20 và di chuyển 10 bước. Robot di chuyển chậm và chính xác.',
      allowedBlocks: ['robot_set_speed', 'robot_move_forward'],
      labelVi: 'Đặt tốc độ chậm',
      labelEn: 'Set slow speed',
    },
    {
      id: 'step-6-2',
      order: 2,
      title: 'Tăng tốc',
      descriptionVi: 'Đặt tốc độ 80 và di chuyển 10 bước. Nhanh hơn nhiều!',
      allowedBlocks: ['robot_set_speed', 'robot_move_forward'],
      labelVi: 'Tăng tốc',
      labelEn: 'Speed up',
    },
    {
      id: 'step-6-3',
      order: 3,
      title: 'Tăng dần tốc độ',
      descriptionVi: 'Lặp 5 lần: mỗi lần tăng tốc độ thêm 20 và di chuyển.',
      allowedBlocks: ['robot_set_speed', 'robot_move_forward', 'robot_repeat'],
      labelVi: 'Tăng dần tốc độ',
      labelEn: 'Gradual speed up',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_set_speed', 'robot_move_forward', 'robot_wait', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'line-follower-1',
  tags: ['movement', 'speed', 'loops'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 7: Line Follower 1 (Basic line following)
const lesson7LineFollower1: Lesson = {
  id: 'intermediate-07',
  slug: 'line-follower-1',
  title: 'Đường đua 1',
  titleVi: 'Đường đua 1',
  titleEn: 'Line Follower 1',
  descriptionVi: 'Lập trình robot theo đường đen bằng cảm biến ánh sáng',
  descriptionEn: 'Program robots to follow black lines using light sensors',
  ageGroup: 'intermediate',
  category: 'challenges',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  objectives: ['Sử dụng cảm biến ánh sáng để theo đường', 'Kết hợp điều kiện và di chuyển'],
  objectivesVi: ['Sử dụng cảm biến ánh sáng để theo đường', 'Kết hợp điều kiện và di chuyển'],
  steps: [
    {
      id: 'step-7-1',
      order: 1,
      title: 'Phát hiện đường đen',
      descriptionVi: 'Trên nền sáng, đường đen có mức sáng thấp hơn. Kiểm tra mức sáng!',
      allowedBlocks: ['robot_get_light_level'],
      labelVi: 'Phát hiện đường đen',
      labelEn: 'Detect dark line',
    },
    {
      id: 'step-7-2',
      order: 2,
      title: 'Điều chỉnh khi lệch',
      descriptionVi: 'Nếu mức sáng cao (ngoài đường) → rẽ trái. Nếu thấp (trên đường) → rẽ phải.',
      allowedBlocks: ['robot_if_sensor', 'robot_turn_left', 'robot_turn_right'],
      labelVi: 'Điều chỉnh khi lệch',
      labelEn: 'Adjust when off track',
    },
    {
      id: 'step-7-3',
      order: 3,
      title: 'Lặp theo đường',
      descriptionVi: 'Lặp lại logic kiểm tra và điều chỉnh để robot theo đường liên tục!',
      allowedBlocks: ['robot_repeat', 'robot_if_sensor', 'robot_turn_left', 'robot_turn_right', 'robot_move_forward'],
      labelVi: 'Lặp theo đường',
      labelEn: 'Repeat to follow line',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
    <block type="robot_move_forward" x="100" y="120">
      <value name="STEPS">
        <shadow type="math_number"><field name="NUM">5</field></shadow>
      </value>
    </block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'line-follower-2',
  tags: ['challenge', 'line-following', 'sensors', 'competition'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 8: Line Follower 2 (Advanced line following)
const lesson8LineFollower2: Lesson = {
  id: 'intermediate-08',
  slug: 'line-follower-2',
  title: 'Đường đua 2',
  titleVi: 'Đường đua 2',
  titleEn: 'Line Follower 2',
  descriptionVi: 'Nâng cao kỹ năng theo đường với góc cua và đường phức tạp',
  descriptionEn: 'Advanced line following with corners and complex paths',
  ageGroup: 'intermediate',
  category: 'challenges',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  objectives: ['Theo đường với góc cua', 'Xử lý đường gấp'],
  objectivesVi: ['Theo đường với góc cua', 'Xử lý đường gấp'],
  steps: [
    {
      id: 'step-8-1',
      order: 1,
      title: 'Đọc cảm biến liên tục',
      descriptionVi: 'Robot đọc mức sáng liên tục để phát hiện đường cong.',
      allowedBlocks: ['robot_repeat', 'robot_get_light_level'],
      labelVi: 'Đọc cảm biến liên tục',
      labelEn: 'Read sensor continuously',
    },
    {
      id: 'step-8-2',
      order: 2,
      title: 'Phản ứng nhanh',
      descriptionVi: 'Khi lệch đường, cần rẽ nhanh để quay lại.',
      allowedBlocks: ['robot_if_sensor', 'robot_turn_left', 'robot_turn_right'],
      labelVi: 'Phản ứng nhanh',
      labelEn: 'React quickly',
    },
    {
      id: 'step-8-3',
      order: 3,
      title: 'Hoàn thiện vòng lặp',
      descriptionVi: 'Robot đi hết một vòng đường đua hoàn chỉnh!',
      allowedBlocks: ['robot_repeat', 'robot_if_sensor', 'robot_turn_left', 'robot_turn_right', 'robot_move_forward'],
      labelVi: 'Hoàn thiện vòng lặp',
      labelEn: 'Complete the loop',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'maze-runner-pro',
  tags: ['challenge', 'line-following', 'advanced'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 9: Maze Runner Pro (Advanced obstacle avoidance)
const lesson9MazeRunnerPro: Lesson = {
  id: 'intermediate-09',
  slug: 'maze-runner-pro',
  title: 'Mê cung chuyên nghiệp',
  titleVi: 'Mê cung chuyên nghiệp',
  titleEn: 'Maze Runner Pro',
  descriptionVi: 'Thoát mê cung phức tạp bằng cách kết hợp nhiều cảm biến',
  descriptionEn: 'Escape complex mazes by combining multiple sensors',
  ageGroup: 'intermediate',
  category: 'challenges',
  difficulty: 'advanced',
  estimatedMinutes: 35,
  objectives: ['Kết hợp nhiều cảm biến', 'Thoát mê cung phức tạp'],
  objectivesVi: ['Kết hợp nhiều cảm biến', 'Thoát mê cung phức tạp'],
  steps: [
    {
      id: 'step-9-1',
      order: 1,
      title: 'Đo nhiều hướng',
      descriptionVi: 'Kiểm tra khoảng cách trái, phải, trước để chọn hướng đi.',
      allowedBlocks: ['robot_get_distance', 'robot_if_sensor'],
      labelVi: 'Đo nhiều hướng',
      labelEn: 'Measure multiple directions',
    },
    {
      id: 'step-9-2',
      order: 2,
      title: 'Chọn hướng đi',
      descriptionVi: 'Nếu trước thông thoáng → đi tới. Nếu không → rẽ.',
      allowedBlocks: ['robot_if_sensor', 'robot_turn_left', 'robot_turn_right', 'robot_move_forward'],
      labelVi: 'Chọn hướng đi',
      labelEn: 'Choose direction',
    },
    {
      id: 'step-9-3',
      order: 3,
      title: 'Lặp cho đến đích',
      descriptionVi: 'Robot tiếp tục cho đến khi thoát khỏi mê cung!',
      allowedBlocks: ['robot_repeat', 'robot_if_sensor', 'robot_turn_left', 'robot_turn_right', 'robot_move_forward', 'robot_get_distance'],
      labelVi: 'Lặp cho đến đích',
      labelEn: 'Repeat until goal',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
    <block type="robot_set_speed" x="100" y="100">
      <value name="SPEED">
        <shadow type="math_number"><field name="NUM">50</field></shadow>
      </value>
    </block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'mini-competition-1',
  tags: ['challenge', 'maze', 'sensors', 'navigation'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 10: Mini Competition 1 (Sumo challenge basics)
const lesson10MiniCompetition1: Lesson = {
  id: 'intermediate-10',
  slug: 'mini-competition-1',
  title: 'Cuộc thi Robot 1',
  titleVi: 'Cuộc thi Robot 1',
  titleEn: 'Mini Competition 1',
  descriptionVi: 'Cuộc thi robot cơ bản - tấn công và phòng thủ',
  descriptionEn: 'Basic robot competition - attack and defense tactics',
  ageGroup: 'intermediate',
  category: 'competitions',
  difficulty: 'advanced',
  estimatedMinutes: 30,
  objectives: ['Di chuyển nhanh và tấn công', 'Phát hiện đối thủ bằng cảm biến'],
  objectivesVi: ['Di chuyển nhanh và tấn công', 'Phát hiện đối thủ bằng cảm biến'],
  steps: [
    {
      id: 'step-10-1',
      order: 1,
      title: 'Tăng tốc tối đa',
      descriptionVi: 'Đặt tốc độ 100! Robot cần di chuyển thật nhanh.',
      allowedBlocks: ['robot_set_speed'],
      labelVi: 'Tăng tốc tối đa',
      labelEn: 'Maximum speed',
    },
    {
      id: 'step-10-2',
      order: 2,
      title: 'Tấn công!',
      descriptionVi: 'Di chuyển về phía trước với tốc độ cao nhất.',
      allowedBlocks: ['robot_set_speed', 'robot_move_forward'],
      labelVi: 'Tấn công!',
      labelEn: 'Attack!',
    },
    {
      id: 'step-10-3',
      order: 3,
      title: 'Phát hiện đối thủ',
      descriptionVi: 'Khi phát hiện đối thủ gần, lao vào tấn công!',
      allowedBlocks: ['robot_if_sensor', 'robot_set_speed', 'robot_move_forward', 'robot_get_distance'],
      labelVi: 'Phát hiện đối thủ',
      labelEn: 'Detect opponent',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_set_speed', 'robot_get_distance', 'robot_if_sensor', 'robot_repeat', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'mini-competition-2',
  tags: ['competition', 'sumo', 'strategy', 'speed'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 11: Mini Competition 2 (Sumo with tactics)
const lesson11MiniCompetition2: Lesson = {
  id: 'intermediate-11',
  slug: 'mini-competition-2',
  title: 'Cuộc thi Robot 2',
  titleVi: 'Cuộc thi Robot 2',
  titleEn: 'Mini Competition 2',
  descriptionVi: 'Chiến thuật sumo nâng cao với phòng thủ đa tầng',
  descriptionEn: 'Advanced sumo tactics with multi-layer defense',
  ageGroup: 'intermediate',
  category: 'competitions',
  difficulty: 'advanced',
  estimatedMinutes: 35,
  objectives: ['Chiến thuật phòng thủ', 'Không để rơi khỏi vòng tròn'],
  objectivesVi: ['Chiến thuật phòng thủ', 'Không để rơi khỏi vòng tròn'],
  steps: [
    {
      id: 'step-11-1',
      order: 1,
      title: 'Kiểm tra viền vòng tròn',
      descriptionVi: 'Nếu gần rìa (mức sáng cao trên nền đen) → lùi lại!',
      allowedBlocks: ['robot_get_light_level', 'robot_if_sensor'],
      labelVi: 'Kiểm tra viền',
      labelEn: 'Check ring edge',
    },
    {
      id: 'step-11-2',
      order: 2,
      title: 'Phòng thủ',
      descriptionVi: 'Khi gần rìa, quay về hướng an toàn.',
      allowedBlocks: ['robot_if_sensor', 'robot_turn_left', 'robot_turn_right', 'robot_move_backward'],
      labelVi: 'Phòng thủ',
      labelEn: 'Defend',
    },
    {
      id: 'step-11-3',
      order: 3,
      title: 'Kết hợp tấn công và phòng thủ',
      descriptionVi: 'Robot vừa tấn công đối thủ vừa tránh rơi khỏi vòng!',
      allowedBlocks: ['robot_if_sensor', 'robot_get_light_level', 'robot_get_distance', 'robot_set_speed', 'robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_repeat'],
      labelVi: 'Kết hợp chiến thuật',
      labelEn: 'Combine tactics',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
    <block type="robot_set_speed" x="100" y="100">
      <value name="SPEED">
        <shadow type="math_number"><field name="NUM">80</field></shadow>
      </value>
    </block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'rhythm-robot',
  tags: ['competition', 'sumo', 'defense', 'strategy'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 12: Rhythm Robot (Music + movement choreography)
const lesson12RhythmRobot: Lesson = {
  id: 'intermediate-12',
  slug: 'rhythm-robot',
  title: 'Robot nhảy theo nhịp',
  titleVi: 'Robot nhảy theo nhịp',
  titleEn: 'Rhythm Robot',
  descriptionVi: 'Phối hợp âm nhạc và chuyển động để tạo điệu nhảy robot',
  descriptionEn: 'Combine music and movement to create robot dance routines',
  ageGroup: 'intermediate',
  category: 'music',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  objectives: ['Phối hợp âm nhạc và chuyển động', 'Tạo robot nhảy với nhịp'],
  objectivesVi: ['Phối hợp âm nhạc và chuyển động', 'Tạo robot nhảy với nhịp'],
  steps: [
    {
      id: 'step-12-1',
      order: 1,
      title: 'Nhạc + LED',
      descriptionVi: 'Chơi nốt nhạc và bật đèn LED cùng lúc!',
      allowedBlocks: ['robot_play_note', 'robot_led_on'],
      labelVi: 'Nhạc + LED',
      labelEn: 'Music + LED',
    },
    {
      id: 'step-12-2',
      order: 2,
      title: 'Di chuyển theo nhịp',
      descriptionVi: 'Mỗi nốt nhạc tương ứng với một bước di chuyển.',
      allowedBlocks: ['robot_play_note', 'robot_move_forward', 'robot_wait'],
      labelVi: 'Di chuyển theo nhịp',
      labelEn: 'Move to the beat',
    },
    {
      id: 'step-12-3',
      order: 3,
      title: 'Tạo điệu nhảy hoàn chỉnh',
      descriptionVi: 'Robot vừa chơi nhạc vừa di chuyển, xoay theo giai điệu!',
      allowedBlocks: ['robot_play_note', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_led_on', 'robot_led_off', 'robot_wait', 'robot_repeat'],
      labelVi: 'Tạo điệu nhảy hoàn chỉnh',
      labelEn: 'Create complete dance',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
    <block type="robot_play_note" x="100" y="100">
      <field name="NOTE">C</field>
    </block>
  </xml>`,
  availableBlocks: ['robot_play_note', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: undefined,
  tags: ['music', 'creativity', 'choreography', 'graduation'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

export const intermediateCurriculum: Curriculum = {
  ageGroup: 'intermediate',
  minAge: 9,
  maxAge: 12,
  titleVi: 'Chương trình Trung cấp (9-12 tuổi)',
  titleEn: 'Intermediate Program (Ages 9-12)',
  descriptionVi: 'Học về cảm biến, vòng lặp, điều kiện và các cuộc thi robot cơ bản',
  descriptionEn: 'Learn about sensors, loops, conditions, and basic robot competitions',
  lessons: [
    lesson1SensorExplorer,
    lesson2SmartDetour,
    lesson3LoopJam,
    lesson4LightDisco,
    lesson5MelodyMaker,
    lesson6SpeedDemon,
    lesson7LineFollower1,
    lesson8LineFollower2,
    lesson9MazeRunnerPro,
    lesson10MiniCompetition1,
    lesson11MiniCompetition2,
    lesson12RhythmRobot,
  ],
  totalLessons: 12,
  totalHours: 5,
};
