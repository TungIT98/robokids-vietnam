/**
 * CurriculumBuilder - Drag & Drop Course Creator for Teachers
 * Allows teachers to create custom curricula with modules and lessons
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pocketbase, isPocketBaseConfigured } from '../../services/pocketbase';
import { Lesson } from '../../services/curriculumApi';
import styles from './CurriculumBuilder.module.css';

// Types
interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  orderIndex: number;
}

interface ClassInfo {
  id: string;
  name: string;
  studentCount: number;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  classId?: string;
}

interface Curriculum {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  ageRange: string;
  estimatedHours: number;
  tags: string[];
  status: 'draft' | 'published';
  modules: Module[];
  // Assignment fields
  assignedTo: 'individual' | 'class' | 'school' | null;
  assignedClassIds: string[];
  assignedStudentIds: string[];
  startDate: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AvailableLesson {
  id: string;
  slug: string;
  title: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  ageGroup: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
}

// API functions
const curriculumApi = {
  // Fetch all curricula for the teacher
  getCurricula: async (): Promise<Curriculum[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const result = await pocketbase.collection('curricula').getList(1, 100, {
          sort: '-updatedAt',
        });
        return result.items.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || '',
          thumbnail: item.thumbnail || '',
          ageRange: item.age_range || '',
          estimatedHours: item.estimated_hours || 0,
          tags: item.tags || [],
          status: item.status || 'draft',
          modules: item.modules || [],
          assignedTo: item.assigned_to || null,
          assignedClassIds: item.assigned_class_ids || [],
          assignedStudentIds: item.assigned_student_ids || [],
          startDate: item.start_date || null,
          deadline: item.deadline || null,
          createdAt: item.created,
          updatedAt: item.updated,
        }));
      } catch (e) {
        console.warn('Failed to fetch curricula:', e);
        return [];
      }
    }
    return [];
  },

  // Fetch all available lessons
  getAvailableLessons: async (): Promise<AvailableLesson[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const result = await pocketbase.collection('lessons').getList(1, 500, {
          sort: '+order_index',
        });
        return result.items.map((item: any) => ({
          id: item.id,
          slug: item.slug,
          title: item.title_vi || item.title,
          titleVi: item.title_vi || '',
          titleEn: item.title_en || '',
          descriptionVi: item.description_vi || '',
          descriptionEn: item.description_en || '',
          ageGroup: item.age_group || '',
          category: item.category || '',
          difficulty: item.difficulty || 'beginner',
          estimatedMinutes: item.estimated_minutes || 30,
        }));
      } catch (e) {
        console.warn('Failed to fetch lessons:', e);
        return [];
      }
    }
    return [];
  },

  // Save curriculum
  saveCurriculum: async (curriculum: Partial<Curriculum>): Promise<Curriculum> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const data: any = {
        title: curriculum.title,
        description: curriculum.description || '',
        thumbnail: curriculum.thumbnail || '',
        age_range: curriculum.ageRange || '',
        estimated_hours: curriculum.estimatedHours || 0,
        tags: curriculum.tags || [],
        status: curriculum.status || 'draft',
        modules: curriculum.modules || [],
        assigned_to: curriculum.assignedTo || null,
        assigned_class_ids: curriculum.assignedClassIds || [],
        assigned_student_ids: curriculum.assignedStudentIds || [],
        start_date: curriculum.startDate || null,
        deadline: curriculum.deadline || null,
      };

      if (curriculum.id) {
        // Update existing
        const updated = await pocketbase.collection('curricula').update(curriculum.id, data);
        return {
          ...curriculum,
          id: updated.id,
          updatedAt: updated.updated,
        } as Curriculum;
      } else {
        // Create new
        const created = await pocketbase.collection('curricula').create(data);
        return {
          ...curriculum,
          id: created.id,
          createdAt: created.created,
          updatedAt: created.updated,
        } as Curriculum;
      }
    }
    throw new Error('PocketBase not configured');
  },

  // Delete curriculum
  deleteCurriculum: async (id: string): Promise<void> => {
    if (isPocketBaseConfigured() && pocketbase) {
      await pocketbase.collection('curricula').delete(id);
    }
  },

  // Fetch classes for assignment
  getClasses: async (): Promise<ClassInfo[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const result = await pocketbase.collection('classes').getList(1, 100);
        return result.items.map((item: any) => ({
          id: item.id,
          name: item.name || item.title || 'Unnamed Class',
          studentCount: item.student_count || 0,
        }));
      } catch (e) {
        console.warn('Failed to fetch classes:', e);
        return [];
      }
    }
    return [];
  },

  // Fetch students for assignment
  getStudents: async (): Promise<StudentInfo[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const result = await pocketbase.collection('users').getList(1, 500, {
          filter: "role='student'",
        });
        return result.items.map((item: any) => ({
          id: item.id,
          name: item.name || item.email || 'Unknown',
          email: item.email || '',
          classId: item.class_id || '',
        }));
      } catch (e) {
        console.warn('Failed to fetch students:', e);
        return [];
      }
    }
    return [];
  },

  // Assign curriculum to targets
  assignCurriculum: async (
    curriculumId: string,
    assignment: {
      assignedTo: 'individual' | 'class' | 'school';
      assignedClassIds: string[];
      assignedStudentIds: string[];
      startDate: string | null;
      deadline: string | null;
    }
  ): Promise<void> => {
    if (isPocketBaseConfigured() && pocketbase) {
      await pocketbase.collection('curricula').update(curriculumId, {
        assigned_to: assignment.assignedTo,
        assigned_class_ids: assignment.assignedClassIds,
        assigned_student_ids: assignment.assignedStudentIds,
        start_date: assignment.startDate,
        deadline: assignment.deadline,
      });
    }
  },
};

// Initial empty curriculum
const createEmptyCurriculum = (): Partial<Curriculum> => ({
  title: '',
  description: '',
  thumbnail: '',
  ageRange: '',
  estimatedHours: 0,
  tags: [],
  status: 'draft',
  modules: [],
  assignedTo: null,
  assignedClassIds: [],
  assignedStudentIds: [],
  startDate: null,
  deadline: null,
});

export default function CurriculumBuilder() {
  const navigate = useNavigate();
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [availableLessons, setAvailableLessons] = useState<AvailableLesson[]>([]);
  const [currentCurriculum, setCurrentCurriculum] = useState<Partial<Curriculum>>(createEmptyCurriculum());
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'builder'>('list');
  const [lessonFilter, setLessonFilter] = useState({ category: '', difficulty: '', search: '' });
  const [draggedLesson, setDraggedLesson] = useState<AvailableLesson | null>(null);
  const [draggedModuleIndex, setDraggedModuleIndex] = useState<number | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState<'individual' | 'class' | 'school'>('class');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loadedCurricula, loadedLessons] = await Promise.all([
        curriculumApi.getCurricula(),
        curriculumApi.getAvailableLessons(),
      ]);
      setCurricula(loadedCurricula);
      setAvailableLessons(loadedLessons);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter available lessons
  const filteredLessons = availableLessons.filter(lesson => {
    if (lessonFilter.category && lesson.category !== lessonFilter.category) return false;
    if (lessonFilter.difficulty && lesson.difficulty !== lessonFilter.difficulty) return false;
    if (lessonFilter.search) {
      const search = lessonFilter.search.toLowerCase();
      return (
        lesson.title.toLowerCase().includes(search) ||
        lesson.titleVi.toLowerCase().includes(search) ||
        lesson.descriptionVi.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Create new curriculum
  const handleNewCurriculum = () => {
    setCurrentCurriculum(createEmptyCurriculum());
    setIsEditing(true);
    setActiveTab('builder');
  };

  // Edit existing curriculum
  const handleEditCurriculum = (curriculum: Curriculum) => {
    setCurrentCurriculum({ ...curriculum });
    setIsEditing(true);
    setActiveTab('builder');
  };

  // Save curriculum
  const handleSave = async () => {
    if (!currentCurriculum.title?.trim()) {
      alert('Vui lòng nhập tên giáo trình');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await curriculumApi.saveCurriculum(currentCurriculum);
      setCurrentCurriculum(saved);

      if (!currentCurriculum.id) {
        setCurricula(prev => [saved as Curriculum, ...prev]);
      } else {
        setCurricula(prev =>
          prev.map(c => (c.id === saved.id ? { ...c, ...saved } : c))
        );
      }

      setIsEditing(false);
      setActiveTab('list');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Lỗi khi lưu giáo trình');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete curriculum
  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa giáo trình này?')) return;

    try {
      await curriculumApi.deleteCurriculum(id);
      setCurricula(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  // Duplicate curriculum
  const handleDuplicate = (curriculum: Curriculum) => {
    const duplicated: Partial<Curriculum> = {
      ...curriculum,
      id: undefined,
      title: `${curriculum.title} (Bản sao)`,
      status: 'draft',
      modules: curriculum.modules.map(m => ({ ...m, id: crypto.randomUUID() })),
    };
    setCurrentCurriculum(duplicated);
    setIsEditing(true);
    setActiveTab('builder');
  };

  // Add module
  const handleAddModule = () => {
    const newModule: Module = {
      id: crypto.randomUUID(),
      title: `Module ${(currentCurriculum.modules?.length || 0) + 1}`,
      description: '',
      lessons: [],
      orderIndex: currentCurriculum.modules?.length || 0,
    };
    setCurrentCurriculum(prev => ({
      ...prev,
      modules: [...(prev.modules || []), newModule],
    }));
  };

  // Update module
  const handleUpdateModule = (moduleId: string, updates: Partial<Module>) => {
    setCurrentCurriculum(prev => ({
      ...prev,
      modules: prev.modules?.map(m =>
        m.id === moduleId ? { ...m, ...updates } : m
      ),
    }));
  };

  // Delete module
  const handleDeleteModule = (moduleId: string) => {
    setCurrentCurriculum(prev => ({
      ...prev,
      modules: prev.modules?.filter(m => m.id !== moduleId),
    }));
  };

  // Drag and drop handlers for modules
  const handleModuleDragStart = (index: number) => {
    setDraggedModuleIndex(index);
  };

  const handleModuleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedModuleIndex === null || draggedModuleIndex === targetIndex) return;

    setCurrentCurriculum(prev => {
      const modules = [...(prev.modules || [])];
      const [removed] = modules.splice(draggedModuleIndex, 1);
      modules.splice(targetIndex, 0, removed);
      return { ...prev, modules };
    });
    setDraggedModuleIndex(targetIndex);
  };

  const handleModuleDragEnd = () => {
    setDraggedModuleIndex(null);
  };

  // Drag lesson from available panel
  const handleLessonDragStart = (lesson: AvailableLesson) => {
    setDraggedLesson(lesson);
  };

  const handleLessonDragEnd = () => {
    setDraggedLesson(null);
  };

  // Drop lesson into module
  const handleLessonDrop = (e: React.DragEvent, moduleId: string) => {
    e.preventDefault();
    if (!draggedLesson) return;

    const lessonAsLesson: Lesson = {
      id: draggedLesson.id,
      slug: draggedLesson.slug,
      title: draggedLesson.title,
      titleVi: draggedLesson.titleVi,
      titleEn: draggedLesson.titleEn,
      descriptionVi: draggedLesson.descriptionVi,
      descriptionEn: draggedLesson.descriptionEn,
      ageGroup: draggedLesson.ageGroup,
      category: draggedLesson.category,
      difficulty: draggedLesson.difficulty,
      estimatedMinutes: draggedLesson.estimatedMinutes,
      orderIndex: 0,
      nextLessonSlug: null,
      previousLessonSlug: null,
      tags: [],
      objectives: [],
      steps: [],
    };

    setCurrentCurriculum(prev => ({
      ...prev,
      modules: prev.modules?.map(m =>
        m.id === moduleId
          ? { ...m, lessons: [...m.lessons, { ...lessonAsLesson, orderIndex: m.lessons.length }] }
          : m
      ),
    }));
    setDraggedLesson(null);
  };

  // Remove lesson from module
  const handleRemoveLesson = (moduleId: string, lessonId: string) => {
    setCurrentCurriculum(prev => ({
      ...prev,
      modules: prev.modules?.map(m =>
        m.id === moduleId
          ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }
          : m
      ),
    }));
  };

  // Reorder lessons within module
  const handleLessonReorder = (moduleId: string, fromIndex: number, toIndex: number) => {
    setCurrentCurriculum(prev => ({
      ...prev,
      modules: prev.modules?.map(m => {
        if (m.id !== moduleId) return m;
        const lessons = [...m.lessons];
        const [removed] = lessons.splice(fromIndex, 1);
        lessons.splice(toIndex, 0, removed);
        return { ...m, lessons };
      }),
    }));
  };

  // Load assignment data (classes and students)
  const loadAssignmentData = async () => {
    setIsLoadingAssignments(true);
    try {
      const [loadedClasses, loadedStudents] = await Promise.all([
        curriculumApi.getClasses(),
        curriculumApi.getStudents(),
      ]);
      setClasses(loadedClasses);
      setStudents(loadedStudents);
    } catch (error) {
      console.error('Failed to load assignment data:', error);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  // Open assignment modal
  const handleOpenAssignModal = () => {
    // Initialize from current curriculum
    setAssignmentTarget(currentCurriculum.assignedTo || 'class');
    setSelectedClassIds(currentCurriculum.assignedClassIds || []);
    setSelectedStudentIds(currentCurriculum.assignedStudentIds || []);
    setShowAssignModal(true);
    loadAssignmentData();
  };

  // Save assignment
  const handleAssign = async () => {
    if (!currentCurriculum.id) {
      alert('Vui lòng lưu giáo trình trước khi giao bài');
      return;
    }

    try {
      await curriculumApi.assignCurriculum(currentCurriculum.id, {
        assignedTo: assignmentTarget,
        assignedClassIds: selectedClassIds,
        assignedStudentIds: selectedStudentIds,
        startDate: currentCurriculum.startDate,
        deadline: currentCurriculum.deadline,
      });

      setCurrentCurriculum(prev => ({
        ...prev,
        assignedTo: assignmentTarget,
        assignedClassIds: selectedClassIds,
        assignedStudentIds: selectedStudentIds,
      }));

      setShowAssignModal(false);
      alert('Giao bài thành công!');
    } catch (error) {
      console.error('Failed to assign curriculum:', error);
      alert('Lỗi khi giao bài');
    }
  };

  // Assign and publish
  const handleAssignAndPublish = async () => {
    if (!currentCurriculum.id) {
      alert('Vui lòng lưu giáo trình trước');
      return;
    }

    try {
      await curriculumApi.assignCurriculum(currentCurriculum.id, {
        assignedTo: assignmentTarget,
        assignedClassIds: selectedClassIds,
        assignedStudentIds: selectedStudentIds,
        startDate: currentCurriculum.startDate,
        deadline: currentCurriculum.deadline,
      });

      setCurrentCurriculum(prev => ({
        ...prev,
        status: 'published',
        assignedTo: assignmentTarget,
        assignedClassIds: selectedClassIds,
        assignedStudentIds: selectedStudentIds,
      }));

      await curriculumApi.saveCurriculum(currentCurriculum);
      setShowAssignModal(false);
      alert('Xuất bản và giao bài thành công!');
    } catch (error) {
      console.error('Failed to publish and assign:', error);
      alert('Lỗi khi xuất bản và giao bài');
    }
  };

  // Publish curriculum
  const handlePublish = () => {
    if (!currentCurriculum.id) {
      // If not saved yet, just save as published
      setCurrentCurriculum(prev => ({ ...prev, status: 'published' }));
      setTimeout(handleSave, 0);
    } else {
      // Open assignment modal before publishing
      handleOpenAssignModal();
    }
  };

  const categories = [...new Set(availableLessons.map(l => l.category).filter(Boolean))];
  const difficulties = [...new Set(availableLessons.map(l => l.difficulty).filter(Boolean))];

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>📚 Xây Dựng Giáo Trình</h1>
          <p className={styles.subtitle}>Tạo và quản lý giáo trình tùy chỉnh cho học sinh</p>
        </div>
        {activeTab === 'list' && (
          <button className={styles.primaryBtn} onClick={handleNewCurriculum}>
            ➕ Tạo Giáo Trình Mới
          </button>
        )}
      </header>

      {activeTab === 'list' && (
        <div className={styles.curriculumList}>
          {curricula.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📖</span>
              <h3>Chưa có giáo trình nào</h3>
              <p>Tạo giáo trình đầu tiên để bắt đầu</p>
              <button className={styles.primaryBtn} onClick={handleNewCurriculum}>
                ➕ Tạo Giáo Trình Mới
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {curricula.map(curriculum => (
                <div key={curriculum.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={`${styles.statusBadge} ${styles[curriculum.status]}`}>
                      {curriculum.status === 'published' ? '✅ Đã xuất bản' : '📝 Bản nháp'}
                    </span>
                  </div>
                  <h3 className={styles.cardTitle}>{curriculum.title}</h3>
                  <p className={styles.cardDesc}>
                    {curriculum.description || 'Không có mô tả'}
                  </p>
                  <div className={styles.cardMeta}>
                    <span>📦 {curriculum.modules?.length || 0} modules</span>
                    <span>⏱️ ~{curriculum.estimatedHours}h</span>
                    <span>👶 {curriculum.ageRange || 'Mọi lứa tuổi'}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.editBtn}
                      onClick={() => handleEditCurriculum(curriculum)}
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      className={styles.duplicateBtn}
                      onClick={() => handleDuplicate(curriculum)}
                    >
                      📋 Sao chép
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(curriculum.id)}
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'builder' && (
        <div className={styles.builder}>
          {/* Left Panel - Available Lessons */}
          <aside className={styles.lessonPanel}>
            <h3 className={styles.panelTitle}>📚 Bài Học Có Sẵn</h3>

            <div className={styles.filters}>
              <input
                type="text"
                placeholder="🔍 Tìm kiếm..."
                value={lessonFilter.search}
                onChange={e => setLessonFilter(prev => ({ ...prev, search: e.target.value }))}
                className={styles.searchInput}
              />
              <select
                value={lessonFilter.category}
                onChange={e => setLessonFilter(prev => ({ ...prev, category: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={lessonFilter.difficulty}
                onChange={e => setLessonFilter(prev => ({ ...prev, difficulty: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="">Tất cả độ khó</option>
                {difficulties.map(diff => (
                  <option key={diff} value={diff}>{diff}</option>
                ))}
              </select>
            </div>

            <div className={styles.lessonList}>
              {filteredLessons.map(lesson => (
                <div
                  key={lesson.id}
                  className={styles.lessonItem}
                  draggable
                  onDragStart={() => handleLessonDragStart(lesson)}
                  onDragEnd={handleLessonDragEnd}
                >
                  <div className={styles.lessonDragHandle}>⋮⋮</div>
                  <div className={styles.lessonInfo}>
                    <span className={styles.lessonTitle}>{lesson.title}</span>
                    <span className={styles.lessonMeta}>
                      {lesson.category} • {lesson.difficulty} • {lesson.estimatedMinutes}p
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Center Panel - Curriculum Structure */}
          <main className={styles.builderMain}>
            <div className={styles.curriculumHeader}>
              <input
                type="text"
                placeholder="📝 Tên giáo trình..."
                value={currentCurriculum.title || ''}
                onChange={e => setCurrentCurriculum(prev => ({ ...prev, title: e.target.value }))}
                className={styles.titleInput}
              />
              <textarea
                placeholder="Mô tả giáo trình..."
                value={currentCurriculum.description || ''}
                onChange={e => setCurrentCurriculum(prev => ({ ...prev, description: e.target.value }))}
                className={styles.descInput}
                rows={2}
              />
            </div>

            <div className={styles.metadata}>
              <div className={styles.metaField}>
                <label>👶 Độ tuổi:</label>
                <input
                  type="text"
                  placeholder="VD: 6-8 tuổi"
                  value={currentCurriculum.ageRange || ''}
                  onChange={e => setCurrentCurriculum(prev => ({ ...prev, ageRange: e.target.value }))}
                />
              </div>
              <div className={styles.metaField}>
                <label>⏱️ Giờ ước tính:</label>
                <input
                  type="number"
                  min="0"
                  placeholder="VD: 10"
                  value={currentCurriculum.estimatedHours || ''}
                  onChange={e => setCurrentCurriculum(prev => ({ ...prev, estimatedHours: Number(e.target.value) }))}
                />
              </div>
              <div className={styles.metaField}>
                <label>🏷️ Tags:</label>
                <input
                  type="text"
                  placeholder="VD: robot, lập trình, STEM"
                  value={currentCurriculum.tags?.join(', ') || ''}
                  onChange={e => setCurrentCurriculum(prev => ({
                    ...prev,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  }))}
                />
              </div>
            </div>

            <div className={styles.modulesSection}>
              <div className={styles.modulesHeader}>
                <h3>📦 Modules ({currentCurriculum.modules?.length || 0})</h3>
                <button className={styles.addModuleBtn} onClick={handleAddModule}>
                  ➕ Thêm Module
                </button>
              </div>

              <div className={styles.modulesList}>
                {currentCurriculum.modules?.map((module, moduleIndex) => (
                  <div
                    key={module.id}
                    className={`${styles.moduleCard} ${draggedModuleIndex === moduleIndex ? styles.dragging : ''}`}
                    draggable
                    onDragStart={() => handleModuleDragStart(moduleIndex)}
                    onDragOver={e => handleModuleDragOver(e, moduleIndex)}
                    onDragEnd={handleModuleDragEnd}
                    onDrop={e => {
                      e.preventDefault();
                      if (draggedLesson) handleLessonDrop(e, module.id);
                    }}
                  >
                    <div className={styles.moduleHeader}>
                      <div className={styles.moduleDragHandle}>⋮⋮</div>
                      <input
                        type="text"
                        value={module.title}
                        onChange={e => handleUpdateModule(module.id, { title: e.target.value })}
                        className={styles.moduleTitleInput}
                        placeholder="Tên module..."
                      />
                      <button
                        className={styles.moduleDeleteBtn}
                        onClick={() => handleDeleteModule(module.id)}
                      >
                        🗑️
                      </button>
                    </div>

                    <textarea
                      placeholder="Mô tả module..."
                      value={module.description}
                      onChange={e => handleUpdateModule(module.id, { description: e.target.value })}
                      className={styles.moduleDescInput}
                      rows={2}
                    />

                    <div className={styles.moduleLessons}>
                      {module.lessons.length === 0 ? (
                        <div className={styles.dropZone}>
                          <span>📥 Kéo bài học vào đây</span>
                        </div>
                      ) : (
                        module.lessons.map((lesson, lessonIndex) => (
                          <div key={lesson.id} className={styles.moduleLessonItem}>
                            <span className={styles.lessonOrder}>{lessonIndex + 1}</span>
                            <span className={styles.moduleLessonTitle}>{lesson.title}</span>
                            <span className={styles.moduleLessonDuration}>{lesson.estimatedMinutes}p</span>
                            <button
                              className={styles.removeLessonBtn}
                              onClick={() => handleRemoveLesson(module.id, lesson.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}

                {(!currentCurriculum.modules || currentCurriculum.modules.length === 0) && (
                  <div className={styles.emptyModules}>
                    <span>📦</span>
                    <p>Chưa có module nào</p>
                    <button className={styles.addModuleBtn} onClick={handleAddModule}>
                      ➕ Thêm Module Đầu Tiên
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Right Panel - Actions */}
          <aside className={styles.actionPanel}>
            <h3 className={styles.panelTitle}>⚙️ Hành Động</h3>

            <div className={styles.actionButtons}>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? '⏳ Đang lưu...' : '💾 Lưu Nháp'}
              </button>

              <button
                className={styles.publishBtn}
                onClick={handlePublish}
                disabled={isSaving}
              >
                🚀 Xuất Bản
              </button>

              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setIsEditing(false);
                  setActiveTab('list');
                  setCurrentCurriculum(createEmptyCurriculum());
                }}
              >
                ↩️ Quay Lại
              </button>
            </div>

            <div className={styles.previewSection}>
              <h4>📊 Thông Tin Giáo Trình</h4>
              <div className={styles.previewStats}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Modules:</span>
                  <span className={styles.statValue}>{currentCurriculum.modules?.length || 0}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Bài học:</span>
                  <span className={styles.statValue}>
                    {currentCurriculum.modules?.reduce((sum, m) => sum + m.lessons.length, 0) || 0}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Tổng thời gian:</span>
                  <span className={styles.statValue}>
                    {currentCurriculum.modules?.reduce((sum, m) =>
                      sum + m.lessons.reduce((s, l) => s + (l.estimatedMinutes || 0), 0), 0
                    ) || 0}p
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.helpSection}>
              <h4>💡 Hướng Dẫn</h4>
              <ul>
                <li>Kéo thả modules để sắp xếp thứ tự</li>
                <li>Kéo bài học từ panel bên trái vào module</li>
                <li>Nhấn ✕ để xóa bài học khỏi module</li>
                <li>Lưu nháp trước khi xuất bản</li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>📋 Giao Giáo Trình</h2>
              <button className={styles.modalCloseBtn} onClick={() => setShowAssignModal(false)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.assignSection}>
                <h4>🎯 Giao cho:</h4>
                <div className={styles.assignTargetOptions}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="assignTarget"
                      value="class"
                      checked={assignmentTarget === 'class'}
                      onChange={() => setAssignmentTarget('class')}
                    />
                    <span>Lớp học</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="assignTarget"
                      value="individual"
                      checked={assignmentTarget === 'individual'}
                      onChange={() => setAssignmentTarget('individual')}
                    />
                    <span>Học sinh cụ thể</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="assignTarget"
                      value="school"
                      checked={assignmentTarget === 'school'}
                      onChange={() => setAssignmentTarget('school')}
                    />
                    <span>Toàn trường</span>
                  </label>
                </div>
              </div>

              {assignmentTarget === 'class' && (
                <div className={styles.assignSection}>
                  <h4>🏫 Chọn lớp:</h4>
                  {isLoadingAssignments ? (
                    <p>Đang tải...</p>
                  ) : classes.length === 0 ? (
                    <p className={styles.noData}>Chưa có lớp học nào</p>
                  ) : (
                    <div className={styles.classList}>
                      {classes.map(cls => (
                        <label key={cls.id} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={selectedClassIds.includes(cls.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedClassIds(prev => [...prev, cls.id]);
                              } else {
                                setSelectedClassIds(prev => prev.filter(id => id !== cls.id));
                              }
                            }}
                          />
                          <span>{cls.name}</span>
                          <span className={styles.studentCount}>({cls.studentCount} học sinh)</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {assignmentTarget === 'individual' && (
                <div className={styles.assignSection}>
                  <h4>👤 Chọn học sinh:</h4>
                  {isLoadingAssignments ? (
                    <p>Đang tải...</p>
                  ) : students.length === 0 ? (
                    <p className={styles.noData}>Chưa có học sinh nào</p>
                  ) : (
                    <div className={styles.studentList}>
                      {students.map(student => (
                        <label key={student.id} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedStudentIds(prev => [...prev, student.id]);
                              } else {
                                setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                              }
                            }}
                          />
                          <span>{student.name}</span>
                          <span className={styles.studentEmail}>{student.email}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {assignmentTarget === 'school' && (
                <div className={styles.assignSection}>
                  <p className={styles.schoolNote}>📚 Giáo trình sẽ được giao cho tất cả học sinh trong trường.</p>
                </div>
              )}

              <div className={styles.assignSection}>
                <h4>📅 Thời hạn:</h4>
                <div className={styles.dateInputs}>
                  <div className={styles.dateField}>
                    <label>Ngày bắt đầu:</label>
                    <input
                      type="date"
                      value={currentCurriculum.startDate || ''}
                      onChange={e => setCurrentCurriculum(prev => ({ ...prev, startDate: e.target.value || null }))}
                    />
                  </div>
                  <div className={styles.dateField}>
                    <label>Ngày hết hạn:</label>
                    <input
                      type="date"
                      value={currentCurriculum.deadline || ''}
                      onChange={e => setCurrentCurriculum(prev => ({ ...prev, deadline: e.target.value || null }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowAssignModal(false)}>
                Hủy
              </button>
              <button className={styles.saveBtn} onClick={handleAssign}>
                💾 Lưu Phân Công
              </button>
              <button className={styles.publishBtn} onClick={handleAssignAndPublish}>
                🚀 Xuất Bản & Giao
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
