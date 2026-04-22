/**
 * Leaderboard - Top 10 space-themed leaderboard
 * Shows rank, avatar, name, XP with special styling for top ranks
 */

import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../services/gamificationApi';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  onEntryClick?: (entry: LeaderboardEntry) => void;
  title?: string;
  showLevel?: boolean;
  showStreak?: boolean;
}

const RANK_TITLES = [
  { maxRank: 1, title: 'Commander', titleVi: 'Tư lệnh', emoji: '👑', color: '#fbbf24' },
  { maxRank: 2, title: 'Captain', titleVi: 'Đội trưởng', emoji: '⭐', color: '#94a3b8' },
  { maxRank: 3, title: 'Lieutenant', titleVi: 'Thiếu tá', emoji: '🌟', color: '#f97316' },
  { maxRank: 10, title: 'Cadet', titleVi: 'Học viên', emoji: '🚀', color: '#6366f1' },
];

function getRankInfo(rank: number) {
  return RANK_TITLES.find(r => rank <= r.maxRank) || RANK_TITLES[RANK_TITLES.length - 1];
}

export default function Leaderboard({
  entries,
  currentUserId,
  onEntryClick,
  title = 'Bảng xếp hạng Space Academy',
  showLevel = true,
  showStreak = true,
}: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%)',
        borderRadius: '20px',
        padding: '40px',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🏆</span>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Chưa có dữ liệu bảng xếp hạng</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%)',
      borderRadius: '20px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 0 40px rgba(99, 102, 241, 0.1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: 700,
          background: 'linear-gradient(90deg, #a855f7, #6366f1, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          🏆 {title}
        </h3>
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          background: 'rgba(99, 102, 241, 0.2)',
          padding: '4px 12px',
          borderRadius: '12px',
        }}>
          Top {entries.length}
        </div>
      </div>

      {/* Leaderboard entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {entries.map((entry, index) => {
          const rankInfo = getRankInfo(entry.rank);
          const isCurrentUser = entry.isCurrentUser || entry.studentId === currentUserId;

          return (
            <motion.div
              key={entry.studentId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onEntryClick?.(entry)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '16px',
                background: isCurrentUser
                  ? 'linear-gradient(90deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.2))'
                  : 'rgba(255, 255, 255, 0.03)',
                border: isCurrentUser
                  ? '2px solid rgba(168, 85, 247, 0.5)'
                  : entry.rank <= 3
                    ? `1px solid ${rankInfo.color}40`
                    : '1px solid rgba(255, 255, 255, 0.05)',
                cursor: onEntryClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
              whileHover={{
                scale: onEntryClick ? 1.02 : 1,
                background: isCurrentUser
                  ? 'linear-gradient(90deg, rgba(168, 85, 247, 0.3), rgba(99, 102, 241, 0.3))'
                  : 'rgba(255, 255, 255, 0.06)',
              }}
            >
              {/* Rank */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: entry.rank <= 3
                  ? `${rankInfo.color}30`
                  : 'rgba(99, 102, 241, 0.2)',
                fontSize: entry.rank <= 3 ? '20px' : '14px',
                fontWeight: 700,
                color: entry.rank <= 3 ? rankInfo.color : '#94a3b8',
              }}>
                {entry.rank <= 3 ? rankInfo.emoji : `#${entry.rank}`}
              </div>

              {/* Avatar */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${rankInfo.color}40, #6366f140)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                border: `2px solid ${rankInfo.color}60`,
              }}>
                {entry.avatarEmoji || '🤖'}
              </div>

              {/* Name and level */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: isCurrentUser ? '#a855f7' : '#f3f4f6',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {entry.studentName}
                  {isCurrentUser && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '10px',
                      color: '#a855f7',
                      fontWeight: 600,
                    }}>
                      (Bạn)
                    </span>
                  )}
                </div>
                {showLevel && (
                  <div style={{
                    fontSize: '12px',
                    color: rankInfo.color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    {rankInfo.emoji} {rankInfo.titleVi}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '4px',
              }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: '16px',
                  background: 'linear-gradient(90deg, #a855f7, #6366f1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {entry.xp.toLocaleString()} XP
                </div>
                {showStreak && entry.streak > 0 && (
                  <div style={{
                    fontSize: '11px',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}>
                    🔥 {entry.streak}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Top 3 podium highlight */}
      {entries.length >= 3 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '8px',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          {/* 2nd place */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #94a3b8, #64748b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              border: '3px solid #94a3b8',
            }}>
              {entries[1].avatarEmoji || '🤖'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
              {entries[1].studentName.split(' ')[0]}
            </div>
            <div style={{
              width: '60px',
              height: '50px',
              background: 'linear-gradient(180deg, #64748b 0%, #475569 100%)',
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}>
              🥈
            </div>
          </div>

          {/* 1st place */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '34px',
              border: '4px solid #fbbf24',
              boxShadow: '0 0 30px rgba(251, 191, 36, 0.5)',
            }}>
              {entries[0].avatarEmoji || '🤖'}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24' }}>
              {entries[0].studentName.split(' ')[0]}
            </div>
            <div style={{
              width: '80px',
              height: '70px',
              background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)',
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: '0 0 30px rgba(251, 191, 36, 0.4)',
            }}>
              👑
            </div>
          </div>

          {/* 3rd place */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              border: '3px solid #f97316',
            }}>
              {entries[2].avatarEmoji || '🤖'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#f97316' }}>
              {entries[2].studentName.split(' ')[0]}
            </div>
            <div style={{
              width: '55px',
              height: '40px',
              background: 'linear-gradient(180deg, #ea580c 0%, #c2410c 100%)',
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}>
              🥉
            </div>
          </div>
        </div>
      )}
    </div>
  );
}