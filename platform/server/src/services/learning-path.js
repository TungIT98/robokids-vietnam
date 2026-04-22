/**
 * RoboBuddy Predictive Learning Paths Service
 * AI Engine for analyzing student progress and recommending personalized learning paths
 *
 * Features:
 * - Analyzes student progress data to identify knowledge gaps
 * - Tracks quiz results, mission failures, time-to-complete metrics
 * - Generates personalized learning path recommendations using MiniMax API
 * - Considers age group, learning style, and engagement patterns
 */

import { supabase } from '../lib/supabase.js';
import { chatWithAI, buildSystemMessage } from './minimax.js';
import { getLessonsForLevel, getLesson, getAgeGroupKey, buildCurriculumContext } from './curriculum-context.js';
import { getBehaviorProfile, getBehaviorAnalytics } from './proactive-tutor.js';
import { getAgeGroup, AGE_GROUPS } from './robobuddy-templates.js';

// Knowledge gap detection thresholds
const KNOWLEDGE_GAP_THRESHOLDS = {
  missionFailureRate: 0.4,        // >40% failure rate indicates gap
  timeThresholdMultiplier: 2.0, // >2x average time indicates struggle
  repeatedErrors: 2,              // >2 similar errors indicates concept gap
  lowSuccessRate: 0.5            // <50% success rate indicates weakness
};

// ============================================
// STUDENT PROGRESS ANALYTICS
// ============================================

/**
 * Get comprehensive student progress data for analysis
 */
export async function getStudentProgressData(studentId) {
  // Get lesson progress
  const { data: lessonProgress } = await supabase
    .from('lesson_progress')
    .select(`
      *,
      lessons (
        id,
        slug,
        title_vi,
        category,
        difficulty,
        age_group,
        estimated_minutes
      )
    `)
    .eq('user_id', studentId)
    .order('updated_at', { ascending: false });

  // Get mission progress
  const { data: missionProgress } = await supabase
    .from('user_missions')
    .select('*')
    .eq('user_id', studentId);

  // Get user profile for age
  const { data: profile } = await supabase
    .from('profiles')
    .select('age, full_name')
    .eq('id', studentId)
    .single();

  // Get user_progress for XP and overall stats
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', studentId)
    .single();

  return {
    studentId,
    profile,
    lessonProgress: lessonProgress || [],
    missionProgress: missionProgress || [],
    userProgress,
    age: profile?.age || 10,
    name: profile?.full_name || 'Student'
  };
}

/**
 * Analyze lesson progress to identify knowledge gaps
 */
export function analyzeLessonGaps(lessonProgress, averageTimes = {}) {
  const gaps = [];

  for (const progress of lessonProgress) {
    const lesson = progress.lessons;
    if (!lesson) continue;

    // Check time spent vs estimated
    const estimatedMinutes = lesson.estimated_minutes || 15;
    const actualMinutes = (progress.time_spent_seconds || 0) / 60;
    const timeRatio = actualMinutes / estimatedMinutes;

    if (timeRatio > KNOWLEDGE_GAP_THRESHOLDS.timeThresholdMultiplier) {
      gaps.push({
        type: 'time_struggle',
        lessonId: lesson.id,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title_vi,
        category: lesson.category,
        difficulty: lesson.difficulty,
        timeRatio: Math.round(timeRatio * 10) / 10,
        actualMinutes: Math.round(actualMinutes),
        estimatedMinutes
      });
    }

    // Check for incomplete lessons (started but not completed)
    if (!progress.completed && progress.started_at) {
      const startedDaysAgo = Math.floor(
        (Date.now() - new Date(progress.started_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (startedDaysAgo > 3) {
        gaps.push({
          type: 'abandoned',
          lessonId: lesson.id,
          lessonSlug: lesson.slug,
          lessonTitle: lesson.title_vi,
          category: lesson.category,
          difficulty: lesson.difficulty,
          daysSinceStart: startedDaysAgo
        });
      }
    }

    // Check low ratings
    if (progress.student_rating && progress.student_rating <= 2) {
      gaps.push({
        type: 'low_rating',
        lessonId: lesson.id,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title_vi,
        category: lesson.category,
        difficulty: lesson.difficulty,
        rating: progress.student_rating
      });
    }
  }

  return gaps;
}

/**
 * Analyze mission progress to identify failure patterns
 */
export function analyzeMissionGaps(missionProgress) {
  const gaps = [];
  const missionStats = {};

  for (const mission of missionProgress) {
    const missionType = mission.mission_type || 'general';

    if (!missionStats[missionType]) {
      missionStats[missionType] = { total: 0, failed: 0, failedIds: [] };
    }

    missionStats[missionType].total++;

    if (mission.status === 'failed' || mission.status === 'completed_with_failures') {
      missionStats[missionType].failed++;
      missionStats[missionType].failedIds.push(mission.id);
    }
  }

  for (const [type, stats] of Object.entries(missionStats)) {
    const failureRate = stats.total > 0 ? stats.failed / stats.total : 0;

    if (failureRate > KNOWLEDGE_GAP_THRESHOLDS.missionFailureRate) {
      gaps.push({
        type: 'mission_failure_pattern',
        missionType: type,
        failureRate: Math.round(failureRate * 100),
        totalMissions: stats.total,
        failedMissions: stats.failed
      });
    }
  }

  return gaps;
}

// ============================================
// LEARNING PATH RECOMMENDATIONS
// ============================================

/**
 * Build comprehensive context for MiniMax API to generate learning path
 */
function buildLearningPathContext(studentData, gaps, behaviorAnalytics) {
  const { profile, lessonProgress, missionProgress, userProgress, age, name } = studentData;
  const ageGroup = getAgeGroupKey(age);
  const level = getAgeGroupKey(age);

  // Get curriculum context
  const curriculumContext = buildCurriculumContext(level);

  // Analyze completed vs total lessons
  const completedLessons = lessonProgress.filter(p => p.completed).length;
  const totalAttempts = lessonProgress.length;

  // Identify categories that need work
  const gapCategories = [...new Set(gaps.map(g => g.category).filter(Boolean))];

  // Recent struggles (last 5 lessons)
  const recentLessons = lessonProgress.slice(0, 5).map(p => ({
    title: p.lessons?.title_vi || 'Unknown',
    completed: p.completed,
    rating: p.student_rating,
    timeSpent: p.time_spent_seconds
  }));

  // Build context string
  return `
## Học sinh: ${name} (${age} tuổi, lứa ${ageGroup})

### Tiến độ học tập
- Đã hoàn thành: ${completedLessons} bài
- Đã thử: ${totalAttempts} bài
- XP hiện tại: ${userProgress?.total_xp || 0}
- Streak hiện tại: ${userProgress?.current_streak || 0} ngày

### Các bài gần đây
${recentLessons.map(l => `- ${l.title}: ${l.completed ? '✓ Hoàn thành' : '○ Chưa xong'} (${l.rating ? '★' + l.rating : 'chưa đánh giá'})`).join('\n')}

### Các vấn đề cần chú ý
${gaps.length > 0 ? gaps.map(g => `- [${g.type}] ${g.lessonTitle || g.missionType || JSON.stringify(g)}`).join('\n') : '- Không có vấn đề nghiêm trọng'}

### Các chủ đề cần củng cố
${gapCategories.length > 0 ? gapCategories.map(c => `- ${c}`).join('\n') : '- Cần đánh giá thêm'}

### Phân tích hành vi học tập
- Mức độ thất vọng: ${behaviorAnalytics?.frustrationLevel || 0}%
- Mức độ tập trung: ${behaviorAnalytics?.engagementLevel || 100}%
- Tỷ lệ thành công: ${behaviorAnalytics?.successRate || 0}%
- Số lần yêu cầu gợi ý: ${behaviorAnalytics?.hintRequests || 0}

### Chương trình học ${level.toUpperCase()}
${curriculumContext}

### Yêu cầu
Dựa trên thông tin trên, hãy đề xuất:
1. Bài học tiếp theo phù hợp nhất
2. 3 bài học ưu tiên để củng cố kiến thức yếu
3. Một số gợi ý ngắn gọn để cải thiện
`;
}

/**
 * Generate learning path recommendation using MiniMax API
 */
export async function generateLearningPath(studentId) {
  // Get student data
  const studentData = await getStudentProgressData(studentId);

  // Get behavior analytics if available
  let behaviorAnalytics = null;
  try {
    behaviorAnalytics = getBehaviorAnalytics(studentId);
  } catch (e) {
    // Behavior profile might not exist yet
  }

  // Analyze for gaps
  const lessonGaps = analyzeLessonGaps(studentData.lessonProgress);
  const missionGaps = analyzeMissionGaps(studentData.missionProgress);
  const allGaps = [...lessonGaps, ...missionGaps];

  // Get age-appropriate system prompt
  const systemMessage = buildSystemMessage(studentData.age);

  // Build context for AI
  const contextPrompt = buildLearningPathContext(studentData, allGaps, behaviorAnalytics);

  // Create user message asking for recommendations
  const userMessage = `Hãy phân tích tiến độ học tập của học sinh này và đề xuất lộ trình học tập cá nhân hóa. Trả lời bằng tiếng Việt, theo phong cách thân thiện của RoboBuddy.`;

  // Call MiniMax API
  const messages = [
    systemMessage,
    { role: 'user', content: `${contextPrompt}\n\n${userMessage}` }
  ];

  try {
    const response = await chatWithAI(messages, { maxTokens: 2000 });

    return {
      success: true,
      studentId,
      studentName: studentData.name,
      age: studentData.age,
      ageGroup: getAgeGroupKey(studentData.age),
      gapsFound: allGaps.length,
      gaps: allGaps.slice(0, 10), // Top 10 most recent gaps
      recommendation: response.content,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating learning path:', error);

    // Fallback to basic recommendations without AI
    return generateFallbackLearningPath(studentData, allGaps);
  }
}

/**
 * Fallback learning path when AI is unavailable
 */
function generateFallbackLearningPath(studentData, gaps) {
  const age = studentData.age;
  const level = getAgeGroupKey(age);
  const lessons = getLessonsForLevel(level);

  // Get completed lesson IDs
  const completedLessonIds = studentData.lessonProgress
    .filter(p => p.completed)
    .map(p => p.lesson_id);

  // Find next uncompleted lesson
  const nextLesson = lessons.find(l => !completedLessonIds.includes(l.id));

  // Get categories that need work
  const weakCategories = [...new Set(
    gaps
      .filter(g => g.category)
      .map(g => g.category)
  )];

  // Find lessons for weak categories
  const reinforcementLessons = lessons
    .filter(l => weakCategories.includes(l.category) && !completedLessonIds.includes(l.id))
    .slice(0, 3);

  return {
    success: true,
    studentId: studentData.studentId,
    studentName: studentData.name,
    age,
    ageGroup: level,
    gapsFound: gaps.length,
    gaps: gaps.slice(0, 10),
    recommendation: `Dựa trên phân tích, mình gợi ý lộ trình học tập cho bạn:

**Bài tiếp theo nên học:**
${nextLesson ? `- ${nextLesson.title}` : '- Hoàn thành các bài hiện tại trước'}

**Các bài ưu tiên củng cố:**
${reinforcementLessons.length > 0
  ? reinforcementLessons.map(l => `- ${l.title}`).join('\n')
  : '- Tiếp tục hoàn thành bài học hiện tại'}

**Lời khuyên:**
${gaps.some(g => g.type === 'time_struggle')
  ? '- Cố gắng tập trung hơn trong thời gian làm bài'
  : '- Tiếp tục duy trì nhịp học tập đều đặn'} ${studentData.age < 10 ? '🚀' : '💪'}

Mình sẵn sàng giúp bạn học bất kỳ lúc nào!`,
    generatedAt: new Date().toISOString(),
    fallback: true
  };
}

// ============================================
// KNOWLEDGE GAP ANALYSIS
// ============================================

/**
 * Generate detailed knowledge gap report for a student
 */
export async function generateKnowledgeGapReport(studentId) {
  const studentData = await getStudentProgressData(studentId);
  const lessonGaps = analyzeLessonGaps(studentData.lessonProgress);
  const missionGaps = analyzeMissionGaps(studentData.missionProgress);

  // Group gaps by category
  const gapsByCategory = {};
  for (const gap of [...lessonGaps, ...missionGaps]) {
    const category = gap.category || 'general';
    if (!gapsByCategory[category]) {
      gapsByCategory[category] = [];
    }
    gapsByCategory[category].push(gap);
  }

  // Calculate overall health score
  const totalLessons = studentData.lessonProgress.length;
  const completedLessons = studentData.lessonProgress.filter(p => p.completed).length;
  const completionRate = totalLessons > 0 ? completedLessons / totalLessons : 0;

  const timeGaps = lessonGaps.filter(g => g.type === 'time_struggle').length;
  const timeHealth = totalLessons > 0 ? Math.max(0, 1 - (timeGaps / totalLessons)) : 1;

  const overallHealth = Math.round((completionRate * 0.6 + timeHealth * 0.4) * 100);

  // Get behavior analytics
  let behaviorAnalytics = null;
  try {
    behaviorAnalytics = getBehaviorAnalytics(studentId);
  } catch (e) {
    // Ignore
  }

  return {
    studentId,
    studentName: studentData.name,
    age: studentData.age,
    generatedAt: new Date().toISOString(),

    summary: {
      overallHealthScore: overallHealth,
      completedLessons,
      totalLessonsAttempted: totalLessons,
      xp: studentData.userProgress?.total_xp || 0,
      engagementLevel: behaviorAnalytics?.engagementLevel || 100,
      frustrationLevel: behaviorAnalytics?.frustrationLevel || 0
    },

    gaps: {
      byCategory: gapsByCategory,
      totalGaps: lessonGaps.length + missionGaps.length,
      criticalGaps: lessonGaps.filter(g => g.type === 'time_struggle' && g.timeRatio > 3).length
    },

    recommendations: [
      overallHealth < 50 ? 'Nên ôn lại các bài đã học trước khi tiếp tục' : null,
      timeGaps > 2 ? 'Cần luyện tập thêm để cải thiện tốc độ' : null,
      missionGaps.length > 0 ? 'Cần củng cố kiến thức qua các bài tập nhỏ' : null
    ].filter(Boolean)
  };
}

// ============================================
// WEEKLY LEARNING PATH
// ============================================

/**
 * Generate a weekly learning plan for a student
 */
export async function generateWeeklyPlan(studentId) {
  const studentData = await getStudentProgressData(studentId);
  const gaps = analyzeLessonGaps(studentData.lessonProgress);

  const age = studentData.age || 10;
  const level = getAgeGroupKey(age);
  const allLessons = getLessonsForLevel(level);

  // Get completed lesson IDs
  const completedLessonIds = studentData.lessonProgress
    .filter(p => p.completed)
    .map(p => p.lesson_id);

  // Get weak categories
  const weakCategories = [...new Set(
    gaps
      .filter(g => g.type === 'time_struggle' || g.type === 'low_rating')
      .map(g => g.category)
      .filter(Boolean)
  )];

  // Build weekly plan
  const weeklyPlan = [];
  let dayIndex = 1;

  // Days 1-2: Focus on weak areas
  for (const category of weakCategories.slice(0, 2)) {
    const categoryLessons = allLessons
      .filter(l => l.category === category && !completedLessonIds.includes(l.id))
      .slice(0, 1);

    for (const lesson of categoryLessons) {
      if (dayIndex > 5) break;
      weeklyPlan.push({
        day: dayIndex,
        focus: 'củng cố',
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        reason: `Cần ôn lại kiến thức về ${category}`
      });
      dayIndex++;
    }
  }

  // Days 3-4: Continue curriculum
  const nextUndoneLesson = allLessons.find(l => !completedLessonIds.includes(l.id));
  if (nextUndoneLesson && dayIndex <= 4) {
    weeklyPlan.push({
      day: dayIndex,
      focus: 'học mới',
      lessonId: nextUndoneLesson.id,
      lessonTitle: nextUndoneLesson.title,
      reason: 'Tiếp tục chương trình học'
    });
    dayIndex++;
  }

  // Day 5: Review and practice
  if (dayIndex <= 5) {
    weeklyPlan.push({
      day: 5,
      focus: 'ôn tập',
      lessonId: null,
      lessonTitle: 'Ôn tập tổng hợp',
      reason: 'Luyện tập các khái niệm đã học trong tuần'
    });
  }

  return {
    studentId,
    studentName: studentData.name,
    age,
    level,
    generatedAt: new Date().toISOString(),

    weeklyPlan,

    motivationalMessage: age < 10
      ? `🚀 Một tuần học tập tuyệt vời đang chờ ${studentData.name}! Mình tin bạn sẽ làm được!`
      : `💪 Một tuần học tập hiệu quả đang chờ ${studentData.name}! Cố gắng lên!`
  };
}

export default {
  getStudentProgressData,
  analyzeLessonGaps,
  analyzeMissionGaps,
  generateLearningPath,
  generateKnowledgeGapReport,
  generateWeeklyPlan
};
