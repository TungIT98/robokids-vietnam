/**
 * TeamChallengeCard - Card component for displaying team challenges
 * Kid-friendly design with emojis and colorful styling
 */

import { useState } from 'react';
import { TeamChallenge } from '../stores/teamStore';

interface TeamChallengeCardProps {
  challenge: TeamChallenge;
  isRegistered: boolean;
  onRegister: (challengeId: string) => void;
  onViewDetails: (challengeId: string) => void;
  isLoading?: boolean;
}

const DIFFICULTY_CONFIG = {
  easy: { label: 'Dễ', emoji: '🟢', color: '#22c55e', bgColor: '#dcfce7' },
  medium: { label: 'Trung bình', emoji: '🟡', color: '#eab308', bgColor: '#fef9c3' },
  hard: { label: 'Khó', emoji: '🔴', color: '#ef4444', bgColor: '#fef2f2' },
};

const TYPE_CONFIG = {
  coding: { emoji: '💻', label: 'Lập trình' },
  robot_design: { emoji: '🤖', label: 'Thiết kế Robot' },
  rescue: { emoji: '🚨', label: 'Giải cứu' },
};

const STATUS_CONFIG = {
  upcoming: { label: 'Sắp bắt đầu', color: '#6366f1', bgColor: '#e0e7ff' },
  registration: { label: 'Đăng ký ngay!', color: '#22c55e', bgColor: '#dcfce7' },
  in_progress: { label: 'Đang diễn ra', color: '#f59e0b', bgColor: '#fef3c7' },
  completed: { label: 'Đã kết thúc', color: '#9ca3af', bgColor: '#f3f4f6' },
};

export default function TeamChallengeCard({
  challenge,
  isRegistered,
  onRegister,
  onViewDetails,
  isLoading = false
}: TeamChallengeCardProps) {
  const [isRegistering, setIsRegistering] = useState(false);

  const difficulty = DIFFICULTY_CONFIG[challenge.difficulty];
  const type = TYPE_CONFIG[challenge.type];
  const status = STATUS_CONFIG[challenge.status];

  const spotsLeft = challenge.maxTeams - challenge.currentTeams;
  const isFull = spotsLeft <= 0;

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      await onRegister(challenge.id);
    } finally {
      setIsRegistering(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={styles.card}>
      {/* Header with type and difficulty */}
      <div style={styles.header}>
        <div style={{ ...styles.badge, backgroundColor: type === TYPE_CONFIG.coding ? '#dbeafe' : type === TYPE_CONFIG.robot_design ? '#fce7f3' : '#fef3c7' }}>
          <span style={styles.badgeEmoji}>{type.emoji}</span>
          <span style={styles.badgeLabel}>{type.label}</span>
        </div>
        <div style={{ ...styles.difficultyBadge, backgroundColor: difficulty.bgColor }}>
          <span>{difficulty.emoji} {difficulty.label}</span>
        </div>
      </div>

      {/* Title and description */}
      <h3 style={styles.title}>{challenge.title}</h3>
      <p style={styles.description}>{challenge.description}</p>

      {/* Team size and spots */}
      <div style={styles.infoRow}>
        <span style={styles.infoItem}>👥 {challenge.teamSize.min}-{challenge.teamSize.max} thành viên</span>
        <span style={{ ...styles.infoItem, color: isFull ? '#ef4444' : '#22c55e' }}>
          {isFull ? '❌ Đã đầy' : `🎫 Còn ${spotsLeft} chỗ`}
        </span>
      </div>

      {/* Prize */}
      <div style={styles.prizeRow}>
        <span style={styles.prizeLabel}>🏆 Phần thưởng:</span>
        <span style={styles.prize}>{challenge.prize}</span>
      </div>

      {/* XP Reward */}
      <div style={styles.xpRow}>
        <span style={styles.xpBadge}>⭐ +{challenge.rewardXP} XP</span>
        {challenge.rewardBadge && (
          <span style={styles.badgeBadge}>🏅 {challenge.rewardBadge}</span>
        )}
      </div>

      {/* Schedule */}
      <div style={styles.schedule}>
        <span>📅 {formatDate(challenge.startsAt)} - {formatDate(challenge.endsAt)}</span>
      </div>

      {/* Status badge */}
      <div style={{ ...styles.statusBadge, backgroundColor: status.bgColor, color: status.color }}>
        {status.label}
      </div>

      {/* Action buttons */}
      <div style={styles.actions}>
        <button onClick={() => onViewDetails(challenge.id)} style={styles.detailsBtn}>
          Xem chi tiết
        </button>
        {challenge.status === 'registration' && !isRegistered && !isFull && (
          <button
            onClick={handleRegister}
            disabled={isRegistering || isLoading}
            style={{ ...styles.registerBtn, opacity: isRegistering ? 0.7 : 1 }}
          >
            {isRegistering ? '⏳ Đang đăng ký...' : '🚀 Đăng ký ngay!'}
          </button>
        )}
        {isRegistered && (
          <div style={styles.registeredBadge}>✅ Đã đăng ký</div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
  },
  badgeEmoji: {
    fontSize: '16px',
  },
  badgeLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#333',
  },
  difficultyBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    fontSize: '13px',
    color: '#4b5563',
  },
  prizeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  prizeLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  prize: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  xpRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  xpBadge: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  badgeBadge: {
    backgroundColor: '#fce7f3',
    color: '#db2777',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
  },
  schedule: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px',
  },
  detailsBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4b5563',
    cursor: 'pointer',
  },
  registerBtn: {
    flex: 2,
    padding: '10px 16px',
    backgroundColor: '#22c55e',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    cursor: 'pointer',
  },
  registeredBadge: {
    flex: 2,
    padding: '10px 16px',
    backgroundColor: '#dcfce7',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#16a34a',
    textAlign: 'center',
  },
};
