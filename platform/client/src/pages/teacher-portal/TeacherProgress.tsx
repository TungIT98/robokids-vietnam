/**
 * TeacherProgress - Teacher's progress tracking page
 * Shows class and student progress with filtering and detailed stats
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './TeacherProgress.module.css';

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  class_id: string;
  class_name: string;
  progress_percent: number;
  lessons_completed: number;
  lessons_total: number;
  last_activity?: string;
}

interface ClassProgress {
  id: string;
  name: string;
  grade_level: number;
  student_count: number;
  avg_progress: number;
  lessons_completed: number;
  lessons_total: number;
  students: StudentProgress[];
}

export default function TeacherProgress() {
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState<ClassProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>(searchParams.get('class_id') || '');

  useEffect(() => {
    if (user?.school_id) {
      loadProgressData();
    }
  }, [user?.school_id, token]);

  const loadProgressData = async () => {
    if (!user?.school_id) return;

    try {
      setIsLoading(true);

      // Load classes
      const classesData = await schoolsApi.listClasses(user.school_id, { token });
      const myClasses = (classesData.classes || []).filter((cls: any) =>
        !cls.teacher_id || cls.teacher_id === user.id
      );

      // Load students and progress for each class
      const classesWithProgress: ClassProgress[] = [];

      for (const cls of myClasses) {
        try {
          const studentsData = await schoolsApi.listStudents(
            user.school_id!,
            { class_id: cls.id },
            { token }
          );

          const students: StudentProgress[] = (studentsData.students || []).map((s: any, index: number) => ({
            id: s.id,
            name: s.name || s.email,
            email: s.email,
            class_id: cls.id,
            class_name: cls.name,
            progress_percent: Math.floor(Math.random() * 40) + 60, // Placeholder - 60-100%
            lessons_completed: Math.floor(Math.random() * 10) + 2,
            lessons_total: 20,
            last_activity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          }));

          const avgProgress = students.length > 0
            ? Math.round(students.reduce((sum, s) => sum + s.progress_percent, 0) / students.length)
            : 0;

          classesWithProgress.push({
            id: cls.id,
            name: cls.name,
            grade_level: cls.grade_level,
            student_count: students.length,
            avg_progress: avgProgress,
            lessons_completed: Math.floor(Math.random() * 15) + 5,
            lessons_total: 20,
            students,
          });
        } catch {
          // Skip if can't load
        }
      }

      setClasses(classesWithProgress);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu tiến độ');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClasses = useMemo(() => {
    if (!selectedClassId) return classes;
    return classes.filter((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  const overallStats = useMemo(() => {
    const totalStudents = classes.reduce((sum, c) => sum + c.student_count, 0);
    const totalLessonsCompleted = classes.reduce((sum, c) => sum + c.lessons_completed, 0);
    const avgProgress = classes.length > 0
      ? Math.round(classes.reduce((sum, c) => sum + c.avg_progress, 0) / classes.length)
      : 0;

    return {
      totalStudents,
      totalClasses: classes.length,
      totalLessonsCompleted,
      avgProgress,
    };
  }, [classes]);

  if (isLoading) {
    return <div className={styles.loading}>Đang tải dữ liệu tiến độ...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.progressPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tiến độ học tập</h1>
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
      </div>

      {/* Overall Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>👨‍🎓</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{overallStats.totalStudents}</span>
            <span className={styles.statLabel}>Tổng học sinh</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🏫</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{overallStats.totalClasses}</span>
            <span className={styles.statLabel}>Lớp học</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>✅</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{overallStats.totalLessonsCompleted}</span>
            <span className={styles.statLabel}>Bài hoàn thành</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📊</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{overallStats.avgProgress}%</span>
            <span className={styles.statLabel}>Tiến độ TB</span>
          </div>
        </div>
      </div>

      {/* Class Progress */}
      {filteredClasses.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📈</div>
          <h2 className={styles.emptyTitle}>Chưa có dữ liệu</h2>
          <p className={styles.emptyText}>Chưa có dữ liệu tiến độ cho lớp của bạn</p>
        </div>
      ) : (
        <div className={styles.classProgress}>
          {filteredClasses.map((cls) => (
            <div key={cls.id} className={styles.classCard}>
              <div className={styles.classHeader}>
                <div>
                  <h3 className={styles.className}>{cls.name}</h3>
                  <span className={styles.classMeta}>
                    Lớp {cls.grade_level} • {cls.student_count} học sinh
                  </span>
                </div>
              </div>

              <div className={styles.progressStats}>
                <div className={styles.progressStat}>
                  <div className={styles.progressStatValue}>{cls.student_count}</div>
                  <div className={styles.progressStatLabel}>Học sinh</div>
                </div>
                <div className={styles.progressStat}>
                  <div className={styles.progressStatValue}>{cls.avg_progress}%</div>
                  <div className={styles.progressStatLabel}>Tiến độ TB</div>
                </div>
                <div className={styles.progressStat}>
                  <div className={styles.progressStatValue}>{cls.lessons_completed}</div>
                  <div className={styles.progressStatLabel}>Bài hoàn thành</div>
                </div>
                <div className={styles.progressStat}>
                  <div className={styles.progressStatValue}>{cls.lessons_total}</div>
                  <div className={styles.progressStatLabel}>Tổng bài</div>
                </div>
              </div>

              <div className={styles.progressBar}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${cls.avg_progress}%` }}
                />
              </div>

              {cls.students.length > 0 && (
                <div className={styles.studentList}>
                  {cls.students.slice(0, 5).map((student) => (
                    <div key={student.id} className={styles.studentRow}>
                      <div className={styles.studentInfo}>
                        <span className={styles.studentName}>{student.name}</span>
                        <span className={styles.studentClass}>
                          {student.lessons_completed}/{student.lessons_total} bài
                        </span>
                      </div>
                      <div className={styles.studentProgress}>
                        <div className={styles.studentProgressBar}>
                          <div
                            className={styles.studentProgressFill}
                            style={{ width: `${student.progress_percent}%` }}
                          />
                        </div>
                        <span className={styles.studentProgressText}>
                          {student.progress_percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}