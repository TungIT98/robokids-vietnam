/**
 * Beginner Curriculum (Ages 6-8)
 * Focus: Movement, basic commands, simple sequences
 */

import { Curriculum, Lesson, AgeGroupBlockConfig } from '../models/lesson';

// Age-group block configuration for beginner (6-8)
export const beginnerBlockConfig: AgeGroupBlockConfig = {
  ageGroup: 'beginner',
  availableBlocks: [
    'robot_move_forward',
    'robot_move_backward',
    'robot_turn_left',
    'robot_turn_right',
    'robot_wait',
    'robot_led_on',
    'robot_led_off',
  ],
  disabledBlocks: [],
  blockLabelsVi: {
    robot_move_forward: 'Đi tới',
    robot_move_backward: 'Đi lùi',
    robot_turn_left: 'Rẽ trái',
    robot_turn_right: 'Rẽ phải',
    robot_wait: 'Chờ',
    robot_led_on: 'Bật đèn',
    robot_led_off: 'Tắt đèn',
  },
  showCodePreview: false,
  maxLoopDepth: 1,
};

// Lesson 1: Hello Robot (Di chuyển cơ bản)
const lesson1HelloRobot: Lesson = {
  id: 'beginner-01',
  slug: 'hello-robot',
  title: 'Xin chào Robot!',
  titleVi: 'Xin chào Robot!',
  titleEn: 'Hello Robot!',
  descriptionVi: 'Bài học đầu tiên - làm quen với robot và các lệnh di chuyển cơ bản',
  descriptionEn: 'First lesson - getting started with robot and basic movement commands',
  ageGroup: 'beginner',
  category: 'movement',
  difficulty: 'basic',
  estimatedMinutes: 15,
  objectives: ['Hiểu cách robot di chuyển tới', 'Sử dụng khối move_forward'],
  objectivesVi: ['Hiểu cách robot di chuyển tới', 'Sử dụng khối move_forward'],
  steps: [
    {
      id: 'step-1-1',
      order: 1,
      title: 'Bật đèn robot',
      descriptionVi: 'Trước tiên, hãy bật đèn robot đểRobot thức dậy!',
      allowedBlocks: ['robot_led_on'],
      labelVi: 'Bật đèn',
      labelEn: 'Turn on LED',
      hint: 'Tìm khối "Bật đèn" trong danh mục Robot và kéo nó vào workspace',
    },
    {
      id: 'step-1-2',
      order: 2,
      title: 'Di chuyển tới',
      descriptionVi: 'Bây giờ hãy làm robot di chuyển tới với tốc độ 10 bước!',
      allowedBlocks: ['robot_move_forward'],
      labelVi: 'Di chuyển tới',
      labelEn: 'Move forward',
      hint: 'Kéo khối "Di chuyển tới" và nối với khối bật đèn',
    },
    {
      id: 'step-1-3',
      order: 3,
      title: 'Chờ một chút',
      descriptionVi: 'Robot cần nghỉ ngơi! Thêm khối chờ 2 giây.',
      allowedBlocks: ['robot_wait'],
      labelVi: 'Chờ',
      labelEn: 'Wait',
      hint: 'Khối chờ giúp robot dừng lại trước khi làm gì tiếp theo',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_led_on', 'robot_move_forward', 'robot_wait', 'robot_led_off'],
  nextLessonSlug: 'robot-dance',
  tags: ['basics', 'movement', 'first-steps'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 2: Robot Dance (Sequences)
const lesson2RobotDance: Lesson = {
  id: 'beginner-02',
  slug: 'robot-dance',
  title: 'Điệu nhảy Robot',
  titleVi: 'Điệu nhảy Robot',
  titleEn: 'Robot Dance',
  descriptionVi: 'Học cách tạo chuỗi lệnh liên tiếp để robot nhảy theo nhịp',
  descriptionEn: 'Learn to create sequential command chains for robot dance routines',
  ageGroup: 'beginner',
  category: 'movement',
  difficulty: 'basic',
  estimatedMinutes: 20,
  objectives: ['Tạo chuỗi lệnh liên tiếp', 'Kết hợp nhiều khối di chuyển'],
  objectivesVi: ['Tạo chuỗi lệnh liên tiếp', 'Kết hợp nhiều khối di chuyển'],
  steps: [
    {
      id: 'step-2-1',
      order: 1,
      title: 'Lên đến sân khấu',
      descriptionVi: 'Robot cần đi tới sân khấu! Di chuyển 20 bước.',
      allowedBlocks: ['robot_move_forward'],
      labelVi: 'Di chuyển tới',
      labelEn: 'Move forward',
    },
    {
      id: 'step-2-2',
      order: 2,
      title: 'Xoay trái',
      descriptionVi: 'Robot xoay trái 90 độ để chuẩn bị nhảy!',
      allowedBlocks: ['robot_turn_left'],
      labelVi: 'Rẽ trái',
      labelEn: 'Turn left',
    },
    {
      id: 'step-2-3',
      order: 3,
      title: 'Xoay phải',
      descriptionVi: 'Bây giờ xoay phải 90 độ!',
      allowedBlocks: ['robot_turn_right'],
      labelVi: 'Rẽ phải',
      labelEn: 'Turn right',
    },
    {
      id: 'step-2-4',
      order: 4,
      title: 'Lùi lại',
      descriptionVi: 'Robot lùi lại 10 bước về vị trí ban đầu.',
      allowedBlocks: ['robot_move_backward'],
      labelVi: 'Di chuyển lùi',
      labelEn: 'Move backward',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
    <block type="robot_move_forward" x="100" y="120">
      <value name="STEPS">
        <shadow type="math_number"><field name="NUM">20</field></shadow>
      </value>
    </block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'light-show',
  tags: ['movement', 'sequences', 'dance'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 3: Light Show (LED control)
const lesson3LightShow: Lesson = {
  id: 'beginner-03',
  slug: 'light-show',
  title: 'Show ánh sáng',
  titleVi: 'Show ánh sáng',
  titleEn: 'Light Show',
  descriptionVi: 'Khám phá điều khiển LED để tạo hiệu ứng ánh sáng đẹp mắt',
  descriptionEn: 'Explore LED control to create beautiful light effects',
  ageGroup: 'beginner',
  category: 'sound', // repurposed for LED creativity
  difficulty: 'basic',
  estimatedMinutes: 15,
  objectives: ['Bật tắt LED theo ý muốn', 'Tạo hiệu ứng ánh sáng'],
  objectivesVi: ['Bật tắt LED theo ý muốn', 'Tạo hiệu ứng ánh sáng'],
  steps: [
    {
      id: 'step-3-1',
      order: 1,
      title: 'Bật đèn LED',
      descriptionVi: 'Bật đèn robot lên!',
      allowedBlocks: ['robot_led_on'],
      labelVi: 'Bật đèn',
      labelEn: 'LED on',
    },
    {
      id: 'step-3-2',
      order: 2,
      title: 'Chờ 1 giây',
      descriptionVi: 'Đợi 1 giây để ngắm đèn!',
      allowedBlocks: ['robot_wait'],
      labelVi: 'Chờ 1 giây',
      labelEn: 'Wait 1 second',
    },
    {
      id: 'step-3-3',
      order: 3,
      title: 'Tắt đèn LED',
      descriptionVi: 'Tắt đèn đi!',
      allowedBlocks: ['robot_led_off'],
      labelVi: 'Tắt đèn',
      labelEn: 'LED off',
    },
  ],
  availableBlocks: ['robot_led_on', 'robot_led_off', 'robot_wait'],
  nextLessonSlug: 'maze-runner-1',
  tags: ['led', 'creativity', 'timing'],
  version: 1,
  author: 'Content Creator',
  contentRating: 3,
};

// Lesson 4: Maze Runner 1 (Simple navigation)
const lesson4MazeRunner: Lesson = {
  id: 'beginner-04',
  slug: 'maze-runner-1',
  title: 'Thoát khỏi mê cung 1',
  titleVi: 'Thoát khỏi mê cung 1',
  titleEn: 'Maze Runner 1',
  descriptionVi: 'Áp dụng kiến thức di chuyển để giải mê cung đơn giản',
  descriptionEn: 'Apply movement knowledge to solve a simple maze challenge',
  ageGroup: 'beginner',
  category: 'challenges',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  objectives: ['Áp dụng chuỗi di chuyển vào giải đố', 'Lên kế hoạch đường đi'],
  objectivesVi: ['Áp dụng chuỗi di chuyển vào giải đố', 'Lên kế hoạch đường đi'],
  steps: [
    {
      id: 'step-4-1',
      order: 1,
      title: 'Đi tới 15 bước',
      descriptionVi: 'Bắt đầu! Robot đi tới 15 bước để đến ngã rẽ đầu tiên.',
      allowedBlocks: ['robot_move_forward'],
      labelVi: 'Di chuyển tới',
      labelEn: 'Move forward',
    },
    {
      id: 'step-4-2',
      order: 2,
      title: 'Rẽ phải',
      descriptionVi: 'Rẽ phải 90 độ.',
      allowedBlocks: ['robot_turn_right'],
      labelVi: 'Rẽ phải',
      labelEn: 'Turn right',
    },
    {
      id: 'step-4-3',
      order: 3,
      title: 'Đi tiếp 10 bước',
      descriptionVi: 'Đi tới 10 bước nữa để đến đích!',
      allowedBlocks: ['robot_move_forward'],
      labelVi: 'Di chuyển tới',
      labelEn: 'Move forward',
    },
  ],
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait'],
  nextLessonSlug: 'maze-runner-2',
  tags: ['challenge', 'navigation', 'maze'],
  version: 1,
  author: 'Content Creator',
  contentRating: 3,
};

// Lesson 5: Maze Runner 2 (More complex navigation)
const lesson5MazeRunner2: Lesson = {
  id: 'beginner-05',
  slug: 'maze-runner-2',
  title: 'Thoát khỏi mê cung 2',
  titleVi: 'Thoát khỏi mê cung 2',
  titleEn: 'Maze Runner 2',
  descriptionVi: 'Giải mê cung phức tạp hơn với nhiều lần rẽ hướng',
  descriptionEn: 'Solve a more complex maze with multiple direction changes',
  ageGroup: 'beginner',
  category: 'challenges',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  objectives: ['Giải mê cung phức tạp hơn', 'Sử dụng nhiều lần rẽ'],
  objectivesVi: ['Giải mê cung phức tạp hơn', 'Sử dụng nhiều lần rẽ'],
  steps: [
    {
      id: 'step-5-1',
      order: 1,
      title: 'Đi tới',
      descriptionVi: 'Đi tới 10 bước.',
      allowedBlocks: ['robot_move_forward'],
      labelVi: 'Di chuyển tới',
      labelEn: 'Move forward',
    },
    {
      id: 'step-5-2',
      order: 2,
      title: 'Rẽ trái',
      descriptionVi: 'Rẽ trái 90 độ.',
      allowedBlocks: ['robot_turn_left'],
      labelVi: 'Rẽ trái',
      labelEn: 'Turn left',
    },
    {
      id: 'step-5-3',
      order: 3,
      title: 'Đi tiếp 20 bước',
      descriptionVi: 'Đi tới 20 bước.',
      allowedBlocks: ['robot_move_forward'],
      labelVi: 'Di chuyển tới',
      labelEn: 'Move forward',
    },
    {
      id: 'step-5-4',
      order: 4,
      title: 'Rẽ phải',
      descriptionVi: 'Rẽ phải 90 độ.',
      allowedBlocks: ['robot_turn_right'],
      labelVi: 'Rẽ phải',
      labelEn: 'Turn right',
    },
    {
      id: 'step-5-5',
      order: 5,
      title: 'Về đích',
      descriptionVi: 'Đi tới 15 bước để về đích!',
      allowedBlocks: ['robot_move_forward'],
      labelVi: 'Di chuyển tới',
      labelEn: 'Move forward',
    },
  ],
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait'],
  nextLessonSlug: 'robot-artist',
  tags: ['challenge', 'navigation', 'maze', 'graduation'],
  version: 1,
  author: 'Content Creator',
  contentRating: 3,
};

// Lesson 6: Robot Artist (Drawing shapes)
const lesson6RobotArtist: Lesson = {
  id: 'beginner-06',
  slug: 'robot-artist',
  title: 'Họa sĩ Robot',
  titleVi: 'Họa sĩ Robot',
  titleEn: 'Robot Artist',
  descriptionVi: 'Điều khiển robot vẽ các hình geometric đơn giản',
  descriptionEn: 'Control the robot to draw simple geometric shapes',
  ageGroup: 'beginner',
  category: 'creativity',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  objectives: ['Vẽ hình vuông bằng robot', 'Kết hợp di chuyển và rẽ'],
  objectivesVi: ['Vẽ hình vuông bằng robot', 'Kết hợp di chuyển và rẽ'],
  steps: [
    {
      id: 'step-6-1',
      order: 1,
      title: 'Vẽ cạnh đầu tiên',
      descriptionVi: 'Robot di chuyển 20 bước để vẽ cạnh đầu tiên.',
      allowedBlocks: ['robot_move_forward'],
      labelVi: 'Cạnh đầu tiên',
      labelEn: 'First side',
    },
    {
      id: 'step-6-2',
      order: 2,
      title: 'Quẹo 90 độ',
      descriptionVi: 'Robot quẹo phải 90 độ để chuẩn bị vẽ cạnh tiếp theo.',
      allowedBlocks: ['robot_turn_right'],
      labelVi: 'Quẹo phải',
      labelEn: 'Turn right',
    },
    {
      id: 'step-6-3',
      order: 3,
      title: 'Hoàn thành hình vuông',
      descriptionVi: 'Lặp lại 4 lần để vẽ hình vuông hoàn chỉnh!',
      allowedBlocks: ['robot_move_forward', 'robot_turn_right'],
      labelVi: 'Hình vuông',
      labelEn: 'Square',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'animal-robot',
  tags: ['creativity', 'shapes', 'geometry'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 7: Animal Robot (Animal movement mimicry)
const lesson7AnimalRobot: Lesson = {
  id: 'beginner-07',
  slug: 'animal-robot',
  title: 'Robot bắt chước động vật',
  titleVi: 'Robot bắt chước động vật',
  titleEn: 'Animal Robot',
  descriptionVi: 'Làm robot bắt chước chuyển động của các loài động vật khác nhau',
  descriptionEn: 'Make the robot mimic movements of different animals',
  ageGroup: 'beginner',
  category: 'creativity',
  difficulty: 'basic',
  estimatedMinutes: 20,
  objectives: ['Bắt chước chuyển động con kiến', 'Sáng tạo với chuỗi lệnh'],
  objectivesVi: ['Bắt chước chuyển động con kiến', 'Sáng tạo với chuỗi lệnh'],
  steps: [
    {
      id: 'step-7-1',
      order: 1,
      title: 'Kiến di chuyển thẳng',
      descriptionVi: 'Con kiến di chuyển thẳng về phía trước! Robot đi tới 10 bước.',
      allowedBlocks: ['robot_move_forward'],
      labelVi: 'Kiến đi thẳng',
      labelEn: 'Ant walks straight',
    },
    {
      id: 'step-7-2',
      order: 2,
      title: 'Thỏ nhảy',
      descriptionVi: 'Thỏ nhảy lên! Robot đi tới 5 bước, chờ, rồi đi tới 5 bước nữa.',
      allowedBlocks: ['robot_move_forward', 'robot_wait'],
      labelVi: 'Thỏ nhảy',
      labelEn: 'Bunny hop',
    },
    {
      id: 'step-7-3',
      order: 3,
      title: 'Rắn bò',
      descriptionVi: 'Rắn bò uốn éo! Robot đi thẳng rồi quẹo trái, đi thẳng rồi quẹo phải.',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right'],
      labelVi: 'Rắn bò',
      labelEn: 'Snake slithers',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'robot-chef',
  tags: ['creativity', 'animals', 'storytelling'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

// Lesson 8: Robot Chef (Cooking-themed sequencing)
const lesson8RobotChef: Lesson = {
  id: 'beginner-08',
  slug: 'robot-chef',
  title: 'Đầu bếp Robot',
  titleVi: 'Đầu bếp Robot',
  titleEn: 'Robot Chef',
  descriptionVi: 'Robot nấu ăn! Sử dụng chuỗi lệnh để làm công thức nấu ăn',
  descriptionEn: 'Robot cooks! Use command sequences to create recipes',
  ageGroup: 'beginner',
  category: 'creativity',
  difficulty: 'basic',
  estimatedMinutes: 20,
  objectives: ['Tạo chuỗi lệnh theo trình tự', 'LED như tín hiệu'],
  objectivesVi: ['Tạo chuỗi lệnh theo trình tự', 'LED như tín hiệu'],
  steps: [
    {
      id: 'step-8-1',
      order: 1,
      title: 'Chuẩn bị bếp',
      descriptionVi: 'Bật đèn bếp! Robot bật đèn LED để bắt đầu nấu.',
      allowedBlocks: ['robot_led_on'],
      labelVi: 'Bật bếp',
      labelEn: 'Turn on stove',
    },
    {
      id: 'step-8-2',
      order: 2,
      title: 'Khuấy nồi',
      descriptionVi: 'Robot quẹo trái rồi quẹo phải để "khuấy" nồi soup!',
      allowedBlocks: ['robot_turn_left', 'robot_turn_right'],
      labelVi: 'Khuấy nồi',
      labelEn: 'Stir pot',
    },
    {
      id: 'step-8-3',
      order: 3,
      title: 'Món hoàn thành',
      descriptionVi: 'Tắt bếp và bật đèn xanh báo món đã xong!',
      allowedBlocks: ['robot_led_off', 'robot_wait', 'robot_led_on'],
      labelVi: 'Món hoàn thành',
      labelEn: 'Dish done',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_off" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_led_on', 'robot_led_off', 'robot_wait', 'robot_turn_left', 'robot_turn_right', 'robot_move_forward'],
  nextLessonSlug: 'follow-leader',
  tags: ['creativity', 'cooking', 'sequencing', 'storytelling'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

// Lesson 9: Follow the Leader (Pattern following)
const lesson9FollowLeader: Lesson = {
  id: 'beginner-09',
  slug: 'follow-leader',
  title: 'Theo chỉ dẫn',
  titleVi: 'Theo chỉ dẫn',
  titleEn: 'Follow the Leader',
  descriptionVi: 'Robot làm theo mẫu - lặp lại chuỗi hành động đúng thứ tự',
  descriptionEn: 'Robot follows the pattern - repeat action sequences in the correct order',
  ageGroup: 'beginner',
  category: 'challenges',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  objectives: ['Lặp lại chuỗi mẫu chính xác', 'Tập trung vào trí nhớ'],
  objectivesVi: ['Lặp lại chuỗi mẫu chính xác', 'Tập trung vào trí nhớ'],
  steps: [
    {
      id: 'step-9-1',
      order: 1,
      title: 'Xem mẫu',
      descriptionVi: 'Xem robot làm mẫu: tiến - trái - tiến - phải. Ghi nhớ!',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right'],
      labelVi: 'Xem mẫu',
      labelEn: 'Watch pattern',
    },
    {
      id: 'step-9-2',
      order: 2,
      title: 'Làm theo',
      descriptionVi: 'Lặp lại đúng chuỗi mà robot đã làm!',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right'],
      labelVi: 'Làm theo',
      labelEn: 'Follow along',
    },
    {
      id: 'step-9-3',
      order: 3,
      title: 'Kiểm tra',
      descriptionVi: 'Robot đi đến đích đúng vị trí chưa?',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait'],
      labelVi: 'Kiểm tra',
      labelEn: 'Check result',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
    <block type="robot_move_forward" x="100" y="100">
      <value name="STEPS">
        <shadow type="math_number"><field name="NUM">10</field></shadow>
      </value>
    </block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'robot-olympics',
  tags: ['challenge', 'memory', 'pattern', 'sequencing'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 10: Robot Olympics (Mini challenge)
const lesson10RobotOlympics: Lesson = {
  id: 'beginner-10',
  slug: 'robot-olympics',
  title: 'Thế vận Robot',
  titleVi: 'Thế vận Robot',
  titleEn: 'Robot Olympics',
  descriptionVi: 'Thử thách cuối cùng! Robot thi đấu nhiều môn',
  descriptionEn: 'Final challenge! Robot competes in multiple events',
  ageGroup: 'beginner',
  category: 'competitions',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  objectives: ['Áp dụng tất cả kỹ năng đã học', 'Hoàn thành nhiều thử thách'],
  objectivesVi: ['Áp dụng tất cả kỹ năng đã học', 'Hoàn thành nhiều thử thách'],
  steps: [
    {
      id: 'step-10-1',
      order: 1,
      title: 'Chạy 100m',
      descriptionVi: 'Robot chạy tiến 30 bước nhanh nhất!',
      allowedBlocks: ['robot_move_forward'],
      labelVi: 'Chạy 100m',
      labelEn: '100m run',
    },
    {
      id: 'step-10-2',
      order: 2,
      title: 'Nhảy xa',
      descriptionVi: 'Robot nhảy: tiến 5 bước, chờ, tiến 5 bước.',
      allowedBlocks: ['robot_move_forward', 'robot_wait'],
      labelVi: 'Nhảy xa',
      labelEn: 'Long jump',
    },
    {
      id: 'step-10-3',
      order: 3,
      title: 'Xoay gymnastic',
      descriptionVi: 'Robot xoay 360 độ: quẹo trái 4 lần!',
      allowedBlocks: ['robot_turn_left'],
      labelVi: 'Xoay gymnastic',
      labelEn: 'Gymnastics spin',
    },
    {
      id: 'step-10-4',
      order: 4,
      title: 'Về đích',
      descriptionVi: 'Robot về đích! Bật đèn 3 lần để ăn mừng!',
      allowedBlocks: ['robot_led_on', 'robot_wait', 'robot_led_off'],
      labelVi: 'Về đích',
      labelEn: 'Finish line',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: undefined,
  tags: ['competition', 'review', 'olympics', 'graduation'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

// Lesson 11: Magic Loops (Loop concepts)
const lesson11MagicLoops: Lesson = {
  id: 'beginner-11',
  slug: 'magic-loops',
  title: 'Vòng Lặp Kỳ Diệu',
  titleVi: 'Vòng Lặp Kỳ Diệu',
  titleEn: 'Magic Loops',
  descriptionVi: 'Học cách sử dụng vòng lặp để lặp lại hành động nhiều lần một cách thông minh',
  descriptionEn: 'Learn to use loops to repeat actions smartly and efficiently',
  ageGroup: 'beginner',
  category: 'logic',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  objectives: ['Hiểu khái niệm lặp lại trong lập trình', 'Sử dụng vòng lặp để giảm số lệnh'],
  objectivesVi: ['Hiểu khái niệm lặp lại trong lập trình', 'Sử dụng vòng lặp để giảm số lệnh'],
  steps: [
    {
      id: 'step-11-1',
      order: 1,
      title: 'Vẽ hình vuông',
      descriptionVi: 'Robot vẽ hình vuông bằng 4 lệnh: tiến + rẽ phải, lặp 4 lần!',
      allowedBlocks: ['robot_move_forward', 'robot_turn_right', 'robot_wait'],
      labelVi: 'Vẽ hình vuông',
      labelEn: 'Draw square',
      hint: 'Dùng 4 lệnh tiến và rẽ để vẽ hình vuông, mỗi cạnh 15 bước',
    },
    {
      id: 'step-11-2',
      order: 2,
      title: 'Tìm hiểu vòng lặp',
      descriptionVi: 'Thay vì viết 8 lệnh, dùng vòng lặp "lặp 4 lần" để robot vẽ hình vuông chỉ với 2 lệnh!',
      allowedBlocks: ['robot_move_forward', 'robot_turn_right'],
      labelVi: 'Tìm hiểu vòng lặp',
      labelEn: 'Learn loops',
      hint: 'Vòng lặp giúp robot làm đi làm lại một nhóm lệnh',
    },
    {
      id: 'step-11-3',
      order: 3,
      title: 'Robot nhảy múa',
      descriptionVi: 'Robot nhảy múa: tiến 5 bước + rẽ trái + rẽ phải, lặp 3 lần!',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right'],
      labelVi: 'Robot nhảy múa',
      labelEn: 'Robot dance',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
    <block type="robot_move_forward" x="100" y="120">
      <value name="STEPS">
        <shadow type="math_number"><field name="NUM">15</field></shadow>
      </value>
    </block>
    <block type="robot_turn_right" x="100" y="190">
      <value name="ANGLE">
        <shadow type="math_number"><field name="NUM">90</field></shadow>
      </value>
    </block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'robot-melody',
  tags: ['loops', 'logic', 'efficiency', 'patterns'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

// Lesson 12: Robot Melody (Sound through LED patterns)
const lesson12RobotMelody: Lesson = {
  id: 'beginner-12',
  slug: 'robot-melody',
  title: 'Robot Biết Hát',
  titleVi: 'Robot Biết Hát',
  titleEn: 'Robot Melody',
  descriptionVi: 'Robot phát nhạc bằng đèn LED nhấp nháy theo nhịp - mỗi nhịp đèn là một nốt nhạc!',
  descriptionEn: 'Robot plays music using LED blink patterns - each blink is a musical note!',
  ageGroup: 'beginner',
  category: 'sound',
  difficulty: 'basic',
  estimatedMinutes: 20,
  objectives: ['Tạo chuỗi LED nhấp nháy theo nhịp', 'Hiểu mối liên hệ giữa ánh sáng và âm nhạc'],
  objectivesVi: ['Tạo chuỗi LED nhấp nháy theo nhịp', 'Hiểu mối liên hệ giữa ánh sáng và âm nhạc'],
  steps: [
    {
      id: 'step-12-1',
      order: 1,
      title: 'Nốt DO',
      descriptionVi: 'Robot bật đèn 1 lần nhanh để chơi nốt DO!',
      allowedBlocks: ['robot_led_on', 'robot_wait'],
      labelVi: 'Nốt DO',
      labelEn: 'Note DO',
      hint: 'Bật đèn → chờ 0.5s → tắt đèn = 1 nốt nhạc',
    },
    {
      id: 'step-12-2',
      order: 2,
      title: 'Nốt RE và MI',
      descriptionVi: 'Robot chơi nốt RE (2 lần nhấp) và MI (3 lần nhấp)!',
      allowedBlocks: ['robot_led_on', 'robot_led_off', 'robot_wait'],
      labelVi: 'Nốt RE và MI',
      labelEn: 'Notes RE and MI',
    },
    {
      id: 'step-12-3',
      order: 3,
      title: 'Bài hát robot',
      descriptionVi: 'Robot hát bài "Chào buổi sáng": DO-RE-MI-ĐEN-CHỜ-DO!',
      allowedBlocks: ['robot_led_on', 'robot_led_off', 'robot_wait'],
      labelVi: 'Bài hát robot',
      labelEn: 'Robot song',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_off" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_led_on', 'robot_led_off', 'robot_wait', 'robot_move_forward', 'robot_turn_left', 'robot_turn_right'],
  nextLessonSlug: 'light-show-2',
  tags: ['sound', 'music', 'led', 'creativity', 'patterns'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

// Lesson 13: Smart Robot (Sensors and conditions)
const lesson13SmartRobot: Lesson = {
  id: 'beginner-13',
  slug: 'smart-robot',
  title: 'Robot Thông Minh',
  titleVi: 'Robot Thông Minh',
  titleEn: 'Smart Robot',
  descriptionVi: 'Robot có "giác quan" - biết khi nào cần dừng lại, khi nào cần rẽ hướng',
  descriptionEn: 'Robot has "senses" - knows when to stop, when to turn',
  ageGroup: 'beginner',
  category: 'sensors',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  objectives: ['Hiểu robot có thể "cảm nhận" môi trường', 'Lập trình phản ứng với tình huống'],
  objectivesVi: ['Hiểu robot có thể "cảm nhận" môi trường', 'Lập trình phản ứng với tình huống'],
  steps: [
    {
      id: 'step-13-1',
      order: 1,
      title: 'Robot đi đến tường',
      descriptionVi: 'Robot đi tới cho đến khi gặp vật cản, rồi dừng lại!',
      allowedBlocks: ['robot_move_forward', 'robot_wait', 'robot_led_on'],
      labelVi: 'Đi đến tường',
      labelEn: 'Walk to wall',
      hint: 'Robot đi 5 bước, chờ, đi tiếp... cho đến khi gặp tường',
    },
    {
      id: 'step-13-2',
      order: 2,
      title: 'Robot phát tín hiệu',
      descriptionVi: 'Khi phát hiện vật cản, robot bật đèn đỏ và phát âm thanh cảnh báo!',
      allowedBlocks: ['robot_led_on', 'robot_wait', 'robot_led_off'],
      labelVi: 'Phát tín hiệu',
      labelEn: 'Signal alert',
    },
    {
      id: 'step-13-3',
      order: 3,
      title: 'Tránh vật cản',
      descriptionVi: 'Robot đi vòng quanh vật cản bằng cách rẽ trái khi gặp tường!',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_wait'],
      labelVi: 'Tránh vật cản',
      labelEn: 'Avoid obstacles',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_on" x="100" y="50"></block>
    <block type="robot_move_forward" x="100" y="120">
      <value name="STEPS">
        <shadow type="math_number"><field name="NUM">10</field></shadow>
      </value>
    </block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: 'rescue-robot',
  tags: ['sensors', 'conditions', 'problem-solving', 'smart'],
  version: 1,
  author: 'Content Creator',
  contentRating: 4,
};

// Lesson 14: Rescue Robot (Final project combining all skills)
const lesson14RescueRobot: Lesson = {
  id: 'beginner-14',
  slug: 'rescue-robot',
  title: 'Robot Giải Cứu',
  titleVi: 'Robot Giải Cứu',
  titleEn: 'Rescue Robot',
  descriptionVi: 'Dự án cuối khóa! Robot tìm đường đến nạn nhân, bật đèn hiệu, và quay về an toàn',
  descriptionEn: 'Final project! Robot finds the victim, turns on distress lights, and returns safely',
  ageGroup: 'beginner',
  category: 'challenges',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  objectives: ['Áp dụng tất cả kỹ năng đã học', 'Hoàn thành nhiệm vụ giải cứu hoàn chỉnh'],
  objectivesVi: ['Áp dụng tất cả kỹ năng đã học', 'Hoàn thành nhiệm vụ giải cứu hoàn chỉnh'],
  steps: [
    {
      id: 'step-14-1',
      order: 1,
      title: 'Khởi động',
      descriptionVi: 'Robot bật đèn xanh báo hiệu bắt đầu nhiệm vụ giải cứu!',
      allowedBlocks: ['robot_led_on', 'robot_wait'],
      labelVi: 'Khởi động',
      labelEn: 'Start mission',
    },
    {
      id: 'step-14-2',
      order: 2,
      title: 'Tìm nạn nhân',
      descriptionVi: 'Robot di chuyển tìm nạn nhân: đi tới, rẽ trái, đi tiếp...',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right'],
      labelVi: 'Tìm nạn nhân',
      labelEn: 'Find victim',
    },
    {
      id: 'step-14-3',
      order: 3,
      title: 'Bật đèn cứu hộ',
      descriptionVi: 'Robot bật đèn đỏ nhấp nháy 5 lần để báo hiệu tìm thấy nạn nhân!',
      allowedBlocks: ['robot_led_on', 'robot_wait', 'robot_led_off'],
      labelVi: 'Đèn cứu hộ',
      labelEn: 'Distress lights',
      hint: 'Bật đèn → chờ → tắt đèn → lặp lại 5 lần',
    },
    {
      id: 'step-14-4',
      order: 4,
      title: 'Quay về',
      descriptionVi: 'Robot quay về vị trí xuất phát an toàn!',
      allowedBlocks: ['robot_move_forward', 'robot_turn_left', 'robot_turn_right', 'robot_wait'],
      labelVi: 'Quay về',
      labelEn: 'Return home',
    },
    {
      id: 'step-14-5',
      order: 5,
      title: 'Thành công!',
      descriptionVi: 'Robot bật đèn xanh 3 lần để báo hiệu giải cứu thành công!',
      allowedBlocks: ['robot_led_on', 'robot_wait', 'robot_led_off'],
      labelVi: 'Thành công!',
      labelEn: 'Success!',
    },
  ],
  starterXml: `<xml>
    <block type="robot_led_off" x="100" y="50"></block>
  </xml>`,
  availableBlocks: ['robot_move_forward', 'robot_move_backward', 'robot_turn_left', 'robot_turn_right', 'robot_wait', 'robot_led_on', 'robot_led_off'],
  nextLessonSlug: undefined,
  tags: ['final-project', 'rescue', 'graduation', 'comprehensive'],
  version: 1,
  author: 'Content Creator',
  contentRating: 5,
};

export const beginnerCurriculum: Curriculum = {
  ageGroup: 'beginner',
  titleVi: 'Chương trình Nhập môn (6-8 tuổi)',
  titleEn: 'Beginner Program (Ages 6-8)',
  descriptionVi: 'Học cách điều khiển robot cơ bản qua các bài tập vui nhộn và trò chơi',
  descriptionEn: 'Learn basic robot control through fun exercises and games',
  lessons: [
    lesson1HelloRobot,
    lesson2RobotDance,
    lesson3LightShow,
    lesson4MazeRunner,
    lesson5MazeRunner2,
    lesson6RobotArtist,
    lesson7AnimalRobot,
    lesson8RobotChef,
    lesson9FollowLeader,
    lesson10RobotOlympics,
    lesson11MagicLoops,
    lesson12RobotMelody,
    lesson13SmartRobot,
    lesson14RescueRobot,
  ],
  totalLessons: 14,
  totalHours: 5,
  minAge: 6,
  maxAge: 8,
};
