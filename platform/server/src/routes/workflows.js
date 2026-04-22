/**
 * Workflow Management API Routes for RoboKids Vietnam
 * AI Workflow automation using Composio + Windmill
 */

import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import workflowEngine, { WorkflowEventType, WorkflowActionType } from '../services/workflowEngine.js';

const router = express.Router();

/**
 * GET /api/workflows
 * Get all registered workflows
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const workflows = workflowEngine.getAllWorkflows();
    res.json({ workflows });
  } catch (err) {
    console.error('Error fetching workflows:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workflows/stats
 * Get workflow execution statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = workflowEngine.getStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching workflow stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workflows/history
 * Get workflow execution history
 * Query params:
 *   limit - max entries (default 50, max 200)
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const history = workflowEngine.getExecutionHistory(limit);
    res.json({ history, count: history.length });
  } catch (err) {
    console.error('Error fetching workflow history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workflows/:eventType
 * Get workflow definition for a specific event type
 */
router.get('/:eventType', authenticate, async (req, res) => {
  try {
    const { eventType } = req.params;
    const workflow = workflowEngine.getWorkflow(eventType);

    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `No workflow registered for event type: ${eventType}`,
        availableTypes: Object.keys(WorkflowEventType),
      });
    }

    res.json({ eventType, workflow });
  } catch (err) {
    console.error('Error fetching workflow:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/workflows/:eventType/trigger
 * Manually trigger a workflow for testing
 * Body: { userId, ...additionalPayload }
 */
router.post('/:eventType/trigger', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { eventType } = req.params;
    const payload = req.body;

    if (!payload.userId) {
      return res.status(400).json({ error: 'userId is required in payload' });
    }

    // Validate event type
    if (!Object.values(WorkflowEventType).includes(eventType)) {
      return res.status(400).json({
        error: 'Invalid event type',
        message: `Event type must be one of: ${Object.values(WorkflowEventType).join(', ')}`,
      });
    }

    console.log(`[WorkflowRoutes] Manual trigger for ${eventType} by user ${req.user.id}`);

    const result = await workflowEngine.emit(eventType, payload);

    res.json({
      success: true,
      eventType,
      executionId: result.executionId,
      executionTime: result.executionTime,
      success: result.success,
      results: result.results,
    });
  } catch (err) {
    console.error('Error triggering workflow:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/workflows/lesson-complete
 * Trigger lesson completion workflow
 * Body: { userId, lessonId, lessonSlug, xpEarned }
 */
router.post('/lesson-complete', authenticate, async (req, res) => {
  try {
    const { userId, lessonId, lessonSlug, xpEarned, timeSpentSeconds } = req.body;

    if (!userId || !lessonId) {
      return res.status(400).json({ error: 'userId and lessonId are required' });
    }

    const payload = {
      userId,
      lessonId,
      lessonSlug,
      xpEarned: xpEarned || 10,
      timeSpentSeconds,
      completedAt: new Date().toISOString(),
    };

    const result = await workflowEngine.emit(WorkflowEventType.LESSON_COMPLETE, payload);

    res.json({
      success: true,
      workflowExecuted: result.executed !== false,
      executionId: result.executionId,
      results: result.results,
    });
  } catch (err) {
    console.error('Error in lesson-complete workflow:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/workflows/mission-complete
 * Trigger mission completion workflow
 * Body: { userId, missionId, xpEarned }
 */
router.post('/mission-complete', authenticate, async (req, res) => {
  try {
    const { userId, missionId, missionName, xpEarned } = req.body;

    if (!userId || !missionId) {
      return res.status(400).json({ error: 'userId and missionId are required' });
    }

    const payload = {
      userId,
      missionId,
      missionName,
      xpEarned: xpEarned || 25,
      completedAt: new Date().toISOString(),
    };

    const result = await workflowEngine.emit(WorkflowEventType.MISSION_COMPLETE, payload);

    res.json({
      success: true,
      workflowExecuted: result.executed !== false,
      executionId: result.executionId,
      results: result.results,
    });
  } catch (err) {
    console.error('Error in mission-complete workflow:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workflows/event-types
 * Get all available event types
 */
router.get('/meta/event-types', authenticate, async (req, res) => {
  res.json({
    eventTypes: Object.entries(WorkflowEventType).map(([key, value]) => ({
      key,
      value,
      description: getEventTypeDescription(value),
    })),
  });
});

/**
 * GET /api/workflows/action-types
 * Get all available action types
 */
router.get('/meta/action-types', authenticate, async (req, res) => {
  res.json({
    actionTypes: Object.entries(WorkflowActionType).map(([key, value]) => ({
      key,
      value,
      description: getActionTypeDescription(value),
    })),
  });
});

/**
 * Get human-readable description for event type
 */
function getEventTypeDescription(eventType) {
  const descriptions = {
    [WorkflowEventType.LESSON_COMPLETE]: 'Triggered when a student completes a lesson',
    [WorkflowEventType.MISSION_COMPLETE]: 'Triggered when a student completes a mission/challenge',
    [WorkflowEventType.STREAK_MILESTONE]: 'Triggered when student reaches streak milestone (7, 30, 100 days)',
    [WorkflowEventType.BADGE_EARNED]: 'Triggered when student earns a new badge',
    [WorkflowEventType.LEVEL_UP]: 'Triggered when student reaches new level',
    [WorkflowEventType.XP_MILESTONE]: 'Triggered when student reaches XP milestone (500, 1000, etc.)',
  };
  return descriptions[eventType] || 'No description available';
}

/**
 * Get human-readable description for action type
 */
function getActionTypeDescription(actionType) {
  const descriptions = {
    [WorkflowActionType.UPDATE_XP]: 'Update user XP points in database',
    [WorkflowActionType.CHECK_BADGES]: 'Check and award eligible badges',
    [WorkflowActionType.CHECK_ACHIEVEMENTS]: 'Check for achievement milestones',
    [WorkflowActionType.SEND_NOTIFICATION]: 'Send in-app notification to user',
    [WorkflowActionType.SEND_PARENT_NOTIFICATION]: 'Send notification to parent via Zalo/Gmail',
    [WorkflowActionType.WINDMILL_TRIGGER]: 'Trigger Windmill script for complex processing',
    [WorkflowActionType.COMPOSIO_ACTION]: 'Execute Composio action (Gmail, Zalo, etc.)',
  };
  return descriptions[actionType] || 'No description available';
}

export default router;
