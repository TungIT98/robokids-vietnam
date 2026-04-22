import { Badge } from '../services/parentApi';

interface BadgeGridProps {
  badges: Badge[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function BadgeGrid({ badges }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <div style={{ background: '#181825', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#6c7086' }}>
        Chưa có huy hiệu nào được nhận
      </div>
    );
  }

  // Separate earned and available badges (show only earned for parent dashboard)
  const earnedBadges = badges.filter(b => b.earnedAt);

  return (
    <div style={{ background: '#181825', borderRadius: '12px', padding: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#cdd6f4' }}>
        Huy hiệu đạt được
        <span style={{ fontSize: '13px', fontWeight: 400, color: '#6c7086', marginLeft: '8px' }}>
          ({earnedBadges.length})
        </span>
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: '12px',
      }}>
        {earnedBadges.map(badge => (
          <div
            key={badge.id}
            style={{
              background: '#313244',
              borderRadius: '10px',
              padding: '12px',
              textAlign: 'center',
              border: `2px solid ${badge.colorHex || '#45475a'}`,
              position: 'relative',
            }}
            title={`${badge.name}\n${badge.description}\nĐạt ngày: ${formatDate(badge.earnedAt)}`}
          >
            {/* Badge icon */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: badge.colorHex || '#45475a',
              margin: '0 auto 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: `0 0 12px ${badge.colorHex || '#45475a'}40`,
            }}>
              {badge.iconUrl ? (
                <img src={badge.iconUrl} alt={badge.name} style={{ width: '28px', height: '28px' }} />
              ) : (
                <span role="img" aria-label="badge">🏆</span>
              )}
            </div>

            {/* Badge name */}
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#cdd6f4',
              lineHeight: 1.2,
              marginBottom: '4px',
            }}>
              {badge.name}
            </div>

            {/* XP reward */}
            <div style={{
              fontSize: '10px',
              color: '#a6adc8',
            }}>
              +{badge.xpReward} XP
            </div>

            {/* Earned date */}
            <div style={{
              fontSize: '9px',
              color: '#6c7086',
              marginTop: '4px',
            }}>
              {formatDate(badge.earnedAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
