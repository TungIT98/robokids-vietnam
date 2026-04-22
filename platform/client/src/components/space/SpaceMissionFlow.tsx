/**
 * SpaceMissionFlow - Multi-step wizard for space mission flow
 * Flow: Lesson (Phase 1) -> Challenge (Phase 2) -> 3D Practice -> AI Review
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MissionProgressMap from './MissionProgressMap';

type Phase = 'lesson' | 'challenge' | 'practice' | 'review' | 'complete';

interface MissionStep {
  id: Phase;
  label: string;
  icon: string;
  description: string;
}

const MISSION_STEPS: MissionStep[] = [
  { id: 'lesson', label: 'Bài học', icon: '📚', description: 'Học cách lập trình robot' },
  { id: 'challenge', label: 'Thử thách', icon: '🎯', description: 'Hoàn thành nhiệm vụ' },
  { id: 'practice', label: 'Luyện tập 3D', icon: '🚀', description: 'Thực hành trong không gian 3D' },
  { id: 'review', label: 'AI Phản hồi', icon: '🤖', description: 'Nhận phản hồi từ AI' },
];

interface SpaceMissionFlowProps {
  missionId: string;
  missionTitle: string;
  onComplete: (result: { xpEarned: number; badgesEarned: string[]; levelUp: boolean }) => void;
  onExit: () => void;
}

export default function SpaceMissionFlow({
  missionId,
  missionTitle,
  onComplete,
  onExit,
}: SpaceMissionFlowProps) {
  const [currentPhase, setCurrentPhase] = useState<Phase>('lesson');
  const [completedPhases, setCompletedPhases] = useState<Set<Phase>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState<string[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const currentStepIndex = MISSION_STEPS.findIndex(s => s.id === currentPhase);

  const goToNextPhase = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < MISSION_STEPS.length) {
      setCompletedPhases(prev => new Set([...prev, currentPhase]));
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPhase(MISSION_STEPS[nextIndex].id);
        setIsTransitioning(false);
      }, 500);
    } else {
      // Mission complete
      setCurrentPhase('complete');
      onComplete({ xpEarned, badgesEarned, levelUp: showLevelUp });
    }
  };

  const goToPreviousPhase = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPhase(MISSION_STEPS[prevIndex].id);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handlePhaseComplete = (phaseXp: number = 50) => {
    setXpEarned(prev => prev + phaseXp);
    // Check for level up (simplified - every 500 XP)
    if (xpEarned + phaseXp >= 500 && !showLevelUp) {
      setShowLevelUp(true);
    }
    goToNextPhase();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header with mission info */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onExit}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 12px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ✕
          </button>
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#f3f4f6',
              margin: 0,
            }}>
              {missionTitle}
            </h2>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: 0,
            }}>
              Nhiệm vụ không gian
            </p>
          </div>
        </div>

        {/* XP Counter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(168, 85, 247, 0.2)',
          padding: '8px 16px',
          borderRadius: '20px',
          border: '1px solid rgba(168, 85, 247, 0.3)',
        }}>
          <span style={{ fontSize: '18px' }}>⭐</span>
          <span style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#a855f7',
          }}>
            +{xpEarned} XP
          </span>
        </div>
      </header>

      {/* Progress Map */}
      <MissionProgressMap
        currentPhase={currentPhase}
        completedPhases={completedPhases}
      />

      {/* Phase indicator */}
      <div style={{
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          background: 'rgba(0,0,0,0.3)',
          padding: '8px',
          borderRadius: '16px',
        }}>
          {MISSION_STEPS.map((step, index) => {
            const isCompleted = completedPhases.has(step.id);
            const isCurrent = currentPhase === step.id;

            return (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  background: isCurrent
                    ? 'linear-gradient(90deg, #7c3aed, #6366f1)'
                    : isCompleted
                      ? 'rgba(34, 197, 94, 0.2)'
                      : 'transparent',
                  border: isCurrent
                    ? '2px solid rgba(168, 85, 247, 0.5)'
                    : '2px solid transparent',
                  transition: 'all 0.3s ease',
                }}
              >
                <span style={{ fontSize: '20px' }}>{step.icon}</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? 'white' : isCompleted ? '#22c55e' : '#6b7280',
                }}>
                  {step.label}
                </span>
                {isCompleted && <span style={{ color: '#22c55e' }}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content area */}
      <main style={{
        flex: 1,
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <AnimatePresence mode="wait">
          {isTransitioning ? (
            <motion.div
              key="transitioning"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              style={{
                fontSize: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              🚀
            </motion.div>
          ) : (
            <motion.div
              key={currentPhase}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              style={{
                width: '100%',
                maxWidth: '800px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '32px',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {currentPhase === 'lesson' && (
                <LessonPhase onComplete={() => handlePhaseComplete(50)} />
              )}
              {currentPhase === 'challenge' && (
                <ChallengePhase onComplete={() => handlePhaseComplete(75)} />
              )}
              {currentPhase === 'practice' && (
                <PracticePhase onComplete={() => handlePhaseComplete(100)} />
              )}
              {currentPhase === 'review' && (
                <ReviewPhase onComplete={() => handlePhaseComplete(50)} />
              )}
              {currentPhase === 'complete' && (
                <CompletionScreen xpEarned={xpEarned} badgesEarned={badgesEarned} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      {currentPhase !== 'complete' && (
        <footer style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            onClick={goToPreviousPhase}
            disabled={currentStepIndex === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: currentStepIndex === 0 ? 'transparent' : 'rgba(255,255,255,0.1)',
              color: currentStepIndex === 0 ? '#4b5563' : 'white',
              cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              opacity: currentStepIndex === 0 ? 0.5 : 1,
            }}
          >
            ← Quay lại
          </button>

          <button
            onClick={goToNextPhase}
            style={{
              padding: '12px 32px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(90deg, #7c3aed, #6366f1)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            {currentStepIndex === MISSION_STEPS.length - 1 ? 'Hoàn thành! 🚀' : 'Tiếp tục →'}
          </button>
        </footer>
      )}

      {/* Level up celebration */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                borderRadius: '24px',
                padding: '48px',
                textAlign: 'center',
                boxShadow: '0 0 100px rgba(168, 85, 247, 0.6)',
              }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ fontSize: '80px', marginBottom: '16px' }}
              >
                ⬆️
              </motion.div>
              <h2 style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'white',
                margin: '0 0 8px 0',
              }}>
                Level Up!
              </h2>
              <p style={{
                fontSize: '18px',
                color: 'rgba(255,255,255,0.8)',
                margin: 0,
              }}>
                Bạn đã lên cấp mới!
              </p>
              <button
                onClick={() => setShowLevelUp(false)}
                style={{
                  marginTop: '24px',
                  padding: '12px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'white',
                  color: '#7c3aed',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 700,
                }}
              >
                Tiếp tục 🚀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Phase components
function LessonPhase({ onComplete }: { onComplete: () => void }) {
  return (
    <div style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
      <h3 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: 'white',
        marginBottom: '8px',
      }}>
        Bài học: Lập trình Robot
      </h3>
      <p style={{
        fontSize: '14px',
        color: '#9ca3af',
        marginBottom: '24px',
      }}>
        Học cách điều khiển robot với các khối lệnh Blockly
      </p>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <div style={{
          background: 'rgba(99, 102, 241, 0.2)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '500px',
        }}>
          <h4 style={{ color: '#a855f7', marginBottom: '12px' }}>📖 Nội dung bài học</h4>
          <ul style={{
            textAlign: 'left',
            color: '#d1d5db',
            fontSize: '14px',
            lineHeight: 2,
            margin: 0,
            paddingLeft: '20px',
          }}>
            <li>Giới thiệu về robot và các lệnh cơ bản</li>
            <li>Cách sử dụng khối Blockly</li>
            <li>Điều khiển robot di chuyển</li>
            <li>Thực hành với mô phỏng</li>
          </ul>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {['🤖 Robot', '⬆️ Lên', '⬇️ Xuống', '⬅️ Trái', '➡️ Phải'].map((item, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                color: '#d1d5db',
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onComplete}
        style={{
          marginTop: '24px',
          padding: '14px 32px',
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(90deg, #22c55e, #16a34a)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 700,
          boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)',
        }}
      >
        Hoàn thành bài học ✓
      </button>
    </div>
  );
}

function ChallengePhase({ onComplete }: { onComplete: () => void }) {
  const [challengeComplete, setChallengeComplete] = useState(false);

  return (
    <div style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
      <h3 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: 'white',
        marginBottom: '8px',
      }}>
        Thử thách Robot
      </h3>
      <p style={{
        fontSize: '14px',
        color: '#9ca3af',
        marginBottom: '24px',
      }}>
        Hoàn thành nhiệm vụ bằng cách viết chương trình Blockly
      </p>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        {/* Challenge description */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          maxWidth: '500px',
        }}>
          <h4 style={{ color: '#ef4444', marginBottom: '8px' }}>🎯 Nhiệm vụ</h4>
          <p style={{ color: '#d1d5db', fontSize: '14px', margin: 0 }}>
            Điều khiển robot di chuyển từ điểm A đến điểm B, tránh các chướng ngại vật
          </p>
        </div>

        {/* Simplified Blockly preview */}
        <div style={{
          background: '#1f2937',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          maxWidth: '400px',
        }}>
          {['⬆️ Di chuyển', '➡️ Rẽ phải', '⬆️ Di chuyển', '✅ Hoàn thành'].map((cmd, i) => (
            <div
              key={i}
              style={{
                background: i === 3 ? '#22c55e' : '#6366f1',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'white',
              }}
            >
              {cmd}
            </div>
          ))}
        </div>

        <button
          onClick={() => setChallengeComplete(true)}
          style={{
            padding: '14px 32px',
            borderRadius: '12px',
            border: 'none',
            background: challengeComplete
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : 'linear-gradient(90deg, #ef4444, #dc2626)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 700,
            boxShadow: `0 0 20px ${challengeComplete ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          }}
        >
          {challengeComplete ? '✓ Thử thách hoàn thành!' : 'Chạy chương trình ▶️'}
        </button>

        {challengeComplete && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onComplete}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 700,
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)',
            }}
          >
            Tiếp tục →
          </motion.button>
        )}
      </div>
    </div>
  );
}

function PracticePhase({ onComplete }: { onComplete: () => void }) {
  return (
    <div style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
      <h3 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: 'white',
        marginBottom: '8px',
      }}>
        Luyện tập 3D
      </h3>
      <p style={{
        fontSize: '14px',
        color: '#9ca3af',
        marginBottom: '24px',
      }}>
        Thực hành điều khiển robot trong môi trường 3D
      </p>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* 3D Practice placeholder */}
        <div style={{
          width: '300px',
          height: '200px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%)',
          borderRadius: '16px',
          border: '2px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Animated stars */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 70%, white 1px, transparent 1px)',
            opacity: 0.5,
            animation: 'twinkle 2s infinite',
          }} />

          <div style={{
            fontSize: '64px',
            marginBottom: '8px',
            animation: 'float 3s ease-in-out infinite',
          }}>
            🤖
          </div>
          <p style={{ color: '#6b7280', fontSize: '12px' }}>
            Robot đang di chuyển...
          </p>

          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes twinkle {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.8; }
            }
          `}</style>
        </div>
      </div>

      <button
        onClick={onComplete}
        style={{
          marginTop: '24px',
          padding: '14px 32px',
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(90deg, #22c55e, #16a34a)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 700,
          boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)',
        }}
      >
        Hoàn thành luyện tập ✓
      </button>
    </div>
  );
}

function ReviewPhase({ onComplete }: { onComplete: () => void }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');

  const runAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisResult('Chương trình của bạn đã được phân tích! Bạn đã sử dụng 4 khối lệnh, hoàn thành nhiệm vụ với hiệu suất tốt. Đề xuất: thử sử dụng vòng lặp để tối ưu code!');
    }, 2000);
  };

  return (
    <div style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
      <h3 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: 'white',
        marginBottom: '8px',
      }}>
        AI Phản hồi
      </h3>
      <p style={{
        fontSize: '14px',
        color: '#9ca3af',
        marginBottom: '24px',
      }}>
        Nhận phản hồi thông minh từ AI về chương trình của bạn
      </p>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <div style={{
          background: 'rgba(6, 182, 212, 0.2)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          maxWidth: '500px',
          textAlign: 'left',
        }}>
          <h4 style={{ color: '#06b6d4', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🤖</span> AI Assistant
          </h4>

          {isAnalyzing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#9ca3af' }}>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ fontSize: '20px' }}
              >
                ⏳
              </motion.span>
              <span>Đang phân tích chương trình...</span>
            </div>
          ) : analysisResult ? (
            <p style={{ color: '#d1d5db', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              {analysisResult}
            </p>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Nhấn nút bên dưới để AI phân tích chương trình của bạn
            </p>
          )}
        </div>

        {!analysisResult && (
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              background: isAnalyzing
                ? 'rgba(99, 102, 241, 0.5)'
                : 'linear-gradient(90deg, #06b6d4, #0891b2)',
              color: 'white',
              cursor: isAnalyzing ? 'wait' : 'pointer',
              fontSize: '16px',
              fontWeight: 700,
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
            }}
          >
            {isAnalyzing ? 'Đang phân tích...' : 'Phân tích với AI 🤖'}
          </button>
        )}

        {analysisResult && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onComplete}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 700,
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)',
            }}
          >
            Hoàn thành nhiệm vụ 🚀
          </motion.button>
        )}
      </div>
    </div>
  );
}

function CompletionScreen({ xpEarned, badgesEarned }: { xpEarned: number; badgesEarned: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        textAlign: 'center',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        style={{ fontSize: '80px', marginBottom: '24px' }}
      >
        🎉
      </motion.div>

      <h2 style={{
        fontSize: '32px',
        fontWeight: 700,
        background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '8px',
      }}>
        Nhiệm vụ hoàn thành!
      </h2>

      <p style={{
        fontSize: '16px',
        color: '#9ca3af',
        marginBottom: '32px',
      }}>
        Bạn đã hoàn thành nhiệm vụ không gian thành công!
      </p>

      {/* XP earned */}
      <div style={{
        background: 'rgba(168, 85, 247, 0.2)',
        borderRadius: '20px',
        padding: '24px 48px',
        border: '2px solid rgba(168, 85, 247, 0.3)',
        marginBottom: '24px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>⭐</div>
        <div style={{
          fontSize: '36px',
          fontWeight: 700,
          color: '#a855f7',
        }}>
          +{xpEarned} XP
        </div>
      </div>

      {/* Badges earned */}
      {badgesEarned.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {badgesEarned.map((badge, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.2 }}
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>🏆</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
                {badge}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confetti effect */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              opacity: 1,
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: -20,
            }}
            animate={{
              opacity: [1, 0],
              y: typeof window !== 'undefined' ? window.innerHeight + 20 : 1000,
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              delay: Math.random() * 0.5,
              repeat: Infinity,
            }}
            style={{
              position: 'absolute',
              fontSize: '20px',
            }}
          >
            {['⭐', '🌟', '✨', '🎉', '🎊'][Math.floor(Math.random() * 5)]}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}