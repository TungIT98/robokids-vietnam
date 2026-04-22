/**
 * MissionsPage - Browse and complete missions
 * Shows daily, weekly, and challenge missions with submission capability.
 */

import { useState, useEffect } from 'react';
import { missionsApi, MissionTemplate, DailyMission } from '../services/missionsApi';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
// Note: Mission requiredTier field will be added to backend in future iteration
// When added, wrap mission cards with PremiumLockOverlay based on mission.requiredTier

type MissionTab = 'daily' | 'weekly' | 'challenge';

const MISSION_TYPE_LABELS: Record<string, { title: string; emoji: string }> = {
  daily: { title: 'Nhiệm vụ hàng ngày', emoji: '🌅' },
  weekly: { title: 'Nhiệm vụ tuần này', emoji: '🚀' },
  challenge: { title: 'Thử thách đặc biệt', emoji: '🎯' },
};

const MISSION_TYPE_COLORS: Record<string, string> = {
  daily: '#22c55e',
  weekly: '#8b5cf6',
  challenge: '#6366f1',
};

export default function MissionsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<MissionTab>('daily');
  const [missions, setMissions] = useState<MissionTemplate[]>([]);
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>([]);
  const [activeMissions, setActiveMissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; xpEarned?: number; badgeEarned?: string | null } | null>(null);
  // Subscription hook ready for future requiredTier integration on missions
  const { canAccessTier } = useSubscription();

  useEffect(() => {
    loadMissions();
  }, [activeTab, token]);

  async function loadMissions() {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'daily') {
        const [daily, active] = await Promise.all([
          missionsApi.getDailyMissions(token),
          missionsApi.getUserActiveMissions(token)
        ]);
        setDailyMissions(daily);
        setActiveMissions(active);
      } else {
        const all = await missionsApi.getMissions({ mission_type: activeTab });
        setMissions(all);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load missions');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(missionId: string) {
    if (!token) return;
    setSubmittingId(missionId);
    setSubmitResult(null);
    try {
      const result = await missionsApi.submitMission(missionId, token);
      setSubmitResult({ success: true, xpEarned: result.mission.xpEarned, badgeEarned: result.mission.badgeEarned });
      await loadMissions();
    } catch (err: any) {
      setError(err.message || 'Failed to submit mission');
    } finally {
      setSubmittingId(null);
    }
  }

  const tabColor = MISSION_TYPE_COLORS[activeTab];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ ...styles.header, background: `linear-gradient(135deg, ${tabColor} 0%, ${tabColor}99 100%)` }}>
        <div style={styles.headerContent}>
          <h1 style={styles.pageTitle}>🎯 Nhiệm vụ</h1>
          <p style={styles.pageSubtitle}>Hoàn thành nhiệm vụ để nhận XP và huy hiệu</p>
        </div>

        {/* Submit result toast */}
        {submitResult && submitResult.success && (
          <div style={styles.successToast}>
            <span>🎉 Hoàn thành! +{submitResult.xpEarned} XP</span>
            {submitResult.badgeEarned && <span> 🏅</span>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(Object.keys(MISSION_TYPE_LABELS) as MissionTab[]).map(tab => {
          const info = MISSION_TYPE_LABELS[tab];
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tab,
                ...(isActive ? { ...styles.tabActive, borderColor: MISSION_TYPE_COLORS[tab], color: MISSION_TYPE_COLORS[tab] } : {})
              }}
            >
              <span style={styles.tabEmoji}>{info.emoji}</span>
              <span>{info.title}</span>
            </button>
          );
        })}
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
            <p>Đang tải nhiệm vụ...</p>
          </div>
        ) : activeTab === 'daily' ? (
          <>
            {/* Active missions section */}
            {activeMissions.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>📋 Nhiệm vụ của bạn hôm nay</h2>
                <div style={styles.missionGrid}>
                  {dailyMissions.map(mission => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      isDaily
                      onSubmit={handleSubmit}
                      isSubmitting={submittingId === mission.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {dailyMissions.length === 0 && (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>🎯</span>
                <h2>Chưa có nhiệm vụ hôm nay</h2>
                <p>Hãy quay lại sau hoặc hoàn thành bài học để nhận nhiệm vụ mới!</p>
              </div>
            )}
          </>
        ) : (
          <>
            {missions.length > 0 ? (
              <div style={styles.missionGrid}>
                {missions.map(mission => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    isDaily={false}
                    onSubmit={handleSubmit}
                    isSubmitting={submittingId === mission.id}
                  />
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>🎯</span>
                <h2>Không có nhiệm vụ nào</h2>
                <p>Nhiệm vụ {MISSION_TYPE_LABELS[activeTab]?.title.toLowerCase()} đang được cập nhật!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// MissionCard component
interface MissionCardProps {
  mission: MissionTemplate | DailyMission;
  isDaily: boolean;
  onSubmit: (id: string) => void;
  isSubmitting: boolean;
}

function MissionCard({ mission, isDaily, onSubmit, isSubmitting }: MissionCardProps) {
  const isCompleted = isDaily && (mission as DailyMission).userProgress?.status === 'completed';
  const progressPercent = isDaily ? (mission as DailyMission).userProgress?.progressPercent || 0 : 0;
  const xpReward = mission.xpReward;
  const badgeReward = mission.badgeReward;

  const typeColor = MISSION_TYPE_COLORS[mission.type] || '#6366f1';

  return (
    <div style={{
      ...styles.missionCard,
      ...(isCompleted ? styles.missionCardCompleted : {}),
      borderLeftColor: typeColor
    }}>
      <div style={styles.missionCardHeader}>
        <div style={{ ...styles.missionIcon, backgroundColor: typeColor + '20' }}>
          {mission.iconEmoji}
        </div>
        <div style={styles.missionCardInfo}>
          <h3 style={styles.missionTitle}>{mission.titleVi || mission.title}</h3>
          <p style={styles.missionDesc}>
            {mission.descriptionVi || mission.descriptionEn || ''}
          </p>
        </div>
        {isCompleted && (
          <div style={styles.completedBadge}>✅ Hoàn thành</div>
        )}
      </div>

      {/* Requirements */}
      <div style={styles.missionRequirements}>
        {mission.requiredLessonCount > 0 && (
          <span style={styles.reqBadge}>
            📚 {mission.requiredLessonCount} bài học
          </span>
        )}
        {mission.requiredXp > 0 && (
          <span style={styles.reqBadge}>
            ⭐ {mission.requiredXp} XP
          </span>
        )}
        {mission.requiredStreakDays > 0 && (
          <span style={styles.reqBadge}>
            🔥 {mission.requiredStreakDays} ngày liên tiếp
          </span>
        )}
      </div>

      {/* Progress bar for daily missions */}
      {isDaily && progressPercent > 0 && !isCompleted && (
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progressPercent}%`, backgroundColor: typeColor }} />
          </div>
          <span style={styles.progressLabel}>{progressPercent}%</span>
        </div>
      )}

      {/* Rewards */}
      <div style={styles.missionRewards}>
        <span style={{ ...styles.rewardBadge, backgroundColor: '#fef3c7', color: '#d97706' }}>
          ⭐ +{xpReward} XP
        </span>
        {badgeReward && (
          <span style={{ ...styles.rewardBadge, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
            🏅 {badgeReward}
          </span>
        )}
      </div>

      {/* Action */}
      {!isCompleted && (
        <button
          onClick={() => onSubmit(mission.id)}
          disabled={isSubmitting}
          style={{
            ...styles.submitButton,
            backgroundColor: typeColor,
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? '⏳ Đang nộp...' : '✓ Hoàn thành nhiệm vụ'}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  header: {
    color: 'white',
    padding: '32px 24px',
    position: 'relative' as const,
  },
  headerContent: {
    flex: 1,
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
  successToast: {
    marginTop: '12px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'inline-block',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0',
    overflowX: 'auto',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: '12px',
    border: '2px solid transparent',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    color: '#666',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.2s',
  },
  tabActive: {
    fontWeight: 700,
  },
  tabEmoji: {
    fontSize: '18px',
  },
  content: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '16px',
  },
  missionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  missionCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '2px solid transparent',
    borderLeftWidth: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  missionCardCompleted: {
    backgroundColor: '#f8fff8',
    borderColor: '#4CAF50',
    opacity: 0.85,
  },
  missionCardHeader: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  missionIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0,
  },
  missionCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  missionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '4px',
  },
  missionDesc: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
    lineHeight: 1.4,
  },
  completedBadge: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#4CAF50',
    backgroundColor: '#e8f5e9',
    padding: '4px 8px',
    borderRadius: '8px',
    whiteSpace: 'nowrap' as const,
  },
  missionRequirements: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
  },
  reqBadge: {
    fontSize: '12px',
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  progressSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  progressLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#666',
    minWidth: '36px',
  },
  missionRewards: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  rewardBadge: {
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '4px 10px',
    borderRadius: '8px',
  },
  submitButton: {
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '4px',
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
