/**
 * QuestPage - Time-limited challenge quests page
 * Shows Weekly Coding Challenges, Weekend Robot Battles, Holiday Special Events
 * Features XP multipliers and special badges for winners
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { questsApi, Quest, QuestType } from '../services/questsApi';
import { useQuestStore } from '../stores/questStore';
import { useAuth } from '../context/AuthContext';
import QuestCard from '../components/QuestCard';
import QuestTimer from '../components/QuestTimer';
import { useGamificationStore } from '../stores/gamificationStore';

type FilterType = QuestType | 'all';

const FILTER_CONFIG: Record<FilterType, { label: string; labelVi: string; emoji: string; color: string }> = {
  all: { label: 'All', labelVi: 'Tất cả', emoji: '🎯', color: '#6366f1' },
  daily: { label: 'Daily', labelVi: 'Hàng ngày', emoji: '📅', color: '#22c55e' },
  weekly: { label: 'Weekly', labelVi: 'Tuần', emoji: '📆', color: '#6366f1' },
  weekend: { label: 'Weekend', labelVi: 'Cuối tuần', emoji: '🎉', color: '#f59e0b' },
  holiday: { label: 'Holiday', labelVi: 'Lễ', emoji: '🎊', color: '#ef4444' },
};

export default function QuestPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { activeQuests, setActiveQuests, questProgress, updateQuestProgress, isLoading, setLoading, setError } = useQuestStore();
  const { xp } = useGamificationStore();

  const [filter, setFilter] = useState<FilterType>('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  useEffect(() => {
    loadQuests();
  }, []);

  async function loadQuests() {
    setLoading(true);
    setError(null);
    try {
      const quests = await questsApi.getActiveQuests();
      setActiveQuests(quests);

      // Load user progress for each quest
      if (token) {
        for (const quest of quests) {
          const attempt = await questsApi.getUserAttempt(token, quest.id);
          if (attempt) {
            updateQuestProgress(quest.id, {
              questId: quest.id,
              progress: attempt.progress,
              xpEarned: attempt.xpEarned,
              badgeEarned: attempt.badgeEarned,
              challengesCompleted: attempt.challengesCompleted,
              status: attempt.status,
            });
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinQuest(questId: string) {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const attempt = await questsApi.joinQuest(token, questId);
      const quest = activeQuests.find(q => q.id === questId);
      if (quest) {
        updateQuestProgress(questId, {
          questId,
          progress: 0,
          xpEarned: 0,
          badgeEarned: false,
          challengesCompleted: [],
          status: 'in_progress',
        });
      }
      setShowJoinModal(false);
      setSelectedQuest(null);
    } catch (err: any) {
      setError(err.message || 'Failed to join quest');
    }
  }

  function handleViewDetails(questId: string) {
    const quest = activeQuests.find(q => q.id === questId);
    if (quest) {
      setSelectedQuest(quest);
      setShowJoinModal(true);
    }
  }

  function handleCloseModal() {
    setShowJoinModal(false);
    setSelectedQuest(null);
  }

  function getFilteredQuests(): Quest[] {
    if (filter === 'all') {
      return activeQuests;
    }
    return activeQuests.filter(q => q.type === filter);
  }

  function getFeaturedQuest(): Quest | null {
    // Return the most urgent/high-value quest
    const now = new Date();
    const urgent = activeQuests
      .filter(q => new Date(q.endDate) > now)
      .sort((a, b) => {
        // Prioritize by xpMultiplier (higher = more featured)
        if (a.xpMultiplier !== b.xpMultiplier) {
          return b.xpMultiplier - a.xpMultiplier;
        }
        // Then by time remaining (less time = more urgent)
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
    return urgent[0] || null;
  }

  const featuredQuest = getFeaturedQuest();
  const filteredQuests = getFilteredQuests();

  // Calculate total XP available
  const totalXpAvailable = activeQuests.reduce((sum, q) => {
    const progress = questProgress[q.id];
    if (progress?.status === 'completed') return sum;
    const remainingXp = q.xpReward * q.xpMultiplier - (progress?.xpEarned || 0);
    return sum + Math.max(0, remainingXp);
  }, 0);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.pageTitle}>
              ⚡ Thử Thách Đặc Biệt
            </h1>
            <p style={styles.pageSubtitle}>
              Hoàn thành nhiệm vụ thời gian giới hạn để nhận XP thưởng!
            </p>
          </div>

          {/* XP Available */}
          {totalXpAvailable > 0 && (
            <div style={styles.xpAvailable}>
              <span style={styles.xpAvailableLabel}>Có thể nhận:</span>
              <span style={styles.xpAvailableValue}>+{Math.round(totalXpAvailable)} XP</span>
            </div>
          )}
        </div>
      </div>

      {/* Featured Quest Banner */}
      {featuredQuest && !showFeaturedOnly && (
        <motion.div
          style={styles.featuredBanner}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={styles.featuredBadge}>
            <span>🔥 Nổi bật</span>
          </div>
          <div style={styles.featuredContent}>
            <div>
              <h2 style={styles.featuredTitle}>
                {featuredQuest.titleVi}
              </h2>
              <p style={styles.featuredDescription}>
                {featuredQuest.descriptionVi}
              </p>
              <div style={styles.featuredMeta}>
                <span style={styles.featuredXp}>
                  ⭐ +{Math.round(featuredQuest.xpReward * featuredQuest.xpMultiplier)} XP
                </span>
                {featuredQuest.xpMultiplier > 1 && (
                  <span style={styles.featuredMultiplier}>
                    ⚡ {featuredQuest.xpMultiplier}x XP Bonus!
                  </span>
                )}
                {featuredQuest.badgeReward && (
                  <span style={styles.featuredBadge}>
                    🏅 {featuredQuest.badgeReward.nameVi}
                  </span>
                )}
              </div>
            </div>
            <div style={styles.featuredTimer}>
              <span style={styles.featuredTimerLabel}>Kết thúc sau:</span>
              <QuestTimer endDate={featuredQuest.endDate} size="medium" variant="card" />
            </div>
          </div>
          <button
            onClick={() => handleViewDetails(featuredQuest.id)}
            style={styles.featuredButton}
          >
            Xem chi tiết →
          </button>
        </motion.div>
      )}

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filterButtons}>
          {(Object.keys(FILTER_CONFIG) as FilterType[]).map((type) => {
            const config = FILTER_CONFIG[type];
            const isActive = filter === type;
            const count = type === 'all'
              ? activeQuests.length
              : activeQuests.filter(q => q.type === type).length;

            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                style={{
                  ...styles.filterButton,
                  backgroundColor: isActive ? `${config.color}15` : 'white',
                  color: isActive ? config.color : '#64748b',
                  borderColor: isActive ? config.color : '#e2e8f0',
                  fontWeight: isActive ? 'bold' : 'normal',
                }}
              >
                <span>{config.emoji}</span>
                <span>{config.labelVi}</span>
                {count > 0 && (
                  <span style={{
                    ...styles.filterCount,
                    backgroundColor: isActive ? config.color : '#e2e8f0',
                    color: isActive ? 'white' : '#64748b',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {isLoading ? (
          <div style={styles.loading}>
            <span style={styles.loadingEmoji}>🤖</span>
            <p>Đang tải thử thách...</p>
          </div>
        ) : filteredQuests.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🎯</span>
            <h2>Chưa có thử thách nào</h2>
            <p>
              {filter === 'all'
                ? 'Hãy quay lại sau để xem các thử thách mới!'
                : `Không có thử thách ${FILTER_CONFIG[filter].labelVi} nào đang hoạt động.`}
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                progress={questProgress[quest.id]}
                onJoin={handleJoinQuest}
                onViewDetails={handleViewDetails}
                variant={quest.id === featuredQuest?.id ? 'featured' : 'default'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quest Details Modal */}
      <AnimatePresence>
        {showJoinModal && selectedQuest && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              style={styles.modal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={handleCloseModal} style={styles.modalClose}>
                ✕
              </button>

              {/* Header */}
              <div style={styles.modalHeader}>
                <div style={styles.modalTypeBadge}>
                  <span>{FILTER_CONFIG[selectedQuest.type].emoji}</span>
                  <span>{FILTER_CONFIG[selectedQuest.type].labelVi}</span>
                </div>
                <h2 style={styles.modalTitle}>{selectedQuest.titleVi}</h2>
                <p style={styles.modalDescription}>{selectedQuest.descriptionVi}</p>
              </div>

              {/* Timer */}
              <div style={styles.modalTimer}>
                <span style={styles.modalTimerLabel}>⏰ Thời gian còn lại:</span>
                <QuestTimer endDate={selectedQuest.endDate} size="large" variant="card" />
              </div>

              {/* Rewards */}
              <div style={styles.modalRewards}>
                <h3 style={styles.modalSectionTitle}>Phần thưởng</h3>
                <div style={styles.rewardCards}>
                  <div style={styles.rewardCard}>
                    <span style={styles.rewardEmoji}>⭐</span>
                    <span style={styles.rewardValue}>
                      +{Math.round(selectedQuest.xpReward * selectedQuest.xpMultiplier)} XP
                    </span>
                    {selectedQuest.xpMultiplier > 1 && (
                      <span style={styles.rewardMultiplier}>
                        ({selectedQuest.xpMultiplier}x)
                      </span>
                    )}
                  </div>
                  {selectedQuest.badgeReward && (
                    <div style={styles.rewardCard}>
                      <span style={styles.rewardEmoji}>{selectedQuest.badgeReward.emoji}</span>
                      <span style={styles.rewardValue}>{selectedQuest.badgeReward.nameVi}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress (if already started) */}
              {questProgress[selectedQuest.id] && (
                <div style={styles.modalProgress}>
                  <h3 style={styles.modalSectionTitle}>Tiến độ của bạn</h3>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${questProgress[selectedQuest.id].progress}%`,
                      }}
                    />
                  </div>
                  <div style={styles.progressText}>
                    <span>{Math.round(questProgress[selectedQuest.id].progress)}% hoàn thành</span>
                    {questProgress[selectedQuest.id].xpEarned > 0 && (
                      <span style={{ color: '#22c55e' }}>
                        +{Math.round(questProgress[selectedQuest.id].xpEarned)} XP
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div style={styles.modalStats}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{selectedQuest.participantCount}</span>
                  <span style={styles.statLabel}>Người tham gia</span>
                </div>
                {selectedQuest.maxParticipants && (
                  <div style={styles.statItem}>
                    <span style={styles.statValue}>{selectedQuest.maxParticipants}</span>
                    <span style={styles.statLabel}>Tối đa</span>
                  </div>
                )}
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{selectedQuest.completionCount}</span>
                  <span style={styles.statLabel}>Đã hoàn thành</span>
                </div>
              </div>

              {/* Actions */}
              <div style={styles.modalActions}>
                {questProgress[selectedQuest.id]?.status === 'completed' ? (
                  <div style={styles.completedBanner}>
                    🎉 Bạn đã hoàn thành thử thách này!
                  </div>
                ) : new Date(selectedQuest.endDate) < new Date() ? (
                  <div style={styles.expiredBanner}>
                    ⏰ Thử thách đã kết thúc
                  </div>
                ) : !questProgress[selectedQuest.id] ? (
                  <button
                    onClick={() => handleJoinQuest(selectedQuest.id)}
                    style={styles.joinButton}
                  >
                    Tham gia ngay! 🚀
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/challenges/${selectedQuest.challengeIds[0]}`)}
                    style={styles.continueButton}
                  >
                    Tiếp tục thử thách →
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  header: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    padding: '32px 24px',
  },
  headerContent: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '16px',
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
  xpAvailable: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
  },
  xpAvailableLabel: {
    fontSize: '12px',
    opacity: 0.8,
  },
  xpAvailableValue: {
    fontSize: '24px',
    fontWeight: 'bold',
  },
  featuredBanner: {
    maxWidth: '1000px',
    margin: '24px auto',
    marginTop: '-16px',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderRadius: '20px',
    padding: '24px',
    border: '2px solid rgba(249, 115, 22, 0.3)',
    boxShadow: '0 0 40px rgba(249, 115, 22, 0.2)',
    position: 'relative' as const,
  },
  featuredBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '20px',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    color: '#f97316',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  featuredContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '24px',
    flexWrap: 'wrap' as const,
  },
  featuredTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 0 8px 0',
  },
  featuredDescription: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
    marginBottom: '12px',
  },
  featuredMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  featuredXp: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  featuredMultiplier: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#f97316',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    padding: '2px 8px',
    borderRadius: '8px',
  },
  featuredTimer: {
    textAlign: 'center' as const,
  },
  featuredTimerLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '8px',
  },
  featuredButton: {
    marginTop: '16px',
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#f97316',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filters: {
    padding: '16px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  filterButtons: {
    maxWidth: '1000px',
    margin: '0 auto',
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
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  filterCount: {
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  content: {
    padding: '24px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#64748b',
  },
  loadingEmoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 100,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '32px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    position: 'relative' as const,
  },
  modalClose: {
    position: 'absolute' as const,
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  modalHeader: {
    marginBottom: '24px',
  },
  modalTypeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '12px',
    backgroundColor: '#f1f5f9',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  modalDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
  },
  modalTimer: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  modalTimerLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '12px',
  },
  modalRewards: {
    marginBottom: '24px',
  },
  modalSectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#64748b',
    margin: '0 0 12px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  rewardCards: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  rewardCard: {
    flex: 1,
    minWidth: '120px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  rewardEmoji: {
    fontSize: '32px',
  },
  rewardValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e293b',
  },
  rewardMultiplier: {
    fontSize: '12px',
    color: '#f97316',
    fontWeight: 'bold',
  },
  modalProgress: {
    marginBottom: '24px',
  },
  progressBar: {
    height: '10px',
    backgroundColor: '#e2e8f0',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: '5px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    fontSize: '13px',
    color: '#64748b',
  },
  modalStats: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  },
  statItem: {
    flex: 1,
    minWidth: '80px',
    textAlign: 'center' as const,
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  statValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b',
  },
  modalActions: {
    marginTop: '16px',
  },
  joinButton: {
    width: '100%',
    padding: '16px 24px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
  },
  continueButton: {
    width: '100%',
    padding: '16px 24px',
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
  },
  completedBanner: {
    padding: '16px 24px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
  },
  expiredBanner: {
    padding: '16px 24px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
  },
};
