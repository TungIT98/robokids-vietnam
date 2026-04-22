/**
 * SpaceLeaderboard - Leaderboard component with space theme for Space Academy
 * Shows top 10 students with rank, avatar, name, XP, and level title
 */

import { useState, useEffect } from 'react';
import { gamificationApi, LeaderboardEntry } from '../../services/gamificationApi';

interface SpaceLeaderboardProps {
  limit?: number;
  showCurrentUser?: boolean;
  onEntryClick?: (entry: LeaderboardEntry) => void;
}

const RANK_TITLES = ['Commander', 'Pilot', 'Cadet', 'Cadet', 'Cadet', 'Cadet', 'Cadet', 'Cadet', 'Cadet', 'Cadet'];
const RANK_TITLES_VI = ['Chỉ huy', 'Phi công', 'Tân binh', 'Tân binh', 'Tân binh', 'Tân binh', 'Tân binh', 'Tân binh', 'Tân binh', 'Tân binh'];

function getRankTitle(rank: number): { title: string; titleVi: string; color: string } {
  const index = Math.min(rank - 1, RANK_TITLES.length - 1);
  if (rank === 1) return { title: 'Commander', titleVi: 'Chỉ huy', color: '#FFD700' };
  if (rank === 2) return { title: 'Pilot', titleVi: 'Phi công', color: '#C0C0C0' };
  if (rank === 3) return { title: 'Pilot', titleVi: 'Phi công', color: '#CD7F32' };
  return { title: 'Cadet', titleVi: 'Tân binh', color: '#6366f1' };
}

export default function SpaceLeaderboard({ limit = 10, showCurrentUser = true, onEntryClick }: SpaceLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [limit]);

  async function loadLeaderboard() {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const data = await gamificationApi.getLeaderboard(token, limit);
      setEntries(data.entries);
      if (data.userRank !== undefined) {
        setUserRank(data.userRank);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerEmoji}>🏆</span>
          <h3 style={styles.headerTitle}>Bảng xếp hạng</h3>
        </div>
        <div style={styles.loadingState}>
          <span style={styles.loadingEmoji}>🚀</span>
          <p>Đang tải bảng xếp hạng...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerEmoji}>🏆</span>
          <h3 style={styles.headerTitle}>Bảng xếp hạng</h3>
        </div>
        <div style={styles.errorState}>
          <span>⚠️ {error}</span>
          <button onClick={loadLeaderboard} style={styles.retryButton}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerEmoji}>🏆</span>
        <h3 style={styles.headerTitle}>Bảng xếp hạng</h3>
      </div>

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div style={styles.podiumSection}>
          <div style={styles.podium}>
            {/* 2nd place */}
            <div style={{ ...styles.podiumItem, ...styles.podiumSecond }}>
              <div style={styles.podiumAvatar}>
                <span style={styles.avatarEmoji}>{entries[1].avatarEmoji || '🌟'}</span>
              </div>
              <div style={styles.podiumRank}>{getRankTitle(2).titleVi}</div>
              <div style={styles.podiumName}>{entries[1].studentName}</div>
              <div style={styles.podiumXp}>⭐ {entries[1].xp.toLocaleString()}</div>
              <div style={{ ...styles.podiumPedestal, backgroundColor: '#C0C0C0' }}>
                <span style={styles.podiumPedestalLabel}>2</span>
              </div>
            </div>

            {/* 1st place */}
            <div style={{ ...styles.podiumItem, ...styles.podiumFirst }}>
              <div style={styles.crownEmoji}>👑</div>
              <div style={styles.podiumAvatarLarge}>
                <span style={styles.avatarEmojiLarge}>{entries[0].avatarEmoji || '🚀'}</span>
              </div>
              <div style={styles.podiumRank}>{getRankTitle(1).titleVi}</div>
              <div style={styles.podiumNameLarge}>{entries[0].studentName}</div>
              <div style={styles.podiumXpLarge}>⭐ {entries[0].xp.toLocaleString()}</div>
              <div style={{ ...styles.podiumPedestal, backgroundColor: '#FFD700' }}>
                <span style={styles.podiumPedestalLabel}>1</span>
              </div>
            </div>

            {/* 3rd place */}
            <div style={{ ...styles.podiumItem, ...styles.podiumThird }}>
              <div style={styles.podiumAvatar}>
                <span style={styles.avatarEmoji}>{entries[2].avatarEmoji || '🛸'}</span>
              </div>
              <div style={styles.podiumRank}>{getRankTitle(3).titleVi}</div>
              <div style={styles.podiumName}>{entries[2].studentName}</div>
              <div style={styles.podiumXp}>⭐ {entries[2].xp.toLocaleString()}</div>
              <div style={{ ...styles.podiumPedestal, backgroundColor: '#CD7F32' }}>
                <span style={styles.podiumPedestalLabel}>3</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      <div style={styles.listSection}>
        {entries.slice(3).map((entry, index) => {
          const rank = index + 4;
          const rankInfo = getRankTitle(rank);
          const isCurrentUser = entry.isCurrentUser;

          return (
            <div
              key={entry.studentId}
              onClick={() => onEntryClick?.(entry)}
              style={{
                ...styles.listItem,
                ...(isCurrentUser ? styles.listItemCurrent : {}),
              }}
            >
              <div style={{ ...styles.listRank, color: rankInfo.color }}>
                #{rank}
              </div>
              <div style={styles.listAvatar}>
                <span style={styles.avatarEmoji}>{entry.avatarEmoji || '🤖'}</span>
              </div>
              <div style={styles.listInfo}>
                <span style={{ ...styles.listName, ...(isCurrentUser ? styles.listNameCurrent : {}) }}>
                  {entry.studentName}
                  {isCurrentUser && <span style={styles.youBadge}> (Bạn)</span>}
                </span>
                <span style={styles.listLevel}>
                  {rankInfo.titleVi} · Cấp {entry.level}
                </span>
              </div>
              <div style={styles.listXp}>
                <span style={styles.xpValue}>⭐ {entry.xp.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current user rank */}
      {showCurrentUser && userRank && userRank > 3 && (
        <>
          <div style={styles.divider}>
            <span style={styles.dividerText}>Vị trí của bạn</span>
          </div>
          <div style={styles.userRankSection}>
            <span style={styles.userRankNumber}>#{userRank}</span>
            <div style={styles.userRankInfo}>
              <span style={styles.userRankLabel}>Thứ hạng của bạn</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'rgba(15, 15, 35, 0.95)',
    borderRadius: '20px',
    border: '1px solid rgba(100, 100, 255, 0.2)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))',
    borderBottom: '1px solid rgba(100, 100, 255, 0.2)',
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
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
    color: '#888',
  },
  loadingEmoji: {
    fontSize: '32px',
    marginBottom: '12px',
    animation: 'pulse 1.5s infinite',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
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
  podiumSection: {
    padding: '20px 20px 0',
    background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.2) 0%, transparent 100%)',
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
  crownEmoji: {
    fontSize: '20px',
    marginBottom: '-8px',
    zIndex: 2,
  },
  podiumAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'rgba(50, 50, 100, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid rgba(100, 100, 255, 0.3)',
    marginBottom: '4px',
  },
  podiumAvatarLarge: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(50, 50, 100, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid #FFD700',
    marginBottom: '4px',
  },
  avatarEmoji: {
    fontSize: '24px',
  },
  avatarEmojiLarge: {
    fontSize: '32px',
  },
  podiumRank: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#a0a0ff',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  podiumName: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    maxWidth: '70px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  podiumNameLarge: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    maxWidth: '80px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  podiumXp: {
    fontSize: '10px',
    color: '#a855f7',
    fontWeight: 'bold',
  },
  podiumXpLarge: {
    fontSize: '12px',
    color: '#a855f7',
    fontWeight: 'bold',
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
  podiumPedestalLabel: {
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  listSection: {
    padding: '8px 0',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 20px',
    borderBottom: '1px solid rgba(100, 100, 255, 0.1)',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  listItemCurrent: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderLeft: '3px solid #00f0ff',
  },
  listRank: {
    fontSize: '14px',
    fontWeight: 'bold',
    minWidth: '32px',
  },
  listAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(50, 50, 100, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  listLevel: {
    fontSize: '11px',
    color: '#888',
  },
  listXp: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  xpValue: {
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
};