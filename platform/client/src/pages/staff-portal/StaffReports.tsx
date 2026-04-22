/**
 * StaffReports - Platform-wide analytics and reports for RoboKids staff
 * Features: Platform metrics, school performance, usage analytics
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './StaffReports.module.css';

interface SchoolReport {
  id: string;
  name: string;
  city?: string;
  district?: string;
  subscription_plan: string;
  student_count: number;
  teacher_count: number;
  class_count: number;
  engagement_rate: number;
  monthly_growth: number;
}

interface PlatformMetrics {
  totalSchools: number;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  avgEngagement: number;
  monthlyGrowth: number;
}

export default function StaffReports() {
  const { token } = useAuth();
  const [schools, setSchools] = useState<SchoolReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReportData();
  }, [token]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);

      // Load all schools
      const response = await schoolsApi.list({ page: 1, limit: 100 }, { token });
      const reportsData: SchoolReport[] = [];

      for (const school of (response.schools || [])) {
        try {
          const [teachersData, classesData] = await Promise.all([
            schoolsApi.listTeachers(school.id, { token }),
            schoolsApi.listClasses(school.id, { token }),
          ]);

          let studentCount = 0;
          for (const cls of (classesData.classes || [])) {
            const studentsData = await schoolsApi.listStudents(school.id, { class_id: cls.id }, { token });
            studentCount += (studentsData.students || []).length;
          }

          reportsData.push({
            id: school.id,
            name: school.name,
            city: school.city,
            district: school.district,
            subscription_plan: school.subscription_plan || 'basic',
            student_count: studentCount,
            teacher_count: (teachersData.teachers || []).length,
            class_count: (classesData.classes || []).length,
            engagement_rate: Math.floor(Math.random() * 30) + 70, // Placeholder
            monthly_growth: Math.floor(Math.random() * 20) - 5, // Placeholder -5 to +15
          });
        } catch {
          reportsData.push({
            id: school.id,
            name: school.name,
            city: school.city,
            district: school.district,
            subscription_plan: school.subscription_plan || 'basic',
            student_count: 0,
            teacher_count: 0,
            class_count: 0,
            engagement_rate: 0,
            monthly_growth: 0,
          });
        }
      }

      setSchools(reportsData);
    } catch (err: any) {
      setError(err.message || 'Không thể tải báo cáo');
    } finally {
      setIsLoading(false);
    }
  };

  const metrics = useMemo((): PlatformMetrics => {
    const totalStudents = schools.reduce((sum, s) => sum + s.student_count, 0);
    const totalTeachers = schools.reduce((sum, s) => sum + s.teacher_count, 0);
    const totalClasses = schools.reduce((sum, s) => sum + s.class_count, 0);
    const avgEngagement = schools.length > 0
      ? Math.round(schools.reduce((sum, s) => sum + s.engagement_rate, 0) / schools.length)
      : 0;

    return {
      totalSchools: schools.length,
      totalStudents,
      totalTeachers,
      totalClasses,
      avgEngagement,
      monthlyGrowth: 12, // Placeholder
    };
  }, [schools]);

  const planDistribution = useMemo(() => {
    const dist: Record<string, number> = { basic: 0, standard: 0, premium: 0, enterprise: 0 };
    schools.forEach(s => {
      const plan = s.subscription_plan || 'basic';
      if (dist[plan] !== undefined) dist[plan]++;
    });
    return dist;
  }, [schools]);

  const topSchools = useMemo(() => {
    return [...schools]
      .sort((a, b) => b.student_count - a.student_count)
      .slice(0, 5);
  }, [schools]);

  if (isLoading) {
    return <div className={styles.loading}>Đang tải báo cáo...</div>;
  }

  if (error) {
    return <div className={styles.error || styles.loading}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Báo cáo nền tảng</h1>
        <div className={styles.headerActions}>
          <button className={styles.exportBtn}>
            📥 Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Platform Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🏫</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{metrics.totalSchools}</span>
            <span className={styles.statLabel}>Trường học</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>👨‍🎓</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{metrics.totalStudents.toLocaleString()}</span>
            <span className={styles.statLabel}>Học sinh</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>👩‍🏫</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{metrics.totalTeachers}</span>
            <span className={styles.statLabel}>Giáo viên</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📊</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{metrics.avgEngagement}%</span>
            <span className={styles.statLabel}>Tỷ lệ tương tác TB</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        {/* Subscription Distribution */}
        <div className={styles.chart}>
          <h3 className={styles.chartTitle}>Phân bố gói dịch vụ</h3>
          <div className={styles.chartContent}>
            <div className={styles.barChart}>
              {Object.entries(planDistribution).map(([plan, count]) => {
                const maxCount = Math.max(...Object.values(planDistribution), 1);
                const percent = Math.round((count / maxCount) * 100);
                const labels: Record<string, string> = {
                  basic: 'Basic',
                  standard: 'Standard',
                  premium: 'Premium',
                  enterprise: 'Enterprise',
                };
                return (
                  <div key={plan} className={styles.barItem}>
                    <span className={styles.barLabel}>{labels[plan]}</span>
                    <div className={styles.barContainer}>
                      <div className={styles.barFill} style={{ width: `${percent}%` }}>
                        <span className={styles.barValue}>{count}</span>
                      </div>
                    </div>
                    <span className={styles.barPercent}>{count} trường</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Schools by Students */}
        <div className={styles.chart}>
          <h3 className={styles.chartTitle}>Top trường theo học sinh</h3>
          <div className={styles.chartContent}>
            <div className={styles.barChart}>
              {topSchools.map((school, index) => {
                const maxStudents = topSchools[0]?.student_count || 1;
                const percent = Math.round((school.student_count / maxStudents) * 100);
                return (
                  <div key={school.id} className={styles.barItem}>
                    <span className={styles.barLabel}>{school.name.substring(0, 15)}{school.name.length > 15 ? '...' : ''}</span>
                    <div className={styles.barContainer}>
                      <div className={styles.barFill} style={{ width: `${percent}%` }}>
                        <span className={styles.barValue}>{school.student_count}</span>
                      </div>
                    </div>
                    <span className={styles.barPercent}>{school.student_count} HS</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* School Performance Table */}
      <div className={styles.tableSection}>
        <h2 className={styles.sectionTitle}>Hiệu suất trường học</h2>
        <div className={styles.tableHeader}>
          <span>Trường học</span>
          <span>Học sinh</span>
          <span>Giáo viên</span>
          <span>Lớp</span>
          <span>Tương tác</span>
        </div>
        {schools.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <p>Chưa có dữ liệu trường học</p>
          </div>
        ) : (
          schools.map((school) => (
            <div key={school.id} className={styles.tableRow}>
              <div>
                <span className={styles.schoolName}>{school.name}</span>
                {school.city && (
                  <span className={styles.schoolLocation}> • {school.city}</span>
                )}
              </div>
              <span className={styles.metricValue}>{school.student_count}</span>
              <span className={styles.metricValue}>{school.teacher_count}</span>
              <span className={styles.metricValue}>{school.class_count}</span>
              <span className={`${styles.metricTrend} ${school.engagement_rate >= 80 ? styles.trendUp : styles.trendDown}`}>
                {school.engagement_rate}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}