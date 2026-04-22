/**
 * StreaksPage - Daily streaks and login rewards page
 * Shows streak tracking, check-in, history calendar, and milestones
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { StreakWidget, StreakHistoryView } from '../components/StreakWidget';
import { streaksApi, StreakInfo, getStreakMultiplier } from '../services/streaksApi';

type Tab = 'today' | 'history';

export default function StreaksPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    loadStreakInfo();
  }, [user, token, navigate]);

  async function loadStreakInfo() {
    if (!user || !token) return;
    setIsLoading(true);
    try {
      const data = await streaksApi.getStreak(user.id, token);
      setStreakInfo(data);
    } catch (err) {
      console.error('Failed to load streak info:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCheckinSuccess(result: { newStreak: number; xpEarned: number }) {
    // Refresh streak info after checkin
    loadStreakInfo();
  }

  const streak = streakInfo?.currentStreak || 0;
  const { multiplier, xpBase, tierLabel } = getStreakMultiplier(streak);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '24px 16px',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '24px',
    },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      backgroundColor: 'white',
      color: '#374151',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
    },
    title: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#1f2937',
      margin: 0,
    },
    tabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      backgroundColor: 'white',
      padding: '6px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    tab: {
      flex: 1,
      padding: '10px 16px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    tabActive: {
      backgroundColor: '#6366f1',
      color: 'white',
    },
    tabInactive: {
      backgroundColor: 'transparent',
      color: '#6b7280',
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    streakTierCard: {
      background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffd93d 100%)',
      borderRadius: '16px',
      padding: '20px',
      color: 'white',
      textAlign: 'center' as const,
    },
    tierTitle: {
      fontSize: '14px',
      opacity: 0.9,
      marginBottom: '4px',
    },
    tierName: {
      fontSize: '28px',
      fontWeight: 700,
      marginBottom: '8px',
    },
    tierMultiplier: {
      fontSize: '16px',
      fontWeight: 600,
      opacity: 0.95,
    },
    tierXp: {
      fontSize: '20px',
      fontWeight: 700,
      marginTop: '8px',
    },
    infoCard: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    infoTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#333',
      marginBottom: '12px',
    },
    infoText: {
      fontSize: '14px',
      color: '#666',
      lineHeight: 1.6,
      margin: 0,
    },
    multiplierTable: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    multiplierRow: {
      borderBottom: '1px solid #f0f0f0',
    },
    multiplierCell: {
      padding: '10px 8px',
      fontSize: '14px',
    },
    multiplierActive: {
      backgroundColor: '#fef3c7',
      fontWeight: 600,
      color: '#d97706',
    },
  };

  const TIER_INFO = [
    { tier: 'Khởi đầu', min: 1, max: 6, xp: 10, mult: '1x' },
    { tier: 'Tích cực', min: 7, max: 13, xp: 15, mult: '1.5x' },
    { tier: 'Cam kết', min: 14, max: 29, xp: 20, mult: '2x' },
    { tier: 'Vô địch', min: 30, max: 99, xp: 25, mult: '2.5x' },
    { tier: 'Huyền thoại', min: 100, max: 999, xp: 30, mult: '3x' },
  ];

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: '#666' }}>
          <span style={{ fontSize: '48px' }}>🔥</span>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/dashboard')}>
          ← Quay lại
        </button>
        <h1 style={styles.title}>🔥 Chuỗi ngày học</h1>
      </div>

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'today' ? styles.tabActive : styles.tabInactive) }}
          onClick={() => setActiveTab('today')}
        >
          Hôm nay
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'history' ? styles.tabActive : styles.tabInactive) }}
          onClick={() => setActiveTab('history')}
        >
          Lịch sử
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'today' ? (
          <motion.div
            key="today"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={styles.content}
          >
            {/* Streak Tier Banner */}
            <div style={styles.streakTierCard}>
              <div style={styles.tierTitle}>Cấp bậc hiện tại</div>
              <div style={styles.tierName}>{tierLabel}</div>
              <div style={styles.tierMultiplier}>×{multiplier} multiplier</div>
              <div style={styles.tierXp}>+{xpBase} XP mỗi ngày</div>
            </div>

            {/* Main Streak Widget */}
            {user && token && (
              <StreakWidget
                studentId={user.id}
                token={token}
                onCheckinSuccess={handleCheckinSuccess}
              />
            )}

            {/* Streak Multiplier Info */}
            <div style={styles.infoCard}>
              <h3 style={styles.infoTitle}>📊 Phần thưởng theo cấp bậc</h3>
              <table style={styles.multiplierTable}>
                <tbody>
                  {TIER_INFO.map((info) => {
                    const isActive = streak >= info.min && streak <= info.max;
                    return (
                      <tr key={info.tier} style={{ ...styles.multiplierRow, ...(isActive ? styles.multiplierActive : {}) }}>
                        <td style={{ ...styles.multiplierCell, textAlign: 'left' }}>
                          {info.tier}
                        </td>
                        <td style={{ ...styles.multiplierCell, textAlign: 'center' }}>
                          {info.min}-{info.max} ngày
                        </td>
                        <td style={{ ...styles.multiplierCell, textAlign: 'right' }}>
                          {info.xp} XP × {info.mult}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Info Card */}
            <div style={styles.infoCard}>
              <h3 style={styles.infoTitle}>💡 Mẹo chuỗi ngày</h3>
              <p style={styles.infoText}>
                • Điểm danh mỗi ngày để duy trì chuỗi<br/>
                • Chuỗi càng dài, XP càng cao!<br/>
                • Nếu bỏ lỡ 1 ngày, bạn có thể dùng "Đóng băng" để giữ chuỗi<br/>
                • Đạt milestone 7, 30, 100 ngày để nhận huy hiệu đặc biệt
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={styles.content}
          >
            {/* Streak Tier Banner */}
            <div style={styles.streakTierCard}>
              <div style={styles.tierTitle}>Cấp bậc hiện tại</div>
              <div style={styles.tierName}>{tierLabel}</div>
              <div style={styles.tierMultiplier}>×{multiplier} multiplier</div>
              <div style={styles.tierXp}>+{xpBase} XP mỗi ngày</div>
            </div>

            {/* History View */}
            {user && token && (
              <StreakHistoryView
                studentId={user.id}
                token={token}
                months={3}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}