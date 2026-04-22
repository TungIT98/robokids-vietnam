/**
 * BadgeDisplay - Grid display of all badges with earned/locked states
 * Space Academy theme with glow effects for earned badges
 * Shows tier badges (Bronze/Silver/Gold/Platinum/Diamond)
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Badge, BADGE_TIER_INFO, BadgeTier } from '../services/gamificationApi';

interface BadgeDisplayProps {
  badges: Badge[];
  earnedBadges?: Set<string>; // Set of earned badge keys
  onBadgeClick?: (badge: Badge) => void;
  size?: 'small' | 'medium' | 'large';
  showLocked?: boolean;
  highlightNew?: string; // Badge key that was just earned
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function getBadgeIcon(badge: Badge): string {
  if (badge.iconUrl) return '';
  return badge.iconEmoji || '🏆';
}

function getTierBadge(tier: BadgeTier): { icon: string; color: string; label: string } {
  const info = BADGE_TIER_INFO[tier];
  return {
    icon: info.icon,
    color: info.color,
    label: info.nameVi,
  };
}

export default function BadgeDisplay({
  badges,
  earnedBadges,
  onBadgeClick,
  size = 'medium',
  showLocked = true,
  highlightNew,
}: BadgeDisplayProps) {
  const earnedSet = earnedBadges || new Set(badges.filter(b => b.earnedAt).map(b => b.key));
  const sizeConfig = {
    small: { iconSize: 32, fontSize: 10, padding: 8 },
    medium: { iconSize: 48, fontSize: 12, padding: 12 },
    large: { iconSize: 64, fontSize: 14, padding: 16 },
  }[size];

  const filteredBadges = showLocked ? badges : badges.filter(b => earnedSet.has(b.key));

  if (filteredBadges.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%)',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🔒</span>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Chưa có huy hiệu nào được mở khóa</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '16px',
    }}>
      {filteredBadges.map((badge, index) => {
        const isEarned = earnedSet.has(badge.key);
        const isNew = highlightNew === badge.key;
        const tierBadge = getTierBadge(badge.tier);

        return (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
            onClick={() => onBadgeClick?.(badge)}
            style={{
              position: 'relative',
              cursor: onBadgeClick ? 'pointer' : 'default',
            }}
          >
            <motion.div
              animate={isNew ? {
                scale: [1, 1.2, 1],
                boxShadow: [
                  '0 0 0px rgba(34, 197, 94, 0)',
                  '0 0 30px rgba(34, 197, 94, 0.8)',
                  '0 0 0px rgba(34, 197, 94, 0)',
                ],
              } : {}}
              transition={{ duration: 0.6 }}
              style={{
                background: isEarned
                  ? `linear-gradient(135deg, ${badge.colorHex}20 0%, ${badge.colorHex}10 100%)`
                  : 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                borderRadius: '16px',
                padding: `${sizeConfig.padding}px`,
                textAlign: 'center',
                border: `2px solid ${isEarned ? badge.colorHex : '#374151'}`,
                boxShadow: isEarned
                  ? `0 0 20px ${badge.colorHex}40, inset 0 0 20px ${badge.colorHex}10`
                  : 'none',
                opacity: isEarned ? 1 : 0.5,
                transition: 'all 0.3s ease',
              }}
              whileHover={onBadgeClick ? {
                scale: 1.05,
                boxShadow: isEarned
                  ? `0 0 30px ${badge.colorHex}60`
                  : '0 4px 12px rgba(0,0,0,0.3)',
              } : {}}
            >
              {/* New badge indicator */}
              <AnimatePresence>
                {isNew && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#22c55e',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      animation: 'pulse 1s infinite',
                      zIndex: 10,
                    }}
                  >
                    MỚI!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tier badge indicator */}
              <div style={{
                position: 'absolute',
                top: '-4px',
                left: '-4px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: tierBadge.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                boxShadow: isEarned ? `0 0 8px ${tierBadge.color}80` : 'none',
                border: '2px solid rgba(0,0,0,0.3)',
              }}>
                {tierBadge.icon}
              </div>

              {/* Badge icon */}
              <div style={{
                width: `${sizeConfig.iconSize}px`,
                height: `${sizeConfig.iconSize}px`,
                borderRadius: '50%',
                background: isEarned ? badge.colorHex : '#374151',
                margin: '0 auto 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${sizeConfig.iconSize * 0.5}px`,
                boxShadow: isEarned ? `0 0 15px ${badge.colorHex}60` : 'none',
              }}>
                {badge.iconUrl ? (
                  <img
                    src={badge.iconUrl}
                    alt={badge.nameVi}
                    style={{ width: '60%', height: '60%', objectFit: 'contain' }}
                  />
                ) : (
                  <span>{getBadgeIcon(badge)}</span>
                )}
              </div>

              {/* Badge name */}
              <div style={{
                fontSize: `${sizeConfig.fontSize}px`,
                fontWeight: 700,
                color: isEarned ? '#f3f4f6' : '#6b7280',
                marginBottom: '4px',
                lineHeight: 1.2,
              }}>
                {badge.nameVi}
              </div>

              {/* Tier label */}
              <div style={{
                fontSize: '9px',
                color: isEarned ? tierBadge.color : '#4b5563',
                fontWeight: 600,
                marginBottom: '2px',
              }}>
                {tierBadge.label}
              </div>

              {/* XP reward */}
              <div style={{
                fontSize: `${sizeConfig.fontSize - 2}px`,
                color: isEarned ? badge.colorHex : '#4b5563',
                fontWeight: 600,
              }}>
                +{badge.xpReward} XP
              </div>

              {/* Earned date */}
              {isEarned && badge.earnedAt && (
                <div style={{
                  fontSize: '9px',
                  color: '#6b7280',
                  marginTop: '4px',
                }}>
                  {formatDate(badge.earnedAt)}
                </div>
              )}

              {/* Locked overlay */}
              {!isEarned && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '24px',
                  opacity: 0.5,
                }}>
                  🔒
                </div>
              )}
            </motion.div>

            {/* Tooltip on hover */}
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              color: '#f3f4f6',
              whiteSpace: 'nowrap',
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.2s',
              zIndex: 50,
              marginBottom: '8px',
            }} className="badge-tooltip">
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{badge.nameVi}</div>
              <div style={{ color: '#9ca3af', fontSize: '11px' }}>{badge.descriptionVi}</div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', justifyContent: 'center' }}>
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  background: `${tierBadge.color}30`,
                  border: `1px solid ${tierBadge.color}`,
                  borderRadius: '4px',
                  color: tierBadge.color,
                }}>
                  {tierBadge.icon} {tierBadge.label}
                </span>
              </div>
              <div style={{ color: '#6b7280', fontSize: '10px', marginTop: '4px' }}>
                Điều kiện: {badge.criteria}
              </div>
            </div>
          </motion.div>
        );
      })}

      <style>{`
        .badge-tooltip { display: none; }
        div:hover .badge-tooltip { display: block; }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}