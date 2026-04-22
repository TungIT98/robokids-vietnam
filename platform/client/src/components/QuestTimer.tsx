/**
 * QuestTimer - Countdown timer component for time-limited quests
 * Shows days, hours, minutes, seconds remaining with urgency styling
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface QuestTimerProps {
  endDate: string;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  onExpire?: () => void;
  variant?: 'card' | 'badge' | 'compact';
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calculateTimeRemaining(endDate: string): TimeRemaining {
  const now = new Date().getTime();
  const expiry = new Date(endDate).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  };
}

export default function QuestTimer({
  endDate,
  size = 'medium',
  showLabels = true,
  onExpire,
  variant = 'card',
}: QuestTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() => calculateTimeRemaining(endDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(endDate);
      setTimeLeft(remaining);
      if (remaining.expired) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, onExpire]);

  // Update when endDate changes
  useEffect(() => {
    setTimeLeft(calculateTimeRemaining(endDate));
  }, [endDate]);

  if (timeLeft.expired) {
    return (
      <div style={getExpiredStyle(variant)}>
        <span style={getExpiredTextStyle(variant)}>Đã kết thúc</span>
      </div>
    );
  }

  const getUrgency = () => {
    if (timeLeft.days > 2) return 'normal';
    if (timeLeft.hours > 12) return 'warning';
    if (timeLeft.minutes > 30) return 'alert';
    return 'critical';
  };

  const urgency = getUrgency();

  if (variant === 'badge') {
    return (
      <div style={getBadgeContainerStyle(size)}>
        <span style={getBadgeTextStyle(size, urgency)}>
          ⏰ {formatTimeBadge(timeLeft)}
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <span style={getCompactStyle(size, urgency)}>
        {formatTimeCompact(timeLeft)}
      </span>
    );
  }

  // Card variant (default)
  return (
    <motion.div
      style={getCardStyle(size)}
      animate={urgency === 'critical' ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.5, repeat: urgency === 'critical' ? Infinity : 0 }}
    >
      {timeLeft.days > 0 && (
        <div style={getUnitStyle(size)}>
          <span style={getNumberStyle(size, urgency)}>
            {String(timeLeft.days).padStart(2, '0')}
          </span>
          {showLabels && <span style={getLabelStyle(size)}>Ngày</span>}
        </div>
      )}
      <span style={getSeparatorStyle(size, urgency)}>:</span>
      <div style={getUnitStyle(size)}>
        <span style={getNumberStyle(size, urgency)}>
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        {showLabels && <span style={getLabelStyle(size)}>Giờ</span>}
      </div>
      <span style={getSeparatorStyle(size, urgency)}>:</span>
      <div style={getUnitStyle(size)}>
        <span style={getNumberStyle(size, urgency)}>
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        {showLabels && <span style={getLabelStyle(size)}>Phút</span>}
      </div>
      {timeLeft.days === 0 && (
        <>
          <span style={getSeparatorStyle(size, urgency)}>:</span>
          <div style={getUnitStyle(size)}>
            <span style={getNumberStyle(size, urgency)}>
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            {showLabels && <span style={getLabelStyle(size)}>Giây</span>}
          </div>
        </>
      )}
    </motion.div>
  );
}

function formatTimeBadge(time: TimeRemaining): string {
  if (time.days > 0) {
    return `${time.days}d ${time.hours}h`;
  }
  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m`;
  }
  return `${time.minutes}m ${time.seconds}s`;
}

function formatTimeCompact(time: TimeRemaining): string {
  if (time.days > 0) {
    return `${time.days} ngày`;
  }
  if (time.hours > 0) {
    return `${time.hours}:${String(time.minutes).padStart(2, '0')}`;
  }
  return `${time.minutes}:${String(time.seconds).padStart(2, '0')}`;
}

function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'critical':
      return '#ef4444';
    case 'alert':
      return '#f59e0b';
    case 'warning':
      return '#eab308';
    default:
      return '#22c55e';
  }
}

// Badge variant styles
function getBadgeContainerStyle(size: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '12px',
    fontWeight: 'bold',
  };

  switch (size) {
    case 'small':
      return { ...base, fontSize: '11px' };
    case 'large':
      return { ...base, fontSize: '14px', padding: '6px 12px' };
    default:
      return { ...base, fontSize: '12px' };
  }
}

function getBadgeTextStyle(size: string, urgency: string): React.CSSProperties {
  const color = getUrgencyColor(urgency);
  return {
    color,
    backgroundColor: `${color}20`,
    fontFamily: 'monospace',
  };
}

function getExpiredStyle(variant: string): React.CSSProperties {
  if (variant === 'badge') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 8px',
      borderRadius: '12px',
      backgroundColor: 'rgba(107, 114, 128, 0.2)',
      color: '#6b7280',
      fontSize: '11px',
      fontWeight: 'bold',
    };
  }
  return {
    padding: '8px 16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    color: '#6b7280',
  };
}

function getExpiredTextStyle(variant: string): React.CSSProperties {
  return {
    fontSize: variant === 'compact' ? '12px' : '14px',
    fontWeight: 'bold',
  };
}

// Compact variant styles
function getCompactStyle(size: string, urgency: string): React.CSSProperties {
  const color = getUrgencyColor(urgency);
  return {
    fontSize: size === 'small' ? '11px' : '13px',
    fontFamily: 'monospace',
    color,
    fontWeight: 'bold',
  };
}

// Card variant styles (default)
function getCardStyle(size: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  };

  switch (size) {
    case 'small':
      return { ...base, gap: '2px' };
    case 'large':
      return { ...base, gap: '8px' };
    default:
      return base;
  }
}

function getUnitStyle(size: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  return base;
}

function getNumberStyle(size: string, urgency: string): React.CSSProperties {
  const color = getUrgencyColor(urgency);
  const base: React.CSSProperties = {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color,
  };

  switch (size) {
    case 'small':
      return { ...base, fontSize: '14px' };
    case 'large':
      return { ...base, fontSize: '32px' };
    default:
      return { ...base, fontSize: '24px' };
  }
}

function getLabelStyle(size: string): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: '9px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  switch (size) {
    case 'small':
      return { ...base, fontSize: '7px' };
    case 'large':
      return { ...base, fontSize: '11px' };
    default:
      return base;
  }
}

function getSeparatorStyle(size: string, urgency: string): React.CSSProperties {
  const color = getUrgencyColor(urgency);
  return {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color,
    fontSize: size === 'small' ? '10px' : size === 'large' ? '28px' : '20px',
    marginBottom: size === 'small' ? '8px' : '12px',
  };
}
