/**
 * StaffBilling - Platform-wide billing management for RoboKids staff
 * Features: View all school subscriptions, aggregate revenue, invoice management
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './StaffBilling.module.css';

interface SchoolSubscription {
  id: string;
  name: string;
  email: string;
  subscription_plan: string;
  subscription_status: 'active' | 'expired' | 'trial' | 'cancelled';
  max_students: number;
  max_teachers: number;
  student_count?: number;
  teacher_count?: number;
  subscription_end_date?: string;
  monthly_revenue?: number;
}

interface PlatformStats {
  totalSchools: number;
  activeSubscriptions: number;
  trialSchools: number;
  totalStudents: number;
  monthlyRevenue: number;
  expiredSubscriptions: number;
}

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

const PLAN_PRICES: Record<string, number> = {
  basic: 990000,
  standard: 1990000,
  premium: 3990000,
  enterprise: 7990000,
};

export default function StaffBilling() {
  const { token } = useAuth();
  const [schools, setSchools] = useState<SchoolSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'trial'>('all');

  useEffect(() => {
    loadBillingData();
  }, [token]);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);

      // Load all schools (staff can see all)
      const response = await schoolsApi.list({ page: 1, limit: 100 }, { token });

      // Transform to subscription data with student counts
      const schoolsData: SchoolSubscription[] = [];

      for (const school of (response.schools || [])) {
        try {
          // Get student and teacher counts
          const [teachersData, classesData] = await Promise.all([
            schoolsApi.listTeachers(school.id, { token }),
            schoolsApi.listClasses(school.id, { token }),
          ]);

          let studentCount = 0;
          for (const cls of (classesData.classes || [])) {
            const studentsData = await schoolsApi.listStudents(school.id, { class_id: cls.id }, { token });
            studentCount += (studentsData.students || []).length;
          }

          schoolsData.push({
            id: school.id,
            name: school.name,
            email: school.email || '',
            subscription_plan: school.subscription_plan || 'basic',
            subscription_status: school.subscription_status || 'active',
            max_students: school.max_students || 50,
            max_teachers: school.max_teachers || 10,
            student_count: studentCount,
            teacher_count: (teachersData.teachers || []).length,
            subscription_end_date: school.subscription_end_date,
            monthly_revenue: PLAN_PRICES[school.subscription_plan || 'basic'] || 990000,
          });
        } catch {
          // Include school without counts
          schoolsData.push({
            id: school.id,
            name: school.name,
            email: school.email || '',
            subscription_plan: school.subscription_plan || 'basic',
            subscription_status: school.subscription_status || 'active',
            max_students: school.max_students || 50,
            max_teachers: school.max_teachers || 10,
            subscription_end_date: school.subscription_end_date,
            monthly_revenue: PLAN_PRICES[school.subscription_plan || 'basic'] || 990000,
          });
        }
      }

      setSchools(schoolsData);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu hóa đơn');
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo((): PlatformStats => {
    const totalStudents = schools.reduce((sum, s) => sum + (s.student_count || 0), 0);
    return {
      totalSchools: schools.length,
      activeSubscriptions: schools.filter(s => s.subscription_status === 'active').length,
      trialSchools: schools.filter(s => s.subscription_status === 'trial').length,
      expiredSubscriptions: schools.filter(s => s.subscription_status === 'expired').length,
      totalStudents,
      monthlyRevenue: schools.reduce((sum, s) => sum + (s.monthly_revenue || 0), 0),
    };
  }, [schools]);

  const filteredSchools = useMemo(() => {
    if (filter === 'all') return schools;
    return schools.filter(s => s.subscription_status === filter);
  }, [schools, filter]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  if (isLoading) {
    return <div className={styles.loading}>Đang tải dữ liệu hóa đơn...</div>;
  }

  if (error) {
    return <div className={styles.error || styles.loading}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý hóa đơn</h1>
        <div className={styles.headerActions}>
          <button
            className={styles.filterBtn}
            onClick={() => setFilter('all')}
            style={filter === 'all' ? { background: '#159895', color: 'white' } : {}}
          >
            Tất cả ({schools.length})
          </button>
          <button
            className={styles.filterBtn}
            onClick={() => setFilter('active')}
            style={filter === 'active' ? { background: '#159895', color: 'white' } : {}}
          >
            Hoạt động ({stats.activeSubscriptions})
          </button>
          <button
            className={styles.filterBtn}
            onClick={() => setFilter('trial')}
            style={filter === 'trial' ? { background: '#159895', color: 'white' } : {}}
          >
            Dùng thử ({stats.trialSchools})
          </button>
          <button
            className={styles.filterBtn}
            onClick={() => setFilter('expired')}
            style={filter === 'expired' ? { background: '#159895', color: 'white' } : {}}
          >
            Hết hạn ({stats.expiredSubscriptions})
          </button>
        </div>
      </div>

      {/* Platform Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🏫</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.totalSchools}</span>
            <span className={styles.statLabel}>Trường học</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>✅</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.activeSubscriptions}</span>
            <span className={styles.statLabel}>Đang hoạt động</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>👨‍🎓</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.totalStudents}</span>
            <span className={styles.statLabel}>Học sinh</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>💰</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{formatCurrency(stats.monthlyRevenue)}</span>
            <span className={styles.statLabel}>Doanh thu/tháng</span>
          </div>
        </div>
      </div>

      {/* Schools List */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Danh sách trường ({filteredSchools.length})</h2>

        {filteredSchools.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p>Không có trường nào phù hợp</p>
          </div>
        ) : (
          <div className={styles.schoolsList}>
            {filteredSchools.map((school) => (
              <div key={school.id} className={styles.schoolCard}>
                <div className={styles.schoolInfo}>
                  <span className={styles.schoolNameText}>{school.name}</span>
                  <span className={styles.schoolMeta}>
                    {school.email} • {school.subscription_end_date ? `Hết hạn: ${formatDate(school.subscription_end_date)}` : 'Không giới hạn'}
                  </span>
                </div>
                <div className={styles.schoolStats}>
                  <div className={styles.schoolStat}>
                    <span className={styles.schoolStatValue}>{school.student_count || 0}</span>
                    <span className={styles.schoolStatLabel}>Học sinh</span>
                  </div>
                  <div className={styles.schoolStat}>
                    <span className={styles.schoolStatValue}>{school.teacher_count || 0}</span>
                    <span className={styles.schoolStatLabel}>Giáo viên</span>
                  </div>
                  <div className={styles.schoolStat}>
                    <span className={styles.schoolStatValue}>{formatCurrency(school.monthly_revenue || 0)}</span>
                    <span className={styles.schoolStatLabel}>Gói {PLAN_LABELS[school.subscription_plan] || school.subscription_plan}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}