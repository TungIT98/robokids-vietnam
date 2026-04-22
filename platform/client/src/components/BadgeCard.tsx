/**
 * BadgeCard - displays a single badge with earned/locked state
 */
import { useState } from 'react';

interface Badge {
  id: string;
  slug: string;
  name: string;
  nameVi: string;
  nameEn: string;
  description: string;
  descriptionVi: string;
  descriptionEn: string;
  iconEmoji: string;
  colorHex: string;
  category: string;
  rarity: string;
  earned: boolean;
}

interface BadgeCardProps {
  badge: Badge;
  earnedAt?: string | null;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f97316',
};

const RARITY_LABELS: Record<string, { vi: string; en: string }> = {
  common: { vi: 'Phổ biến', en: 'Common' },
  uncommon: { vi: 'Hiếm', en: 'Uncommon' },
  rare: { vi: 'Quý', en: 'Rare' },
  epic: { vi: 'Sử thi', en: 'Epic' },
  legendary: { vi: 'Huyền thoại', en: 'Legendary' },
};

const CATEGORY_LABELS: Record<string, { vi: string; en: string }> = {
  lesson: { vi: 'Bài học', en: 'Lesson' },
  streak: { vi: 'Chuỗi ngày', en: 'Streak' },
  level: { vi: 'Cấp độ', en: 'Level' },
  mission: { vi: 'Nhiệm vụ', en: 'Mission' },
  course: { vi: 'Khóa học', en: 'Course' },
  special: { vi: 'Đặc biệt', en: 'Special' },
};

export default function BadgeCard({ badge, earnedAt }: BadgeCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const rarityColor = RARITY_COLORS[badge.rarity] || '#9ca3af';
  const rarityLabel = RARITY_LABELS[badge.rarity] || { vi: badge.rarity, en: badge.rarity };
  const categoryLabel = CATEGORY_LABELS[badge.category] || { vi: badge.category, en: badge.category };

  const styles: Record<string, React.CSSProperties> = {
    card: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 12px',
      borderRadius: '12px',
      backgroundColor: badge.earned ? '#fef9c3' : '#f3f4f6',
      border: `2px solid ${badge.earned ? rarityColor : '#e5e7eb'}`,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative',
      opacity: badge.earned ? 1 : 0.6,
      filter: badge.earned ? 'none' : 'grayscale(80%)',
    },
    emoji: {
      fontSize: '40px',
      marginBottom: '8px',
      filter: badge.earned ? 'none' : 'grayscale(100%)',
    },
    name: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#1f2937',
      textAlign: 'center',
      marginBottom: '4px',
    },
    rarityBadge: {
      fontSize: '10px',
      fontWeight: 500,
      color: rarityColor,
      border: `1px solid ${rarityColor}`,
      borderRadius: '4px',
      padding: '2px 6px',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '30px',
    },
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <>
      <div
        style={styles.card}
        onClick={() => setShowDetail(true)}
        onMouseEnter={(e) => {
          if (badge.earned) {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {!badge.earned && <div style={styles.overlay}>🔒</div>}
        <div style={styles.emoji}>{badge.iconEmoji}</div>
        <div style={styles.name}>{badge.nameVi || badge.name}</div>
        <div style={styles.rarityBadge}>{rarityLabel.vi}</div>
      </div>

      {showDetail && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDetail(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '320px',
              width: '90%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{badge.iconEmoji}</div>
            <h3 style={{ margin: '0 0 8px', color: '#1f2937', fontSize: '20px' }}>{badge.nameVi || badge.name}</h3>
            <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px' }}>{badge.descriptionVi || badge.description}</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ ...styles.rarityBadge, fontSize: '12px', padding: '4px 10px' }}>
                ⭐ {rarityLabel.vi}
              </span>
              <span style={{ fontSize: '12px', color: '#6b7280', padding: '4px 10px', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                🏷️ {categoryLabel.vi}
              </span>
            </div>
            {badge.earned && earnedAt && (
              <p style={{ color: '#22c55e', fontSize: '13px', margin: '0' }}>
                ✅ Đã đạt được {formatDate(earnedAt)}
              </p>
            )}
            {!badge.earned && (
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0' }}>
                🔒 Chưa đạt được
              </p>
            )}
            <button
              onClick={() => setShowDetail(false)}
              style={{
                marginTop: '20px',
                padding: '10px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface BadgeGridProps {
  badges: Badge[];
  earnedBadges?: { badgeSlug: string; earnedAt: string }[];
}

export function BadgeGrid({ badges, earnedBadges = [] }: BadgeGridProps) {
  const earnedMap = new Map(earnedBadges.map(e => [e.badgeSlug, e.earnedAt]));

  const styles: Record<string, React.CSSProperties> = {
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap: '12px',
    },
    categorySection: {
      marginBottom: '24px',
    },
    categoryTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '12px',
    },
  };

  // Group badges by category
  const categories = ['lesson', 'streak', 'level', 'mission', 'course', 'special'];
  const grouped = badges.reduce((acc, badge) => {
    const cat = badge.category || 'special';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);

  return (
    <div>
      {categories.map(cat => {
        const catBadges = grouped[cat];
        if (!catBadges?.length) return null;
        const label = CATEGORY_LABELS[cat] || { vi: cat, en: cat };
        return (
          <div key={cat} style={styles.categorySection}>
            <div style={styles.categoryTitle}>{label.vi}</div>
            <div style={styles.grid}>
              {catBadges.map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  earnedAt={earnedMap.get(badge.slug) || null}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface BadgeDisplayProps {
  badgeSlug: string;
  badgeName: string;
}

export function BadgeDisplay({ badgeSlug, badgeName }: BadgeDisplayProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: '#fef3c7',
        color: '#d97706',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
      }}
    >
      🏅 {badgeName || badgeSlug}
    </span>
  );
}