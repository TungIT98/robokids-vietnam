/**
 * Missions API routes for RoboKids Vietnam
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/missions
 * List available mission templates (public)
 */
router.get('/', async (req, res) => {
  try {
    const { age_group, mission_type } = req.query;

    let query = supabase
      .from('mission_templates')
      .select('*')
      .eq('is_active', true);

    if (age_group) {
      query = query.contains('age_group_filter', [age_group]);
    }

    if (mission_type) {
      query = query.eq('mission_type', mission_type);
    }

    const { data: missions, error } = await query;

    if (error) throw error;

    res.json(missions.map(m => ({
      id: m.id,
      slug: m.slug,
      type: m.mission_type,
      title: m.title_vi,
      titleVi: m.title_vi,
      titleEn: m.title_en,
      descriptionVi: m.description_vi,
      descriptionEn: m.description_en,
      requiredLessons: m.required_lessons,
      requiredLessonCount: m.required_lesson_count,
      requiredXp: m.required_xp,
      requiredStreakDays: m.required_streak_days,
      xpReward: m.xp_reward,
      badgeReward: m.badge_reward,
      iconEmoji: m.icon_emoji,
      colorHex: m.color_hex,
      ageGroupFilter: m.age_group_filter,
      isActive: m.is_active
    })));
  } catch (err) {
    console.error('Error fetching missions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/missions/daily
 * Get today's daily missions for a user (requires auth)
 */
router.get('/daily', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get daily mission templates
    const { data: templates, error: templatesError } = await supabase
      .from('mission_templates')
      .select('*')
      .eq('mission_type', 'daily')
      .eq('is_active', true);

    if (templatesError) throw templatesError;

    // Get user's progress on these missions
    const templateIds = templates.map(t => t.id);
    const today = new Date().toISOString().split('T')[0];

    const { data: userMissions, error: userMissionsError } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', userId)
      .in('mission_template_id', templateIds)
      .gte('started_at', today);

    if (userMissionsError) throw userMissionsError;

    // Initialize missions for user if they don't have today's
    const existingTemplateIds = userMissions.map(um => um.mission_template_id);
    const missingTemplates = templates.filter(t => !existingTemplateIds.includes(t.id));

    if (missingTemplates.length > 0) {
      const inserts = missingTemplates.map(t => ({
        user_id: userId,
        mission_template_id: t.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));

      await supabase.from('user_missions').insert(inserts);
    }

    // Re-fetch user missions after initialization
    const { data: allUserMissions } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', userId)
      .in('mission_template_id', templateIds)
      .gte('started_at', today);

    // Combine templates with user progress
    const result = templates.map(t => {
      const userMission = allUserMissions?.find(um => um.mission_template_id === t.id);
      return {
        id: t.id,
        slug: t.slug,
        type: t.mission_type,
        title: t.title_vi,
        titleVi: t.title_vi,
        titleEn: t.title_en,
        descriptionVi: t.description_vi,
        descriptionEn: t.description_en,
        requiredLessonCount: t.required_lesson_count,
        xpReward: t.xp_reward,
        badgeReward: t.badge_reward,
        iconEmoji: t.icon_emoji,
        colorHex: t.color_hex,
        userProgress: userMission ? {
          status: userMission.status,
          progressPercent: userMission.progress_percent,
          lessonsCompleted: userMission.lessons_completed,
          xpEarned: userMission.xp_earned,
          startedAt: userMission.started_at,
          completedAt: userMission.completed_at
        } : null
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching daily missions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/missions/:id
 * Get specific mission template by ID or slug
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try UUID first, then slug
    let query = supabase
      .from('mission_templates')
      .select('*')
      .eq('is_active', true);

    if (id.includes('-') && id.length === 36) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: mission, error } = await query.single();

    if (error || !mission) {
      return res.status(404).json({ error: 'Mission not found', id });
    }

    res.json({
      id: mission.id,
      slug: mission.slug,
      type: mission.mission_type,
      title: mission.title_vi,
      titleVi: mission.title_vi,
      titleEn: mission.title_en,
      descriptionVi: mission.description_vi,
      descriptionEn: mission.description_en,
      requiredLessons: mission.required_lessons,
      requiredLessonCount: mission.required_lesson_count,
      requiredXp: mission.required_xp,
      requiredStreakDays: mission.required_streak_days,
      xpReward: mission.xp_reward,
      badgeReward: mission.badge_reward,
      iconEmoji: mission.icon_emoji,
      colorHex: mission.color_hex,
      ageGroupFilter: mission.age_group_filter,
      isActive: mission.is_active
    });
  } catch (err) {
    console.error('Error fetching mission:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/missions/:id/submit
 * Submit/complete a mission (requires auth)
 */
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find mission template
    let query = supabase
      .from('mission_templates')
      .select('*')
      .eq('is_active', true);

    if (id.includes('-') && id.length === 36) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: template, error: templateError } = await query.single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Get or create user mission
    const { data: existingMission } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('mission_template_id', template.id)
      .eq('status', 'active')
      .single();

    let userMission = existingMission;

    if (!userMission) {
      // Create new user mission
      const { data: newMission, error: createError } = await supabase
        .from('user_missions')
        .insert({
          user_id: userId,
          mission_template_id: template.id,
          expires_at: template.mission_type === 'daily'
            ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            : null
        })
        .select()
        .single();

      if (createError) throw createError;
      userMission = newMission;
    }

    // Check mission requirements
    let lessonsCompletedCount = 0;
    if (template.required_lesson_count > 0 || template.required_lessons?.length > 0) {
      // Get user's completed lessons
      const { data: completedProgress } = await supabase
        .from('lesson_progress')
        .select('lesson_id, lessons(slug)')
        .eq('user_id', userId)
        .eq('completed', true);

      lessonsCompletedCount = completedProgress?.length || 0;

      // Check specific required lessons
      const completedSlugs = completedProgress
        ?.filter(p => p.lessons?.slug)
        .map(p => p.lessons.slug) || [];

      const hasRequiredLessons = template.required_lessons?.every(
        slug => completedSlugs.includes(slug)
      ) ?? true;

      if (!hasRequiredLessons) {
        return res.status(400).json({
          error: 'Required lessons not completed',
          requiredLessons: template.required_lessons,
          completedLessons: completedSlugs
        });
      }
    }

    // Check XP requirement
    if (template.required_xp > 0) {
      const { data: progress } = await supabase
        .from('user_progress')
        .select('total_xp')
        .eq('user_id', userId)
        .single();

      if (!progress || progress.total_xp < template.required_xp) {
        return res.status(400).json({
          error: 'XP requirement not met',
          requiredXp: template.required_xp,
          currentXp: progress?.total_xp || 0
        });
      }
    }

    // Mark mission as complete
    const { data: updatedMission, error: updateError } = await supabase
      .from('user_missions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_percent: 100,
        xp_earned: template.xp_reward
      })
      .eq('id', userMission.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Award XP to user
    if (template.xp_reward > 0) {
      const { data: currentProgress } = await supabase
        .from('user_progress')
        .select('total_xp')
        .eq('user_id', userId)
        .single();

      await supabase
        .from('user_progress')
        .update({
          total_xp: (currentProgress?.total_xp || 0) + template.xp_reward
        })
        .eq('user_id', userId);
    }

    // Award badge if applicable
    if (template.badge_reward) {
      const { data: currentProgress } = await supabase
        .from('user_progress')
        .select('badges_earned')
        .eq('user_id', userId)
        .single();

      const currentBadges = currentProgress?.badges_earned || [];
      if (!currentBadges.includes(template.badge_reward)) {
        await supabase
          .from('user_progress')
          .update({
            badges_earned: [...currentBadges, template.badge_reward]
          })
          .eq('user_id', userId);
      }
    }

    res.json({
      success: true,
      mission: {
        id: template.id,
        slug: template.slug,
        title: template.title_vi,
        status: 'completed',
        completedAt: updatedMission.completed_at,
        xpEarned: template.xp_reward,
        badgeEarned: template.badge_reward
      }
    });
  } catch (err) {
    console.error('Error submitting mission:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/missions/user/active
 * Get all active missions for current user (requires auth)
 */
router.get('/user/active', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: userMissions, error } = await supabase
      .from('user_missions')
      .select(`
        *,
        mission_templates(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    res.json(userMissions.map(um => ({
      id: um.id,
      templateId: um.mission_template_id,
      template: um.mission_templates ? {
        slug: um.mission_templates.slug,
        type: um.mission_templates.mission_type,
        title: um.mission_templates.title_vi,
        titleVi: um.mission_templates.title_vi,
        descriptionVi: um.mission_templates.description_vi,
        xpReward: um.mission_templates.xp_reward,
        badgeReward: um.mission_templates.badge_reward,
        iconEmoji: um.mission_templates.icon_emoji,
        colorHex: um.mission_templates.color_hex
      } : null,
      status: um.status,
      progressPercent: um.progress_percent,
      lessonsCompleted: um.lessons_completed,
      xpEarned: um.xp_earned,
      startedAt: um.started_at,
      expiresAt: um.expires_at
    })));
  } catch (err) {
    console.error('Error fetching user missions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;