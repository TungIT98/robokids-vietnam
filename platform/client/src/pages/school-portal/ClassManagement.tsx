/**
 * ClassManagement - Class/section management for School Admin Portal
 * Features: Create/edit classes, assign teachers and students, grade level assignment
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './ClassManagement.module.css';

interface ClassItem {
  id: string;
  name: string;
  grade_level: number;
  teacher_id?: string;
  teacher_name?: string;
  academic_year: string;
  max_students: number;
  student_count?: number;
  created_at: string;
}

interface Teacher {
  id: string;
  email: string;
  name?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

export default function ClassManagement() {
  const { user, token } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedClassStudents, setSelectedClassStudents] = useState<Student[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    grade_level: 6,
    teacher_id: '',
    academic_year: new Date().getFullYear().toString(),
    max_students: 30,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadData();
    }
  }, [user?.school_id]);

  const loadData = async () => {
    if (!user?.school_id) return;

    try {
      setIsLoading(true);
      const [classesData, teachersData] = await Promise.all([
        schoolsApi.listClasses(user.school_id, { token }),
        schoolsApi.listTeachers(user.school_id, { token }),
      ]);

      setClasses(classesData.classes || []);

      // Load teachers for form dropdown
      const teacherList: Teacher[] = (teachersData.teachers || []).map((t: any) => ({
        id: t.id,
        email: t.email,
        name: t.name,
      }));
      setTeachers(teacherList);

      // Load student counts per class
      const classesWithCounts = await Promise.all(
        (classesData.classes || []).map(async (cls: any) => {
          try {
            const studentsData = await schoolsApi.listStudents(
              user.school_id!,
              { class_id: cls.id! },
              { token }
            );
            return {
              ...cls,
              student_count: (studentsData.students || []).length,
            };
          } catch {
            return { ...cls, student_count: 0 };
          }
        })
      );
      setClasses(classesWithCounts);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id) return;

    try {
      setIsSaving(true);
      setFormError(null);
      await schoolsApi.createClass(user.school_id, {
        name: formData.name,
        grade_level: formData.grade_level,
        teacher_id: formData.teacher_id || undefined,
        academic_year: formData.academic_year,
        max_students: formData.max_students,
      }, { token });

      setSuccessMessage('Tạo lớp mới thành công!');
      setShowCreateModal(false);
      resetForm();
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Không thể tạo lớp');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id || !selectedClass) return;

    try {
      setIsSaving(true);
      setFormError(null);
      await schoolsApi.updateClass(user.school_id, selectedClass.id, {
        name: formData.name,
        grade_level: formData.grade_level,
        teacher_id: formData.teacher_id || undefined,
        academic_year: formData.academic_year,
        max_students: formData.max_students,
      }, { token });

      setSuccessMessage('Cập nhật lớp thành công!');
      setShowEditModal(false);
      setSelectedClass(null);
      resetForm();
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Không thể cập nhật lớp');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClass = async (cls: ClassItem) => {
    if (!user?.school_id) return;
    if (!confirm(`Bạn có chắc muốn xóa lớp "${cls.name}"?`)) return;

    try {
      await schoolsApi.deleteClass(user.school_id, cls.id, { token });
      setSuccessMessage('Đã xóa lớp!');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Không thể xóa lớp');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleViewStudents = async (cls: ClassItem) => {
    if (!user?.school_id) return;

    try {
      const data = await schoolsApi.listStudents(user.school_id, { class_id: cls.id }, { token });
      setSelectedClassStudents(data.students || []);
      setSelectedClass(cls);
      setShowStudentsModal(true);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách học sinh');
    }
  };

  const openEditModal = (cls: ClassItem) => {
    setSelectedClass(cls);
    setFormData({
      name: cls.name,
      grade_level: cls.grade_level,
      teacher_id: cls.teacher_id || '',
      academic_year: cls.academic_year,
      max_students: cls.max_students,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      grade_level: 6,
      teacher_id: '',
      academic_year: new Date().getFullYear().toString(),
      max_students: 30,
    });
    setFormError(null);
  };

  const getGradeLabel = (grade: number) => {
    const labels: Record<number, string> = {
      1: 'Lớp 1',
      2: 'Lớp 2',
      3: 'Lớp 3',
      4: 'Lớp 4',
      5: 'Lớp 5',
      6: 'Lớp 6',
      7: 'Lớp 7',
      8: 'Lớp 8',
      9: 'Lớp 9',
      10: 'Lớp 10',
      11: 'Lớp 11',
      12: 'Lớp 12',
    };
    return labels[grade] || `Lớp ${grade}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Lớp học</h1>
          <p className={styles.subtitle}>Tạo và quản lý các lớp học trong trường</p>
        </div>
        <button className={styles.addBtn} onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <span className={styles.addIcon}>+</span>
          Tạo lớp mới
        </button>
      </div>

      {successMessage && (
        <div className={styles.successBanner}>{successMessage}</div>
      )}

      {error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      {isLoading ? (
        <div className={styles.loading}>Đang tải...</div>
      ) : classes.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🏫</span>
          <p>Chưa có lớp học nào</p>
          <p className={styles.emptyHint}>Nhấn "Tạo lớp mới" để bắt đầu</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {classes.map(cls => (
            <div key={cls.id} className={styles.classCard}>
              <div className={styles.cardHeader}>
                <span className={styles.gradeBadge}>{getGradeLabel(cls.grade_level)}</span>
                <span className={styles.yearBadge}>{cls.academic_year}</span>
              </div>
              <h3 className={styles.className}>{cls.name}</h3>
              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <span className={styles.statIcon}>👨‍🎓</span>
                  <span>{cls.student_count || 0}/{cls.max_students}</span>
                </div>
                {cls.teacher_name && (
                  <div className={styles.stat}>
                    <span className={styles.statIcon}>👩‍🏫</span>
                    <span>{cls.teacher_name}</span>
                  </div>
                )}
              </div>
              <div className={styles.cardActions}>
                <button className={styles.actionBtn} onClick={() => handleViewStudents(cls)}>
                  👥 Học sinh
                </button>
                <button className={styles.actionBtn} onClick={() => openEditModal(cls)}>
                  ✏️ Sửa
                </button>
                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteClass(cls)}>
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Tạo Lớp mới</h2>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateClass}>
              <div className={styles.formGroup}>
                <label>Tên lớp</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="6A, 7B, v.v..."
                  required
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Khối lớp</label>
                  <select
                    className={styles.select}
                    value={formData.grade_level}
                    onChange={e => setFormData({ ...formData, grade_level: parseInt(e.target.value) })}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                      <option key={g} value={g}>{getGradeLabel(g)}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Năm học</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.academic_year}
                    onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                    placeholder="2025-2026"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Giáo viên chủ nhiệm</label>
                <select
                  className={styles.select}
                  value={formData.teacher_id}
                  onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name || t.email}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Sĩ số tối đa</label>
                <input
                  type="number"
                  className={styles.input}
                  value={formData.max_students}
                  onChange={e => setFormData({ ...formData, max_students: parseInt(e.target.value) })}
                  min="1"
                  max="100"
                />
              </div>
              {formError && <div className={styles.formError}>{formError}</div>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>
                  Hủy
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                  {isSaving ? 'Đang tạo...' : 'Tạo lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && selectedClass && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Sửa Lớp: {selectedClass.name}</h2>
              <button className={styles.closeBtn} onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateClass}>
              <div className={styles.formGroup}>
                <label>Tên lớp</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Khối lớp</label>
                  <select
                    className={styles.select}
                    value={formData.grade_level}
                    onChange={e => setFormData({ ...formData, grade_level: parseInt(e.target.value) })}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                      <option key={g} value={g}>{getGradeLabel(g)}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Năm học</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.academic_year}
                    onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Giáo viên chủ nhiệm</label>
                <select
                  className={styles.select}
                  value={formData.teacher_id}
                  onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name || t.email}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Sĩ số tối đa</label>
                <input
                  type="number"
                  className={styles.input}
                  value={formData.max_students}
                  onChange={e => setFormData({ ...formData, max_students: parseInt(e.target.value) })}
                  min="1"
                  max="100"
                />
              </div>
              {formError && <div className={styles.formError}>{formError}</div>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowEditModal(false)}>
                  Hủy
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Students Modal */}
      {showStudentsModal && selectedClass && (
        <div className={styles.modalOverlay} onClick={() => setShowStudentsModal(false)}>
          <div className={`${styles.modal} ${styles.modalLarge}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Học sinh lớp {selectedClass.name}</h2>
              <button className={styles.closeBtn} onClick={() => setShowStudentsModal(false)}>×</button>
            </div>
            <div className={styles.studentsList}>
              {selectedClassStudents.length === 0 ? (
                <div className={styles.noStudents}>Chưa có học sinh trong lớp này</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Tên</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClassStudents.map((s, idx) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>{s.name}</td>
                        <td>{s.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
