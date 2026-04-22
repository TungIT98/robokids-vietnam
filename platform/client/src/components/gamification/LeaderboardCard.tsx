/**
 * LeaderboardCard - Animated leaderboard entry card with rank changes and rewards
 * Shows rank, avatar, name, XP, level, streak, and animated rank changes
 */

import { motion, AnimatePresence } from 'framer-motion';
import { LeaderboardEntry } from '../services/gamificationApi';

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  rankChange?: number | null; // positive = moved up, negative = moved down
  isCurrentUser?: boolean;
  showRewardBadge?: boolean;
  onClick?: (entry: LeaderboardEntry) => void;
  compact?: boolean;
}

// Reward tiers for top 3
const REWARD_CONFIG: Record<number, { emoji: string; label: string; color: string; bgColor: string }> = {
  1: { emoji: '👑', label: 'Vô địch', color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.15)' },
  2: { emoji: '🥈', label: 'Á quân', color: '#C0C0C0', bgColor: 'rgba(192, 192, 192, 0.15)' },
  3: { emoji: '🥉', label: 'Hạng ba', color: '#CD7F32', bgColor: 'rgba(205, 127, 50, 0.15)' },
};

// Rank title based on rank
function getRankTitle(rank: number): { title: string; titleVi: string; color: string } {
  if (rank === 1) return { title: 'Commander', titleVi: 'Tư lệnh', color: '#FFD700' };
  if (rank === 2) return { title: 'Captain', titleVi: 'Đội trưởng', color: '#C0C0C0' };
  if (rank === 3) return { title: 'Lieutenant', titleVi: 'Thiếu tá', color: '#CD7F32' };
  if (rank <= 10) return { title: 'Cadet', titleVi: 'Học viên', color: '#6366f1' };
  return { title: 'Recruit', titleVi: 'Tân binh', color: '#6b7280' };
}

export default function LeaderboardCard({
  entry,
  rankChange,
  isCurrentUser,
  showRewardBadge = true,
  onClick,
  compact = false,
}: LeaderboardCardProps) {
  const rankInfo = getRankTitle(entry.rank);
  const reward = showRewardBadge && entry.rank <= 3 ? REWARD_CONFIG[entry.rank] : null;
  const isUp = rankChange !== null && rankChange !== undefined && rankChange > 0;
  const isDown = rankChange !== null && rankChange !== undefined && rankChange < 0;

  if (compact) {
    return (
      <motion.div
        key={entry.studentId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={() => onClick?.(entry)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderRadius: '12px',
          background: isCurrentUser
            ? 'linear-gradient(90deg, rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.15))'
            : 'rgba(255, 255, 255, 0.05)',
          border: isCurrentUser ? '1.5px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Rank with change indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '45px' }}>
          <span style={{
            fontSize: entry.rank <= 3 ? '18px' : '14px',
            fontWeight: 700,
            color: entry.rank <= 3 ? rankInfo.color : '#94a3b8',
          }}>
            {entry.rank <= 3 ? reward?.emoji : `#${entry.rank}`}
          </span>
          <AnimatePresence>
            {isUp && (
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                style={{ fontSize: '12px', color: '#22c55e' }}
              >
                ▲{rankChange}
              </motion.span>
            )}
            {isDown && (
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                style={{ fontSize: '12px', color: '#ef4444' }}
              >
                ▼{Math.abs(rankChange!)}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: `linear-gradient(135deg, ${rankInfo.color}40, #6366f140)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          border: `1.5px solid ${rankInfo.color}50`,
        }}>
          {entry.avatarEmoji || '🤖'}
        </div>

        {/* Name and level */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600,
            fontSize: '13px',
            color: isCurrentUser ? '#a855f7' : '#f3f4f6',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {entry.studentName}
            {isCurrentUser && <span style={{ color: '#a855f7', fontSize: '11px' }}> (Bạn)</span>}
          </div>
          <div style={{ fontSize: '11px', color: rankInfo.color }}>
            {rankInfo.titleVi}
          </div>
        </div>

        {/* XP */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontWeight: 700,
            fontSize: '14px',
            background: 'linear-gradient(90deg, #a855f7, #6366f1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {entry.xp.toLocaleString()} XP
          </div>
          {entry.streak > 0 && (
            <div style={{ fontSize: '11px', color: '#f59e0b' }}>
              🔥 {entry.streak}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Full-size card
  return (
    <motion.div
      key={entry.studentId}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => onClick?.(entry)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        borderRadius: '16px',
        background: isCurrentUser
          ? 'linear-gradient(90deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.2))'
          : reward
            ? reward.bgColor
            : 'rgba(255, 255, 255, 0.03)',
        border: isCurrentUser
          ? '2px solid rgba(168, 85, 247, 0.5)'
          : entry.rank <= 3
            ? `1px solid ${rankInfo.color}50`
            : '1px solid rgba(255, 255, 255, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={{
        scale: onClick ? 1.01 : 1,
        background: isCurrentUser
          ? 'linear-gradient(90deg, rgba(168, 85, 247, 0.25), rgba(99, 102, 241, 0.25))'
          : reward
            ? reward.bgColor
            : 'rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Reward badge for top 3 */}
      {reward && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          backgroundColor: reward.color,
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          padding: '2px 8px',
          borderRadius: '10px',
          boxShadow: `0 2px 8px ${reward.color}60`,
        }}>
          {reward.emoji} {reward.label}
        </div>
      )}

      {/* Rank section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '50px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: entry.rank <= 3
            ? `${rankInfo.color}30`
            : 'rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: entry.rank <= 3 ? '22px' : '16px',
          fontWeight: 700,
          color: entry.rank <= 3 ? rankInfo.color : '#94a3b8',
          border: entry.rank <= 3 ? `2px solid ${rankInfo.color}` : 'none',
        }}>
          {entry.rank <= 3 ? reward?.emoji : `#${entry.rank}`}
        </div>

        {/* Rank change indicator */}
        <AnimatePresence>
          {rankChange !== null && rankChange !== undefined && rankChange !== 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '10px',
                fontWeight: 'bold',
                color: isUp ? '#22c55e' : '#ef4444',
                marginTop: '2px',
              }}
            >
              {isUp ? '▲' : '▼'}
              {Math.abs(rankChange)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Avatar */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '14px',
        background: `linear-gradient(135deg, ${rankInfo.color}40, #6366f140)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '26px',
        border: `2px solid ${rankInfo.color}60`,
        boxShadow: entry.rank <= 3 ? `0 0 20px ${rankInfo.color}40` : 'none',
      }}>
        {entry.avatarEmoji || '🤖'}
      </div>

      {/* Name and info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600,
          fontSize: '15px',
          color: isCurrentUser ? '#a855f7' : '#f3f4f6',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '2px',
        }}>
          {entry.studentName}
          {isCurrentUser && (
            <span style={{
              marginLeft: '8px',
              fontSize: '11px',
              color: '#a855f7',
              fontWeight: 600,
            }}>
              (Bạn)
            </span>
          )}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: rankInfo.color,
        }}>
          <span>{rankInfo.emoji} {rankInfo.titleVi}</span>
          <span style={{ color: '#6b7280' }}>•</span>
          <span>Cấp {entry.level}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <div style={{
          fontWeight: 700,
          fontSize: '18px',
          background: 'linear-gradient(90deg, #a855f7, #6366f1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {entry.xp.toLocaleString()} XP
        </div>
        {entry.streak > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            fontSize: '12px',
            color: '#f59e0b',
          }}>
            🔥 {entry.streak} streak
          </div>
        )}
        {entry.periodXp !== undefined && entry.periodXp > 0 && (
          <div style={{
            fontSize: '11px',
            color: '#22c55e',
            fontWeight: 600,
          }}>
            +{entry.periodXp.toLocaleString()} hôm nay
          </div>
        )}
      </div>
    </motion.div>
  );
}
