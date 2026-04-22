/**
 * QuestCard - Card component for displaying time-limited quests
 * Shows quest info, timer, progress, and XP multiplier
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Quest, QuestProgress } from '../services/questsApi';
import { questsApi } from '../services/questsApi';
import QuestTimer from './QuestTimer';

interface QuestCardProps {
  quest: Quest;
  progress?: QuestProgress | null;
  onJoin?: (questId: string) => void;
  onViewDetails?: (questId: string) => void;
  variant?: 'default' | 'compact' | 'featured';
}

export default function QuestCard({
  quest,
  progress,
  onJoin,
  onViewDetails,
  variant = 'default',
}: QuestCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const typeInfo = questsApi.getQuestTypeInfo(quest.type);
  const diffInfo = questsApi.getDifficultyInfo(quest.difficulty);
  const isCompleted = progress?.status === 'completed';
  const isExpired = new Date(quest.endDate) < new Date();

  const xpWithMultiplier = Math.round(quest.xpReward * quest.xpMultiplier);

  const getCardStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: '2px solid transparent',
      position: 'relative',
      overflow: 'hidden',
    };

    if (variant === 'featured') {
      base.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
      base.color = 'white';
      base.border = `2px solid ${typeInfo.color}40`;
      base.boxShadow = `0 0 30px ${typeInfo.color}30`;
    }

    if (isHovered) {
      base.transform = 'translateY(-4px)';
      base.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
      if (variant === 'featured') {
        base.boxShadow = `0 12px 40px ${typeInfo.color}40`;
      }
    }

    if (isCompleted) {
      base.opacity = 0.8;
      base.border = '2px solid #22c55e40';
    }

    if (isExpired) {
      base.opacity = 0.5;
      base.filter = 'grayscale(0.5)';
    }

    return base;
  };

  const getProgressBarStyle = (): React.CSSProperties => {
    const percent = progress?.progress || 0;
    return {
      height: '8px',
      backgroundColor: variant === 'featured' ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '16px',
    };
  };

  const getProgressFillStyle = (): React.CSSProperties => {
    const percent = progress?.progress || 0;
    return {
      height: '100%',
      width: `${percent}%`,
      backgroundColor: isCompleted ? '#22c55e' : typeInfo.color,
      borderRadius: '4px',
      transition: 'width 0.3s ease',
    };
  };

  return (
    <motion.div
      style={getCardStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onViewDetails?.(quest.id)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {/* Type Badge */}
      <div style={getTypeBadgeStyle()}>
        <span>{typeInfo.emoji}</span>
        <span style={{ fontWeight: 'bold', fontSize: '11px' }}>{typeInfo.labelVi}</span>
        {quest.xpMultiplier > 1 && (
          <span style={getMultiplierBadgeStyle()}>
            ⚡ {quest.xpMultiplier}x
          </span>
        )}
      </div>

      {/* Featured gradient overlay for featured variant */}
      {variant === 'featured' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: `radial-gradient(circle, ${typeInfo.color}20, transparent)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Difficulty Badge */}
      <div style={getDifficultyBadgeStyle()}>
        <span>{diffInfo.emoji}</span>
        <span>{diffInfo.label}</span>
      </div>

      {/* Title */}
      <h3 style={getTitleStyle()}>
        {variant === 'featured' ? `🎯 ${quest.titleVi}` : quest.titleVi}
      </h3>

      {/* Description */}
      <p style={getDescriptionStyle()}>
        {quest.descriptionVi}
      </p>

      {/* Timer */}
      <div style={{ marginTop: '12px', marginBottom: '8px' }}>
        <QuestTimer
          endDate={quest.endDate}
          variant="compact"
          size="small"
        />
      </div>

      {/* Stats Row */}
      <div style={getStatsRowStyle()}>
        <div style={getStatItemStyle()}>
          <span style={{ fontSize: '14px' }}>⭐</span>
          <span style={getStatValueStyle()}>+{xpWithMultiplier} XP</span>
          {quest.xpMultiplier > 1 && (
            <span style={{ fontSize: '10px', color: '#f59e0b' }}>
              (base: {quest.xpReward})
            </span>
          )}
        </div>

        {quest.participantCount > 0 && (
          <div style={getStatItemStyle()}>
            <span style={{ fontSize: '14px' }}>👥</span>
            <span style={getStatValueStyle()}>{quest.participantCount}</span>
          </div>
        )}

        {quest.badgeReward && (
          <div style={getBadgePreviewStyle()}>
            <span style={{ fontSize: '16px' }}>{quest.badgeReward.emoji}</span>
            <span style={{ fontSize: '11px', color: variant === 'featured' ? '#a855f7' : '#a855f7' }}>
              {quest.badgeReward.nameVi}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {progress && progress.status !== 'not_started' && (
        <div style={getProgressBarStyle()}>
          <div style={getProgressFillStyle()} />
        </div>
      )}

      {/* Progress Text */}
      {progress && progress.status !== 'not_started' && (
        <div style={getProgressTextStyle()}>
          <span>
            {isCompleted ? '✓ Hoàn thành!' : `${Math.round(progress.progress)}% hoàn thành`}
          </span>
          {progress.xpEarned > 0 && (
            <span style={{ color: '#22c55e' }}>+{Math.round(progress.xpEarned)} XP</span>
          )}
        </div>
      )}

      {/* Action Button */}
      {!progress && !isExpired && onJoin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin(quest.id);
          }}
          style={getJoinButtonStyle()}
        >
          Tham gia ngay 🚀
        </button>
      )}

      {isExpired && (
        <div style={getExpiredLabelStyle()}>
          ⏰ Đã kết thúc
        </div>
      )}

      {isCompleted && (
        <div style={getCompletedLabelStyle()}>
          🎉 Đã nhận {quest.badgeReward?.emoji}
        </div>
      )}
    </motion.div>
  );
}

// Styles
function getTypeBadgeStyle(): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    backgroundColor: '#f1f5f9',
    marginBottom: '12px',
  };
}

function getMultiplierBadgeStyle(): React.CSSProperties {
  return {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    color: '#f97316',
    padding: '2px 6px',
    borderRadius: '8px',
    fontWeight: 'bold',
    marginLeft: '4px',
  };
}

function getDifficultyBadgeStyle(): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '8px',
    fontSize: '11px',
    backgroundColor: '#f8fafc',
    marginBottom: '8px',
  };
}

function getTitleStyle(): React.CSSProperties {
  return {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 8px 0',
  };
}

function getDescriptionStyle(): React.CSSProperties {
  return {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  };
}

function getStatsRowStyle(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '12px',
    flexWrap: 'wrap',
  };
}

function getStatItemStyle(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };
}

function getStatValueStyle(): React.CSSProperties {
  return {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#1e293b',
  };
}

function getBadgePreviewStyle(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: '8px',
  };
}

function getProgressTextStyle(): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    fontSize: '12px',
    color: '#64748b',
  };
}

function getJoinButtonStyle(): React.CSSProperties {
  return {
    width: '100%',
    marginTop: '16px',
    padding: '12px 20px',
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };
}

function getExpiredLabelStyle(): React.CSSProperties {
  return {
    marginTop: '16px',
    padding: '10px 16px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
  };
}

function getCompletedLabelStyle(): React.CSSProperties {
  return {
    marginTop: '16px',
    padding: '10px 16px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
  };
}
