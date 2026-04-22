/**
 * ChallengeLeaderboardPage - Top performers for each challenge
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { challengesApi, LeaderboardEntry, Challenge } from '../services/challengesApi';
import { useAuth } from '../context/AuthContext';

type Timeframe = 'daily' | 'weekly' | 'all';

const TIMEFRAME_CONFIG: Record<Timeframe, { label: string; emoji: string }> = {
  daily: { label: 'Hôm nay', emoji: '📅' },
  weekly: { label: 'Tuần này', emoji: '🗓️' },
  all: { label: 'Mọi thời điểm', emoji: '🏆' },
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}p ${secs}giây`;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ChallengeLeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    searchParams.get('challenge') || null
  );

  useEffect(() => {
    loadData();
  }, [timeframe, selectedChallengeId]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      // Load challenges for filter dropdown
      const challengeList = await challengesApi.getChallenges();
      setChallenges(challengeList);

      // Load leaderboard
      const entries = await challengesApi.getLeaderboard({
        challengeId: selectedChallengeId || undefined,
        timeframe,
      });
      setLeaderboard(entries);
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  }

  function handleChallengeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setSelectedChallengeId(value === 'all' ? null : value);
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

  const currentUserEntry = leaderboard.find(e => e.userId === user?.id);
  const userRank = currentUserEntry?.rank;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <button onClick={() => navigate('/challenges')} style={styles.backButton}>
            ← Quay lại Arena
          </button>
          <h1 style={styles.pageTitle}>🏆 Bảng Xếp Hạng Thử Thách</h1>
        </div>
        <p style={styles.pageSubtitle}>Top thí sinh hoàn thành thử thách nhanh nhất</p>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        {/* Challenge filter */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Thử thách:</label>
          <select
            value={selectedChallengeId || 'all'}
            onChange={handleChallengeChange}
            style={styles.select}
          >
            <option value="all">Tất cả thử thách</option>
            {challenges.map(c => (
              <option key={c.id} value={c.id}>
                {c.titleVi || c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe filter */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Thời gian:</label>
          <div style={styles.filterButtons}>
            {(Object.keys(TIMEFRAME_CONFIG) as Timeframe[]).map(tf => {
              const config = TIMEFRAME_CONFIG[tf];
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
                  <span>{config.emoji}</span>
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
        ) : leaderboard.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🏆</span>
            <h2>Chưa có dữ liệu</h2>
            <p>Hoàn thành thử thách đầu tiên để xuất hiện trên bảng xếp hạng!</p>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {leaderboard.length >= 3 && timeframe === 'all' && !selectedChallengeId && (
              <div style={styles.podiumSection}>
                <div style={styles.podium}>
                  {/* 2nd place */}
                  <div style={{ ...styles.podiumItem, ...styles.podiumSecond }}>
                    <div style={styles.podiumAvatar}>
                      <div style={{ ...styles.avatarFallback, backgroundColor: '#9ca3af' }}>
                        {leaderboard[1].name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div style={styles.podiumRank}>{getRankEmoji(2)}</div>
                    <div style={styles.podiumName}>{leaderboard[1].name}</div>
                    <div style={styles.podiumScore}>⭐ {leaderboard[1].score} điểm</div>
                    <div style={styles.podiumTime}>⏱ {formatTime(leaderboard[1].timeSpentSeconds)}</div>
                    <div style={{ ...styles.podiumPedestal, backgroundColor: '#C0C0C0', height: '80px' }}>
                      <span style={styles.podiumPedestalLabel}>2</span>
                    </div>
                  </div>

                  {/* 1st place */}
                  <div style={{ ...styles.podiumItem, ...styles.podiumFirst }}>
                    <div style={styles.podiumAvatarLarge}>
                      <div style={{ ...styles.avatarFallbackLarge, backgroundColor: '#fbbf24' }}>
                        {leaderboard[0].name.charAt(0).toUpperCase()}
                      </div>
                      <div style={styles.crownEmoji}>👑</div>
                    </div>
                    <div style={styles.podiumRank}>{getRankEmoji(1)}</div>
                    <div style={styles.podiumNameLarge}>{leaderboard[0].name}</div>
                    <div style={styles.podiumScoreLarge}>⭐ {leaderboard[0].score} điểm</div>
                    <div style={styles.podiumTimeLarge}>⏱ {formatTime(leaderboard[0].timeSpentSeconds)}</div>
                    <div style={{ ...styles.podiumPedestal, backgroundColor: '#FFD700', height: '110px' }}>
                      <span style={styles.podiumPedestalLabel}>1</span>
                    </div>
                  </div>

                  {/* 3rd place */}
                  <div style={{ ...styles.podiumItem, ...styles.podiumThird }}>
                    <div style={styles.podiumAvatar}>
                      <div style={{ ...styles.avatarFallback, backgroundColor: '#cd7f32' }}>
                        {leaderboard[2].name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div style={styles.podiumRank}>{getRankEmoji(3)}</div>
                    <div style={styles.podiumName}>{leaderboard[2].name}</div>
                    <div style={styles.podiumScore}>⭐ {leaderboard[2].score} điểm</div>
                    <div style={styles.podiumTime}>⏱ {formatTime(leaderboard[2].timeSpentSeconds)}</div>
                    <div style={{ ...styles.podiumPedestal, backgroundColor: '#CD7F32', height: '60px' }}>
                      <span style={styles.podiumPedestalLabel}>3</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Current user highlight */}
            {currentUserEntry && (
              <div style={styles.userHighlight}>
                <span style={styles.userHighlightRank}>{getRankEmoji(userRank!)} #{userRank}</span>
                <div style={styles.userHighlightAvatar}>
                  <div style={{ ...styles.avatarFallback, backgroundColor: '#4CAF50' }}>
                    {currentUserEntry.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div style={styles.userHighlightInfo}>
                  <span style={styles.userHighlightName}>
                    {currentUserEntry.name} (Bạn)
                  </span>
                  <span style={styles.userHighlightScore}>⭐ {currentUserEntry.score} điểm</span>
                </div>
                <div style={styles.userHighlightTime}>
                  <span style={styles.userHighlightTimeLabel}>Thời gian</span>
                  <span style={styles.userHighlightTimeValue}>{formatTime(currentUserEntry.timeSpentSeconds)}</span>
                </div>
              </div>
            )}

            {/* Full list */}
            <div style={styles.listSection}>
              <h2 style={styles.sectionTitle}>Toàn bộ bảng xếp hạng</h2>
              <div style={styles.list}>
                {leaderboard.map((entry) => {
                  const isCurrentUser = entry.userId === user?.id;
                  const rankColor = getRankColor(entry.rank);

                  return (
                    <div
                      key={`${entry.challengeId}-${entry.userId}-${entry.rank}`}
                      style={{
                        ...styles.listItem,
                        ...(isCurrentUser ? styles.listItemCurrent : {}),
                        ...(entry.rank <= 3 ? { borderLeftColor: rankColor } : {}),
                      }}
                    >
                      <div style={{ ...styles.listRank, color: rankColor }}>
                        {entry.rank <= 3 ? getRankEmoji(entry.rank) : `#${entry.rank}`}
                      </div>
                      <div style={styles.listAvatar}>
                        <div style={{ ...styles.avatarFallbackSmall, backgroundColor: rankColor }}>
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div style={styles.listInfo}>
                        <span style={styles.listName}>
                          {entry.name}
                          {isCurrentUser && <span style={styles.youBadge}> (Bạn)</span>}
                        </span>
                        <span style={styles.listDate}>
                          📅 {formatDate(entry.completedAt)}
                        </span>
                      </div>
                      <div style={styles.listScore}>
                        <span style={styles.scoreValue}>⭐ {entry.score}</span>
                        <span style={styles.scoreLabel}>điểm</span>
                      </div>
                      <div style={styles.listTime}>
                        <span style={styles.timeValue}>⏱ {formatTime(entry.timeSpentSeconds)}</span>
                      </div>
                    </div>
                  );
                })}
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
    padding: '24px',
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
  filters: {
    padding: '16px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#666',
    minWidth: '80px',
  },
  select: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '2px solid #e0e0e0',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#666',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
    color: 'white',
    borderColor: '#6366f1',
    fontWeight: 'bold',
  },
  content: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  podiumSection: {
    background: 'linear-gradient(180deg, #6366f1 0%, #f8f9fa 100%)',
    padding: '24px 24px 0',
    marginBottom: '24px',
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
  podiumFirst: {},
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
  podiumScore: {
    fontSize: '12px',
    color: '#666',
  },
  podiumScoreLarge: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#d97706',
  },
  podiumTime: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '4px',
  },
  podiumTimeLarge: {
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
    minWidth: '60px',
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
  },
  userHighlightScore: {
    fontSize: '14px',
    color: '#d97706',
    fontWeight: 'bold' as const,
  },
  userHighlightTime: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '2px',
  },
  userHighlightTimeLabel: {
    fontSize: '11px',
    color: '#888',
  },
  userHighlightTimeValue: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#666',
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
  listDate: {
    fontSize: '12px',
    color: '#888',
  },
  listScore: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '0px',
  },
  scoreValue: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#d97706',
  },
  scoreLabel: {
    fontSize: '11px',
    color: '#888',
  },
  listTime: {
    minWidth: '80px',
    textAlign: 'right' as const,
  },
  timeValue: {
    fontSize: '12px',
    color: '#666',
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
};