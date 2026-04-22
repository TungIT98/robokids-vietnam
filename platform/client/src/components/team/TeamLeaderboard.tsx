/**
 * TeamLeaderboard - Team rankings with animated rank changes
 * Kid-friendly design with emojis and colorful styling
 */

import { useEffect, useState } from 'react';
import { Team } from '../stores/teamStore';

interface TeamLeaderboardProps {
  teams: Team[];
  myTeamId?: string;
  timeframe?: 'daily' | 'weekly' | 'all';
  onTeamClick?: (teamId: string) => void;
}

const TIMEFRAME_CONFIG = {
  daily: { label: 'Hôm nay', emoji: '🌅' },
  weekly: { label: 'Tuần này', emoji: '📅' },
  all: { label: 'Tất cả', emoji: '🏆' },
};

const RANK_EMOJIS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export default function TeamLeaderboard({
  teams,
  myTeamId,
  timeframe = 'weekly',
  onTeamClick
}: TeamLeaderboardProps) {
  const [animatedTeams, setAnimatedTeams] = useState<Team[]>([]);
  const config = TIMEFRAME_CONFIG[timeframe];

  useEffect(() => {
    // Animate teams appearing
    const timer = setTimeout(() => {
      setAnimatedTeams(teams);
    }, 100);
    return () => clearTimeout(timer);
  }, [teams]);

  const getRankDisplay = (rank: number) => {
    if (RANK_EMOJIS[rank]) {
      return <span style={styles.rankEmoji}>{RANK_EMOJIS[rank]}</span>;
    }
    return <span style={styles.rankNumber}>#{rank}</span>;
  };

  const formatXP = (xp: number) => {
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>🏆 Bảng xếp hạng đội {config.emoji}</h2>
        <span style={styles.timeframe}>{config.label}</span>
      </div>

      {/* Team list */}
      <div style={styles.list}>
        {animatedTeams.length === 0 ? (
          <div style={styles.empty}>
            <span style={styles.emptyEmoji}>🔍</span>
            <p>Chưa có đội nào trong bảng xếp hạng</p>
          </div>
        ) : (
          animatedTeams.map((team, index) => {
            const isMyTeam = team.id === myTeamId;
            const rank = index + 1;
            const isTopThree = rank <= 3;

            return (
              <div
                key={team.id}
                style={{
                  ...styles.teamRow,
                  backgroundColor: isMyTeam ? '#eff6ff' : 'white',
                  borderColor: isMyTeam ? '#3b82f6' : '#e5e7eb',
                  animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
                }}
                onClick={() => onTeamClick?.(team.id)}
              >
                {/* Rank */}
                <div style={styles.rankCell}>
                  {getRankDisplay(rank)}
                </div>

                {/* Team avatar and name */}
                <div style={styles.teamInfo}>
                  <span style={styles.teamAvatar}>{team.avatar}</span>
                  <div style={styles.teamDetails}>
                    <span style={{ ...styles.teamName, color: isMyTeam ? '#1d4ed8' : '#1f2937' }}>
                      {team.name} {isMyTeam && '(Đội của bạn)'}
                    </span>
                    <span style={styles.memberCount}>
                      👥 {team.members.length} thành viên
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div style={styles.stats}>
                  <div style={styles.statItem}>
                    <span style={styles.statEmoji}>⭐</span>
                    <span style={styles.statValue}>{formatXP(team.totalXP)}</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statEmoji}>🎯</span>
                    <span style={styles.statValue}>{team.missionsCompleted}</span>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statEmoji}>🏆</span>
                    <span style={styles.statValue}>{team.challengesWon}</span>
                  </div>
                </div>

                {/* Online indicator */}
                <div style={styles.onlineCell}>
                  {team.members.filter(m => m.isOnline).length > 0 && (
                    <span style={styles.onlineIndicator} title="Có thành viên online">
                      ●
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* My team rank (if not in top list) */}
      {myTeamId && !animatedTeams.find(t => t.id === myTeamId) && (
        <div style={styles.myTeamFooter}>
          <span style={styles.myTeamLabel}>Đội của bạn</span>
          <span style={styles.myTeamRank}>
            #{(teams.findIndex(t => t.id === myTeamId) || 0) + 1}
          </span>
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
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
  },
  timeframe: {
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  empty: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#9ca3af',
  },
  emptyEmoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  teamRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '2px solid',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  rankCell: {
    width: '40px',
    textAlign: 'center',
  },
  rankEmoji: {
    fontSize: '24px',
  },
  rankNumber: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#6b7280',
  },
  teamInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  teamAvatar: {
    fontSize: '32px',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
  },
  teamDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  teamName: {
    fontSize: '15px',
    fontWeight: 'bold',
  },
  memberCount: {
    fontSize: '12px',
    color: '#6b7280',
  },
  stats: {
    display: 'flex',
    gap: '16px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statEmoji: {
    fontSize: '14px',
  },
  statValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#4b5563',
  },
  onlineCell: {
    width: '24px',
    textAlign: 'center',
  },
  onlineIndicator: {
    color: '#22c55e',
    fontSize: '12px',
  },
  myTeamFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
    padding: '12px 16px',
    backgroundColor: '#eff6ff',
    borderRadius: '10px',
    border: '1px dashed #3b82f6',
  },
  myTeamLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1d4ed8',
  },
  myTeamRank: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
};
