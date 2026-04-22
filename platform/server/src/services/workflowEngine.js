/**
 * AI Workflow Engine for RoboKids Vietnam
 * Composable workflow system using Composio + Windmill
 *
 * Triggers:
 * - lesson_complete -> update XP -> check achievements -> send notification
 * - mission_complete -> award XP -> check badges -> update leaderboard
 * - streak_milestone -> celebrate -> notify parents
 * - badge_earned -> reward animation -> share achievement
 */

import dotenv from 'dotenv';
import { supabase } from '../lib/supabase.js';
import composioService from './composio.js';

dotenv.config();

const WINDMILL_URL = process.env.WINDMILL_URL || 'http://localhost:3010';
const WINDMILL_API_KEY = process.env.WINDMILL_API_KEY;

// ========== EVENT TYPES ==========

export const WorkflowEventType = {
  LESSON_COMPLETE: 'lesson_complete',
  MISSION_COMPLETE: 'mission_complete',
  STREAK_MILESTONE: 'streak_milestone',
  BADGE_EARNED: 'badge_earned',
  LEVEL_UP: 'level_up',
  XP_MILESTONE: 'xp_milestone',
};

// ========== ACTION TYPES ==========

export const WorkflowActionType = {
  UPDATE_XP: 'update_xp',
  CHECK_ACHIEVEMENTS: 'check_achievements',
  CHECK_BADGES: 'check_badges',
  SEND_NOTIFICATION: 'send_notification',
  SEND_PARENT_NOTIFICATION: 'send_parent_notification',
  WINDMILL_TRIGGER: 'windmill_trigger',
  COMPOSIO_ACTION: 'composio_action',
};

// ========== WORKFLOW DEFINITIONS ==========

/**
 * Built-in workflow definitions
 * These define the chain of actions to execute for each event type
 */
const WORKFLOW_DEFINITIONS = {
  [WorkflowEventType.LESSON_COMPLETE]: {
    name: 'Lesson Completion Flow',
    description: 'Triggered when a student completes a lesson',
    actions: [
      { type: WorkflowActionType.UPDATE_XP, params: { baseXp: 10 } },
      { type: WorkflowActionType.CHECK_BADGES, params: {} },
      { type: WorkflowActionType.CHECK_ACHIEVEMENTS, params: {} },
      { type: WorkflowActionType.SEND_NOTIFICATION, params: { channel: 'in_app' } },
    ],
  },
  [WorkflowEventType.MISSION_COMPLETE]: {
    name: 'Mission Completion Flow',
    description: 'Triggered when a student completes a mission',
    actions: [
      { type: WorkflowActionType.UPDATE_XP, params: { source: 'mission' } },
      { type: WorkflowActionType.CHECK_BADGES, params: {} },
      { type: WorkflowActionType.SEND_NOTIFICATION, params: { channel: 'in_app' } },
      { type: WorkflowActionType.WINDMILL_TRIGGER, params: { script: 'analyze_blockly' } },
    ],
  },
  [WorkflowEventType.STREAK_MILESTONE]: {
    name: 'Streak Milestone Flow',
    description: 'Triggered when student reaches streak milestone (7, 30, 100 days)',
    actions: [
      { type: WorkflowActionType.SEND_PARENT_NOTIFICATION, params: { channel: 'zalo' } },
      { type: WorkflowActionType.COMPOSIO_ACTION, params: { action: 'gmail_send' } },
    ],
  },
  [WorkflowEventType.BADGE_EARNED]: {
    name: 'Badge Earned Flow',
    description: 'Triggered when student earns a new badge',
    actions: [
      { type: WorkflowActionType.SEND_NOTIFICATION, params: { channel: 'in_app', type: 'celebration' } },
      { type: WorkflowActionType.SEND_PARENT_NOTIFICATION, params: { channel: 'zalo' } },
    ],
  },
  [WorkflowEventType.LEVEL_UP]: {
    name: 'Level Up Flow',
    description: 'Triggered when student reaches new level',
    actions: [
      { type: WorkflowActionType.SEND_NOTIFICATION, params: { channel: 'in_app', type: 'level_up' } },
      { type: WorkflowActionType.SEND_PARENT_NOTIFICATION, params: { channel: 'zalo' } },
    ],
  },
};

// ========== WORKFLOW ENGINE ==========

class WorkflowEngine {
  constructor() {
    this.workflows = new Map();
    this.eventListeners = new Map();
    this.executionHistory = [];

    // Initialize with built-in workflows
    this.registerBuiltInWorkflows();
  }

  /**
   * Register built-in workflow definitions
   */
  registerBuiltInWorkflows() {
    for (const [eventType, definition] of Object.entries(WORKFLOW_DEFINITIONS)) {
      this.registerWorkflow(eventType, definition);
    }
  }

  /**
   * Register a new workflow
   */
  registerWorkflow(eventType, definition) {
    this.workflows.set(eventType, {
      ...definition,
      registeredAt: new Date().toISOString(),
    });
  }

  /**
   * Get workflow definition for an event type
   */
  getWorkflow(eventType) {
    return this.workflows.get(eventType);
  }

  /**
   * Get all registered workflows
   */
  getAllWorkflows() {
    return Array.from(this.workflows.entries()).map(([eventType, def]) => ({
      eventType,
      ...def,
    }));
  }

  /**
   * Emit an event to trigger workflow
   */
  async emit(eventType, payload) {
    const workflow = this.workflows.get(eventType);
    if (!workflow) {
      console.warn(`No workflow registered for event: ${eventType}`);
      return { executed: false, reason: 'no_workflow' };
    }

    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    console.log(`[WorkflowEngine] Executing workflow ${executionId} for event: ${eventType}`);

    const results = [];
    let success = true;

    for (const action of workflow.actions) {
      try {
        const result = await this.executeAction(action, payload);
        results.push({
          actionType: action.type,
          success: true,
          result,
        });
      } catch (error) {
        console.error(`[WorkflowEngine] Action ${action.type} failed:`, error.message);
        results.push({
          actionType: action.type,
          success: false,
          error: error.message,
        });
        success = false;
        // Continue executing other actions even if one fails
      }
    }

    const executionTime = Date.now() - startTime;
    const executionRecord = {
      executionId,
      eventType,
      payload: this.sanitizePayload(payload),
      results,
      success,
      executionTime,
      executedAt: new Date().toISOString(),
    };

    this.executionHistory.push(executionRecord);

    // Keep only last 1000 executions
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-1000);
    }

    console.log(`[WorkflowEngine] Workflow ${executionId} completed in ${executionTime}ms`);

    return executionRecord;
  }

  /**
   * Execute a single action
   */
  async executeAction(action, payload) {
    switch (action.type) {
      case WorkflowActionType.UPDATE_XP:
        return this.actionUpdateXP(action.params, payload);

      case WorkflowActionType.CHECK_BADGES:
        return this.actionCheckBadges(action.params, payload);

      case WorkflowActionType.CHECK_ACHIEVEMENTS:
        return this.actionCheckAchievements(action.params, payload);

      case WorkflowActionType.SEND_NOTIFICATION:
        return this.actionSendNotification(action.params, payload);

      case WorkflowActionType.SEND_PARENT_NOTIFICATION:
        return this.actionSendParentNotification(action.params, payload);

      case WorkflowActionType.WINDMILL_TRIGGER:
        return this.actionWindmillTrigger(action.params, payload);

      case WorkflowActionType.COMPOSIO_ACTION:
        return this.actionComposioAction(action.params, payload);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Action: Update XP
   */
  async actionUpdateXP(params, payload) {
    const { userId, lessonId, missionId, xpAmount } = payload;
    const baseXp = params.baseXp || 10;

    // Get current progress
    const { data: currentProgress } = await supabase
      .from('user_progress')
      .select('total_xp, level')
      .eq('user_id', userId)
      .single();

    const currentXp = currentProgress?.total_xp || 0;
    const previousLevel = currentProgress?.level || Math.floor(currentXp / 100) + 1;
    const newXp = currentXp + baseXp;
    const newLevel = Math.floor(newXp / 100) + 1;

    // Update XP in database
    if (currentProgress) {
      await supabase
        .from('user_progress')
        .update({ total_xp: newXp, level: newLevel })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_progress')
        .insert({ user_id: userId, total_xp: newXp, level: newLevel });
    }

    const result = {
      xpAdded: baseXp,
      newTotalXp: newXp,
      previousLevel,
      newLevel,
      leveledUp: newLevel > previousLevel,
    };

    // If leveled up, emit level up event
    if (result.leveledUp) {
      // Async - don't wait for level up workflow
      this.emit(WorkflowEventType.LEVEL_UP, {
        userId,
        previousLevel,
        newLevel,
        totalXp: newXp,
      });
    }

    return result;
  }

  /**
   * Action: Check badges based on current progress
   */
  async actionCheckBadges(params, payload) {
    const { userId } = payload;

    // Get user's earned badges
    const { data: progress } = await supabase
      .from('user_progress')
      .select('badges_earned, total_xp, current_streak, lessons_completed')
      .eq('user_id', userId)
      .single();

    // Get all available badges
    const { data: allBadges } = await supabase
      .from('badges')
      .select('*');

    const earnedBadges = progress?.badges_earned || [];
    const eligibleBadges = [];

    for (const badge of (allBadges || [])) {
      // Skip already earned badges
      if (earnedBadges.includes(badge.badge_key)) continue;

      // Check badge eligibility criteria
      const isEligible = this.checkBadgeEligibility(badge, {
        totalXp: progress?.total_xp || 0,
        currentStreak: progress?.current_streak || 0,
        lessonsCompleted: progress?.lessons_completed || 0,
        ...payload,
      });

      if (isEligible) {
        eligibleBadges.push(badge);
      }
    }

    // Award eligible badges
    if (eligibleBadges.length > 0) {
      const newBadgeKeys = [...earnedBadges, ...eligibleBadges.map(b => b.badge_key)];

      await supabase
        .from('user_progress')
        .update({ badges_earned: newBadgeKeys })
        .eq('user_id', userId);

      // Emit badge earned events (async)
      for (const badge of eligibleBadges) {
        this.emit(WorkflowEventType.BADGE_EARNED, {
          userId,
          badge,
          totalBadges: newBadgeKeys.length,
        });
      }
    }

    return {
      checked: allBadges?.length || 0,
      earned: earnedBadges.length,
      newlyEligible: eligibleBadges.length,
      awardedBadges: eligibleBadges.map(b => b.badge_key),
    };
  }

  /**
   * Check if user is eligible for a badge
   */
  checkBadgeEligibility(badge, progress) {
    const { badge_type, criteria_value } = badge;

    switch (badge_type) {
      case 'xp_collector':
        return progress.totalXp >= criteria_value;

      case 'streak_master':
        return progress.currentStreak >= criteria_value;

      case 'lesson_master':
        return progress.lessonsCompleted >= criteria_value;

      case 'speed_demon':
        // Badge for completing lesson quickly (criteria_value in seconds)
        return progress.timeSpentSeconds <= criteria_value;

      case 'first_lesson':
        return progress.lessonsCompleted >= 1;

      default:
        return false;
    }
  }

  /**
   * Action: Check achievements (level milestones, etc.)
   */
  async actionCheckAchievements(params, payload) {
    const { userId } = payload;

    const { data: progress } = await supabase
      .from('user_progress')
      .select('total_xp, current_streak, lessons_completed')
      .eq('user_id', userId)
      .single();

    const achievements = [];

    // Check XP milestones (every 500 XP)
    const xpMilestone = Math.floor((progress?.total_xp || 0) / 500) * 500;
    if (xpMilestone >= 500) {
      achievements.push({
        type: 'xp_milestone',
        value: xpMilestone,
      });
    }

    // Check streak milestones
    const streak = progress?.current_streak || 0;
    const streakMilestones = [7, 30, 100, 365];
    for (const milestone of streakMilestones) {
      if (streak >= milestone) {
        achievements.push({
          type: 'streak_milestone',
          value: milestone,
        });

        // Emit streak milestone event
        this.emit(WorkflowEventType.STREAK_MILESTONE, {
          userId,
          streak: milestone,
          currentStreak: streak,
        });
      }
    }

    return {
      achievements,
      totalXp: progress?.total_xp || 0,
      currentStreak: streak,
    };
  }

  /**
   * Action: Send in-app notification
   */
  async actionSendNotification(params, payload) {
    const { userId, notificationType, notificationTitle, notificationBody } = payload;
    const channel = params.channel || 'in_app';
    const type = params.type || 'info';

    // Create notification record
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: type,
        title: notificationTitle || this.getDefaultNotificationTitle(type),
        body: notificationBody || this.getDefaultNotificationBody(payload),
        data: payload,
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[WorkflowEngine] Failed to create notification:', error);
      throw error;
    }

    return { notificationId: notification.id, channel };
  }

  /**
   * Action: Send parent notification (via Zalo or Composio)
   */
  async actionSendParentNotification(params, payload) {
    const { userId, parentPhone, parentEmail } = payload;
    const channel = params.channel || 'zalo';

    // Get student and parent info
    const { data: student } = await supabase
      .from('students')
      .select('full_name, parent_phone, parent_email, profile_id')
      .eq('profile_id', userId)
      .single();

    if (!student) {
      console.warn('[WorkflowEngine] Student profile not found for user:', userId);
      return { sent: false, reason: 'no_student_profile' };
    }

    const phone = parentPhone || student.parent_phone;
    const email = parentEmail || student.parent_email;
    const studentName = student.full_name;

    // Compose notification message
    const message = this.composeParentMessage(payload, studentName);

    // Send via Zalo if available
    if (channel === 'zalo' && phone) {
      try {
        // Import zalo service dynamically
        const { default: zaloService } = await import('./zalo.js');
        await zaloService.sendMessage(phone, message);
        return { sent: true, channel: 'zalo', phone };
      } catch (error) {
        console.error('[WorkflowEngine] Zalo notification failed:', error);
        // Fall through to try other channels
      }
    }

    // Send via Composio Gmail if available
    if (channel === 'gmail' || channel === 'composio') {
      if (composioService.isConfigured() && email) {
        try {
          await composioService.executeAction('gmail_send_email', {
            to: email,
            subject: `RoboKids: ${studentName} Achievement Update!`,
            body: message,
          });
          return { sent: true, channel: 'gmail', email };
        } catch (error) {
          console.error('[WorkflowEngine] Gmail notification failed:', error);
        }
      }
    }

    return { sent: false, reason: 'no_channel_available' };
  }

  /**
   * Action: Trigger Windmill script for complex processing
   */
  async actionWindmillTrigger(params, payload) {
    if (!WINDMILL_API_KEY) {
      console.warn('[WorkflowEngine] Windmill not configured - WINDMILL_API_KEY missing');
      return { triggered: false, reason: 'not_configured' };
    }

    const { script, resource, input } = params;
    const scriptPath = script || 'analyze_blockly';

    try {
      const response = await fetch(`${WINDMILL_URL}/api/v1/w/run/trigger/fast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WINDMILL_API_KEY}`,
        },
        body: JSON.stringify({
          script,
          resource,
          input: {
            ...input,
            ...payload,
            triggered_by: 'workflow_engine',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Windmill API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return { triggered: true, windmillRunId: result.id, script };
    } catch (error) {
      console.error('[WorkflowEngine] Windmill trigger failed:', error);
      throw error;
    }
  }

  /**
   * Action: Execute a Composio action
   */
  async actionComposioAction(params, payload) {
    if (!composioService.isConfigured()) {
      return { executed: false, reason: 'composio_not_configured' };
    }

    const { action, input } = params;

    try {
      const result = await composioService.executeAction(action, {
        ...input,
        ...payload,
        triggered_by: 'workflow_engine',
      });

      return { executed: true, action, result };
    } catch (error) {
      console.error(`[WorkflowEngine] Composio action ${action} failed:`, error);
      throw error;
    }
  }

  /**
   * Get default notification title based on type
   */
  getDefaultNotificationTitle(type) {
    const titles = {
      celebration: 'Chúc mừng! 🎉',
      level_up: 'Level Up! ⭐',
      badge_earned: 'Huy hiệu mới! 🏅',
      streak: 'Streak Update 🔥',
      info: 'Thông báo',
    };
    return titles[type] || titles.info;
  }

  /**
   * Get default notification body based on payload
   */
  getDefaultNotificationBody(payload) {
    if (payload.badge) {
      return `Bạn đã đạt được huy hiệu "${payload.badge.name_vi || payload.badge.name_en}"!`;
    }
    if (payload.leveledUp) {
      return `Chúc mừng! Bạn đã lên level ${payload.newLevel}!`;
    }
    if (payload.xpAdded) {
      return `+${payload.xpAdded} XP! Tiếp tục phấn đấu nhé!`;
    }
    return 'Một thành tích mới!';
  }

  /**
   * Compose parent notification message
   */
  composeParentMessage(payload, studentName) {
    if (payload.badge) {
      return `Chúc mừng! Con bạn ${studentName} vừa đạt được huy hiệu "${payload.badge.name_vi || payload.badge.name_en}" tại RoboKids!`;
    }
    if (payload.leveledUp) {
      return `Chúc mừng! Con bạn ${studentName} đã lên level ${payload.newLevel} tại RoboKids!`;
    }
    if (payload.streak) {
      return `Wow! Con bạn ${studentName} đã duy trì streak ${payload.streak} ngày liên tiếp tại RoboKids!`;
    }
    return `Con bạn ${studentName} vừa hoàn thành một bài học mới tại RoboKids!`;
  }

  /**
   * Generate unique execution ID
   */
  generateExecutionId() {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize payload to remove sensitive data
   */
  sanitizePayload(payload) {
    const sanitized = { ...payload };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.refreshToken;
    delete sanitized.apiKey;
    return sanitized;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit = 50) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get execution stats
   */
  getStats() {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(e => e.success).length;
    const failed = total - successful;
    const avgExecutionTime = total > 0
      ? this.executionHistory.reduce((sum, e) => sum + e.executionTime, 0) / total
      : 0;

    return {
      totalExecutions: total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(2) + '%' : '0%',
      avgExecutionTime: `${avgExecutionTime.toFixed(2)}ms`,
      registeredWorkflows: this.workflows.size,
    };
  }
}

// Export singleton instance
const workflowEngine = new WorkflowEngine();
export default workflowEngine;
export { WorkflowEngine };
