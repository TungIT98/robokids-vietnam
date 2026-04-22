/**
 * Learning Path API Routes for RoboKids Vietnam
 * AI-powered personalized learning path recommendations
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import {
  generateLearningPath,
  generateKnowledgeGapReport,
  generateWeeklyPlan,
  getStudentProgressData
} from '../services/learning-path.js';

const router = express.Router();

/**
 * GET /api/learning-path
 * Get personalized learning path recommendation for authenticated student
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const studentId = req.user.id;

    const result = await generateLearningPath(studentId);

    res.json(result);
  } catch (error) {
    console.error('Error generating learning path:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate learning path',
      message: error.message
    });
  }
});

/**
 * GET /api/learning-path/report
 * Get detailed knowledge gap analysis report
 */
router.get('/report', authenticate, async (req, res) => {
  try {
    const studentId = req.user.id;

    const report = await generateKnowledgeGapReport(studentId);

    res.json(report);
  } catch (error) {
    console.error('Error generating knowledge gap report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate knowledge gap report',
      message: error.message
    });
  }
});

/**
 * GET /api/learning-path/weekly
 * Get weekly learning plan
 */
router.get('/weekly', authenticate, async (req, res) => {
  try {
    const studentId = req.user.id;

    const weeklyPlan = await generateWeeklyPlan(studentId);

    res.json(weeklyPlan);
  } catch (error) {
    console.error('Error generating weekly plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate weekly plan',
      message: error.message
    });
  }
});

/**
 * GET /api/learning-path/progress
 * Get raw student progress data
 */
router.get('/progress', authenticate, async (req, res) => {
  try {
    const studentId = req.user.id;

    const progressData = await getStudentProgressData(studentId);

    res.json({
      success: true,
      ...progressData
    });
  } catch (error) {
    console.error('Error fetching progress data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress data',
      message: error.message
    });
  }
});

/**
 * GET /api/learning-path/:studentId (Admin/Teacher only)
 * Get learning path for a specific student
 */
router.get('/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check if user is admin or teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (!profile || !['admin', 'teacher'].includes(profile.role)) {
      // Check if it's the student's own data
      if (req.user.id !== studentId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to view other student progress'
        });
      }
    }

    const result = await generateLearningPath(studentId);

    res.json(result);
  } catch (error) {
    console.error('Error generating learning path:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate learning path',
      message: error.message
    });
  }
});

/**
 * GET /api/learning-path/:studentId/report (Admin/Teacher only)
 * Get knowledge gap report for a specific student
 */
router.get('/:studentId/report', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check authorization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (!profile || !['admin', 'teacher'].includes(profile.role)) {
      if (req.user.id !== studentId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to view other student progress'
        });
      }
    }

    const report = await generateKnowledgeGapReport(studentId);

    res.json(report);
  } catch (error) {
    console.error('Error generating knowledge gap report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate knowledge gap report',
      message: error.message
    });
  }
});

/**
 * POST /api/learning-path/refresh
 * Force refresh the learning path (invalidates cache)
 */
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const studentId = req.user.id;

    // Generate fresh learning path
    const result = await generateLearningPath(studentId);

    res.json({
      success: true,
      message: 'Learning path refreshed',
      ...result
    });
  } catch (error) {
    console.error('Error refreshing learning path:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh learning path',
      message: error.message
    });
  }
});

export default router;
