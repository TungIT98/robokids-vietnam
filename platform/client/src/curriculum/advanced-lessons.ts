/**
 * Advanced Curriculum (Ages 13-16)
 * Focus: Complex nested logic, competition strategies, algorithm design,
 * team collaboration, innovation projects
 */

import { Curriculum, Lesson, AgeGroupBlockConfig } from '../models/lesson';

// Age-group block configuration for advanced (13-16)
export const advancedBlockConfig: AgeGroupBlockConfig = {
  ageGroup: 'advanced',
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
    robot_move_forward: 'Tiến',
    robot_move_backward: 'Lùi',
    robot_turn_left: ' Quay trái',
    robot_turn_right: 'Quay phải',
    robot_wait: 'Chờ',
    robot_set_speed: 'Tốc độ',
    robot_get_distance: 'Khoảng cách',
    robot_get_light_level: 'Cường độ sáng',
    robot_play_note: 'Âm thanh',
    robot_led_on: 'Bật LED',
    robot_led_off: 'Tắt LED',
    robot_repeat: 'Lặp',
    robot_if_sensor: 'Nếu cảm biến',
  },
  showCodePreview: true,
  maxLoopDepth: 5,
};

// Lesson 1: Nested Logic Lab (Nested if + loops)
const lesson1NestedLogic: Lesson = {
  id: 'advanced-01',
  slug: 'nested-logic-lab',
  title: 'Phòng thí nghiệm logic lồng',
  titleVi: 'Phòng thí nghiệm logic lồng',
  titleEn: 'Nested Logic Lab',
  descriptionVi: 'Viết logic if lồng nhau để xử lý nhiều điều kiện phức tạp',
  descriptionEn: 'Write nested if logic to handle multiple complex conditions',
  ageGroup: 'advanced',
  category: 'logic',
  difficulty: 'advanced',
  estimatedMinutes: 30,
  objectives: ['Viết logic if lồng nhau', 'Xử lý nhiều điều kiện cùng lúc'],
  objectivesVi: ['Viết logic if lồng nhau', 'Xử lý nhiều điều kiện cùng lúc'],
  steps: [
    {
      id: 'step-1-1',
      order: 1,
      title: 'Kiểm tra nhiều điều kiện',
      descriptionVi: 'Nếu khoảng cách < 10: kiểm tra mức sáng. Nếu mức sáng < 50: bật đèn. Nếu không: tắt đèn.',
      allowedBlocks: ['robot_if_sensor', 'robot_get_distance', 'robot_get_light_level'],
      labelVi: 'Nhiều điều kiện',
      labelEn: 'Multiple conditions',
      hint: 'Đặt một khối "Nếu cảm biến" bên trong một khối "Nếu cảm biến" khác',
    },
    {
      id: 'step-1-2',
      order: 2,
      title: 'Phản ứng theo tình huống',
      descriptionVi: '3 trường hợp: gần + tối → lùi; gần + sáng → tiến; xa → chờ.',
      allowedBlocks: ['robot_if_sensor', 'robot_move_forward', 'robot_move_backward', 'robot_wait', 'robot_get_distance', 'robot_get_light_level'],
      labelVi: '3 trường hợp',
      labelEn: '3 cases',
    },
    {
      id: 'step-1-3',
      order: 3,
      title: 'Lặp logic phức tạp',
      descriptionVi: 'Lặp lại logic trên 10 lần để robot quyết định liên tục.',
      allowedBlocks: ['robot_repeat', 'robot_if_sensor', 'robot_move_forward', 'robot_move_backward', 'robot_wait', 'robot_get_distance', 'robot_get_light_level'],
      labelVi: 'Lặp logic phức tạp',
      labelEn: 'Loop complex logic',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'path-planner',
  tags: ['logic', 'nested', 'conditions', 'algorithm'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 2: Path Planner (Algorithm design)
const lesson2PathPlanner: Lesson = {
  id: 'advanced-02',
  slug: 'path-planner',
  title: 'Thiết kế đường đi',
  titleVi: 'Thiết kế đường đi',
  titleEn: 'Path Planner',
  descriptionVi: 'Thiết kế và tối ưu thuật toán tìm đường cho robot',
  descriptionEn: 'Design and optimize pathfinding algorithms for robots',
  ageGroup: 'advanced',
  category: 'algorithm',
  difficulty: 'advanced',
  estimatedMinutes: 35,
  objectives: ['Thiết kế thuật toán đường đi', 'Tối ưu hóa số bước di chuyển'],
  objectivesVi: ['Thiết kế thuật toán đường đi', 'Tối ưu hóa số bước di chuyển'],
  steps: [
    {
      id: 'step-2-1',
      order: 1,
      title: 'Phân tích mê cung',
      descriptionVi: 'Đo khoảng cách các hướng để lập bản đồ.',
      allowedBlocks: ['robot_get_distance', 'robot_turn_left', 'robot_turn_right', 'robot_wait'],
      labelVi: 'Phân tích mê cung',
      labelEn: 'Analyze maze',
    },
    {
      id: 'step-2-2',
      order: 2,
      title: 'Chọn đường tối ưu',
      descriptionVi: 'So sánh: nếu trái xa nhất → rẽ trái; nếu phải xa nhất → rẽ phải; nếu trước xa nhất → tiến.',
      allowedBlocks: ['robot_if_sensor', 'robot_get_distance', 'robot_turn_left', 'robot_turn_right', 'robot_move_forward'],
      labelVi: 'Chọn đường tối ưu',
      labelEn: 'Choose optimal path',
    },
    {
      id: 'step-2-3',
      order: 3,
      title: 'Lặp cho đến đích',
      descriptionVi: 'Robot lặp thuật toán chọn đường cho đến khi thoát mê cung.',
      allowedBlocks: ['robot_repeat', 'robot_if_sensor', 'robot_get_distance', 'robot_turn_left', 'robot_turn_right', 'robot_move_forward'],
      labelVi: 'Lặp thuật toán',
      labelEn: 'Loop algorithm',
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
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'adaptive-navigator',
  tags: ['algorithm', 'maze', 'optimization', 'pathfinding'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 3: Adaptive Navigator (Self-adjusting behavior)
const lesson3AdaptiveNavigator: Lesson = {
  id: 'advanced-03',
  slug: 'adaptive-navigator',
  title: 'Điều hướng thích nghi',
  titleVi: 'Điều hướng thích nghi',
  titleEn: 'Adaptive Navigator',
  descriptionVi: 'Robot tự điều chỉnh hành vi dựa trên dữ liệu cảm biến thay đổi',
  descriptionEn: 'Robot self-adjusts behavior based on changing sensor data',
  ageGroup: 'advanced',
  category: 'algorithm',
  difficulty: 'advanced',
  estimatedMinutes: 35,
  objectives: ['Robot tự điều chỉnh theo môi trường', 'Học từ dữ liệu cảm biến'],
  objectivesVi: ['Robot tự điều chỉnh theo môi trường', 'Học từ dữ liệu cảm biến'],
  steps: [
    {
      id: 'step-3-1',
      order: 1,
      title: 'Đo baseline',
      descriptionVi: 'Robot đo và ghi nhớ mức sáng trung bình của môi trường.',
      allowedBlocks: ['robot_get_light_level', 'robot_wait'],
      labelVi: 'Đo baseline',
      labelEn: 'Measure baseline',
    },
    {
      id: 'step-3-2',
      order: 2,
      title: 'Phản ứng delta',
      descriptionVi: 'So sánh với baseline: nếu chênh lệch > 30 → phản ứng mạnh; nếu < 30 → phản ứng nhẹ.',
      allowedBlocks: ['robot_if_sensor', 'robot_set_speed', 'robot_get_light_level'],
      labelVi: 'Phản ứng delta',
      labelEn: 'Delta reaction',
    },
    {
      id: 'step-3-3',
      order: 3,
      title: 'Hệ thống tự học',
      descriptionVi: 'Robot liên tục cập nhật baseline và điều chỉnh tốc độ theo môi trường mới.',
      allowedBlocks: ['robot_repeat', 'robot_if_sensor', 'robot_set_speed', 'robot_get_light_level', 'robot_move_forward', 'robot_wait'],
      labelVi: 'Hệ thống tự học',
      labelEn: 'Self-learning system',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'line-follower-pro',
  tags: ['algorithm', 'adaptive', 'self-learning', 'sensor-fusion'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 4: Line Follower Pro (Precision line following)
const lesson4LineFollowerPro: Lesson = {
  id: 'advanced-04',
  slug: 'line-follower-pro',
  title: 'Theo đường chuyên nghiệp',
  titleVi: 'Theo đường chuyên nghiệp',
  titleEn: 'Line Follower Pro',
  descriptionVi: 'Theo đường chính xác cao với thuật toán PID',
  descriptionEn: 'High-precision line following using PID algorithm',
  ageGroup: 'advanced',
  category: 'competitions',
  difficulty: 'advanced',
  estimatedMinutes: 30,
  objectives: ['Theo đường với độ chính xác cao', 'Xử lý đường cong phức tạp'],
  objectivesVi: ['Theo đường với độ chính xác cao', 'Xử lý đường cong phức tạp'],
  steps: [
    {
      id: 'step-4-1',
      order: 1,
      title: 'PID cơ bản (giả lập)',
      descriptionVi: 'Tính hiệu sai số = mức sáng - baseline. Điều chỉnh hướng theo sai số.',
      allowedBlocks: ['robot_if_sensor', 'robot_get_light_level', 'robot_turn_left', 'robot_turn_right'],
      labelVi: 'PID cơ bản',
      labelEn: 'Basic PID',
    },
    {
      id: 'step-4-2',
      order: 2,
      title: 'Phản ứng liên tục',
      descriptionVi: 'Lặp kiểm tra mỗi 0.1 giây. Điều chỉnh liên tục để giữ trên đường.',
      allowedBlocks: ['robot_repeat', 'robot_wait', 'robot_if_sensor', 'robot_turn_left', 'robot_turn_right', 'robot_get_light_level'],
      labelVi: 'Phản ứng liên tục',
      labelEn: 'Continuous reaction',
    },
    {
      id: 'step-4-3',
      order: 3,
      title: 'Tốc độ cao',
      descriptionVi: 'Tăng tốc độ robot và giữ độ chính xác. Đạt thời gian tốt nhất!',
      allowedBlocks: ['robot_set_speed', 'robot_repeat', 'robot_wait', 'robot_if_sensor', 'robot_turn_left', 'robot_turn_right', 'robot_get_light_level', 'robot_move_forward'],
      labelVi: 'Tốc độ cao',
      labelEn: 'High speed',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
    <block type="robot_set_speed" x="100" y="100">
      <value name="SPEED">
        <shadow type="math_number"><field name="NUM">60</field></shadow>
      </value>
    </block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'sumo-master',
  tags: ['competition', 'line-following', 'precision', 'pid'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 5: Sumo Master (VEX-style competition)
const lesson5SumoMaster: Lesson = {
  id: 'advanced-05',
  slug: 'sumo-master',
  title: 'Bậc thầy Sumo',
  titleVi: 'Bậc thầy Sumo',
  titleEn: 'Sumo Master',
  descriptionVi: 'Chiến thuật sumo nâng cao với phát hiện và đẩy đối thủ',
  descriptionEn: 'Advanced sumo tactics with opponent detection and pushing',
  ageGroup: 'advanced',
  category: 'competitions',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  objectives: ['Chiến thuật sumo nâng cao', 'Phát hiện và đẩy đối thủ'],
  objectivesVi: ['Chiến thuật sumo nâng cao', 'Phát hiện và đẩy đối thủ'],
  steps: [
    {
      id: 'step-5-1',
      order: 1,
      title: 'Tìm đối thủ',
      descriptionVi: 'Quét 360°: đo khoảng cách các hướng. Hướng có khoảng cách nhỏ nhất = đối thủ.',
      allowedBlocks: ['robot_get_distance', 'robot_turn_left', 'robot_turn_right', 'robot_wait'],
      labelVi: 'Tìm đối thủ',
      labelEn: 'Find opponent',
    },
    {
      id: 'step-5-2',
      order: 2,
      title: 'Phối hợp tấn công',
      descriptionVi: 'Khi phát hiện đối thủ < 20: lao tới với tốc độ tối đa.',
      allowedBlocks: ['robot_if_sensor', 'robot_get_distance', 'robot_set_speed', 'robot_move_forward'],
      labelVi: 'Phối hợp tấn công',
      labelEn: 'Coordinated attack',
    },
    {
      id: 'step-5-3',
      order: 3,
      title: 'Phòng thủ đa tầng',
      descriptionVi: 'Kết hợp: kiểm tra rìa (mức sáng) + kiểm tra đối thủ (khoảng cách) → quyết định phòng hoặc tấn công.',
      allowedBlocks: ['robot_if_sensor', 'robot_get_distance', 'robot_get_light_level', 'robot_set_speed', 'robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_repeat'],
      labelVi: 'Phòng thủ đa tầng',
      labelEn: 'Multi-layer defense',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'rescue-robot',
  tags: ['competition', 'sumo', 'strategy', 'tactics'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 6: Rescue Robot (FLL-style rescue mission)
const lesson6RescueRobot: Lesson = {
  id: 'advanced-06',
  slug: 'rescue-robot',
  title: 'Robot cứu hộ',
  titleVi: 'Robot cứu hộ',
  titleEn: 'Rescue Robot',
  descriptionVi: 'Tìm và cứu nạn nhân trong môi trường có chướng ngại vật',
  descriptionEn: 'Find and rescue victims in environments with obstacles',
  ageGroup: 'advanced',
  category: 'challenges',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  objectives: ['Tìm và tiếp cận "nạn nhân"', 'Di chuyển an toàn qua chướng ngại'],
  objectivesVi: ['Tìm và tiếp cận "nạn nhân"', 'Di chuyển an toàn qua chướng ngại'],
  steps: [
    {
      id: 'step-6-1',
      order: 1,
      title: 'Tìm nạn nhân',
      descriptionVi: '"Nạn nhân" có mức sáng thấp nhất trong khu vực. Quét để tìm!',
      allowedBlocks: ['robot_get_light_level', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait'],
      labelVi: 'Tìm nạn nhân',
      labelEn: 'Find victim',
    },
    {
      id: 'step-6-2',
      order: 2,
      title: 'Tránh chướng ngại',
      descriptionVi: 'Nếu có vật cản phía trước < 15: dừng và tìm đường khác.',
      allowedBlocks: ['robot_if_sensor', 'robot_get_distance', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait'],
      labelVi: 'Tránh chướng ngại',
      labelEn: 'Avoid obstacles',
    },
    {
      id: 'step-6-3',
      order: 3,
      title: 'Hoàn thành sứ mệnh',
      descriptionVi: 'Robot đến nạn nhân, bật đèn LED báo hiệu, quay về vùng an toàn.',
      allowedBlocks: ['robot_if_sensor', 'robot_get_light_level', 'robot_get_distance', 'robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_led_on', 'robot_led_off', 'robot_repeat'],
      labelVi: 'Hoàn thành sứ mệnh',
      labelEn: 'Complete mission',
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
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'innovation-challenge-1',
  tags: ['challenge', 'rescue', 'fll', 'mission'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 7: Innovation Challenge 1 (Open-ended project)
const lesson7Innovation1: Lesson = {
  id: 'advanced-07',
  slug: 'innovation-challenge-1',
  title: 'Thử thách sáng tạo 1',
  titleVi: 'Thử thách sáng tạo 1',
  titleEn: 'Innovation Challenge 1',
  descriptionVi: 'Thiết kế robot dẫn đường tự động áp dụng tất cả kỹ năng đã học',
  descriptionEn: 'Design autonomous guided robots applying all learned skills',
  ageGroup: 'advanced',
  category: 'innovation',
  difficulty: 'advanced',
  estimatedMinutes: 45,
  objectives: ['Thiết kế robot dẫn đường tự động', 'Áp dụng tất cả kỹ năng'],
  objectivesVi: ['Thiết kế robot dẫn đường tự động', 'Áp dụng tất cả kỹ năng'],
  steps: [
    {
      id: 'step-7-1',
      order: 1,
      title: 'Đặt mục tiêu',
      descriptionVi: 'Thiết kế robot có thể đi từ điểm A đến điểm B tự động trong không gian có chướng ngại.',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_wait', 'robot_set_speed', 'robot_led_on', 'robot_led_off'],
      labelVi: 'Đặt mục tiêu',
      labelEn: 'Set goal',
      hint: 'Sử dụng tất cả các khối đã học để giải quyết bài toán',
    },
    {
      id: 'step-7-2',
      order: 2,
      title: 'Lập trình và thử nghiệm',
      descriptionVi: 'Viết chương trình và thử nghiệm nhiều lần. Điều chỉnh tham số.',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_wait', 'robot_set_speed', 'robot_led_on', 'robot_led_off'],
      labelVi: 'Lập trình và thử nghiệm',
      labelEn: 'Program and test',
    },
    {
      id: 'step-7-3',
      order: 3,
      title: 'Tối ưu hóa',
      descriptionVi: 'Rút gọn số bước, tăng tốc độ, cải thiện độ chính xác.',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_wait', 'robot_set_speed', 'robot_led_on', 'robot_led_off'],
      labelVi: 'Tối ưu hóa',
      labelEn: 'Optimize',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off', 'robot_play_note'],
  nextLessonSlug: 'innovation-challenge-2',
  tags: ['innovation', 'open-ended', 'design', 'optimization'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

// Lesson 8: Innovation Challenge 2 (Dance choreography)
const lesson8Innovation2: Lesson = {
  id: 'advanced-08',
  slug: 'innovation-challenge-2',
  title: 'Thử thách sáng tạo 2',
  titleVi: 'Thử thách sáng tạo 2',
  titleEn: 'Innovation Challenge 2',
  descriptionVi: 'Tạo màn trình diễn robot với âm nhạc và ánh sáng đồng bộ',
  descriptionEn: 'Create robot performances with synchronized music and lights',
  ageGroup: 'advanced',
  category: 'innovation',
  difficulty: 'advanced',
  estimatedMinutes: 45,
  objectives: ['Tạo màn trình diễn robot với âm nhạc và ánh sáng', 'Đồng bộ hóa nhiều hành vi'],
  objectivesVi: ['Tạo màn trình diễn robot với âm nhạc và ánh sáng', 'Đồng bộ hóa nhiều hành vi'],
  steps: [
    {
      id: 'step-8-1',
      order: 1,
      title: 'Thiết kế kịch bản',
      descriptionVi: 'Lên kịch bản: robot sẽ làm gì, khi nào, với nhạc gì.',
      allowedBlocks: ['robot_play_note', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_led_on', 'robot_led_off', 'robot_wait', 'robot_repeat'],
      labelVi: 'Thiết kế kịch bản',
      labelEn: 'Design script',
    },
    {
      id: 'step-8-2',
      order: 2,
      title: 'Lập trình đồng bộ',
      descriptionVi: 'Kết hợp âm nhạc, LED và chuyển động theo đúng nhịp.',
      allowedBlocks: ['robot_play_note', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_led_on', 'robot_led_off', 'robot_wait', 'robot_repeat'],
      labelVi: 'Lập trình đồng bộ',
      labelEn: 'Sync programming',
    },
    {
      id: 'step-8-3',
      order: 3,
      title: 'Trình diễn',
      descriptionVi: 'Chạy chương trình hoàn chỉnh!',
      allowedBlocks: ['robot_play_note', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_led_on', 'robot_led_off', 'robot_wait', 'robot_repeat'],
      labelVi: 'Trình diễn',
      labelEn: 'Perform',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_play_note', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'multi-robot-1',
  tags: ['innovation', 'dance', 'music', 'creativity', 'performance'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

// Lesson 9: Multi-Robot 1 (Basic coordination)
const lesson9MultiRobot1: Lesson = {
  id: 'advanced-09',
  slug: 'multi-robot-1',
  title: 'Phối hợp đa robot 1',
  titleVi: 'Phối hợp đa robot 1',
  titleEn: 'Multi-Robot 1',
  descriptionVi: 'Phối hợp hai robot di chuyển theo thứ tự và đội hình',
  descriptionEn: 'Coordinate two robots moving in sequence and formation',
  ageGroup: 'advanced',
  category: 'collaboration',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  objectives: ['Hiểu nguyên tắc phối hợp robot', 'Điều phối hành động theo thứ tự'],
  objectivesVi: ['Hiểu nguyên tắc phối hợp robot', 'Điều phối hành động theo thứ tự'],
  steps: [
    {
      id: 'step-9-1',
      order: 1,
      title: 'Robot 1 đi trước',
      descriptionVi: 'Robot 1 di chuyển 30 bước và bật đèn báo hiệu.',
      allowedBlocks: ['robot_move_forward', 'robot_wait', 'robot_led_on', 'robot_led_off'],
      labelVi: 'Robot 1 đi trước',
      labelEn: 'Robot 1 goes first',
    },
    {
      id: 'step-9-2',
      order: 2,
      title: 'Chờ tín hiệu',
      descriptionVi: 'Robot 2 đợi 3 giây (thời gian Robot 1 hoàn thành) rồi bắt đầu.',
      allowedBlocks: ['robot_wait', 'robot_move_forward', 'robot_led_on'],
      labelVi: 'Chờ tín hiệu',
      labelEn: 'Wait for signal',
    },
    {
      id: 'step-9-3',
      order: 3,
      title: 'Hoàn thành đội hình',
      descriptionVi: 'Cả hai robot di chuyển đến vị trí cuối cùng theo đội hình.',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_led_on', 'robot_led_off', 'robot_repeat'],
      labelVi: 'Hoàn thành đội hình',
      labelEn: 'Complete formation',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
    <block type="robot_wait" x="100" y="100">
      <value name="SECONDS">
        <shadow type="math_number"><field name="NUM">2</field></shadow>
      </value>
    </block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'multi-robot-2',
  tags: ['collaboration', 'multi-robot', 'coordination', 'teamwork'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 10: Multi-Robot 2 (Advanced team strategy)
const lesson10MultiRobot2: Lesson = {
  id: 'advanced-10',
  slug: 'multi-robot-2',
  title: 'Phối hợp đa robot 2',
  titleVi: 'Phối hợp đa robot 2',
  titleEn: 'Multi-Robot 2',
  descriptionVi: 'Chiến thuật đội nhóm nâng cao với phân chia vai trò trinh sát và tấn công',
  descriptionEn: 'Advanced team strategy with scout and attack role division',
  ageGroup: 'advanced',
  category: 'collaboration',
  difficulty: 'advanced',
  estimatedMinutes: 45,
  objectives: ['Chiến thuật đội nhóm nâng cao', 'Phân chia vai trò robot'],
  objectivesVi: ['Chiến thuật đội nhóm nâng cao', 'Phân chia vai trò robot'],
  steps: [
    {
      id: 'step-10-1',
      order: 1,
      title: 'Phân chia vai trò',
      descriptionVi: 'Robot A làm trinh sát (đo khoảng cách), Robot B làm tấn công.',
      allowedBlocks: ['robot_get_distance', 'robot_if_sensor', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_led_on'],
      labelVi: 'Phân chia vai trò',
      labelEn: 'Divide roles',
    },
    {
      id: 'step-10-2',
      order: 2,
      title: 'Trinh sát',
      descriptionVi: 'Robot A quét khu vực, phát hiện đối thủ và báo vị trí.',
      allowedBlocks: ['robot_get_distance', 'robot_if_sensor', 'robot_turn_left', 'robot_turn_right', 'robot_move_forward', 'robot_wait', 'robot_led_on', 'robot_led_off', 'robot_repeat'],
      labelVi: 'Trinh sát',
      labelEn: 'Scout',
    },
    {
      id: 'step-10-3',
      order: 3,
      title: 'Tấn công phối hợp',
      descriptionVi: 'Robot B di chuyển đến vị trí đối thủ theo chỉ dẫn từ Robot A.',
      allowedBlocks: ['robot_get_light_level', 'robot_if_sensor', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_led_on', 'robot_led_off', 'robot_repeat'],
      labelVi: 'Tấn công phối hợp',
      labelEn: 'Coordinated attack',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
    <block type="robot_set_speed" x="100" y="100">
      <value name="SPEED">
        <shadow type="math_number"><field name="NUM">70</field></shadow>
      </value>
    </block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'data-collector',
  tags: ['collaboration', 'multi-robot', 'strategy', 'advanced-teamwork'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 11: Data Collector (Sensor data logging)
const lesson11DataCollector: Lesson = {
  id: 'advanced-11',
  slug: 'data-collector',
  title: 'Thu thập dữ liệu',
  titleVi: 'Thu thập dữ liệu',
  titleEn: 'Data Collector',
  descriptionVi: 'Thu thập và phân tích dữ liệu cảm biến để đưa ra quyết định',
  descriptionEn: 'Collect and analyze sensor data to make informed decisions',
  ageGroup: 'advanced',
  category: 'algorithm',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  objectives: ['Thu thập và phân tích dữ liệu cảm biến', 'Đưa ra quyết định dựa trên dữ liệu'],
  objectivesVi: ['Thu thập và phân tích dữ liệu cảm biến', 'Đưa ra quyết định dựa trên dữ liệu'],
  steps: [
    {
      id: 'step-11-1',
      order: 1,
      title: 'Khảo sát khu vực',
      descriptionVi: 'Robot đi qua khu vực, ghi lại mức sáng tại 10 điểm khác nhau.',
      allowedBlocks: ['robot_get_light_level', 'robot_move_forward', 'robot_wait', 'robot_repeat'],
      labelVi: 'Khảo sát khu vực',
      labelEn: 'Survey area',
    },
    {
      id: 'step-11-2',
      order: 2,
      title: 'Phân tích dữ liệu',
      descriptionVi: 'Tìm điểm có mức sáng thấp nhất (có thể là đường hoặc vật thể).',
      allowedBlocks: ['robot_get_light_level', 'robot_if_sensor', 'robot_turn_left', 'robot_turn_right', 'robot_move_forward'],
      labelVi: 'Phân tích dữ liệu',
      labelEn: 'Analyze data',
    },
    {
      id: 'step-11-3',
      order: 3,
      title: 'Hành động theo phân tích',
      descriptionVi: 'Di chuyển đến điểm có dữ liệu quan trọng nhất.',
      allowedBlocks: ['robot_if_sensor', 'robot_get_light_level', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
      labelVi: 'Hành động theo phân tích',
      labelEn: 'Act on analysis',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'capstone-project',
  tags: ['algorithm', 'data', 'analysis', 'sensor-fusion'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 12: Capstone Project (Final challenge)
const lesson12Capstone: Lesson = {
  id: 'advanced-12',
  slug: 'capstone-project',
  title: 'Dự án tốt nghiệp',
  titleVi: 'Dự án tốt nghiệp',
  titleEn: 'Capstone Project',
  descriptionVi: 'Thiết kế và lập trình robot hoàn chỉnh áp dụng toàn bộ kiến thức',
  descriptionEn: 'Design and program a complete robot applying all knowledge gained',
  ageGroup: 'advanced',
  category: 'innovation',
  difficulty: 'advanced',
  estimatedMinutes: 60,
  objectives: ['Thiết kế và lập trình robot hoàn chỉnh', 'Áp dụng toàn bộ kiến thức đã học'],
  objectivesVi: ['Thiết kế và lập trình robot hoàn chỉnh', 'Áp dụng toàn bộ kiến thức đã học'],
  steps: [
    {
      id: 'step-12-1',
      order: 1,
      title: 'Xác định bài toán',
      descriptionVi: 'Thiết kế robot thông minh tự hành: di chuyển, tránh vật cản, theo đường, phản ứng với môi trường.',
      allowedBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off', 'robot_play_note'],
      labelVi: 'Xác định bài toán',
      labelEn: 'Define problem',
      hint: 'Kết hợp tất cả: di chuyển + cảm biến + điều kiện + vòng lặp',
    },
    {
      id: 'step-12-2',
      order: 2,
      title: 'Lập trình và gỡ lỗi',
      descriptionVi: 'Viết chương trình hoàn chỉnh. Thử nghiệm, phát hiện và sửa lỗi.',
      allowedBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off', 'robot_play_note'],
      labelVi: 'Lập trình và gỡ lỗi',
      labelEn: 'Program and debug',
    },
    {
      id: 'step-12-3',
      order: 3,
      title: 'Trình diễn và tối ưu',
      descriptionVi: 'Chạy robot trong môi trường thực. Tối ưu hóa hiệu suất.',
      allowedBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off', 'robot_play_note'],
      labelVi: 'Trình diễn và tối ưu',
      labelEn: 'Demonstrate and optimize',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_set_speed', 'robot_get_distance', 'robot_get_light_level', 'robot_if_sensor', 'robot_repeat', 'robot_led_on', 'robot_led_off', 'robot_play_note'],
  nextLessonSlug: undefined,
  tags: ['capstone', 'graduation', 'comprehensive', 'innovation'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

export const advancedCurriculum: Curriculum = {
  ageGroup: 'advanced',
  minAge: 13,
  maxAge: 16,
  titleVi: 'Chương trình Nâng cao (13-16 tuổi)',
  titleEn: 'Advanced Program (Ages 13-16)',
  descriptionVi: 'Thiết kế thuật toán phức tạp, chiến thuật thi đấu, và các dự án sáng tạo',
  descriptionEn: 'Design complex algorithms, competition strategies, and creative innovation projects',
  lessons: [
    lesson1NestedLogic,
    lesson2PathPlanner,
    lesson3AdaptiveNavigator,
    lesson4LineFollowerPro,
    lesson5SumoMaster,
    lesson6RescueRobot,
    lesson7Innovation1,
    lesson8Innovation2,
    lesson9MultiRobot1,
    lesson10MultiRobot2,
    lesson11DataCollector,
    lesson12Capstone,
  ],
  totalLessons: 12,
  totalHours: 8,
};
