/**
 * Parent Dashboard AI Insights API for RoboKids Vietnam
 * Generates AI-powered insights for parent dashboard
 *
 * Features:
 * - Child progress summary
 * - Strengths & areas for improvement
 * - Recommended actions
 * - Comparison with peers (anonymized)
 */

import express from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { chatWithAI, buildSystemMessage } from '../services/minimax.js';
import { getAgeGroup, AGE_GROUPS } from '../services/robobuddy-templates.js';

const router = express.Router();

/**
 * Get student's age from grade level (approximate)
 */
function estimateAgeFromGrade(gradeLevel) {
  if (!gradeLevel) return 10; // default to 10-year-old intermediate
  // Vietnamese grade: 1-12, typically starting at age 6
  return Math.min(16, Math.max(6, gradeLevel + 5));
}

/**
 * Analyze student performance to determine strengths and weaknesses
 */
async function analyzePerformance(enrollments, lessonProgress, badges, userProgress) {
  const analysis = {
    strengths: [],
    weaknesses: [],
    engagement: 'medium',
    completedLessons: 0,
    failedLessons: 0,
    averageTimePerLesson: 0,
    preferredDifficulty: null,
    badgeCount: badges?.length || 0
  };

  // Calculate lesson completion rates
  const totalLessons = lessonProgress?.length || 0;
  const completedLessons = lessonProgress?.filter(lp => lp.completed).length || 0;
  analysis.completedLessons = completedLessons;
  analysis.failedLessons = totalLessons - completedLessons;

  // Calculate average time per lesson
  const totalTime = lessonProgress?.reduce((sum, lp) => sum + (lp.time_spent_seconds || 0), 0) || 0;
  if (totalLessons > 0) {
    analysis.averageTimePerLesson = Math.round(totalTime / totalLessons);
  }

  // Analyze by course difficulty
  const byDifficulty = { beginner: 0, intermediate: 0, advanced: 0 };
  enrollments?.forEach(e => {
    const diff = e.courses?.difficulty?.toLowerCase();
    if (diff === 'beginner' || diff === 'easy') byDifficulty.beginner++;
    else if (diff === 'intermediate' || diff === 'medium') byDifficulty.intermediate++;
    else if (diff === 'advanced' || diff === 'hard') byDifficulty.advanced++;
  });

  // Determine preferred difficulty based on completion
  const maxDiff = Object.entries(byDifficulty).reduce((a, b) => a[1] > b[1] ? a : b);
  analysis.preferredDifficulty = maxDiff[0];

  // Engagement based on streak and recent activity
  if (userProgress?.current_streak_days > 7) {
    analysis.engagement = 'high';
  } else if (userProgress?.current_streak_days === 0) {
    analysis.engagement = 'low';
  }

  return analysis;
}

/**
 * Generate insights using MiniMax AI
 */
async function generateInsights(student, analysis, peerStats, age) {
  const ageGroup = getAgeGroup(age);

  const systemPrompt = {
    role: 'system',
    content: `Em là RoboBuddy - AI tutor thân thiện của RoboKids Vietnam. Em có nhiệm vụ tạo báo cáo insights ngắn gọn dành cho phụ huynh về tiến độ học tập của con họ.

Hãy tạo insights theo format sau (viết bằng tiếng Việt, dễ hiểu):

## 📊 Tổng quan
[2-3 câu tổng quan về tiến độ học tập của con]

## ✨ Điểm mạnh
- [Điểm mạnh 1]
- [Điểm mạnh 2]

## 📚 Cần cải thiện
- [Điểm cần cải thiện 1]
- [Điểm cần cải thiện 2]

## 💡 Đề xuất cho phụ huynh
- [Đề xuất 1]
- [Đề xuất 2]

## 📈 So sánh với bạn bè (anonymized)
[So sánh ngắn gọn với mức trung bình của các học sinh cùng độ tuổi]

Format: Markdown đơn giản, emoji phù hợp, không quá 300 từ total.`
  };

  const userPrompt = `Hãy tạo báo cáo insights cho phụ huynh của một học sinh ${age} tuổi (nhóm ${ageGroup}).

Thông tin học sinh:
- Tên: ${student.name || 'học sinh'}
- Tổng XP: ${analysis.totalXp || 0}
- Level hiện tại: ${analysis.currentLevel || 1}
- Số bài đã hoàn thành: ${analysis.completedLessons}
- Số bài chưa hoàn thành: ${analysis.failedLessons}
- Streak hiện tại: ${analysis.currentStreakDays || 0} ngày
- Khóa học đã hoàn thành: ${analysis.coursesCompleted || 0}
- Thời gian học tổng: ${Math.round((analysis.totalTimeSpentSeconds || 0) / 60)} phút
- Huy hiệu đã đạt: ${analysis.badgeCount}
- Mức độ tương tác: ${analysis.engagement === 'high' ? 'Cao' : analysis.engagement === 'low' ? 'Thấp' : 'Trung bình'}
- Khóa học ưa thích: ${analysis.preferredDifficulty || 'chưa xác định'}

Thống kê học sinh khác cùng độ tuổi (anonymized average):
- XP trung bình: ${peerStats?.averageXp || 0}
- Số bài trung bình hoàn thành: ${peerStats?.averageLessons || 0}
- Streak trung bình: ${peerStats?.averageStreak || 0} ngày

Hãy viết report ngắn gọn, thân thiện, phù hợp để phụ huynh hiểu và hành động.`;

  try {
    const result = await chatWithAI([systemPrompt, { role: 'user', content: userPrompt }], { maxTokens: 1000 });
    return result.content;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return null;
  }
}

/**
 * GET /api/insights/:parentId/students/:studentId/insights
 * Get AI-generated insights for a student's progress
 */
router.get('/:parentId/students/:studentId/insights', authenticate, async (req, res) => {
  try {
    const { parentId, studentId } = req.params;
    const requestingUserId = req.user.id;

    // Verify parent owns this student
    const { data: parentRelation } = await supabase
      .from('student_parent_relations')
      .select('id')
      .eq('student_id', studentId)
      .eq('parent_id', parentId)
      .single();

    if (!parentRelation) {
      // Check if it's admin/teacher
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', requestingUserId)
        .single();

      if (!profile || !['admin', 'teacher'].includes(profile.role)) {
        return res.status(403).json({ error: 'Not authorized to view this student\'s insights' });
      }
    }

    // Get student data
    const { data: student } = await supabase
      .from('students')
      .select(`
        id,
        grade_level,
        profiles (full_name, email)
      `)
      .eq('id', studentId)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get progress data
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', student.profiles?.id)
      .single();

    // Get enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        id,
        progress_percent,
        completed_at,
        courses (title, difficulty)
      `)
      .eq('student_id', studentId);

    // Get lesson progress
    const enrollmentIds = (enrollments || []).map(e => e.id);
    let lessonProgress = [];
    if (enrollmentIds.length > 0) {
      const { data: lp } = await supabase
        .from('lesson_progress')
        .select('*')
        .in('enrollment_id', enrollmentIds);
      lessonProgress = lp || [];
    }

    // Get badges
    const { data: earnedBadges } = await supabase
      .from('earned_badges')
      .select('id')
      .eq('user_id', student.profiles?.id);

    // Estimate age
    const age = estimateAgeFromGrade(student.grade_level);

    // Analyze performance
    const analysis = {
      totalXp: userProgress?.total_xp || 0,
      currentLevel: userProgress?.current_level || 1,
      currentStreakDays: userProgress?.current_streak_days || 0,
      coursesCompleted: enrollments?.filter(e => e.completed_at).length || 0,
      totalTimeSpentSeconds: lessonProgress.reduce((sum, lp) => sum + (lp.time_spent_seconds || 0), 0),
      ...await analyzePerformance(enrollments, lessonProgress, earnedBadges, userProgress)
    };

    // Get peer statistics (anonymized)
    // Note: This is a simplified version - in production, you'd aggregate properly
    const { data: peerData } = await supabase
      .from('user_progress')
      .select('total_xp, current_level, current_streak_days')
      .limit(100);

    const peerStats = peerData ? {
      averageXp: Math.round(peerData.reduce((sum, p) => sum + (p.total_xp || 0), 0) / (peerData.length || 1)),
      averageLessons: 0, // Would need more complex query
      averageStreak: Math.round(peerData.reduce((sum, p) => sum + (p.current_streak_days || 0), 0) / (peerData.length || 1))
    } : null;

    // Generate AI insights
    const insights = await generateInsights(
      { name: student.profiles?.full_name },
      analysis,
      peerStats,
      age
    );

    res.json({
      studentId,
      studentName: student.profiles?.full_name || null,
      age,
      ageGroup: getAgeGroup(age),
      analysis,
      insights,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error generating parent insights:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;