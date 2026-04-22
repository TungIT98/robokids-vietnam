/**
 * RoboBuddy Proactive AI Tutor Service
 * Space Academy Phase 2 - Proactive Learning Features
 *
 * Implements:
 * - Real-time confusion detection (typing patterns, time-on-task)
 * - Learning brittleness detection (when learner is about to give up)
 * - ZPD (Zone of Proximal Development) intervention triggers
 * - Emotional intelligence responses
 * - Micro-learning with adaptive difficulty
 */

import { getAgeGroup, AGE_GROUPS } from './robobuddy-templates.js';

// ============================================
// BEHAVIOR TRACKING & ANALYTICS
// ============================================

// In-memory student behavior sessions
// Map<studentId, StudentBehaviorProfile>
const behaviorSessions = new Map();

/**
 * Student behavior profile structure
 */
class StudentBehaviorProfile {
  constructor(studentId, age) {
    this.studentId = studentId;
    this.age = age;
    this.ageGroup = getAgeGroup(age);

    // Time tracking
    this.currentTaskStartTime = null;
    this.taskTimeSpent = 0; // milliseconds on current task
    this.totalSessionTime = 0;
    this.lastActivityTime = Date.now();

    // Error tracking
    this.errorHistory = []; // { timestamp, errorType, blockContext, resolved }
    this.similarErrorCount = 0;
    this.lastErrorPattern = null;

    // Typing/input patterns
    this.typingSpeedSamples = [];
    this.inputPauses = []; // Long pauses between inputs
    this.recentInputCount = 0; // Rapid inputs indicator
    this.lastTypingTimestamp = null;

    // Engagement metrics
    this.messageCount = 0;
    this.hintRequests = 0;
    this.analyzeRequests = 0;
    this.helpRequests = 0;

    // Performance tracking
    this.taskAttempts = 0;
    this.taskSuccesses = 0;
    this.currentStreak = 0; // Consecutive successes/failures

    // Affective states (detected)
    this.frustrationLevel = 0; // 0-100
    this.confusionLevel = 0; // 0-100
    this.engagementLevel = 100; // 0-100

    // Intervention state
    this.lastInterventionTime = null;
    this.interventionCount = 0;
    this.lastProactiveMessage = null;
  }
}

/**
 * Get or create behavior profile for a student
 */
export function getBehaviorProfile(studentId, age) {
  if (!behaviorSessions.has(studentId)) {
    behaviorSessions.set(studentId, new StudentBehaviorProfile(studentId, age));
  }
  const profile = behaviorSessions.get(studentId);
  // Update age if provided and different
  if (age && profile.age !== age) {
    profile.age = age;
    profile.ageGroup = getAgeGroup(age);
  }
  return profile;
}

/**
 * Record task start time
 */
export function recordTaskStart(studentId, age) {
  const profile = getBehaviorProfile(studentId, age);
  profile.currentTaskStartTime = Date.now();
  profile.lastActivityTime = Date.now();
  return profile;
}

/**
 * Record task completion (success or failure)
 */
export function recordTaskAttempt(studentId, success, errorType = null) {
  const profile = behaviorSessions.get(studentId);
  if (!profile) return null;

  profile.taskAttempts++;
  profile.taskSuccesses += success ? 1 : 0;

  if (errorType) {
    profile.errorHistory.push({
      timestamp: Date.now(),
      errorType,
      resolved: success
    });

    // Check for similar errors (within 2 minutes, same error type)
    const recentSimilar = profile.errorHistory.filter(
      e => e.errorType === errorType &&
           Date.now() - e.timestamp < 2 * 60 * 1000 &&
           !e.resolved
    );
    profile.similarErrorCount = recentSimilar.length;
    profile.lastErrorPattern = errorType;
  }

  // Update streak
  if (success) {
    profile.currentStreak = Math.min(profile.currentStreak + 1, 10);
  } else {
    profile.currentStreak = Math.max(profile.currentStreak - 1, -5);
  }

  // Recalculate frustration based on recent errors
  updateFrustrationLevel(profile);

  return profile;
}

/**
 * Record user input event (for typing pattern analysis)
 */
export function recordInputEvent(studentId, age) {
  const profile = getBehaviorProfile(studentId, age);
  const now = Date.now();

  // Calculate time since last input
  if (profile.lastTypingTimestamp) {
    const timeSinceLastInput = now - profile.lastTypingTimestamp;

    // Detect long pause (potential confusion/stuck indicator)
    if (timeSinceLastInput > 30000) { // 30 seconds
      profile.inputPauses.push({
        duration: timeSinceLastInput,
        timestamp: now
      });
    }

    // Detect rapid inputs (frustration indicator)
    if (timeSinceLastInput < 2000) { // Less than 2 seconds between inputs
      profile.recentInputCount++;
    } else {
      profile.recentInputCount = Math.max(0, profile.recentInputCount - 1);
    }
  }

  profile.lastTypingTimestamp = now;
  profile.lastActivityTime = now;
  profile.messageCount++;

  // Update engagement level
  profile.engagementLevel = Math.min(100, profile.engagementLevel + 5);

  return profile;
}

/**
 * Record AI interaction request
 */
export function recordAIRequest(studentId, requestType, age) {
  const profile = getBehaviorProfile(studentId, age);

  switch (requestType) {
    case 'hint':
      profile.hintRequests++;
      profile.frustrationLevel = Math.min(100, profile.frustrationLevel + 10);
      break;
    case 'analyze':
      profile.analyzeRequests++;
      break;
    case 'help':
      profile.helpRequests++;
      profile.frustrationLevel = Math.min(100, profile.frustrationLevel + 15);
      break;
    case 'chat':
      profile.messageCount++;
      break;
  }

  return profile;
}

/**
 * Update frustration level based on behavior patterns
 */
function updateFrustrationLevel(profile) {
  let frustration = 0;

  // Factor 1: Recent error rate (last 5 attempts)
  const recentAttempts = profile.errorHistory.slice(-5);
  const errorRate = recentAttempts.filter(e => !e.resolved).length / Math.max(recentAttempts.length, 1);
  frustration += errorRate * 40;

  // Factor 2: Similar repeated errors
  frustration += Math.min(20, profile.similarErrorCount * 7);

  // Factor 3: High hint/help requests
  const totalInteractions = profile.hintRequests + profile.helpRequests + profile.analyzeRequests;
  if (totalInteractions > 10) {
    frustration += Math.min(20, (profile.hintRequests + profile.helpRequests) / totalInteractions * 20);
  }

  // Factor 4: Negative streak
  if (profile.currentStreak < -2) {
    frustration += Math.min(20, Math.abs(profile.currentStreak) * 5);
  }

  profile.frustrationLevel = Math.min(100, Math.max(0, frustration));
  return profile.frustrationLevel;
}

// ============================================
// DETECTION ALGORITHMS
// ============================================

/**
 * Detect if student is confused (ZPD breach warning)
 * Returns: { isConfused: boolean, confidence: number, indicators: string[] }
 */
export function detectConfusion(studentId) {
  const profile = behaviorSessions.get(studentId);
  if (!profile) return { isConfused: false, confidence: 0, indicators: [] };

  const indicators = [];
  let score = 0;

  // Indicator 1: Time on current task exceeds threshold
  const timeOnTask = profile.currentTaskStartTime
    ? Date.now() - profile.currentTaskStartTime
    : 0;
  const timeThreshold = getTimeThreshold(profile.ageGroup);
  if (timeOnTask > timeThreshold) {
    indicators.push(`time_on_task:${Math.round(timeOnTask / 1000)}s`);
    score += 30;
  }

  // Indicator 2: Repeated similar errors
  if (profile.similarErrorCount >= 2) {
    indicators.push(`repeated_errors:${profile.similarErrorCount}`);
    score += 35;
  } else if (profile.similarErrorCount >= 1) {
    indicators.push(`repeated_errors:${profile.similarErrorCount}`);
    score += 20;
  }

  // Indicator 3: High frustration level
  if (profile.frustrationLevel > 60) {
    indicators.push(`frustration:${profile.frustrationLevel}`);
    score += 25;
  }

  // Indicator 4: Long input pauses
  const recentPause = profile.inputPauses[profile.inputPauses.length - 1];
  if (recentPause && Date.now() - recentPause.timestamp < 60000) {
    indicators.push(`long_pause:${Math.round(recentPause.duration / 1000)}s`);
    score += 20;
  }

  // Indicator 5: Low engagement
  if (profile.engagementLevel < 40) {
    indicators.push(`low_engagement:${profile.engagementLevel}`);
    score += 15;
  }

  // Indicator 6: Rapid inputs (trying many things without success)
  if (profile.recentInputCount > 5) {
    indicators.push(`rapid_inputs:${profile.recentInputCount}`);
    score += 15;
  }

  const confidence = Math.min(100, score);
  return {
    isConfused: confidence >= 50,
    confidence,
    indicators,
    score
  };
}

/**
 * Detect "learning brittleness" - student about to give up
 * Returns: { isBrittle: boolean, severity: 'low'|'medium'|'high', indicators: string[] }
 */
export function detectLearningBrittleness(studentId) {
  const profile = behaviorSessions.get(studentId);
  if (!profile) return { isBrittle: false, severity: 'low', indicators: [] };

  const indicators = [];
  let severityScore = 0;

  // High frustration with low progress
  if (profile.frustrationLevel > 70 && profile.taskSuccesses < 3) {
    indicators.push('high_frustration_low_success');
    severityScore += 40;
  }

  // Multiple failed attempts on same error type
  if (profile.similarErrorCount >= 3) {
    indicators.push('stuck_on_same_error');
    severityScore += 35;
  }

  // Multiple hint requests in short time
  if (profile.hintRequests >= 3 && profile.messageCount < 10) {
    indicators.push('multiple_hints_early');
    severityScore += 25;
  }

  // Extended time on task with no progress
  const timeOnTask = profile.currentTaskStartTime
    ? Date.now() - profile.currentTaskStartTime
    : 0;
  const timeThreshold = getTimeThreshold(profile.ageGroup) * 2;
  if (timeOnTask > timeThreshold && profile.taskSuccesses === 0) {
    indicators.push('extended_time_no_progress');
    severityScore += 30;
  }

  // Negative streak
  if (profile.currentStreak <= -3) {
    indicators.push(`negative_streak:${profile.currentStreak}`);
    severityScore += 20;
  }

  // Very low engagement
  if (profile.engagementLevel < 25) {
    indicators.push('very_low_engagement');
    severityScore += 25;
  }

  // Determine severity
  let severity = 'low';
  if (severityScore >= 70) severity = 'high';
  else if (severityScore >= 40) severity = 'medium';

  return {
    isBrittle: severityScore >= 40,
    severity,
    indicators,
    score: severityScore
  };
}

/**
 * Check if proactive intervention should be triggered
 * Returns: { shouldIntervene: boolean, type: string|null, message: string|null }
 */
export function shouldProactivelyIntervene(studentId) {
  const profile = behaviorSessions.get(studentId);
  if (!profile) return { shouldIntervene: false, type: null, message: null };

  // Don't intervene too frequently (at least 2 minutes between interventions)
  if (profile.lastInterventionTime &&
      Date.now() - profile.lastInterventionTime < 2 * 60 * 1000) {
    return { shouldIntervene: false, type: null, message: null };
  }

  // Check confusion state
  const confusion = detectConfusion(studentId);
  if (confusion.isConfused && confusion.confidence >= 60) {
    return {
      shouldIntervene: true,
      type: 'confusion',
      message: generateConfusionIntervention(profile, confusion),
      confidence: confusion.confidence
    };
  }

  // Check brittleness state
  const brittleness = detectLearningBrittleness(studentId);
  if (brittleness.isBrittle && brittleness.severity !== 'low') {
    return {
      shouldIntervene: true,
      type: 'brittleness',
      message: generateBrittlenessIntervention(profile, brittleness),
      severity: brittleness.severity
    };
  }

  // Check time-based intervention (ZPD warning)
  const timeOnTask = profile.currentTaskStartTime
    ? Date.now() - profile.currentTaskStartTime
    : 0;
  const timeThreshold = getTimeThreshold(profile.ageGroup);
  if (timeOnTask > timeThreshold * 1.5 && profile.taskSuccesses === 0) {
    return {
      shouldIntervene: true,
      type: 'time_zpd',
      message: generateTimeZPDIntervention(profile),
      timeOnTask: Math.round(timeOnTask / 1000)
    };
  }

  return { shouldIntervene: false, type: null, message: null };
}

// ============================================
// INTERVENTION MESSAGE GENERATORS
// ============================================

function getTimeThreshold(ageGroup) {
  switch (ageGroup) {
    case AGE_GROUPS.BEGINNER: return 3 * 60 * 1000; // 3 minutes for ages 6-8
    case AGE_GROUPS.INTERMEDIATE: return 5 * 60 * 1000; // 5 minutes for ages 9-12
    case AGE_GROUPS.ADVANCED: return 8 * 60 * 1000; // 8 minutes for ages 13-16
    default: return 5 * 60 * 1000;
  }
}

function generateConfusionIntervention(profile, confusion) {
  const ageGroup = profile.ageGroup;
  const confidence = confusion.confidence;

  // Space theme messages
  const interventions = {
    [AGE_GROUPS.BEGINNER]: [
      "🌟 Này bạnSpace nhỏ! Mình thấy bạn có vẻ đang suy nghĩ nhiều đó! Bạn cần mình gợi ý một xíu không nào? 🚀",
      "✨ Ơi! Robot của bạn có vẻ cần giúp đỡ nè! Mình ở đây này - muốn mình gợi ý gì không? 💫",
      "🌙 Bạn đang làm rất tốt rồi! Nhưng mà mình thấy bạn cần một chút hỗ trợ đó. Mình giúp bạn nhé? 🤖"
    ],
    [AGE_GROUPS.INTERMEDIATE]: [
      "🌟 Mình nhận thấy bạn đang gặp một chút khó khăn đó! Bạn có muốn mình gợi ý không? 💡",
      "🚀 Ờ mà, nếu bạn cần hỗ trợ thì cứ nói với mình nhé! Mình sẵn sàng giúp bạn vượt qua phần này! 🌟",
      "✨ Code này hơi phức tạp một xíu nhỉ? Đừng lo - mình sẽ giúp bạn hiểu rõ hơn! 📚"
    ],
    [AGE_GROUPS.ADVANCED]: [
      "💡 Mình nhận thấy bạn đang mất khá nhiều thời gian trên phần này. Bạn cần một gợi ý hoặc có thể thử tiếp cận khác? 🔍",
      "🎯 Nếu bạn cần hỗ trợ phân tích vấn đề, mình có thể giúp bạn debug từng bước! 📊",
      "⚡ Có vẻ như bạn đang tiếp cận vấn đề từ một góc khó hơn. Mình có thể gợi ý hướng đi khác không? 🚀"
    ]
  };

  const messages = interventions[ageGroup] || interventions[AGE_GROUPS.INTERMEDIATE];
  return messages[Math.floor(Math.random() * messages.length)];
}

function generateBrittlenessIntervention(profile, brittleness) {
  const ageGroup = profile.ageGroup;
  const severity = brittleness.severity;

  // More urgent for higher severity
  const interventions = {
    [AGE_GROUPS.BEGINNER]: {
      high: "🌟✨ Ơi bạn ơi! Mình thấy bạn đang cố gắng lắm rồi! Đừng lo, mình sẽ giúp bạn từng bước một nhé! Bạn tin mình không? 💪🚀",
      medium: "🤗 Mình biết bạn đang cố gắng lắm! Đôi khi code khó một xíu thôi. Mình giúp bạn từ đầu nhé! 🌟",
      low: "💪 Trời ơi bạn làm được rồi! Mình biết bạn làm được mà! Cứ thử lại đi, mình ở đây hỗ trợ bạn!"
    },
    [AGE_GROUPS.INTERMEDIATE]: {
      high: "🤗 Mình hiểu mà, đôi khi code khó thật sự! Nhưng bạn đừng nản lòng nhé. Mình sẽ cùng bạn giải quyết từ từ từng bước! 💪🌟",
      medium: "💡 Đừng lo, debug là quá trình học tập tốt nhất đó! Mình gợi ý bạn thử một hướng khác xem sao nhé! 🔧",
      low: "🎯 Bạn đang làm rất tốt! Cứ tiếp tục như vậy, mình tin bạn sẽ giải quyết được!"
    },
    [AGE_GROUPS.ADVANCED]: {
      high: "⚠️ Mình nhận thấy bạn đang gặp khó khăn với phần này. Đây là lúc debug có hệ thống sẽ giúp bạn. Mình gợi ý bạn tách vấn đề thành các phần nhỏ để giải quyết? 🔍",
      medium: "💡 Khi gặp lỗi khó, thường cách tốt nhất là đọc code từng bước một. Mình có thể giúp bạn phân tích từng phần! 📊",
      low: "🎯 Bạn đang tiến bộ rất tốt! Một chút kiên nhẫn nữa thôi, bạn sẽ giải quyết được! 💪"
    }
  };

  const messages = interventions[ageGroup] || interventions[AGE_GROUPS.INTERMEDIATE];
  return messages[severity] || messages.low;
}

function generateTimeZPDIntervention(profile) {
  const ageGroup = profile.ageGroup;

  // ZPD: Guide student before they're completely stuck
  const messages = {
    [AGE_GROUPS.BEGINNER]: "🌟 Này bạnSpace! Mình thấy bài này hơi khó đúng không? Đừng lo, mình sẽ cùng bạn làm từng bước nhé! Bạn xem hướng dẫn trước rồi mình sẽ giải thích thêm nhé! 📚✨",
    [AGE_GROUPS.INTERMEDIATE]: "💡 Bài này hơi thử thách một xíu nhỉ? Đừng ngại hỏi mình nhé! Mình có thể giúp bạn hiểu rõ hơn từng bước! 📖🌟",
    [AGE_GROUPS.ADVANCED]: "🎯 Mình nhận thấy bạn đang mất khá nhiều thời gian cho phần này. Bạn muốn mình gợi ý một hint hoặc phân tích vấn đề cùng bạn không? 🔍"
  };

  return messages[ageGroup] || messages[AGE_GROUPS.INTERMEDIATE];
}

/**
 * Generate emotional support message
 */
export function generateEmotionalSupport(studentId) {
  const profile = behaviorSessions.get(studentId);
  if (!profile) return null;

  const ageGroup = profile.ageGroup;

  const supportMessages = {
    [AGE_GROUPS.BEGINNER]: [
      "🌟 Bạn làm rất tốt rồi đó! Đừng quên robot cũng cần thời gian để học hỏi như bạn vậy! 💪✨",
      "🚀 Mình biết bạn đang cố gắng rất nhiều! Đó là điều tuyệt vời rồi! 🌈",
      "⭐ Trời ơi bạn giỏi lắm lắm! Mỗi lần thử là một lần học hỏi mới đó! 🎉"
    ],
    [AGE_GROUPS.INTERMEDIATE]: [
      "💪 Mình biết bạn đang cố gắng rất nhiều! Đó là tinh thần của một lập trình viên thật sự! 🌟",
      "🎯 Quá trình debug là cách tốt nhất để học hỏi. Bạn đang làm đúng rồi! 💡",
      "🌟 Mỗi lần gặp lỗi là một lần hiểu sâu hơn về code. Bạn đang tiến bộ đó! 🚀"
    ],
    [AGE_GROUPS.ADVANCED]: [
      "🧠 Debug là kỹ năng quan trọng nhất của lập trình viên. Bạn đang rèn luyện nó rất tốt! 💪",
      "📊 Phân tích từng bước sẽ giúp bạn hiểu rõ vấn đề hơn. Kiên nhẫn là chìa khóa! 🎯",
      "⚡ Những lập trình viên giỏi nhất cũng từng trải qua những lúc khó khăn. Bạn đang trên đúng đường! 🚀"
    ]
  };

  const messages = supportMessages[ageGroup] || supportMessages[AGE_GROUPS.INTERMEDIATE];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Record that an intervention was shown
 */
export function recordIntervention(studentId) {
  const profile = behaviorSessions.get(studentId);
  if (!profile) return null;

  profile.lastInterventionTime = Date.now();
  profile.interventionCount++;

  return profile;
}

/**
 * Get full behavior analytics for a student
 */
export function getBehaviorAnalytics(studentId) {
  const profile = behaviorSessions.get(studentId);
  if (!profile) return null;

  const confusion = detectConfusion(studentId);
  const brittleness = detectLearningBrittleness(studentId);

  return {
    studentId,
    age: profile.age,
    ageGroup: profile.ageGroup,

    // Time metrics
    currentTaskTime: profile.currentTaskStartTime
      ? Math.round((Date.now() - profile.currentTaskStartTime) / 1000)
      : 0,
    totalSessionTime: Math.round(profile.totalSessionTime / 1000),
    lastActivity: Math.round((Date.now() - profile.lastActivityTime) / 1000),

    // Engagement metrics
    messageCount: profile.messageCount,
    hintRequests: profile.hintRequests,
    helpRequests: profile.helpRequests,
    analyzeRequests: profile.analyzeRequests,

    // Performance metrics
    taskAttempts: profile.taskAttempts,
    taskSuccesses: profile.taskSuccesses,
    successRate: profile.taskAttempts > 0
      ? Math.round((profile.taskSuccesses / profile.taskAttempts) * 100)
      : 0,
    currentStreak: profile.currentStreak,

    // Affective state
    frustrationLevel: profile.frustrationLevel,
    confusionLevel: confusion.confidence,
    engagementLevel: profile.engagementLevel,

    // Detection results
    confusion: {
      isConfused: confusion.isConfused,
      confidence: confusion.confidence,
      indicators: confusion.indicators
    },
    brittleness: {
      isBrittle: brittleness.isBrittle,
      severity: brittleness.severity,
      indicators: brittleness.indicators
    },

    // Intervention state
    interventionCount: profile.interventionCount,
    lastIntervention: profile.lastInterventionTime
      ? Math.round((Date.now() - profile.lastInterventionTime) / 1000)
      : null,

    // Error patterns
    recentErrors: profile.errorHistory.slice(-5).map(e => ({
      errorType: e.errorType,
      timestamp: e.timestamp,
      resolved: e.resolved
    })),
    similarErrorCount: profile.similarErrorCount
  };
}

/**
 * Clear behavior session (when student logs out or session ends)
 */
export function clearBehaviorSession(studentId) {
  behaviorSessions.delete(studentId);
  return { cleared: true };
}

// ============================================
// ADAPTIVE DIFFICULTY HELPERS
// ============================================

/**
 * Calculate recommended difficulty adjustment based on student performance
 * Returns: { adjustment: 'easier'|'same'|'harder', confidence: number, reasons: string[] }
 */
export function calculateDifficultyAdjustment(studentId) {
  const profile = behaviorSessions.get(studentId);
  if (!profile) return { adjustment: 'same', confidence: 0, reasons: [] };

  const reasons = [];
  let score = 0; // Positive = easier, Negative = harder

  // High success rate with low frustration = can handle harder
  if (profile.taskSuccesses >= 5) {
    const successRate = profile.taskSuccesses / Math.max(profile.taskAttempts, 1);
    if (successRate > 0.8 && profile.frustrationLevel < 30) {
      score -= 20;
      reasons.push('High success rate with low frustration - ready for challenge');
    }
  }

  // High frustration with low success = needs easier
  if (profile.frustrationLevel > 60 && profile.taskSuccesses < 3) {
    score += 30;
    reasons.push('High frustration with low success - needs easier content');
  }

  // Multiple similar errors = concept not understood
  if (profile.similarErrorCount >= 2) {
    score += 15;
    reasons.push('Repeated similar errors - needs reinforcement');
  }

  // Very low engagement = bored or overwhelmed
  if (profile.engagementLevel < 30) {
    score += 10;
    reasons.push('Low engagement - may need adjustment');
  }

  // Positive streak = progressing well
  if (profile.currentStreak >= 3) {
    score -= 10;
    reasons.push('Positive streak - maintaining progress');
  }

  // Determine adjustment
  let adjustment = 'same';
  if (score >= 20) adjustment = 'easier';
  else if (score <= -20) adjustment = 'harder';

  return {
    adjustment,
    confidence: Math.min(100, Math.abs(score)),
    reasons
  };
}

/**
 * Get micro-learning suggestion based on student struggle
 */
export function getMicroLearningSuggestion(studentId) {
  const profile = behaviorSessions.get(studentId);
  if (!profile) return null;

  const ageGroup = profile.ageGroup;

  // Find the most recent unresolved error
  const recentUnresolved = profile.errorHistory
    .filter(e => !e.resolved)
    .slice(-1)[0];

  const suggestions = {
    [AGE_GROUPS.BEGINNER]: {
      loop: "🔁 Hãy thử vẽ ra từng bước robot sẽ đi trước khi viết code nhé! Giống như khi bạn đi theo dấu chân ấy! 👣",
      forward: "🚂 Robot cần biết đi bao xa! Hãy đếm số bước thật kỹ nha! Một, hai, ba... bao nhiêu bước là vừa? 🤔",
      turn: "🔄 Rẽ trái hay rẽ phải? Hãy tưởng tượng bạn đứng ở giữa và quay người nhé! 🤸",
      condition: "🤔 Nếu... thì... như khi bạn nói 'Nếu mưa thì mang ô' vậy đó! ☔",
      error: "🔧 Đừng lo! Lỗi là cách tốt nhất để học đó! Hãy đọc lại từng bước từ trên xuống nhé! 📖"
    },
    [AGE_GROUPS.INTERMEDIATE]: {
      loop: "🔁 Vòng lặp giống như khi bạn lặp lại một điệu nhảy nhiều lần. Hãy đếm xem cần lặp bao nhiêu lần nhé! 💃",
      forward: "🚶‍♂️ Đi bao xa? Hãy đo khoảng cách từ điểm A đến điểm B trước nhé! 📏",
      turn: "🔄 Quay bao nhiêu độ? 90 độ là một góc vuông, 180 độ là quay ngược lại! 📐",
      condition: "🤔 Nếu điều kiện đúng → làm A, sai → làm B. Giống như quyết định của bạn mỗi ngày! ✅❌",
      error: "🔧 Đọc code từ trên xuống và tưởng tượng robot chạy từng bước. Khối nào không đúng thì sửa thôi! 💡"
    },
    [AGE_GROUPS.ADVANCED]: {
      loop: "🔁 Vòng lặp for thường dùng khi biết trước số lần lặp. Còn while khi điều kiện quyết định! ℹ️",
      forward: "🚶‍♂️ Kiểm tra đơn vị: bước (steps) vs đơn vị khoảng cách. Đảm bảo robot di chuyển đúng quãng đường! 📏",
      turn: "🔄 Gyroscope sensor trả về giá trị độ. Kiểm tra góc quay có đúng với yêu cầu không! 📐",
      condition: "🤔 Else là nhánh khi điều kiện sai. Đảm bảo cả hai trường hợp đều được xử lý! ⚖️",
      error: "🔧 Sử dụng print/console để kiểm tra giá trị biến tại mỗi bước. Debug từng khối một! 🖥️"
    }
  };

  const ageSuggestions = suggestions[ageGroup] || suggestions[AGE_GROUPS.INTERMEDIATE];

  if (recentUnresolved?.errorType && ageSuggestions[recentUnresolved.errorType]) {
    return ageSuggestions[recentUnresolved.errorType];
  }

  // Generic micro-learning tip
  return ageSuggestions.error;
}
