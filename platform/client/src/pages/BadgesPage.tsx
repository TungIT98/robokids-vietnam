/**
 * BadgesPage - Shows all badges the user has earned and available badges
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BadgeGrid } from '../components/BadgeCard';

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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export default function BadgesPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<{ badgeSlug: string; earnedAt: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'earned' | 'not_earned'>('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadBadges();
  }, [user, navigate]);

  async function loadBadges() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/progress/badges`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load badges');
      const data = await response.json();
      setAllBadges(data);

      // Get earned badges from progress
      const statsRes = await fetch(`${API_BASE}/api/progress/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        const earned = (stats.badges_earned || []).map((slug: string) => ({
          badgeSlug: slug,
          earnedAt: stats.badge_earned_dates?.[slug] || new Date().toISOString(),
        }));
        setEarnedBadges(earned);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badges');
    } finally {
      setIsLoading(false);
    }
  }

  const earnedCount = allBadges.filter(b => b.earned).length;
  const totalCount = allBadges.length;

  const filteredBadges = allBadges.filter(badge => {
    if (filter === 'earned') return badge.earned;
    if (filter === 'not_earned') return !badge.earned;
    return true;
  });

  const styles: Record<string, React.CSSProperties> = {
    container: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '24px 16px',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#1f2937',
    },
    stats: {
      fontSize: '16px',
      color: '#6b7280',
    },
    statsNum: {
      fontWeight: 700,
      color: '#f97316',
    },
    filterRow: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
    },
    filterBtn: {
      padding: '8px 16px',
      borderRadius: '20px',
      border: '1px solid #e5e7eb',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      color: '#6b7280',
      transition: 'all 0.2s',
    },
    filterBtnActive: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: '1px solid #3b82f6',
    },
    loading: {
      textAlign: 'center',
      padding: '48px',
      color: '#6b7280',
      fontSize: '16px',
    },
    error: {
      textAlign: 'center',
      padding: '48px',
      color: '#ef4444',
      fontSize: '16px',
    },
    backBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
    },
    progressBar: {
      height: '8px',
      backgroundColor: '#e5e7eb',
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '24px',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#f97316',
      transition: 'width 0.3s ease',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <button
            style={styles.backBtn}
            onClick={() => navigate('/missions')}
          >
            ← Quay lại
          </button>
        </div>
        <h1 style={styles.title}>🏅 Huy hiệu của tôi</h1>
        <div style={styles.stats}>
          <span style={styles.statsNum}>{earnedCount}</span> / {totalCount} đã đạt được
        </div>
      </div>

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }} />
      </div>

      <div style={styles.filterRow}>
        {(['all', 'earned', 'not_earned'] as const).map(f => (
          <button
            key={f}
            style={{
              ...styles.filterBtn,
              ...(filter === f ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Tất cả' : f === 'earned' ? 'Đã đạt' : 'Chưa đạt'}
          </button>
        ))}
      </div>

      {isLoading && <div style={styles.loading}>Đang tải huy hiệu...</div>}
      {error && <div style={styles.error}>{error}</div>}
      {!isLoading && !error && <BadgeGrid badges={filteredBadges} earnedBadges={earnedBadges} />}
    </div>
  );
}