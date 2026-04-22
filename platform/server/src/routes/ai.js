import express from 'express';
import { chatWithAI, buildSystemMessage, testConnection, getCacheStats, clearCache } from '../services/minimax.js';
import { buildCurriculumSystemPrompt, getAgeGroupKey } from '../services/curriculum-context.js';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import {
  getBehaviorProfile,
  recordTaskStart,
  recordTaskAttempt,
  recordInputEvent,
  recordAIRequest,
  detectConfusion,
  detectLearningBrittleness,
  shouldProactivelyIntervene,
  generateEmotionalSupport,
  getBehaviorAnalytics,
  recordIntervention,
  getMicroLearningSuggestion,
  calculateDifficultyAdjustment,
  clearBehaviorSession
} from '../services/proactive-tutor.js';

const router = express.Router();

// In-memory session storage: Map<sessionId, { messages: [], lastActive: Date, age: number }>
const sessions = new Map();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// GET /api/ai/health - Test MiniMax API connectivity
router.get('/health', async (req, res) => {
  try {
    const result = await testConnection();
    const statusCode = result.success ? 200 : 503;
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
});

// GET /api/ai/cache/stats - Get semantic cache statistics
router.get('/cache/stats', (req, res) => {
  const stats = getCacheStats();
  res.json({
    semanticCache: stats,
    timestamp: new Date().toISOString()
  });
});

// GET /api/ai/recommendations - Get personalized content recommendations for student dashboard
// Returns structured JSON matching RecommendationCards.tsx interface
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const studentId = req.user.id;
    const userAge = req.user.user_metadata?.age || req.profile?.age || 10;
    const userName = req.user.user_metadata?.full_name || req.profile?.full_name || req.user.email?.split('@')[0] || 'học sinh';
    const level = getAgeGroupKey(userAge);

    // Get student progress data
    const { data: progress } = await supabase
      .from('user_progress')
      .select('total_xp, current_streak, longest_streak, lessons_completed')
      .eq('user_id', studentId)
      .single();

    // Get completed lessons with scores
    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('lesson_id, score, completed_at')
      .eq('user_id', studentId)
      .eq('completed', true);

    const completedLessonIds = completedLessons?.map(l => l.lesson_id) || [];
    const avgScore = completedLessons?.length > 0
      ? completedLessons.reduce((sum, l) => sum + (l.score || 0), 0) / completedLessons.length
      : 0;

    // Get attempted missions
    const { data: missions } = await supabase
      .from('user_missions')
      .select('mission_id, status, score')
      .eq('user_id', studentId);

    const completedMissionCount = missions?.filter(m => m.status === 'completed').length || 0;
    const totalXp = progress?.total_xp || 0;
    const currentStreak = progress?.current_streak || 0;

    // Get available lessons for student's age group (not yet completed)
    const { data: availableLessons } = await supabase
      .from('lessons')
      .select('id, slug, title_vi, title_en, description_vi, description_en, difficulty_level, xp_reward, estimated_minutes, category')
      .eq('difficulty_level', level)
      .eq('is_active', true)
      .limit(20);

    const unstartedLessons = availableLessons?.filter(l => !completedLessonIds.includes(l.id)) || [];

    // Get available missions
    const { data: availableMissions } = await supabase
      .from('mission_templates')
      .select('id, slug, title_vi, title_en, description_vi, description_en, mission_type, xp_reward, icon_emoji, age_group_filter')
      .eq('is_active', true)
      .limit(10);

    // Get challenges
    const { data: challenges } = await supabase
      .from('challenges')
      .select('id, slug, title_vi, title_en, description_vi, description_en, difficulty, xp_reward')
      .eq('is_active', true)
      .limit(10);

    // Build context for AI recommendation
    const contentContext = {
      lessons: unstartedLessons.slice(0, 5).map(l => ({
        id: l.id,
        title: l.title_vi,
        difficulty: l.difficulty_level,
        xp: l.xp_reward,
        category: l.category
      })),
      missions: (availableMissions || []).slice(0, 3).map(m => ({
        id: m.id,
        title: m.title_vi,
        type: m.mission_type,
        xp: m.xp_reward,
        emoji: m.icon_emoji
      })),
      challenges: (challenges || []).slice(0, 3).map(c => ({
        id: c.id,
        title: c.title_vi,
        difficulty: c.difficulty,
        xp: c.xp_reward
      }))
    };

    // Build AI prompt for structured recommendations
    const recommendationPrompt = `Bạn là RoboBuddy - trợ lý AI thân thiện của học sinh Việt Nam học lập trình robot.

Hãy đề xuất 3 nội dung học tập phù hợp nhất cho học sinh sau:
- Tên: ${userName}
- Tuổi: ${userAge} (cấp độ: ${level})
- Tổng XP: ${totalXp}
- Bài học đã hoàn thành: ${completedLessons?.length || 0}
- Điểm trung bình: ${avgScore.toFixed(1)}
- Nhiệm vụ đã hoàn thành: ${completedMissionCount}
- Streak hiện tại: ${currentStreak} ngày

Nội dung có sẵn:
${JSON.stringify(contentContext, null, 2)}

Hãy trả lời CHÍNH XÁC theo định dạng JSON array sau (KHÔNG có text khác ngoài JSON):
[
  {
    "id": "content_id",
    "type": "lesson|mission|challenge",
    "title": "Tên bài học/nhiệm vụ/thử thách",
    "titleVi": "Tên tiếng Việt",
    "description": "Mô tả ngắn",
    "descriptionVi": "Mô tả tiếng Việt",
    "difficulty": "easy|medium|hard",
    "estimatedMinutes": số_phút,
    "xpReward": số_xp,
    "iconEmoji": "emoji",
    "reason": "Lý do đề xuất bằng tiếng Việt"
  }
]

Quy tắc:
- Chọn đúng 3 nội dung (1 lesson, 1 mission, 1 challenge nếu có)
- Difficulty: easy=beginner, medium=intermediate, hard=advanced
- iconEmoji: dùng emoji phù hợp với nội dung (🤖 cho robot, 🎯 cho mission, 🔥 cho challenge khó)
- reason: giải thích ngắn bằng tiếng Việt tại sao nên học nội dung này
- CHỉ trả về JSON array, không có markdown code block hay text khác`;

    const messages = [
      buildSystemMessage(userAge),
      { role: 'user', content: recommendationPrompt }
    ];

    const result = await chatWithAI(messages, { maxTokens: 2048 });
    const responseText = result.content || result.message?.content || '';

    // Parse AI response - try to extract JSON
    let recommendations = [];
    try {
      // Try to find JSON array in response
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try parsing the whole response as JSON
        recommendations = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Failed to parse AI recommendation response:', parseError);
      // Provide fallback recommendations if AI parsing fails
      recommendations = generateFallbackRecommendations(unstartedLessons, availableMissions, challenges, level);
    }

    // Validate and sanitize recommendations
    recommendations = recommendations.slice(0, 3).map((rec, index) => ({
      id: rec.id || `rec-${index + 1}`,
      type: ['lesson', 'mission', 'challenge'].includes(rec.type) ? rec.type : 'lesson',
      title: rec.title || rec.titleVi || 'Nội dung học tập',
      titleVi: rec.titleVi || rec.title || 'Nội dung học tập',
      description: rec.description || rec.descriptionVi || '',
      descriptionVi: rec.descriptionVi || rec.description || '',
      difficulty: ['easy', 'medium', 'hard'].includes(rec.difficulty) ? rec.difficulty : 'medium',
      estimatedMinutes: rec.estimatedMinutes || 15,
      xpReward: rec.xpReward || rec.xp || 50,
      iconEmoji: rec.iconEmoji || (rec.type === 'mission' ? '🎯' : rec.type === 'challenge' ? '🏆' : '🤖'),
      reason: rec.reason || 'Phù hợp với trình độ của bạn'
    }));

    res.json({
      recommendations,
      studentId,
      progress: {
        completedLessons: completedLessons?.length || 0,
        averageScore: avgScore,
        totalXp,
        currentStreak,
        level
      },
      cached: result.cached || false
    });
  } catch (error) {
    console.error('AI recommendations error:', error);
    if (error.statusCode === 429) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service',
        retryAfter: error.retryAfter
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate fallback recommendations when AI parsing fails
function generateFallbackRecommendations(lessons, missions, challenges, level) {
  const recommendations = [];

  // Add a lesson
  if (lessons && lessons.length > 0) {
    const lesson = lessons[0];
    recommendations.push({
      id: lesson.id || 'fallback-lesson-1',
      type: 'lesson',
      title: lesson.title_vi || 'Bài học Robot',
      titleVi: lesson.title_vi || 'Bài học Robot',
      description: lesson.description_vi || 'Học cách lập trình robot',
      descriptionVi: lesson.description_vi || 'Học cách lập trình robot',
      difficulty: level === 'beginner' ? 'easy' : level === 'intermediate' ? 'medium' : 'hard',
      estimatedMinutes: lesson.estimated_minutes || 15,
      xpReward: lesson.xp_reward || 50,
      iconEmoji: '🤖',
      reason: 'Bài học tiếp theo phù hợp với trình độ của bạn'
    });
  }

  // Add a mission
  if (missions && missions.length > 0) {
    const mission = missions[0];
    recommendations.push({
      id: mission.id || 'fallback-mission-1',
      type: 'mission',
      title: mission.title_vi || 'Nhiệm vụ mới',
      titleVi: mission.title_vi || 'Nhiệm vụ mới',
      description: mission.description_vi || 'Hoàn thành nhiệm vụ để nhận XP',
      descriptionVi: mission.description_vi || 'Hoàn thành nhiệm vụ để nhận XP',
      difficulty: 'medium',
      estimatedMinutes: 20,
      xpReward: mission.xp_reward || 75,
      iconEmoji: mission.icon_emoji || '🎯',
      reason: 'Nhiệm vụ thú vị đang chờ bạn khám phá'
    });
  }

  // Add a challenge
  if (challenges && challenges.length > 0) {
    const challenge = challenges[0];
    recommendations.push({
      id: challenge.id || 'fallback-challenge-1',
      type: 'challenge',
      title: challenge.title_vi || 'Thử thách mới',
      titleVi: challenge.title_vi || 'Thử thách mới',
      description: challenge.description_vi || 'Thử sức với thử thách robot',
      descriptionVi: challenge.description_vi || 'Thử sức với thử thách robot',
      difficulty: challenge.difficulty || 'hard',
      estimatedMinutes: 25,
      xpReward: challenge.xp_reward || 100,
      iconEmoji: '🔥',
      reason: 'Thử thách để kiểm tra kỹ năng của bạn'
    });
  }

  return recommendations;
}

// ============================================
// CHURN PREDICTION & EARLY WARNING (ROB-672)
// ============================================

// Churn risk levels
const CHURN_RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Engagement thresholds for churn detection
const CHURN_THRESHOLDS = {
  // Days without activity to trigger warning
  inactivityWarningDays: 3,
  inactivityCriticalDays: 7,
  // Streak drop thresholds
  streakDropWarningPercent: 30,  // 30% drop from peak
  streakDropCriticalPercent: 50, // 50% drop from peak
  // XP trend thresholds
  xpDeclineWarningPercent: 20,   // 20% decline in weekly XP
  xpDeclineCriticalPercent: 40, // 40% decline in weekly XP
};

/**
 * Calculate engagement score based on recent activity
 */
function calculateEngagementScore(activityData) {
  let score = 100; // Start with max score

  // Deduct for inactivity
  if (activityData.daysSinceLastActivity >= CHURN_THRESHOLDS.inactivityCriticalDays) {
    score -= 50;
  } else if (activityData.daysSinceLastActivity >= CHURN_THRESHOLDS.inactivityWarningDays) {
    score -= 25;
  }

  // Deduct for streak decline
  if (activityData.streakDeclinePercent >= CHURN_THRESHOLDS.streakDropCriticalPercent) {
    score -= 30;
  } else if (activityData.streakDeclinePercent >= CHURN_THRESHOLDS.streakDropWarningPercent) {
    score -= 15;
  }

  // Deduct for XP decline
  if (activityData.xpDeclinePercent >= CHURN_THRESHOLDS.xpDeclineCriticalPercent) {
    score -= 20;
  } else if (activityData.xpDeclinePercent >= CHURN_THRESHOLDS.xpDeclineWarningPercent) {
    score -= 10;
  }

  // Deduct for reduced session frequency
  if (activityData.sessionFrequencyDecline >= 50) {
    score -= 15;
  } else if (activityData.sessionFrequencyDecline >= 25) {
    score -= 8;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine churn risk level from engagement score
 */
function getChurnRiskLevel(engagementScore) {
  if (engagementScore >= 75) return CHURN_RISK_LEVELS.LOW;
  if (engagementScore >= 50) return CHURN_RISK_LEVELS.MEDIUM;
  if (engagementScore >= 25) return CHURN_RISK_LEVELS.HIGH;
  return CHURN_RISK_LEVELS.CRITICAL;
}

/**
 * GET /api/ai/churn-risk/:studentId - Analyze churn risk for a specific student (staff/admin)
 */
router.get('/churn-risk/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const requesterId = req.user.id;
    const userRole = req.user.user_metadata?.role || req.profile?.role || 'student';

    // Only staff, admin, or teacher can view other students' churn risk
    if (userRole !== 'staff' && userRole !== 'admin' && userRole !== 'teacher' && studentId !== requesterId) {
      return res.status(403).json({ error: 'Insufficient permissions to view churn risk' });
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, age, created_at')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get user progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('total_xp, current_streak, longest_streak, lessons_completed, last_activity_at')
      .eq('user_id', studentId)
      .single();

    // Get streak checkins for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: checkins } = await supabase
      .from('streak_checkins')
      .select('checkin_date')
      .eq('user_id', studentId)
      .gte('checkin_date', thirtyDaysAgo)
      .order('checkin_date', { ascending: false });

    // Get lesson progress for the last 30 days
    const { data: recentLessons } = await supabase
      .from('lesson_progress')
      .select('completed_at, score, time_spent_seconds')
      .eq('user_id', studentId)
      .gte('updated_at', thirtyDaysAgo)
      .order('updated_at', { ascending: false });

    // Get weekly XP data (last 4 weeks)
    const weeklyXP = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const weekLessons = recentLessons?.filter(l => {
        const lessonDate = l.completed_at?.split('T')[0];
        return lessonDate >= weekStartStr && lessonDate < weekEndStr;
      }) || [];

      const weekXP = weekLessons.reduce((sum, l) => sum + (l.score || 0) * 10, 0);
      weeklyXP.unshift({ week: i + 1, xp: weekXP, lessonsCompleted: weekLessons.length });
    }

    // Calculate engagement metrics
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = progress?.last_activity_at?.split('T')[0];
    const daysSinceLastActivity = lastActivity
      ? Math.floor((new Date(today) - new Date(lastActivity)) / (24 * 60 * 60 * 1000))
      : 999;

    const currentStreak = progress?.current_streak || 0;
    const longestStreak = progress?.longest_streak || 0;
    const streakDeclinePercent = longestStreak > 0
      ? Math.max(0, ((longestStreak - currentStreak) / longestStreak) * 100)
      : 100;

    // Calculate weekly XP trend
    const thisWeekXP = weeklyXP[3]?.xp || 0;
    const lastWeekXP = weeklyXP[2]?.xp || 0;
    const xpDeclinePercent = lastWeekXP > 0
      ? Math.max(0, ((lastWeekXP - thisWeekXP) / lastWeekXP) * 100)
      : thisWeekXP === 0 ? 100 : 0;

    // Calculate session frequency (checkins per week)
    const recentWeeks = [
      checkins?.filter(c => {
        const d = new Date(c.checkin_date);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
      }).length || 0,
      checkins?.filter(c => {
        const d = new Date(c.checkin_date);
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return d >= twoWeeksAgo && d < weekAgo;
      }).length || 0,
    ];
    const sessionFrequencyDecline = recentWeeks[1] > 0
      ? Math.max(0, ((recentWeeks[1] - recentWeeks[0]) / recentWeeks[1]) * 100)
      : recentWeeks[0] === 0 ? 100 : 0;

    // Build engagement data for AI analysis
    const engagementData = {
      daysSinceLastActivity,
      streakDeclinePercent,
      xpDeclinePercent,
      sessionFrequencyDecline,
      currentStreak,
      longestStreak,
      totalXp: progress?.total_xp || 0,
      lessonsCompleted: progress?.lessons_completed || 0,
      weeklyXP,
      recentActivityCount: recentLessons?.length || 0,
      checkinCount: checkins?.length || 0
    };

    // Calculate engagement score
    const engagementScore = calculateEngagementScore(engagementData);
    const riskLevel = getChurnRiskLevel(engagementScore);

    // Use AI to generate detailed analysis for high-risk students
    let aiAnalysis = null;
    if (riskLevel === CHURN_RISK_LEVELS.HIGH || riskLevel === CHURN_RISK_LEVELS.CRITICAL) {
      const analysisPrompt = `Bạn là RoboBuddy - chuyên gia phân tích hành vi học sinh.

Phân tích dữ liệu sau để xác định nguy cơ học sinh NGỪNG HỌC (churn):
- Tên: ${profile.full_name || 'học sinh'}
- Số ngày không hoạt động: ${daysSinceLastActivity}
- Streak hiện tại: ${currentStreak} (kỷ lục: ${longestStreak})
- Mức giảm streak: ${streakDeclinePercent.toFixed(1)}%
- XP tuần này: ${thisWeekXP} (tuần trước: ${lastWeekXP})
- Mức giảm XP: ${xpDeclinePercent.toFixed(1)}%
- Số bài học hoàn thành gần đây (30 ngày): ${recentLessons?.length || 0}
- Tổng số bài đã hoàn thành: ${progress?.lessons_completed || 0}

Hãy trả lời CHÍNH XÁC theo định dạng JSON sau (KHÔNG có text khác):
{
  "riskLevel": "high|critical",
  "primaryFactors": ["Yếu tố chính khiến nguy cơ cao - viết bằng tiếng Việt"],
  "warningSigns": ["Các dấu hiệu cảnh báo - viết bằng tiếng Việt"],
  "recommendedActions": ["Hành động nên làm để giữ chân học sinh - viết bằng tiếng Việt"],
  "messageToParent": "Tin nhắn gửi phụ huynh bằng tiếng Việt, thân thiện, động viên",
  "retentionScore": số_từ_0_đến_100
}`;

      try {
        const messages = [
          buildSystemMessage(profile.age || 10),
          { role: 'user', content: analysisPrompt }
        ];
        const result = await chatWithAI(messages, { maxTokens: 1536 });
        const responseText = result.content || result.message?.content || '';

        // Parse AI response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[0]);
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
      }
    }

    // Build response
    const churnAnalysis = {
      studentId,
      studentName: profile.full_name,
      riskLevel,
      engagementScore,
      engagementData: {
        daysSinceLastActivity,
        streakDeclinePercent: parseFloat(streakDeclinePercent.toFixed(1)),
        xpDeclinePercent: parseFloat(xpDeclinePercent.toFixed(1)),
        sessionFrequencyDecline: parseFloat(sessionFrequencyDecline.toFixed(1)),
        currentStreak,
        longestStreak,
        weeklyXPTrend: weeklyXP.map(w => w.xp),
        recentActivityCount: recentLessons?.length || 0,
        checkinRate: checkins?.length || 0
      },
      aiAnalysis: aiAnalysis || null,
      generatedAt: new Date().toISOString()
    };

    // If critical risk, prepare alerts
    if (riskLevel === CHURN_RISK_LEVELS.CRITICAL || riskLevel === CHURN_RISK_LEVELS.HIGH) {
      churnAnalysis.alerts = {
        shouldAlertParent: true,
        shouldAlertCS: true,
        priority: riskLevel === CHURN_RISK_LEVELS.CRITICAL ? 'urgent' : 'normal',
        suggestedChannels: ['push_notification', 'email']
      };
    }

    res.json(churnAnalysis);
  } catch (error) {
    console.error('Churn risk analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/churn-risk - Get churn risk for authenticated student's own data
 */
router.get('/churn-risk', authenticate, async (req, res) => {
  try {
    const studentId = req.user.id;
    const userAge = req.user.user_metadata?.age || req.profile?.age || 10;

    // Get user progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('total_xp, current_streak, longest_streak, lessons_completed, last_activity_at')
      .eq('user_id', studentId)
      .single();

    // Get streak checkins for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: checkins } = await supabase
      .from('streak_checkins')
      .select('checkin_date')
      .eq('user_id', studentId)
      .gte('checkin_date', thirtyDaysAgo)
      .order('checkin_date', { ascending: false });

    // Get lesson progress for the last 30 days
    const { data: recentLessons } = await supabase
      .from('lesson_progress')
      .select('completed_at, score')
      .eq('user_id', studentId)
      .gte('updated_at', thirtyDaysAgo)
      .order('updated_at', { ascending: false });

    // Calculate engagement metrics
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = progress?.last_activity_at?.split('T')[0];
    const daysSinceLastActivity = lastActivity
      ? Math.floor((new Date(today) - new Date(lastActivity)) / (24 * 60 * 60 * 1000))
      : 999;

    const currentStreak = progress?.current_streak || 0;
    const longestStreak = progress?.longest_streak || 0;
    const streakDeclinePercent = longestStreak > 0
      ? Math.max(0, ((longestStreak - currentStreak) / longestStreak) * 100)
      : 100;

    // Calculate weekly XP trend
    const weeklyXP = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const weekLessons = recentLessons?.filter(l => {
        const lessonDate = l.completed_at?.split('T')[0];
        return lessonDate >= weekStartStr && lessonDate < weekEndStr;
      }) || [];

      const weekXPValue = weekLessons.reduce((sum, l) => sum + (l.score || 0) * 10, 0);
      weeklyXP.unshift({ week: i + 1, xp: weekXPValue });
    }

    const thisWeekXP = weeklyXP[3]?.xp || 0;
    const lastWeekXP = weeklyXP[2]?.xp || 0;
    const xpDeclinePercent = lastWeekXP > 0
      ? Math.max(0, ((lastWeekXP - thisWeekXP) / lastWeekXP) * 100)
      : thisWeekXP === 0 ? 100 : 0;

    const engagementScore = calculateEngagementScore({
      daysSinceLastActivity,
      streakDeclinePercent,
      xpDeclinePercent,
      sessionFrequencyDecline: 0
    });

    const riskLevel = getChurnRiskLevel(engagementScore);

    // Generate encouragement message for students
    let encouragement = null;
    if (riskLevel === CHURN_RISK_LEVELS.MEDIUM || riskLevel === CHURN_RISK_LEVELS.HIGH) {
      const encouragementPrompt = `Bạn là RoboBuddy - trợ lý AI vui vẻ của học sinh Việt Nam.

Học sinh đang có dấu hiệu giảm hoạt động:
- Đã ${daysSinceLastActivity} ngày không học
- Streak hiện tại: ${currentStreak} ngày
- XP tuần này: ${thisWeekXP} (tuần trước: ${lastWeekXP})

Hãy viết một tin nhắn động viên NGẮN GỌN, VUI VẺ bằng tiếng Việt (dưới 100 từ) để khuyến khích học sinh quay lại học. Không dùng emoji.

Chỉ trả lời đúng một tin nhắn, không có text khác.`;

      try {
        const messages = [
          buildSystemMessage(userAge),
          { role: 'user', content: encouragementPrompt }
        ];
        const result = await chatWithAI(messages, { maxTokens: 256 });
        encouragement = (result.content || result.message?.content || '').trim();
      } catch (aiError) {
        console.error('Encouragement AI error:', aiError);
      }
    }

    res.json({
      studentId,
      riskLevel,
      engagementScore,
      engagementData: {
        daysSinceLastActivity,
        currentStreak,
        weeklyXPTrend: weeklyXP.map(w => w.xp),
        lessonsCompleted30Days: recentLessons?.length || 0
      },
      encouragement,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Churn risk self-check error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/churn-alert - Send churn risk alerts to parent and CS team
 */
router.post('/churn-alert', authenticate, async (req, res) => {
  try {
    const { studentId, alertType } = req.body;
    const userRole = req.user.user_metadata?.role || req.profile?.role || 'student';

    // Only staff/admin can send alerts
    if (userRole !== 'staff' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only staff can send churn alerts' });
    }

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    // Get student and parent information
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get churn risk data
    const { data: progress } = await supabase
      .from('user_progress')
      .select('current_streak, last_activity_at')
      .eq('user_id', studentId)
      .single();

    // Get parent relation
    const { data: parentRelation } = await supabase
      .from('student_parent_relations')
      .select('parent_id, relationship')
      .eq('student_id', studentId)
      .single();

    let parentNotified = false;
    let csNotified = false;

    if (parentRelation) {
      // Get parent's profile and FCM token
      const { data: parentProfile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', parentRelation.parent_id)
        .single();

      const { data: parentDevice } = await supabase
        .from('parent_devices')
        .select('fcm_token')
        .eq('parent_id', parentRelation.parent_id)
        .single();

      if (parentDevice?.fcm_token) {
        // Import FCM service
        const { sendPushNotification } = await import('../services/fcm.js');

        const daysSince = progress?.last_activity_at
          ? Math.floor((Date.now() - new Date(progress.last_activity_at)) / (24 * 60 * 60 * 1000))
          : 7;

        await sendPushNotification(parentDevice.fcm_token, {
          title: '📚 Cần sự quan tâm từ phụ huynh',
          body: `${profile.full_name} đã ${daysSince} ngày không học trên RoboKids. Hãy cùng con quay lại học tập nhé!`,
          data: {
            type: 'churn_warning',
            studentId: studentId,
            alertType: alertType || 'inactivity'
          }
        });

        parentNotified = true;
      }

      // Record notification in database
      await supabase.from('parent_notifications').insert({
        parent_id: parentRelation.parent_id,
        student_id: studentId,
        notification_type: 'churn_warning',
        title: 'Cảnh báo nguy cơ nghỉ học',
        body: `Học sinh ${profile.full_name} đã ngưng hoạt động ${daysSince} ngày`,
        data: { studentId, alertType, riskLevel: 'high' }
      });
    }

    // Notify CS team (staff members)
    if (userRole === 'admin') {
      const { data: staffMembers } = await supabase
        .from('profiles')
        .select('id, fcm_token')
        .eq('role', 'staff');

      if (staffMembers) {
        const { sendPushNotification } = await import('../services/fcm.js');

        for (const staff of staffMembers) {
          if (staff.fcm_token) {
            await sendPushNotification(staff.fcm_token, {
              title: '⚠️ Cảnh báo học sinh nguy cơ nghỉ học',
              body: `Học sinh ${profile.full_name} - Streak: ${progress?.current_streak || 0} ngày - Cần liên hệ`,
              data: {
                type: 'churn_cs_alert',
                studentId: studentId,
                priority: 'high'
              }
            });
          }
        }
        csNotified = true;
      }
    }

    res.json({
      success: true,
      alerts: {
        parentNotified,
        csNotified,
        studentId,
        studentName: profile.full_name,
        lastActivity: progress?.last_activity_at,
        currentStreak: progress?.current_streak || 0
      },
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Churn alert error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/cache/clear - Clear semantic cache
router.post('/cache/clear', (req, res) => {
  clearCache();
  res.json({
    cleared: true,
    message: 'Semantic cache cleared'
  });
});

// POST /api/ai/prewarm - Pre-warm AI context for faster subsequent responses
// Called when student hovers over AI tutor button
router.post('/prewarm', async (req, res) => {
  try {
    const { age, currentLesson } = req.body;

    // Pre-warm prompt - uses curriculum context if available
    const prewarmPrompt = age
      ? `Xin chào! Mình là RoboBuddy, AI tutor của Học viện Vũ trụ RoboKids. Hãy trả lời ngắn gọn: "Mình sẵn sàng giúp bạn học lập trình robot rồi! Bạn cần hỗ trợ gì?"`
      : `Xin chào! Mình là RoboBuddy, AI tutor thân thiện. Hãy trả lời ngắn gọn: "Mình sẵn sàng giúp bạn rồi!"`;

    const messages = [
      buildSystemMessage(age),
      { role: 'user', content: prewarmPrompt }
    ];

    // Fire and forget - don't wait for response, just warm up the cache
    chatWithAI(messages).then(result => {
      // Pre-warm complete, response is now cached
      console.log('[AI Prewarm] Cache warmed successfully');
    }).catch(() => {
      // Silent fail for prewarm
    });

    res.json({
      prewarmed: true,
      message: 'AI context pre-warming started'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clean up old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActive.getTime() > SESSION_TIMEOUT_MS) {
      sessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// POST /api/ai/analyze - Analyze Blockly XML code
router.post('/analyze', async (req, res) => {
  try {
    const { blocklyXml, context, sessionId, age, currentLesson } = req.body;

    if (!blocklyXml) {
      return res.status(400).json({ error: 'blocklyXml is required' });
    }

    const userMsg = {
      role: 'user',
      content: `Hãy phân tích đoạn code Blockly XML sau đây:\n\n${blocklyXml}\n\n${context ? `Ngữ cảnh thêm: ${context}` : ''}`
    };

    // Get session history and age from session if sessionId provided
    let sessionHistory = [];
    let effectiveAge = age;
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session) {
        session.lastActive = new Date();
        sessionHistory = session.messages;
        if (!effectiveAge && session.age) effectiveAge = session.age;
      }
    }

    // Use curriculum-aware system prompt if currentLesson is provided
    const systemMsg = currentLesson && effectiveAge
      ? { role: 'system', content: buildCurriculumSystemPrompt(effectiveAge, currentLesson) }
      : buildSystemMessage(effectiveAge);

    const fullMessages = sessionHistory.length > 0
      ? [systemMsg, ...sessionHistory, userMsg]
      : [systemMsg, userMsg];

    const result = await chatWithAI(fullMessages);
    const responseText = result.content || result.message?.content || '';

    // Store user message and assistant response in session
    if (sessionId) {
      const session = sessions.get(sessionId) || { messages: [], lastActive: new Date(), age };
      session.messages.push(userMsg);
      session.messages.push({ role: 'assistant', content: responseText });
      session.lastActive = new Date();
      if (age) session.age = age;
      if (currentLesson) session.currentLesson = currentLesson;
      sessions.set(sessionId, session);
    }

    res.json({
      response: responseText,
      model: result.model,
      cached: result.cached,
      responseTimeMs: result.responseTimeMs
    });
  } catch (error) {
    console.error('AI analyze error:', error);
    if (error.statusCode === 429) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service',
        retryAfter: error.retryAfter
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/chat - General chat with RoboBuddy
router.post('/chat', async (req, res) => {
  try {
    const { messages, sessionId, age, currentLesson } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Get session history and age from session if sessionId provided
    let sessionHistory = [];
    let effectiveAge = age;
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session) {
        session.lastActive = new Date();
        sessionHistory = session.messages;
        if (!effectiveAge && session.age) effectiveAge = session.age;
        // Use lesson from session if not provided in request
        if (!currentLesson && session.currentLesson) {
          currentLesson = session.currentLesson;
        }
      }
    }

    // Use curriculum-aware system prompt if currentLesson is provided
    const systemMsg = currentLesson && effectiveAge
      ? { role: 'system', content: buildCurriculumSystemPrompt(effectiveAge, currentLesson) }
      : buildSystemMessage(effectiveAge);

    const fullMessages = sessionHistory.length > 0
      ? [systemMsg, ...sessionHistory, ...messages]
      : [systemMsg, ...messages];

    const result = await chatWithAI(fullMessages);
    const responseText = result.content || result.message?.content || '';

    // Store messages in session
    if (sessionId) {
      const session = sessions.get(sessionId) || { messages: [], lastActive: new Date() };
      for (const msg of messages) {
        session.messages.push(msg);
      }
      session.messages.push({ role: 'assistant', content: responseText });
      session.lastActive = new Date();
      if (effectiveAge) session.age = effectiveAge;
      if (currentLesson) session.currentLesson = currentLesson;
      sessions.set(sessionId, session);
    }

    res.json({
      response: responseText,
      model: result.model,
      cached: result.cached,
      responseTimeMs: result.responseTimeMs
    });
  } catch (error) {
    console.error('AI chat error:', error);
    if (error.statusCode === 429) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service',
        retryAfter: error.retryAfter
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/session/:sessionId - Get chat history for a session
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found', sessionId });
  }

  // Update last active
  session.lastActive = new Date();

  res.json({
    sessionId,
    messages: session.messages,
    messageCount: session.messages.length
  });
});

// DELETE /api/ai/session/:sessionId - Clear a session
router.delete('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const deleted = sessions.delete(sessionId);

  res.json({
    sessionId,
    deleted
  });
});

// POST /api/ai/explain-block - Explain a specific Blockly block
router.post('/explain-block', async (req, res) => {
  try {
    const { blockType, blockFields, blockId, sessionId, age, currentLesson } = req.body;

    if (!blockType) {
      return res.status(400).json({ error: 'blockType is required' });
    }

    // Build description of the block for the AI
    const blockDescription = {
      type: blockType,
      fields: blockFields || {},
      id: blockId
    };

    const userMsg = {
      role: 'user',
      content: `Hãy giải thích khối Blockly "${blockType}" cho mình hiểu nhé! Khối này có các thông số: ${JSON.stringify(blockFields || {}, null, 2)}`
    };

    // Get session history and age from session if sessionId provided
    let sessionHistory = [];
    let effectiveAge = age;
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session) {
        session.lastActive = new Date();
        sessionHistory = session.messages;
        if (!effectiveAge && session.age) effectiveAge = effectiveAge;
        if (!currentLesson && session.currentLesson) {
          currentLesson = session.currentLesson;
        }
      }
    }

    // Use curriculum-aware system prompt if currentLesson is provided
    const systemMsg = currentLesson && effectiveAge
      ? { role: 'system', content: buildCurriculumSystemPrompt(effectiveAge, currentLesson) }
      : buildSystemMessage(effectiveAge);

    const fullMessages = sessionHistory.length > 0
      ? [systemMsg, ...sessionHistory, userMsg]
      : [systemMsg, userMsg];

    const result = await chatWithAI(fullMessages);
    const responseText = result.content || result.message?.content || '';

    // Store user message and assistant response in session
    if (sessionId) {
      const session = sessions.get(sessionId) || { messages: [], lastActive: new Date(), age };
      session.messages.push(userMsg);
      session.messages.push({ role: 'assistant', content: responseText });
      session.lastActive = new Date();
      if (age) session.age = age;
      if (currentLesson) session.currentLesson = currentLesson;
      sessions.set(sessionId, session);
    }

    res.json({
      response: responseText,
      model: result.model,
      blockType,
      blockDescription
    });
  } catch (error) {
    console.error('AI explain-block error:', error);
    if (error.statusCode === 429) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service',
        retryAfter: error.retryAfter
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/hint - Get context-aware hint based on student code and error
router.post('/hint', async (req, res) => {
  try {
    const { blocklyXml, errorPattern, currentLesson, studentId, sessionId } = req.body;

    if (!blocklyXml && !errorPattern) {
      return res.status(400).json({ error: 'blocklyXml or errorPattern is required' });
    }

    // Get student age if studentId provided
    let effectiveAge = null;
    if (studentId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('age')
        .eq('id', studentId)
        .single();
      if (profile?.age) effectiveAge = profile.age;
    }

    // Fallback to session age
    if (!effectiveAge && sessionId) {
      const session = sessions.get(sessionId);
      if (session?.age) effectiveAge = session.age;
    }

    // Build hint request
    let hintRequest = 'Hãy gợi ý một gợi ý (hint) ngắn gọn, dễ hiểu để giúp học sinh vượt qua khó khăn này.';
    if (blocklyXml) {
      hintRequest += `\n\nCode Blockly hiện tại:\n${blocklyXml}`;
    }
    if (errorPattern) {
      hintRequest += `\n\nLỗi gặp phải: ${errorPattern}`;
    }
    hintRequest += '\n\nHãy đưa ra 1 gợi ý ngắn (1-2 câu) bằng tiếng Việt thân thiện, phù hợp với lứa tuổi.';

    const systemMsg = buildSystemMessage(effectiveAge);

    const messages = [
      systemMsg,
      { role: 'user', content: hintRequest }
    ];

    const result = await chatWithAI(messages);
    const responseText = result.content || result.message?.content || '';

    res.json({
      hint: responseText,
      model: result.model,
      studentId: studentId || null
    });
  } catch (error) {
    console.error('AI hint error:', error);
    if (error.statusCode === 429) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service',
        retryAfter: error.retryAfter
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/recommend - Get content recommendations based on progress
router.post('/recommend', async (req, res) => {
  try {
    const { studentId, currentLesson, learningStyle } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    // Get student profile and progress
    const { data: profile } = await supabase
      .from('profiles')
      .select('age, name')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const effectiveAge = profile.age || 10;
    const level = getAgeGroupKey(effectiveAge);

    // Get student progress data
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', studentId)
      .single();

    // Get completed lessons
    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed, score')
      .eq('user_id', studentId)
      .eq('completed', true);

    // Get attempted missions
    const { data: missions } = await supabase
      .from('user_missions')
      .select('mission_id, status, score')
      .eq('user_id', studentId);

    const completedLessonIds = completedLessons?.map(l => l.lesson_id) || [];
    const avgScore = completedLessons?.length > 0
      ? completedLessons.reduce((sum, l) => sum + (l.score || 0), 0) / completedLessons.length
      : 0;

    // Build recommendation prompt
    const recommendationRequest = `Phân tích tiến độ học tập sau và gợi ý 3 nội dung tiếp theo phù hợp cho học sinh:
    - Tên: ${profile.name || 'học sinh'}
    - Tuổi: ${effectiveAge} (cấp độ: ${level})
    - Bài học đã hoàn thành: ${completedLessonIds.length} bài
    - Điểm trung bình: ${avgScore.toFixed(1)}
    - Nhiệm vụ đã hoàn thành: ${missions?.filter(m => m.status === 'completed').length || 0}
    ${currentLesson ? `- Bài học hiện tại: ${currentLesson}` : ''}
    ${learningStyle ? `- Phong cách học: ${learningStyle}` : ''}

    Hãy trả lời bằng tiếng Việt, định dạng:
    1. [Tên nội dung] - [Lý do tại sao phù hợp]
    2. [Tên nội dung] - [Lý do tại sao phù hợp]
    3. [Tên nội dung] - [Lý do tại sao phù hợp]`;

    const messages = [
      buildSystemMessage(effectiveAge),
      { role: 'user', content: recommendationRequest }
    ];

    const result = await chatWithAI(messages);
    const responseText = result.content || result.message?.content || '';

    res.json({
      recommendations: responseText,
      model: result.model,
      studentId,
      progress: {
        completedLessons: completedLessonIds.length,
        averageScore: avgScore,
        level
      }
    });
  } catch (error) {
    console.error('AI recommend error:', error);
    if (error.statusCode === 429) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service',
        retryAfter: error.retryAfter
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/difficulty/:studentId - Get adaptive difficulty for student
router.get('/difficulty/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('age')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const effectiveAge = profile.age || 10;
    const level = getAgeGroupKey(effectiveAge);

    // Get student progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', studentId)
      .single();

    // Get recent lesson attempts (last 10)
    const { data: recentLessons } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed, score, attempts')
      .eq('user_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Get recent mission attempts
    const { data: recentMissions } = await supabase
      .from('user_missions')
      .select('mission_id, status, score')
      .eq('user_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Calculate performance metrics
    const totalXp = progress?.total_xp || 0;
    const completedCount = recentLessons?.filter(l => l.completed).length || 0;
    const totalAttempts = recentLessons?.reduce((sum, l) => sum + (l.attempts || 1), 0) || 1;
    const avgScore = recentLessons?.length > 0
      ? recentLessons.reduce((sum, l) => sum + (l.score || 0), 0) / recentLessons.length
      : 0;

    // Determine difficulty based on performance
    const difficultyRequest = `Phân tích dữ liệu học tập sau và xác định mức độ khó phù hợp tiếp theo:
    - Tên cấp độ: ${level}
    - Tổng XP: ${totalXp}
    - Số bài hoàn thành (trong 10 bài gần nhất): ${completedCount}/${recentLessons?.length || 0}
    - Điểm trung bình (10 bài gần nhất): ${avgScore.toFixed(1)}
    - Số lần thử trung bình mỗi bài: ${(totalAttempts / Math.max(recentLessons?.length || 1, 1)).toFixed(1)}
    - Nhiệm vụ hoàn thành gần đây: ${recentMissions?.filter(m => m.status === 'completed').length || 0}/${recentMissions?.length || 0}

    Trả lời bằng tiếng Việt, định dạng JSON:
    {
      "difficulty": "easy|medium|hard",
      "confidence": "high|medium|low",
      "reasoning": "giải thích ngắn gọn tại sao",
      "suggestions": ["gợi ý cải thiện 1", "gợi ý cải thiện 2"]
    }`;

    const messages = [
      buildSystemMessage(effectiveAge),
      { role: 'user', content: difficultyRequest }
    ];

    const result = await chatWithAI(messages);
    const responseText = result.content || result.message?.content || '';

    // Try to parse JSON from response
    let difficultyData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        difficultyData = JSON.parse(jsonMatch[0]);
      } else {
        difficultyData = {
          difficulty: 'medium',
          confidence: 'low',
          reasoning: responseText,
          suggestions: []
        };
      }
    } catch {
      difficultyData = {
        difficulty: 'medium',
        confidence: 'low',
        reasoning: responseText,
        suggestions: []
      };
    }

    res.json({
      studentId,
      ...difficultyData,
      metrics: {
        totalXp,
        completedRatio: recentLessons?.length > 0 ? completedCount / recentLessons.length : 0,
        averageScore: avgScore
      },
      model: result.model
    });
  } catch (error) {
    console.error('AI difficulty error:', error);
    if (error.statusCode === 429) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service',
        retryAfter: error.retryAfter
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/space-review - AI review step in Space Mission Flow
// Called after 3D Practice to evaluate student's solution and give feedback
router.post('/space-review', async (req, res) => {
  try {
    const { lessonId, studentCode, challengeResult, userId, lessonGoal, age } = req.body;

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }

    // Get student age from DB if userId provided and age not given
    let effectiveAge = age;
    if (!effectiveAge && userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('age')
        .eq('id', userId)
        .single();
      if (profile?.age) effectiveAge = profile.age;
    }
    effectiveAge = effectiveAge || 10;

    // Space Academy RoboBuddy system prompt
    const spaceSystemPrompt = `Bạn là RoboBuddy - trợ lý AI thân thiện của Học viện Vũ trụ RoboKids Vietnam.
Nhiệm vụ: Đánh giá kết quả thực hành của học sinh và đưa ra nhận xét khuyến khích, dễ hiểu.
Phong cách: Vui vẻ, nhiệt tình, sử dụng thuật ngữ vũ trụ (phi hành gia, tàu vũ trụ, hành tinh, v.v.)
Ngôn ngữ: Tiếng Việt, phù hợp với trẻ em ${effectiveAge} tuổi
Giới hạn: Trả lời tối đa 3-4 câu ngắn gọn, dễ hiểu`;

    // Build evaluation prompt
    let evaluationPrompt = `Học sinh vừa hoàn thành bài thực hành vũ trụ!\n`;
    if (lessonGoal) evaluationPrompt += `Mục tiêu bài học: ${lessonGoal}\n`;
    if (studentCode) evaluationPrompt += `Code của học sinh:\n${studentCode}\n`;
    evaluationPrompt += `Kết quả thử thách: ${challengeResult ? 'Thành công!' : 'Chưa hoàn thành'}\n\n`;
    evaluationPrompt += `Hãy:\n1. Nhận xét ngắn về nỗ lực của học sinh (dù đúng hay sai)\n2. Nếu sai: gợi ý 1 điều cần cải thiện\n3. Kết thúc bằng lời động viên vũ trụ\n\nTrả lời bằng tiếng Việt, thân thiện, ngắn gọn.`;

    const messages = [
      { role: 'system', content: spaceSystemPrompt },
      { role: 'user', content: evaluationPrompt }
    ];

    const result = await chatWithAI(messages);
    const feedback = result.content || result.message?.content || '';

    // Calculate XP earned based on performance
    let xpEarned = 30; // base XP for attempting
    if (challengeResult) xpEarned += 20; // bonus for passing challenge
    if (studentCode && studentCode.trim().length > 50) xpEarned += 10; // bonus for substantial code

    // Determine which badges to check (backend will award them via ROB-297 API)
    // Returns badge types the frontend should trigger via /api/gamification/badges/check
    const badgesToCheck = [];
    if (challengeResult) badgesToCheck.push('mars_pioneer'); // first challenge pass
    badgesToCheck.push('lesson_activity'); // any lesson completion

    res.json({
      passed: challengeResult === true,
      feedback,
      xpEarned,
      badgesToCheck,
      model: result.model
    });
  } catch (error) {
    console.error('AI space-review error:', error);
    if (error.statusCode === 429) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service',
        retryAfter: error.retryAfter
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PROACTIVE AI TUTOR ENDPOINTS (ROB-293)
// Space Academy Phase 2 - Proactive Learning
// ============================================

// POST /api/ai/proactive/event - Record student behavior event
router.post('/proactive/event', authenticate, async (req, res) => {
  try {
    const { studentId, eventType, data, age } = req.body;

    if (!studentId || !eventType) {
      return res.status(400).json({ error: 'studentId and eventType are required' });
    }

    // Verify studentId belongs to the authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify ownership: user is the student themselves, or parent/admin
    const isOwner = profile.id === req.user.id;
    const isParentOrAdmin = ['parent', 'admin'].includes(req.user.role);
    if (!isOwner && !isParentOrAdmin) {
      return res.status(403).json({ error: 'Access denied: not authorized for this student' });
    }

    // Ensure behavior profile exists
    getBehaviorProfile(studentId, age);

    switch (eventType) {
      case 'task_start':
        recordTaskStart(studentId, age);
        break;
      case 'task_attempt':
        recordTaskAttempt(studentId, data?.success, data?.errorType);
        break;
      case 'input':
        recordInputEvent(studentId, age);
        break;
      case 'ai_request':
        recordAIRequest(studentId, data?.requestType, age);
        break;
      default:
        return res.status(400).json({ error: `Unknown event type: ${eventType}` });
    }

    res.json({ recorded: true, eventType });
  } catch (error) {
    console.error('Proactive event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/proactive/check/:studentId - Check if proactive intervention needed
router.get('/proactive/check/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify studentId belongs to the authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify ownership
    const isOwner = profile.id === req.user.id;
    const isParentOrAdmin = ['parent', 'admin'].includes(req.user.role);
    if (!isOwner && !isParentOrAdmin) {
      return res.status(403).json({ error: 'Access denied: not authorized for this student' });
    }

    const intervention = shouldProactivelyIntervene(studentId);

    res.json({
      shouldIntervene: intervention.shouldIntervene,
      type: intervention.type,
      message: intervention.message,
      ...(intervention.confidence && { confidence: intervention.confidence }),
      ...(intervention.severity && { severity: intervention.severity }),
      ...(intervention.timeOnTask && { timeOnTask: intervention.timeOnTask })
    });
  } catch (error) {
    console.error('Proactive check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/proactive/intervene - Record intervention shown and get next action
router.post('/proactive/intervene', authenticate, async (req, res) => {
  try {
    const { studentId, interventionType, age } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    // Verify studentId belongs to the authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify ownership
    const isOwner = profile.id === req.user.id;
    const isParentOrAdmin = ['parent', 'admin'].includes(req.user.role);
    if (!isOwner && !isParentOrAdmin) {
      return res.status(403).json({ error: 'Access denied: not authorized for this student' });
    }

    // Record intervention
    recordIntervention(studentId);

    // Get micro-learning suggestion if available
    const suggestion = getMicroLearningSuggestion(studentId);

    // Get updated analytics
    const analytics = getBehaviorAnalytics(studentId);

    res.json({
      recorded: true,
      suggestion,
      analytics
    });
  } catch (error) {
    console.error('Proactive intervene error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/proactive/analytics/:studentId - Get full behavior analytics
router.get('/proactive/analytics/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify studentId belongs to the authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify ownership
    const isOwner = profile.id === req.user.id;
    const isParentOrAdmin = ['parent', 'admin'].includes(req.user.role);
    if (!isOwner && !isParentOrAdmin) {
      return res.status(403).json({ error: 'Access denied: not authorized for this student' });
    }

    const analytics = getBehaviorAnalytics(studentId);

    if (!analytics) {
      return res.status(404).json({ error: 'No behavior data found for student' });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Proactive analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/robobuddy/performance/:studentId - Get RoboBuddy performance analytics
router.get('/robobuddy/performance/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify studentId belongs to the authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, age')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify ownership
    const isOwner = profile.id === req.user.id;
    const isParentOrAdmin = ['parent', 'admin'].includes(req.user.role);
    if (!isOwner && !isParentOrAdmin) {
      return res.status(403).json({ error: 'Access denied: not authorized for this student' });
    }

    // Get behavior analytics
    const behaviorAnalytics = getBehaviorAnalytics(studentId);

    // Get lesson progress for topic analysis
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('lesson_id, score, time_spent_seconds, attempts, completed_at')
      .eq('profile_id', studentId)
      .order('completed_at', { ascending: false })
      .limit(50);

    // Get mission progress
    const { data: missionProgress } = await supabase
      .from('mission_progress')
      .select('mission_id, status, completed_at')
      .eq('profile_id', studentId);

    // Get AI chat sessions for response analysis
    const { data: chatSessions } = await supabase
      .from('chat_sessions')
      .select('id, message_count, created_at')
      .eq('profile_id', studentId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Calculate topics struggled with (low score or high attempts)
    const struggledTopics = [];
    if (lessonProgress && lessonProgress.length > 0) {
      const topicMap = new Map();
      for (const lp of lessonProgress) {
        if (lp.score < 70 || lp.attempts > 3) {
          const lessonNum = lp.lesson_id?.match(/\d+/)?.[0] || '0';
          const existing = topicMap.get(lp.lesson_id);
          if (!existing || lp.score < existing.score) {
            topicMap.set(lp.lesson_id, {
              lessonId: lp.lesson_id,
              lessonNumber: parseInt(lessonNum),
              score: lp.score,
              attempts: lp.attempts,
              timeSpent: lp.time_spent_seconds
            });
          }
        }
      }
      struggledTopics.push(...topicMap.values());
    }
    struggledTopics.sort((a, b) => a.score - b.score);

    // Calculate response effectiveness based on behavior analytics
    const effectivenessScore = behaviorAnalytics
      ? Math.round((behaviorAnalytics.successRate || 0) * 0.4 +
          (100 - (behaviorAnalytics.frustrationLevel || 0)) * 0.3 +
          (behaviorAnalytics.engagementLevel || 0) * 0.3)
      : 50;

    // Estimate satisfaction based on engagement and intervention frequency
    const satisfactionMetrics = {
      overallScore: effectivenessScore,
      engagementLevel: behaviorAnalytics?.engagementLevel || 50,
      frustrationLevel: behaviorAnalytics?.frustrationLevel || 0,
      hintUsageRate: behaviorAnalytics?.hintRequests || 0,
      helpRequestsRate: behaviorAnalytics?.helpRequests || 0,
      interventionCount: behaviorAnalytics?.interventionCount || 0,
      trend: effectivenessScore >= 70 ? 'improving' : effectivenessScore >= 40 ? 'stable' : 'declining'
    };

    // Areas for tutor improvement based on student behavior patterns
    const tutorImprovementAreas = [];
    if (behaviorAnalytics) {
      if (behaviorAnalytics.similarErrorCount > 5) {
        tutorImprovementAreas.push({
          area: 'repeated_errors',
          description: 'Student makes similar errors repeatedly - need more visual/hands-on examples',
          severity: 'high',
          suggestion: 'Provide step-by-step visual breakdown with实物 examples'
        });
      }
      if (behaviorAnalytics.frustrationLevel > 60) {
        tutorImprovementAreas.push({
          area: 'frustration_management',
          description: 'Student shows high frustration - need more encouraging approach',
          severity: 'high',
          suggestion: 'Break lessons into smaller steps, add more praise and encouragement'
        });
      }
      if (behaviorAnalytics.hintRequests > behaviorAnalytics.helpRequests * 2) {
        tutorImprovementAreas.push({
          area: 'progressive_hints',
          description: 'Student requests many hints but few help requests - unclear explanations',
          severity: 'medium',
          suggestion: 'Improve hint system with progressive disclosure'
        });
      }
      if (behaviorAnalytics.currentTaskTime > 300 && behaviorAnalytics.successRate < 50) {
        tutorImprovementAreas.push({
          area: 'time_on_task',
          description: 'Student spends long time on task without success',
          severity: 'medium',
          suggestion: 'Implement earlier intervention and task breakdown'
        });
      }
    }

    // Get age group for context
    const studentAge = profile.age || 10;
    const ageGroup = studentAge < 8 ? 'young' : studentAge < 12 ? 'middle' : 'older';

    const performanceReport = {
      studentId,
      studentName: profile.full_name,
      age: studentAge,
      ageGroup,
      generatedAt: new Date().toISOString(),
      topicsStruggledWith: struggledTopics.slice(0, 5).map(t => ({
        topic: `Lesson ${t.lessonNumber}`,
        lessonId: t.lessonId,
        score: t.score,
        attempts: t.attempts,
        timeSpent: t.timeSpent
      })),
      responseEffectiveness: {
        overallScore: effectivenessScore,
        breakdown: {
          successRateContribution: Math.round((behaviorAnalytics?.successRate || 0) * 0.4),
          frustrationContribution: Math.round((100 - (behaviorAnalytics?.frustrationLevel || 0)) * 0.3),
          engagementContribution: Math.round((behaviorAnalytics?.engagementLevel || 0) * 0.3)
        },
        rating: effectivenessScore >= 80 ? 'excellent' : effectivenessScore >= 60 ? 'good' : effectivenessScore >= 40 ? 'needs_improvement' : 'poor'
      },
      satisfactionMetrics,
      tutorImprovementAreas,
      activitySummary: {
        lessonsAnalyzed: lessonProgress?.length || 0,
        missionsAttempted: missionProgress?.length || 0,
        chatSessions: chatSessions?.length || 0,
        totalMessages: chatSessions?.reduce((sum, s) => sum + (s.message_count || 0), 0) || 0
      }
    };

    res.json(performanceReport);
  } catch (error) {
    console.error('RoboBuddy performance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/proactive/difficulty/:studentId - Get difficulty adjustment recommendation
router.get('/proactive/difficulty/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify studentId belongs to the authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify ownership
    const isOwner = profile.id === req.user.id;
    const isParentOrAdmin = ['parent', 'admin'].includes(req.user.role);
    if (!isOwner && !isParentOrAdmin) {
      return res.status(403).json({ error: 'Access denied: not authorized for this student' });
    }

    const adjustment = calculateDifficultyAdjustment(studentId);
    const analytics = getBehaviorAnalytics(studentId);

    res.json({
      ...adjustment,
      analytics
    });
  } catch (error) {
    console.error('Proactive difficulty error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/proactive/support - Generate emotional support message
router.post('/proactive/support', authenticate, async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    // Verify studentId belongs to the authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify ownership
    const isOwner = profile.id === req.user.id;
    const isParentOrAdmin = ['parent', 'admin'].includes(req.user.role);
    if (!isOwner && !isParentOrAdmin) {
      return res.status(403).json({ error: 'Access denied: not authorized for this student' });
    }

    const supportMessage = generateEmotionalSupport(studentId);

    res.json({
      message: supportMessage
    });
  } catch (error) {
    console.error('Proactive support error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/proactive/clear - Clear behavior session (logout)
router.post('/proactive/clear', authenticate, async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    // Verify studentId belongs to the authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify ownership
    const isOwner = profile.id === req.user.id;
    const isParentOrAdmin = ['parent', 'admin'].includes(req.user.role);
    if (!isOwner && !isParentOrAdmin) {
      return res.status(403).json({ error: 'Access denied: not authorized for this student' });
    }

    clearBehaviorSession(studentId);

    res.json({ cleared: true });
  } catch (error) {
    console.error('Proactive clear error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/proactive/proactive-message - Get AI-generated proactive message
router.post('/proactive/proactive-message', authenticate, async (req, res) => {
  try {
    const { studentId, context, age, currentLesson } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    // Verify studentId belongs to the authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify ownership
    const isOwner = profile.id === req.user.id;
    const isParentOrAdmin = ['parent', 'admin'].includes(req.user.role);
    if (!isOwner && !isParentOrAdmin) {
      return res.status(403).json({ error: 'Access denied: not authorized for this student' });
    }

    // Get student behavior profile
    const profileData = getBehaviorProfile(studentId, age);
    const analytics = getBehaviorAnalytics(studentId);
    const intervention = shouldProactivelyIntervene(studentId);

    // Build context-aware prompt for proactive message
    const systemPrompt = `Bạn là RoboBuddy - Trợ lý AI của Học viện Vũ trụ RoboKids Vietnam 🌟🚀
Nhiệm vụ: Tạo tin nhắn chủ động hỗ trợ học sinh khi phát hiện các dấu hiệu khó khăn trong học tập.
Phong cách:
- Thân thiện, vui vẻ, sử dụng emoji vũ trụ (🚀🌟⭐💫🌙🔭)
- Động viên tinh thần, không làm học sinh ngại
- Gợi ý hỗ trợ cụ thể, ngắn gọn (2-3 câu)
- Phù hợp với lứa tuổi: ${age || 10} tuổi`;

    let userContent = 'Phân tích tình trạng học tập sau và tạo tin nhắn chủ động phù hợp:\n\n';

    if (analytics) {
      userContent += `Thông tin học sinh:
- Thời gian trên bài hiện tại: ${analytics.currentTaskTime} giây
- Tỷ lệ thành công: ${analytics.successRate}%
- Mức độ thất vọng: ${analytics.frustrationLevel}%
- Số lần yêu cầu gợi ý: ${analytics.hintRequests}
- Số lần yêu cầu giúp đỡ: ${analytics.helpRequests}
- Lỗi tương tự gần đây: ${analytics.similarErrorCount}
`;
    }

    if (intervention.shouldIntervene) {
      userContent += `\nLoại can thiệp cần thiết: ${intervention.type}
`;
    }

    if (context) {
      userContent += `\nNgữ cảnh bổ sung: ${context}
`;
    }

    userContent += '\nHãy tạo một tin nhắn chủ động (2-3 câu) bằng tiếng Việt, thân thiện, phù hợp với phong cách vũ trụ.';

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    const result = await chatWithAI(messages);
    const proactiveMessage = result.content || result.message?.content || '';

    // Record that we're providing proactive support
    recordIntervention(studentId);

    res.json({
      message: proactiveMessage,
      intervention: intervention.shouldIntervene,
      type: intervention.type,
      analytics
    });
  } catch (error) {
    console.error('Proactive message error:', error);
    if (error.statusCode === 429) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service',
        retryAfter: error.retryAfter
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CODE OPTIMIZATION SCORING (ROB-486)
// Analyze Blockly code efficiency with Big O and bonus XP
// ============================================

/**
 * Analyze robot commands for efficiency and return optimization suggestions
 * POST /api/ai/analyze-optimization
 */
router.post('/analyze-optimization', async (req, res) => {
  try {
    const { robotCommands, studentId, age, missionId } = req.body;

    if (!robotCommands) {
      return res.status(400).json({ error: 'robotCommands is required' });
    }

    // Parse commands if string
    let commands;
    if (typeof robotCommands === 'string') {
      try {
        commands = JSON.parse(robotCommands);
      } catch {
        return res.status(400).json({ error: 'Invalid robotCommands JSON' });
      }
    } else {
      commands = robotCommands;
    }

    // Calculate basic metrics from commands
    const metrics = calculateCommandMetrics(commands);

    // System prompt for code optimization analysis
    const optimizationSystemPrompt = `Bạn là RoboBuddy - chuyên gia phân tích code robot vũ trụ 🚀
Nhiệm vụ: Phân tích code lệnh robot và đánh giá độ hiệu quả.
Phong cách: Vui vẻ, nhiệt tình, sử dụng ngôn ngữ vũ trụ
Ngôn ngữ: Tiếng Việt, phù hợp với trẻ em ${age || 10} tuổi

Bạn cần phân tích các lệnh robot sau và trả về:
1. Độ phức tạp Big O (thời gian và không gian)
2. Điểm hiệu quả (0-100)
3. Gợi ý tối ưu hóa (nếu có)
4. XP bonus (0-20 điểm) cho code hiệu quả

Quy tắc tính điểm:
- O(1): Code rất hiệu quả, 90-100 điểm
- O(log n): Code tốt, 80-90 điểm
- O(n): Code bình thường, 60-80 điểm
- O(n²) hoặc cao hơn: Code cần cải thiện, 40-60 điểm
- Code có repeat() lồng nhau: trừ điểm nặng
- Code sử dụng sensor trong loop: trừ điểm

Luôn trả lời bằng JSON format:
{
  "complexity": "O(1)|O(n)|O(n²)|...",
  "timeComplexity": "O(1)|O(n)|O(n²)|...",
  "spaceComplexity": "O(1)|O(n)|...",
  "efficiencyScore": 0-100,
  "optimizationSuggestions": ["gợi ý 1", "gợi ý 2"],
  "xpBonus": 0-20,
  "feedback": "nhận xét ngắn bằng tiếng Việt vui vẻ"
}`;

    const commandsDescription = JSON.stringify(commands, null, 2);
    const userPrompt = `Hãy phân tích các lệnh robot sau:\n\n${commandsDescription}\n\nCác thông số:
- Số lệnh: ${metrics.totalCommands}
- Số repeat/loop: ${metrics.repeatCount}
- Số lệnh có điều kiện: ${metrics.conditionalCount}
- Độ sâu lồng nhau tối đa: ${metrics.maxNestingDepth}
- Tổng số bước robot: ${metrics.totalSteps}`;

    const messages = [
      { role: 'system', content: optimizationSystemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const result = await chatWithAI(messages);
    const responseText = result.content || result.message?.content || '';

    // Parse AI response
    let analysis;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if no JSON found
        analysis = {
          complexity: 'O(n)',
          timeComplexity: 'O(n)',
          spaceComplexity: 'O(1)',
          efficiencyScore: 70,
          optimizationSuggestions: ['Code của bạn ổn đấy! Cố gắng giữ nó ngắn gọn nhé.'],
          xpBonus: 5,
          feedback: responseText || 'Good effort! Keep coding! 🚀'
        };
      }
    } catch {
      analysis = {
        complexity: 'O(n)',
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        efficiencyScore: 70,
        optimizationSuggestions: ['Code của bạn ổn đấy!'],
        xpBonus: 5,
        feedback: 'Good effort! 🚀'
      };
    }

    // Ensure numeric values
    const efficiencyScore = Math.max(0, Math.min(100, Number(analysis.efficiencyScore) || 70));
    const xpBonus = Math.max(0, Math.min(20, Number(analysis.xpBonus) || 0));

    // Award XP if studentId provided and score is good
    let xpAwarded = 0;
    if (studentId && xpBonus > 0) {
      try {
        const reason = xpBonus >= 15
          ? 'Code cực kỳ hiệu quả! Bonus XP cho lập trình xuất sắc! ⭐'
          : xpBonus >= 10
          ? 'Code hiệu quả! Bonus XP cho giải pháp tốt! 👍'
          : 'Code đạt yêu cầu. Bonus XP cho nỗ lực! 💪';

        await supabaseAdmin.from('xp_points').insert({
          user_id: studentId,
          amount: xpBonus,
          reason,
          source_type: 'optimization_bonus',
          source_id: missionId || null
        });

        xpAwarded = xpBonus;
      } catch (xpError) {
        console.error('Error awarding optimization XP:', xpError);
        // Continue without XP award
      }
    }

    res.json({
      analysis: {
        complexity: analysis.complexity || 'O(n)',
        timeComplexity: analysis.timeComplexity || 'O(n)',
        spaceComplexity: analysis.spaceComplexity || 'O(1)',
        efficiencyScore,
        optimizationSuggestions: analysis.optimizationSuggestions || [],
        xpBonus,
        feedback: analysis.feedback || 'Good effort!'
      },
      metrics: {
        totalCommands: metrics.totalCommands,
        repeatCount: metrics.repeatCount,
        conditionalCount: metrics.conditionalCount,
        maxNestingDepth: metrics.maxNestingDepth,
        totalSteps: metrics.totalSteps
      },
      xpAwarded,
      missionId: missionId || null,
      studentId: studentId || null,
      model: result.model,
      responseTimeMs: result.responseTimeMs
    });
  } catch (error) {
    console.error('AI analyze-optimization error:', error);
    if (error.statusCode === 429) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service',
        retryAfter: error.retryAfter
      });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * Calculate basic metrics from robot commands
 */
function calculateCommandMetrics(commands) {
  let totalCommands = 0;
  let repeatCount = 0;
  let conditionalCount = 0;
  let maxNestingDepth = 0;
  let totalSteps = 0;

  function traverse(cmds, depth = 0) {
    for (const cmd of cmds) {
      totalCommands++;
      maxNestingDepth = Math.max(maxNestingDepth, depth);

      if (cmd.type === 'repeat') {
        repeatCount++;
        if (cmd.params?.commands) {
          traverse(cmd.params.commands, depth + 1);
        }
      } else if (cmd.type === 'if_sensor') {
        conditionalCount++;
        if (cmd.params?.then) {
          traverse(cmd.params.then, depth + 1);
        }
      }

      // Count steps for movement commands
      if (cmd.type === 'move_forward' || cmd.type === 'move_backward') {
        totalSteps += cmd.params?.steps || 0;
      } else if (cmd.type === 'turn_left' || cmd.type === 'turn_right') {
        totalSteps += cmd.params?.degrees || 0;
      }
    }
  }

  traverse(Array.isArray(commands) ? commands : [commands]);
  return { totalCommands, repeatCount, conditionalCount, maxNestingDepth, totalSteps };
}

// ============================================
// STUDENT WEAKNESS DETECTION (ROB-670)
// AI-powered analysis of student learning weaknesses
// ============================================

// Threshold for "weak" performance (score below this is weakness)
const WEAK_SCORE_THRESHOLD = 60;
const SLOW_TIME_MULTIPLIER = 1.5; // 50% slower than average = weakness

/**
 * Analyze lesson performance to find weak areas
 */
function analyzeLessonWeaknesses(lessonProgress, lessonsData) {
  const weaknesses = [];
  const lessonMap = new Map((lessonsData || []).map(l => [l.id, l]));

  // Group by category
  const byCategory = {};
  for (const lp of (lessonProgress || [])) {
    const lesson = lessonMap.get(lp.lesson_id);
    const category = lesson?.category || 'general';
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(lp);
  }

  // Find weak categories (low average score)
  for (const [category, lessons] of Object.entries(byCategory)) {
    const avgScore = lessons.reduce((sum, l) => sum + (l.score || 0), 0) / lessons.length;
    const avgTime = lessons.reduce((sum, l) => sum + (l.time_spent_seconds || 0), 0) / lessons.length;
    const attempts = lessons.reduce((sum, l) => sum + (l.attempts || 1), 0) / lessons.length;

    if (avgScore < WEAK_SCORE_THRESHOLD) {
      weaknesses.push({
        type: 'low_score',
        area: category,
        description: `Điểm thấp trong ${category}`,
        averageScore: Math.round(avgScore),
        averageTimeSeconds: Math.round(avgTime),
        attemptCount: Math.round(attempts * 10) / 10,
        severity: avgScore < 40 ? 'high' : 'medium'
      });
    }
  }

  return weaknesses;
}

/**
 * Analyze mission failures to find weak areas
 */
function analyzeMissionWeaknesses(missionProgress, missionTemplates) {
  const weaknesses = [];
  const missionMap = new Map((missionTemplates || []).map(m => [m.id, m]));

  const failedMissions = (missionProgress || []).filter(m => m.status === 'failed' || m.status === 'attempted');
  const failedByType = {};

  for (const mf of failedMissions) {
    const template = missionMap.get(mf.mission_id);
    const missionType = template?.mission_type || 'general';
    if (!failedByType[missionType]) failedByType[missionType] = [];
    failedByType[missionType].push(mf);
  }

  for (const [type, missions] of Object.entries(failedByType)) {
    if (missions.length >= 2) {
      const avgScore = missions.reduce((sum, m) => sum + (m.score || 0), 0) / missions.length;
      weaknesses.push({
        type: 'mission_failure',
        area: type,
        description: `Gặp khó khăn với nhiệm vụ ${type}`,
        failureCount: missions.length,
        averageScore: Math.round(avgScore),
        severity: missions.length >= 4 ? 'high' : missions.length >= 2 ? 'medium' : 'low'
      });
    }
  }

  return weaknesses;
}

/**
 * Analyze time-to-complete patterns
 */
function analyzeTimeWeaknesses(lessonProgress, lessonsData, peerAverages) {
  const weaknesses = [];
  const lessonMap = new Map((lessonsData || []).map(l => [l.id, l]));

  for (const lp of (lessonProgress || [])) {
    if (!lp.completed) continue;
    const lesson = lessonMap.get(lp.lesson_id);
    if (!lesson) continue;

    const estimatedTime = (lesson.estimated_minutes || 15) * 60; // convert to seconds
    const actualTime = lp.time_spent_seconds || 0;
    const peerTime = peerAverages?.[lp.lesson_id] || estimatedTime;

    // If taking much longer than expected or peer average
    const slowerThanExpected = actualTime > estimatedTime * SLOW_TIME_MULTIPLIER;
    const slowerThanPeer = actualTime > peerTime * SLOW_TIME_MULTIPLIER;

    if (slowerThanExpected || slowerThanPeer) {
      const ratio = actualTime / Math.max(estimatedTime, 1);
      weaknesses.push({
        type: 'slow_completion',
        area: lesson.category || 'general',
        description: `Mất nhiều thời gian hơn bình thường với bài ${lesson.title_vi || 'này'}`,
        lessonTitle: lesson.title_vi || lesson.title_en,
        actualTimeSeconds: actualTime,
        expectedTimeSeconds: Math.round(estimatedTime),
        ratio: Math.round(ratio * 10) / 10,
        severity: ratio > 2.0 ? 'high' : 'medium'
      });
    }
  }

  return weaknesses;
}

/**
 * GET /api/ai/weakness/:studentId - Get AI-powered weakness analysis for a student
 * Returns structured weakness report for parents
 */
router.get('/weakness/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const requestingUserId = req.user.id;
    const userRole = req.user.user_metadata?.role || req.profile?.role || 'student';

    // Verify access: student themselves, parent, teacher, or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, age')
      .eq('id', studentId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if requesting user has access to this student's data
    const isOwner = profile.id === requestingUserId;
    const isParentOrStaff = ['parent', 'teacher', 'admin', 'staff'].includes(userRole);

    if (!isOwner && !isParentOrStaff) {
      return res.status(403).json({ error: 'Not authorized to view this student\'s weakness report' });
    }

    // Get age for AI prompt
    const studentAge = profile.age || 10;
    const ageGroup = getAgeGroup(studentAge);

    // Get student progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('total_xp, current_level, lessons_completed, current_streak')
      .eq('user_id', studentId)
      .single();

    // Get lesson progress with scores
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('lesson_id, score, time_spent_seconds, attempts, completed, updated_at')
      .eq('user_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(50);

    // Get lesson templates for category info
    const lessonIds = (lessonProgress || []).map(lp => lp.lesson_id);
    let lessonsData = [];
    if (lessonIds.length > 0) {
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title_vi, title_en, category, estimated_minutes, difficulty_level')
        .in('id', lessonIds);
      lessonsData = lessons || [];
    }

    // Get mission progress
    const { data: missionProgress } = await supabase
      .from('user_missions')
      .select('mission_id, status, score, attempts')
      .eq('user_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(30);

    // Get mission templates
    const missionIds = (missionProgress || []).map(mp => mp.mission_id);
    let missionTemplates = [];
    if (missionIds.length > 0) {
      const { data: missions } = await supabase
        .from('mission_templates')
        .select('id, title_vi, title_en, mission_type, difficulty')
        .in('id', missionIds);
      missionTemplates = missions || [];
    }

    // Calculate peer averages for time comparison (sample of other students)
    const { data: peerLessonProgress } = await supabase
      .from('lesson_progress')
      .select('lesson_id, time_spent_seconds')
      .neq('user_id', studentId)
      .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['__none__'])
      .limit(200);

    const peerAverages = {};
    if (peerLessonProgress) {
      for (const plp of peerLessonProgress) {
        if (!peerAverages[plp.lesson_id]) {
          peerAverages[plp.lesson_id] = { total: 0, count: 0 };
        }
        peerAverages[plp.lesson_id].total += plp.time_spent_seconds || 0;
        peerAverages[plp.lesson_id].count++;
      }
      for (const [lessonId, data] of Object.entries(peerAverages)) {
        peerAverages[lessonId] = data.count > 0 ? data.total / data.count : 0;
      }
    }

    // Analyze weaknesses
    const lessonWeaknesses = analyzeLessonWeaknesses(lessonProgress, lessonsData);
    const missionWeaknesses = analyzeMissionWeaknesses(missionProgress, missionTemplates);
    const timeWeaknesses = analyzeTimeWeaknesses(lessonProgress, lessonsData, peerAverages);

    // Combine all weaknesses
    const allWeaknesses = [...lessonWeaknesses, ...missionWeaknesses, ...timeWeaknesses]
      .sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 5); // Top 5 most significant weaknesses

    // Calculate overall weakness score (0 = no weakness, 100 = major weaknesses)
    const highSeverityCount = allWeaknesses.filter(w => w.severity === 'high').length;
    const mediumSeverityCount = allWeaknesses.filter(w => w.severity === 'medium').length;
    const weaknessScore = Math.min(100, highSeverityCount * 25 + mediumSeverityCount * 10);

    // Use AI to generate detailed analysis for parent report
    let aiAnalysis = null;
    if (allWeaknesses.length > 0) {
      const analysisPrompt = `Bạn là RoboBuddy - chuyên gia phân tích học tập của RoboKids Vietnam.

Hãy tạo báo cáo chi tiết về ĐIỂM YẾU của học sinh ${profile.full_name || 'này'} (${studentAge} tuổi, cấp ${ageGroup}) dựa trên dữ liệu sau:

Tổng quan:
- Tổng XP: ${progress?.total_xp || 0}
- Level hiện tại: ${progress?.current_level || 1}
- Số bài đã hoàn thành: ${progress?.lessons_completed || 0}
- Streak hiện tại: ${progress?.current_streak || 0} ngày

Các điểm yếu được phát hiện:
${allWeaknesses.map((w, i) => `${i + 1}. [${w.severity.toUpperCase()}] ${w.description} (Điểm trung bình: ${w.averageScore || 'N/A'})`).join('\n')}

Hãy trả lời CHÍNH XÁC theo định dạng JSON sau (KHÔNG có text khác ngoài JSON):
{
  "summary": "Tóm tắt ngắn 2-3 câu về điểm yếu chính của học sinh",
  "weakAreas": [
    {
      "area": "Tên lĩnh vực yếu (ví dụ: vòng lặp, điều kiện, di chuyển robot)",
      "description": "Mô tả vấn đề cụ thể bằng tiếng Việt",
      "severity": "high|medium|low",
      "improvementTips": ["Mẹo cải thiện 1", "Mẹo cải thiện 2"]
    }
  ],
  "recommendedPractice": [
    {
      "type": "lesson|mission|exercise",
      "title": "Tên bài tập nên làm",
      "reason": "Tại sao bài này giúp cải thiện"
    }
  ],
  "parentAdvice": "Lời khuyên ngắn gọn cho phụ huynh (2-3 câu)"
}`;

      try {
        const messages = [
          buildSystemMessage(studentAge),
          { role: 'user', content: analysisPrompt }
        ];
        const result = await chatWithAI(messages, { maxTokens: 1536 });
        const responseText = result.content || result.message?.content || '';

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[0]);
        }
      } catch (aiError) {
        console.error('AI weakness analysis error:', aiError);
      }
    }

    // Build response
    const weaknessReport = {
      studentId,
      studentName: profile.full_name,
      age: studentAge,
      ageGroup,
      weaknessScore, // 0-100, higher = more weaknesses
      summary: aiAnalysis?.summary || `Phát hiện ${allWeaknesses.length} điểm cần cải thiện`,
      weaknesses: allWeaknesses.map(w => ({
        type: w.type,
        area: w.area,
        description: w.description,
        severity: w.severity,
        details: {
          averageScore: w.averageScore,
          actualTimeSeconds: w.actualTimeSeconds,
          expectedTimeSeconds: w.expectedTimeSeconds,
          failureCount: w.failureCount
        }
      })),
      aiAnalysis: aiAnalysis ? {
        weakAreas: aiAnalysis.weakAreas || [],
        recommendedPractice: aiAnalysis.recommendedPractice || [],
        parentAdvice: aiAnalysis.parentAdvice
      } : null,
      progress: {
        totalXp: progress?.total_xp || 0,
        currentLevel: progress?.current_level || 1,
        lessonsCompleted: progress?.lessons_completed || 0,
        currentStreak: progress?.current_streak || 0,
        lessonsAnalyzed: lessonProgress?.length || 0,
        missionsAnalyzed: missionProgress?.length || 0
      },
      generatedAt: new Date().toISOString()
    };

    res.json(weaknessReport);
  } catch (error) {
    console.error('AI weakness analysis error:', error);
    if (error.statusCode === 429) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service',
        retryAfter: error.retryAfter
      });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;