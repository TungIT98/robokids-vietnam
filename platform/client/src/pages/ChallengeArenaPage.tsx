/**
 * ChallengeArenaPage - Browse and filter coding challenges
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { challengesApi, Challenge } from '../services/challengesApi';

type Difficulty = 'easy' | 'medium' | 'hard' | 'all';

const DIFFICULTY_CONFIG: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  all: { label: 'Tất cả', emoji: '🎯', color: '#6366f1', bgColor: '#e0e7ff' },
  easy: { label: 'Dễ', emoji: '🟢', color: '#22c55e', bgColor: '#dcfce7' },
  medium: { label: 'Trung bình', emoji: '🟡', color: '#eab308', bgColor: '#fef9c3' },
  hard: { label: 'Khó', emoji: '🔴', color: '#ef4444', bgColor: '#fef2f2' },
};

export default function ChallengeArenaPage() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadChallenges();
  }, [difficulty]);

  async function loadChallenges() {
    setIsLoading(true);
    setError(null);
    try {
      const params: { difficulty?: string; search?: string } = {};
      if (difficulty !== 'all') params.difficulty = difficulty;
      if (search) params.search = search;
      const data = await challengesApi.getChallenges(params);
      setChallenges(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load challenges');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    // Reload with search after state update
    setTimeout(() => loadChallenges(), 0);
  }

  function handleChallengeClick(challenge: Challenge) {
    navigate(`/challenges/${challenge.id}`);
  }

  function getDifficultyConfig(d: string) {
    return DIFFICULTY_CONFIG[d] || DIFFICULTY_CONFIG.all;
  }

  function formatTime(minutes: number): string {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}p` : `${hours}h`;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.pageTitle}>🏆 Challenge Arena</h1>
          <p style={styles.pageSubtitle}>Thử thách lập trình với thời gian giới hạn</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={styles.controls}>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm thử thách..."
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchButton}>🔍 Tìm</button>
        </form>

        <div style={styles.filterButtons}>
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => {
            const config = DIFFICULTY_CONFIG[d];
            const isActive = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  ...styles.filterButton,
                  backgroundColor: isActive ? config.bgColor : 'white',
                  color: isActive ? config.color : '#666',
                  borderColor: isActive ? config.color : '#e0e0e0',
                  fontWeight: isActive ? 'bold' : 'normal',
                }}
              >
                <span>{config.emoji}</span>
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {error && (
          <div style={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} style={styles.errorDismiss}>×</button>
          </div>
        )}

        {isLoading ? (
          <div style={styles.loading}>
            <span style={styles.loadingEmoji}>🤖</span>
            <p>Đang tải thử thách...</p>
          </div>
        ) : challenges.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🏆</span>
            <h2>Chưa có thử thách nào</h2>
            <p>
              {search
                ? `Không tìm thấy thử thách nào cho "${search}"`
                : 'Hãy quay lại sau để xem các thử thách mới!'}
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {challenges.map((challenge) => {
              const diffConfig = getDifficultyConfig(challenge.difficulty);
              return (
                <div
                  key={challenge.id}
                  onClick={() => handleChallengeClick(challenge)}
                  style={styles.card}
                >
                  {/* Difficulty badge */}
                  <div style={{ ...styles.diffBadge, backgroundColor: diffConfig.bgColor, color: diffConfig.color }}>
                    {diffConfig.emoji} {diffConfig.label}
                  </div>

                  {/* Title */}
                  <h3 style={styles.cardTitle}>{challenge.titleVi || challenge.title}</h3>
                  <p style={styles.cardDesc}>{challenge.descriptionVi || challenge.description}</p>

                  {/* Meta info */}
                  <div style={styles.cardMeta}>
                    <span style={styles.metaItem}>⏱️ {formatTime(challenge.estimatedMinutes)}</span>
                    <span style={styles.metaItem}>⭐ {challenge.xpReward} XP</span>
                    <span style={styles.metaItem}>🧪 {challenge.testCases.length} test</span>
                  </div>

                  {/* Action */}
                  <div style={styles.cardAction}>
                    <button
                      style={{ ...styles.startButton, backgroundColor: diffConfig.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChallengeClick(challenge);
                      }}
                    >
                      🚀 Bắt đầu
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  header: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    padding: '32px 24px',
  },
  headerContent: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    marginBottom: '4px',
  },
  pageSubtitle: {
    fontSize: '16px',
    opacity: 0.9,
    margin: 0,
  },
  controls: {
    padding: '16px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  searchForm: {
    display: 'flex',
    gap: '8px',
  },
  searchInput: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '12px',
    border: '2px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
  },
  searchButton: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#6366f1',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '2px solid',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  content: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    padding: '20px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  diffBadge: {
    alignSelf: 'flex-start',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#333',
    margin: 0,
  },
  cardDesc: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
    lineHeight: 1.5,
    flex: 1,
  },
  cardMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  metaItem: {
    fontSize: '12px',
    color: '#666',
    backgroundColor: '#f5f5f5',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  cardAction: {
    marginTop: '4px',
  },
  startButton: {
    width: '100%',
    padding: '10px 16px',
    borderRadius: '10px',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'opacity 0.2s',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#666',
  },
  loadingEmoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 4px',
  },
};