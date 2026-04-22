/**
 * LessonManagementPage - Educator UI for managing lessons
 * Features: CRUD, drag-drop reordering, preview, age-group filtering
 */

import { useState, useEffect } from 'react';
import { curriculumApi, Lesson } from '../services/curriculumApi';

const AGE_GROUPS = ['beginner', 'intermediate', 'advanced'];
const AGE_GROUP_LABELS: Record<string, { label: string; emoji: string }> = {
  beginner: { label: 'Nhập môn (6-8)', emoji: '🌱' },
  intermediate: { label: 'Trung cấp (9-12)', emoji: '🌿' },
  advanced: { label: 'Nâng cao (13-16)', emoji: '🌳' },
};
const CATEGORIES = ['movement', 'sensors', 'logic', 'sound', 'creativity', 'challenges'];
const CATEGORY_LABELS: Record<string, string> = {
  movement: 'Di chuyển',
  sensors: 'Cảm biến',
  logic: 'Logic',
  sound: 'Âm thanh',
  creativity: 'Sáng tạo',
  challenges: 'Thử thách',
};
const DIFFICULTIES = ['basic', 'intermediate', 'advanced'];
const DIFFICULTY_LABELS: Record<string, string> = {
  basic: 'Dễ',
  intermediate: 'Trung bình',
  advanced: 'Khó',
};

interface DragState {
  draggingId: string | null;
  overId: string | null;
}

export default function LessonManagementPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [ageGroup, setAgeGroup] = useState<string>('beginner');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Edit modal state
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Preview modal state
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  // Drag state
  const [dragState, setDragState] = useState<DragState>({ draggingId: null, overId: null });

  useEffect(() => {
    loadLessons();
  }, [ageGroup]);

  const loadLessons = async () => {
    setIsLoading(true);
    try {
      const response = await curriculumApi.getCurriculum(ageGroup);
      setLessons(response.lessons || []);
    } catch (err) {
      showNotification('error', 'Không thể tải danh sách bài học');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter lessons
  const filteredLessons = lessons.filter(lesson => {
    if (filterCategory && lesson.category !== filterCategory) return false;
    if (filterDifficulty && lesson.difficulty !== filterDifficulty) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        lesson.titleVi?.toLowerCase().includes(q) ||
        lesson.titleEn?.toLowerCase().includes(q) ||
        lesson.descriptionVi?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Drag handlers for reordering
  const handleDragStart = (e: React.DragEvent, lessonId: string) => {
    setDragState({ draggingId: lessonId, overId: null });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, lessonId: string) => {
    e.preventDefault();
    if (dragState.draggingId !== lessonId) {
      setDragState(prev => ({ ...prev, overId: lessonId }));
    }
  };

  const handleDragLeave = () => {
    setDragState(prev => ({ ...prev, overId: null }));
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = dragState.draggingId;
    if (!draggedId || draggedId === targetId) {
      setDragState({ draggingId: null, overId: null });
      return;
    }

    // Reorder lessons
    const draggedIndex = filteredLessons.findIndex(l => l.id === draggedId);
    const targetIndex = filteredLessons.findIndex(l => l.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newLessons = [...filteredLessons];
    const [draggedLesson] = newLessons.splice(draggedIndex, 1);
    newLessons.splice(targetIndex, 0, draggedLesson);

    // Update orderIndex for all affected lessons
    const reorderedLessons = newLessons.map((l, idx) => ({
      ...l,
      orderIndex: idx,
    }));

    setLessons(prev => prev.map(l => {
      const reordered = reorderedLessons.find(r => r.id === l.id);
      return reordered ? { ...l, orderIndex: reordered.orderIndex } : l;
    }));

    setSaving(true);
    try {
      await curriculumApi.updateLessonOrder(
        reorderedLessons.map((l, idx) => ({ id: l.id, orderIndex: idx }))
      );
      showNotification('success', 'Đã cập nhật thứ tự bài học');
    } catch {
      showNotification('error', 'Không thể lưu thứ tự');
      loadLessons(); // Reload on error
    } finally {
      setSaving(false);
      setDragState({ draggingId: null, overId: null });
    }
  };

  const handleDeleteLesson = async (lesson: Lesson) => {
    if (!confirm(`Xóa bài học "${lesson.titleVi}"?`)) return;
    setSaving(true);
    try {
      await curriculumApi.deleteLesson(lesson.id);
      setLessons(prev => prev.filter(l => l.id !== lesson.id));
      showNotification('success', 'Đã xóa bài học');
    } catch {
      showNotification('error', 'Không thể xóa bài học');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLesson = async (lessonData: Partial<Lesson>) => {
    setSaving(true);
    try {
      if (isCreating) {
        const newLesson = await curriculumApi.createLesson({
          ...lessonData,
          ageGroup,
          orderIndex: lessons.length,
        } as any);
        setLessons(prev => [...prev, newLesson]);
        showNotification('success', 'Đã tạo bài học mới');
      } else if (editLesson) {
        const updated = await curriculumApi.updateLesson(editLesson.id, lessonData);
        setLessons(prev => prev.map(l => l.id === editLesson.id ? updated : l));
        showNotification('success', 'Đã cập nhật bài học');
      }
      setEditLesson(null);
      setIsCreating(false);
    } catch {
      showNotification('error', 'Không thể lưu bài học');
    } finally {
      setSaving(false);
    }
  };

  const openCreateLesson = () => {
    setIsCreating(true);
    setEditLesson({
      id: '',
      slug: '',
      title: '',
      titleVi: '',
      titleEn: '',
      descriptionVi: '',
      descriptionEn: '',
      ageGroup,
      category: 'movement',
      difficulty: 'basic',
      estimatedMinutes: 20,
      orderIndex: lessons.length,
      nextLessonSlug: null,
      previousLessonSlug: null,
      tags: [],
      objectives: [],
      steps: [],
    });
  };

  const openEditLesson = (lesson: Lesson) => {
    setIsCreating(false);
    setEditLesson({ ...lesson });
  };

  return (
    <div style={styles.container}>
      {/* Notification */}
      {notification && (
        <div style={{
          ...styles.notification,
          backgroundColor: notification.type === 'success' ? '#4ade80' : '#f87171',
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>🎓 Quản lý Bài học</h1>
          <p style={styles.pageSubtitle}>Tạo, chỉnh sửa và sắp xếp bài học cho học sinh</p>
        </div>
        <button style={styles.createButton} onClick={openCreateLesson} disabled={saving}>
          + Thêm bài học mới
        </button>
      </div>

      {/* Age Group Filter */}
      <div style={styles.filterSection}>
        <div style={styles.ageGroupTabs}>
          {AGE_GROUPS.map(ag => (
            <button
              key={ag}
              onClick={() => setAgeGroup(ag)}
              style={{
                ...styles.ageTab,
                ...(ageGroup === ag ? styles.ageTabActive : {}),
              }}
            >
              {AGE_GROUP_LABELS[ag].emoji} {AGE_GROUP_LABELS[ag].label}
            </button>
          ))}
        </div>

        {/* Category & Difficulty Filters */}
        <div style={styles.filterRow}>
          <select
            style={styles.filterSelect}
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          <select
            style={styles.filterSelect}
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
          >
            <option value="">Tất cả độ khó</option>
            {DIFFICULTIES.map(diff => (
              <option key={diff} value={diff}>{DIFFICULTY_LABELS[diff]}</option>
            ))}
          </select>
          <input
            style={styles.searchInput}
            placeholder="Tìm kiếm bài học..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Lesson List */}
      {isLoading ? (
        <div style={styles.loadingState}>Đang tải...</div>
      ) : filteredLessons.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📚</span>
          <p>Chưa có bài học nào cho nhóm tuổi này</p>
          <button style={styles.createButton} onClick={openCreateLesson}>
            Tạo bài học đầu tiên
          </button>
        </div>
      ) : (
        <div style={styles.lessonList}>
          {filteredLessons.map((lesson, index) => (
            <div
              key={lesson.id}
              draggable
              onDragStart={e => handleDragStart(e, lesson.id)}
              onDragOver={e => handleDragOver(e, lesson.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, lesson.id)}
              style={{
                ...styles.lessonRow,
                ...(dragState.draggingId === lesson.id ? styles.lessonRowDragging : {}),
                ...(dragState.overId === lesson.id ? styles.lessonRowOver : {}),
              }}
            >
              {/* Drag Handle */}
              <div style={styles.dragHandle} title="Kéo để sắp xếp">
                ⋮⋮
              </div>

              {/* Order Number */}
              <div style={styles.orderNum}>{index + 1}</div>

              {/* Lesson Info */}
              <div style={styles.lessonInfo}>
                <div style={styles.lessonTitle}>{lesson.titleVi}</div>
                <div style={styles.lessonMeta}>
                  {CATEGORY_LABELS[lesson.category] || lesson.category} · {lesson.estimatedMinutes} phút ·{' '}
                  <span style={{
                    ...styles.difficultyBadge,
                    color: lesson.difficulty === 'basic' ? '#4CAF50' : lesson.difficulty === 'intermediate' ? '#FF9800' : '#f44336',
                  }}>
                    {DIFFICULTY_LABELS[lesson.difficulty]}
                  </span>
                </div>
              </div>

              {/* Steps count */}
              <div style={styles.stepsCount}>
                📋 {lesson.steps.length} bước
              </div>

              {/* Actions */}
              <div style={styles.actions}>
                <button
                  style={styles.actionButton}
                  onClick={() => setPreviewLesson(lesson)}
                  title="Xem trước"
                >
                  👁
                </button>
                <button
                  style={styles.actionButton}
                  onClick={() => openEditLesson(lesson)}
                  title="Chỉnh sửa"
                >
                  ✏️
                </button>
                <button
                  style={{ ...styles.actionButton, color: '#f87171' }}
                  onClick={() => handleDeleteLesson(lesson)}
                  title="Xóa"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {editLesson && (
        <LessonEditModal
          lesson={editLesson}
          isCreating={isCreating}
          saving={saving}
          onSave={handleSaveLesson}
          onClose={() => { setEditLesson(null); setIsCreating(false); }}
        />
      )}

      {/* Preview Modal */}
      {previewLesson && (
        <LessonPreviewModal
          lesson={previewLesson}
          onClose={() => setPreviewLesson(null)}
        />
      )}
    </div>
  );
}

// Edit/Create Modal Component
interface LessonEditModalProps {
  lesson: Partial<Lesson>;
  isCreating: boolean;
  saving: boolean;
  onSave: (data: Partial<Lesson>) => void;
  onClose: () => void;
}

function LessonEditModal({ lesson, isCreating, saving, onSave, onClose }: LessonEditModalProps) {
  const [formData, setFormData] = useState(lesson);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>
            {isCreating ? '🎓 Tạo bài học mới' : '✏️ Chỉnh sửa bài học'}
          </h2>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={styles.modalBody}>
          <div style={styles.formRow}>
            <label style={styles.label}>Tiêu đề (VI)</label>
            <input
              style={styles.input}
              value={formData.titleVi || ''}
              onChange={e => setFormData(prev => ({ ...prev, titleVi: e.target.value }))}
              required
            />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Tiêu đề (EN)</label>
            <input
              style={styles.input}
              value={formData.titleEn || ''}
              onChange={e => setFormData(prev => ({ ...prev, titleEn: e.target.value }))}
            />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Mô tả (VI)</label>
            <textarea
              style={{ ...styles.input, minHeight: '80px' }}
              value={formData.descriptionVi || ''}
              onChange={e => setFormData(prev => ({ ...prev, descriptionVi: e.target.value }))}
            />
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Danh mục</label>
            <select
              style={styles.input}
              value={formData.category || 'movement'}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Độ khó</label>
            <select
              style={styles.input}
              value={formData.difficulty || 'basic'}
              onChange={e => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
            >
              {DIFFICULTIES.map(diff => (
                <option key={diff} value={diff}>{DIFFICULTY_LABELS[diff]}</option>
              ))}
            </select>
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Thời lượng (phút)</label>
            <input
              style={styles.input}
              type="number"
              min="5"
              max="120"
              value={formData.estimatedMinutes || 20}
              onChange={e => setFormData(prev => ({ ...prev, estimatedMinutes: parseInt(e.target.value) }))}
            />
          </div>
          <div style={styles.modalFooter}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              Hủy
            </button>
            <button type="submit" style={styles.saveButton} disabled={saving}>
              {saving ? 'Đang lưu...' : isCreating ? 'Tạo bài học' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Preview Modal Component
interface LessonPreviewModalProps {
  lesson: Lesson;
  onClose: () => void;
}

function LessonPreviewModal({ lesson, onClose }: LessonPreviewModalProps) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.previewModal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>👁 Xem trước: {lesson.titleVi}</h2>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div style={styles.previewBody}>
          {/* Lesson header */}
          <div style={styles.previewHeader}>
            <span style={styles.previewBadge}>
              {CATEGORY_LABELS[lesson.category] || lesson.category}
            </span>
            <span style={{
              ...styles.previewBadge,
              color: lesson.difficulty === 'basic' ? '#4CAF50' : lesson.difficulty === 'intermediate' ? '#FF9800' : '#f44336',
            }}>
              {DIFFICULTY_LABELS[lesson.difficulty]}
            </span>
            <span style={styles.previewBadge}>⏱ {lesson.estimatedMinutes} phút</span>
          </div>

          <h3 style={styles.previewSectionTitle}>Mô tả</h3>
          <p style={styles.previewDesc}>{lesson.descriptionVi || lesson.descriptionEn || 'Không có mô tả'}</p>

          {lesson.objectives && lesson.objectives.length > 0 && (
            <>
              <h3 style={styles.previewSectionTitle}>Mục tiêu bài học</h3>
              <ul style={styles.objectiveList}>
                {lesson.objectives.map((obj, i) => (
                  <li key={obj.id || i} style={styles.objectiveItem}>
                    ✓ {obj.textVi || obj.textEn}
                  </li>
                ))}
              </ul>
            </>
          )}

          {lesson.steps && lesson.steps.length > 0 && (
            <>
              <h3 style={styles.previewSectionTitle}>Các bước ({lesson.steps.length})</h3>
              <div style={styles.stepsList}>
                {lesson.steps.slice(0, 3).map((step, i) => (
                  <div key={step.id || i} style={styles.stepPreview}>
                    <div style={styles.stepNum}>Bước {i + 1}</div>
                    <div style={styles.stepTitle}>{step.titleVi || step.title}</div>
                    <div style={styles.stepDesc}>{step.descriptionVi || step.descriptionEn}</div>
                  </div>
                ))}
                {lesson.steps.length > 3 && (
                  <p style={styles.moreSteps}>... và {lesson.steps.length - 3} bước nữa</p>
                )}
              </div>
            </>
          )}
        </div>
        <div style={styles.modalFooter}>
          <button style={styles.cancelButton} onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f0f23',
    color: '#e4e4e7',
    padding: '24px',
  },
  notification: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 600,
    zIndex: 1000,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    color: '#ffffff',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#a1a1aa',
    margin: '4px 0 0',
  },
  createButton: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  filterSection: {
    marginBottom: '24px',
  },
  ageGroupTabs: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  ageTab: {
    backgroundColor: '#1e1e3f',
    border: '2px solid transparent',
    borderRadius: '12px',
    padding: '10px 20px',
    color: '#a1a1aa',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  ageTabActive: {
    borderColor: '#8b5cf6',
    color: '#ffffff',
    backgroundColor: '#2d2d5a',
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  filterSelect: {
    backgroundColor: '#1e1e3f',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#e4e4e7',
    fontSize: '14px',
    minWidth: '150px',
  },
  searchInput: {
    backgroundColor: '#1e1e3f',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#e4e4e7',
    fontSize: '14px',
    flex: 1,
    minWidth: '200px',
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px',
    color: '#71717a',
    fontSize: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: '#1e1e3f',
    borderRadius: '16px',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  lessonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  lessonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    padding: '12px 16px',
    border: '2px solid transparent',
    transition: 'all 0.2s',
    cursor: 'grab',
  },
  lessonRowDragging: {
    opacity: 0.5,
    transform: 'scale(0.98)',
  },
  lessonRowOver: {
    borderColor: '#8b5cf6',
    backgroundColor: '#2d2d5a',
  },
  dragHandle: {
    color: '#52525b',
    fontSize: '16px',
    cursor: 'grab',
    padding: '0 4px',
  },
  orderNum: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#8b5cf6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  lessonInfo: {
    flex: 1,
    minWidth: 0,
  },
  lessonTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#fafafa',
    marginBottom: '2px',
  },
  lessonMeta: {
    fontSize: '12px',
    color: '#71717a',
  },
  difficultyBadge: {
    fontWeight: 600,
  },
  stepsCount: {
    fontSize: '13px',
    color: '#a1a1aa',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#1e1e3f',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  previewModal: {
    backgroundColor: '#1e1e3f',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #3f3f5a',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    color: '#ffffff',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: '#71717a',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
  },
  modalBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #3f3f5a',
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#a1a1aa',
  },
  input: {
    backgroundColor: '#0f0f23',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#e4e4e7',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  cancelButton: {
    backgroundColor: '#3f3f5a',
    color: '#e4e4e7',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  saveButton: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Preview styles
  previewBody: {
    padding: '20px',
  },
  previewHeader: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginBottom: '16px',
  },
  previewBadge: {
    backgroundColor: '#2d2d5a',
    color: '#a1a1aa',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
  },
  previewSectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: '8px',
    marginTop: '16px',
  },
  previewDesc: {
    fontSize: '14px',
    color: '#a1a1aa',
    margin: 0,
    lineHeight: 1.6,
  },
  objectiveList: {
    margin: 0,
    paddingLeft: '20px',
  },
  objectiveItem: {
    fontSize: '14px',
    color: '#a1a1aa',
    marginBottom: '4px',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  stepPreview: {
    backgroundColor: '#0f0f23',
    borderRadius: '10px',
    padding: '12px',
  },
  stepNum: {
    fontSize: '11px',
    color: '#8b5cf6',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  stepTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fafafa',
    marginBottom: '4px',
  },
  stepDesc: {
    fontSize: '13px',
    color: '#71717a',
  },
  moreSteps: {
    fontSize: '13px',
    color: '#71717a',
    textAlign: 'center',
    margin: '8px 0 0',
  },
};
