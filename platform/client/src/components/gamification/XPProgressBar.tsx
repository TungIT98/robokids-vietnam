/**
 * XPProgressBar - Animated XP progress bar with space theme
 * Shows current XP, level threshold, and level-up animations
 */

import { useState, useEffect, useRef } from 'react';
import { DEFAULT_LEVELS, XPLevel } from '../../services/gamificationApi';

interface XPProgressBarProps {
  currentXp: number;
  level: number;
  levelTitle?: string;
  levelTitleVi?: string;
  compact?: boolean; // Compact mode for sidebar
  showAnimation?: boolean; // Show +XP gain animation
}

function getLevelInfo(xp: number, level: number): { current: XPLevel; next: XPLevel | null; progress: number } {
  // Find current level definition
  let current = DEFAULT_LEVELS[0];
  let next: XPLevel | null = null;

  for (let i = 0; i < DEFAULT_LEVELS.length; i++) {
    if (DEFAULT_LEVELS[i].level === level) {
      current = DEFAULT_LEVELS[i];
      next = DEFAULT_LEVELS[i + 1] || null;
      break;
    }
  }

  // Calculate progress within current level
  const xpInLevel = xp - current.minXp;
  const levelRange = current.maxXp - current.minXp;
  const progress = Math.min((xpInLevel / levelRange) * 100, 100);

  return { current, next, progress };
}

export default function XPProgressBar({
  currentXp,
  level,
  levelTitleVi,
  compact = false,
  showAnimation = true,
}: Omit<XPProgressBarProps, 'levelTitle'> & { levelTitle?: string }) {
  const { current, next, progress } = getLevelInfo(currentXp, level);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showXpGain, setShowXpGain] = useState(false);
  const prevXpRef = useRef(currentXp);

  // Animate progress bar on mount and XP changes
  useEffect(() => {
    // Animate to actual progress
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Detect XP gain
  useEffect(() => {
    if (currentXp > prevXpRef.current && showAnimation) {
      setIsAnimating(true);
      setShowXpGain(true);

      // Reset animation state
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 600);

      const xpTimer = setTimeout(() => {
        setShowXpGain(false);
      }, 1500);

      prevXpRef.current = currentXp;

      return () => {
        clearTimeout(timer);
        clearTimeout(xpTimer);
      };
    }
  }, [currentXp, showAnimation]);

  if (compact) {
    return (
      <div style={compactStyles.container}>
        <div style={compactStyles.levelInfo}>
          <span style={compactStyles.levelIcon}>{current.icon}</span>
          <span style={compactStyles.levelText}>
            {levelTitleVi || current.titleVi}
          </span>
        </div>
        <div style={compactStyles.progressContainer}>
          <div style={compactStyles.progressBar}>
            <div
              style={{
                ...compactStyles.progressFill,
                width: `${displayProgress}%`,
              }}
            />
          </div>
          <span style={compactStyles.xpText}>
            {currentXp.toLocaleString()} XP
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Level header */}
      <div style={styles.header}>
        <div style={styles.levelBadge}>
          <span style={styles.levelIcon}>{current.icon}</span>
          <div style={styles.levelInfo}>
            <span style={styles.levelTitle}>
              {levelTitleVi || current.titleVi}
            </span>
            <span style={styles.levelNumber}>Cấp {level}</span>
          </div>
        </div>
        {next && (
          <div style={styles.nextLevel}>
            <span style={styles.nextIcon}>{next.icon}</span>
            <span style={styles.nextLabel}>
              Tiếp theo: {next.titleVi}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={styles.progressSection}>
        <div style={styles.progressBarOuter}>
          {/* Animated stars background */}
          <div style={styles.starsContainer}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.star,
                  left: `${(i * 12.5) + (isAnimating ? Math.random() * 10 - 5 : 0)}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                ⭐
              </div>
            ))}
          </div>

          {/* Progress fill */}
          <div
            style={{
              ...styles.progressFill,
              width: `${displayProgress}%`,
              ...(isAnimating ? styles.progressFillAnimating : {}),
            }}
          />

          {/* Milestone markers */}
          {next && (
            <div
              style={{
                ...styles.milestoneMarker,
                left: '100%',
              }}
              title={`${next.titleVi}: ${next.minXp} XP`}
            >
              🚀
            </div>
          )}
        </div>

        {/* XP labels */}
        <div style={styles.xpLabels}>
          <span style={styles.currentXp}>
            {currentXp.toLocaleString()} XP
          </span>
          {next && (
            <span style={styles.nextXp}>
              {next.minXp.toLocaleString()} XP
            </span>
          )}
        </div>
      </div>

      {/* +XP animation */}
      {showXpGain && (
        <div style={styles.xpGainAnimation}>
          +XP
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'rgba(15, 15, 35, 0.9)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(100, 100, 255, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  levelBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  levelIcon: {
    fontSize: '32px',
  },
  levelInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  levelTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
  },
  levelNumber: {
    fontSize: '12px',
    color: '#888',
  },
  nextLevel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'rgba(100, 100, 255, 0.1)',
    borderRadius: '20px',
  },
  nextIcon: {
    fontSize: '16px',
  },
  nextLabel: {
    fontSize: '12px',
    color: '#a0a0ff',
  },
  progressSection: {
    position: 'relative',
  },
  progressBarOuter: {
    height: '24px',
    backgroundColor: 'rgba(50, 50, 100, 0.5)',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid rgba(100, 100, 255, 0.3)',
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    fontSize: '8px',
    animation: 'twinkle 2s infinite',
    opacity: 0.6,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
    borderRadius: '12px',
    transition: 'width 0.8s ease-out',
    position: 'relative',
    zIndex: 1,
  },
  progressFillAnimating: {
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.8)',
  },
  milestoneMarker: {
    position: 'absolute',
    top: '-8px',
    transform: 'translateX(-50%)',
    fontSize: '16px',
    zIndex: 2,
  },
  xpLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  currentXp: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#a855f7',
  },
  nextXp: {
    fontSize: '14px',
    color: '#888',
  },
  xpGainAnimation: {
    position: 'absolute',
    top: '50%',
    right: '20px',
    transform: 'translateY(-50%)',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#22c55e',
    animation: 'floatUp 1.5s ease-out forwards',
    textShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
  },
};

const compactStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    backgroundColor: 'rgba(30, 30, 60, 0.8)',
    borderRadius: '12px',
    border: '1px solid rgba(100, 100, 255, 0.2)',
  },
  levelInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  levelIcon: {
    fontSize: '24px',
  },
  levelText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  progressContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  progressBar: {
    height: '8px',
    backgroundColor: 'rgba(50, 50, 100, 0.5)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
    borderRadius: '4px',
    transition: 'width 0.8s ease-out',
  },
  xpText: {
    fontSize: '11px',
    color: '#a0a0ff',
    textAlign: 'right',
  },
};