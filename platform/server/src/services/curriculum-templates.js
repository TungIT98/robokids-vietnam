/**
 * RoboBuddy AI Tutor - Curriculum-Aware Response Templates
 * Templates that integrate with the Vietnamese curriculum for lessons
 */

import { AGE_GROUPS, getAgeGroup } from './robobuddy-templates.js';

// Lesson-aware code explanation templates
export const LESSON_CODE_TEMPLATES = {
  [AGE_GROUPS.BEGINNER]: {
    name: 'curriculum_blockly_beginner',
    scenarios: {
      // Lesson 1: Hello Robot
      'lesson-1': {
        userPrompt: 'Em làm quen với robot',
        template: `Okey nè bạn! 🎉 RoboBuddy rất vui được làm quen!

🤖 Robot là gì nào:
- Robot là máy móc thông minh
- Nó làm theo LỆNH mình viết trong Blockly
- Giống như bạn nói chuyện với robot bằng ngôn ngữ riêng!

🟢 Khối quan trọng nhất: **KHI BẮT ĐẦU**
- Khi bạn nhấn nút CHẠY, robot sẽ làm gì?
- Nó sẽ đọc các khối bên dưới "KHI BẮT ĐẦU"
- Từ trên xuống dưới, lần lượt từng khối một!

Bạn thử nhấn nút CHẠY xem robot của bạn làm gì nào? 🌟`
      },
      // Lesson 2: Move Forward
      'lesson-2': {
        userPrompt: 'Làm sao để robot tiến tới',
        template: `Giỏi lắm bạn! 🔵 RoboBuddy sẽ dạy robot đi tới nè!

🤖 Khối **TIẾN TỚI**:
- Là khối màu xanh dương nè!
- Nó bảo robot: "Đi về phía trước nào!"
- Số bước = bao xa robot sẽ đi

🌟 Ví dụ nè:
- TIẾN TỚI 3 bước → Robot đi 3 bước về trước
- TIẾN TỚI 5 bước → Robot đi 5 bước về trước

💡 Thử thách nho nhỏ:
Bạn thử cho robot tiến tới 4 bước, rồi rẽ trái 90 độ xem nào! 🚀`
      },
      // Lesson 3: Turns
      'lesson-3': {
        userPrompt: 'Làm sao để robot rẽ trái/phải',
        template: `Hay lắm bạn! 🔄 RoboBuddy dạy robot quay hướng nè!

🤖 Hai khối quan trọng:
- **RẼ TRÁI** → Robot quay người sang TRÁI 90 độ
- **RẼ PHẢI** → Robot quay người sang PHẢI 90 độ

🔺 Giống như bạn:
- Rẽ trái khi đi đường = quay người sang trái
- Rẽ phải khi đi đường = quay người sang phải

90 độ = một góc VUÔNG = góc của tờ giấy!

💡 Thử thách:
Làm robot đi hình vuông siêu cool nè! 🔵➡️🔵➡️🔵➡️🔵➡️🔵`
      },
      // Lesson 4: Backward
      'lesson-4': {
        userPrompt: 'Làm sao để robot lùi',
        template: `Oke bạn! ⬇️ RoboBuddy dạy robot LÙI nè!

🤖 Khối **LÙI**:
- Giống như TIẾN TỚI nhưng ngược lại!
- Robot sẽ đi NGƯỢC về phía sau
- Số bước = số bước lùi

🔄 Nếu TIẾN TỚI = đi về trước
   Thì LÙI = đi về sau

💡 Thử thách:
Cho robot tiến tới 3 bước, rồi lùi 3 bước về chỗ cũ! Giống y như chưa đi! 😄`
      },
      // Lesson 5: Sequencing
      'lesson-5': {
        userPrompt: 'Ghép nhiều lệnh với nhau',
        template: `TUYỆT VỜI! 📝 Bạn đã học cách ghép lệnh rồi nè!

🤖 **Chuỗi lệnh** = các khối xếp theo THỨ TỰ:
- Robot đọc từ TRÊN xuống DƯỚI
- Làm lệnh 1 trước, rồi lệnh 2, rồi lệnh 3...

📌 QUAN TRỌNG:
- Nếu đúng thứ tự → robot đi đúng!
- Nếu sai thứ tự → robot đi SAI ĐƯỜNG!

🔵 Ví dụ vẽ chữ "L":
1. TIẾN TỚI 3 bước
2. RẼ TRÁI 90 độ
3. TIẾN TỚI 2 bước

Bạn thử làm robot vẽ chữ cái khác xem nào! 🌟`
      },
      // Lesson 6: Loops
      'lesson-6': {
        userPrompt: 'Làm robot lặp lại nhiều lần',
        template: `SIÊU QUÁ! 🔁 RoboBuddy dạy vòng lặp nè!

🤖 **VÒNG LẶP** = làm đi làm lại nhiều lần!
- Giống như hát lại bài hát
- Hoặc như đếm số: 1, 2, 3, 4, 1, 2, 3, 4...

🔄 Khối **LẶP LẠI** (repeat):
- Nói cho robot biết: "Làm điều này X lần nha!"
- X = số lần muốn lặp

💡 Tiết kiệm khối lệnh!
- KHÔNG có repeat: cần 8 khối để robot đi hình vuông
- CÓ repeat: chỉ cần 2 khối!

Bạn thử làm robot đi hình vuông bằng vòng lặp xem! 🎯`
      }
    }
  },

  [AGE_GROUPS.INTERMEDIATE]: {
    name: 'curriculum_blockly_intermediate',
    scenarios: {
      'lesson-1': {
        userPrompt: 'Em mới bắt đầu học robot',
        template: `Chào bạn! 🌟 Mình là RoboBuddy, sẽ cùng bạn khám phá lập trình robot!

🤖 **Robot là gì?**
- Robot là máy móc biết làm theo lệnh
- Mình viết lệnh bằng Blockly - ngôn ngữ kéo-thả đơn giản
- Robot sẽ đọc và thực hiện lệnh theo thứ tự

🟢 **Khối quan trọng nhất: KHI BẮT ĐẦU**
- Tất cả chương trình bắt đầu từ đây
- Robot chạy các khối bên dưới từ trên xuống

💡 Bạn đã sẵn sàng chưa? Hãy thử nhấn CHẠY và xem robot phản ứng nhé!`
      },
      'lesson-5': {
        userPrompt: 'Em chưa hiểu rõ về chuỗi lệnh',
        template: `Đây là kiến thức quan trọng nè! 📝 Mình giải thích nè:

**CHUỖI LỆNH (Sequence):**
- Robot đọc và thực hiện lệnh theo THỨ TỰ từ trên xuống
- Lệnh 1 xong → Lệnh 2 → Lệnh 3 → ...

⚠️ **Lỗi thường gặp:**
- Sai thứ tự → Robot đi sai đường!
- Quên một khối → Robot thiếu một bước

🔵 **Ví dụ vẽ chữ "L":**
1. TIẾN TỚI 3 bước
2. RẼ TRÁI 90 độ
3. TIẾN TỚI 2 bước

Bạn thử tự tạo một hình khác bằng chuỗi lệnh xem sao! 🚀`
      },
      'lesson-6': {
        userPrompt: 'Vòng lặp dùng như thế nào?',
        template: `Vòng lặp là gì? 🔁 Mình giải thích nè:

**VÒNG LẶP (Loop):**
- Cho phép chạy cùng một đoạn code nhiều lần
- Thay vì viết 4 lần "TIẾN TỚI + RẼ TRÁI", dùng repeat 4 lần!

**So sánh:**
```
❌ KHÔNG dùng repeat: 8 khối
   TIẾN + RẼ
   TIẾN + RẼ
   TIẾN + RẼ
   TIẾN + RẼ

✅ DÙNG repeat: 3 khối
   repeat 4 times:
     TIẾN TỚI
     RẼ TRÁI
```

💡 **Khi nào dùng:**
- Robot đi theo hình (vuông, tam giác)
- Làm điều lặp đi lặp lại nhiều lần

Bạn thử dùng repeat để robot vẽ hình vuông xem! 🎯`
      },
      'lesson-7': {
        userPrompt: 'Robot phát ra âm thanh như thế nào?',
        template: `Âm thanh! 🎵 Mình giải thích nè:

**Khối ÂM THANH:**
- Phát ra một giai điệu hoặc hiệu ứng âm thanh
- Có thể chọn loại âm thanh khác nhau

🔊 **Ví dụ:**
- "Happy birthday" - hát chúc mừng sinh nhật
- "Beep beep" - tiếng kêu báo hiệu
- "Robot welcome" - lời chào robot

**Kết hợp với chuỗi lệnh:**
```
KHI BẮT ĐẦU
├── PHÁT ÂM "beep beep"
├── TIẾN TỚI 3 bước
└── PHÁT ÂM "hoàn thành!"
```

💡 Bạn có thể cho robot chào khi bắt đầu và thông báo khi kết thúc nhiệm vụ!`
      }
    }
  },

  [AGE_GROUPS.ADVANCED]: {
    name: 'curriculum_blockly_advanced',
    scenarios: {
      'lesson-1': {
        userPrompt: 'Bắt đầu với robotics',
        template: `Chào bạn! 🤖 Mình là RoboBuddy, sẽ hướng dẫn bạn lập trình robot.

**Kiến thức nền tảng:**
- Robot = Hardware (ESP32) + Software (Blockly)
- Blockly là ngôn ngữ visual programming, biên dịch sang JavaScript
- ESP32 điều khiển động cơ DC qua driver TB6612FNG

**Môi trường học:**
- Platform: RoboKids Vietnam
- Hardware: ESP32-based robot kit
- Ngôn ngữ: Blockly → JavaScript → Machine code

**Khối cơ bản:**
- KHI BẮT ĐẦU: Entry point cho mọi chương trình
- Movement blocks: TIẾN, LÙI, RẼ
- Sensor blocks: Touch, Distance, Light

💡 Hãy bắt đầu với bài 1 và thực hành!`
      },
      'lesson-9': {
        userPrompt: 'Cảm biến hoạt động thế nào?',
        template: `Cảm biến! 👀 Mình giải thích chi tiết nè:

**Các loại cảm biến trong kit:**
1. **Ultrasonic (khoảng cách)**
   - Phát sóng âm, đo thời gian phản hồi
   - Khoảng cách = (vận tốc âm × thời gian) / 2

2. **Touch sensor (chạm)**
   - Công tắc cơ học, trả về TRUE/FALSE
   - TRUE = chạm, FALSE = không chạm

3. **Light sensor (ánh sáng)**
   - Quang trở, đo cường độ sáng
   - Giá trị: 0 (tối) → 1023 (sáng)

**Kết hợp với if-else:**
```
NẾU (khoảng cách < 20 cm) THÌ
  DỪNG
NGƯỢC LẠI
  TIẾN TỚI
```

💡 Đây là nền tảng của robot tự động! Bạn có muốn tìm hiểu thêm về điều khiển PID không?`
      },
      'lesson-10': {
        userPrompt: 'Làm robot cứu hộ như thế nào?',
        template: `Robot cứu hộ! 🚀 Đây là bài tổng hợp siêu cool!

**Thuật toán robot cứu hộ:**
1. **Tìm đường**: Di chuyển theo thám hiểm (exploration)
2. **Phát hiện**: Dùng cảm biến khoảng cách tìm nạn nhân
3. **Cứu nạn**: Đưa nạn nhân đến vùng an toàn

**Chiến lược điều khiển:**
- **Wall following**: Đi theo tường, dùng ultrasonic
- **Maze solving**: Thuật toán right-hand rule hoặc flood fill
- **Line tracking**: Theo đường line trên mặt đất

**Công nghệ sử dụng:**
- Ultrasonic: phát hiện vật cản và nạn nhân
- Motor control: điều khiển chính xác vị trí
- State machine: quản lý các trạng thái robot

💡 Bạn có muốn mình phân tích code mẫu robot cứu hộ không?`
      }
    }
  }
};

/**
 * Get curriculum template for a specific lesson
 * @param {number} age - Student age
 * @param {string} lessonId - Lesson identifier (e.g., 'lesson-5')
 * @returns {object|null} - Template object or null
 */
export function getCurriculumTemplate(age, lessonId) {
  const ageGroup = getAgeGroup(age);
  const templates = LESSON_CODE_TEMPLATES[ageGroup];

  if (!templates) return null;
  return templates.scenarios[lessonId] || null;
}

/**
 * Build curriculum-aware messages for AI chat
 * @param {number} age - Student age
 * @param {string} userMessage - User's message
 * @param {string} codeContext - Optional code context
 * @param {string} currentLesson - Optional current lesson ID
 * @returns {Array} - Messages array
 */
export function buildCurriculumChatMessages(age, userMessage, codeContext = null, currentLesson = null) {
  const ageGroup = getAgeGroup(age);

  // If we have a curriculum template for this lesson, use it
  if (currentLesson) {
    const template = getCurriculumTemplate(age, currentLesson);
    if (template) {
      // Build messages with curriculum context
      return buildMessagesWithContext(ageGroup, template, userMessage, codeContext);
    }
  }

  // Fallback to general age-appropriate response
  return null; // Let the main chat function handle this
}

/**
 * Build messages with curriculum context
 */
function buildMessagesWithContext(ageGroup, template, userMessage, codeContext) {
  const systemContent = getCurriculumSystemPrompt(ageGroup);
  const userContent = codeContext
    ? `${userMessage}\n\nCode của bạn:\n\`\`\`\n${codeContext}\n\`\`\``
    : userMessage;

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent }
  ];
}

/**
 * Get system prompt content for age group
 */
function getCurriculumSystemPrompt(ageGroup) {
  const prompts = {
    [AGE_GROUPS.BEGINNER]: `Em là RoboBuddy, một AI tutor vui vẻ và dễ thương, 7 tuổi! 🌟
Em giúp các bạn nhỏ Việt Nam học lập trình robot.
Em nói chuyện như một người bạn, đơn giản và vui vẻ.
Luôn trả lời bằng tiếng Việt, dùng emoji để giải thích.
Nếu code có lỗi, hãy giải thích bằng ví dụ như chơi đồ chơi.
Nếu đúng, hãy khen thật nhiều! 🎉`,

    [AGE_GROUPS.INTERMEDIATE]: `Em là RoboBuddy, một AI tutor vui vẻ và thân thiện, 10 tuổi.
Em giúp các bạn học sinh Việt Nam học lập trình robot.
Nếu code có lỗi, hãy giải thích bằng từ đơn giản, vui vẻ.
Nếu đúng, hãy khen và gợi ý cải tiện.
Luôn trả lời bằng tiếng Việt.`,

    [AGE_GROUPS.ADVANCED]: `Em là RoboBuddy, một AI tutor thông minh, 14 tuổi.
Em giúp các bạn học sinh Việt Nam học lập trình robot ở mức nâng cao.
Em giải thích chi tiết, chính xác, và khuyến khích tư duy logic.
Luôn trả lời bằng tiếng Việt.`
  };

  return prompts[ageGroup] || prompts[AGE_GROUPS.INTERMEDIATE];
}
