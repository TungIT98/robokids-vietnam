/**
 * RecommendationCards - AI-powered content recommendations for student dashboard
 * Shows personalized next lessons/content based on student progress.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import css from './RecommendationCards.module.css';

interface Recommendation {
  id: string;
  type: 'lesson' | 'mission' | 'challenge';
  title: string;
  titleVi: string;
  description: string;
  descriptionVi?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes?: number;
  xpReward?: number;
  iconEmoji: string;
  reason: string;
}

interface RecommendationCardsProps {
  maxItems?: number;
  title?: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  lesson: { bg: '#e8f5e9', text: '#2e7d32' },
  mission: { bg: '#e3f2fd', text: '#1565c0' },
  challenge: { bg: '#fce4ec', text: '#c2185b' },
};

const DIFFICULTY_EMOJIS: Record<string, string> = {
  easy: '🌱',
  medium: '⚡',
  hard: '🔥',
};

export default function RecommendationCards({ maxItems = 3, title = 'Nội dung đề xuất cho bạn' }: RecommendationCardsProps) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchRecommendations();
  }, [token]);

  async function fetchRecommendations() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await aiApi.getRecommendations(token || '');
      setRecommendations(data.recommendations?.slice(0, maxItems) || []);
    } catch (err) {
      setError('Không thể tải đề xuất');
      // Provide fallback recommendations
      setRecommendations([
        {
          id: 'fallback-1',
          type: 'lesson',
          title: 'Robot Movement Basics',
          titleVi: 'Cơ bản về di chuyển Robot',
          description: 'Learn how to control your robot',
          descriptionVi: 'Học cách điều khiển robot di chuyển',
          difficulty: 'easy',
          estimatedMinutes: 15,
          xpReward: 50,
          iconEmoji: '🤖',
          reason: 'Phù hợp cho người mới bắt đầu',
        },
        {
          id: 'fallback-2',
          type: 'mission',
          title: 'Complete the Maze',
          titleVi: 'Hoàn thành mê cung',
          description: 'Guide your robot through the maze',
          descriptionVi: 'Dẫn robot đi qua mê cung',
          difficulty: 'medium',
          estimatedMinutes: 20,
          xpReward: 75,
          iconEmoji: '🎯',
          reason: 'Thử thách thú vị cho bạn',
        },
        {
          id: 'fallback-3',
          type: 'challenge',
          title: 'Speed Challenge',
          titleVi: 'Thử thách tốc độ',
          description: 'Race against time',
          descriptionVi: 'Đua với thời gian',
          difficulty: 'hard',
          estimatedMinutes: 25,
          xpReward: 100,
          iconEmoji: '⚡',
          reason: 'Kiểm tra kỹ năng của bạn',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCardClick(rec: Recommendation) {
    switch (rec.type) {
      case 'lesson':
        navigate('/curriculum');
        break;
      case 'mission':
        navigate('/missions');
        break;
      case 'challenge':
        navigate('/challenges');
        break;
    }
  }

  if (isLoading) {
    return (
      <div className={css.container}>
        <h3 className={css.title}>{title}</h3>
        <div className={css.loadingGrid}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={css.loadingCard}>
              <div className={css.loadingIcon}>🤖</div>
              <div className={css.loadingLine} style={{ width: '70%' }} />
              <div className={css.loadingLine} style={{ width: '50%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && recommendations.length === 0) {
    return null;
  }

  return (
    <div className={css.container}>
      <div className={css.header}>
        <h3 className={css.title}>{title}</h3>
        <button onClick={fetchRecommendations} className={css.refreshButton} title="Làm mới">
          🔄
        </button>
      </div>

      <div className={css.cardsGrid}>
        {recommendations.map((rec) => {
          const colors = TYPE_COLORS[rec.type] || TYPE_COLORS.lesson;
          return (
            <div
              key={rec.id}
              className={css.card}
              onClick={() => handleCardClick(rec)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleCardClick(rec)}
            >
              <div className={css.cardHeader}>
                <div
                  className={css.typeBadge}
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {rec.type === 'lesson' ? '📚 Bài học' : rec.type === 'mission' ? '🎯 Nhiệm vụ' : '🏆 Thử thách'}
                </div>
                <div className={css.difficultyBadge}>
                  {DIFFICULTY_EMOJIS[rec.difficulty]} {rec.difficulty === 'easy' ? 'Dễ' : rec.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                </div>
              </div>

              <div className={css.cardIcon}>{rec.iconEmoji}</div>

              <h4 className={css.cardTitle}>{rec.titleVi || rec.title}</h4>
              <p className={css.cardDesc}>{rec.descriptionVi || rec.description}</p>

              <div className={css.reasonBadge}>
                💡 {rec.reason}
              </div>

              <div className={css.cardFooter}>
                {rec.estimatedMinutes && (
                  <span className={css.meta}>⏱ {rec.estimatedMinutes} phút</span>
                )}
                {rec.xpReward && (
                  <span className={css.meta}>⭐ +{rec.xpReward} XP</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}