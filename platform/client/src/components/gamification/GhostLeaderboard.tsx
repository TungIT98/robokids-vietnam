/**
 * GhostLeaderboard - Leaderboard for Ghost Racing mode
 * Shows top 10 racers with gold/silver/bronze styling for top 3
 * Prominently displays the Gold Cup winner
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export interface GhostLeaderboardEntry {
  id: string;
  rank: number;
  student_id: string;
  studentName: string;
  avatarEmoji: string;
  raceTimeMs: number; // time in milliseconds
  ghostId: string;
  ghost_data?: any;
  ghost_path_url?: string;
  track_id: string;
  is_gold_cup: boolean;
  completedAt: string;
  isCurrentUser?: boolean;
}

export interface GoldCupWinner {
  id: string;
  student_id: string;
  studentName: string;
  avatarEmoji: string;
  raceTimeMs: number;
  wonAt: string;
}

interface GhostLeaderboardProps {
  trackId?: string;
  limit?: number;
  showCurrentUser?: boolean;
  autoRefreshInterval?: number; // ms, 0 to disable
  onEntryClick?: (entry: GhostLeaderboardEntry) => void;
}

/**
 * Format milliseconds to mm:ss.ms format
 */
function formatRaceTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10); // 2 digits
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

/**
 * Get rank medal emoji
 */
function getRankEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

/**
 * Get rank color
 */
function getRankColor(rank: number): string {
  if (rank === 1) return '#FFD700'; // Gold
  if (rank === 2) return '#C0C0C0'; // Silver
  if (rank === 3) return '#CD7F32'; // Bronze
  return '#6366f1'; // Default indigo
}

async function fetchGhostLeaderboard(token: string, limit: number, trackId?: string): Promise<GhostLeaderboardEntry[]> {
  const url = trackId
    ? `${API_BASE}/api/ghost-leaderboard?track_id=${encodeURIComponent(trackId)}&limit=${limit}`
    : `${API_BASE}/api/ghost-leaderboard?limit=${limit}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch ghost leaderboard');
  }
  const data = await response.json();
  // Map API response to component's expected format
  return (data.entries || []).map((entry: any) => ({
    id: entry.id,
    rank: entry.rank,
    student_id: entry.student?.id || entry.student_id,
    studentName: entry.student?.profile?.full_name || entry.studentName || 'Unknown',
    avatarEmoji: entry.student?.profile?.avatar_url || entry.avatarEmoji || '🤖',
    raceTimeMs: entry.race_time_ms,
    ghostId: entry.id,
    ghost_data: entry.ghost_data,
    ghost_path_url: entry.ghost_path_url,
    track_id: entry.track_id,
    is_gold_cup: entry.is_gold_cup,
    completedAt: entry.created_at,
  }));
}

async function fetchGoldCupWinner(token: string, trackId?: string): Promise<GoldCupWinner | null> {
  try {
    const url = trackId
      ? `${API_BASE}/api/ghost-leaderboard/gold-cup?track_id=${encodeURIComponent(trackId)}`
      : `${API_BASE}/api/ghost-leaderboard/gold-cup`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    // Map API response to component's expected format
    const winner = data.gold_cup_winner;
    if (!winner) return null;
    return {
      id: winner.id,
      student_id: winner.student?.id || winner.student_id,
      studentName: winner.student?.profile?.full_name || winner.studentName || 'Unknown',
      avatarEmoji: winner.student?.profile?.avatar_url || winner.avatarEmoji || '🤖',
      raceTimeMs: winner.race_time_ms,
      wonAt: winner.created_at,
    };
  } catch {
    return null;
  }
}

async function fetchUserGhostRank(_token: string, _trackId?: string): Promise<number | null> {
  // User rank is derived from leaderboard entries (isCurrentUser flag)
  // This function is kept for future /my-rank endpoint implementation
  return null;
}

export default function GhostLeaderboard({
  trackId,
  limit = 10,
  showCurrentUser = true,
  autoRefreshInterval = 30000, // 30 seconds
  onEntryClick,
}: GhostLeaderboardProps) {
  const [entries, setEntries] = useState<GhostLeaderboardEntry[]>([]);
  const [goldCupWinner, setGoldCupWinner] = useState<GoldCupWinner | null>(null);
  const [userRank, setUserRank] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const token = localStorage.getItem('token') || '';

      // Fetch all data in parallel
      const [leaderboardData, goldCupData, rankData] = await Promise.all([
        fetchGhostLeaderboard(token, limit, trackId),
        fetchGoldCupWinner(token, trackId),
        fetchUserGhostRank(token, trackId),
      ]);

      setEntries(leaderboardData);

      if (goldCupData) {
        setGoldCupWinner(goldCupData);
      }

      if (rankData !== null) {
        setUserRank(rankData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [limit, trackId]);

  // Initial load
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      loadData(true);
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, loadData]);

  // Pull-to-refresh handler
  async function handleRefresh() {
    setIsRefreshing(true);
    await loadData(false);
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerEmoji}>👻</span>
          <h3 style={styles.headerTitle}>Ghost Racing Leaderboard</h3>
        </div>
        <div style={styles.loadingState}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={styles.loadingSpinner}
          >
            🏎️
          </motion.div>
          <p>Đang tải bảng xếp hạng...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && entries.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerEmoji}>👻</span>
          <h3 style={styles.headerTitle}>Ghost Racing Leaderboard</h3>
        </div>
        <div style={styles.errorState}>
          <span>⚠️ {error}</span>
          <button onClick={() => loadData(false)} style={styles.retryButton}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const currentUserEntry = entries.find(e => e.isCurrentUser);
  const userRankPosition = currentUserEntry?.rank || userRank;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerEmoji}>👻</span>
          <h3 style={styles.headerTitle}>Ghost Racing Leaderboard</h3>
        </div>
        {isRefreshing && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={styles.refreshIndicator}
          >
            🔄
          </motion.div>
        )}
      </div>

      {/* Gold Cup Winner Section */}
      {goldCupWinner && (
        <div style={styles.goldCupSection}>
          <div style={styles.goldCupBadge}>
            <span style={styles.goldCupCrown}>👑</span>
            <span style={styles.goldCupLabel}>Gold Cup Champion</span>
          </div>
          <div style={styles.goldCupCard}>
            <div style={styles.goldCupAvatar}>
              <span style={styles.goldCupAvatarEmoji}>{goldCupWinner.avatarEmoji}</span>
              <div style={styles.goldCupGlow} />
            </div>
            <div style={styles.goldCupInfo}>
              <div style={styles.goldCupName}>{goldCupWinner.studentName}</div>
              <div style={styles.goldCupTime}>
                ⏱ {formatRaceTime(goldCupWinner.raceTimeMs)}
              </div>
              <div style={styles.goldCupCount}>
                🏆 Gold Cup Winner
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error banner (if error but we have cached data) */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button onClick={() => loadData(false)} style={styles.errorDismiss}>
            Retry
          </button>
        </div>
      )}

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div style={styles.podiumSection}>
          <div style={styles.podiumTitle}>🏆 Top Racers</div>
          <div style={styles.podium}>
            {/* 2nd place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ ...styles.podiumItem, ...styles.podiumSecond }}
            >
              <div style={styles.podiumAvatarWrapper}>
                <div style={{ ...styles.podiumAvatar, borderColor: '#C0C0C0' }}>
                  <span style={styles.avatarEmoji}>{entries[1].avatarEmoji || '🌟'}</span>
                </div>
                <span style={styles.podiumMedal}>🥈</span>
              </div>
              <div style={styles.podiumName}>{entries[1].studentName}</div>
              <div style={styles.podiumTime}>{formatRaceTime(entries[1].raceTimeMs)}</div>
              <div style={{ ...styles.podiumPedestal, backgroundColor: '#C0C0C0' }}>
                <span style={styles.podiumPedestalLabel}>2</span>
              </div>
            </motion.div>

            {/* 1st place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              style={{ ...styles.podiumItem, ...styles.podiumFirst }}
            >
              <div style={styles.crownWrapper}>
                <span style={styles.crownEmoji}>👑</span>
              </div>
              <div style={{ ...styles.podiumAvatarWrapper, ...styles.podiumAvatarWrapperLarge }}>
                <div style={{ ...styles.podiumAvatarLarge, borderColor: '#FFD700' }}>
                  <span style={styles.avatarEmojiLarge}>{entries[0].avatarEmoji || '🚀'}</span>
                </div>
                <div style={styles.goldGlow} />
              </div>
              <div style={styles.podiumNameLarge}>{entries[0].studentName}</div>
              <div style={styles.podiumTimeLarge}>{formatRaceTime(entries[0].raceTimeMs)}</div>
              <div style={{ ...styles.podiumPedestal, ...styles.podiumPedestalGold }}>
                <span style={styles.podiumPedestalLabel}>1</span>
              </div>
            </motion.div>

            {/* 3rd place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ ...styles.podiumItem, ...styles.podiumThird }}
            >
              <div style={styles.podiumAvatarWrapper}>
                <div style={{ ...styles.podiumAvatar, borderColor: '#CD7F32' }}>
                  <span style={styles.avatarEmoji}>{entries[2].avatarEmoji || '🛸'}</span>
                </div>
                <span style={styles.podiumMedal}>🥉</span>
              </div>
              <div style={styles.podiumName}>{entries[2].studentName}</div>
              <div style={styles.podiumTime}>{formatRaceTime(entries[2].raceTimeMs)}</div>
              <div style={{ ...styles.podiumPedestal, backgroundColor: '#CD7F32' }}>
                <span style={styles.podiumPedestalLabel}>3</span>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Leaderboard list (positions 4-10) */}
      {entries.length > 3 && (
        <div style={styles.listSection}>
          <div style={styles.listSectionTitle}>Top {entries.length}</div>
          <div style={styles.list}>
            {entries.slice(3).map((entry, index) => {
              const rank = index + 4;
              const rankColor = getRankColor(rank);
              const isCurrentUser = entry.isCurrentUser;

              return (
                <motion.div
                  key={entry.id || entry.student_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onEntryClick?.(entry)}
                  style={{
                    ...styles.listItem,
                    ...(isCurrentUser ? styles.listItemCurrent : {}),
                    ...(rank <= 10 ? { borderLeftColor: rankColor } : {}),
                  }}
                >
                  <div style={{ ...styles.listRank, color: rankColor }}>
                    {rank <= 3 ? getRankEmoji(rank) : `#${rank}`}
                  </div>
                  <div style={{ ...styles.listAvatar, borderColor: rankColor }}>
                    <span style={styles.listAvatarEmoji}>{entry.avatarEmoji || '🤖'}</span>
                  </div>
                  <div style={styles.listInfo}>
                    <span style={{ ...styles.listName, ...(isCurrentUser ? styles.listNameCurrent : {}) }}>
                      {entry.studentName}
                      {isCurrentUser && <span style={styles.youBadge}> (Bạn)</span>}
                    </span>
                    <span style={styles.listDate}>
                      👻 Ghost Race
                    </span>
                  </div>
                  <div style={styles.listTime}>
                    <span style={styles.timeValue}>⏱ {formatRaceTime(entry.raceTimeMs)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && !isLoading && (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>👻</span>
          <h3>Chưa có dữ liệu Ghost Racing</h3>
          <p>Hoàn thành đường đua đầu tiên để xuất hiện trên bảng xếp hạng!</p>
        </div>
      )}

      {/* Current user rank (outside top 10) */}
      {showCurrentUser && userRankPosition && userRankPosition > 10 && (
        <>
          <div style={styles.divider}>
            <span style={styles.dividerText}>Vị trí của bạn</span>
          </div>
          <div style={styles.userRankSection}>
            <span style={styles.userRankNumber}>#{userRankPosition}</span>
            <div style={styles.userRankInfo}>
              <span style={styles.userRankLabel}>Thứ hạng Ghost Racing của bạn</span>
            </div>
          </div>
        </>
      )}

      {/* Refresh button */}
      <button onClick={handleRefresh} style={styles.refreshButton}>
        {isRefreshing ? 'Đang làm mới...' : '🔄 Làm mới bảng xếp hạng'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    overflow: 'hidden',
    boxShadow: '0 0 40px rgba(99, 102, 241, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))',
    borderBottom: '1px solid rgba(100, 100, 255, 0.2)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerEmoji: {
    fontSize: '24px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
  },
  refreshIndicator: {
    fontSize: '16px',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    color: '#888',
  },
  loadingSpinner: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '40px 20px',
    color: '#ef4444',
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    color: '#fff',
    border: '1px solid rgba(99, 102, 241, 0.5)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    margin: '12px 16px',
    fontSize: '14px',
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  goldCupSection: {
    padding: '16px 20px',
    background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.15) 0%, transparent 100%)',
    borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
  },
  goldCupBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  goldCupCrown: {
    fontSize: '20px',
  },
  goldCupLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#FFD700',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  goldCupCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    background: 'rgba(251, 191, 36, 0.1)',
    borderRadius: '16px',
    border: '1px solid rgba(251, 191, 36, 0.3)',
  },
  goldCupAvatar: {
    position: 'relative',
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldCupAvatarEmoji: {
    fontSize: '32px',
    position: 'relative',
    zIndex: 1,
  },
  goldCupGlow: {
    position: 'absolute',
    inset: '-4px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 70%)',
    animation: 'pulse 2s infinite',
  },
  goldCupInfo: {
    flex: 1,
  },
  goldCupName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: '4px',
  },
  goldCupTime: {
    fontSize: '14px',
    color: '#fff',
    fontWeight: 600,
  },
  goldCupCount: {
    fontSize: '12px',
    color: '#FFD700',
    marginTop: '2px',
  },
  podiumSection: {
    padding: '20px 20px 0',
    background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.2) 0%, transparent 100%)',
  },
  podiumTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#a0a0ff',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    textAlign: 'center',
    marginBottom: '16px',
  },
  podium: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: '8px',
  },
  podiumItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    maxWidth: '120px',
  },
  podiumFirst: {
    marginBottom: '0',
  },
  podiumSecond: {
    marginBottom: '20px',
  },
  podiumThird: {
    marginBottom: '40px',
  },
  crownWrapper: {
    marginBottom: '-8px',
    zIndex: 2,
  },
  crownEmoji: {
    fontSize: '24px',
    filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))',
  },
  podiumAvatarWrapper: {
    position: 'relative',
    marginBottom: '4px',
  },
  podiumAvatarWrapperLarge: {
    marginBottom: '4px',
  },
  podiumAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'rgba(50, 50, 100, 0.5)',
    border: '3px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarLarge: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(50, 50, 100, 0.5)',
    border: '3px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldGlow: {
    position: 'absolute',
    inset: '-6px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 70%)',
    animation: 'pulse 2s infinite',
    zIndex: -1,
  },
  avatarEmoji: {
    fontSize: '24px',
  },
  avatarEmojiLarge: {
    fontSize: '32px',
  },
  podiumMedal: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    fontSize: '16px',
  },
  podiumName: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    maxWidth: '80px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  podiumNameLarge: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    maxWidth: '100px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  podiumTime: {
    fontSize: '10px',
    color: '#a855f7',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  podiumTimeLarge: {
    fontSize: '12px',
    color: '#a855f7',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  podiumPedestal: {
    width: '100%',
    height: '40px',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '8px',
  },
  podiumPedestalGold: {
    background: 'linear-gradient(180deg, #FFD700 0%, #f59e0b 100%)',
    boxShadow: '0 0 20px rgba(251, 191, 36, 0.4)',
  },
  podiumPedestalLabel: {
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  listSection: {
    padding: '8px 0',
    marginTop: '8px',
  },
  listSectionTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#a0a0ff',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    padding: '0 20px',
    marginBottom: '8px',
  },
  list: {
    padding: '0',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    borderBottom: '1px solid rgba(100, 100, 255, 0.1)',
    borderLeft: '3px solid transparent',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  listItemCurrent: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderLeftColor: '#00f0ff',
  },
  listRank: {
    fontSize: '14px',
    fontWeight: 'bold',
    minWidth: '36px',
    textAlign: 'center',
  },
  listAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(50, 50, 100, 0.5)',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listAvatarEmoji: {
    fontSize: '18px',
  },
  listInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  listName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listNameCurrent: {
    color: '#00f0ff',
  },
  youBadge: {
    color: '#00f0ff',
    fontWeight: 'normal',
  },
  listDate: {
    fontSize: '11px',
    color: '#888',
  },
  listTime: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  timeValue: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#a855f7',
  },
  divider: {
    padding: '12px 20px',
    borderTop: '1px solid rgba(100, 100, 255, 0.2)',
    borderBottom: '1px solid rgba(100, 100, 255, 0.1)',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  dividerText: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  userRankSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
  },
  userRankNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  userRankInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userRankLabel: {
    fontSize: '12px',
    color: '#888',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    color: '#888',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  refreshButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    border: 'none',
    borderTop: '1px solid rgba(100, 100, 255, 0.2)',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};