const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export interface SpaceReviewParams {
  lessonId: string;
  studentCode?: string;
  challengeResult: boolean;
  userId?: string;
  lessonGoal?: string;
  age?: number;
}

export interface SpaceReviewResult {
  passed: boolean;
  feedback: string;
  xpEarned: number;
  badgesToCheck: string[];
  model: string;
}

/**
 * POST /api/ai/space-review
 * AI tutor evaluates student's space mission attempt and returns
 * Vietnamese feedback, XP earned, and badges to check/award.
 */
export async function reviewSpaceMission(params: SpaceReviewParams): Promise<SpaceReviewResult> {
  const response = await fetch(`${API_BASE}/api/ai/space-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Space review failed: ${response.status}`);
  }

  return response.json();
}
