/**
 * TeamMissionsPage - Team missions with peer teaching bonuses
 * Kids can complete missions together as a team
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeamStore, TeamMission } from '../stores/teamStore';
import { TeamMissionCard, TeamLeaderboard } from '../components/team';

type MissionTab = 'available' | 'active' | 'completed';

export default function TeamMissionsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const {
    myTeam,
    availableMissions,
    activeMissions,
    teamLeaderboard,
    isLoading,
    error,
    setError,
    startTeamMission,
    submitTeamMission,
  } = useTeamStore();

  const [activeTab, setActiveTab] = useState<MissionTab>('available');

  useEffect(() => {
    // Load team data
    if (token) {
      loadTeamData();
    }
  }, [token]);

  async function loadTeamData() {
    // In a real app, this would fetch from the API
    // For now, we'll use mock data
    const mockAvailableMissions: TeamMission[] = [
      {
        id: 'tm1',
        title: '🎯 Nhiệm vụ Robot Cứu Hỏa',
        description: 'Team cùng nhau lập trình robot để giải cứu đám cháy trong thành phố!',
        type: 'group',
        xpReward: 500,
        badgeReward: 'Firefighter',
        requiredMembers: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'available',
      },
      {
        id: 'tm2',
        title: '🎓 Dạy học cùng bạn',
        description: 'Giúp một bạn học sinh khác hoàn thành bài học về robot!',
        type: 'peer_teaching',
        xpReward: 300,
        badgeReward: 'Super Teacher',
        requiredMembers: 2,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'available',
      },
      {
        id: 'tm3',
        title: '🎨 Thiết kế Robot Mới',
        description: 'Team sáng tạo và vẽ robot mới cho kho tương lai!',
        type: 'design',
        xpReward: 400,
        requiredMembers: 3,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'available',
      },
    ];

    const mockActiveMissions: TeamMission[] = [
      {
        id: 'tm4',
        title: '🚀 Robot Khám Phá Vũ Trụ',
        description: 'Team đang lập trình robot để khám phá các hành tinh!',
        type: 'group',
        xpReward: 600,
        badgeReward: 'Space Explorer',
        requiredMembers: 2,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'in_progress',
        teamId: myTeam?.id,
      },
    ];

    useTeamStore.setState({
      availableMissions: mockAvailableMissions,
      activeMissions: mockActiveMissions,
      isLoading: false,
    });
  }

  const handleStartMission = async (missionId: string) => {
    if (!token) return;
    try {
      await startTeamMission(missionId, token);
    } catch (err: any) {
      setError(err.message || 'Failed to start mission');
    }
  };

  const handleSubmitMission = async (missionId: string) => {
    if (!token) return;
    try {
      const result = await submitTeamMission(missionId, {}, token);
      alert(`🎉 Hoàn thành nhiệm vụ! +${result.xpEarned} XP`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit mission');
    }
  };

  const getMissionsForTab = () => {
    switch (activeTab) {
      case 'available':
        return availableMissions;
      case 'active':
        return activeMissions;
      case 'completed':
        return []; // Would come from API in real app
      default:
        return [];
    }
  };

  const tabs = [
    { key: 'available' as MissionTab, label: 'Khả dụng', emoji: '📋' },
    { key: 'active' as MissionTab, label: 'Đang làm', emoji: '🔄' },
    { key: 'completed' as MissionTab, label: 'Hoàn thành', emoji: '✅' },
  ];

  if (!myTeam) {
    return (
      <div style={styles.noTeamContainer}>
        <div style={styles.noTeamContent}>
          <span style={styles.noTeamEmoji}>👥</span>
          <h2 style={styles.noTeamTitle}>Bạn chưa có đội!</h2>
          <p style={styles.noTeamDesc}>
            Tham gia hoặc tạo một đội để bắt đầu các nhiệm vụ nhóm thú vị
          </p>
          <div style={styles.noTeamActions}>
            <button onClick={() => navigate('/create-team')} style={styles.createTeamBtn}>
              🎮 Tạo đội mới
            </button>
            <button onClick={() => navigate('/join-team')} style={styles.joinTeamBtn}>
              🔍 Tìm đội
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.pageTitle}>👥 Nhiệm vụ nhóm</h1>
          <p style={styles.pageSubtitle}>
            Hoàn thành nhiệm vụ cùng đội để nhận XP và huy hiệu!
          </p>
        </div>
        <div style={styles.teamInfo}>
          <span style={styles.teamAvatar}>{myTeam.avatar}</span>
          <div style={styles.teamDetails}>
            <span style={styles.teamName}>{myTeam.name}</span>
            <span style={styles.teamStats}>⭐ {myTeam.totalXP} XP</span>
          </div>
        </div>
      </div>

      {/* Team Leaderboard */}
      <div style={styles.leaderboardSection}>
        <TeamLeaderboard
          teams={teamLeaderboard}
          myTeamId={myTeam.id}
          timeframe="weekly"
        />
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...styles.tab,
                ...(isActive ? styles.tabActive : {}),
              }}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              {tab.key === 'active' && activeMissions.length > 0 && (
                <span style={styles.tabBadge}>{activeMissions.length}</span>
              )}
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
        ) : (
          <div style={styles.missionGrid}>
            {getMissionsForTab().map(mission => (
              <TeamMissionCard
                key={mission.id}
                mission={mission}
                onStart={handleStartMission}
                onSubmit={handleSubmitMission}
              />
            ))}
          </div>
        )}

        {!isLoading && getMissionsForTab().length === 0 && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>
              {activeTab === 'available' ? '📋' : activeTab === 'active' ? '🔄' : '✅'}
            </span>
            <h2>
              {activeTab === 'available' ? 'Không có nhiệm vụ khả dụng' :
               activeTab === 'active' ? 'Không có nhiệm vụ đang làm' :
               'Chưa có nhiệm vụ hoàn thành'}
            </h2>
            <p>
              {activeTab === 'available' ? ' Quay lại sau để xem nhiệm vụ mới!' :
               activeTab === 'active' ? 'Bắt đầu một nhiệm vụ nhóm ngay!' :
               'Hoàn thành nhiệm vụ để xem ở đây!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f4ff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
  },
  headerContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  },
  pageSubtitle: {
    fontSize: '16px',
    margin: 0,
    opacity: 0.9,
  },
  teamInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '12px 20px',
    borderRadius: '16px',
  },
  teamAvatar: {
    fontSize: '36px',
  },
  teamDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  teamName: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  teamStats: {
    fontSize: '13px',
    opacity: 0.9,
  },
  leaderboardSection: {
    padding: '24px 32px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    padding: '0 32px',
    borderBottom: '1px solid #e5e7eb',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    fontSize: '15px',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#6366f1',
    borderBottomColor: '#6366f1',
  },
  tabBadge: {
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  content: {
    padding: '24px 32px',
  },
  missionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280',
  },
  loadingEmoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  errorBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontSize: '20px',
    cursor: 'pointer',
  },
  noTeamContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    padding: '20px',
  },
  noTeamContent: {
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '48px',
    borderRadius: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    maxWidth: '400px',
  },
  noTeamEmoji: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  noTeamTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 12px 0',
  },
  noTeamDesc: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  noTeamActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  createTeamBtn: {
    padding: '14px 24px',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    cursor: 'pointer',
  },
  joinTeamBtn: {
    padding: '14px 24px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#4b5563',
    cursor: 'pointer',
  },
};
