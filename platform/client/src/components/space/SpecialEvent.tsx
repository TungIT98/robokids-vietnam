/**
 * SpecialEvent - Banner/modal for special events like "Space Day"
 * Features animated stars/confetti background and exclusive badge reveal
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpecialEvent {
  id: string;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  badgeName: string;
  badgeNameVi: string;
  emoji: string;
  startDate: string;
  endDate: string;
  xpBonus: number;
}

interface SpecialEventProps {
  event?: SpecialEvent;
  onDismiss?: () => void;
  onClaimBadge?: (eventId: string) => void;
}

// Default Space Day event
const DEFAULT_EVENT: SpecialEvent = {
  id: 'space-day-2026',
  title: 'Space Day 2026',
  titleVi: 'Ngày Vũ Trụ 2026',
  description: 'Celebrate Space Day with exclusive missions and rewards!',
  descriptionVi: 'Kỷ niệm Ngày Vũ Trụ với các nhiệm vụ độc quyền và phần thưởng!',
  badgeName: 'Space Day Champion',
  badgeNameVi: 'Vô địch Ngày Vũ Trụ',
  emoji: '🌌',
  startDate: '2026-04-12T00:00:00Z',
  endDate: '2026-04-14T23:59:59Z',
  xpBonus: 200,
};

function isEventActive(event: SpecialEvent): boolean {
  const now = new Date().getTime();
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  return now >= start && now <= end;
}

function getTimeRemaining(endDate: string): { days: number; hours: number; minutes: number; seconds: number; expired: boolean } {
  const now = new Date().getTime();
  const expiry = new Date(endDate).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, expired: false };
}

export default function SpecialEvent({ event, onDismiss, onClaimBadge }: SpecialEventProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(event?.endDate || DEFAULT_EVENT.endDate));
  const [showBadgeReveal, setShowBadgeReveal] = useState(false);

  const activeEvent = event || DEFAULT_EVENT;
  const isActive = isEventActive(activeEvent);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(activeEvent.endDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeEvent.endDate]);

  useEffect(() => {
    // Confetti animation
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => clearTimeout(confettiTimer);
  }, []);

  const handleClaim = () => {
    setShowBadgeReveal(true);
    onClaimBadge?.(activeEvent.id);
  };

  if (!isActive) {
    return null; // Don't show if event is not active
  }

  return (
    <>
      {/* Confetti Background */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.confettiContainer}
          >
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 1,
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                  y: -20,
                }}
                animate={{
                  opacity: [1, 0],
                  y: typeof window !== 'undefined' ? window.innerHeight + 50 : 1000,
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000) + (Math.random() - 0.5) * 200,
                  rotate: Math.random() * 720,
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 2,
                }}
                style={styles.confettiItem}
              >
                {['⭐', '🌟', '✨', '🎉', '🎊', '🚀', '🛸', '🌌'][Math.floor(Math.random() * 8)]}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Banner */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        style={styles.banner}
      >
        {/* Animated star background */}
        <div style={styles.starfield}>
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                ...styles.star,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.eventBadge}>
            <span style={styles.eventEmoji}>{activeEvent.emoji}</span>
            <span style={styles.eventLabel}>SỰ KIỆN ĐẶC BIỆT</span>
          </div>

          <h2 style={styles.eventTitle}>{activeEvent.titleVi}</h2>
          <p style={styles.eventDescription}>{activeEvent.descriptionVi}</p>

          {/* Timer */}
          {!timeLeft.expired && (
            <div style={styles.timer}>
              <span style={styles.timerLabel}>Kết thúc sau:</span>
              <div style={styles.timerValues}>
                <div style={styles.timerUnit}>
                  <span style={styles.timerNumber}>{String(timeLeft.days).padStart(2, '0')}</span>
                  <span style={styles.timerUnitLabel}>Ngày</span>
                </div>
                <span style={styles.timerSeparator}>:</span>
                <div style={styles.timerUnit}>
                  <span style={styles.timerNumber}>{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span style={styles.timerUnitLabel}>Giờ</span>
                </div>
                <span style={styles.timerSeparator}>:</span>
                <div style={styles.timerUnit}>
                  <span style={styles.timerNumber}>{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span style={styles.timerUnitLabel}>Phút</span>
                </div>
              </div>
            </div>
          )}

          {/* XP Bonus */}
          <div style={styles.xpBonus}>
            <span style={styles.xpBonusIcon}>⚡</span>
            <span>+{activeEvent.xpBonus} XP Bonus cho tất cả nhiệm vụ!</span>
          </div>

          {/* Exclusive Badge Preview */}
          <div style={styles.badgePreview}>
            <span style={styles.badgePreviewLabel}>Huy hiệu độc quyền:</span>
            <div style={styles.badgeItem}>
              <span style={styles.badgeItemEmoji}>🏅</span>
              <span style={styles.badgeItemName}>{activeEvent.badgeNameVi}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button onClick={handleClaim} style={styles.claimButton}>
              Nhận Huy Hiệu 🔥
            </button>
            <button onClick={onDismiss} style={styles.dismissButton}>
              Đóng
            </button>
          </div>
        </div>

        {/* Close button */}
        <button onClick={onDismiss} style={styles.closeButton}>
          ✕
        </button>
      </motion.div>

      {/* Badge Reveal Animation */}
      <AnimatePresence>
        {showBadgeReveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.revealOverlay}
            onClick={() => setShowBadgeReveal(false)}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              style={styles.revealModal}
            >
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={styles.revealIcon}
              >
                🏅
              </motion.div>
              <h3 style={styles.revealTitle}>Chúc mừng!</h3>
              <p style={styles.revealSubtitle}>Bạn đã nhận được</p>
              <h2 style={styles.revealBadgeName}>{activeEvent.badgeNameVi}</h2>
              <p style={styles.revealDescription}>
                {activeEvent.descriptionVi}
              </p>
              <button
                onClick={() => setShowBadgeReveal(false)}
                style={styles.revealCloseButton}
              >
                Tuyệt vời! 🚀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  confettiContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1001,
    overflow: 'hidden',
  },
  confettiItem: {
    position: 'absolute',
    fontSize: '24px',
  },
  starfield: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  star: {
    position: 'absolute',
    width: '2px',
    height: '2px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    boxShadow: '0 0 4px #fff',
  },
  banner: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: '500px',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%)',
    borderRadius: '24px',
    border: '2px solid rgba(99, 102, 241, 0.5)',
    boxShadow: '0 0 60px rgba(99, 102, 241, 0.4), 0 0 100px rgba(168, 85, 247, 0.2)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  content: {
    padding: '24px',
    textAlign: 'center',
  },
  eventBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    padding: '6px 16px',
    borderRadius: '20px',
    marginBottom: '16px',
  },
  eventEmoji: {
    fontSize: '20px',
  },
  eventLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#f97316',
    letterSpacing: '0.1em',
  },
  eventTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#fff',
    margin: '0 0 8px 0',
    textShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
  },
  eventDescription: {
    fontSize: '14px',
    color: '#aaa',
    margin: '0 0 20px 0',
  },
  timer: {
    marginBottom: '16px',
  },
  timerLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#888',
    marginBottom: '8px',
  },
  timerValues: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
  },
  timerUnit: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  timerNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ef4444',
    fontFamily: 'monospace',
  },
  timerUnitLabel: {
    fontSize: '9px',
    color: '#888',
    textTransform: 'uppercase',
  },
  timerSeparator: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#888',
  },
  xpBonus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    color: '#eab308',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  xpBonusIcon: {
    fontSize: '18px',
  },
  badgePreview: {
    marginBottom: '20px',
  },
  badgePreviewLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#888',
    marginBottom: '8px',
  },
  badgeItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    padding: '10px 20px',
    borderRadius: '16px',
    border: '1px solid rgba(168, 85, 247, 0.3)',
  },
  badgeItemEmoji: {
    fontSize: '24px',
  },
  badgeItemName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#a855f7',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  claimButton: {
    padding: '12px 24px',
    backgroundColor: 'linear-gradient(90deg, #f97316, #ef4444)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 0 20px rgba(249, 115, 22, 0.4)',
  },
  dismissButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#888',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888',
    cursor: 'pointer',
    fontSize: '16px',
  },
  revealOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1002,
    padding: '20px',
  },
  revealModal: {
    background: 'linear-gradient(135deg, #1a1a2e, #0a0a1a)',
    borderRadius: '32px',
    padding: '48px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    border: '2px solid rgba(249, 115, 22, 0.5)',
    boxShadow: '0 0 80px rgba(249, 115, 22, 0.4)',
  },
  revealIcon: {
    fontSize: '80px',
    marginBottom: '24px',
  },
  revealTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#fff',
    margin: '0 0 8px 0',
  },
  revealSubtitle: {
    fontSize: '14px',
    color: '#888',
    margin: '0 0 16px 0',
  },
  revealBadgeName: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#f97316',
    margin: '0 0 12px 0',
  },
  revealDescription: {
    fontSize: '14px',
    color: '#aaa',
    margin: '0 0 24px 0',
  },
  revealCloseButton: {
    padding: '14px 32px',
    backgroundColor: 'linear-gradient(90deg, #f97316, #ef4444)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};