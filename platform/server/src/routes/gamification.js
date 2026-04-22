/**
 * Gamification REST API routes for RoboKids Vietnam
 * XP, badges, leaderboards, and level progression
 */

import express from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Level thresholds (L1=0, L2=100, L3=250, L4=500, L5=1000, etc.)
const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title_vi: 'Tân binh', title_en: 'Rookie' },
  { level: 2, xp: 100, title_vi: 'Chiến binh', title_en: 'Warrior' },
  { level: 3, xp: 250, title_vi: 'Huấn luyện viên', title_en: 'Coach' },
  { level: 4, xp: 500, title_vi: 'Captain', title_en: 'Captain' },
  { level: 5, xp: 1000, title_vi: 'Commander', title_en: 'Commander' },
  { level: 6, xp: 2000, title_vi: 'Elite', title_en: 'Elite' },
  { level: 7, xp: 3500, title_vi: 'Legend', title_en: 'Legend' },
  { level: 8, xp: 5500, title_vi: 'Champion', title_en: 'Champion' },
  { level: 9, xp: 8000, title_vi: 'Master', title_en: 'Master' },
  { level: 10, xp: 12000, title_vi: 'Galaxy Master', title_en: 'Galaxy Master' },
];

/**
 * Calculate level from total XP
 */
function calculateLevel(totalXp) {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalXp >= threshold.xp) {
      level = threshold.level;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Get level info for a given level number
 */
function getLevelInfo(levelNum) {
  return LEVEL_THRESHOLDS.find(l => l.level === levelNum) || LEVEL_THRESHOLDS[0];
}

/**
 * Calculate XP needed for next level
 */
function xpForNextLevel(currentLevel) {
  const nextThreshold = LEVEL_THRESHOLDS.find(l => l.level === currentLevel + 1);
  return nextThreshold ? nextThreshold.xp : null;
}

// ============================================
// PROFILE (matches frontend API expectations)
// ============================================

/**
 * GET /api/gamification/profile
 * Get user gamification profile (XP, level, badges)
 * Query: ?studentId=<id> (optional, defaults to auth user)
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    let userId = req.user.id;

    // Allow admins/teachers to view other profiles
    if (req.query.studentId) {
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';
      const isOwnProfile = req.query.studentId === req.user.id;

      if (!isOwnProfile && !isAdminOrTeacher) {
        return res.status(403).json({ error: 'Not authorized to view this profile' });
      }
      userId = req.query.studentId;
    }

    // Get user level
    const { data: userLevel } = await supabase
      .from('user_levels')
      .select('total_xp, current_level, level_xp')
      .eq('user_id', userId)
      .single();

    const totalXp = userLevel?.total_xp || 0;
    const currentLevel = userLevel?.current_level || calculateLevel(totalXp);
    const levelInfo = getLevelInfo(currentLevel);
    const nextLevelXp = xpForNextLevel(currentLevel);

    // Get earned badges
    const { data: earnedBadges } = await supabase
      .from('earned_badges')
      .select(`
        id,
        earned_at,
        badges (
          id,
          badge_key,
          name_vi,
          name_en,
          description_vi,
          description_en,
          icon,
          color_hex,
          xp_reward,
          criteria
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    const badges = (earnedBadges || []).map(eb => ({
      id: eb.badges?.id,
      key: eb.badges?.badge_key,
      name: eb.badges?.name_en,
      nameVi: eb.badges?.name_vi,
      description: eb.badges?.description_en,
      descriptionVi: eb.badges?.description_vi,
      iconUrl: eb.badges?.icon,
      colorHex: eb.badges?.color_hex || '#6366f1',
      xpReward: eb.badges?.xp_reward || 0,
      earnedAt: eb.earned_at,
      criteria: eb.badges?.criteria
    }));

    // Get streak from user_progress
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('current_streak_days')
      .eq('user_id', userId)
      .single();

    // Get user rank
    const { data: allUsers } = await supabase
      .from('user_levels')
      .select('user_id, total_xp')
      .order('total_xp', { ascending: false });

    const rank = allUsers ? allUsers.findIndex(u => u.user_id === userId) + 1 : null;

    res.json({
      studentId: userId,
      xp: totalXp,
      level: currentLevel,
      levelTitle: levelInfo.title_en,
      levelTitleVi: levelInfo.title_vi,
      badges,
      streak: userProgress?.current_streak_days || 0,
      rank: rank || undefined
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/gamification/xp
 * Award XP to a student (matches frontend API)
 * Body: { studentId, amount, reason }
 */
router.post('/xp', authenticate, async (req, res) => {
  try {
    const { studentId, amount, reason } = req.body;

    if (!studentId || !amount || !reason) {
      return res.status(400).json({ error: 'Missing required fields: studentId, amount, reason' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Log XP transaction
    const { error: xpError } = await supabaseAdmin
      .from('xp_points')
      .insert({
        user_id: studentId,
        amount,
        reason,
        source_type: 'manual',
        source_id: null
      });

    if (xpError) {
      console.error('Error logging XP:', xpError);
      return res.status(500).json({ error: 'Failed to award XP' });
    }

    // Update or create user level record
    const { data: existingLevel } = await supabaseAdmin
      .from('user_levels')
      .select('total_xp, current_level')
      .eq('user_id', studentId)
      .single();

    const newTotalXp = (existingLevel?.total_xp || 0) + amount;
    const newLevel = calculateLevel(newTotalXp);
    const leveledUp = existingLevel && newLevel > existingLevel.current_level;

    let levelData;
    if (existingLevel) {
      const { data: updated } = await supabaseAdmin
        .from('user_levels')
        .update({
          total_xp: newTotalXp,
          current_level: newLevel,
          level_xp: newTotalXp - (getLevelInfo(newLevel).xp || 0),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', studentId)
        .select()
        .single();
      levelData = updated;
    } else {
      const { data: created } = await supabaseAdmin
        .from('user_levels')
        .insert({
          user_id: studentId,
          total_xp: newTotalXp,
          current_level: newLevel,
          level_xp: newTotalXp - (getLevelInfo(newLevel).xp || 0)
        })
        .select()
        .single();
      levelData = created;
    }

    res.status(201).json({
      newXp: newTotalXp,
      levelUp: leveledUp,
      newLevel: leveledUp ? {
        level: newLevel,
        title: getLevelInfo(newLevel).title_en,
        titleVi: getLevelInfo(newLevel).title_vi,
        minXp: getLevelInfo(newLevel).xp,
        maxXp: xpForNextLevel(newLevel) || 999999,
        icon: ''
      } : undefined
    });
  } catch (err) {
    console.error('Error awarding XP:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/gamification/badges
 * Get all available badges with earned status for current user
 * Query: ?studentId=<id> (optional)
 */
router.get('/badges', authenticate, async (req, res) => {
  try {
    let userId = req.user.id;

    if (req.query.studentId) {
      userId = req.query.studentId;
    }

    // Get all badges
    const { data: allBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .order('xp_reward', { ascending: true });

    if (badgesError) throw badgesError;

    // Get user's earned badges
    const { data: earned } = await supabase
      .from('earned_badges')
      .select('badge_id, earned_at')
      .eq('user_id', userId);

    const earnedMap = new Set((earned || []).map(e => e.badge_id));

    const badges = (allBadges || []).map(b => ({
      id: b.id,
      key: b.badge_key,
      name: b.name_en,
      nameVi: b.name_vi,
      description: b.description_en,
      descriptionVi: b.description_vi,
      iconUrl: b.icon,
      colorHex: b.color_hex || '#6366f1',
      xpReward: b.xp_reward || 0,
      earnedAt: earnedMap.has(b.id) ? (earned || []).find(e => e.badge_id === b.id)?.earned_at : undefined,
      criteria: b.criteria
    }));

    res.json({
      badges,
      earnedCount: earnedMap.size,
      totalCount: badges.length
    });
  } catch (err) {
    console.error('Error fetching badges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/gamification/badges/award
 * Award a badge to a student
 * Body: { studentId, badgeKey }
 */
router.post('/badges/award', authenticate, async (req, res) => {
  try {
    const { studentId, badgeKey } = req.body;

    if (!studentId || !badgeKey) {
      return res.status(400).json({ error: 'Missing required fields: studentId, badgeKey' });
    }

    // Find badge by key
    const { data: badge } = await supabase
      .from('badges')
      .select('*')
      .eq('badge_key', badgeKey)
      .single();

    if (!badge) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    // Check if already earned
    const { data: existing } = await supabase
      .from('earned_badges')
      .select('id')
      .eq('user_id', studentId)
      .eq('badge_id', badge.id)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Badge already earned', badge });
    }

    // Award badge
    const { data: earned, error: awardError } = await supabaseAdmin
      .from('earned_badges')
      .insert({
        user_id: studentId,
        badge_id: badge.id,
        earned_context: { source: 'manual_award', awarded_at: new Date().toISOString() }
      })
      .select(`
        id,
        earned_at,
        badges (
          id,
          badge_key,
          name_vi,
          name_en,
          description_vi,
          description_en,
          icon,
          color_hex,
          xp_reward
        )
      `)
      .single();

    if (awardError) {
      console.error('Error awarding badge:', awardError);
      return res.status(500).json({ error: 'Failed to award badge' });
    }

    const newBadges = [{
      id: earned.badges?.id,
      key: earned.badges?.badge_key,
      name: earned.badges?.name_en,
      nameVi: earned.badges?.name_vi,
      description: earned.badges?.description_en,
      descriptionVi: earned.badges?.description_vi,
      iconUrl: earned.badges?.icon,
      colorHex: earned.badges?.color_hex || '#6366f1',
      xpReward: earned.badges?.xp_reward || 0,
      earnedAt: earned.earned_at
    }];

    // Award XP for badge
    if (earned.badges?.xp_reward) {
      await supabaseAdmin.from('xp_points').insert({
        user_id: studentId,
        amount: earned.badges.xp_reward,
        reason: `Badge earned: ${earned.badges.badge_key}`,
        source_type: 'badge',
        source_id: badge.id
      });

      // Update user level
      const { data: userLevel } = await supabaseAdmin
        .from('user_levels')
        .select('total_xp')
        .eq('user_id', studentId)
        .single();

      const newTotal = (userLevel?.total_xp || 0) + earned.badges.xp_reward;
      await supabaseAdmin.from('user_levels').upsert({
        user_id: studentId,
        total_xp: newTotal,
        current_level: calculateLevel(newTotal),
        level_xp: newTotal - (getLevelInfo(calculateLevel(newTotal)).xp || 0),
        updated_at: new Date().toISOString()
      });
    }

    res.status(201).json({
      badge: newBadges[0],
      newBadges
    });
  } catch (err) {
    console.error('Error awarding badge:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/gamification/leaderboard
 * Get leaderboard entries
 * Query: ?limit=10
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    // Get top users by XP with profile info
    const { data: leaders, error } = await supabase
      .from('user_levels')
      .select(`
        user_id,
        total_xp,
        current_level,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Get current user's rank
    let userRank = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: userData } = await supabase.auth.getUser(token);
        if (userData?.user) {
          const { data: allUsers } = await supabase
            .from('user_levels')
            .select('user_id')
            .order('total_xp', { ascending: false });

          const rankIndex = allUsers?.findIndex(u => u.user_id === userData.user.id);
          if (rankIndex !== undefined && rankIndex >= 0) {
            userRank = rankIndex + 1;
          }
        }
      } catch (e) {
        // Ignore auth errors for leaderboard
      }
    }

    const entries = (leaders || []).map((entry, index) => ({
      rank: index + 1,
      studentId: entry.user_id,
      studentName: entry.profiles?.full_name || 'Anonymous',
      avatarEmoji: null,
      xp: entry.total_xp,
      level: entry.current_level,
      levelTitle: getLevelInfo(entry.current_level).title_en,
      streak: 0
    }));

    res.json({ entries, userRank });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/gamification/rank/:studentId
 * Get user's rank
 */
router.get('/rank/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const { data: allUsers, error } = await supabase
      .from('user_levels')
      .select('user_id')
      .order('total_xp', { ascending: false });

    if (error) throw error;

    const rankIndex = allUsers?.findIndex(u => u.user_id === studentId);
    const rank = rankIndex !== undefined && rankIndex >= 0 ? rankIndex + 1 : null;

    res.json({
      rank,
      totalStudents: allUsers?.length || 0
    });
  } catch (err) {
    console.error('Error fetching rank:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/gamification/levels
 * Get level definitions
 */
router.get('/levels', (req, res) => {
  res.json({
    levels: LEVEL_THRESHOLDS.map(l => ({
      level: l.level,
      title: l.title_en,
      titleVi: l.title_vi,
      minXp: l.xp,
      maxXp: LEVEL_THRESHOLDS.find(next => next.level === l.level + 1)?.xp || 999999,
      icon: ''
    }))
  });
});

/**
 * POST /api/gamification/game-result
 * Record game match result and award XP to winner
 * Body: { winnerId, loserId, gameType, roomId, duration, reason }
 * Auth: Game server calls require X-Game-Server: true header
 */
router.post('/game-result', async (req, res) => {
  try {
    const { winnerId, loserId, gameType, roomId, duration, reason } = req.body;

    // Check if this is a game server call
    const isGameServer = req.headers['x-game-server'] === 'true';

    // If not game server call, require authentication
    if (!isGameServer) {
      // For now, we'll allow both authenticated and game server calls
      // In production, you would verify the service key properly
    }

    if (!winnerId || !loserId || !gameType) {
      return res.status(400).json({ error: 'Missing required fields: winnerId, loserId, gameType' });
    }

    // XP rewards for game victory
    const XP_REWARDS = {
      sumo_battle: { winner: 100, loser: 20 }
    };

    const xpReward = XP_REWARDS[gameType] || { winner: 50, loser: 10 };

    // Record match history (create table if not exists via upsert pattern)
    const { error: historyError } = await supabaseAdmin
      .from('match_history')
      .insert({
        winner_id: winnerId,
        loser_id: loserId,
        game_type: gameType,
        room_id: roomId || null,
        duration_seconds: duration || null,
        end_reason: reason || 'unknown',
        played_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('Error recording match history:', historyError);
      // Continue even if history recording fails
    }

    // Award XP to winner
    const { data: winnerXp, error: winnerError } = await supabaseAdmin
      .from('xp_points')
      .insert({
        user_id: winnerId,
        amount: xpReward.winner,
        reason: `Won ${gameType} match`,
        source_type: 'game',
        source_id: roomId
      })
      .select()
      .single();

    if (winnerError) {
      console.error('Error awarding winner XP:', winnerError);
    }

    // Award XP to loser (participation reward)
    await supabaseAdmin
      .from('xp_points')
      .insert({
        user_id: loserId,
        amount: xpReward.loser,
        reason: `Participated in ${gameType} match`,
        source_type: 'game',
        source_id: roomId
      });

    // Update winner's level
    const { data: winnerLevel } = await supabaseAdmin
      .from('user_levels')
      .select('total_xp, current_level')
      .eq('user_id', winnerId)
      .single();

    const newWinnerXp = (winnerLevel?.total_xp || 0) + xpReward.winner;
    const newWinnerLevel = calculateLevel(newWinnerXp);

    await supabaseAdmin
      .from('user_levels')
      .upsert({
        user_id: winnerId,
        total_xp: newWinnerXp,
        current_level: newWinnerLevel,
        level_xp: newWinnerXp - (getLevelInfo(newWinnerLevel).xp || 0),
        updated_at: new Date().toISOString()
      });

    // Update loser's level
    const { data: loserLevel } = await supabaseAdmin
      .from('user_levels')
      .select('total_xp, current_level')
      .eq('user_id', loserId)
      .single();

    const newLoserXp = (loserLevel?.total_xp || 0) + xpReward.loser;
    const newLoserLevel = calculateLevel(newLoserXp);

    await supabaseAdmin
      .from('user_levels')
      .upsert({
        user_id: loserId,
        total_xp: newLoserXp,
        current_level: newLoserLevel,
        level_xp: newLoserXp - (getLevelInfo(newLoserLevel).xp || 0),
        updated_at: new Date().toISOString()
      });

    res.status(201).json({
      success: true,
      matchRecorded: !historyError,
      winner: {
        studentId: winnerId,
        xpAwarded: xpReward.winner,
        totalXp: newWinnerXp,
        level: newWinnerLevel
      },
      loser: {
        studentId: loserId,
        xpAwarded: xpReward.loser,
        totalXp: newLoserXp,
        level: newLoserLevel
      }
    });
  } catch (err) {
    console.error('Error recording game result:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// XP & LEVELS (extension of existing)
// ============================================

/**
 * POST /api/gamification/mission-complete
 * Complete mission flow and award XP/badges
 * Body: { studentId, missionId, phase }
 */
router.post('/mission-complete', authenticate, async (req, res) => {
  try {
    const { studentId, missionId, phase } = req.body;

    if (!studentId || !missionId || !phase) {
      return res.status(400).json({ error: 'Missing required fields: studentId, missionId, phase' });
    }

    // Award base XP for mission completion
    const xpRewards = {
      lesson: 50,
      challenge: 100,
      practice: 30,
      review: 75
    };
    const baseXp = xpRewards[phase] || 50;

    // Log XP
    await supabaseAdmin.from('xp_points').insert({
      user_id: studentId,
      amount: baseXp,
      reason: `Mission completed: ${missionId} (${phase})`,
      source_type: 'mission',
      source_id: missionId
    });

    // Update user level
    const { data: existingLevel } = await supabaseAdmin
      .from('user_levels')
      .select('total_xp, current_level')
      .eq('user_id', studentId)
      .single();

    const newTotalXp = (existingLevel?.total_xp || 0) + baseXp;
    const newLevel = calculateLevel(newTotalXp);
    const leveledUp = existingLevel && newLevel > existingLevel.current_level;

    await supabaseAdmin.from('user_levels').upsert({
      user_id: studentId,
      total_xp: newTotalXp,
      current_level: newLevel,
      level_xp: newTotalXp - (getLevelInfo(newLevel).xp || 0),
      updated_at: new Date().toISOString()
    });

    // Check for badges to award
    const awardedBadges = [];
    const { data: allBadges } = await supabase
      .from('badges')
      .select('*')
      .eq('criteria', `mission_complete_${phase}`);

    for (const badge of (allBadges || [])) {
      const { data: existing } = await supabase
        .from('earned_badges')
        .select('id')
        .eq('user_id', studentId)
        .eq('badge_id', badge.id)
        .single();

      if (!existing) {
        const { data: earned } = await supabaseAdmin
          .from('earned_badges')
          .insert({
            user_id: studentId,
            badge_id: badge.id,
            earned_context: { missionId, phase, awarded_at: new Date().toISOString() }
          })
          .select('*, badges(*)')
          .single();

        if (earned) {
          awardedBadges.push({
            id: earned.badges?.id,
            key: earned.badges?.badge_key,
            name: earned.badges?.name_en,
            nameVi: earned.badges?.name_vi,
            description: earned.badges?.description_en,
            descriptionVi: earned.badges?.description_vi,
            iconUrl: earned.badges?.icon,
            colorHex: earned.badges?.color_hex || '#6366f1',
            xpReward: earned.badges?.xp_reward || 0,
            earnedAt: earned.earned_at
          });
        }
      }
    }

    res.status(201).json({
      xpEarned: baseXp,
      badgesEarned: awardedBadges,
      levelUp: leveledUp
    });
  } catch (err) {
    console.error('Error completing mission:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// XP & LEVELS
// ============================================

/**
 * POST /api/xp/award
 * Award XP to a user
 * Body: { userId, amount, reason, sourceType, sourceId }
 */
router.post('/award', authenticate, async (req, res) => {
  try {
    const { userId, amount, reason, sourceType, sourceId } = req.body;

    if (!userId || !amount || !reason) {
      return res.status(400).json({ error: 'Missing required fields: userId, amount, reason' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Log XP transaction
    const { data: xpEntry, error: xpError } = await supabaseAdmin
      .from('xp_points')
      .insert({
        user_id: userId,
        amount,
        reason,
        source_type: sourceType || 'manual',
        source_id: sourceId || null
      })
      .select()
      .single();

    if (xpError) {
      console.error('Error logging XP:', xpError);
      return res.status(500).json({ error: 'Failed to award XP' });
    }

    // Update or create user level record
    const { data: existingLevel } = await supabaseAdmin
      .from('user_levels')
      .select('total_xp, current_level')
      .eq('user_id', userId)
      .single();

    const newTotalXp = (existingLevel?.total_xp || 0) + amount;
    const newLevel = calculateLevel(newTotalXp);

    let levelData;
    if (existingLevel) {
      const { data: updated } = await supabaseAdmin
        .from('user_levels')
        .update({
          total_xp: newTotalXp,
          current_level: newLevel,
          level_xp: newTotalXp - (getLevelInfo(newLevel).xp || 0),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      levelData = updated;
    } else {
      const { data: created } = await supabaseAdmin
        .from('user_levels')
        .insert({
          user_id: userId,
          total_xp: newTotalXp,
          current_level: newLevel,
          level_xp: newTotalXp - (getLevelInfo(newLevel).xp || 0)
        })
        .select()
        .single();
      levelData = created;
    }

    // Check if level up occurred
    const leveledUp = existingLevel && newLevel > existingLevel.current_level;

    res.status(201).json({
      success: true,
      xpAwarded: amount,
      totalXp: newTotalXp,
      currentLevel: newLevel,
      leveledUp,
      levelInfo: getLevelInfo(newLevel),
      nextLevelXp: xpForNextLevel(newLevel)
    });
  } catch (err) {
    console.error('Error awarding XP:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:userId/xp
 * Get user total XP and level info
 */
router.get('/users/:userId/xp', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;

    // Authorization: own profile, admin/teacher, or parent
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', requestingUserId)
      .single();

    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';
    const isOwnProfile = userId === requestingUserId;

    let isParent = false;
    if (!isOwnProfile && !isAdminOrTeacher) {
      // Check if requester is parent of student with this profile
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('profile_id', requestingUserId)
        .single();

      if (parent) {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('profile_id', userId)
          .single();

        if (student) {
          const { data: relation } = await supabase
            .from('student_parent_relations')
            .select('id')
            .eq('student_id', student.id)
            .eq('parent_id', parent.id)
            .single();
          isParent = !!relation;
        }
      }
    }

    if (!isOwnProfile && !isAdminOrTeacher && !isParent) {
      return res.status(403).json({ error: 'Not authorized to view this user\'s XP' });
    }

    // Get user level
    const { data: userLevel } = await supabase
      .from('user_levels')
      .select('total_xp, current_level, level_xp')
      .eq('user_id', userId)
      .single();

    const totalXp = userLevel?.total_xp || 0;
    const currentLevel = userLevel?.current_level || calculateLevel(totalXp);
    const levelXp = userLevel?.level_xp || (totalXp - (getLevelInfo(currentLevel).xp || 0));
    const levelInfo = getLevelInfo(currentLevel);
    const nextLevelXp = xpForNextLevel(currentLevel);
    const xpToNext = nextLevelXp ? nextLevelXp - totalXp : null;

    res.json({
      userId,
      totalXp,
      currentLevel,
      levelXp,
      levelInfo,
      xpToNextLevel: xpToNext,
      progressPercent: nextLevelXp
        ? Math.min(100, Math.round((levelXp / (nextLevelXp - (getLevelInfo(currentLevel).xp || 0))) * 100))
        : 100
    });
  } catch (err) {
    console.error('Error fetching XP:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/xp/levels
 * Get all level thresholds
 */
router.get('/levels', (req, res) => {
  res.json({
    levels: LEVEL_THRESHOLDS.map(l => ({
      level: l.level,
      xpRequired: l.xp,
      titleVi: l.title_vi,
      titleEn: l.title_en
    }))
  });
});

// ============================================
// BADGES
// ============================================

/**
 * GET /api/badges
 * List all available badges
 */
router.get('/badges', async (req, res) => {
  try {
    const { data: badges, error } = await supabase
      .from('badges')
      .select('*')
      .order('xp_reward', { ascending: true });

    if (error) throw error;

    res.json({ badges: badges || [] });
  } catch (err) {
    console.error('Error fetching badges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:userId/badges
 * Get user earned badges
 */
router.get('/users/:userId/badges', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;

    // Authorization check
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', requestingUserId)
      .single();

    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';
    const isOwnProfile = userId === requestingUserId;

    let isParent = false;
    if (!isOwnProfile && !isAdminOrTeacher) {
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('profile_id', requestingUserId)
        .single();

      if (parent) {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('profile_id', userId)
          .single();

        if (student) {
          const { data: relation } = await supabase
            .from('student_parent_relations')
            .select('id')
            .eq('student_id', student.id)
            .eq('parent_id', parent.id)
            .single();
          isParent = !!relation;
        }
      }
    }

    if (!isOwnProfile && !isAdminOrTeacher && !isParent) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data: earnedBadges, error } = await supabase
      .from('earned_badges')
      .select(`
        id,
        earned_at,
        earned_context,
        badges (
          id,
          badge_key,
          name_vi,
          name_en,
          description_vi,
          description_en,
          icon,
          type,
          xp_reward
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) throw error;

    const formatted = (earnedBadges || []).map(eb => ({
      id: eb.id,
      badgeKey: eb.badges?.badge_key,
      nameVi: eb.badges?.name_vi,
      nameEn: eb.badges?.name_en,
      descriptionVi: eb.badges?.description_vi,
      descriptionEn: eb.badges?.description_en,
      icon: eb.badges?.icon,
      type: eb.badges?.type,
      xpReward: eb.badges?.xp_reward,
      earnedAt: eb.earned_at,
      context: eb.earned_context
    }));

    res.json({ userId, badges: formatted });
  } catch (err) {
    console.error('Error fetching user badges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/badges/check
 * Check and award badges based on activity
 * Body: { userId, activityType, activityData }
 */
router.post('/check', authenticate, async (req, res) => {
  try {
    const { userId, activityType, activityData } = req.body;

    if (!userId || !activityType) {
      return res.status(400).json({ error: 'Missing required fields: userId, activityType' });
    }

    const awarded = [];

    // Get all badges that match this activity type
    const { data: allBadges } = await supabase
      .from('badges')
      .select('*');

    const matchingBadges = (allBadges || []).filter(badge => {
      const criteria = badge.criteria_json || {};
      return criteria.type === activityType;
    });

    for (const badge of matchingBadges) {
      // Check if already earned
      const { data: existing } = await supabase
        .from('earned_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', badge.id)
        .single();

      if (existing) continue;

      // Check if criteria is met
      const criteria = badge.criteria_json || {};
      let qualifies = false;

      switch (activityType) {
        case 'lesson_complete':
          // Count completed lessons
          const { count: lessonCount } = await supabase
            .from('completed_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .then(({ data, count, error }) => ({ count, error }));
          qualifies = lessonCount >= (criteria.count || 1);
          break;

        case 'challenge_complete':
          // Count completed challenges
          const { count: challengeCount } = await supabase
            .from('mission_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'completed')
            .then(({ data, count, error }) => ({ count, error }));
          qualifies = challengeCount >= (criteria.count || 1);
          break;

        case 'module_complete':
          // Check if module completed
          qualifies = activityData?.moduleId ? true : false;
          break;

        case 'course_complete':
          // Check if course completed
          qualifies = activityData?.courseId ? true : false;
          break;

        case 'streak':
          // Check streak days
          const streakDays = activityData?.streakDays || 0;
          qualifies = streakDays >= (criteria.days || 7);
          break;
      }

      if (qualifies) {
        // Award badge
        const { data: earned, error: awardError } = await supabaseAdmin
          .from('earned_badges')
          .insert({
            user_id: userId,
            badge_id: badge.id,
            earned_context: { activityType, activityData, awarded_at: new Date().toISOString() }
          })
          .select(`
            id,
            earned_at,
            badges (
              badge_key,
              name_vi,
              name_en,
              xp_reward
            )
          `)
          .single();

        if (!awardError && earned) {
          awarded.push({
            badgeKey: earned.badges?.badge_key,
            nameVi: earned.badges?.name_vi,
            nameEn: earned.badges?.name_en,
            xpReward: earned.badges?.xp_reward,
            earnedAt: earned.earned_at
          });

          // Award XP for badge if configured
          if (earned.badges?.xp_reward) {
            await supabaseAdmin.from('xp_points').insert({
              user_id: userId,
              amount: earned.badges.xp_reward,
              reason: `Badge earned: ${earned.badges.badge_key}`,
              source_type: 'badge',
              source_id: badge.id
            });

            // Update user level
            const { data: userLevel } = await supabaseAdmin
              .from('user_levels')
              .select('total_xp')
              .eq('user_id', userId)
              .single();

            const newTotal = (userLevel?.total_xp || 0) + earned.badges.xp_reward;
            await supabaseAdmin.from('user_levels').upsert({
              user_id: userId,
              total_xp: newTotal,
              current_level: calculateLevel(newTotal),
              level_xp: newTotal - (getLevelInfo(calculateLevel(newTotal)).xp || 0),
              updated_at: new Date().toISOString()
            });
          }
        }
      }
    }

    res.json({
      success: true,
      checkedActivity: activityType,
      badgesAwarded: awarded
    });
  } catch (err) {
    console.error('Error checking badges:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// LEADERBOARDS
// ============================================

/**
 * GET /api/leaderboard
 * Get top users by XP
 * Query params: period (weekly|alltime, default alltime), limit (default 10)
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { period = 'alltime', limit = 10 } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 10, 50);

    let startDate = null;
    if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString();
    }

    let query = supabase
      .from('user_levels')
      .select(`
        user_id,
        total_xp,
        current_level,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .order('total_xp', { ascending: false })
      .limit(maxLimit);

    if (startDate) {
      // For weekly, we'd need to sum xp_points created after startDate
      // This is a simplified version - just show current total XP
      query = query;
    }

    const { data: leaders, error } = await query;

    if (error) throw error;

    const formatted = (leaders || []).map((entry, index) => ({
      rank: index + 1,
      userId: entry.user_id,
      fullName: entry.profiles?.full_name || 'Anonymous',
      avatarUrl: entry.profiles?.avatar_url || null,
      totalXp: entry.total_xp,
      level: entry.current_level
    }));

    res.json({
      period,
      leaderboard: formatted
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// STREAKS (extension of existing streaks routes)
// ============================================

/**
 * GET /api/users/:userId/streak
 * Get current streak info for a user (alternative to /api/streaks)
 */
router.get('/users/:userId/streak', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;

    // Authorization check (same as XP endpoint)
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', requestingUserId)
      .single();

    const isAdminOrTeacher = requesterProfile?.role === 'admin' || requesterProfile?.role === 'teacher';
    const isOwnProfile = userId === requestingUserId;

    let isParent = false;
    if (!isOwnProfile && !isAdminOrTeacher) {
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('profile_id', requestingUserId)
        .single();

      if (parent) {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('profile_id', userId)
          .single();

        if (student) {
          const { data: relation } = await supabase
            .from('student_parent_relations')
            .select('id')
            .eq('student_id', student.id)
            .eq('parent_id', parent.id)
            .single();
          isParent = !!relation;
        }
      }
    }

    if (!isOwnProfile && !isAdminOrTeacher && !isParent) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get user progress for streak data
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('current_streak_days, longest_streak_days, last_checkin, total_xp')
      .eq('user_id', userId)
      .single();

    // Get recent checkins to calculate streak
    const { data: recentCheckins } = await supabase
      .from('streak_checkins')
      .select('checkin_date')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(100);

    // Calculate consecutive streak
    const checkinDates = (recentCheckins || []).map(c => c.checkin_date);
    const currentStreak = calculateConsecutiveStreakFromDates(checkinDates);

    res.json({
      userId,
      currentStreak,
      longestStreak: userProgress?.longest_streak_days || currentStreak,
      lastCheckin: userProgress?.last_checkin || null,
      totalXp: userProgress?.total_xp || 0
    });
  } catch (err) {
    console.error('Error fetching streak:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Calculate consecutive streak from checkin dates
 */
function calculateConsecutiveStreakFromDates(checkinDates) {
  if (!checkinDates || checkinDates.length === 0) return 0;

  const uniqueDates = [...new Set(checkinDates)].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday)) {
    return 0;
  }

  let currentDate = uniqueDates.includes(today) ? today : yesterday;
  let streak = 1;

  const dateSet = new Set(uniqueDates);

  while (true) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    if (dateSet.has(prevDateStr)) {
      streak++;
      currentDate = prevDateStr;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * POST /api/streaks/update
 * Update streak on learning activity
 * Body: { userId }
 */
router.post('/streaks/update', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Verify authorization
    if (req.user.id !== userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const { data: existingCheckin } = await supabase
      .from('streak_checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('checkin_date', today)
      .single();

    if (existingCheckin) {
      return res.json({
        success: true,
        message: 'Already checked in today',
        checkinDate: today
      });
    }

    // Create checkin
    const { error: checkinError } = await supabaseAdmin
      .from('streak_checkins')
      .insert({
        user_id: userId,
        checkin_date: today
      });

    if (checkinError && checkinError.code !== '23505') { // Ignore duplicate key
      console.error('Checkin error:', checkinError);
      return res.status(500).json({ error: 'Failed to update streak' });
    }

    // Calculate new streak
    const { data: allCheckins } = await supabase
      .from('streak_checkins')
      .select('checkin_date')
      .eq('user_id', userId);

    const newStreak = calculateConsecutiveStreakFromDates(
      (allCheckins || []).map(c => c.checkin_date)
    );

    // Update user progress
    const { data: userProgress } = await supabaseAdmin
      .from('user_progress')
      .select('longest_streak_days')
      .eq('user_id', userId)
      .single();

    const longestStreak = Math.max(userProgress?.longest_streak_days || 0, newStreak);

    await supabaseAdmin
      .from('user_progress')
      .upsert({
        user_id: userId,
        current_streak_days: newStreak,
        longest_streak_days: longestStreak,
        last_checkin: today,
        updated_at: new Date().toISOString()
      });

    res.json({
      success: true,
      checkinDate: today,
      newStreak,
      longestStreak
    });
  } catch (err) {
    console.error('Error updating streak:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;