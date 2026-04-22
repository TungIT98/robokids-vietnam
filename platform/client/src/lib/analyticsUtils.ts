import { posthog } from 'posthog-js';

/**
 * Analytics tracking utilities for RoboKids platform
 * Used to track user interactions, button misclicks, and UI confusion points
 */

// Track blockly editor interactions
export function trackBlockUsed(blockType: string, blockName: string) {
  posthog.capture('blockly_block_used', {
    block_type: blockType,
    block_name: blockName,
  });
}

// Track button clicks with potential misclick detection
export function trackButtonClick(buttonId: string, buttonLabel: string, context: string) {
  posthog.capture('button_click', {
    button_id: buttonId,
    button_label: buttonLabel,
    context,
  });
}

// Track simulation start/stop
export function trackSimulation(action: 'start' | 'stop', mode: 'virtual' | 'hardware') {
  posthog.capture('simulation_' + action, {
    mode,
  });
}

// Track multiplayer game events
export function trackGameEvent(event: string, gameType: string, metadata?: Record<string, unknown>) {
  posthog.capture('game_event', {
    event,
    game_type: gameType,
    ...metadata,
  });
}

// Track user confusion points (delayed clicks, rapid clicks on same area)
export function trackConfusionPoint(elementId: string, confusionType: 'misclick' | 'hesitation' | 'repeated_click', duration?: number) {
  posthog.capture('ui_confusion', {
    element_id: elementId,
    confusion_type: confusionType,
    duration_ms: duration,
  });
}

// Track page navigation with timing
export function trackPageView(pageName: string, referrer?: string) {
  posthog.capture('$pageview', {
    page_name: pageName,
    referrer,
  });
}

// Track lesson/com curriculum progress
export function trackLessonProgress(lessonId: string, progressPercent: number) {
  posthog.capture('lesson_progress', {
    lesson_id: lessonId,
    progress_percent: progressPercent,
  });
}

// Track challenge completion
export function trackChallengeCompleted(challengeId: string, score?: number) {
  posthog.capture('challenge_completed', {
    challenge_id: challengeId,
    score,
  });
}

// Track error events with context
export function trackError(errorType: string, errorMessage: string, context?: Record<string, unknown>) {
  posthog.capture('error', {
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  });
}
