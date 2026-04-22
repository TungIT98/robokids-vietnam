/**
 * BadgeUnlockAnimation - Celebratory animation when a badge is earned
 * Shows particle effects, badge icon with glow, and achievement details
 * Kid-friendly design with colorful animations
 */

import React, { useEffect, useState } from 'react';
import { Badge, BadgeTier, BadgeCategory, BADGE_TIER_INFO, BADGE_CATEGORY_INFO } from '../../services/gamificationApi';

interface BadgeUnlockAnimationProps {
  badge: Badge;
  isVisible: boolean;
  onClose: () => void;
  autoCloseMs?: number;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f97316',
};

const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(156, 163, 175, 0.4)',
  uncommon: 'rgba(34, 197, 94, 0.5)',
  rare: 'rgba(59, 130, 246, 0.6)',
  epic: 'rgba(168, 85, 247, 0.7)',
  legendary: 'rgba(249, 115, 22, 0.8)',
};

// Particle component for confetti effect
const Particle: React.FC<{ delay: number; color: string; x: number }> = ({ delay, color, x }) => {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'absolute',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
    left: `${x}%`,
    top: '50%',
    opacity: 0,
    transform: 'scale(0)',
  });

  useEffect(() => {
    // Animate particle
    const animate = () => {
      setStyle(prev => ({
        ...prev,
        opacity: 1,
        transform: 'scale(1)',
        top: '20%',
        transition: `all ${0.8 + Math.random() * 0.4}s ease-out`,
      }));
      setTimeout(() => {
        setStyle(prev => ({
          ...prev,
          opacity: 0,
          top: '-20%',
          transition: `all ${0.6 + Math.random() * 0.3}s ease-in`,
        }));
      }, 800);
    };

    const timeout = setTimeout(animate, delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return <div style={style} />;
};

// Ring pulse animation component
const RingPulse: React.FC<{ color: string; delay: number }> = ({ color, delay }) => {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setOpacity(0.6);
      setTimeout(() => setOpacity(0), 1000);
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <div
      style={{
        position: 'absolute',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        border: `3px solid ${color}`,
        opacity,
        transform: 'scale(1)',
        animation: opacity > 0 ? 'ringPulse 1s ease-out forwards' : 'none',
      }}
    />
  );
};

export default function BadgeUnlockAnimation({
  badge,
  isVisible,
  onClose,
  autoCloseMs = 5000,
}: BadgeUnlockAnimationProps) {
  const [showContent, setShowContent] = useState(false);
  const [particles, setParticles] = useState<{ id: number; color: string; x: number }[]>([]);
  const [isClosing, setIsClosing] = useState(false);

  const rarityColor = RARITY_COLORS[badge.rarity || 'common'];
  const glowColor = RARITY_GLOW[badge.rarity || 'common'];
  const tierInfo = BADGE_TIER_INFO[badge.tier] || BADGE_TIER_INFO.bronze;
  const categoryInfo = BADGE_CATEGORY_INFO[badge.category as BadgeCategory] || BADGE_CATEGORY_INFO.special;

  // Generate particles on mount
  useEffect(() => {
    if (isVisible) {
      const colors = [rarityColor, '#ffd700', '#ff6b6b', '#4ecdc4', '#a855f7', '#22c55e'];
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        x: Math.random() * 100,
      }));
      setParticles(newParticles);

      // Show content after a brief delay for dramatic effect
      setTimeout(() => setShowContent(true), 100);
    } else {
      setShowContent(false);
      setIsClosing(false);
    }
  }, [isVisible, rarityColor]);

  // Auto-close after timeout
  useEffect(() => {
    if (isVisible && showContent) {
      const timeout = setTimeout(() => {
        handleClose();
      }, autoCloseMs);
      return () => clearTimeout(timeout);
    }
  }, [isVisible, showContent, autoCloseMs]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
      }}
      onClick={handleClose}
    >
      {/* Particle container */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {particles.map(p => (
          <Particle key={p.id} delay={p.id * 50} color={p.color} x={p.x} />
        ))}
      </div>

      {/* Ring pulses */}
      <div style={{ position: 'relative' }}>
        <RingPulse color={rarityColor} delay={0} />
        <RingPulse color={rarityColor} delay={200} />
        <RingPulse color={rarityColor} delay={400} />
      </div>

      {/* Main content */}
      <div
        style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          borderRadius: '24px',
          padding: '40px',
          maxWidth: '380px',
          width: '90%',
          textAlign: 'center',
          border: `2px solid ${rarityColor}40`,
          boxShadow: `0 0 60px ${glowColor}, 0 0 100px ${glowColor}40`,
          transform: showContent && !isClosing ? 'scale(1)' : 'scale(0.8)',
          opacity: showContent && !isClosing ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#ffd700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '16px',
            opacity: showContent ? 1 : 0,
            transform: showContent ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'all 0.4s ease-out 0.1s',
          }}
        >
          🎉 Huy hiệu mới! 🎉
        </div>

        {/* Badge icon with glow */}
        <div
          style={{
            position: 'relative',
            marginBottom: '20px',
          }}
        >
          {/* Glow effect */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
              animation: 'glowPulse 1.5s ease-in-out infinite',
            }}
          />

          {/* Badge circle */}
          <div
            style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: `linear-gradient(145deg, ${rarityColor}40, ${rarityColor}20)`,
              border: `3px solid ${rarityColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: `0 0 30px ${glowColor}`,
              animation: showContent ? 'badgeBounce 0.6s ease-out 0.2s' : 'none',
            }}
          >
            <span style={{ fontSize: '60px', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' }}>
              {badge.iconEmoji || '🏅'}
            </span>
          </div>
        </div>

        {/* Badge name */}
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#fff',
            margin: '0 0 8px 0',
            textShadow: `0 0 20px ${glowColor}`,
            opacity: showContent ? 1 : 0,
            transform: showContent ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.4s ease-out 0.3s',
          }}
        >
          {badge.nameVi || badge.name}
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: '14px',
            color: '#aaa',
            margin: '0 0 20px 0',
            opacity: showContent ? 1 : 0,
            transform: showContent ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.4s ease-out 0.4s',
          }}
        >
          {badge.descriptionVi || badge.description}
        </p>

        {/* Tier and Category badges */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            opacity: showContent ? 1 : 0,
            transform: showContent ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.4s ease-out 0.5s',
          }}
        >
          {/* Tier badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: `${tierInfo.color}20`,
              border: `1px solid ${tierInfo.color}`,
              borderRadius: '20px',
              padding: '6px 14px',
            }}
          >
            <span style={{ fontSize: '18px' }}>{tierInfo.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: tierInfo.color }}>
              {tierInfo.nameVi}
            </span>
          </div>

          {/* Category badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              padding: '6px 14px',
            }}
          >
            <span style={{ fontSize: '18px' }}>{categoryInfo.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
              {categoryInfo.nameVi}
            </span>
          </div>
        </div>

        {/* XP Reward */}
        {badge.xpReward > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: 'rgba(168, 85, 247, 0.2)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '12px',
              padding: '10px 20px',
              marginBottom: '20px',
              opacity: showContent ? 1 : 0,
              transform: showContent ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.4s ease-out 0.6s',
            }}
          >
            <span style={{ fontSize: '20px' }}>⚡</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#a855f7' }}>
              +{badge.xpReward} XP
            </span>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            padding: '12px 32px',
            backgroundColor: rarityColor,
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            opacity: showContent ? 1 : 0,
            transform: showContent ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.4s ease-out 0.7s, background-color 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = `0 0 20px ${rarityColor}`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Tuyệt vời! 🎉
        </button>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
        }

        @keyframes badgeBounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }

        @keyframes ringPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Hook for managing badge unlock animations
export function useBadgeUnlockAnimation() {
  const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showUnlock = (badge: Badge) => {
    setUnlockedBadge(badge);
    setIsVisible(true);
  };

  const hideUnlock = () => {
    setIsVisible(false);
    setTimeout(() => setUnlockedBadge(null), 300);
  };

  const BadgeUnlockModal = () => {
    if (!unlockedBadge) return null;
    return (
      <BadgeUnlockAnimation
        badge={unlockedBadge}
        isVisible={isVisible}
        onClose={hideUnlock}
      />
    );
  };

  return { showUnlock, hideUnlock, unlockedBadge, isVisible, BadgeUnlockModal };
}
