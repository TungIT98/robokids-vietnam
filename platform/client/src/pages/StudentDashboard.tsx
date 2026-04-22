/**
 * StudentDashboard - Gamified student home screen
 * Shows mission progress, badges, XP display with animated reward system.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { missionsApi, DailyMission } from '../services/missionsApi';
import RecommendationCards from '../components/RecommendationCards';
import { BadgeUnlockAnimation, useBadgeUnlockAnimation } from '../components/gamification';
import { Badge, DEFAULT_BADGES, BADGE_TIER_INFO, BADGE_CATEGORY_INFO } from '../services/gamificationApi';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

// Leveling: 100 XP per level
function getLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}
function getXpInLevel(xp: number): number {
  return xp - Math.floor(xp / 100) * 100;
}
function getXpForNextLevel(xp: number): number {
  return 100 - getXpInLevel(xp);
}

interface UserStats {
  xp: number;
  level: number;
  xpInCurrentLevel: number;
  currentStreak: number;
  completedLessons: number;
  completedMissions: number;
  league: 'bronze' | 'silver' | 'gold' | 'platinum';
  leaderboardRank: number | null;
  totalUsers: number;
}

interface RewardToast {
  id: string;
  type: 'xp' | 'badge' | 'level_up';
  message: string;
  emoji: string;
}

// Local badge type for dashboard display (simpler than gamificationApi Badge)
interface DashboardBadge {
  id: string;
  slug: string;
  name: string;
  nameVi: string;
  iconEmoji: string;
  colorHex: string;
  earned: boolean;
  earnedAt?: string;
}

const LEAGUE_INFO: Record<string, { emoji: string; color: string; bgColor: string }> = {
  bronze: { emoji: '🥉', color: '#cd7f32', bgColor: '#fef3c7' },
  silver: { emoji: '🥈', color: '#c0c0c0', bgColor: '#f3f4f6' },
  gold: { emoji: '🥇', color: '#fbbf24', bgColor: '#fef9c3' },
  platinum: { emoji: '💎', color: '#8b5cf6', bgColor: '#f3e8ff' },
};

const STREAK_EMOJIS: Record<number, string> = {
  1: '🌱', 2: '🌿', 3: '🌳', 5: '⭐', 7: '🚀', 14: '🔥', 30: '💎',
};

function getStreakEmoji(streak: number): string {
  const keys = Object.keys(STREAK_EMOJIS).map(Number).sort((a, b) => b - a);
  for (const k of keys) {
    if (streak >= k) return STREAK_EMOJIS[k];
  }
  return '💪';
}

export default function StudentDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>([]);
  const [activeMissions, setActiveMissions] = useState<any[]>([]);
  const [recentBadges, setRecentBadges] = useState<DashboardBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rewards, setRewards] = useState<RewardToast[]>([]);
  const rewardIdRef = useRef(0);

  // Badge unlock animation hook
  const { showUnlock, BadgeUnlockModal } = useBadgeUnlockAnimation();

  // Helper to get full badge data from slug
  function getBadgeFromSlug(slug: string): Badge | null {
    const defaultBadge = DEFAULT_BADGES.find(b => b.key === slug);
    if (defaultBadge) {
      return {
        id: slug,
        key: defaultBadge.key,
        name: defaultBadge.name,
        nameVi: defaultBadge.nameVi,
        description: defaultBadge.description,
        descriptionVi: defaultBadge.descriptionVi,
        iconEmoji: defaultBadge.iconEmoji,
        colorHex: defaultBadge.colorHex,
        xpReward: defaultBadge.xpReward,
        rarity: defaultBadge.rarity,
        tier: defaultBadge.tier,
        category: defaultBadge.category,
      };
    }
    // Fallback if badge not found in defaults
    return {
      id: slug,
      key: slug,
      name: slug,
      nameVi: slug,
      description: 'Huy hiệu đạt được',
      descriptionVi: 'Huy hiệu đạt được',
      iconEmoji: '🏅',
      colorHex: '#ffd700',
      xpReward: 0,
      rarity: 'common',
      tier: 'bronze',
      category: 'special',
    };
  }

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    loadData();
  }, [token, navigate]);

  function addReward(type: RewardToast['type'], message: string, emoji: string) {
    const id = `reward-${++rewardIdRef.current}`;
    setRewards(prev => [...prev, { id, type, message, emoji }]);
    setTimeout(() => {
      setRewards(prev => prev.filter(r => r.id !== id));
    }, 4000);
  }

  async function loadData() {
    if (!token) return;
    setIsLoading(true);
    try {
      const [statsRes, dailyRes, activeRes, badgesRes] = await Promise.all([
        fetch(`${API_BASE}/api/progress/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        missionsApi.getDailyMissions(token),
        missionsApi.getUserActiveMissions(token),
        fetch(`${API_BASE}/api/progress/badges?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        const xp = data.xp || 0;
        const level = data.level || getLevel(xp);
        const league = xp >= 1000 ? 'platinum' : xp >= 500 ? 'gold' : xp >= 200 ? 'silver' : 'bronze';
        setStats({
          xp,
          level,
          xpInCurrentLevel: getXpInLevel(xp),
          currentStreak: data.currentStreak || 0,
          completedLessons: data.completedLessons || 0,
          completedMissions: data.completedMissions || 0,
          league,
          leaderboardRank: data.leaderboardRank || null,
          totalUsers: data.totalUsers || 0,
        });
      }

      setDailyMissions(dailyRes);
      setActiveMissions(activeRes);

      if (badgesRes.ok) {
        const badgesData = await badgesRes.json();
        setRecentBadges(badgesData.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmitMission(missionId: string) {
    if (!token) return;
    try {
      const result = await missionsApi.submitMission(missionId, token);
      if (result.success) {
        addReward('xp', `+${result.mission.xpEarned} XP`, '⭐');
        if (result.mission.badgeEarned) {
          // Show celebratory badge unlock animation
          const badgeData = getBadgeFromSlug(result.mission.badgeEarned);
          setTimeout(() => {
            showUnlock(badgeData);
          }, 1000);
        }
        loadData();
      }
    } catch (err) {
      console.error('Failed to submit mission:', err);
    }
  }

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingEmoji}>🤖</div>
        <p style={styles.loadingText}>Đang tải dashboard...</p>
      </div>
    );
  }

  const statsData = stats || {
    xp: 0, level: 1, xpInCurrentLevel: 0, currentStreak: 0,
    completedLessons: 0, completedMissions: 0, league: 'bronze' as const,
    leaderboardRank: null, totalUsers: 0,
  };

  const league = LEAGUE_INFO[statsData.league];
  const xpPercent = (statsData.xpInCurrentLevel / 100) * 100;
  const nextLevelXp = getXpForNextLevel(statsData.xp);

  const userName = user?.full_name || 'Học sinh';

  return (
    <div style={styles.container}>
      {/* Reward Toasts */}
      <div style={styles.rewardContainer}>
        {rewards.map(r => (
          <div key={r.id} style={styles.rewardToast}>
            <span style={styles.rewardEmoji}>{r.emoji}</span>
            <span>{r.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.greeting}>
            <span style={styles.greetingEmoji}>👋</span>
            <div>
              <h1 style={styles.welcomeTitle}>Chào {userName}!</h1>
              <p style={styles.greetingSubtext}>
                {getStreakEmoji(statsData.currentStreak)} {statsData.currentStreak} ngày học liên tiếp
              </p>
            </div>
          </div>
        </div>
        {/* Quick stats row */}
        <div style={styles.quickStatsRow}>
          <div style={{ ...styles.quickStatItem, borderColor: league.color }}>
            <span style={styles.quickStatEmoji}>{league.emoji}</span>
            <span style={styles.quickStatLabel}>Level {statsData.level}</span>
          </div>
          <div style={styles.quickStatDivider} />
          <div style={styles.quickStatItem}>
            <span style={styles.quickStatEmoji}>⭐</span>
            <span style={styles.quickStatLabel}>{statsData.xp} XP</span>
          </div>
          <div style={styles.quickStatDivider} />
          <div style={styles.quickStatItem}>
            <span style={styles.quickStatEmoji}>🏅</span>
            <span style={styles.quickStatLabel}>{recentBadges.filter(b => b.earned).length} huy hiệu</span>
          </div>
          {statsData.leaderboardRank && (
            <>
              <div style={styles.quickStatDivider} />
              <div style={styles.quickStatItem}>
                <span style={styles.quickStatEmoji}>🏆</span>
                <span style={styles.quickStatLabel}>Top #{statsData.leaderboardRank}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={styles.content}>
        {/* Left column */}
        <div style={styles.leftColumn}>
          {/* XP Progress Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>📊 Tiến độ lên cấp</span>
              <span style={{ ...styles.cardBadge, backgroundColor: league.bgColor, color: league.color }}>
                {league.emoji} {statsData.league.toUpperCase()}
              </span>
            </div>
            <div style={styles.levelDisplay}>
              <span style={styles.levelNumber}>Level {statsData.level}</span>
              <span style={styles.levelArrow}>→</span>
              <span style={styles.levelNext}>Level {statsData.level + 1}</span>
            </div>
            <div style={styles.xpBar}>
              <div style={{ ...styles.xpFill, width: `${xpPercent}%` }} />
            </div>
            <div style={styles.xpLabels}>
              <span>{statsData.xpInCurrentLevel} / 100 XP</span>
              <span style={styles.xpNeeded}>{nextLevelXp} XP nữa để lên cấp</span>
            </div>
          </div>

          {/* 3D Academy Banner */}
          <div style={styles.academyBanner} onClick={() => navigate('/space-academy')}>
            <div style={styles.academyBannerContent}>
              <span style={styles.academyEmoji}>🚀</span>
              <div style={styles.academyText}>
                <span style={styles.academyTitle}>Vào học viện 3D</span>
                <span style={styles.academySubtitle}>Khám phá robot & lập trình trong không gian 3D</span>
              </div>
            </div>
            <span style={styles.academyArrow}>→</span>
          </div>

          {/* Quick Actions */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>⚡ Hành động nhanh</span>
            </div>
            <div style={styles.quickActions}>
              <button style={styles.actionButton} onClick={() => navigate('/missions')}>
                <span style={styles.actionEmoji}>🎯</span>
                <span>Nhiệm vụ</span>
              </button>
              <button style={styles.actionButton} onClick={() => navigate('/leaderboard')}>
                <span style={styles.actionEmoji}>🏆</span>
                <span>Bảng xếp hạng</span>
              </button>
              <button style={styles.actionButton} onClick={() => navigate('/badges')}>
                <span style={styles.actionEmoji}>🏅</span>
                <span>Huy hiệu</span>
              </button>
              <button style={styles.actionButton} onClick={() => navigate('/streaks')}>
                <span style={styles.actionEmoji}>🔥</span>
                <span>Chuỗi ngày</span>
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>📈 Thống kê học tập</span>
            </div>
            <div style={styles.statsGrid}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{statsData.completedLessons}</span>
                <span style={styles.statLabel}>📖 Bài học</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{statsData.completedMissions}</span>
                <span style={styles.statLabel}>🎯 Nhiệm vụ</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{statsData.currentStreak}</span>
                <span style={styles.statLabel}>🔥 Chuỗi ngày</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{recentBadges.filter(b => b.earned).length}</span>
                <span style={styles.statLabel}>🏅 Huy hiệu</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={styles.rightColumn}>
          {/* Recommendation Cards */}
          <RecommendationCards maxItems={3} />

          {/* Daily Missions */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>🎯 Nhiệm vụ hôm nay</span>
              <button style={styles.cardLink} onClick={() => navigate('/missions')}>Xem tất cả →</button>
            </div>
            {activeMissions.length > 0 || dailyMissions.length > 0 ? (
              <div style={styles.missionList}>
                {dailyMissions.length > 0 ? dailyMissions.slice(0, 3).map(mission => {
                  const isCompleted = mission.userProgress?.status === 'completed';
                  return (
                    <div key={mission.id} style={styles.missionItem}>
                      <div style={styles.missionIcon}>{mission.iconEmoji}</div>
                      <div style={styles.missionInfo}>
                        <span style={styles.missionName}>{mission.titleVi || mission.title}</span>
                        <span style={styles.missionReward}>+{mission.xpReward} XP</span>
                      </div>
                      {isCompleted ? (
                        <div style={styles.missionDone}>✅</div>
                      ) : (
                        <button
                          style={styles.missionButton}
                          onClick={() => handleSubmitMission(mission.id)}
                        >
                          Hoàn thành
                        </button>
                      )}
                    </div>
                  );
                }) : (
                  <div style={styles.emptyMissions}>
                    <span style={styles.emptyText}>🎯 Chưa có nhiệm vụ hôm nay</span>
                    <p style={styles.emptySubtext}>Hoàn thành bài học để nhận nhiệm vụ!</p>
                    <button style={styles.startButton} onClick={() => navigate('/')}>
                      🚀 Bắt đầu học
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.emptyMissions}>
                <span style={styles.emptyText}>🎯 Chưa có nhiệm vụ hôm nay</span>
                <p style={styles.emptySubtext}>Hoàn thành bài học để nhận nhiệm vụ!</p>
                <button style={styles.startButton} onClick={() => navigate('/')}>
                  🚀 Bắt đầu học
                </button>
              </div>
            )}
          </div>

          {/* Recent Badges */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>🏅 Huy hiệu gần đây</span>
              <button style={styles.cardLink} onClick={() => navigate('/badges')}>Xem tất cả →</button>
            </div>
            {recentBadges.length > 0 ? (
              <div style={styles.badgeRow}>
                {recentBadges.filter(b => b.earned).slice(0, 5).map(badge => (
                  <div key={badge.id} style={{ ...styles.badgeItem, borderColor: badge.colorHex + '40' }}>
                    <div style={{ ...styles.badgeIcon, backgroundColor: badge.colorHex + '20' }}>
                      {badge.iconEmoji}
                    </div>
                    <span style={styles.badgeName}>{badge.nameVi || badge.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyBadges}>
                <span style={styles.emptyText}>Chưa có huy hiệu nào</span>
                <p style={styles.emptySubtext}>Hoàn thành nhiệm vụ để nhận huy hiệu!</p>
              </div>
            )}
          </div>

          {/* League Info */}
          <div style={{ ...styles.card, background: `linear-gradient(135deg, ${league.bgColor} 0%, white 100%)` }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>🏆 Xếp hạng & Liên đoàn</span>
            </div>
            <div style={styles.leagueDisplay}>
              <div style={{ ...styles.leagueBadge, backgroundColor: league.bgColor }}>
                <span style={{ fontSize: '40px' }}>{league.emoji}</span>
                <span style={{ ...styles.leagueName, color: league.color }}>{statsData.league.toUpperCase()}</span>
              </div>
              <div style={styles.leagueStats}>
                {statsData.leaderboardRank ? (
                  <>
                    <span style={styles.leagueRank}>#{statsData.leaderboardRank} trên {statsData.totalUsers}</span>
                    <p style={styles.leagueHint}>Tiếp tục học để leo lên!</p>
                  </>
                ) : (
                  <p style={styles.leagueHint}>Lên thứ hạng cao hơn trong bảng xếp hạng</p>
                )}
              </div>
            </div>
            <button style={{ ...styles.viewLeaderboardBtn, backgroundColor: league.color }} onClick={() => navigate('/leaderboard')}>
              📊 Xem bảng xếp hạng
            </button>
          </div>
        </div>
      </div>

      {/* Badge Unlock Animation */}
      <BadgeUnlockModal />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f4ff',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '12px',
  },
  loadingEmoji: {
    fontSize: '64px',
  },
  loadingText: {
    color: '#666',
    fontSize: '16px',
  },
  rewardContainer: {
    position: 'fixed' as const,
    top: '80px',
    right: '24px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  rewardToast: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '12px 20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#333',
    animation: 'slideIn 0.3s ease-out',
    border: '2px solid #fbbf24',
  },
  rewardEmoji: {
    fontSize: '24px',
  },
  header: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    padding: '24px 32px',
  },
  headerContent: {
    marginBottom: '16px',
  },
  greeting: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  greetingEmoji: {
    fontSize: '36px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
  },
  greetingSubtext: {
    fontSize: '14px',
    opacity: 0.9,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  quickStatsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '12px',
    padding: '12px 20px',
    width: 'fit-content',
  },
  quickStatItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  quickStatEmoji: {
    fontSize: '20px',
  },
  quickStatLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  quickStatDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    padding: '24px 32px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  cardBadge: {
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '4px 10px',
    borderRadius: '8px',
  },
  cardLink: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  levelDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  levelNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#6366f1',
  },
  levelArrow: {
    color: '#999',
    fontSize: '20px',
  },
  levelNext: {
    fontSize: '20px',
    color: '#999',
    fontWeight: 600,
  },
  xpBar: {
    height: '12px',
    backgroundColor: '#e0e0e0',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  xpFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
    borderRadius: '6px',
    transition: 'width 0.5s ease',
  },
  xpLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#666',
  },
  xpNeeded: {
    color: '#6366f1',
    fontWeight: 600,
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  academyBanner: {
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)',
    borderRadius: '16px',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
  },
  academyBannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  academyEmoji: {
    fontSize: '40px',
  },
  academyText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  academyTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
  },
  academySubtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
  },
  academyArrow: {
    fontSize: '24px',
    color: '#6366f1',
    fontWeight: 'bold',
  },
  actionButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '6px',
    padding: '16px 12px',
    backgroundColor: '#f8f9ff',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
  },
  actionEmoji: {
    fontSize: '28px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '12px',
    backgroundColor: '#f8f9ff',
    borderRadius: '10px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
  },
  missionList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  missionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    backgroundColor: '#f8f9ff',
    borderRadius: '10px',
  },
  missionIcon: {
    fontSize: '28px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: '10px',
  },
  missionInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  missionName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
  },
  missionReward: {
    fontSize: '12px',
    color: '#6366f1',
    fontWeight: 600,
  },
  missionDone: {
    fontSize: '20px',
  },
  missionButton: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  emptyMissions: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#666',
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: 600,
    display: 'block',
    marginBottom: '4px',
  },
  emptySubtext: {
    fontSize: '13px',
    margin: '0 0 12px 0',
  },
  startButton: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  badgeRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  badgeItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '10px',
    border: '2px solid',
    borderRadius: '10px',
    minWidth: '70px',
  },
  badgeIcon: {
    fontSize: '28px',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
  },
  badgeName: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#666',
    textAlign: 'center' as const,
    maxWidth: '60px',
  },
  emptyBadges: {
    textAlign: 'center' as const,
    padding: '16px',
    color: '#999',
  },
  leagueDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  leagueBadge: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '12px 16px',
    borderRadius: '12px',
    minWidth: '80px',
  },
  leagueName: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  leagueStats: {
    flex: 1,
  },
  leagueRank: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#333',
    display: 'block',
  },
  leagueHint: {
    fontSize: '12px',
    color: '#666',
    margin: 0,
  },
  viewLeaderboardBtn: {
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
  },
};