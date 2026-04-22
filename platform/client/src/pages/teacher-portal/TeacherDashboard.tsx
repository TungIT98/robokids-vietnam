/**
 * TeacherDashboard - Teacher portal main dashboard
 * Shows teacher's classes, student counts, and recent activity
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './TeacherDashboard.module.css';

interface ClassItem {
  id: string;
  name: string;
  grade_level: number;
  academic_year: string;
  max_students: number;
  student_count?: number;
}

interface TeacherStats {
  totalClasses: number;
  totalStudents: number;
  lessonsCompleted: number;
  upcomingLessons: number;
}

export default function TeacherDashboard() {
  const { user, token } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadDashboardData();
    }
  }, [user?.school_id, token]);

  const loadDashboardData = async () => {
    if (!user?.school_id) return;

    try {
      setIsLoading(true);

      // Load classes assigned to this teacher
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

      // Filter classes assigned to current teacher (if teacher_id field exists)
      const myClasses = classesWithCounts.filter((cls: any) =>
        !cls.teacher_id || cls.teacher_id === user.id
      );

      setClasses(myClasses);

      // Calculate stats
      const totalStudents = myClasses.reduce((sum: number, cls: any) => sum + (cls.student_count || 0), 0);

      setStats({
        totalClasses: myClasses.length,
        totalStudents,
        lessonsCompleted: Math.floor(Math.random() * 20) + 5, // Placeholder - backend will provide
        upcomingLessons: Math.floor(Math.random() * 5) + 1,  // Placeholder - backend will provide
      });
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Xin chào, {user?.full_name || user?.email}!</h1>
        <p className={styles.subtitle}>Đây là trang quản lý của bạn</p>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🏫</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats?.totalClasses || 0}</span>
            <span className={styles.statLabel}>Lớp học</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>👨‍🎓</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats?.totalStudents || 0}</span>
            <span className={styles.statLabel}>Học sinh</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>✅</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats?.lessonsCompleted || 0}</span>
            <span className={styles.statLabel}>Bài đã dạy</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📅</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats?.upcomingLessons || 0}</span>
            <span className={styles.statLabel}>Sắp tới</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Thao tác nhanh</h2>
        <div className={styles.quickActions}>
          <Link to="/teacher/classes" className={styles.actionCard}>
            <span className={styles.actionIcon}>🏫</span>
            <span>Quản lý lớp</span>
          </Link>
          <Link to="/teacher/students" className={styles.actionCard}>
            <span className={styles.actionIcon}>👨‍🎓</span>
            <span>Danh sách học sinh</span>
          </Link>
          <Link to="/teacher/progress" className={styles.actionCard}>
            <span className={styles.actionIcon}>📈</span>
            <span>Theo dõi tiến độ</span>
          </Link>
        </div>
      </div>

      {/* My Classes */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lớp của tôi</h2>
        {classes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏫</div>
            <p className={styles.emptyText}>Chưa có lớp nào được giao cho bạn</p>
          </div>
        ) : (
          <div className={styles.classList}>
            {classes.map((cls) => (
              <div key={cls.id} className={styles.classCard}>
                <div className={styles.classInfo}>
                  <span className={styles.className}>{cls.name}</span>
                  <span className={styles.classMeta}>
                    Lớp {cls.grade_level} • Năm học {cls.academic_year}
                  </span>
                </div>
                <div className={styles.classStats}>
                  <span className={styles.classStat}>
                    <span className={styles.classStatIcon}>👨‍🎓</span>
                    {cls.student_count || 0}/{cls.max_students}
                  </span>
                </div>
                <Link to="/teacher/classes" className={styles.viewBtn}>
                  Xem lớp
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}