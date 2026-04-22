/**
 * ProgressTracking - Student progress view for School Admin Portal
 * Features: Per-student progress dashboard, per-class analytics, export reports
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './ProgressTracking.module.css';

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  class_name?: string;
  grade_level: number;
  lessons_completed: number;
  total_lessons: number;
  badges_earned: number;
  total_badges: number;
  time_spent_minutes: number;
  last_activity?: string;
  completion_rate: number;
}

interface ClassAnalytics {
  id: string;
  name: string;
  grade_level: number;
  total_students: number;
  avg_completion: number;
  avg_time_spent: number;
  most_completed_lesson?: string;
  struggling_lessons: string[];
}

type ViewMode = 'students' | 'classes';

export default function ProgressTracking() {
  const { user, token } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('students');
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [classes, setClasses] = useState<ClassAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classOptions, setClassOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadData();
    }
  }, [user?.school_id]);

  const loadData = async () => {
    if (!user?.school_id) return;

    try {
      setIsLoading(true);

      const [studentsData, classesData] = await Promise.all([
        schoolsApi.listStudents(user.school_id, {}, { token }),
        schoolsApi.listClasses(user.school_id, { token }),
      ]);

      const classList = (classesData.classes || []).map((c: any) => ({
        id: c.id,
        name: c.name,
      }));
      setClassOptions([{ id: 'all', name: 'Tất cả lớp' }, ...classList]);

      // For demo purposes, use mock progress data
      // In production, this would come from a progress/analytics API
      const mockStudents: StudentProgress[] = (studentsData.students || []).map((s: any, idx: number) => ({
        id: s.id,
        name: s.name || s.email,
        email: s.email,
        class_name: classList[idx % classList.length]?.name || 'Chưa phân lớp',
        grade_level: 6 + (idx % 7),
        lessons_completed: Math.floor(Math.random() * 20),
        total_lessons: 30,
        badges_earned: Math.floor(Math.random() * 5),
        total_badges: 10,
        time_spent_minutes: Math.floor(Math.random() * 300) + 30,
        last_activity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        completion_rate: Math.floor(Math.random() * 100),
      }));

      setStudents(mockStudents);

      // Mock class analytics
      const mockClasses: ClassAnalytics[] = classList.filter((c: any) => c.id !== 'all').map((c: any) => ({
        id: c.id,
        name: c.name,
        grade_level: 6,
        total_students: Math.floor(Math.random() * 30) + 10,
        avg_completion: Math.floor(Math.random() * 40) + 50,
        avg_time_spent: Math.floor(Math.random() * 200) + 100,
        most_completed_lesson: 'Di chuyển cơ bản',
        struggling_lessons: ['Vòng lặp', 'Điều kiện'],
      }));

      setClasses(mockClasses);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesClass = selectedClass === 'all' || s.class_name === selectedClass;
    const matchesSearch = !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const handleExport = (type: 'students' | 'classes') => {
    if (type === 'students') {
      const data = filteredStudents.map(s => ({
        'Tên': s.name,
        'Email': s.email,
        'Lớp': s.class_name || 'Chưa phân lớp',
        'Bài hoàn thành': `${s.lessons_completed}/${s.total_lessons}`,
        'Huy hiệu': `${s.badges_earned}/${s.total_badges}`,
        'Thời gian (phút)': s.time_spent_minutes,
        'Tỷ lệ hoàn thành (%)': s.completion_rate,
      }));
      downloadCSV(data, 'student_progress.csv');
    } else {
      const data = classes.map(c => ({
        'Tên lớp': c.name,
        'Khối': c.grade_level,
        'Sĩ số': c.total_students,
        'Hoàn thành TB (%)': c.avg_completion,
        'Thời gian TB (phút)': c.avg_time_spent,
      }));
      downloadCSV(data, 'class_analytics.csv');
    }
  };

  const downloadCSV = (data: Record<string, string | number>[], filename: string) => {
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => String(row[h])).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Chưa hoạt động';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    return `${Math.floor(days / 7)} tuần trước`;
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return '#22c55e';
    if (rate >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Theo dõi Tiến độ</h1>
          <p className={styles.subtitle}>Xem tiến độ học tập của học sinh và lớp học</p>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      {/* View Toggle */}
      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'students' ? styles.toggleActive : ''}`}
          onClick={() => setViewMode('students')}
        >
          👥 Theo học sinh
        </button>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'classes' ? styles.toggleActive : ''}`}
          onClick={() => setViewMode('classes')}
        >
          🏫 Theo lớp học
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Đang tải...</div>
      ) : viewMode === 'students' ? (
        <>
          {/* Filters */}
          <div className={styles.filters}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm kiếm học sinh..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <select
              className={styles.filterSelect}
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
            >
              {classOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button className={styles.exportBtn} onClick={() => handleExport('students')}>
              📥 Xuất CSV
            </button>
          </div>

          {/* Students Grid */}
          {filteredStudents.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📊</span>
              <p>Không có dữ liệu học sinh</p>
            </div>
          ) : (
            <div className={styles.studentsGrid}>
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  className={styles.studentCard}
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className={styles.studentHeader}>
                    <span className={styles.studentName}>{student.name}</span>
                    <span className={styles.lastActivity}>{formatTimeAgo(student.last_activity)}</span>
                  </div>
                  <span className={styles.studentEmail}>{student.email}</span>
                  <span className={styles.studentClass}>{student.class_name}</span>

                  <div className={styles.progressSection}>
                    <div className={styles.progressHeader}>
                      <span>Tiến độ bài học</span>
                      <span>{student.lessons_completed}/{student.total_lessons}</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${(student.lessons_completed / student.total_lessons) * 100}%`,
                          backgroundColor: getProgressColor(student.completion_rate),
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles.statsRow}>
                    <div className={styles.statItem}>
                      <span className={styles.statEmoji}>🏅</span>
                      <span>{student.badges_earned}/{student.total_badges}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statEmoji}>⏱️</span>
                      <span>{student.time_spent_minutes}m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Class Analytics */}
          <div className={styles.filters}>
            <button className={styles.exportBtn} onClick={() => handleExport('classes')}>
              📥 Xuất CSV
            </button>
          </div>

          {classes.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🏫</span>
              <p>Chưa có dữ liệu lớp học</p>
            </div>
          ) : (
            <div className={styles.classesGrid}>
              {classes.map(cls => (
                <div key={cls.id} className={styles.classCard}>
                  <div className={styles.classHeader}>
                    <h3>{cls.name}</h3>
                    <span className={styles.gradeBadge}>Lớp {cls.grade_level}</span>
                  </div>

                  <div className={styles.classStats}>
                    <div className={styles.classStat}>
                      <span className={styles.classStatValue}>{cls.total_students}</span>
                      <span className={styles.classStatLabel}>Học sinh</span>
                    </div>
                    <div className={styles.classStat}>
                      <span className={styles.classStatValue}>{cls.avg_completion}%</span>
                      <span className={styles.classStatLabel}>Hoàn thành TB</span>
                    </div>
                    <div className={styles.classStat}>
                      <span className={styles.classStatValue}>{cls.avg_time_spent}m</span>
                      <span className={styles.classStatLabel}>Thời gian TB</span>
                    </div>
                  </div>

                  {cls.struggling_lessons.length > 0 && (
                    <div className={styles.strugglingSection}>
                      <span className={styles.strugglingTitle}>Cần hỗ trợ thêm:</span>
                      <div className={styles.strugglingBadges}>
                        {cls.struggling_lessons.map((l, i) => (
                          <span key={i} className={styles.strugglingBadge}>{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className={styles.modalOverlay} onClick={() => setSelectedStudent(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{selectedStudent.name}</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedStudent(null)}>×</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email:</span>
                <span>{selectedStudent.email}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Lớp:</span>
                <span>{selectedStudent.class_name}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Bài học:</span>
                <span>{selectedStudent.lessons_completed}/{selectedStudent.total_lessons}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Huy hiệu:</span>
                <span>{selectedStudent.badges_earned}/{selectedStudent.total_badges}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Thời gian học:</span>
                <span>{selectedStudent.time_spent_minutes} phút</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Hoạt động cuối:</span>
                <span>{formatTimeAgo(selectedStudent.last_activity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
