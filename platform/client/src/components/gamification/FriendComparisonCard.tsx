/**
 * FriendComparisonCard - Compare current user with friends on leaderboard
 * Shows rank difference, XP difference, and who is ahead
 */

import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../services/gamificationApi';

interface FriendComparisonCardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  onEntryClick?: (entry: LeaderboardEntry) => void;
}

export default function FriendComparisonCard({
  entries,
  currentUserId,
  onEntryClick,
}: FriendComparisonCardProps) {
  if (entries.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%)',
        borderRadius: '20px',
        padding: '32px',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>👥</span>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          Thêm bạn bè để so sánh thứ hạng!
        </p>
      </div>
    );
  }

  const currentUserEntry = entries.find(e => e.studentId === currentUserId);
  const currentUserRank = currentUserEntry?.rank;

  // Sort by rank
  const sortedEntries = [...entries].sort((a, b) => a.rank - b.rank);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%)',
      borderRadius: '20px',
      padding: '20px',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 0 40px rgba(99, 102, 241, 0.1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 700,
          background: 'linear-gradient(90deg, #a855f7, #6366f1, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          👥 So sánh với bạn bè
        </h3>
        <div style={{
          fontSize: '11px',
          color: '#6b7280',
          background: 'rgba(99, 102, 241, 0.2)',
          padding: '3px 10px',
          borderRadius: '10px',
        }}>
          {entries.length} người chơi
        </div>
      </div>

      {/* Current user highlight */}
      {currentUserEntry && currentUserRank && (
        <div style={{
          background: 'rgba(168, 85, 247, 0.15)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #a855f740, #6366f140)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}>
              {currentUserEntry.avatarEmoji || '🤖'}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#a855f7' }}>
                {currentUserEntry.studentName} (Bạn)
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Hạng #{currentUserRank} • {currentUserEntry.xp.toLocaleString()} XP
              </div>
            </div>
          </div>

          {/* Compare with friends above/below */}
          {(() => {
            const usersAbove = entries.filter(e => e.rank < currentUserRank).length;
            const usersBelow = entries.filter(e => e.rank > currentUserRank).length;

            if (usersAbove === 0 && usersBelow === 0) {
              return (
                <div style={{
                  fontSize: '12px',
                  color: '#22c55e',
                  fontWeight: 600,
                  background: 'rgba(34, 197, 94, 0.15)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                }}>
                  🏆 Top của nhóm!
                </div>
              );
            }

            if (usersAbove > 0) {
              const closestAbove = entries
                .filter(e => e.rank < currentUserRank)
                .sort((a, b) => a.rank - b.rank)[0];
              return (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>
                    Cần {closestAbove.xp - currentUserEntry.xp} XP để vượt
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#f59e0b',
                    fontWeight: 600,
                  }}>
                    {closestAbove.avatarEmoji} {closestAbove.studentName}
                  </div>
                </div>
              );
            }

            return (
              <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                Dẫn đầu {usersBelow} bạn! 🎉
              </div>
            );
          })()}
        </div>
      )}

      {/* Friends list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sortedEntries.map((entry, index) => {
          const isCurrentUser = entry.studentId === currentUserId;
          const isAbove = currentUserRank !== undefined && entry.rank < currentUserRank;
          const isBelow = currentUserRank !== undefined && entry.rank > currentUserRank;

          return (
            <motion.div
              key={entry.studentId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onEntryClick?.(entry)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '12px',
                background: isCurrentUser
                  ? 'rgba(168, 85, 247, 0.2)'
                  : isAbove
                    ? 'rgba(239, 68, 68, 0.1)'
                    : isBelow
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(255, 255, 255, 0.03)',
                border: isCurrentUser
                  ? '1px solid rgba(168, 85, 247, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
                cursor: onEntryClick ? 'pointer' : 'default',
              }}
            >
              {/* Rank */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: entry.rank === 1
                  ? 'rgba(255, 215, 0, 0.3)'
                  : entry.rank === 2
                    ? 'rgba(192, 192, 192, 0.3)'
                    : entry.rank === 3
                      ? 'rgba(205, 127, 50, 0.3)'
                      : 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : '#94a3b8',
              }}>
                {entry.rank <= 3 ? ['👑', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
              </div>

              {/* Avatar */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}>
                {entry.avatarEmoji || '🤖'}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isCurrentUser ? '#a855f7' : '#f3f4f6',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {entry.studentName}
                  {isCurrentUser && <span style={{ color: '#a855f7', fontSize: '11px' }}> (Bạn)</span>}
                  {!isCurrentUser && isAbove && (
                    <span style={{ color: '#ef4444', fontSize: '10px', marginLeft: '4px' }}>
                      ↑ vượt bạn
                    </span>
                  )}
                  {!isCurrentUser && isBelow && (
                    <span style={{ color: '#22c55e', fontSize: '10px', marginLeft: '4px' }}>
                      ↓ sau bạn
                    </span>
                  )}
                </div>
              </div>

              {/* XP difference indicator */}
              {currentUserEntry && !isCurrentUser && (
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: entry.xp > currentUserEntry.xp ? '#ef4444' : '#22c55e',
                }}>
                  {entry.xp > currentUserEntry.xp
                    ? `+${entry.xp - currentUserEntry.xp}`
                    : `-${currentUserEntry.xp - entry.xp}`}{' '}
                  XP
                </div>
              )}

              {/* XP */}
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#a855f7',
              }}>
                {entry.xp.toLocaleString()}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
