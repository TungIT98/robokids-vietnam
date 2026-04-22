/**
 * SchoolAdminDashboard - School Admin portal main dashboard
 * Shows school overview, quick stats, and recent activity
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import { HasPermission } from '../../components/permissions';
import styles from './SchoolAdminDashboard.module.css';

interface SchoolStats {
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
}

export default function SchoolAdminDashboard() {
  const { user, token } = useAuth();
  const [school, setSchool] = useState<Record<string, unknown> | null>(null);
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSchoolData = async () => {
      if (!user?.school_id) {
        setError('Không tìm thấy thông tin trường học');
        setIsLoading(false);
        return;
      }

      try {
        const schoolId = user.school_id;

        // Load school details and stats in parallel
        const [schoolData, teachersData, classesData] = await Promise.all([
          schoolsApi.get(schoolId, { token }),
          schoolsApi.listTeachers(schoolId, { token }),
          schoolsApi.listClasses(schoolId, { token }),
        ]);

        setSchool(schoolData.school);

        // Get student count from classes
        let totalStudents = 0;
        for (const cls of classesData.classes || []) {
          const studentsData = await schoolsApi.listStudents(schoolId, { class_id: cls.id }, { token });
          totalStudents += (studentsData.students || []).length;
        }

        setStats({
          totalTeachers: (teachersData.teachers || []).length,
          totalStudents,
          totalClasses: (classesData.classes || []).length,
          subscriptionPlan: schoolData.school?.subscription_plan || 'basic',
          subscriptionStatus: schoolData.school?.subscription_status || 'active',
        });
      } catch (err: any) {
        setError(err.message || 'Không thể tải dữ liệu trường học');
      } finally {
        setIsLoading(false);
      }
    };

    loadSchoolData();
  }, [user?.school_id, token]);

  if (isLoading) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Xin chào, {user?.full_name || 'Quản trị viên'}</h1>
        <p className={styles.subtitle}>{String(school?.name || 'Trường học')}</p>
      </div>

      {/* Stats cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>👩‍🏫</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats?.totalTeachers || 0}</span>
            <span className={styles.statLabel}>Giáo viên</span>
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
          <span className={styles.statIcon}>🏫</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats?.totalClasses || 0}</span>
            <span className={styles.statLabel}>Lớp học</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📦</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats?.subscriptionPlan || 'basic'}</span>
            <span className={styles.statLabel}>Gói dịch vụ</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Thao tác nhanh</h2>
        <div className={styles.quickActions}>
          <HasPermission permission="teachers:write" hideOnUnauthorized>
            <a href="/school-admin/teachers" className={styles.actionCard}>
              <span className={styles.actionIcon}>➕</span>
              <span className={styles.actionLabel}>Thêm giáo viên</span>
            </a>
          </HasPermission>
          <HasPermission permission="students:write" hideOnUnauthorized>
            <a href="/school-admin/students" className={styles.actionCard}>
              <span className={styles.actionIcon}>📥</span>
              <span className={styles.actionLabel}>Nhập học sinh (CSV)</span>
            </a>
          </HasPermission>
          <HasPermission permission="settings:write" hideOnUnauthorized>
            <a href="/school-admin/classes" className={styles.actionCard}>
              <span className={styles.actionIcon}>🏫</span>
              <span className={styles.actionLabel}>Tạo lớp mới</span>
            </a>
          </HasPermission>
          <HasPermission permission="billing:read" hideOnUnauthorized>
            <a href="/school-admin/billing" className={styles.actionCard}>
              <span className={styles.actionIcon}>💳</span>
              <span className={styles.actionLabel}>Xem hóa đơn</span>
            </a>
          </HasPermission>
        </div>
      </div>
    </div>
  );
}
