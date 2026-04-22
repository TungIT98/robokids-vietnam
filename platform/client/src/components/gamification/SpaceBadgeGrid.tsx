/**
 * SpaceBadgeGrid - Badge display component with space theme and glow effects
 * Shows earned badges with unlock animation and locked badges in greyed-out state
 * Displays tier badges (Bronze/Silver/Gold/Platinum/Diamond) and categories
 */

import { useState, useEffect } from 'react';
import { gamificationApi, Badge, BADGE_TIER_INFO, BadgeTier } from '../../services/gamificationApi';

interface SpaceBadgeGridProps {
  studentId?: string;
  showAll?: boolean; // Show all badges including locked
  columns?: number;
  onBadgeClick?: (badge: Badge) => void;
  showTierProgress?: boolean; // Show tier progression at top
}

const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(156, 163, 175, 0.3)',
  uncommon: 'rgba(34, 197, 94, 0.5)',
  rare: 'rgba(59, 130, 246, 0.5)',
  epic: 'rgba(168, 85, 247, 0.6)',
  legendary: 'rgba(249, 115, 22, 0.7)',
};

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f97316',
};

const TIER_ORDER: BadgeTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

function getTierInfo(tier: BadgeTier) {
  return BADGE_TIER_INFO[tier];
}

function getCurrentTier(badgeCount: number): BadgeTier {
  let currentTier: BadgeTier = 'bronze';
  for (const tier of TIER_ORDER) {
    if (badgeCount >= BADGE_TIER_INFO[tier].minBadges) {
      currentTier = tier;
    }
  }
  return currentTier;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SpaceBadgeGrid({ studentId, showAll = true, columns = 4, onBadgeClick }: SpaceBadgeGridProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
  const [earnedDates, setEarnedDates] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    loadBadges();
  }, [studentId]);

  async function loadBadges() {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const data = await gamificationApi.getBadges(token, studentId);
      setBadges(data.badges);

      // Build earned badges set
      const earned = new Set<string>();
      const dates = new Map<string, string>();
      data.badges.forEach((badge) => {
        if (badge.earnedAt) {
          earned.add(badge.id);
          dates.set(badge.id, badge.earnedAt);
        }
      });
      setEarnedBadges(earned);
      setEarnedDates(dates);
    } catch (err: any) {
      setError(err.message || 'Failed to load badges');
    } finally {
      setIsLoading(false);
    }
  }

  const displayBadges = showAll ? badges : badges.filter((b) => earnedBadges.has(b.id));

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerEmoji}>🏅</span>
          <h3 style={styles.headerTitle}>Huy hiệu</h3>
        </div>
        <div style={styles.loadingState}>
          <span style={styles.loadingEmoji}>✨</span>
          <p>Đang tải huy hiệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerEmoji}>🏅</span>
          <h3 style={styles.headerTitle}>Huy hiệu</h3>
        </div>
        <div style={styles.errorState}>
          <span>⚠️ {error}</span>
          <button onClick={loadBadges} style={styles.retryButton}>
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
        <span style={styles.headerEmoji}>🏅</span>
        <h3 style={styles.headerTitle}>Huy hiệu</h3>
        <span style={styles.badgeCount}>
          {earnedBadges.size}/{badges.length}
        </span>
      </div>

      {/* Badge grid */}
      <div
        style={{
          ...styles.grid,
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
        }}
      >
        {displayBadges.map((badge) => {
          const isEarned = earnedBadges.has(badge.id);
          const badgeEarnedAt = earnedDates.get(badge.id);
          const badgeRarity = badge.rarity || 'common';
          const rarityColor = RARITY_COLORS[badgeRarity] || '#9ca3af';
          const glowColor = RARITY_GLOW[badgeRarity] || 'rgba(156, 163, 175, 0.3)';

          void badgeEarnedAt; // suppress unused warning (used in modal below)
          void badgeRarity; // suppress unused warning

          return (
            <div
              key={badge.id}
              onClick={() => {
                setSelectedBadge(badge);
                onBadgeClick?.(badge);
              }}
              style={{
                ...styles.badgeCard,
                ...(isEarned ? { boxShadow: `0 0 20px ${glowColor}` } : {}),
                ...(isEarned ? { borderColor: rarityColor } : {}),
                opacity: isEarned ? 1 : 0.4,
                filter: isEarned ? 'none' : 'grayscale(80%)',
              }}
              onMouseEnter={(e) => {
                if (isEarned) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {/* Lock overlay for unearned */}
              {!isEarned && (
                <div style={styles.lockOverlay}>🔒</div>
              )}

              {/* Badge icon/emoji */}
              <div
                style={{
                  ...styles.badgeIcon,
                  ...(isEarned ? { backgroundColor: `${rarityColor}20` } : {}),
                }}
              >
                🏅
              </div>

              {/* Badge name */}
              <span style={styles.badgeName}>{badge.nameVi || badge.name}</span>

              {/* XP reward */}
              <span style={{ ...styles.xpReward, color: isEarned ? '#a855f7' : '#666' }}>
                +{badge.xpReward} XP
              </span>
            </div>
          );
        })}
      </div>

      {/* Badge detail modal */}
      {selectedBadge && (
        <div
          style={styles.modalOverlay}
          onClick={() => setSelectedBadge(null)}
        >
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalIcon}>🏅</div>
            <h3 style={styles.modalTitle}>{selectedBadge.nameVi || selectedBadge.name}</h3>
            <p style={styles.modalDescription}>
              {selectedBadge.descriptionVi || selectedBadge.description}
            </p>

            <div style={styles.modalDetails}>
              <span
                style={{
                  ...styles.rarityBadge,
                  color: RARITY_COLORS[selectedBadge.rarity || 'common'],
                  borderColor: RARITY_COLORS[selectedBadge.rarity || 'common'],
                }}
              >
                ⭐ {selectedBadge.rarity || 'common'}
              </span>
              <span style={styles.xpBadge}>+{selectedBadge.xpReward} XP</span>
            </div>

            {earnedBadges.has(selectedBadge.id) && earnedDates.get(selectedBadge.id) && (
              <p style={styles.earnedText}>
                ✅ Đã đạt được {formatDate(earnedDates.get(selectedBadge.id)!)}
              </p>
            )}

            {!earnedBadges.has(selectedBadge.id) && (
              <p style={styles.criteriaText}>
                📋 Điều kiện: {selectedBadge.criteria}
              </p>
            )}

            <button
              onClick={() => setSelectedBadge(null)}
              style={styles.closeButton}
            >
              Đóng
            </button>
          </div>
        </div>
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
    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
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
    flex: 1,
  },
  badgeCount: {
    fontSize: '14px',
    color: '#a855f7',
    fontWeight: 'bold',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    padding: '4px 12px',
    borderRadius: '12px',
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
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    color: '#fff',
    border: '1px solid rgba(168, 85, 247, 0.5)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  grid: {
    display: 'grid',
    gap: '12px',
    padding: '16px',
  },
  badgeCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 12px',
    backgroundColor: 'rgba(30, 30, 60, 0.8)',
    borderRadius: '12px',
    border: '2px solid rgba(100, 100, 255, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    zIndex: 1,
  },
  badgeIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'rgba(50, 50, 100, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginBottom: '8px',
  },
  badgeName: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: '4px',
  },
  xpReward: {
    fontSize: '11px',
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: 'rgba(20, 20, 40, 0.98)',
    borderRadius: '24px',
    padding: '32px',
    maxWidth: '360px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid rgba(100, 100, 255, 0.3)',
    boxShadow: '0 0 60px rgba(168, 85, 247, 0.3)',
  },
  modalIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
    margin: '0 0 12px 0',
  },
  modalDescription: {
    fontSize: '14px',
    color: '#aaa',
    margin: '0 0 20px 0',
    lineHeight: 1.5,
  },
  modalDetails: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  rarityBadge: {
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '4px 12px',
    border: '1px solid',
    borderRadius: '20px',
  },
  xpBadge: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#a855f7',
    padding: '4px 12px',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: '20px',
  },
  earnedText: {
    fontSize: '14px',
    color: '#22c55e',
    margin: '0 0 20px 0',
  },
  criteriaText: {
    fontSize: '12px',
    color: '#888',
    margin: '0 0 20px 0',
  },
  closeButton: {
    padding: '12px 32px',
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
    color: '#fff',
    border: '1px solid rgba(99, 102, 241, 0.5)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  },
};