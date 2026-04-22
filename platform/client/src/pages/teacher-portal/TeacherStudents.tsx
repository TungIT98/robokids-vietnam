/**
 * TeacherStudents - Teacher's student list page
 * Shows all students in teacher's classes with filtering and search
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './TeacherStudents.module.css';

interface Student {
  id: string;
  name: string;
  email: string;
  grade_level?: number;
  date_of_birth?: string;
  enrollment_status?: string;
  progress_percent?: number;
  class_id?: string;
  class_name?: string;
}

interface ClassItem {
  id: string;
  name: string;
  grade_level: number;
}

export default function TeacherStudents() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>(searchParams.get('class_id') || '');

  useEffect(() => {
    if (user?.school_id) {
      loadData();
    }
  }, [user?.school_id, token]);

  const loadData = async () => {
    if (!user?.school_id) return;

    try {
      setIsLoading(true);

      // Load classes
      const classesData = await schoolsApi.listClasses(user.school_id, { token });
      const myClasses = (classesData.classes || []).filter((cls: any) =>
        !cls.teacher_id || cls.teacher_id === user.id
      );
      setClasses(myClasses);

      // Load all students from all my classes
      const allStudents: Student[] = [];
      for (const cls of myClasses) {
        try {
          const studentsData = await schoolsApi.listStudents(
            user.school_id!,
            { class_id: cls.id },
            { token }
          );
          for (const student of (studentsData.students || [])) {
            allStudents.push({
              ...student,
              class_id: cls.id,
              class_name: cls.name,
              progress_percent: Math.floor(Math.random() * 100), // Placeholder
            });
          }
        } catch {
          // Skip if can't load students for this class
        }
      }

      setStudents(allStudents);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách học sinh');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    let result = students;

    if (selectedClassId) {
      result = result.filter((s) => s.class_id === selectedClassId);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(term) ||
          s.email?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [students, selectedClassId, searchTerm]);

  if (isLoading) {
    return <div className={styles.loading}>Đang tải danh sách học sinh...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.studentsPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>Học sinh của tôi</h1>
      </div>

      <div className={styles.filterBar}>
        <select
          className={styles.filterSelect}
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          <option value="">Tất cả lớp</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          className={styles.searchInput}
          placeholder="Tìm kiếm học sinh..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredStudents.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👨‍🎓</div>
          <h2 className={styles.emptyTitle}>Không có học sinh</h2>
          <p className={styles.emptyText}>
            {selectedClassId
              ? 'Lớp này chưa có học sinh nào'
              : 'Chưa có học sinh nào được phân vào lớp của bạn'}
          </p>
        </div>
      ) : (
        <div className={styles.studentTable}>
          <div className={styles.tableHeader}>
            <span>Học sinh</span>
            <span>Lớp</span>
            <span>Email</span>
            <span>Trạng thái</span>
            <span>Tiến độ</span>
          </div>

          {filteredStudents.map((student) => (
            <div key={student.id} className={styles.studentRow}>
              <div className={styles.studentInfo}>
                <span className={styles.studentName}>{student.name || student.email}</span>
                {student.date_of_birth && (
                  <span className={styles.studentEmail}>
                    Sinh: {new Date(student.date_of_birth).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '14px', color: '#374151' }}>{student.class_name || '-'}</span>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>{student.email || '-'}</span>
              <span className={`${styles.badge} ${styles.badgeActive}`}>
                {student.enrollment_status || 'active'}
              </span>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${student.progress_percent || 0}%` }}
                />
                <span className={styles.progressText}>{student.progress_percent || 0}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}