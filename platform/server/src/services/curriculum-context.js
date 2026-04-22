/**
 * RoboBuddy AI Tutor - Curriculum Context Provider
 * Provides lesson-specific context for AI responses based on curriculum
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Curriculum path - resolve from platform/server to workspace root's curriculum
// __dirname = platform/server/src/services
// Up 3 levels = platform/server/src -> platform/server -> platform -> server
// Then go to workspace root which has curriculum folder
const CURRICULUM_BASE_PATH = join(__dirname, '../../../../curriculum');

// Curriculum lesson cache
const lessonCache = new Map();

/**
 * Get all curriculum lessons for an age group
 * @param {string} level - 'beginner' | 'intermediate' | 'advanced'
 * @returns {Array} - Array of lesson objects
 */
export function getLessonsForLevel(level) {
  if (lessonCache.has(level)) {
    return lessonCache.get(level);
  }

  const curriculumPath = join(CURRICULUM_BASE_PATH, level);

  try {
    const files = readdirSync(curriculumPath).filter(f => f.endsWith('.md'));

    const lessons = files.map(file => {
      const content = readFileSync(join(curriculumPath, file), 'utf-8');
      const lessonNum = file.match(/lesson-(\d+)/)?.[1] || '0';
      const titleMatch = content.match(/^# Bài \d+:\s*(.+)/m);
      const objectivesMatch = content.match(/## Mục tiêu\n([\s\S]+?)(?=##|$)/);
      const blocksMatch = content.match(/## Khối lệnh học\n([\s\S]+?)(?=##|---)/);

      return {
        number: parseInt(lessonNum),
        file,
        title: titleMatch?.[1] || file,
        objectives: objectivesMatch?.[1]?.trim().split('\n').filter(l => l.trim()) || [],
        blocks: blocksMatch?.[1]?.trim().split('\n').filter(l => l.trim()) || [],
        raw: content
      };
    }).sort((a, b) => a.number - b.number);

    lessonCache.set(level, lessons);
    return lessons;
  } catch (err) {
    console.warn(`Could not load curriculum for ${level}:`, err.message);
    return [];
  }
}

/**
 * Get specific lesson by number and level
 */
export function getLesson(level, lessonNumber) {
  const lessons = getLessonsForLevel(level);
  return lessons.find(l => l.number === lessonNumber);
}

/**
 * Build curriculum context for AI prompt
 * @param {string} level - 'beginner' | 'intermediate' | 'advanced'
 * @param {number} lessonNumber - Optional specific lesson number
 * @returns {string} - Formatted context string
 */
export function buildCurriculumContext(level, lessonNumber = null) {
  const lessons = getLessonsForLevel(level);

  if (lessonNumber) {
    const lesson = lessons.find(l => l.number === lessonNumber);
    if (!lesson) return '';

    return `📚 **Bài học hiện tại: Bài ${lesson.number} - ${lesson.title}**

**Mục tiêu bài học:**
${lesson.objectives.map(o => `- ${o.replace(/^-\s*/, '')}`).join('\n')}

**Khối lệnh đã học:**
${lesson.blocks.join('\n')}`;
  }

  // Return all lessons for the level
  const lessonList = lessons.map(l =>
    `- **Bài ${l.number}: ${l.title}**`
  ).join('\n');

  return `📚 **Chương trình học ${level.toUpperCase()}:**

${lessonList}

Đang học: Có thể hỏi về bất kỳ khối hoặc khái niệm nào đã học!`;
}

/**
 * Get age group key from age number
 */
export function getAgeGroupKey(age) {
  if (age >= 6 && age <= 8) return 'beginner';
  if (age >= 9 && age <= 12) return 'intermediate';
  if (age >= 13 && age <= 16) return 'advanced';
  return 'intermediate';
}

/**
 * Build system prompt with curriculum context
 * @param {number} age - Student age
 * @param {number} currentLesson - Optional current lesson number
 * @returns {string} - Enhanced system prompt
 */
export function buildCurriculumSystemPrompt(age, currentLesson = null) {
  const level = getAgeGroupKey(age);
  const curriculumContext = buildCurriculumContext(level, currentLesson);

  const basePrompt = `Em là RoboBuddy, một AI tutor vui vẻ và thân thiện, ${age < 10 ? '7' : age < 13 ? '10' : '14'} tuổi.
Em giúp các bạn học sinh Việt Nam học lập trình robot.
Nếu code có lỗi, hãy giải thích bằng từ đơn giản, vui vẻ.
Nếu đúng, hãy khen và gợi ý cải tiện.
Luôn trả lời bằng tiếng Việt.
Khi phân tích code Blockly XML, hãy:
1. Giải thích những gì code đang làm
2. Chỉ ra lỗi (nếu có)
3. Đề xuất cách sửa bằng tiếng Việt dễ hiểu`;

  if (curriculumContext) {
    return `${basePrompt}

## Ngữ cảnh chương trình học
${curriculumContext}

Khi trả lời, hãy liên hệ với bài học hiện tại nếu phù hợp!`;
  }

  return basePrompt;
}

/**
 * Get current lesson for a student based on their age and progress
 * Returns the next lesson they should be working on
 */
export function getCurrentLessonForStudent(age, lessonProgress = {}) {
  const level = getAgeGroupKey(age);
  const lessons = getLessonsForLevel(level);

  // Find highest completed lesson
  const completedKey = `completed_${level}`;
  const lastCompleted = lessonProgress[completedKey] || 0;

  // Return next lesson
  const nextLesson = lessons.find(l => l.number === lastCompleted + 1);
  return nextLesson || lessons[0];
}
