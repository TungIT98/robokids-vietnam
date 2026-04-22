/**
 * TeacherClasses - Teacher's class management page
 * Shows all classes assigned to the teacher with student counts and actions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './TeacherClasses.module.css';

interface ClassItem {
  id: string;
  name: string;
  grade_level: number;
  academic_year: string;
  max_students: number;
  student_count?: number;
  schedule?: string;
}

export default function TeacherClasses() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadClasses();
    }
  }, [user?.school_id, token]);

  const loadClasses = async () => {
    if (!user?.school_id) return;

    try {
      setIsLoading(true);
      const classesData = await schoolsApi.listClasses(user.school_id, { token });

      // Get student counts for each class
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

      // Filter to only classes assigned to this teacher
      const myClasses = classesWithCounts.filter((cls: any) =>
        !cls.teacher_id || cls.teacher_id === user.id
      );

      setClasses(myClasses);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách lớp');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewStudents = (classId: string) => {
    navigate(`/teacher/students?class_id=${classId}`);
  };

  const handleViewProgress = (classId: string) => {
    navigate(`/teacher/progress?class_id=${classId}`);
  };

  const getGradeLabel = (grade: number): string => {
    if (grade <= 2) return 'Mầm non';
    if (grade <= 5) return 'Tiểu học';
    if (grade <= 9) return 'Trung học';
    return 'Phổ thông';
  };

  if (isLoading) {
    return <div className={styles.loading}>Đang tải danh sách lớp...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.classesPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>Lớp học của tôi</h1>
      </div>

      {classes.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏫</div>
          <h2 className={styles.emptyTitle}>Chưa có lớp nào</h2>
          <p className={styles.emptyText}>Bạn chưa được giao lớp học nào. Liên hệ quản lý trường để được phân công.</p>
        </div>
      ) : (
        <div className={styles.classList}>
          {classes.map((cls) => (
            <div key={cls.id} className={styles.classCard}>
              <div className={styles.classHeader}>
                <div className={styles.classInfo}>
                  <h3 className={styles.className}>{cls.name}</h3>
                  <p className={styles.classMeta}>
                    Lớp {cls.grade_level} • {getGradeLabel(cls.grade_level)} • Năm {cls.academic_year}
                  </p>
                </div>
                <span className={styles.classBadge}>
                  {cls.student_count || 0}/{cls.max_students} học sinh
                </span>
              </div>

              <div className={styles.classStats}>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>{cls.student_count || 0}</div>
                  <div className={styles.statLabel}>Học sinh</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>{cls.grade_level}</div>
                  <div className={styles.statLabel}>Khối lớp</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>{cls.max_students - (cls.student_count || 0)}</div>
                  <div className={styles.statLabel}>Còn trống</div>
                </div>
              </div>

              <div className={styles.classActions}>
                <button
                  className={`${styles.actionBtn} ${styles.viewStudentsBtn}`}
                  onClick={() => handleViewStudents(cls.id)}
                >
                  👨‍🎓 Xem học sinh
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.viewProgressBtn}`}
                  onClick={() => handleViewProgress(cls.id)}
                >
                  📈 Tiến độ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}