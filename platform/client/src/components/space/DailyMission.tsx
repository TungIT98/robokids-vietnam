/**
 * DailyMission - Daily challenge widget for dashboard
 * Shows today's mission, countdown timer, and weekly calendar
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DailyMissionData {
  id: string;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  xpReward: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  expiresAt: string; // ISO date string
  completed: boolean;
}

interface DailyMissionProps {
  onStartMission?: (missionId: string) => void;
}

const MISSION_TITLES: Record<string, { title: string; titleVi: string; desc: string; descVi: string }> = {
  'daily-1': { title: 'First Steps', titleVi: 'Bước đầu tiên', desc: 'Complete your first robot command', descVi: 'Hoàn thành lệnh robot đầu tiên' },
  'daily-2': { title: 'Galaxy Explorer', titleVi: 'Khám phá thiên hà', desc: 'Navigate through 3 star systems', descVi: 'Điều khiển robot qua 3 hệ thống sao' },
  'daily-3': { title: 'Space Defender', titleVi: 'Phòng thủ vũ trụ', desc: 'Complete the asteroid dodging challenge', descVi: 'Hoàn thành thử thách né thiên thạch' },
};

function getDailyMission(): DailyMissionData {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const missionKeys = Object.keys(MISSION_TITLES);
  const missionIndex = dayOfYear % missionKeys.length;
  const missionKey = missionKeys[missionIndex];
  const missionInfo = MISSION_TITLES[missionKey];

  // Calculate end of day
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const difficulty = missionIndex === 0 ? 'beginner' : missionIndex === 1 ? 'intermediate' : 'advanced';
  const xpReward = missionIndex === 0 ? 50 : missionIndex === 1 ? 100 : 150;

  // Check if already completed (using localStorage for demo)
  const completedKey = `daily-${missionKey}-completed`;
  const isCompleted = localStorage.getItem(completedKey) === 'true';

  return {
    id: missionKey,
    title: missionInfo.title,
    titleVi: missionInfo.titleVi,
    description: missionInfo.desc,
    descriptionVi: missionInfo.descVi,
    xpReward,
    difficulty,
    expiresAt: endOfDay.toISOString(),
    completed: isCompleted,
  };
}

function getTimeRemaining(expiresAt: string): { hours: number; minutes: number; seconds: number; expired: boolean } {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, expired: false };
}

export default function DailyMission({ onStartMission }: DailyMissionProps) {
  const [mission, setMission] = useState<DailyMissionData>(getDailyMission());
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(mission.expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(mission.expiresAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [mission.expiresAt]);

  const handleStart = () => {
    onStartMission?.(mission.id);
  };

  const markComplete = () => {
    const completedKey = `daily-${mission.id}-completed`;
    localStorage.setItem(completedKey, 'true');
    setMission((prev) => ({ ...prev, completed: true }));
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'beginner': return '#22c55e';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🎯</span>
          <div>
            <h3 style={styles.headerTitle}>Nhiệm vụ hàng ngày</h3>
            <p style={styles.headerSubtitle}>Hoàn thành để nhận XP thưởng!</p>
          </div>
        </div>
        {!timeLeft.expired && !mission.completed && (
          <div style={styles.timer}>
            <span style={styles.timerIcon}>⏰</span>
            <span style={styles.timerText}>
              {String(timeLeft.hours).padStart(2, '0')}:
              {String(timeLeft.minutes).padStart(2, '0')}:
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
        )}
        {mission.completed && (
          <div style={styles.completedBadge}>
            <span>✓</span>
            <span>Đã hoàn thành</span>
          </div>
        )}
        {timeLeft.expired && !mission.completed && (
          <div style={styles.expiredBadge}>
            <span>⚠️</span>
            <span>Đã hết hạn</span>
          </div>
        )}
      </div>

      {/* Mission Card */}
      <div style={{
        ...styles.missionCard,
        ...(mission.completed ? styles.missionCardCompleted : {}),
      }}>
        {/* Mission difficulty badge */}
        <div style={{
          ...styles.difficultyBadge,
          backgroundColor: `${getDifficultyColor(mission.difficulty)}20`,
          color: getDifficultyColor(mission.difficulty),
        }}>
          {mission.difficulty === 'beginner' ? '🟢 Dễ' :
           mission.difficulty === 'intermediate' ? '🟡 Trung bình' : '🔴 Khó'}
        </div>

        {/* Mission title */}
        <h4 style={styles.missionTitle}>{mission.titleVi}</h4>
        <p style={styles.missionDescription}>{mission.descriptionVi}</p>

        {/* XP Reward */}
        <div style={styles.xpReward}>
          <span style={styles.xpIcon}>⭐</span>
          <span>+{mission.xpReward} XP</span>
        </div>

        {/* Action button */}
        {!mission.completed && !timeLeft.expired && (
          <button onClick={handleStart} style={styles.startButton}>
            Bắt đầu ngay 🚀
          </button>
        )}
        {mission.completed && (
          <div style={styles.completedMessage}>
            <span style={styles.completedIcon}>🎉</span>
            <span>Bạn đã hoàn thành nhiệm vụ hôm nay!</span>
          </div>
        )}
        {timeLeft.expired && !mission.completed && (
          <div style={styles.expiredMessage}>
            <span>Hãy quay lại vào ngày mai để nhận nhiệm vụ mới!</span>
          </div>
        )}
      </div>

      {/* Weekly Preview */}
      <div style={styles.weeklyPreview}>
        <h5 style={styles.weeklyTitle}>📅 Lịch tuần này</h5>
        <div style={styles.weekGrid}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, index) => {
            const today = new Date().getDay();
            const isToday = (index + 1) % 7 === today % 7;
            const isPast = index < ((today + 6) % 7);

            return (
              <div
                key={day}
                style={{
                  ...styles.dayItem,
                  ...(isToday ? styles.dayItemToday : {}),
                  ...(isPast && !isToday ? styles.dayItemPast : {}),
                }}
              >
                <span style={styles.dayLabel}>{day}</span>
                {index === 0 && <span style={styles.dayEmoji}>🎯</span>}
                {index === 1 && <span style={styles.dayEmoji}>🚀</span>}
                {index === 2 && <span style={styles.dayEmoji}>🌟</span>}
                {index === 3 && <span style={styles.dayEmoji}>🤖</span>}
                {index === 4 && <span style={styles.dayEmoji}>🛸</span>}
                {index === 5 && <span style={styles.dayEmoji}>🌍</span>}
                {index === 6 && <span style={styles.dayEmoji}>☄️</span>}
              </div>
            );
          })}
        </div>
      </div>
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
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2))',
    borderBottom: '1px solid rgba(100, 100, 255, 0.2)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '28px',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '11px',
    color: '#888',
    margin: 0,
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '6px 12px',
    borderRadius: '20px',
  },
  timerIcon: {
    fontSize: '14px',
  },
  timerText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ef4444',
    fontFamily: 'monospace',
  },
  completedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  expiredBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  missionCard: {
    padding: '20px',
    position: 'relative',
  },
  missionCardCompleted: {
    opacity: 0.7,
  },
  difficultyBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  missionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    margin: '0 0 8px 0',
  },
  missionDescription: {
    fontSize: '13px',
    color: '#888',
    margin: '0 0 16px 0',
  },
  xpReward: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    color: '#a855f7',
    padding: '8px 16px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    width: 'fit-content',
    marginBottom: '16px',
  },
  xpIcon: {
    fontSize: '20px',
  },
  startButton: {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: 'linear-gradient(90deg, #ef4444, #f97316)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
  },
  completedMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '12px',
    color: '#22c55e',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  completedIcon: {
    fontSize: '20px',
  },
  expiredMessage: {
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '12px',
    color: '#888',
    fontSize: '14px',
    textAlign: 'center',
  },
  weeklyPreview: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(100, 100, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  weeklyTitle: {
    fontSize: '12px',
    color: '#888',
    margin: '0 0 12px 0',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
  },
  dayItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 4px',
    borderRadius: '8px',
    backgroundColor: 'rgba(50, 50, 80, 0.3)',
  },
  dayItemToday: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    border: '1px solid rgba(99, 102, 241, 0.5)',
  },
  dayItemPast: {
    opacity: 0.4,
  },
  dayLabel: {
    fontSize: '10px',
    color: '#888',
    fontWeight: 'bold',
  },
  dayEmoji: {
    fontSize: '16px',
  },
};