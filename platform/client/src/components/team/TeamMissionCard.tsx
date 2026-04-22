/**
 * TeamMissionCard - Card component for team missions with peer teaching bonuses
 * Kid-friendly design with colorful styling
 */

import { useState } from 'react';
import { TeamMission } from '../stores/teamStore';

interface TeamMissionCardProps {
  mission: TeamMission;
  onStart: (missionId: string) => void;
  onSubmit: (missionId: string) => void;
  isLoading?: boolean;
}

const TYPE_CONFIG = {
  group: { emoji: '👥', label: 'Nhiệm vụ nhóm', color: '#6366f1', bgColor: '#e0e7ff' },
  peer_teaching: { emoji: '🎓', label: 'Dạy học cùng bạn', color: '#8b5cf6', bgColor: '#ede9fe' },
  design: { emoji: '🎨', label: 'Thiết kế', color: '#ec4899', bgColor: '#fce7f3' },
};

const STATUS_CONFIG = {
  available: { label: 'Khả dụng', color: '#22c55e', bgColor: '#dcfce7' },
  in_progress: { label: 'Đang làm', color: '#f59e0b', bgColor: '#fef3c7' },
  completed: { label: 'Hoàn thành', color: '#6366f1', bgColor: '#e0e7ff' },
  expired: { label: 'Hết hạn', color: '#9ca3af', bgColor: '#f3f4f6' },
};

export default function TeamMissionCard({
  mission,
  onStart,
  onSubmit,
  isLoading = false
}: TeamMissionCardProps) {
  const [isActing, setIsActing] = useState(false);

  const type = TYPE_CONFIG[mission.type];
  const status = STATUS_CONFIG[mission.status];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Đã hết hạn';
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Ngày mai';
    return `${days} ngày nữa`;
  };

  const handleAction = async () => {
    setIsActing(true);
    try {
      if (mission.status === 'available') {
        await onStart(mission.id);
      } else if (mission.status === 'in_progress') {
        await onSubmit(mission.id);
      }
    } finally {
      setIsActing(false);
    }
  };

  const getActionLabel = () => {
    if (isActing) return '⏳ Đang xử lý...';
    if (mission.status === 'available') return '🚀 Bắt đầu nhiệm vụ';
    if (mission.status === 'in_progress') return '📤 Nộp bài';
    if (mission.status === 'completed') return '✅ Đã hoàn thành';
    return '❌ Hết hạn';
  };

  const canAct = mission.status === 'available' || mission.status === 'in_progress';

  return (
    <div style={styles.card}>
      {/* Type badge */}
      <div style={{ ...styles.typeBadge, backgroundColor: type.bgColor }}>
        <span style={styles.typeEmoji}>{type.emoji}</span>
        <span style={{ ...styles.typeLabel, color: type.color }}>{type.label}</span>
      </div>

      {/* Title */}
      <h3 style={styles.title}>{mission.title}</h3>
      <p style={styles.description}>{mission.description}</p>

      {/* Required members */}
      <div style={styles.infoRow}>
        <span style={styles.infoItem}>👥 Cần {mission.requiredMembers} thành viên</span>
      </div>

      {/* Rewards */}
      <div style={styles.rewardsRow}>
        <span style={styles.xpBadge}>⭐ +{mission.xpReward} XP</span>
        {mission.badgeReward && (
          <span style={styles.badgeReward}>🏅 {mission.badgeReward}</span>
        )}
      </div>

      {/* Peer teaching bonus highlight */}
      {mission.type === 'peer_teaching' && (
        <div style={styles.bonusHighlight}>
          🎁 Bonus: Giúp đỡ bạn học cùng lớp để nhận thêm XP!
        </div>
      )}

      {/* Deadline */}
      <div style={styles.deadline}>
        <span style={styles.deadlineIcon}>⏰</span>
        <span style={styles.deadlineText}>{formatDate(mission.deadline)}</span>
      </div>

      {/* Status */}
      <div style={{ ...styles.statusBadge, backgroundColor: status.bgColor, color: status.color }}>
        {status.label}
      </div>

      {/* Action button */}
      {canAct && (
        <button
          onClick={handleAction}
          disabled={isActing || isLoading}
          style={{
            ...styles.actionBtn,
            backgroundColor: mission.status === 'in_progress' ? '#6366f1' : '#22c55e',
            opacity: isActing ? 0.7 : 1,
          }}
        >
          {getActionLabel()}
        </button>
      )}
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
  typeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '20px',
    alignSelf: 'flex-start',
  },
  typeEmoji: {
    fontSize: '16px',
  },
  typeLabel: {
    fontSize: '13px',
    fontWeight: '600',
  },
  title: {
    fontSize: '17px',
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
    alignItems: 'center',
  },
  infoItem: {
    fontSize: '13px',
    color: '#4b5563',
  },
  rewardsRow: {
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
  badgeReward: {
    backgroundColor: '#fce7f3',
    color: '#db2777',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
  },
  bonusHighlight: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#92400e',
  },
  deadline: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#6b7280',
  },
  deadlineIcon: {
    fontSize: '14px',
  },
  deadlineText: {
    fontWeight: '500',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  actionBtn: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 'bold',
    color: 'white',
    cursor: 'pointer',
    marginTop: '8px',
  },
};
