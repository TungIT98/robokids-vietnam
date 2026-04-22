/**
 * LeaderboardPage - Enhanced XP leaderboard with Daily/Weekly/All-Time categories
 * Features: Real-time updates, animated rank changes, friend comparison, rewards
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDeferredValue } from '../hooks/useDeferredValue';
import { motion, AnimatePresence } from 'framer-motion';
import {
  gamificationApi,
  LeaderboardEntry,
  LeaderboardTimeframe,
} from '../services/gamificationApi';
import LeaderboardCard from '../components/gamification/LeaderboardCard';
import FriendComparisonCard from '../components/gamification/FriendComparisonCard';

type AgeGroup = 'all' | 'beginner' | 'intermediate' | 'advanced';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

const AGE_GROUP_LABELS: Record<AgeGroup, { label: string; emoji: string; desc: string }> = {
  all: { label: 'Tất cả', emoji: '🌟', desc: 'Mọi lứa tuổi' },
  beginner: { label: 'Mầm non', emoji: '🌱', desc: '6-8 tuổi' },
  intermediate: { label: 'Thiếu niên', emoji: '🌿', desc: '9-12 tuổi' },
  advanced: { label: 'Nghị lực', emoji: '🌳', desc: '13-16 tuổi' },
};

const TIMEFRAME_LABELS: Record<LeaderboardTimeframe, { label: string; emoji: string; desc: string }> = {
  daily: { label: 'Hôm nay', emoji: '📅', desc: 'Top 10 hàng ngày' },
  weekly: { label: 'Tuần này', emoji: '🗓️', desc: 'Xếp hạng tuần' },
  all: { label: 'Mọi thời điểm', emoji: '🏆', desc: 'Huyền thoại' },
};

const LEAGUE_INFO: Record<string, { emoji: string; color: string; bgColor: string; minXp: number }> = {
  bronze: { emoji: '🥉', color: '#cd7f32', bgColor: '#fef3c7', minXp: 0 },
  silver: { emoji: '🥈', color: '#c0c0c0', bgColor: '#f3f4f6', minXp: 200 },
  gold: { emoji: '🥇', color: '#fbbf24', bgColor: '#fef9c3', minXp: 500 },
  platinum: { emoji: '💎', color: '#8b5cf6', bgColor: '#f3e8ff', minXp: 1000 },
};

function getLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

function getXpInLevel(xp: number): number {
  return xp - (Math.floor(xp / 100) * 100);
}

function getRankEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

function getRankColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return '#6b7280';
}

function getLeagueEmoji(league: string): string {
  return LEAGUE_INFO[league]?.emoji || '🥉';
}

function getLeagueColor(league: string): string {
  return LEAGUE_INFO[league]?.color || '#cd7f32';
}

// REWARD_CONFIG for top 3
const TOP_REWARDS: Record<number, { emoji: string; label: string; color: string; xpBonus: number }> = {
  1: { emoji: '👑', label: 'Vô địch', color: '#FFD700', xpBonus: 500 },
  2: { emoji: '🥈', label: 'Á quân', color: '#C0C0C0', xpBonus: 300 },
  3: { emoji: '🥉', label: 'Hạng ba', color: '#CD7F32', xpBonus: 150 },
};

const REALTIME_POLL_INTERVAL = 30000; // 30 seconds

export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [previousEntries, setPreviousEntries] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('daily');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('all');
  const [isRealTime, setIsRealTime] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showFriendComparison, setShowFriendComparison] = useState(false);
  const [friendIds] = useState<string[]>([]); // Would come from friend system

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Deferred values
  const deferredTimeframe = useDeferredValue(timeframe, 100);
  const deferredAgeGroup = useDeferredValue(ageGroup, 100);

  // Calculate rank change for an entry
  const getRankChange = useCallback((studentId: string): number | null => {
    const currentEntry = entries.find(e => e.studentId === studentId);
    const previousRank = previousEntries.get(studentId);
    if (currentEntry === undefined || previousRank === undefined) return null;
    return previousRank - currentEntry.rank; // positive = moved up
  }, [entries, previousEntries]);

  // Load leaderboard data
  const loadLeaderboard = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';

      // Store previous ranks for animation
      const newPreviousMap = new Map<string, number>();
      entries.forEach(e => newPreviousMap.set(e.studentId, e.rank));
      setPreviousEntries(newPreviousMap);

      const result = await gamificationApi.getLeaderboardByTimeframe(token, deferredTimeframe, 20);
      setEntries(result.entries);
      setLastUpdated(new Date());
    } catch (err: any) {
      // Fallback to old API
      try {
        const params = new URLSearchParams({
          limit: '20',
          timeframe: deferredTimeframe === 'daily' ? 'daily' : deferredTimeframe,
          age_group: deferredAgeGroup,
        });
        const response = await fetch(`${API_BASE}/api/progress/leaderboard?${params}`);
        if (!response.ok) throw new Error('Failed to load leaderboard');
        const data = await response.json();
        // Map old format to new format
        const mappedEntries: LeaderboardEntry[] = data.map((e: any, idx: number) => ({
          rank: idx + 1,
          studentId: e.userId,
          studentName: e.name,
          avatarEmoji: e.avatarUrl ? '🤖' : '🤖',
          xp: e.xp,
          level: getLevel(e.xp),
          levelTitle: 'Cadet',
          levelTitleVi: 'Học viên',
          streak: 0,
          isCurrentUser: e.userId === user?.id,
        }));
        setEntries(mappedEntries);
        setLastUpdated(new Date());
      } catch (fallbackErr: any) {
        setError(err.message || fallbackErr.message || 'Failed to load leaderboard');
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [deferredTimeframe, deferredAgeGroup, entries, user?.id]);

  useEffect(() => {
    loadLeaderboard();
  }, [deferredTimeframe, deferredAgeGroup]);

  // Real-time polling
  useEffect(() => {
    if (!isRealTime) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      loadLeaderboard(false);
    }, REALTIME_POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isRealTime, loadLeaderboard]);

  const userRank = useMemo(() => {
    return entries.findIndex(e => e.studentId === user?.id) + 1;
  }, [entries, user?.id]);
  const currentUserEntry = entries.find(e => e.studentId === user?.id);

  // Share achievement to social media
  function shareAchievement() {
    if (!currentUserEntry) return;

    const rank = userRank;
    const xp = currentUserEntry.xp;
    const levelTitle = currentUserEntry.levelTitleVi;

    const text = `🏆 RoboKids Vietnam Leaderboard!\n\nTôi đang ở vị trí #${rank} với ${xp} XP (${levelTitle})!\n\n🌟 Học lập trình robot ngay tại RoboKids Vietnam!`;

    // Try native share API first (mobile)
    if (navigator.share) {
      navigator.share({
        title: 'RoboKids Vietnam Leaderboard',
        text,
        url: window.location.origin + '/leaderboard',
      }).catch(() => {
        // Fallback to copying
        copyToClipboard(text);
      });
    } else {
      // Desktop fallback - copy to clipboard
      copyToClipboard(text);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Nội dung đã được sao chép! Dán vào mạng xã hội để chia sẻ thành tích của bạn nhé!');
    }).catch(() => {
      alert('Không thể sao chép. Hãy chia sẻ trực tiếp từ trình duyệt di động.');
    });
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerTop}>
            <button onClick={() => navigate('/')} style={styles.backButton}>
              ← Quay lại
            </button>
            <h1 style={styles.pageTitle}>🏆 Bảng Xếp Hạng</h1>
          </div>
          <p style={styles.pageSubtitle}>Soán ngôi vô địch và leo lên top!</p>
        </div>

        {/* Filters */}
        <div style={styles.filtersSection}>
          {/* Timeframe filter */}
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Thời gian:</span>
            <div style={styles.filterButtons}>
              {(Object.keys(TIMEFRAME_LABELS) as LeaderboardTimeframe[]).map(tf => {
                const info = TIMEFRAME_LABELS[tf];
                const isActive = timeframe === tf;
                return (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    style={{
                      ...styles.filterButton,
                      ...(isActive ? styles.filterButtonActive : {}),
                    }}
                  >
                    <span>{info.emoji}</span>
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age group filter */}
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Độ tuổi:</span>
            <div style={styles.filterButtons}>
              {(Object.keys(AGE_GROUP_LABELS) as AgeGroup[]).map(ag => {
                const info = AGE_GROUP_LABELS[ag];
                const isActive = ageGroup === ag;
                return (
                  <button
                    key={ag}
                    onClick={() => setAgeGroup(ag)}
                    style={{
                      ...styles.filterButton,
                      ...(isActive ? styles.filterButtonActive : {}),
                    }}
                  >
                    <span>{info.emoji}</span>
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time indicator */}
      <div style={styles.realTimeBar}>
        <div style={styles.realTimeLeft}>
          <div style={{
            ...styles.realTimeIndicator,
            backgroundColor: isRealTime ? '#22c55e' : '#6b7280',
          }} />
          <span style={styles.realTimeText}>
            {isRealTime ? 'Cập nhật tự động' : 'Đã tắt cập nhật tự động'}
          </span>
          {lastUpdated && (
            <span style={styles.lastUpdatedText}>
              • Cập nhật lúc {lastUpdated.toLocaleTimeString('vi-VN')}
            </span>
          )}
        </div>
        <div style={styles.realTimeRight}>
          <button
            onClick={() => setIsRealTime(!isRealTime)}
            style={styles.realTimeToggle}
          >
            {isRealTime ? '⏸️ Tắt' : '▶️ Bật'}
          </button>
          <button
            onClick={() => loadLeaderboard()}
            style={styles.refreshButton}
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {/* Rewards Banner for Top 3 */}
      {entries.length >= 3 && (
        <div style={styles.rewardsBanner}>
          <div style={styles.rewardsBannerTitle}>🎁 Phần thưởng top 3</div>
          <div style={styles.rewardsBannerItems}>
            {Object.entries(TOP_REWARDS).map(([rank, reward]) => (
              <div key={rank} style={{ ...styles.rewardItem, borderColor: reward.color }}>
                <span style={styles.rewardEmoji}>{reward.emoji}</span>
                <span style={{ color: reward.color, fontWeight: 'bold' }}>{reward.label}</span>
                <span style={styles.rewardXp}>+{reward.xpBonus} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={styles.content}>
        {error && (
          <div style={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} style={styles.errorDismiss}>×</button>
          </div>
        )}

        {isLoading ? (
          <div style={styles.loading}>
            <span style={styles.loadingEmoji}>🤖</span>
            <p>Đang tải bảng xếp hạng...</p>
          </div>
        ) : entries.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🏆</span>
            <h2>Chưa có dữ liệu</h2>
            <p>
              {ageGroup !== 'all'
                ? `Chưa có học sinh nào trong nhóm ${AGE_GROUP_LABELS[ageGroup].label}.`
                : 'Hãy làm bài học đầu tiên để bắt đầu!'}
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {entries.length >= 3 && (
              <div style={styles.podiumSection}>
                <div style={styles.podium}>
                  {/* 2nd place */}
                  <motion.div
                    style={{ ...styles.podiumItem, ...styles.podiumSecond }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div style={styles.podiumAvatar}>
                      <div style={{ ...styles.avatarFallback, backgroundColor: '#9ca3af' }}>
                        {entries[1].avatarEmoji}
                      </div>
                    </div>
                    <div style={styles.podiumRank}>{getRankEmoji(2)}</div>
                    <div style={styles.podiumName}>{entries[1].studentName}</div>
                    <div style={styles.podiumXp}>⭐ {entries[1].xp.toLocaleString()} XP</div>
                    <div style={styles.podiumLevel}>Cấp {entries[1].level}</div>
                    <div style={{ ...styles.podiumPedestal, backgroundColor: '#C0C0C0', height: '80px' }}>
                      <span style={styles.podiumPedestalLabel}>2</span>
                    </div>
                  </motion.div>

                  {/* 1st place */}
                  <motion.div
                    style={{ ...styles.podiumItem, ...styles.podiumFirst }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div style={styles.podiumAvatarLarge}>
                      <div style={{ ...styles.avatarFallbackLarge, backgroundColor: '#fbbf24' }}>
                        {entries[0].avatarEmoji}
                      </div>
                      <div style={styles.crownEmoji}>👑</div>
                    </div>
                    <div style={styles.podiumRank}>{getRankEmoji(1)}</div>
                    <div style={styles.podiumNameLarge}>{entries[0].studentName}</div>
                    <div style={styles.podiumXpLarge}>⭐ {entries[0].xp.toLocaleString()} XP</div>
                    <div style={styles.podiumLevelLarge}>Cấp {entries[0].level}</div>
                    <div style={{ ...styles.podiumPedestal, backgroundColor: '#FFD700', height: '110px' }}>
                      <span style={styles.podiumPedestalLabel}>1</span>
                    </div>
                  </motion.div>

                  {/* 3rd place */}
                  <motion.div
                    style={{ ...styles.podiumItem, ...styles.podiumThird }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div style={styles.podiumAvatar}>
                      <div style={{ ...styles.avatarFallback, backgroundColor: '#cd7f32' }}>
                        {entries[2].avatarEmoji}
                      </div>
                    </div>
                    <div style={styles.podiumRank}>{getRankEmoji(3)}</div>
                    <div style={styles.podiumName}>{entries[2].studentName}</div>
                    <div style={styles.podiumXp}>⭐ {entries[2].xp.toLocaleString()} XP</div>
                    <div style={styles.podiumLevel}>Cấp {entries[2].level}</div>
                    <div style={{ ...styles.podiumPedestal, backgroundColor: '#CD7F32', height: '60px' }}>
                      <span style={styles.podiumPedestalLabel}>3</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Current user highlight */}
            {currentUserEntry && (
              <div style={styles.userHighlight}>
                <span style={styles.userHighlightRank}>#{userRank}</span>
                <div style={styles.userHighlightAvatar}>
                  <div style={{ ...styles.avatarFallback, backgroundColor: '#4CAF50' }}>
                    {currentUserEntry.avatarEmoji}
                  </div>
                </div>
                <div style={styles.userHighlightInfo}>
                  <span style={styles.userHighlightName}>
                    {currentUserEntry.studentName} (Bạn)
                    <span style={{ ...styles.levelBadgeInline, backgroundColor: '#e0e7ff', color: '#6366f1' }}>
                      {currentUserEntry.levelTitleVi}
                    </span>
                  </span>
                  <span style={styles.userHighlightXp}>⭐ {currentUserEntry.xp.toLocaleString()} XP</span>
                </div>
                <div style={styles.userHighlightProgress}>
                  <div style={styles.levelBadge}>
                    Cấp {currentUserEntry.level}
                  </div>
                  {currentUserEntry.streak > 0 && (
                    <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                      🔥 {currentUserEntry.streak} streak
                    </div>
                  )}
                </div>
                <button onClick={shareAchievement} style={styles.shareButton}>
                  📤 Chia sẻ
                </button>
              </div>
            )}

            {/* Friend Comparison Toggle */}
            <div style={styles.friendComparisonToggle}>
              <button
                onClick={() => setShowFriendComparison(!showFriendComparison)}
                style={{
                  ...styles.friendComparisonButton,
                  backgroundColor: showFriendComparison ? '#6366f1' : 'rgba(99, 102, 241, 0.1)',
                  color: showFriendComparison ? 'white' : '#6366f1',
                }}
              >
                👥 So sánh với bạn bè
              </button>
            </div>

            {/* Friend Comparison Section */}
            <AnimatePresence>
              {showFriendComparison && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: '16px' }}
                >
                  <FriendComparisonCard
                    entries={entries}
                    currentUserId={user?.id}
                    onEntryClick={(entry) => console.log('Clicked:', entry.studentName)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Full leaderboard list with animated cards */}
            <div style={styles.listSection}>
              <h2 style={styles.sectionTitle}>
                📊 Toàn bộ bảng xếp hạng
                <span style={styles.sectionSubtitle}>
                  {TIMEFRAME_LABELS[timeframe].desc}
                </span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.studentId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <LeaderboardCard
                      entry={entry}
                      rankChange={getRankChange(entry.studentId)}
                      isCurrentUser={entry.studentId === user?.id}
                      showRewardBadge={true}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  header: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    padding: '24px 24px 16px',
  },
  headerContent: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: '16px',
    opacity: 0.9,
    margin: 0,
  },
  filtersSection: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    opacity: 0.9,
    minWidth: '70px',
  },
  filterButtons: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: 'white',
    color: '#6366f1',
    borderColor: 'white',
    fontWeight: 'bold',
  },
  realTimeBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0',
  },
  realTimeLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  realTimeIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  realTimeText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
  },
  lastUpdatedText: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  realTimeRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  realTimeToggle: {
    padding: '4px 12px',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#6b7280',
  },
  refreshButton: {
    padding: '4px 12px',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#6b7280',
  },
  rewardsBanner: {
    backgroundColor: '#1e1b4b',
    padding: '12px 20px',
    color: 'white',
  },
  rewardsBannerTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  rewardsBannerItems: {
    display: 'flex',
    justifyContent: 'space-around',
  },
  rewardItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '8px 16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '2px solid',
  },
  rewardEmoji: {
    fontSize: '20px',
  },
  rewardXp: {
    fontSize: '11px',
    color: '#22c55e',
    fontWeight: 600,
  },
  leagueBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    backgroundColor: '#1e1b4b',
    color: 'white',
  },
  leagueBannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  leagueBannerEmoji: {
    fontSize: '32px',
  },
  leagueBannerTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'block',
  },
  leagueBannerDesc: {
    fontSize: '12px',
    opacity: 0.8,
    display: 'block',
  },
  shareButton: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  podiumSection: {
    background: 'linear-gradient(180deg, #6366f1 0%, #f8f9fa 100%)',
    padding: '24px 24px 0',
  },
  podium: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: '12px',
    maxWidth: '500px',
    margin: '0 auto',
  },
  podiumItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flex: 1,
  },
  podiumFirst: {
    marginBottom: '0',
  },
  podiumSecond: {
    marginBottom: '30px',
  },
  podiumThird: {
    marginBottom: '50px',
  },
  podiumAvatarLarge: {
    position: 'relative' as const,
    marginBottom: '4px',
  },
  podiumAvatar: {
    marginBottom: '4px',
  },
  avatarImgLarge: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: '3px solid #FFD700',
  },
  avatarImg: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
  },
  avatarFallbackLarge: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 'bold' as const,
    color: 'white',
    border: '3px solid #FFD700',
  },
  avatarFallback: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: 'white',
  },
  avatarFallbackSmall: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: 'white',
  },
  crownEmoji: {
    position: 'absolute' as const,
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '24px',
  },
  podiumRank: {
    fontSize: '24px',
    marginBottom: '2px',
  },
  podiumName: {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    color: '#333',
    textAlign: 'center' as const,
    maxWidth: '100px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  podiumNameLarge: {
    fontSize: '15px',
    fontWeight: 'bold' as const,
    color: '#333',
    textAlign: 'center' as const,
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  podiumXp: {
    fontSize: '12px',
    color: '#666',
  },
  podiumXpLarge: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#d97706',
  },
  podiumLevel: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '4px',
  },
  podiumLevelLarge: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '4px',
  },
  podiumPedestal: {
    width: '100%',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '8px',
  },
  podiumPedestalLabel: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold' as const,
  },
  content: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  leagueLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  leagueLegendTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#666',
  },
  leagueLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
  },
  leagueLegendXp: {
    color: '#888',
    fontSize: '11px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#666',
  },
  loadingEmoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  userHighlight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#eef2ff',
    border: '2px solid #6366f1',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '24px',
  },
  userHighlightRank: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: '#6366f1',
    minWidth: '40px',
  },
  userHighlightAvatar: {
    flexShrink: 0,
  },
  userHighlightInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  userHighlightName: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  leagueBadge: {
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  userHighlightXp: {
    fontSize: '14px',
    color: '#d97706',
    fontWeight: 'bold' as const,
  },
  userHighlightProgress: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
  },
  levelBadge: {
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#6366f1',
    backgroundColor: '#e0e7ff',
    padding: '2px 8px',
    borderRadius: '8px',
  },
  levelBadgeInline: {
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '6px',
    marginLeft: '8px',
  },
  xpProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  xpProgressBar: {
    width: '80px',
    height: '6px',
    backgroundColor: '#e0e7ff',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  xpProgressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  xpProgressLabel: {
    fontSize: '11px',
    color: '#888',
  },
  listSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#333',
    padding: '16px 16px 8px',
    borderBottom: '1px solid #f0f0f0',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionSubtitle: {
    fontSize: '12px',
    fontWeight: 'normal',
    color: '#6b7280',
  },
  friendComparisonToggle: {
    marginBottom: '16px',
  },
  friendComparisonButton: {
    width: '100%',
    padding: '12px 20px',
    borderRadius: '12px',
    border: '2px solid #6366f1',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  list: {
    padding: '8px 0',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #f9f9f9',
    borderLeft: '4px solid transparent',
    transition: 'background-color 0.15s',
    position: 'relative' as const,
  },
  listItemCurrent: {
    backgroundColor: '#f0f0ff',
  },
  listRank: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    minWidth: '36px',
    textAlign: 'center' as const,
  },
  listAvatar: {
    flexShrink: 0,
  },
  listInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    minWidth: 0,
  },
  listName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  youBadge: {
    color: '#6366f1',
    fontWeight: 'normal',
  },
  listLevel: {
    fontSize: '12px',
    color: '#888',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  listLeague: {
    fontSize: '12px',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  listXp: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '0px',
  },
  xpValue: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#d97706',
  },
  xpLabel: {
    fontSize: '11px',
    color: '#888',
  },
  xpBarSmall: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    height: '3px',
    borderRadius: '2px',
    transition: 'width 0.3s',
  },
};