/**
 * MissionProgressMap - Visual map of space journey
 * Shows Earth -> Moon -> Mars -> Jupiter path with progress
 */

import { motion } from 'framer-motion';

type Phase = 'lesson' | 'challenge' | 'practice' | 'review' | 'complete';

interface MissionProgressMapProps {
  currentPhase: Phase;
  completedPhases: Set<Phase>;
}

interface Planet {
  id: string;
  name: string;
  nameVi: string;
  emoji: string;
  color: string;
  description: string;
  phase: Phase;
}

const PLANETS: Planet[] = [
  {
    id: 'earth',
    name: 'Earth',
    nameVi: 'Trái Đất',
    emoji: '🌍',
    color: '#3b82f6',
    description: 'Nhiệm vụ khởi đầu',
    phase: 'lesson',
  },
  {
    id: 'moon',
    name: 'Moon',
    nameVi: 'Mặt Trăng',
    emoji: '🌙',
    color: '#a1a1aa',
    description: 'Thử thách cơ bản',
    phase: 'challenge',
  },
  {
    id: 'mars',
    name: 'Mars',
    nameVi: 'Sao Hỏa',
    emoji: '🔴',
    color: '#f97316',
    description: 'Luyện tập nâng cao',
    phase: 'practice',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    nameVi: 'Sao Mộc',
    emoji: '🟠',
    color: '#eab308',
    description: 'AI phản hồi',
    phase: 'review',
  },
];

const PHASE_TO_PLANET: Record<Phase, number> = {
  lesson: 0,
  challenge: 1,
  practice: 2,
  review: 3,
  complete: 3,
};

export default function MissionProgressMap({
  currentPhase,
  completedPhases,
}: MissionProgressMapProps) {
  const currentPlanetIndex = PHASE_TO_PLANET[currentPhase];
  const isComplete = currentPhase === 'complete';

  return (
    <div style={{
      padding: '16px 24px',
      background: 'rgba(0,0,0,0.3)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '600px',
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Connecting lines */}
        <svg
          style={{
            position: 'absolute',
            top: '24px',
            left: '48px',
            right: '48px',
            height: '4px',
            zIndex: 0,
          }}
          viewBox="0 0 100 4"
          preserveAspectRatio="none"
        >
          {/* Background line */}
          <rect x="0" y="0" width="100" height="4" fill="#1f2937" rx="2" />
          {/* Progress line */}
          <motion.rect
            x="0"
            y="0"
            width="100"
            height="4"
            fill="url(#progressGradient)"
            rx="2"
            initial={{ width: '0%' }}
            animate={{ width: `${(currentPlanetIndex / (PLANETS.length - 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
        </svg>

        {/* Planets */}
        {PLANETS.map((planet, index) => {
          const isCompleted = completedPhases.has(planet.phase) || index < currentPlanetIndex;
          const isCurrent = planet.phase === currentPhase || (isComplete && index === currentPlanetIndex);
          const isFuture = index > currentPlanetIndex && !isComplete;

          return (
            <div
              key={planet.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Planet circle */}
              <motion.div
                animate={
                  isCurrent
                    ? {
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          `0 0 0px ${planet.color}`,
                          `0 0 30px ${planet.color}`,
                          `0 0 0px ${planet.color}`,
                        ],
                      }
                    : {}
                }
                transition={{ duration: 2, repeat: isCurrent ? Infinity : 0 }}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: isCompleted || isCurrent
                    ? `linear-gradient(135deg, ${planet.color}, ${planet.color}80)`
                    : '#1f2937',
                  border: `3px solid ${
                    isCompleted ? planet.color : isCurrent ? planet.color : '#374151'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: isCompleted || isCurrent
                    ? `0 0 20px ${planet.color}60`
                    : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {isFuture ? (
                  <span style={{ opacity: 0.3 }}>🔒</span>
                ) : isCompleted && !isCurrent ? (
                  <span>✓</span>
                ) : (
                  planet.emoji
                )}
              </motion.div>

              {/* Planet name */}
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isCurrent ? planet.color : isFuture ? '#4b5563' : '#9ca3af',
                  textAlign: 'center',
                }}
              >
                {planet.nameVi}
              </div>

              {/* Phase label */}
              <div
                style={{
                  fontSize: '9px',
                  color: '#6b7280',
                  marginTop: '2px',
                }}
              >
                {planet.description}
              </div>

              {/* Current indicator */}
              {isCurrent && (
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    fontSize: '16px',
                  }}
                >
                  🚀
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress info */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        marginTop: '16px',
        fontSize: '12px',
        color: '#6b7280',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22c55e',
          }} />
          <span>Hoàn thành: {completedPhases.size}/{PLANETS.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#7c3aed',
          }} />
          <span>Hiện tại: {PLANETS[currentPlanetIndex]?.nameVi}</span>
        </div>
      </div>
    </div>
  );
}