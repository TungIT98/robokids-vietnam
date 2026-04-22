/**
 * Gamification API Service
 * Handles XP, badges, leaderboard, and level progression
 * Uses PocketBase when configured, falls back to Express API
 */

import { pocketbase, isPocketBaseConfigured } from './pocketbase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

// Badge tier types
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// Badge category types
export type BadgeCategory = 'learning' | 'mastery' | 'social' | 'special';

// Rarity types (still used for visual styling)
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Badge {
  id: string;
  key: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  iconUrl?: string;
  iconEmoji?: string; // Emoji fallback when iconUrl is not available
  colorHex: string;
  xpReward: number;
  earnedAt?: string;
  criteria: string;
  rarity?: BadgeRarity;
  tier: BadgeTier; // Required - badge tier (bronze/silver/gold/platinum/diamond)
  category: BadgeCategory; // Required - badge category (learning/mastery/social/special)
}

// Tier display information
export const BADGE_TIER_INFO: Record<BadgeTier, { name: string; nameVi: string; color: string; icon: string; minBadges: number }> = {
  bronze: { name: 'Bronze', nameVi: 'Đồng', color: '#cd7f32', icon: '🥉', minBadges: 0 },
  silver: { name: 'Silver', nameVi: 'Bạc', color: '#c0c0c0', icon: '🥈', minBadges: 3 },
  gold: { name: 'Gold', nameVi: 'Vàng', color: '#ffd700', icon: '🥇', minBadges: 8 },
  platinum: { name: 'Platinum', nameVi: 'Bạch Kim', color: '#e5e4e2', icon: '💎', minBadges: 15 },
  diamond: { name: 'Diamond', nameVi: 'Kim Cương', color: '#b9f2ff', icon: '💠', minBadges: 25 },
};

// Category display information
export const BADGE_CATEGORY_INFO: Record<BadgeCategory, { name: string; nameVi: string; icon: string }> = {
  learning: { name: 'Learning', nameVi: 'Học tập', icon: '📚' },
  mastery: { name: 'Mastery', nameVi: 'Thành thạo', icon: '🎯' },
  social: { name: 'Social', nameVi: 'Xã hội', icon: '🤝' },
  special: { name: 'Special', nameVi: 'Đặc biệt', icon: '⭐' },
};

// Default badge definitions for the RoboKids Vietnam platform
export const DEFAULT_BADGES: Omit<Badge, 'id' | 'earnedAt'>[] = [
  // LEARNING CATEGORY - Badges for completing lessons and learning milestones
  {
    key: 'first_lesson',
    name: 'First Lesson',
    nameVi: 'Bài học đầu tiên',
    description: 'Complete your first lesson',
    descriptionVi: 'Hoàn thành bài học đầu tiên',
    iconEmoji: '🌱',
    colorHex: '#22c55e',
    xpReward: 10,
    criteria: 'Hoàn thành bài học đầu tiên',
    rarity: 'common',
    tier: 'bronze',
    category: 'learning',
  },
  {
    key: 'lesson_5',
    name: '5 Lessons',
    nameVi: '5 Bài học',
    description: 'Complete 5 lessons',
    descriptionVi: 'Hoàn thành 5 bài học',
    iconEmoji: '📖',
    colorHex: '#3b82f6',
    xpReward: 25,
    criteria: 'Hoàn thành 5 bài học',
    rarity: 'common',
    tier: 'bronze',
    category: 'learning',
  },
  {
    key: 'lesson_10',
    name: '10 Lessons',
    nameVi: '10 Bài học',
    description: 'Complete 10 lessons',
    descriptionVi: 'Hoàn thành 10 bài học',
    iconEmoji: '📚',
    colorHex: '#6366f1',
    xpReward: 50,
    criteria: 'Hoàn thành 10 bài học',
    rarity: 'uncommon',
    tier: 'silver',
    category: 'learning',
  },
  {
    key: 'lesson_25',
    name: '25 Lessons',
    nameVi: '25 Bài học',
    description: 'Complete 25 lessons',
    descriptionVi: 'Hoàn thành 25 bài học',
    iconEmoji: '🎓',
    colorHex: '#8b5cf6',
    xpReward: 100,
    criteria: 'Hoàn thành 25 bài học',
    rarity: 'rare',
    tier: 'gold',
    category: 'learning',
  },
  {
    key: 'lesson_50',
    name: '50 Lessons',
    nameVi: '50 Bài học',
    description: 'Complete 50 lessons',
    descriptionVi: 'Hoàn thành 50 bài học',
    iconEmoji: '🏆',
    colorHex: '#ec4899',
    xpReward: 200,
    criteria: 'Hoàn thành 50 bài học',
    rarity: 'epic',
    tier: 'platinum',
    category: 'learning',
  },
  {
    key: 'streak_3',
    name: '3-Day Streak',
    nameVi: 'Chuỗi 3 ngày',
    description: 'Login and learn 3 days in a row',
    descriptionVi: 'Đăng nhập và học 3 ngày liên tiếp',
    iconEmoji: '🔥',
    colorHex: '#f97316',
    xpReward: 15,
    criteria: 'Học liên tiếp 3 ngày',
    rarity: 'common',
    tier: 'bronze',
    category: 'learning',
  },
  {
    key: 'streak_7',
    name: '7-Day Streak',
    nameVi: 'Chuỗi 7 ngày',
    description: 'Login and learn 7 days in a row',
    descriptionVi: 'Đăng nhập và học 7 ngày liên tiếp',
    iconEmoji: '🔥',
    colorHex: '#ef4444',
    xpReward: 50,
    criteria: 'Học liên tiếp 7 ngày',
    rarity: 'uncommon',
    tier: 'silver',
    category: 'learning',
  },
  {
    key: 'streak_30',
    name: '30-Day Streak',
    nameVi: 'Chuỗi 30 ngày',
    description: 'Login and learn 30 days in a row',
    descriptionVi: 'Đăng nhập và học 30 ngày liên tiếp',
    iconEmoji: '💎',
    colorHex: '#a855f7',
    xpReward: 300,
    criteria: 'Học liên tiếp 30 ngày',
    rarity: 'legendary',
    tier: 'diamond',
    category: 'learning',
  },

  // MASTERY CATEGORY - Badges for completing missions and demonstrating skill
  {
    key: 'first_mission',
    name: 'First Mission',
    nameVi: 'Nhiệm vụ đầu tiên',
    description: 'Complete your first mission',
    descriptionVi: 'Hoàn thành nhiệm vụ đầu tiên',
    iconEmoji: '🚀',
    colorHex: '#3b82f6',
    xpReward: 15,
    criteria: 'Hoàn thành nhiệm vụ đầu tiên',
    rarity: 'common',
    tier: 'bronze',
    category: 'mastery',
  },
  {
    key: 'mission_5',
    name: '5 Missions',
    nameVi: '5 Nhiệm vụ',
    description: 'Complete 5 missions',
    descriptionVi: 'Hoàn thành 5 nhiệm vụ',
    iconEmoji: '⭐',
    colorHex: '#22c55e',
    xpReward: 40,
    criteria: 'Hoàn thành 5 nhiệm vụ',
    rarity: 'uncommon',
    tier: 'silver',
    category: 'mastery',
  },
  {
    key: 'mission_10',
    name: '10 Missions',
    nameVi: '10 Nhiệm vụ',
    description: 'Complete 10 missions',
    descriptionVi: 'Hoàn thành 10 nhiệm vụ',
    iconEmoji: '🎯',
    colorHex: '#f59e0b',
    xpReward: 75,
    criteria: 'Hoàn thành 10 nhiệm vụ',
    rarity: 'rare',
    tier: 'gold',
    category: 'mastery',
  },
  {
    key: 'mission_master',
    name: 'Mission Master',
    nameVi: 'Bậc thầy nhiệm vụ',
    description: 'Complete 25 missions',
    descriptionVi: 'Hoàn thành 25 nhiệm vụ',
    iconEmoji: '👑',
    colorHex: '#ec4899',
    xpReward: 150,
    criteria: 'Hoàn thành 25 nhiệm vụ',
    rarity: 'epic',
    tier: 'platinum',
    category: 'mastery',
  },
  {
    key: 'perfect_score',
    name: 'Perfect Score',
    nameVi: 'Điểm hoàn hảo',
    description: 'Get a perfect score on any challenge',
    descriptionVi: 'Đạt điểm tuyệt đối trong thử thách',
    iconEmoji: '💯',
    colorHex: '#ffd700',
    xpReward: 50,
    criteria: 'Đạt 100% điểm trong thử thách',
    rarity: 'rare',
    tier: 'gold',
    category: 'mastery',
  },
  {
    key: 'speed_demon',
    name: 'Speed Demon',
    nameVi: 'Tốc độ ánh sáng',
    description: 'Complete a mission in record time',
    descriptionVi: 'Hoàn thành nhiệm vụ trong thời gian kỷ lục',
    iconEmoji: '⚡',
    colorHex: '#fbbf24',
    xpReward: 75,
    criteria: 'Hoàn thành nhanh hơn kỷ lục',
    rarity: 'epic',
    tier: 'platinum',
    category: 'mastery',
  },
  {
    key: 'no_mistakes',
    name: 'No Mistakes',
    nameVi: 'Không có lỗi',
    description: 'Complete a challenge without any errors',
    descriptionVi: 'Hoàn thành thử thách không có lỗi',
    iconEmoji: '✨',
    colorHex: '#06b6d4',
    xpReward: 60,
    criteria: 'Hoàn thành không có lỗi',
    rarity: 'rare',
    tier: 'gold',
    category: 'mastery',
  },

  // SOCIAL CATEGORY - Badges for helping peers and classroom participation
  {
    key: 'helper',
    name: 'Helper',
    nameVi: 'Người giúp đỡ',
    description: 'Help 5 peers with their questions',
    descriptionVi: 'Giúp đỡ 5 bạn học trả lời câu hỏi',
    iconEmoji: '🤝',
    colorHex: '#22c55e',
    xpReward: 30,
    criteria: 'Giúp đỡ 5 bạn học',
    rarity: 'common',
    tier: 'bronze',
    category: 'social',
  },
  {
    key: 'mentor',
    name: 'Mentor',
    nameVi: 'Người hướng dẫn',
    description: 'Help 15 peers with their questions',
    descriptionVi: 'Giúp đỡ 15 bạn học trả lời câu hỏi',
    iconEmoji: '🌟',
    colorHex: '#3b82f6',
    xpReward: 75,
    criteria: 'Giúp đỡ 15 bạn học',
    rarity: 'uncommon',
    tier: 'silver',
    category: 'social',
  },
  {
    key: 'classroom_champion',
    name: 'Classroom Champion',
    nameVi: 'Vô địch lớp học',
    description: 'Top contributor in your classroom for a week',
    descriptionVi: 'Đóng góp nhiều nhất lớp học trong một tuần',
    iconEmoji: '🏅',
    colorHex: '#f59e0b',
    xpReward: 100,
    criteria: 'Đóng góp nhiều nhất lớp trong tuần',
    rarity: 'rare',
    tier: 'gold',
    category: 'social',
  },
  {
    key: 'code_reviewer',
    name: 'Code Reviewer',
    nameVi: 'Người chấm code',
    description: 'Give helpful feedback on 10 peer code submissions',
    descriptionVi: 'Đưa ra phản hồi hữu ích cho 10 bài nộp code của bạn bè',
    iconEmoji: '🔍',
    colorHex: '#8b5cf6',
    xpReward: 80,
    criteria: 'Phản hồi 10 bài code của bạn bè',
    rarity: 'uncommon',
    tier: 'silver',
    category: 'social',
  },
  {
    key: 'team_player',
    name: 'Team Player',
    nameVi: 'Người chơi đồng đội',
    description: 'Complete 5 group challenges successfully',
    descriptionVi: 'Hoàn thành 5 thử thách nhóm thành công',
    iconEmoji: '👥',
    colorHex: '#06b6d4',
    xpReward: 60,
    criteria: 'Hoàn thành 5 thử thách nhóm',
    rarity: 'uncommon',
    tier: 'silver',
    category: 'social',
  },

  // SPECIAL CATEGORY - Rare and unique badges
  {
    key: 'early_adopter',
    name: 'Early Adopter',
    nameVi: 'Người dùng sớm',
    description: 'Join RoboKids during the beta period',
    descriptionVi: 'Tham gia RoboKids trong giai đoạn thử nghiệm',
    iconEmoji: '🌟',
    colorHex: '#a855f7',
    xpReward: 50,
    criteria: 'Tham gia trong giai đoạn beta',
    rarity: 'epic',
    tier: 'platinum',
    category: 'special',
  },
  {
    key: 'birthday_hero',
    name: 'Birthday Hero',
    nameVi: 'Anh hùng ngày sinh',
    description: 'Complete a lesson on your birthday',
    descriptionVi: 'Hoàn thành bài học vào ngày sinh nhật',
    iconEmoji: '🎂',
    colorHex: '#ec4899',
    xpReward: 75,
    criteria: 'Học vào ngày sinh nhật',
    rarity: 'rare',
    tier: 'gold',
    category: 'special',
  },
  {
    key: 'first_robot',
    name: 'First Robot',
    nameVi: 'Robot đầu tiên',
    description: 'Build and program your first robot',
    descriptionVi: 'Xây dựng và lập trình robot đầu tiên',
    iconEmoji: '🤖',
    colorHex: '#6366f1',
    xpReward: 25,
    criteria: 'Lập trình robot đầu tiên',
    rarity: 'common',
    tier: 'bronze',
    category: 'special',
  },
  {
    key: 'robot_designer',
    name: 'Robot Designer',
    nameVi: 'Nhà thiết kế robot',
    description: 'Create 3 different robot designs',
    descriptionVi: 'Tạo 3 thiết kế robot khác nhau',
    iconEmoji: '🎨',
    colorHex: '#f97316',
    xpReward: 80,
    criteria: 'Tạo 3 thiết kế robot',
    rarity: 'uncommon',
    tier: 'silver',
    category: 'special',
  },
  {
    key: 'competition_rookie',
    name: 'Competition Rookie',
    nameVi: 'Tân binh thi đấu',
    description: 'Participate in your first competition',
    descriptionVi: 'Tham gia cuộc thi đầu tiên',
    iconEmoji: '🏁',
    colorHex: '#22c55e',
    xpReward: 50,
    criteria: 'Tham gia cuộc thi đầu tiên',
    rarity: 'uncommon',
    tier: 'silver',
    category: 'special',
  },
  {
    key: 'winner',
    name: 'Winner',
    nameVi: 'Người chiến thắng',
    description: 'Place in the top 3 of a competition',
    descriptionVi: 'Đạt top 3 trong một cuộc thi',
    iconEmoji: '🥇',
    colorHex: '#ffd700',
    xpReward: 200,
    criteria: 'Đạt top 3 cuộc thi',
    rarity: 'epic',
    tier: 'platinum',
    category: 'special',
  },
  {
    key: 'champion',
    name: 'Champion',
    nameVi: 'Vô địch',
    description: 'Win a competition outright',
    descriptionVi: 'Vô địch một cuộc thi',
    iconEmoji: '👑',
    colorHex: '#ef4444',
    xpReward: 500,
    criteria: 'Vô địch cuộc thi',
    rarity: 'legendary',
    tier: 'diamond',
    category: 'special',
  },
  {
    key: 'century_club',
    name: 'Century Club',
    nameVi: 'Câu lạc bộ 100',
    description: 'Earn 100 total XP',
    descriptionVi: 'Tích lũy 100 XP',
    iconEmoji: '💯',
    colorHex: '#22c55e',
    xpReward: 0,
    criteria: 'Tích lũy 100 XP',
    rarity: 'common',
    tier: 'bronze',
    category: 'mastery',
  },
  {
    key: 'xp_1000',
    name: 'XP Master',
    nameVi: 'Bậc thầy XP',
    description: 'Earn 1000 total XP',
    descriptionVi: 'Tích lũy 1000 XP',
    iconEmoji: '⚡',
    colorHex: '#3b82f6',
    xpReward: 0,
    criteria: 'Tích lũy 1000 XP',
    rarity: 'rare',
    tier: 'gold',
    category: 'mastery',
  },
  {
    key: 'xp_5000',
    name: 'XP Legend',
    nameVi: 'Huyền thoại XP',
    description: 'Earn 5000 total XP',
    descriptionVi: 'Tích lũy 5000 XP',
    iconEmoji: '🌟',
    colorHex: '#a855f7',
    xpReward: 0,
    criteria: 'Tích lũy 5000 XP',
    rarity: 'epic',
    tier: 'platinum',
    category: 'mastery',
  },
];

export interface XPLevel {
  level: number;
  title: string;
  titleVi: string;
  minXp: number;
  maxXp: number;
  icon: string;
}

// Default XP level definitions
export const DEFAULT_LEVELS: XPLevel[] = [
  { level: 1, title: 'Rookie', titleVi: 'Tân binh', minXp: 0, maxXp: 100, icon: '🌱' },
  { level: 2, title: 'Explorer', titleVi: 'Khám phá', minXp: 100, maxXp: 300, icon: '⭐' },
  { level: 3, title: 'Builder', titleVi: 'Người xây', minXp: 300, maxXp: 600, icon: '🛠️' },
  { level: 4, title: 'Designer', titleVi: 'Thiết kế', minXp: 600, maxXp: 1000, icon: '🎨' },
  { level: 5, title: 'Engineer', titleVi: 'Kỹ sư', minXp: 1000, maxXp: 1500, icon: '⚙️' },
  { level: 6, title: 'Inventor', titleVi: 'Sáng tạo', minXp: 1500, maxXp: 2200, icon: '💡' },
  { level: 7, title: 'Master', titleVi: 'Chuyên gia', minXp: 2200, maxXp: 3000, icon: '🏆' },
  { level: 8, title: 'Champion', titleVi: 'Vô địch', minXp: 3000, maxXp: 4000, icon: '🏅' },
  { level: 9, title: 'Legend', titleVi: 'Huyền thoại', minXp: 4000, maxXp: 5500, icon: '🌟' },
  { level: 10, title: 'RoboMaster', titleVi: 'Robot', minXp: 5500, maxXp: 99999, icon: '🤖' },
];

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  avatarEmoji: string;
  xp: number;
  level: number;
  levelTitle: string;
  levelTitleVi: string;
  streak: number;
  isCurrentUser?: boolean;
  /** Change in rank since last update (positive = moved up) */
  rankChange?: number;
  /** XP earned in current period (for daily/weekly) */
  periodXp?: number;
}

export type LeaderboardTimeframe = 'daily' | 'weekly' | 'all';

export interface LeaderboardWithUser extends LeaderboardEntry {
  rankChange: number;
}

export interface FriendComparisonEntry extends LeaderboardEntry {
  xpDifference: number;
  rankDifference: number;
  comparisonLabel: string;
}

export interface GhostLeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  avatarEmoji: string;
  raceTimeMs: number;
  ghostId: string;
  completedAt: string;
  isCurrentUser?: boolean;
}

export interface GoldCupWinner {
  studentId: string;
  studentName: string;
  avatarEmoji: string;
  raceTimeMs: number;
  wonAt: string;
  cupCount: number;
}

export interface GamificationProfile {
  studentId: string;
  xp: number;
  level: number;
  levelTitle: string;
  levelTitleVi: string;
  badges: Badge[];
  streak: number;
  rank?: number;
}

/**
 * XP earning rules and multipliers
 */
export interface XPEarningRule {
  action: string;
  baseXP: number;
  description: string;
  descriptionVi: string;
}

export const XP_EARNING_RULES: XPEarningRule[] = [
  { action: 'lesson_complete', baseXP: 10, description: 'Complete a lesson', descriptionVi: 'Hoàn thành bài học' },
  { action: 'mission_complete', baseXP: 25, description: 'Complete a mission', descriptionVi: 'Hoàn thành nhiệm vụ' },
  { action: 'daily_login', baseXP: 5, description: 'Daily login bonus', descriptionVi: 'Đăng nhập hàng ngày' },
  { action: 'help_peer', baseXP: 15, description: 'Help a peer', descriptionVi: 'Giúp đỡ bạn học' },
  { action: 'challenge_win', baseXP: 50, description: 'Win a challenge', descriptionVi: 'Thắng thử thách' },
  { action: 'perfect_score', baseXP: 20, description: 'Get a perfect score', descriptionVi: 'Đạt điểm hoàn hảo' },
  { action: 'streak_bonus', baseXP: 10, description: 'Streak bonus', descriptionVi: 'Thưởng chuỗi' },
];

/**
 * Calculate XP with multipliers applied
 */
export function calculateXPWithMultipliers(
  baseXP: number,
  options: {
    streakDays?: number;
    isWeekend?: boolean;
    isHoliday?: boolean;
    isFirstOfDay?: boolean;
  } = {}
): { finalXP: number; multiplier: number; breakdown: string[] } {
  let multiplier = 1.0;
  const breakdown: string[] = [];

  // Base XP
  breakdown.push(`Base: ${baseXP} XP`);

  // Streak multiplier (every 3 days adds 0.1, max 0.5)
  if (options.streakDays && options.streakDays > 0) {
    const streakBonus = Math.min(0.5, Math.floor(options.streakDays / 3) * 0.1);
    if (streakBonus > 0) {
      multiplier += streakBonus;
      breakdown.push(`Streak (${options.streakDays} days): x${streakBonus.toFixed(1)}`);
    }
  }

  // Weekend bonus (1.2x)
  if (options.isWeekend) {
    multiplier *= 1.2;
    breakdown.push('Weekend: x1.2');
  }

  // Holiday bonus (1.5x)
  if (options.isHoliday) {
    multiplier *= 1.5;
    breakdown.push('Holiday: x1.5');
  }

  // First login of the day bonus (1.5x)
  if (options.isFirstOfDay) {
    multiplier *= 1.5;
    breakdown.push('First login: x1.5');
  }

  const finalXP = Math.floor(baseXP * multiplier);
  return { finalXP, multiplier, breakdown };
}

/**
 * Get level from XP amount
 */
export function getLevelFromXP(xp: number, levels: XPLevel[] = DEFAULT_LEVELS): XPLevel {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].minXp) {
      return levels[i];
    }
  }
  return levels[0];
}

/**
 * Calculate XP needed for next level
 */
export function getXPForNextLevel(currentXP: number, levels: XPLevel[] = DEFAULT_LEVELS): { nextLevel: XPLevel | null; xpNeeded: number } {
  const currentLevel = getLevelFromXP(currentXP, levels);
  const currentLevelIndex = levels.findIndex(l => l.level === currentLevel.level);

  if (currentLevelIndex >= levels.length - 1) {
    return { nextLevel: null, xpNeeded: 0 }; // Max level reached
  }

  const nextLevel = levels[currentLevelIndex + 1];
  const xpNeeded = nextLevel.minXp - currentXP;
  return { nextLevel, xpNeeded };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }
  return data;
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export const gamificationApi = {
  /**
   * Get user's gamification profile (XP, level, badges)
   */
  getProfile: async (token: string, studentId?: string): Promise<GamificationProfile> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const userId = studentId || pocketbase.authStore.model?.id;
      if (!userId) throw new Error('User not authenticated');

      // Get XP record
      let xpRecord: any = null;
      try {
        xpRecord = await pocketbase.collection('user_xp').getFirstListItem("user_id='" + userId + "'");
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      // Get earned badges
      let earnedBadges: any[] = [];
      try {
        const result = await pocketbase.collection('user_badges').getList(1, 100, {
          filter: "user_id='" + userId + "'",
          expand: 'badges',
          skipTotal: false,
        });
        earnedBadges = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      const xp = xpRecord?.xp || 0;

      // Get level definitions
      let levels: any[] = [];
      try {
        const result = await pocketbase.collection('xp_levels').getList(1, 100, {
          sort: '-min_xp',
        });
        levels = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      const level = levels?.find((l: any) => xp >= l.min_xp && xp <= l.max_xp) || { level: 1, title: 'Rookie', title_vi: 'Tân binh' };

      const badges: Badge[] = (earnedBadges || []).map((ub: any) => ({
        id: ub.expand?.badges?.id || ub.badge_key,
        key: ub.badge_key,
        name: ub.expand?.badges?.name || ub.badge_key,
        nameVi: ub.expand?.badges?.name_vi || ub.badge_key,
        description: ub.expand?.badges?.description || '',
        descriptionVi: ub.expand?.badges?.description_vi || '',
        colorHex: ub.expand?.badges?.color_hex || '#3b82f6',
        xpReward: ub.expand?.badges?.xp_reward || 0,
        earnedAt: ub.earned_at,
        criteria: ub.expand?.badges?.criteria || '',
      }));

      return {
        studentId: userId,
        xp,
        level: level.level || 1,
        levelTitle: level.title || 'Rookie',
        levelTitleVi: level.title_vi || 'Tân binh',
        badges,
        streak: xpRecord?.streak || 0,
      };
    }

    const url = studentId
      ? `${API_BASE}/api/gamification/profile?studentId=${studentId}`
      : `${API_BASE}/api/gamification/profile`;
    const response = await fetch(url, {
      headers: authHeaders(token),
    });
    return handleResponse<GamificationProfile>(response);
  },

  /**
   * Award XP to a student with level-up detection
   */
  awardXP: async (token: string, studentId: string, amount: number, reason: string): Promise<{ newXp: number; levelUp: boolean; newLevel?: XPLevel }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let xpRecord: any = null;
      try {
        xpRecord = await pocketbase.collection('user_xp').getFirstListItem("user_id='" + studentId + "'");
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      // Get current level before XP is added
      const currentXp = xpRecord?.xp || 0;
      const currentLevel = xpRecord?.level || 1;
      const oldLevel = currentLevel;

      // Calculate new XP
      const newXp = currentXp + amount;

      // Get level definitions to check for level-up
      let levels: any[] = [];
      try {
        const result = await pocketbase.collection('xp_levels').getList(1, 100, { sort: '+level' });
        levels = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      // Fallback to default levels if no DB levels exist
      if (levels.length === 0) {
        levels = DEFAULT_LEVELS;
      }

      // Find new level based on new XP
      let newLevelObj = levels.find((l: any) => newXp >= (l.min_xp || l.minXp) && newXp <= (l.max_xp || l.maxXp));
      if (!newLevelObj) {
        // If XP exceeds all levels, put at max level
        newLevelObj = levels[levels.length - 1];
      }
      const newLevelNum = newLevelObj?.level || newLevelObj?.level || currentLevel + 1;
      const leveledUp = newLevelNum > oldLevel;

      // Update XP record with new XP and level
      try {
        if (xpRecord?.id) {
          await pocketbase.collection('user_xp').update(xpRecord.id, {
            xp: newXp,
            level: newLevelNum,
          });
        } else {
          await pocketbase.collection('user_xp').create({
            user_id: studentId,
            xp: newXp,
            level: newLevelNum,
            streak: 0,
          });
        }
      } catch (e: any) {
        // Silently ignore create/update errors
      }

      // Log XP transaction for history
      try {
        await pocketbase.collection('xp_transactions').create({
          user_id: studentId,
          amount: amount,
          reason: reason,
          xp_before: currentXp,
          xp_after: newXp,
          level_before: oldLevel,
          level_after: newLevelNum,
          created_at: new Date().toISOString(),
        });
      } catch (e: any) {
        // Silently ignore - xp_transactions collection may not exist
      }

      return {
        newXp,
        levelUp: leveledUp,
        newLevel: leveledUp ? {
          level: newLevelNum,
          title: newLevelObj?.title || newLevelObj?.titleVi || 'Level Up',
          titleVi: newLevelObj?.title_vi || newLevelObj?.titleVi || 'Lên cấp',
          minXp: newLevelObj?.min_xp || newLevelObj?.minXp || 0,
          maxXp: newLevelObj?.max_xp || newLevelObj?.maxXp || 99999,
          icon: newLevelObj?.icon || '⭐',
        } : undefined,
      };
    }

    const response = await fetch(`${API_BASE}/api/gamification/xp`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ studentId, amount, reason }),
    });
    return handleResponse(response);
  },

  /**
   * Spend XP (deduct from balance)
   * Returns false if insufficient XP
   */
  spendXP: async (token: string, studentId: string, amount: number, reason: string): Promise<{ success: boolean; newXp: number; error?: string }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let xpRecord: any = null;
      try {
        xpRecord = await pocketbase.collection('user_xp').getFirstListItem("user_id='" + studentId + "'");
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      const currentXp = xpRecord?.xp || 0;

      if (currentXp < amount) {
        return { success: false, newXp: currentXp, error: 'Insufficient XP' };
      }

      const newXp = currentXp - amount;

      try {
        if (xpRecord?.id) {
          await pocketbase.collection('user_xp').update(xpRecord.id, {
            xp: newXp,
          });
        }
      } catch (e: any) {
        // Silently ignore
      }

      // Log XP spend transaction
      try {
        await pocketbase.collection('xp_transactions').create({
          user_id: studentId,
          amount: -amount,
          reason: reason,
          xp_before: currentXp,
          xp_after: newXp,
          level_before: xpRecord?.level || 1,
          level_after: xpRecord?.level || 1,
          created_at: new Date().toISOString(),
        });
      } catch (e: any) {
        // Silently ignore
      }

      return { success: true, newXp };
    }

    // Fallback: always succeed for mock
    return { success: true, newXp: currentXp - amount };
  },

  /**
   * Get all available badges (with earned status)
   */
  getBadges: async (token: string, studentId?: string): Promise<{ badges: Badge[]; earnedCount: number; totalCount: number }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const userId = studentId || pocketbase.authStore.model?.id;

      let allBadges: any[] = [];
      try {
        const result = await pocketbase.collection('badges').getList(1, 500);
        allBadges = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      let earnedBadgeKeys: string[] = [];
      if (userId) {
        try {
          const result = await pocketbase.collection('user_badges').getList(1, 500, {
            filter: "user_id='" + userId + "'",
          });
          earnedBadgeKeys = result.items.map((e: any) => e.badge_key);
        } catch (e: any) {
          if (e.status !== 404) throw e;
        }
      }

      const badges: Badge[] = (allBadges || []).map((b: any) => ({
        id: b.id,
        key: b.key,
        name: b.name,
        nameVi: b.name_vi,
        description: b.description,
        descriptionVi: b.description_vi,
        colorHex: b.color_hex,
        xpReward: b.xp_reward,
        criteria: b.criteria,
        rarity: b.rarity,
        earnedAt: earnedBadgeKeys.includes(b.key) ? new Date().toISOString() : undefined,
      }));

      return {
        badges,
        earnedCount: earnedBadgeKeys.length,
        totalCount: badges.length,
      };
    }

    const url = studentId
      ? `${API_BASE}/api/gamification/badges?studentId=${studentId}`
      : `${API_BASE}/api/gamification/badges`;
    const response = await fetch(url, {
      headers: authHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Award a badge to a student
   */
  awardBadge: async (token: string, studentId: string, badgeKey: string): Promise<{ badge: Badge; newBadges: string[] }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let badge: any = null;
      try {
        badge = await pocketbase.collection('badges').getFirstListItem("key='" + badgeKey + "'");
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!badge) throw new Error('Badge not found');

      await pocketbase.collection('user_badges').create({
        user_id: studentId,
        badge_key: badgeKey,
        earned_at: new Date().toISOString(),
      });

      return {
        badge: {
          id: badge.id,
          key: badge.key,
          name: badge.name,
          nameVi: badge.name_vi,
          description: badge.description,
          descriptionVi: badge.description_vi,
          colorHex: badge.color_hex,
          xpReward: badge.xp_reward,
          earnedAt: new Date().toISOString(),
          criteria: badge.criteria,
        },
        newBadges: [badgeKey],
      };
    }

    const response = await fetch(`${API_BASE}/api/gamification/badges/award`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ studentId, badgeKey }),
    });
    return handleResponse(response);
  },

  /**
   * Get leaderboard (top students)
   */
  getLeaderboard: async (token: string, limit: number = 10): Promise<{ entries: LeaderboardEntry[]; userRank?: number }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let entries: any[] = [];
      try {
        const result = await pocketbase.collection('user_xp').getList(1, limit, {
          sort: '-xp',
          expand: 'users',
        });
        entries = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      let levels: any[] = [];
      try {
        const result = await pocketbase.collection('xp_levels').getList(1, 100);
        levels = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      return {
        entries: (entries || []).map((e: any, idx: number) => {
          const level = levels?.find((l: any) => e.xp >= l.min_xp && e.xp <= l.max_xp);
          return {
            rank: idx + 1,
            studentId: e.user_id,
            studentName: e.expand?.users?.full_name || 'Unknown',
            avatarEmoji: e.expand?.users?.avatar_emoji || '🤖',
            xp: e.xp || 0,
            level: level?.level || 1,
            levelTitle: level?.title || 'Rookie',
            levelTitleVi: level?.title_vi || 'Tân binh',
            streak: e.streak || 0,
          };
        }),
      };
    }

    const response = await fetch(`${API_BASE}/api/gamification/leaderboard?limit=${limit}`, {
      headers: authHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Get user's rank
   */
  getUserRank: async (token: string, studentId: string): Promise<{ rank: number; totalStudents: number }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let userXp: any = null;
      try {
        userXp = await pocketbase.collection('user_xp').getFirstListItem("user_id='" + studentId + "'");
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!userXp) return { rank: 0, totalStudents: 0 };

      let higherCount = 0;
      try {
        const higher = await pocketbase.collection('user_xp').getList(1, 1, {
          filter: "xp>" + userXp.xp,
          skipTotal: false,
        });
        higherCount = higher.totalItems;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      let totalCount = 0;
      try {
        const total = await pocketbase.collection('user_xp').getList(1, 1, {
          skipTotal: false,
        });
        totalCount = total.totalItems;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      return { rank: higherCount + 1, totalStudents: totalCount || 0 };
    }

    const response = await fetch(`${API_BASE}/api/gamification/rank/${studentId}`, {
      headers: authHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Get level definitions
   */
  getLevels: async (): Promise<{ levels: XPLevel[] }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let levels: any[] = [];
      try {
        const result = await pocketbase.collection('xp_levels').getList(1, 100, {
          sort: '+level',
        });
        levels = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (levels.length > 0) {
        return {
          levels: levels.map((l: any) => ({
            level: l.level,
            title: l.title,
            titleVi: l.title_vi,
            minXp: l.min_xp,
            maxXp: l.max_xp,
            icon: l.icon || '⭐',
          })),
        };
      }
    }

    const response = await fetch(`${API_BASE}/api/gamification/levels`);
    return handleResponse(response);
  },

  /**
   * Complete mission flow and award XP/badges
   */
  completeMissionFlow: async (token: string, studentId: string, missionId: string, phase: 'lesson' | 'challenge' | 'practice' | 'review'): Promise<{ xpEarned: number; badgesEarned: Badge[]; levelUp: boolean }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const xpAmounts = { lesson: 50, challenge: 100, practice: 25, review: 30 };
      const amount = xpAmounts[phase];
      await gamificationApi.awardXP(token, studentId, amount, `mission_${phase}`);
      return { xpEarned: amount, badgesEarned: [], levelUp: false };
    }

    const response = await fetch(`${API_BASE}/api/gamification/mission-complete`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ studentId, missionId, phase }),
    });
    return handleResponse(response);
  },

  /**
   * Get ghost racing leaderboard (top racers)
   */
  getGhostLeaderboard: async (token: string, limit: number = 10): Promise<GhostLeaderboardEntry[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let entries: any[] = [];
      try {
        const result = await pocketbase.collection('ghost_races').getList(1, limit, {
          sort: '+race_time_ms',
          expand: 'users',
        });
        entries = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      return (entries || []).map((e: any, idx: number) => ({
        rank: idx + 1,
        studentId: e.user_id,
        studentName: e.expand?.users?.full_name || 'Unknown',
        avatarEmoji: e.expand?.users?.avatar_emoji || '🤖',
        raceTimeMs: e.race_time_ms,
        ghostId: e.id,
        completedAt: e.completed_at,
      }));
    }

    const response = await fetch(`${API_BASE}/api/ghost-leaderboard?limit=${limit}`, {
      headers: authHeaders(token),
    });
    return handleResponse<GhostLeaderboardEntry[]>(response);
  },

  /**
   * Get Gold Cup winner for ghost racing
   */
  getGoldCupWinner: async (token: string): Promise<GoldCupWinner | null> => {
    try {
      if (isPocketBaseConfigured() && pocketbase) {
        let winner: any = null;
        try {
          const result = await pocketbase.collection('gold_cup_winners').getList(1, 1, {
            sort: '-won_at',
            expand: 'users',
          });
          winner = result.items[0] || null;
        } catch (e: any) {
          if (e.status !== 404) throw e;
        }

        if (!winner) return null;
        return {
          studentId: winner.user_id,
          studentName: winner.expand?.users?.full_name || 'Unknown',
          avatarEmoji: winner.expand?.users?.avatar_emoji || '🏆',
          raceTimeMs: winner.race_time_ms,
          wonAt: winner.won_at,
          cupCount: winner.cup_count || 1,
        };
      }

      const response = await fetch(`${API_BASE}/api/ghost-leaderboard/gold-cup`, {
        headers: authHeaders(token),
      });
      if (!response.ok) return null;
      return handleResponse<GoldCupWinner>(response);
    } catch {
      return null;
    }
  },

  /**
   * Get current user's ghost racing rank
   */
  getUserGhostRank: async (token: string): Promise<number | null> => {
    try {
      if (isPocketBaseConfigured() && pocketbase) {
        const userId = pocketbase.authStore.model?.id;
        if (!userId) return null;

        let userRace: any = null;
        try {
          const result = await pocketbase.collection('ghost_races').getList(1, 1, {
            filter: "user_id='" + userId + "'",
            sort: '+race_time_ms',
          });
          userRace = result.items[0] || null;
        } catch (e: any) {
          if (e.status !== 404) throw e;
        }

        if (!userRace) return null;

        let fasterCount = 0;
        try {
          const faster = await pocketbase.collection('ghost_races').getList(1, 1, {
            filter: "race_time_ms<" + userRace.race_time_ms,
            skipTotal: false,
          });
          fasterCount = faster.totalItems;
        } catch (e: any) {
          if (e.status !== 404) throw e;
        }

        return fasterCount + 1;
      }

      const response = await fetch(`${API_BASE}/api/ghost-leaderboard/my-rank`, {
        headers: authHeaders(token),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.rank;
    } catch {
      return null;
    }
  },

  /**
   * Get leaderboard with timeframe (daily, weekly, all-time)
   * Daily resets at midnight, weekly resets on Monday
   */
  getLeaderboardByTimeframe: async (
    token: string,
    timeframe: LeaderboardTimeframe,
    limit: number = 10
  ): Promise<{ entries: LeaderboardEntry[]; userRank?: number }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const userId = pocketbase.authStore.model?.id;

      // Calculate date filters
      const now = new Date();
      let dateFilter = '';
      if (timeframe === 'daily') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = `updated_at>='${startOfDay.toISOString()}'`;
      } else if (timeframe === 'weekly') {
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = `updated_at>='${startOfWeek.toISOString()}'`;
      }
      // 'all' has no date filter

      // Build query options
      const queryOptions: any = {
        sort: '-xp',
        expand: 'users',
      };
      if (dateFilter) {
        queryOptions.filter = dateFilter;
      }

      let entries: any[] = [];
      try {
        const result = await pocketbase.collection('user_xp').getList(1, limit, queryOptions);
        entries = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      let levels: any[] = [];
      try {
        const result = await pocketbase.collection('xp_levels').getList(1, 100);
        levels = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      // Get user's XP record for comparison
      let userXpRecord: any = null;
      if (userId) {
        try {
          userXpRecord = await pocketbase.collection('user_xp').getFirstListItem("user_id='" + userId + "'");
        } catch (e: any) {
          if (e.status !== 404) throw e;
        }
      }

      // Calculate period XP for daily/weekly
      let periodXp = 0;
      if (userXpRecord && (timeframe === 'daily' || timeframe === 'weekly')) {
        periodXp = userXpRecord.xp || 0; // Would need period_xp field for accurate tracking
      }

      const mappedEntries = (entries || []).map((e: any, idx: number) => {
        const level = levels?.find((l: any) => e.xp >= l.min_xp && e.xp <= l.max_xp);
        return {
          rank: idx + 1,
          studentId: e.user_id,
          studentName: e.expand?.users?.full_name || 'Unknown',
          avatarEmoji: e.expand?.users?.avatar_emoji || '🤖',
          xp: e.xp || 0,
          level: level?.level || 1,
          levelTitle: level?.title || 'Rookie',
          levelTitleVi: level?.title_vi || 'Tân binh',
          streak: e.streak || 0,
          periodXp: timeframe !== 'all' ? periodXp : undefined,
        };
      });

      // Find user's rank
      let userRank: number | undefined;
      if (userId) {
        const userEntry = mappedEntries.find((e: any) => e.studentId === userId);
        userRank = userEntry?.rank;
      }

      return { entries: mappedEntries, userRank };
    }

    const response = await fetch(
      `${API_BASE}/api/gamification/leaderboard?limit=${limit}&timeframe=${timeframe}`,
      { headers: authHeaders(token) }
    );
    return handleResponse(response);
  },

  /**
   * Get friends leaderboard comparison
   * Shows how the current user compares to their friends
   */
  getFriendsLeaderboard: async (
    token: string,
    friendIds: string[],
    limit: number = 20
  ): Promise<{ entries: LeaderboardEntry[]; userRank?: number }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const userId = pocketbase.authStore.model?.id;
      if (!userId) return { entries: [] };

      // Include user's own ID
      const allIds = [...new Set([userId, ...friendIds])];

      let entries: any[] = [];
      try {
        // Build filter for all IDs
        const filter = allIds.map(id => `user_id='${id}'`).join(' || ');
        const result = await pocketbase.collection('user_xp').getList(1, limit, {
          filter,
          sort: '-xp',
          expand: 'users',
        });
        entries = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      let levels: any[] = [];
      try {
        const result = await pocketbase.collection('xp_levels').getList(1, 100);
        levels = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      const mappedEntries = (entries || []).map((e: any, idx: number) => {
        const level = levels?.find((l: any) => e.xp >= l.min_xp && e.xp <= l.max_xp);
        return {
          rank: idx + 1,
          studentId: e.user_id,
          studentName: e.expand?.users?.full_name || 'Unknown',
          avatarEmoji: e.expand?.users?.avatar_emoji || '🤖',
          xp: e.xp || 0,
          level: level?.level || 1,
          levelTitle: level?.title || 'Rookie',
          levelTitleVi: level?.title_vi || 'Tân binh',
          streak: e.streak || 0,
          isCurrentUser: e.user_id === userId,
        };
      });

      // Sort by XP descending and reassign ranks
      mappedEntries.sort((a, b) => b.xp - a.xp);
      mappedEntries.forEach((entry, idx) => {
        entry.rank = idx + 1;
      });

      const userRank = mappedEntries.find((e: any) => e.studentId === userId)?.rank;

      return { entries: mappedEntries, userRank };
    }

    const response = await fetch(
      `${API_BASE}/api/gamification/friends?friendIds=${friendIds.join(',')}&limit=${limit}`,
      { headers: authHeaders(token) }
    );
    return handleResponse(response);
  },
};