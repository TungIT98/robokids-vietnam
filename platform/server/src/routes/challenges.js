/**
 * Challenges API routes for RoboKids Vietnam
 * Competitive coding challenge arena with leaderboards
 *
 * Database schema:
 * - challenges: id, slug, title, title_vi, title_en, description, description_vi, description_en,
 *              difficulty (easy/medium/hard), time_limit_seconds, xp_reward, blockly_xml_template,
 *              test_cases (JSONB), is_active, min_age_group, max_age_group, order_index, created_at
 * - challenge_submissions: id, challenge_id, student_id, submitted_xml, test_results (JSONB),
 *                          test_cases_passed, test_cases_total, score, started_at, submitted_at,
 *                          time_taken_seconds, status, completed_at, created_at
 */

import express from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * Calculate time bonus multiplier based on completion speed
 * Max 1.5x if under 25% of time limit
 */
function calculateTimeBonus(timeTaken, timeLimit) {
  if (!timeTaken || timeLimit <= 0) return 1.0;
  const ratio = timeTaken / timeLimit;
  if (ratio <= 0.25) return 1.5;
  if (ratio <= 0.50) return 1.3;
  if (ratio <= 0.75) return 1.1;
  return 1.0;
}

/**
 * Calculate final score and XP
 */
function calculateScore(testCasesPassed, testCasesTotal, baseXp, timeTaken, timeLimit) {
  if (testCasesTotal === 0) return { score: 0, xpEarned: 0 };

  const passRatio = testCasesPassed / testCasesTotal;
  const timeBonus = calculateTimeBonus(timeTaken, timeLimit);
  const score = passRatio * 100; // Score as percentage
  const xpEarned = Math.floor(baseXp * passRatio * timeBonus);

  return { score, xpEarned, timeBonus };
}

/**
 * GET /api/challenges
 * List available challenges with optional filters (difficulty, active)
 * Query params: difficulty, active, limit, offset
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { difficulty, active, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('challenges')
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    // Filter by difficulty
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    // Filter by active status (default: true)
    if (active !== undefined) {
      query = query.eq('is_active', active === 'true');
    } else {
      query = query.eq('is_active', true);
    }

    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: challenges, error, count } = await query
      .then(({ data, count, error }) => ({ data, count, error }));

    if (error) throw error;

    res.json({
      challenges: challenges.map(c => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        titleVi: c.title_vi,
        titleEn: c.title_en,
        description: c.description,
        descriptionVi: c.description_vi,
        descriptionEn: c.description_en,
        difficulty: c.difficulty,
        timeLimitSeconds: c.time_limit_seconds,
        xpReward: c.xp_reward,
        testCasesCount: Array.isArray(c.test_cases) ? c.test_cases.length : 0,
        isActive: c.is_active,
        minAgeGroup: c.min_age_group,
        maxAgeGroup: c.max_age_group,
        orderIndex: c.order_index,
        createdAt: c.created_at,
      })),
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (count || 0) > parseInt(offset) + parseInt(limit),
      },
    });
  } catch (err) {
    console.error('Error fetching challenges:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/challenges/leaderboard
 * Get challenge leaderboard - sorted by score, then by time
 * Query params: challengeId (optional - if not provided, gets overall), limit
 */
router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { challengeId, limit = 20 } = req.query;

    if (challengeId) {
      // Get leaderboard for specific challenge using the view
      const { data: leaderboard, error } = await supabase
        .from('challenge_leaderboard')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('rank', { ascending: true })
        .limit(parseInt(limit));

      if (error) throw error;

      return res.json({
        challengeId,
        leaderboard: leaderboard.map(entry => ({
          rank: entry.rank,
          studentId: entry.student_id,
          score: entry.score,
          testCasesPassed: entry.test_cases_passed,
          testCasesTotal: entry.test_cases_total,
          timeTakenSeconds: entry.time_taken_seconds,
          timeBonus: entry.time_multiplier,
          finalXp: entry.final_xp,
          completedAt: entry.completed_at,
        })),
      });
    } else {
      // Get top students overall by total XP from challenges
      const { data: submissions, error } = await supabase
        .from('challenge_submissions')
        .select(`
          student_id,
          score,
          test_cases_passed,
          test_cases_total,
          time_taken_seconds,
          challenges(xp_reward)
        `)
        .eq('status', 'completed');

      if (error) throw error;

      // Aggregate by student
      const studentMap = new Map();
      submissions.forEach(sub => {
        if (!studentMap.has(sub.student_id)) {
          studentMap.set(sub.student_id, {
            studentId: sub.student_id,
            totalScore: 0,
            totalXp: 0,
            challengesCompleted: 0,
          });
        }
        const s = studentMap.get(sub.student_id);
        s.totalScore += sub.score || 0;
        const xpFromChallenge = sub.challenges?.xp_reward || 0;
        s.totalXp += xpFromChallenge;
        s.challengesCompleted++;
      });

      const sortedLeaderboard = Array.from(studentMap.values())
        .sort((a, b) => b.totalXp - a.totalXp)
        .slice(0, parseInt(limit))
        .map((entry, idx) => ({
          rank: idx + 1,
          ...entry,
        }));

      return res.json({ leaderboard: sortedLeaderboard });
    }
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/challenges/:id
 * Get specific challenge details
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by id first, then by slug
    let query = supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();

    let { data: challenge, error } = await query;

    if (error && error.code === 'PGRST116') {
      // Try slug lookup
      const slugResult = await supabase
        .from('challenges')
        .select('*')
        .eq('slug', id)
        .single();

      if (slugResult.error) {
        return res.status(404).json({ error: 'Challenge not found' });
      }
      challenge = slugResult.data;
    } else if (error) {
      throw error;
    }

    // Check if user has any submissions
    let userSubmissions = [];
    if (req.user) {
      const { data: submissions } = await supabase
        .from('challenge_submissions')
        .select('*')
        .eq('challenge_id', challenge.id)
        .eq('student_id', req.user.id)
        .order('created_at', { ascending: false });

      userSubmissions = submissions || [];
    }

    // Get leaderboard for this challenge
    const { data: leaderboard } = await supabase
      .from('challenge_leaderboard')
      .select('*')
      .eq('challenge_id', challenge.id)
      .order('rank', { ascending: true })
      .limit(10);

    res.json({
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      titleVi: challenge.title_vi,
      titleEn: challenge.title_en,
      description: challenge.description,
      descriptionVi: challenge.description_vi,
      descriptionEn: challenge.description_en,
      difficulty: challenge.difficulty,
      timeLimitSeconds: challenge.time_limit_seconds,
      xpReward: challenge.xp_reward,
      blocklyXmlTemplate: challenge.blockly_xml_template,
      testCases: challenge.test_cases,
      isActive: challenge.is_active,
      minAgeGroup: challenge.min_age_group,
      maxAgeGroup: challenge.max_age_group,
      orderIndex: challenge.order_index,
      createdAt: challenge.created_at,
      userSubmissions: userSubmissions.map(s => ({
        id: s.id,
        score: s.score,
        testCasesPassed: s.test_cases_passed,
        testCasesTotal: s.test_cases_total,
        timeTakenSeconds: s.time_taken_seconds,
        status: s.status,
        startedAt: s.started_at,
        submittedAt: s.submitted_at,
        completedAt: s.completed_at,
      })),
      leaderboard: leaderboard?.map(entry => ({
        rank: entry.rank,
        studentId: entry.student_id,
        score: entry.score,
        timeTakenSeconds: entry.time_taken_seconds,
        completedAt: entry.completed_at,
      })) || [],
    });
  } catch (err) {
    console.error('Error fetching challenge:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/challenges/:id/start
 * Start a challenge attempt
 * Creates a new challenge_submission record with status 'in_progress'
 */
router.post('/:id/start', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    // Find challenge (by id or slug)
    let query = supabase
      .from('challenges')
      .select('id, time_limit_seconds, is_active')
      .eq('id', id)
      .single();

    let { data: challenge, error: challengeError } = await query;

    if (challengeError && challengeError.code === 'PGRST116') {
      const slugResult = await supabase
        .from('challenges')
        .select('id, time_limit_seconds, is_active')
        .eq('slug', id)
        .single();

      if (slugResult.error) {
        return res.status(404).json({ error: 'Challenge not found' });
      }
      challenge = slugResult.data;
    } else if (challengeError) {
      throw challengeError;
    }

    if (!challenge.is_active) {
      return res.status(400).json({ error: 'Challenge is not active' });
    }

    // Check for existing in-progress submission
    const { data: existingSubmission } = await supabase
      .from('challenge_submissions')
      .select('*')
      .eq('challenge_id', challenge.id)
      .eq('student_id', studentId)
      .eq('status', 'in_progress')
      .single();

    if (existingSubmission) {
      return res.json({
        submission: {
          id: existingSubmission.id,
          challengeId: existingSubmission.challenge_id,
          score: existingSubmission.score,
          testCasesPassed: existingSubmission.test_cases_passed,
          testCasesTotal: existingSubmission.test_cases_total,
          status: existingSubmission.status,
          startedAt: existingSubmission.started_at,
          timeLimitSeconds: challenge.time_limit_seconds,
        },
        isResumed: true,
        message: 'Resuming your previous attempt',
      });
    }

    // Create new submission
    const { data: submission, error: insertError } = await supabase
      .from('challenge_submissions')
      .insert({
        challenge_id: challenge.id,
        student_id: studentId,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        test_cases_passed: 0,
        test_cases_total: 0,
        score: 0,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({
      submission: {
        id: submission.id,
        challengeId: submission.challenge_id,
        score: submission.score,
        testCasesPassed: submission.test_cases_passed,
        testCasesTotal: submission.test_cases_total,
        status: submission.status,
        startedAt: submission.started_at,
        timeLimitSeconds: challenge.time_limit_seconds,
      },
      isResumed: false,
      message: 'Challenge started! Good luck!',
    });
  } catch (err) {
    console.error('Error starting challenge:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/challenges/:id/submit
 * Submit challenge solution - evaluate test cases and calculate score
 * Body: { submission_id, submitted_xml, test_results }
 * test_results format: [{ "test_case_id": "1", "passed": true, "output": "..." }]
 */
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { submission_id, submitted_xml, test_results } = req.body;
    const studentId = req.user.id;

    // Get challenge (by id or slug)
    let query = supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();

    let { data: challenge, error: challengeError } = await query;

    if (challengeError && challengeError.code === 'PGRST116') {
      const slugResult = await supabase
        .from('challenges')
        .select('*')
        .eq('slug', id)
        .single();

      if (slugResult.error) {
        return res.status(404).json({ error: 'Challenge not found' });
      }
      challenge = slugResult.data;
    } else if (challengeError) {
      throw challengeError;
    }

    // Get the submission
    const { data: submission, error: submissionError } = await supabase
      .from('challenge_submissions')
      .select('*')
      .eq('id', submission_id)
      .eq('student_id', studentId)
      .single();

    if (submissionError) {
      return res.status(404).json({ error: 'Submission not found or unauthorized' });
    }

    if (submission.challenge_id !== challenge.id) {
      return res.status(400).json({ error: 'Submission does not belong to this challenge' });
    }

    if (submission.status === 'completed') {
      return res.status(400).json({ error: 'Challenge already completed' });
    }

    if (submission.status === 'expired') {
      return res.status(400).json({ error: 'Challenge submission has expired' });
    }

    // Calculate time taken
    const startedAt = new Date(submission.started_at);
    const submittedAt = new Date();
    const timeTakenSeconds = Math.floor((submittedAt - startedAt) / 1000);

    // Check for expiration based on time limit
    if (timeTakenSeconds > challenge.time_limit_seconds) {
      // Mark as expired
      await supabase
        .from('challenge_submissions')
        .update({ status: 'expired' })
        .eq('id', submission_id);

      return res.status(400).json({
        error: 'Time limit exceeded',
        timeTaken: timeTakenSeconds,
        timeLimit: challenge.time_limit_seconds,
      });
    }

    // Evaluate test results if provided
    let testCasesPassed = 0;
    let testCasesTotal = Array.isArray(challenge.test_cases) ? challenge.test_cases.length : 0;

    if (test_results && Array.isArray(test_results)) {
      test_results.forEach(result => {
        if (result.passed) testCasesPassed++;
      });
    }

    // Calculate score and XP
    const { score, xpEarned, timeBonus } = calculateScore(
      testCasesPassed,
      testCasesTotal,
      challenge.xp_reward,
      timeTakenSeconds,
      challenge.time_limit_seconds
    );

    // Determine if completed (passed all test cases)
    const isCompleted = testCasesPassed === testCasesTotal && testCasesTotal > 0;

    // Update submission
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('challenge_submissions')
      .update({
        submitted_xml,
        test_results: test_results || [],
        test_cases_passed: testCasesPassed,
        test_cases_total: testCasesTotal,
        score,
        submitted_at: submittedAt.toISOString(),
        time_taken_seconds: timeTakenSeconds,
        status: isCompleted ? 'completed' : 'in_progress',
        completed_at: isCompleted ? submittedAt.toISOString() : null,
      })
      .eq('id', submission_id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      submission: {
        id: updatedSubmission.id,
        challengeId: updatedSubmission.challenge_id,
        score: updatedSubmission.score,
        testCasesPassed: updatedSubmission.test_cases_passed,
        testCasesTotal: updatedSubmission.test_cases_total,
        timeTakenSeconds: updatedSubmission.time_taken_seconds,
        timeBonus,
        status: updatedSubmission.status,
        startedAt: updatedSubmission.started_at,
        submittedAt: updatedSubmission.submitted_at,
        completedAt: updatedSubmission.completed_at,
      },
      xpEarned,
      isCompleted,
      message: isCompleted
        ? `Congratulations! You completed the challenge and earned ${xpEarned} XP!`
        : `Progress saved! ${testCasesPassed}/${testCasesTotal} tests passed. Keep going!`,
    });
  } catch (err) {
    console.error('Error submitting challenge:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/challenges/:id/submissions
 * Get user's submissions for a specific challenge
 */
router.get('/:id/submissions', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    // Find challenge (by id or slug)
    let query = supabase
      .from('challenges')
      .select('id')
      .eq('id', id)
      .single();

    let { data: challenge, error: challengeError } = await query;

    if (challengeError && challengeError.code === 'PGRST116') {
      const slugResult = await supabase
        .from('challenges')
        .select('id')
        .eq('slug', id)
        .single();

      if (slugResult.error) {
        return res.status(404).json({ error: 'Challenge not found' });
      }
      challenge = slugResult.data;
    } else if (challengeError) {
      throw challengeError;
    }

    const { data: submissions, error } = await supabase
      .from('challenge_submissions')
      .select('*')
      .eq('challenge_id', challenge.id)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      submissions: submissions.map(s => ({
        id: s.id,
        challengeId: s.challenge_id,
        score: s.score,
        testCasesPassed: s.test_cases_passed,
        testCasesTotal: s.test_cases_total,
        timeTakenSeconds: s.time_taken_seconds,
        status: s.status,
        startedAt: s.started_at,
        submittedAt: s.submitted_at,
        completedAt: s.completed_at,
        createdAt: s.created_at,
      })),
    });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/challenges/:id/test-cases
 * Get test cases for a challenge (for evaluation)
 * Requires authentication
 */
router.get('/:id/test-cases', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Find challenge (by id or slug)
    let query = supabase
      .from('challenges')
      .select('id, test_cases')
      .eq('id', id)
      .single();

    let { data: challenge, error } = await query;

    if (error && error.code === 'PGRST116') {
      const slugResult = await supabase
        .from('challenges')
        .select('id, test_cases')
        .eq('slug', id)
        .single();

      if (slugResult.error) {
        return res.status(404).json({ error: 'Challenge not found' });
      }
      challenge = slugResult.data;
    } else if (error) {
      throw error;
    }

    res.json({
      testCases: challenge.test_cases || [],
    });
  } catch (err) {
    console.error('Error fetching test cases:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;