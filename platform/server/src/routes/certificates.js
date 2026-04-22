/**
 * Certificate API routes for RoboKids Vietnam
 * Handles PDF certificate generation, download, and verification
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import {
  generateLessonCertificate,
  generateCourseCertificate,
  verifyCertificate,
  getUserCertificates,
  CERTIFICATE_TYPES,
  AGE_GROUP_CERTIFICATES
} from '../services/certificate.js';

const router = express.Router();

/**
 * GET /api/certificates
 * Get all certificates for the authenticated user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const certificates = await getUserCertificates(userId);

    res.json({
      certificates,
      total: certificates.length
    });
  } catch (err) {
    console.error('Error fetching certificates:', err);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

/**
 * GET /api/certificates/:id
 * Get a specific certificate by certificate ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: certificate, error } = await supabase
      .from('certificates')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .eq('certificate_id', id)
      .single();

    if (error || !certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({
      certificateId: certificate.certificate_id,
      studentName: certificate.profiles?.full_name,
      certificateType: certificate.certificate_type,
      courseName: certificate.course_name,
      lessonId: certificate.lesson_id,
      pdfUrl: certificate.pdf_url,
      issuedAt: certificate.issued_at
    });
  } catch (err) {
    console.error('Error fetching certificate:', err);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

/**
 * POST /api/certificates/generate/lesson
 * Generate a lesson completion certificate
 * Body: { lessonId: string }
 */
router.post('/generate/lesson', authenticate, async (req, res) => {
  try {
    const { lessonId } = req.body;
    const userId = req.user.id;

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }

    // Get user's profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (!profile?.full_name) {
      return res.status(400).json({ error: 'User profile not found. Please update your name first.' });
    }

    const certificate = await generateLessonCertificate(
      userId,
      lessonId,
      profile.full_name
    );

    res.status(201).json({
      message: 'Certificate generated successfully',
      certificate
    });
  } catch (err) {
    console.error('Error generating lesson certificate:', err);
    res.status(500).json({ error: err.message || 'Failed to generate certificate' });
  }
});

/**
 * POST /api/certificates/generate/course
 * Generate a course completion certificate
 * Body: { courseLevel: 'beginner' | 'intermediate' | 'advanced' }
 */
router.post('/generate/course', authenticate, async (req, res) => {
  try {
    const { courseLevel } = req.body;
    const userId = req.user.id;

    if (!courseLevel || !AGE_GROUP_CERTIFICATES[courseLevel]) {
      return res.status(400).json({
        error: 'Invalid courseLevel. Must be: beginner, intermediate, or advanced'
      });
    }

    // Get user's profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (!profile?.full_name) {
      return res.status(400).json({ error: 'User profile not found. Please update your name first.' });
    }

    // Verify user has completed required lessons for the course
    const { data: student } = await supabase
      .from('students')
      .select('grade_level')
      .eq('profile_id', userId)
      .single();

    // Check if student's age group matches the certificate level
    if (student?.grade_level) {
      let studentLevel;
      if (student.grade_level >= 1 && student.grade_level <= 3) {
        studentLevel = 'beginner';
      } else if (student.grade_level >= 4 && student.grade_level <= 6) {
        studentLevel = 'intermediate';
      } else {
        studentLevel = 'advanced';
      }

      if (studentLevel !== courseLevel) {
        return res.status(403).json({
          error: `You are registered as ${studentLevel} level. You can only generate ${studentLevel} certificates.`
        });
      }
    }

    const certificate = await generateCourseCertificate(
      userId,
      courseLevel,
      profile.full_name
    );

    res.status(201).json({
      message: 'Certificate generated successfully',
      certificate
    });
  } catch (err) {
    console.error('Error generating course certificate:', err);
    res.status(500).json({ error: err.message || 'Failed to generate certificate' });
  }
});

/**
 * GET /api/certificates/:id/download
 * Download a certificate PDF
 */
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: certificate, error } = await supabase
      .from('certificates')
      .select('pdf_url, certificate_id')
      .eq('certificate_id', id)
      .single();

    if (error || !certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Redirect to Supabase Storage URL
    if (certificate.pdf_url) {
      return res.redirect(302, certificate.pdf_url);
    }

    res.status(404).json({ error: 'PDF file not found' });
  } catch (err) {
    console.error('Error downloading certificate:', err);
    res.status(500).json({ error: 'Failed to download certificate' });
  }
});

/**
 * GET /api/certificates/verify/:id
 * Verify a certificate by its ID (public endpoint)
 */
router.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await verifyCertificate(id);

    if (!result.valid) {
      return res.status(404).json({
        valid: false,
        error: result.error
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Error verifying certificate:', err);
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
});

/**
 * GET /api/certificates/types
 * Get available certificate types (public endpoint)
 */
router.get('/info/types', (req, res) => {
  res.json({
    types: [
      {
        type: CERTIFICATE_TYPES.LESSON,
        name: 'Lesson Completion Certificate',
        nameVi: 'Chứng chỉ hoàn thành bài học',
        description: 'Awarded upon completing a single lesson'
      },
      {
        type: CERTIFICATE_TYPES.BEGINNER_COURSE,
        name: 'Beginner Course Certificate',
        nameVi: 'Chứng chỉ Robot cơ bản',
        description: 'Awarded for completing the beginner robotics course (ages 6-8)',
        ageRange: '6-8'
      },
      {
        type: CERTIFICATE_TYPES.INTERMEDIATE_COURSE,
        name: 'Intermediate Course Certificate',
        nameVi: 'Chứng chỉ Robot trung cấp',
        description: 'Awarded for completing the intermediate robotics course (ages 9-12)',
        ageRange: '9-12'
      },
      {
        type: CERTIFICATE_TYPES.ADVANCED_COURSE,
        name: 'Advanced Course Certificate',
        nameVi: 'Chứng chỉ Robot nâng cao',
        description: 'Awarded for completing the advanced robotics course (ages 13-16)',
        ageRange: '13-16'
      }
    ]
  });
});

export default router;