/**
 * XPProgressBar - Animated progress bar with space theme
 * Shows current XP, level, and progress to next level
 */

import { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { XPLevel, DEFAULT_LEVELS } from '../services/gamificationApi';

interface XPProgressBarProps {
  currentXp: number;
  level: number;
  levelTitle: string;
  levels?: XPLevel[];
  showAnimation?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function XPProgressBar({
  currentXp,
  level,
  levelTitle,
  levels = DEFAULT_LEVELS,
  showAnimation = true,
  size = 'medium',
}: XPProgressBarProps) {
  const currentLevelData = levels.find(l => l.level === level) || levels[0];
  const nextLevelData = levels.find(l => l.level === level + 1);

  const minXp = currentLevelData.minXp;
  const maxXp = nextLevelData?.maxXp || currentLevelData.maxXp;
  const xpInLevel = currentXp - minXp;
  const xpNeeded = maxXp - minXp;
  const progressPercent = Math.min((xpInLevel / xpNeeded) * 100, 100);

  // Animated progress
  const springValue = useSpring(0, { stiffness: 50, damping: 20 });
  const displayProgress = useTransform(springValue, (v) => `${v}%`);

  const [prevXp, setPrevXp] = useState(currentXp);
  const [xpGained, setXpGained] = useState(0);
  const [showGain, setShowGain] = useState(false);
  const gainTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (showAnimation && currentXp > prevXp) {
      const gained = currentXp - prevXp;
      setXpGained(gained);
      setShowGain(true);

      // Clear existing timeout
      if (gainTimeoutRef.current) {
        clearTimeout(gainTimeoutRef.current);
      }

      // Hide after 2 seconds
      gainTimeoutRef.current = setTimeout(() => {
        setShowGain(false);
      }, 2000);
    }
    setPrevXp(currentXp);

    if (showAnimation) {
      springValue.set(progressPercent);
    } else {
      springValue.set(progressPercent);
    }
  }, [currentXp, showAnimation]);

  const sizeConfig = {
    small: { height: '20px', fontSize: 12, iconSize: '16px' },
    medium: { height: '28px', fontSize: 14, iconSize: '20px' },
    large: { height: '36px', fontSize: 16, iconSize: '24px' },
  }[size];

  return (
    <div style={{ width: '100%' }}>
      {/* Level header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: sizeConfig.iconSize }}>{currentLevelData.icon}</span>
          <div>
            <div style={{
              fontSize: sizeConfig.fontSize,
              fontWeight: 700,
              color: '#f3f4f6',
              lineHeight: 1.2,
            }}>
              Cấp {level}
            </div>
            <div style={{
              fontSize: `${sizeConfig.fontSize - 2}px`,
              color: '#9ca3af',
            }}>
              {levelTitle}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: sizeConfig.fontSize,
            fontWeight: 700,
            color: '#a855f7',
          }}>
            {currentXp.toLocaleString()} XP
          </div>
          {nextLevelData && (
            <div style={{
              fontSize: `${sizeConfig.fontSize - 2}px`,
              color: '#6b7280',
            }}>
              Cần {nextLevelData.minXp.toLocaleString()} XP
            </div>
          )}
        </div>
      </div>

      {/* Progress bar container */}
      <div style={{
        position: 'relative',
        height: sizeConfig.height,
        background: 'linear-gradient(90deg, #1f2937 0%, #111827 100%)',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid #374151',
      }}>
        {/* Animated progress fill */}
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: displayProgress,
            background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
            borderRadius: '14px',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
          }}
        />

        {/* Stars inside bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          borderRadius: '14px',
        }}>
          <motion.div
            animate={showAnimation ? { x: [0, 100, 0] } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '4px',
              height: '4px',
              background: '#fbbf24',
              borderRadius: '50%',
              boxShadow: '0 0 6px #fbbf24',
              left: displayProgress,
              marginLeft: '-2px',
            }}
          />
        </div>

        {/* Percentage text */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: `${sizeConfig.fontSize - 2}px`,
          fontWeight: 700,
          color: 'white',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}>
          {Math.round(progressPercent)}%
        </div>
      </div>

      {/* XP gain animation */}
      <AnimatePresence>
        {showGain && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            style={{
              position: 'absolute',
              top: '-10px',
              right: '10px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white',
              fontWeight: 700,
              fontSize: '14px',
              padding: '4px 12px',
              borderRadius: '12px',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
            }}
          >
            +{xpGained.toLocaleString()} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level milestones */}
      {size !== 'small' && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '10px',
          color: '#6b7280',
        }}>
          <span>{minXp.toLocaleString()}</span>
          <span>{maxXp.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}