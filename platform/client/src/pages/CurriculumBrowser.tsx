/**
 * CurriculumBrowser - Browse and select lessons by age group
 * Shows all curricula with lesson lists and student progress.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lesson } from '../models/lesson';
import { allCurricula, getCurriculumByAgeGroup } from '../curriculum';
import { useSubscription } from '../hooks/useSubscription';
import { TierIndicator } from '../components/PremiumLockOverlay';

interface ProgressMap {
  [lessonId: string]: {
    status: 'not_started' | 'in_progress' | 'completed';
    completedSteps: number;
    totalSteps: number;
  };
}

const AGE_GROUP_LABELS: Record<string, { title: string; ageRange: string; emoji: string }> = {
  beginner: { title: 'Nhập môn (6-8 tuổi)', ageRange: '6-8 tuổi', emoji: '🌱' },
  intermediate: { title: 'Trung cấp (9-12 tuổi)', ageRange: '9-12 tuổi', emoji: '🌿' },
  advanced: { title: 'Nâng cao (13-16 tuổi)', ageRange: '13-16 tuổi', emoji: '🌳' },
};

const CATEGORY_LABELS: Record<string, string> = {
  movement: 'Di chuyển',
  sensors: 'Cảm biến',
  logic: 'Logic',
  sound: 'Âm thanh',
  creativity: 'Sáng tạo',
  challenges: 'Thử thách',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  basic: '#4CAF50',
  intermediate: '#FF9800',
  advanced: '#f44336',
};

export default function CurriculumBrowser() {
  const navigate = useNavigate();
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('beginner');
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const { canAccessTier } = useSubscription();

  useEffect(() => {
    // Load progress from localStorage for all lessons
    const map: ProgressMap = {};
    for (const curriculum of allCurricula) {
      for (const lesson of curriculum.lessons) {
        const saved = localStorage.getItem(`lesson_progress_${lesson.slug}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            map[lesson.id] = {
              status: parsed.status || 'not_started',
              completedSteps: parsed.completedSteps?.length || 0,
              totalSteps: lesson.steps.length,
            };
          } catch {
            map[lesson.id] = { status: 'not_started', completedSteps: 0, totalSteps: lesson.steps.length };
          }
        } else {
          map[lesson.id] = { status: 'not_started', completedSteps: 0, totalSteps: lesson.steps.length };
        }
      }
    }
    setProgressMap(map);
  }, []);

  const currentCurriculum = getCurriculumByAgeGroup(selectedAgeGroup);

  const handleLessonClick = (lesson: Lesson) => {
    // Check if user can access this lesson
    const requiredTier = lesson.requiredTier || 'sao_hoa';
    if (!canAccessTier(requiredTier)) {
      // Navigate to upgrade page instead
      navigate('/upgrade');
      return;
    }
    navigate(`/lesson/${lesson.slug}`);
  };

  const getLessonProgress = (lessonId: string) => {
    return progressMap[lessonId] || { status: 'not_started', completedSteps: 0, totalSteps: 0 };
  };

  const completedCount = currentCurriculum
    ? currentCurriculum.lessons.filter(l => getLessonProgress(l.id).status === 'completed').length
    : 0;
  const totalCount = currentCurriculum?.lessons.length || 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.pageTitle}>📚 Chương trình học</h1>
          <p style={styles.pageSubtitle}>Chọn bài học phù hợp với độ tuổi của bạn</p>
        </div>
        <div style={styles.overallProgress}>
          <div style={styles.progressText}>
            <span style={styles.progressCount}>{completedCount}/{totalCount}</span>
            <span style={styles.progressLabel}> bài hoàn thành</span>
          </div>
          <div style={styles.progressBar}>
            <div style={{
              ...styles.progressFill,
              width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%',
            }} />
          </div>
        </div>
      </div>

      {/* Age group selector */}
      <div style={styles.ageGroupTabs}>
        {allCurricula.map(curriculum => {
          const groupInfo = AGE_GROUP_LABELS[curriculum.ageGroup] || { title: curriculum.ageGroup, ageRange: '', emoji: '📚' };
          const isSelected = selectedAgeGroup === curriculum.ageGroup;
          return (
            <button
              key={curriculum.ageGroup}
              onClick={() => setSelectedAgeGroup(curriculum.ageGroup)}
              style={{
                ...styles.ageTab,
                ...(isSelected ? styles.ageTabActive : {}),
              }}
            >
              <span style={styles.ageTabEmoji}>{groupInfo.emoji}</span>
              <span style={styles.ageTabTitle}>{groupInfo.title}</span>
              <span style={styles.ageTabMeta}>
                {curriculum.lessons.length} bài học · {curriculum.totalHours}h
              </span>
            </button>
          );
        })}
      </div>

      {/* Curriculum content */}
      {currentCurriculum && (
        <div style={styles.curriculumContent}>
          <div style={styles.curriculumHeader}>
            <div>
              <h2 style={styles.curriculumTitle}>
                {AGE_GROUP_LABELS[currentCurriculum.ageGroup]?.emoji} {currentCurriculum.titleVi}
              </h2>
              <p style={styles.curriculumDesc}>{currentCurriculum.descriptionVi}</p>
            </div>
            <div style={styles.curriculumMeta}>
              <span style={styles.metaItem}>📚 {currentCurriculum.totalLessons} bài</span>
              <span style={styles.metaItem}>⏱ {currentCurriculum.totalHours} giờ</span>
            </div>
          </div>

          {/* Lesson grid */}
          <div style={styles.lessonGrid}>
            {currentCurriculum.lessons.map((lesson, index) => {
              const progress = getLessonProgress(lesson.id);
              const isCompleted = progress.status === 'completed';
              const isInProgress = progress.status === 'in_progress';

              return (
                <button
                  key={lesson.id}
                  onClick={() => handleLessonClick(lesson)}
                  style={{
                    ...styles.lessonCard,
                    ...(isCompleted ? styles.lessonCardCompleted : {}),
                    ...(isInProgress ? styles.lessonCardInProgress : {}),
                  }}
                >
                  {/* Lesson number badge */}
                  <div style={styles.lessonNumber}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  {/* Premium indicator */}
                  {lesson.requiredTier === 'moc_tinh' && (
                    <div style={styles.premiumBadge}>
                      🟠 Mộc Tinh
                    </div>
                  )}

                  {/* Progress indicator */}
                  {isInProgress && (
                    <div style={styles.inProgressBanner}>
                      Đang học
                    </div>
                  )}

                  <div style={styles.lessonCardContent}>
                    <div style={styles.lessonTags}>
                      <span style={{
                        ...styles.categoryTag,
                        backgroundColor: '#e3f2fd',
                        color: '#1565c0',
                      }}>
                        {CATEGORY_LABELS[lesson.category] || lesson.category}
                      </span>
                      <span style={{
                        ...styles.difficultyTag,
                        backgroundColor: DIFFICULTY_COLORS[lesson.difficulty] + '20',
                        color: DIFFICULTY_COLORS[lesson.difficulty],
                      }}>
                        {lesson.difficulty === 'basic' ? 'Dễ' :
                         lesson.difficulty === 'intermediate' ? 'Trung bình' : 'Khó'}
                      </span>
                    </div>

                    <h3 style={styles.lessonTitle}>{lesson.titleVi}</h3>
                    <p style={styles.lessonObjectives}>
                      {lesson.objectivesVi[0] || lesson.objectives[0]}
                    </p>

                    {/* Step progress */}
                    {progress.completedSteps > 0 && (
                      <div style={styles.stepProgress}>
                        <div style={styles.stepProgressBar}>
                          <div style={{
                            ...styles.stepProgressFill,
                            width: `${(progress.completedSteps / progress.totalSteps) * 100}%`,
                          }} />
                        </div>
                        <span style={styles.stepProgressText}>
                          {progress.completedSteps}/{progress.totalSteps} bước
                        </span>
                      </div>
                    )}

                    <div style={styles.lessonFooter}>
                      <span style={styles.lessonMeta}>
                        ⏱ {lesson.estimatedMinutes} phút
                      </span>
                      <span style={styles.lessonMeta}>
                        🔲 {lesson.steps.length} bước
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={styles.lessonArrow}>
                    {isCompleted ? '🔄' : '→'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state if no curriculum */}
      {!currentCurriculum && (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📚</span>
          <h2>Chưa có chương trình cho nhóm tuổi này</h2>
          <p>Nội dung đang được phát triển. Hãy quay lại sau!</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '32px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  headerContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    marginBottom: '4px',
  },
  pageSubtitle: {
    fontSize: '16px',
    opacity: 0.9,
    margin: 0,
  },
  overallProgress: {
    minWidth: '160px',
  },
  progressText: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    marginBottom: '6px',
  },
  progressCount: {
    fontSize: '24px',
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: '14px',
    opacity: 0.9,
  },
  progressBar: {
    height: '8px',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  ageGroupTabs: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0',
    overflowX: 'auto',
  },
  ageTab: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '2px',
    padding: '12px 20px',
    borderRadius: '12px',
    border: '2px solid #e0e0e0',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '160px',
  },
  ageTabActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f0ff',
  },
  ageTabEmoji: {
    fontSize: '24px',
  },
  ageTabTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  ageTabMeta: {
    fontSize: '12px',
    color: '#888',
  },
  curriculumContent: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  curriculumHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  curriculumTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  curriculumDesc: {
    fontSize: '15px',
    color: '#666',
    margin: 0,
  },
  curriculumMeta: {
    display: 'flex',
    gap: '16px',
  },
  metaItem: {
    fontSize: '14px',
    color: '#888',
  },
  lessonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  lessonCard: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '2px solid transparent',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.2s',
    width: '100%',
  },
  lessonCardCompleted: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  lessonCardInProgress: {
    borderColor: '#ff9800',
    backgroundColor: '#fffaf0',
  },
  lessonNumber: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#667eea',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  premiumBadge: {
    position: 'absolute' as const,
    top: '-8px',
    right: '12px',
    backgroundColor: '#f59e0b',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '8px',
  },
  inProgressBanner: {
    position: 'absolute' as const,
    top: '-8px',
    right: '12px',
    backgroundColor: '#ff9800',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '8px',
  },
  lessonCardContent: {
    flex: 1,
    minWidth: 0,
  },
  lessonTags: {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
    flexWrap: 'wrap' as const,
  },
  categoryTag: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '6px',
  },
  difficultyTag: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '6px',
  },
  lessonTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '4px',
  },
  lessonObjectives: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  stepProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  stepProgressBar: {
    flex: 1,
    height: '6px',
    backgroundColor: '#e0e0e0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  stepProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: '3px',
  },
  stepProgressText: {
    fontSize: '11px',
    color: '#888',
    whiteSpace: 'nowrap' as const,
  },
  lessonFooter: {
    display: 'flex',
    gap: '12px',
  },
  lessonMeta: {
    fontSize: '12px',
    color: '#888',
  },
  lessonArrow: {
    fontSize: '20px',
    opacity: 0.4,
    flexShrink: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
};
