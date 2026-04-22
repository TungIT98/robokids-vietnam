/**
 * LessonView - Interactive lesson page with Blockly IDE and step navigation
 * Shows lesson steps, allows students to build robot code, and track progress.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BlocklyIDE from '../components/BlocklyIDE';
import { getLessonBySlug } from '../curriculum';
import { Lesson, LessonStep, StudentLessonProgress } from '../models/lesson';
import { useSubscription } from '../hooks/useSubscription';
import { PremiumLockOverlay } from '../components/PremiumLockOverlay';

interface LessonViewProps {
  studentProgress?: StudentLessonProgress;
}

export default function LessonView(_props: LessonViewProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [lessonStarted, setLessonStarted] = useState(false);
  const { canAccessTier } = useSubscription();

  useEffect(() => {
    if (!slug) return;
    const found = getLessonBySlug(slug);
    if (found) {
      setLesson(found);
      // Restore progress from localStorage
      const saved = localStorage.getItem(`lesson_progress_${slug}`);
      if (saved) {
        const parsed = JSON.parse(saved) as StudentLessonProgress;
        setCompletedSteps(parsed.completedSteps || []);
        setCurrentStepIndex(parsed.lastStepId
          ? found.steps.findIndex(s => s.id === parsed.lastStepId) + 1
          : 0);
      }
    }
  }, [slug]);

  const currentStep: LessonStep | null = lesson?.steps[currentStepIndex] ?? null;
  const isLastStep = lesson ? currentStepIndex === lesson.steps.length - 1 : false;
  const isFirstStep = currentStepIndex === 0;
  const allStepsComplete = lesson ? completedSteps.length === lesson.steps.length : false;

  const saveProgress = useCallback((stepId: string, completed: string[]) => {
    if (!slug || !lesson) return;
    const progress: StudentLessonProgress = {
      lessonId: lesson.id,
      studentId: 'local', // Will be Supabase profile ID when connected
      status: completed.length === lesson.steps.length ? 'completed' : 'in_progress',
      completedSteps: completed,
      lastStepId: stepId,
      attempts: 0,
      completedAt: completed.length === lesson.steps.length ? new Date().toISOString() : undefined,
      timeSpentSeconds: 0,
    };
    localStorage.setItem(`lesson_progress_${slug}`, JSON.stringify(progress));
  }, [slug, lesson]);

  const handleStepComplete = () => {
    if (!currentStep || !lesson) return;
    const newCompleted = completedSteps.includes(currentStep.id)
      ? completedSteps
      : [...completedSteps, currentStep.id];
    setCompletedSteps(newCompleted);
    saveProgress(currentStep.id, newCompleted);

    if (!isLastStep) {
      setCurrentStepIndex(prev => prev + 1);
      setShowHint(false);
    }
  };

  const handlePrevStep = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
      setShowHint(false);
    }
  };

  const handleStartLesson = () => {
    setLessonStarted(true);
  };

  const handleBackToCurriculum = () => {
    navigate('/curriculum');
  };

  if (!lesson) {
    return (
      <div style={styles.loading}>
        <span style={styles.loadingIcon}>🤖</span>
        <p>Đang tải bài học...</p>
      </div>
    );
  }

  const requiredTier = lesson.requiredTier || 'sao_hoa';

  // Pre-lesson screen
  if (!lessonStarted) {
    return (
      <PremiumLockOverlay requiredTier={requiredTier}>
        <div style={styles.preLessonContainer}>
          <div style={styles.preLessonCard}>
            <button onClick={handleBackToCurriculum} style={styles.backButton}>
              ← Quay lại chương trình
            </button>

            <div style={styles.lessonHeader}>
              <span style={styles.ageBadge}>
                {lesson.ageGroup === 'beginner' ? '6-8 tuổi' :
                 lesson.ageGroup === 'intermediate' ? '9-12 tuổi' : '13-16 tuổi'}
              </span>
              <span style={styles.categoryBadge}>{lesson.category}</span>
            </div>

            <h1 style={styles.lessonTitle}>{lesson.titleVi}</h1>
            <p style={styles.lessonDesc}>{lesson.descriptionVi || lesson.descriptionEn}</p>

            <div style={styles.objectivesBox}>
              <h3 style={styles.objectivesTitle}>Mục tiêu bài học:</h3>
              <ul style={styles.objectivesList}>
                {lesson.objectivesVi.map((obj, i) => (
                  <li key={i} style={styles.objectivesItem}>✓ {obj}</li>
                ))}
              </ul>
            </div>

            <div style={styles.metaRow}>
              <span>⏱ {lesson.estimatedMinutes} phút</span>
              <span>📚 {lesson.steps.length} bước</span>
              <span>🎯 {lesson.difficulty}</span>
            </div>

            <button onClick={handleStartLesson} style={styles.startButton}>
              🚀 Bắt đầu bài học
            </button>
          </div>
        </div>
      </PremiumLockOverlay>
    );
  }

  // Lesson complete screen
  if (allStepsComplete) {
    return (
      <PremiumLockOverlay requiredTier={requiredTier}>
        <div style={styles.preLessonContainer}>
          <div style={styles.preLessonCard}>
            <div style={styles.celebrationIcon}>🎉</div>
            <h1 style={styles.lessonTitle}>Chúc mừng! Bạn đã hoàn thành!</h1>
            <p style={styles.lessonDesc}>
              Bạn đã hoàn thành bài học "{lesson.titleVi}"!
          </p>

          <div style={styles.completedSteps}>
            {lesson.steps.map((step) => (
              <div key={step.id} style={styles.completedStep}>
                <span style={styles.checkIcon}>✓</span>
                <span>{step.title}</span>
              </div>
            ))}
          </div>

          <div style={styles.buttonRow}>
            <button onClick={handleBackToCurriculum} style={styles.startButton}>
              📚 Quay lại chương trình
            </button>
            {lesson.nextLessonSlug && (
              <button
                onClick={() => navigate(`/lesson/${lesson.nextLessonSlug}`)}
                style={{ ...styles.startButton, backgroundColor: '#2196F3' }}
              >
                ▶ Bài tiếp theo
              </button>
            )}
          </div>

          {/* Certificate Download Button */}
          <button
            onClick={() => navigate('/certificate')}
            style={styles.certificateBtn}
          >
            📜 Tải chứng chỉ
          </button>
        </div>
        </div>
      </PremiumLockOverlay>
    );
  }

  return (
    <PremiumLockOverlay requiredTier={requiredTier}>
    <div style={styles.lessonContainer}>
      {/* Header bar */}
      <div style={styles.headerBar}>
        <button onClick={handleBackToCurriculum} style={styles.headerBack}>
          ← Chương trình
        </button>
        <div style={styles.lessonInfo}>
          <span style={styles.lessonName}>{lesson.titleVi}</span>
          <span style={styles.stepCounter}>
            Bước {currentStepIndex + 1} / {lesson.steps.length}
          </span>
        </div>
        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${(completedSteps.length / lesson.steps.length) * 100}%`
          }} />
        </div>
      </div>

      <div style={styles.mainLayout}>
        {/* Step sidebar */}
        <div style={styles.stepSidebar}>
          <h2 style={styles.stepsTitle}>Các bước</h2>
          <div style={styles.stepList}>
            {lesson.steps.map((step, i) => {
              const isComplete = completedSteps.includes(step.id);
              const isCurrent = i === currentStepIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => { setCurrentStepIndex(i); setShowHint(false); }}
                  style={{
                    ...styles.stepItem,
                    ...(isCurrent ? styles.stepItemActive : {}),
                    ...(isComplete ? styles.stepItemComplete : {}),
                  }}
                >
                  <span style={{
                    ...styles.stepNumber,
                    ...(isComplete ? styles.stepNumberComplete : {}),
                  }}>
                    {isComplete ? '✓' : i + 1}
                  </span>
                  <span style={styles.stepTitle}>{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current step content */}
        {currentStep && (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <h2 style={styles.stepHeading}>{currentStep.title}</h2>
              <p style={styles.stepDesc}>{currentStep.descriptionVi}</p>
            </div>

            {/* Hint */}
            <div style={styles.hintSection}>
              <button
                onClick={() => setShowHint(!showHint)}
                style={styles.hintToggle}
              >
                💡 {showHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
              </button>
              {showHint && currentStep.hint && (
                <div style={styles.hintBox}>
                  <p>{currentStep.hint}</p>
                </div>
              )}
            </div>

            {/* Blockly workspace area */}
            <div style={styles.blocklyArea}>
              <BlocklyIDE
                lessonMode
                ageGroup={lesson.ageGroup}
                lessonId={lesson.id}
                starterXml={currentStep?.allowedBlocks?.length === 1 && currentStep?.allowedBlocks[0]?.startsWith('robot_')
                  ? `<xml><block type="${currentStep.allowedBlocks[0]}" x="100" y="50"></block></xml>`
                  : lesson?.starterXml}
                availableBlocks={currentStep?.allowedBlocks?.length
                  ? currentStep.allowedBlocks
                  : lesson?.availableBlocks}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div style={styles.bottomNav}>
        <button
          onClick={handlePrevStep}
          disabled={isFirstStep}
          style={{
            ...styles.navButton,
            opacity: isFirstStep ? 0.4 : 1,
          }}
        >
          ← Bước trước
        </button>

        <div style={styles.stepDots}>
          {lesson.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentStepIndex(i); setShowHint(false); }}
              style={{
                ...styles.dot,
                ...(completedSteps.includes(lesson.steps[i].id) ? styles.dotComplete : {}),
                ...(i === currentStepIndex ? styles.dotActive : {}),
              }}
            />
          ))}
        </div>

        <button
          onClick={handleStepComplete}
          style={{ ...styles.navButton, ...styles.completeButton }}
        >
          {completedSteps.includes(currentStep?.id || '')
            ? (isLastStep ? '🎉 Hoàn thành!' : 'Tiếp tục →')
            : '✓ Đã xong'}
        </button>
      </div>
    </div>
  </PremiumLockOverlay>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666',
  },
  loadingIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  preLessonContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  preLessonCard: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '560px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '16px',
    padding: 0,
  },
  lessonHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  ageBadge: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 600,
  },
  categoryBadge: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 600,
  },
  lessonTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
  },
  lessonDesc: {
    fontSize: '16px',
    color: '#666',
    lineHeight: 1.6,
    marginBottom: '20px',
  },
  objectivesBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  objectivesTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#444',
    marginBottom: '8px',
  },
  objectivesList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  objectivesItem: {
    fontSize: '14px',
    color: '#555',
    padding: '4px 0',
  },
  metaRow: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    color: '#888',
    marginBottom: '24px',
  },
  startButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  certificateBtn: {
    marginTop: '16px',
    width: '100%',
    padding: '14px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  celebrationIcon: {
    fontSize: '64px',
    display: 'block',
    textAlign: 'center',
    marginBottom: '16px',
  },
  completedSteps: {
    marginBottom: '24px',
  },
  completedStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '14px',
    color: '#555',
  },
  checkIcon: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  // In-lesson styles
  lessonContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  headerBar: {
    backgroundColor: '#263238',
    color: 'white',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerBack: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    opacity: 0.8,
    whiteSpace: 'nowrap',
  },
  lessonInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  lessonName: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  stepCounter: {
    fontSize: '12px',
    opacity: 0.7,
  },
  progressBar: {
    width: '120px',
    height: '6px',
    backgroundColor: '#455a64',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  mainLayout: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  stepSidebar: {
    width: '240px',
    backgroundColor: 'white',
    borderRight: '1px solid #e0e0e0',
    padding: '16px',
    overflowY: 'auto',
  },
  stepsTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: '13px',
    color: '#555',
    transition: 'all 0.15s',
  },
  stepItemActive: {
    backgroundColor: '#e8eaf6',
    color: '#3f51b5',
    fontWeight: 600,
  },
  stepItemComplete: {
    color: '#4CAF50',
  },
  stepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  stepNumberComplete: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  stepTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  stepContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    overflowY: 'auto',
  },
  stepHeader: {
    marginBottom: '16px',
  },
  stepHeading: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  stepDesc: {
    fontSize: '16px',
    color: '#666',
    lineHeight: 1.6,
  },
  hintSection: {
    marginBottom: '16px',
  },
  hintToggle: {
    background: 'none',
    border: 'none',
    color: '#f57c00',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    padding: 0,
  },
  hintBox: {
    marginTop: '8px',
    padding: '12px 16px',
    backgroundColor: '#fff3e0',
    borderRadius: '8px',
    borderLeft: '4px solid #f57c00',
    fontSize: '14px',
    color: '#e65100',
  },
  blocklyArea: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    minHeight: '400px',
  },
  bottomNav: {
    backgroundColor: 'white',
    borderTop: '1px solid #e0e0e0',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#667eea',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  stepDots: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#e0e0e0',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.2s',
  },
  dotActive: {
    backgroundColor: '#667eea',
    transform: 'scale(1.2)',
  },
  dotComplete: {
    backgroundColor: '#4CAF50',
  },
};
