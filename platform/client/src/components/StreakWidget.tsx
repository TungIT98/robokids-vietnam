/**
 * StreakWidget - Streak tracking UI component
 * Shows streak counter, check-in button, milestone badges, and streak freeze
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { streaksApi, StreakInfo, Milestone, getStreakMultiplier, calculateStreakXp } from '../services/streaksApi';

interface StreakWidgetProps {
  /** Student ID - typically the student's record ID in the students table */
  studentId: string;
  /** Auth token for API calls */
  token: string;
  /** Callback when checkin succeeds */
  onCheckinSuccess?: (result: { newStreak: number; xpEarned: number; milestoneAwarded: any }) => void;
}

const STREAK_EMOJIS: Record<number, string> = {
  1: '🌱', 2: '🌿', 3: '🌳', 5: '⭐', 7: '🚀', 14: '🔥', 30: '💎', 100: '👑',
};

function getStreakEmoji(streak: number): string {
  const keys = Object.keys(STREAK_EMOJIS).map(Number).sort((a, b) => b - a);
  for (const k of keys) {
    if (streak >= k) return STREAK_EMOJIS[k];
  }
  return '💪';
}

const MILESTONE_CONFIG = [
  { days: 7, emoji: '🌟', label: '7 ngày', color: '#22c55e' },
  { days: 30, emoji: '🔥', label: '30 ngày', color: '#f59e0b' },
  { days: 100, emoji: '💎', label: '100 ngày', color: '#8b5cf6' },
];

/**
 * AnimatedFlame - Animated flame effect for active streaks
 */
function AnimatedFlame({ streak, size = 'medium' }: { streak: number; size?: 'small' | 'medium' | 'large' }) {
  const sizeConfig = {
    small: { emojiSize: 24, containerWidth: 40 },
    medium: { emojiSize: 40, containerWidth: 60 },
    large: { emojiSize: 56, containerWidth: 80 },
  }[size];

  if (streak < 3) return <span style={{ fontSize: sizeConfig.emojiSize }}>🌱</span>;

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: sizeConfig.containerWidth, height: sizeConfig.emojiSize }}>
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          rotate: [-3, 3, -3],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ position: 'absolute', fontSize: sizeConfig.emojiSize }}
      >
        🔥
      </motion.div>
      {streak >= 7 && (
        <motion.div
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.4,
          }}
          style={{
            position: 'absolute',
            fontSize: sizeConfig.emojiSize * 0.6,
            top: -5,
            right: -5,
          }}
        >
          ✨
        </motion.div>
      )}
    </div>
  );
}

/**
 * StreakMultiplierBadge - Shows current streak tier and XP reward
 */
function StreakMultiplierBadge({ streak }: { streak: number }) {
  const { multiplier, xpBase, tierLabel } = getStreakMultiplier(streak);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: streak >= 7 ? 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' : '#f3f4f6',
        background: streak >= 7 ? 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' : '#f3f4f6',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: streak >= 7 ? 'white' : '#666',
        boxShadow: streak >= 7 ? '0 2px 8px rgba(255, 107, 53, 0.4)' : 'none',
      }}
    >
      <span>⚡</span>
      <span>{xpBase} XP</span>
      {multiplier > 1 && (
        <span style={{ opacity: 0.9 }}>×{multiplier}</span>
      )}
      <span style={{ opacity: 0.8 }}>•</span>
      <span>{tierLabel}</span>
    </motion.div>
  );
}

export function StreakWidget({ studentId, token, onCheckinSuccess }: StreakWidgetProps) {
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);
  const [showMultiplierPopup, setShowMultiplierPopup] = useState(false);

  useEffect(() => {
    if (studentId && token) {
      loadStreakData();
    }
  }, [studentId, token]);

  async function loadStreakData() {
    setIsLoading(true);
    setError(null);
    try {
      const [streakData, milestoneData] = await Promise.all([
        streaksApi.getStreak(studentId, token),
        streaksApi.getMilestones(studentId, token),
      ]);
      setStreakInfo(streakData);
      setMilestones(milestoneData.milestones);
    } catch (err: any) {
      setError(err.message || 'Failed to load streak data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCheckin() {
    if (isCheckingIn) return;
    setIsCheckingIn(true);
    setError(null);
    setCheckinMessage(null);

    try {
      const result = await streaksApi.checkin(studentId, token);
      setCheckinMessage(result.message);

      // Update streak info
      setStreakInfo(prev => prev ? {
        ...prev,
        currentStreak: result.newStreak,
        longestStreak: Math.max(prev.longestStreak, result.newStreak),
        recentCheckins: prev.recentCheckins + 1,
        totalXp: result.totalXp,
        nextMilestone: result.newStreak >= 7
          ? prev.nextMilestone
          : prev.nextMilestone && { ...prev.nextMilestone, daysRemaining: prev.nextMilestone.daysRemaining - 1 }
      } : null);

      // Check for new milestone badge
      if (result.milestoneAwarded) {
        await loadStreakData(); // Reload to get updated milestone status
      }

      // Notify parent
      if (onCheckinSuccess) {
        onCheckinSuccess({
          newStreak: result.newStreak,
          xpEarned: result.xpEarned,
          milestoneAwarded: result.milestoneAwarded,
        });
      }
    } catch (err: any) {
      if (err.message.includes('Already checked in')) {
        setCheckinMessage('Bạn đã điểm danh hôm nay rồi!');
      } else {
        setError(err.message || 'Check-in thất bại');
      }
    } finally {
      setIsCheckingIn(false);
    }
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <span style={styles.loadingEmoji}>🔥</span>
          <p>Đang tải streak...</p>
        </div>
      </div>
    );
  }

  if (error && !streakInfo) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <span>⚠️ {error}</span>
          <button onClick={loadStreakData} style={styles.retryButton}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const streak = streakInfo?.currentStreak || 0;
  const longestStreak = streakInfo?.longestStreak || streak;
  const nextMilestone = streakInfo?.nextMilestone;
  const isFrozen = streakInfo?.streakFrozen || false;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.streakDisplay}>
          <AnimatedFlame streak={streak} size="large" />
          <div style={styles.streakInfo}>
            <span style={styles.streakCount}>{streak}</span>
            <span style={styles.streakLabel}>ngày liên tiếp</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          {streak > 0 && <StreakMultiplierBadge streak={streak} />}
          {isFrozen && (
            <div style={styles.frozenBadge}>
              🥶 Đóng băng
            </div>
          )}
        </div>
      </div>

      {/* Animate when checkin message appears */}
      <AnimatePresence>
        {checkinMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={styles.checkinMessage}
          >
            {checkinMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Check-in Button */}
      <button
        onClick={handleCheckin}
        disabled={isCheckingIn}
        style={{
          ...styles.checkinButton,
          ...(isCheckingIn ? styles.checkinButtonDisabled : {}),
        }}
      >
        {isCheckingIn ? (
          <>
            <span>⏳</span>
            <span>Đang điểm danh...</span>
          </>
        ) : (
          <>
            <span>✓</span>
            <span>Điểm danh hôm nay</span>
          </>
        )}
      </button>

      {error && (
        <div style={styles.errorBanner}>
          ⚠️ {error}
        </div>
      )}

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <div style={styles.statItem}>
          <AnimatedFlame streak={streak} size="small" />
          <span style={styles.statValue}>{streak}</span>
          <span style={styles.statLabel}>Streak hiện tại</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statValue}>⭐ {longestStreak}</span>
          <span style={styles.statLabel}>Kỷ lục</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statValue}>⚡ {calculateStreakXp(streak)}</span>
          <span style={styles.statLabel}>XP/ngày</span>
        </div>
        {nextMilestone && (
          <>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={styles.statValue}>🎯 {nextMilestone.daysRemaining}</span>
              <span style={styles.statLabel}>Đến {nextMilestone.days} ngày</span>
            </div>
          </>
        )}
      </div>

      {/* Milestones */}
      <div style={styles.milestonesSection}>
        <h3 style={styles.milestonesTitle}>🏆 Milestones</h3>
        <div style={styles.milestonesGrid}>
          {MILESTONE_CONFIG.map((milestone) => {
            const achieved = streak >= milestone.days;
            const milestoneInfo = milestones.find(m => m.days === milestone.days);
            return (
              <div
                key={milestone.days}
                style={{
                  ...styles.milestoneItem,
                  ...(achieved ? styles.milestoneAchieved : {}),
                  ...(!achieved ? styles.milestonePending : {}),
                }}
              >
                <span style={styles.milestoneEmoji}>{milestone.emoji}</span>
                <span style={styles.milestoneDays}>{milestone.days} ngày</span>
                {achieved && <span style={styles.milestoneCheck}>✓</span>}
                {!achieved && milestoneInfo && (
                  <span style={styles.milestoneProgress}>
                    {streak}/{milestone.days}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * StreakMiniWidget - Compact streak display for embedding in other components
 */
export function StreakMiniWidget({ streak }: { streak: number }) {
  return (
    <div style={styles.miniContainer}>
      <span style={styles.miniEmoji}>{getStreakEmoji(streak)}</span>
      <span style={styles.miniCount}>{streak}</span>
    </div>
  );
}

/**
 * StreakHistoryView - Calendar-based streak history view
 */
interface StreakHistoryViewProps {
  studentId: string;
  token: string;
  months?: number; // default 1, max 6
}

export function StreakHistoryView({ studentId, token, months = 1 }: StreakHistoryViewProps) {
  const [history, setHistory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [studentId, token, months]);

  async function loadHistory() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await streaksApi.getHistory(studentId, token, months);
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <span style={styles.loadingEmoji}>📅</span>
          <p>Đang tải lịch sử...</p>
        </div>
      </div>
    );
  }

  if (error || !history) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <span>⚠️ {error || 'Failed to load'}</span>
          <button onClick={loadHistory} style={styles.retryButton}>Thử lại</button>
        </div>
      </div>
    );
  }

  // Group calendar by weeks for display
  const { calendar, stats, milestones } = history;

  return (
    <div style={styles.historyContainer}>
      {/* Stats header */}
      <div style={styles.historyStats}>
        <div style={styles.historyStatItem}>
          <span style={styles.historyStatValue}>{stats.totalCheckins}</span>
          <span style={styles.historyStatLabel}>Tổng check-in</span>
        </div>
        <div style={styles.historyStatItem}>
          <span style={styles.historyStatValue}>🔥 {stats.currentStreak}</span>
          <span style={styles.historyStatLabel}>Streak hiện tại</span>
        </div>
        <div style={styles.historyStatItem}>
          <span style={styles.historyStatValue}>{stats.averageCheckinsPerWeek}</span>
          <span style={styles.historyStatLabel}>Trung bình/tuần</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={styles.calendarGrid}>
        <div style={styles.calendarHeader}>
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
            <span key={day} style={styles.calendarDayLabel}>{day}</span>
          ))}
        </div>
        <div style={styles.calendarDays}>
          {calendar.map((day: { date: string; checkedIn: boolean }, idx: number) => {
            const date = new Date(day.date);
            const dayOfWeek = date.getDay();
            // Add empty cells for alignment if needed
            const isFirstDay = idx === 0;
            return (
              <div
                key={day.date}
                style={{
                  ...styles.calendarDay,
                  ...(day.checkedIn ? styles.calendarDayChecked : {}),
                  ...(!day.checkedIn ? styles.calendarDayMissed : {}),
                }}
                title={day.date}
              >
                <span style={styles.calendarDayNumber}>{date.getDate()}</span>
                {day.checkedIn && <span style={styles.calendarCheckmark}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone badges earned */}
      {milestones && milestones.length > 0 && (
        <div style={styles.historyMilestones}>
          <h4 style={styles.historyMilestonesTitle}>🏅 Huy hiệu đã đạt được</h4>
          <div style={styles.historyMilestonesList}>
            {milestones.map((m: { id: string; badgeKey: string; nameVi: string; earnedAt: string }) => (
              <div key={m.id} style={styles.historyMilestoneItem}>
                <span style={styles.historyMilestoneEmoji}>
                  {m.badgeKey === 'streak_7' ? '🌟' : m.badgeKey === 'streak_30' ? '🔥' : '💎'}
                </span>
                <span style={styles.historyMilestoneName}>{m.nameVi}</span>
                <span style={styles.historyMilestoneDate}>
                  {new Date(m.earnedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
    color: '#666',
  },
  loadingEmoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    gap: '12px',
    color: '#dc2626',
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  headerRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  streakDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  streakEmoji: {
    fontSize: '48px',
  },
  streakInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  streakCount: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 1,
  },
  streakLabel: {
    fontSize: '14px',
    color: '#666',
  },
  frozenBadge: {
    backgroundColor: '#e0e7ff',
    color: '#6366f1',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  checkinButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px 20px',
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  checkinButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  checkinMessage: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
  },
  errorBanner: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    gap: '8px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: '11px',
    color: '#666',
  },
  statDivider: {
    width: '1px',
    height: '30px',
    backgroundColor: '#e0e0e0',
  },
  milestonesSection: {
    marginTop: '20px',
  },
  milestonesTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  },
  milestonesGrid: {
    display: 'flex',
    gap: '8px',
  },
  milestoneItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 8px',
    borderRadius: '10px',
    gap: '4px',
  },
  milestoneAchieved: {
    backgroundColor: '#dcfce7',
    border: '2px solid #22c55e',
  },
  milestonePending: {
    backgroundColor: '#f5f5f5',
    border: '2px solid #e0e0e0',
  },
  milestoneEmoji: {
    fontSize: '24px',
  },
  milestoneDays: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#333',
  },
  milestoneCheck: {
    fontSize: '16px',
    color: '#22c55e',
    fontWeight: 'bold',
  },
  milestoneProgress: {
    fontSize: '10px',
    color: '#888',
  },
  miniContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
  },
  miniEmoji: {
    fontSize: '16px',
  },
  miniCount: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#92400e',
  },
  // StreakHistoryView styles
  historyContainer: {
    padding: '16px',
  },
  historyStats: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
  },
  historyStatItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
  },
  historyStatValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },
  historyStatLabel: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  },
  calendarGrid: {
    marginBottom: '16px',
  },
  calendarHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    marginBottom: '8px',
  },
  calendarDayLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#888',
    textAlign: 'center',
  },
  calendarDays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  calendarDay: {
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    fontSize: '12px',
    position: 'relative',
  },
  calendarDayChecked: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  calendarDayMissed: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  calendarDayNumber: {
    fontSize: '11px',
  },
  calendarCheckmark: {
    fontSize: '10px',
    position: 'absolute',
    bottom: '2px',
  },
  historyMilestones: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e0e0e0',
  },
  historyMilestonesTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
  },
  historyMilestonesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyMilestoneItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  historyMilestoneEmoji: {
    fontSize: '20px',
  },
  historyMilestoneName: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  historyMilestoneDate: {
    fontSize: '12px',
    color: '#888',
  },
};