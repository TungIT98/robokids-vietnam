/**
 * TeacherMonitoring - Real-time Student Activity View
 * Shows a grid of student activity cards with live updates
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { pocketbase, isPocketBaseConfigured } from '../../services/pocketbase';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './TeacherMonitoring.module.css';

interface StudentActivity {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string;
  className: string;
  currentLessonId: string | null;
  currentLessonTitle: string | null;
  progressPercent: number;
  lastActivityAt: string | null;
  status: 'online' | 'idle' | 'offline' | 'coding';
  totalLessonsCompleted: number;
  totalTimeSpentMinutes: number;
}

interface ClassItem {
  id: string;
  name: string;
  grade_level: number;
}

const POLLING_INTERVAL = 30000; // 30 seconds

export default function TeacherMonitoring() {
  const { user, token } = useAuth();
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch classes for filter
  const fetchClasses = useCallback(async () => {
    if (!user?.school_id) return;

    try {
      const classesData = await schoolsApi.listClasses(user.school_id, { token });
      const classList = (classesData.classes || []).map((c: any) => ({
        id: c.id,
        name: c.name || c.title || 'Unnamed Class',
        grade_level: c.grade_level || 0,
      }));
      setClasses(classList);
    } catch (err) {
      console.warn('Failed to fetch classes:', err);
    }
  }, [user?.school_id, token]);

  // Fetch student activities
  const fetchActivities = useCallback(async () => {
    if (!user?.school_id) return;

    setIsPolling(true);
    try {
      let studentsData: any[] = [];

      if (isPocketBaseConfigured() && pocketbase) {
        // Use PocketBase
        try {
          let filter = "role='student'";
          if (selectedClassId !== 'all') {
            filter += ` && class_id='${selectedClassId}'`;
          }

          const result = await pocketbase.collection('users').getList(1, 100, {
            filter,
          });

          studentsData = result.items;
        } catch (e) {
          console.warn('PocketBase fetch failed, trying REST API:', e);
          // Fallback to REST API
          const restData = await schoolsApi.listStudents(
            user.school_id!,
            { class_id: selectedClassId !== 'all' ? selectedClassId : undefined },
            { token }
          );
          studentsData = restData.students || [];
        }
      } else {
        // Use REST API
        const restData = await schoolsApi.listStudents(
          user.school_id!,
          { class_id: selectedClassId !== 'all' ? selectedClassId : undefined },
          { token }
        );
        studentsData = restData.students || [];
      }

      // Fetch lesson progress for each student
      const activitiesWithProgress = await Promise.all(
        studentsData.map(async (student: any) => {
          let progress = {
            currentLessonId: null,
            currentLessonTitle: null,
            progressPercent: 0,
            lastActivityAt: null,
            totalLessonsCompleted: 0,
            totalTimeSpentMinutes: 0,
          };

          if (isPocketBaseConfigured() && pocketbase) {
            try {
              // Get latest lesson progress
              const progressResult = await pocketbase.collection('lesson_progress').getList(1, 1, {
                filter: `user_id='${student.id}'`,
                sort: '-updated',
              });

              if (progressResult.items.length > 0) {
                const latestProgress = progressResult.items[0];
                progress = {
                  currentLessonId: latestProgress.lesson_id || null,
                  currentLessonTitle: latestProgress.expand?.lesson_id?.title_vi || 'Bài học',
                  progressPercent: latestProgress.completed ? 100 : Math.round((latestProgress.completed_steps?.length || 0) * 20),
                  lastActivityAt: latestProgress.updated || null,
                  totalLessonsCompleted: latestProgress.completed ? 1 : 0,
                  totalTimeSpentMinutes: Math.round((latestProgress.time_spent_seconds || 0) / 60),
                };
              }

              // Get all completed lessons count
              const completedResult = await pocketbase.collection('lesson_progress').getList(1, 100, {
                filter: `user_id='${student.id}' && completed=true`,
              });
              progress.totalLessonsCompleted = completedResult.totalItems;

              // Get total time spent
              let totalTime = 0;
              completedResult.items.forEach((p: any) => {
                totalTime += p.time_spent_seconds || 0;
              });
              progress.totalTimeSpentMinutes = Math.round(totalTime / 60);

            } catch (e) {
              console.warn('Failed to fetch progress for student:', student.id, e);
            }
          }

          // Determine status based on last activity
          let status: StudentActivity['status'] = 'offline';
          if (progress.lastActivityAt) {
            const lastActivity = new Date(progress.lastActivityAt);
            const now = new Date();
            const diffMs = now.getTime() - lastActivity.getTime();
            const diffMins = diffMs / 60000;

            if (diffMins < 2) {
              status = 'online';
            } else if (diffMins < 15) {
              status = 'coding';
            } else {
              status = 'idle';
            }
          }

          return {
            id: student.id,
            studentId: student.id,
            studentName: student.name || student.email || 'Unknown',
            studentEmail: student.email || '',
            classId: student.class_id || '',
            className: student.class_name || 'Chưa gán lớp',
            currentLessonId: progress.currentLessonId,
            currentLessonTitle: progress.currentLessonTitle,
            progressPercent: progress.progressPercent,
            lastActivityAt: progress.lastActivityAt,
            status,
            totalLessonsCompleted: progress.totalLessonsCompleted,
            totalTimeSpentMinutes: progress.totalTimeSpentMinutes,
          } as StudentActivity;
        })
      );

      setActivities(activitiesWithProgress);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch activities:', err);
      setError(err.message || 'Không thể tải dữ liệu hoạt động');
    } finally {
      setIsPolling(false);
    }
  }, [user?.school_id, token, selectedClassId]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchClasses(), fetchActivities()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchClasses, fetchActivities]);

  // Polling setup
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActivities();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchActivities]);

  // Format relative time
  const formatRelativeTime = (dateStr: string | null): string => {
    if (!dateStr) return 'Chưa có hoạt động';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // Get status color
  const getStatusColor = (status: StudentActivity['status']): string => {
    switch (status) {
      case 'online': return '#10b981';
      case 'coding': return '#3b82f6';
      case 'idle': return '#f59e0b';
      case 'offline': return '#94a3b8';
    }
  };

  // Get status text
  const getStatusText = (status: StudentActivity['status']): string => {
    switch (status) {
      case 'online': return 'Đang trực tuyến';
      case 'coding': return 'Đang code';
      case 'idle': return 'Vắng mặt';
      case 'offline': return 'Offline';
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Đang tải dữ liệu học sinh...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>📊 Giám Sát Học Sinh</h1>
          <p className={styles.subtitle}>Theo dõi hoạt động học tập theo thời gian thực</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.lastUpdated}>
            {isPolling ? (
              <span className={styles.pollingIndicator}>⏳ Đang cập nhật...</span>
            ) : lastUpdated ? (
              <span>Cập nhật: {formatRelativeTime(lastUpdated.toISOString())}</span>
            ) : null}
          </div>
          <button className={styles.refreshBtn} onClick={fetchActivities} disabled={isPolling}>
            🔄 Làm mới
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>🏫 Lớp học:</label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Tất cả các lớp</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name} - Lớp {cls.grade_level}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.stats}>
          <span className={styles.statItem}>
            👨‍🎓 Tổng: {activities.length} học sinh
          </span>
          <span className={styles.statItem} style={{ color: '#10b981' }}>
            🟢 Online: {activities.filter(a => a.status === 'online' || a.status === 'coding').length}
          </span>
          <span className={styles.statItem} style={{ color: '#94a3b8' }}>
            ⚪ Offline: {activities.filter(a => a.status === 'offline' || a.status === 'idle').length}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* Student Activity Grid */}
      {activities.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>👨‍🎓</span>
          <h3>Chưa có học sinh nào</h3>
          <p>
            {selectedClassId !== 'all'
              ? 'Lớp này chưa có học sinh được gán.'
              : 'Chưa có học sinh nào trong trường.'}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {activities.map(activity => (
            <div key={activity.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.studentInfo}>
                  <div className={styles.avatar}>
                    {activity.studentName.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.nameSection}>
                    <span className={styles.studentName}>{activity.studentName}</span>
                    <span className={styles.className}>{activity.className}</span>
                  </div>
                </div>
                <div
                  className={styles.statusBadge}
                  style={{ backgroundColor: getStatusColor(activity.status) }}
                  title={getStatusText(activity.status)}
                >
                  {activity.status === 'online' && '🟢'}
                  {activity.status === 'coding' && '🔵'}
                  {activity.status === 'idle' && '🟡'}
                  {activity.status === 'offline' && '⚪'}
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.lessonInfo}>
                  <span className={styles.lessonLabel}>Bài đang học:</span>
                  <span className={styles.lessonTitle}>
                    {activity.currentLessonTitle || 'Chưa bắt đầu'}
                  </span>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <span>Tiến độ</span>
                    <span>{activity.progressPercent}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${activity.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className={styles.statsRow}>
                  <div className={styles.stat}>
                    <span className={styles.statIcon}>✅</span>
                    <span className={styles.statValue}>{activity.totalLessonsCompleted}</span>
                    <span className={styles.statLabel}>Bài hoàn thành</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statIcon}>⏱️</span>
                    <span className={styles.statValue}>{activity.totalTimeSpentMinutes}</span>
                    <span className={styles.statLabel}>Phút học</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.lastActivity}>
                  🕐 {formatRelativeTime(activity.lastActivityAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
