/**
 * AdminDashboard - Admin-only dashboard with platform overview
 * Features: stats overview, student list with search/filter, lesson shortcuts, robot status, activity log
 */

import { useState, useEffect } from 'react';
import DOMPURIFY from 'dompurify';

interface PlatformStats {
  totalUsers: number;
  totalStudents: number;
  activeEnrollments: number;
  lessonsCompleted: number;
  totalMissions: number;
}

interface User {
  id: string;
  email: string;
  user_metadata: {
    role?: string;
    full_name?: string;
    age_group?: string;
  };
  created_at: string;
}

interface ActivityLogItem {
  id: string;
  type: 'enrollment' | 'lesson_completed' | 'badge_earned' | 'mission_completed' | 'user_created';
  message: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const TOKEN_KEY = 'robokids_token';
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadStats();
    loadUsers();
    loadActivityLog();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const response = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem(TOKEN_KEY);
      const response = await fetch(`/api/admin/users?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      setError('Không thể tải danh sách người dùng');
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivityLog = async () => {
    // Mock activity log for now - could be replaced with real API endpoint
    const mockActivities: ActivityLogItem[] = [
      { id: '1', type: 'enrollment', message: 'Nguyễn Văn A đăng ký khóa học', timestamp: new Date(Date.now() - 300000).toISOString() },
      { id: '2', type: 'lesson_completed', message: 'Trần Thị B hoàn thành bài "Di chuyển cơ bản"', timestamp: new Date(Date.now() - 600000).toISOString() },
      { id: '3', type: 'badge_earned', message: 'Lê Minh C nhận huy hiệu "Rookie Coder"', timestamp: new Date(Date.now() - 900000).toISOString() },
      { id: '4', type: 'mission_completed', message: 'Phạm Thị D hoàn thành thử thách tuần', timestamp: new Date(Date.now() - 1200000).toISOString() },
      { id: '5', type: 'user_created', message: 'Tài khoản mới: contact@school.edu.vn', timestamp: new Date(Date.now() - 1800000).toISOString() },
    ];
    setActivityLog(mockActivities);
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    if (roleFilter && user.user_metadata?.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        user.email?.toLowerCase().includes(q) ||
        user.user_metadata?.full_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enrollment': return '📝';
      case 'lesson_completed': return '✅';
      case 'badge_earned': return '🏅';
      case 'mission_completed': return '🚀';
      case 'user_created': return '👤';
      default: return '📌';
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>📊 Admin Dashboard</h1>
          <p style={styles.pageSubtitle}>Quản lý nền tảng RoboKids Vietnam</p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>{error}</div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div style={styles.statValue}>{stats.totalUsers}</div>
            <div style={styles.statLabel}>Tổng người dùng</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🎓</div>
            <div style={styles.statValue}>{stats.totalStudents}</div>
            <div style={styles.statLabel}>Học sinh</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📈</div>
            <div style={styles.statValue}>{stats.activeEnrollments}</div>
            <div style={styles.statLabel}>Đăng ký hoạt động</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>✅</div>
            <div style={styles.statValue}>{stats.lessonsCompleted}</div>
            <div style={styles.statLabel}>Bài học hoàn thành</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🎯</div>
            <div style={styles.statValue}>{stats.totalMissions}</div>
            <div style={styles.statLabel}>Tổng nhiệm vụ</div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={styles.mainGrid}>
        {/* Student/User List */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>👥 Người dùng</h2>
            <div style={styles.filterRow}>
              <input
                style={styles.searchInput}
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select
                style={styles.filterSelect}
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="">Tất cả vai trò</option>
                <option value="student">Học sinh</option>
                <option value="parent">Phụ huynh</option>
                <option value="teacher">Giáo viên</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div style={styles.loadingState}>Đang tải...</div>
          ) : (
            <>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Tên</th>
                      <th style={styles.th}>Vai trò</th>
                      <th style={styles.th}>Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} style={styles.tr}>
                        <td style={styles.td}>{user.email}</td>
                        <td style={styles.td}>{user.user_metadata?.full_name || '-'}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.roleBadge,
                            backgroundColor: getRoleColor(user.user_metadata?.role),
                          }}>
                            {user.user_metadata?.role || 'student'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {new Date(user.created_at).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={styles.pagination}>
                <button
                  style={styles.pageBtn}
                  onClick={() => { setPage(p => Math.max(1, p - 1)); loadUsers(); }}
                  disabled={page === 1}
                >
                  ←
                </button>
                <span style={styles.pageInfo}>Trang {page} / {totalPages}</span>
                <button
                  style={styles.pageBtn}
                  onClick={() => { setPage(p => Math.min(totalPages, p + 1)); loadUsers(); }}
                  disabled={page === totalPages}
                >
                  →
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Column */}
        <div style={styles.rightColumn}>
          {/* Lesson Shortcuts */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📚 Bài học</h2>
            <div style={styles.quickLinks}>
              <a href="/lesson-management" style={styles.quickLink}>
                🎓 Quản lý bài học
              </a>
              <a href="/curriculum" style={styles.quickLink}>
                📖 Duyệt chương trình
              </a>
            </div>
          </div>

          {/* Robot Status */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>🤖 Robot Status</h2>
            <div style={styles.robotStatusList}>
              <div style={styles.robotStatusItem}>
                <span style={styles.robotDot} data-status="online" />
                <span>Robot Lab 1 - Online</span>
              </div>
              <div style={styles.robotStatusItem}>
                <span style={styles.robotDot} data-status="online" />
                <span>Robot Lab 2 - Online</span>
              </div>
              <div style={styles.robotStatusItem}>
                <span style={styles.robotDot} data-status="offline" />
                <span>Robot Lab 3 - Offline</span>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📋 Hoạt động gần đây</h2>
            <div style={styles.activityList}>
              {activityLog.map(activity => (
                <div key={activity.id} style={styles.activityItem}>
                  <span style={styles.activityIcon}>{getActivityIcon(activity.type)}</span>
                  <div style={styles.activityContent}>
                    <div style={styles.activityMessage} dangerouslySetInnerHTML={{ __html: DOMPURIFY.sanitize(activity.message) }} />
                    <div style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getRoleColor(role?: string): string {
  switch (role) {
    case 'admin': return '#ef4444';
    case 'teacher': return '#8b5cf6';
    case 'parent': return '#3b82f6';
    case 'student': return '#22c55e';
    default: return '#6b7280';
  }
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f0f23',
    color: '#e4e4e7',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    color: '#ffffff',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#a1a1aa',
    margin: '4px 0 0',
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
  },
  statIcon: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: '12px',
    color: '#a1a1aa',
    marginTop: '4px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 350px',
    gap: '20px',
  },
  card: {
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    padding: '20px',
  },
  cardHeader: {
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 12px',
    color: '#ffffff',
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  searchInput: {
    flex: 1,
    minWidth: '150px',
    backgroundColor: '#0f0f23',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#e4e4e7',
    fontSize: '14px',
  },
  filterSelect: {
    backgroundColor: '#0f0f23',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#e4e4e7',
    fontSize: '14px',
    minWidth: '120px',
  },
  loadingState: {
    textAlign: 'center',
    padding: '40px',
    color: '#71717a',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid #3f3f5a',
    color: '#a1a1aa',
    fontWeight: 600,
  },
  tr: {
    borderBottom: '1px solid #2d2d5a',
  },
  td: {
    padding: '10px 12px',
    color: '#e4e4e7',
  },
  roleBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'white',
    fontWeight: 600,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #3f3f5a',
  },
  pageBtn: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  pageInfo: {
    color: '#a1a1aa',
    fontSize: '14px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  quickLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  quickLink: {
    backgroundColor: '#0f0f23',
    color: '#e4e4e7',
    padding: '10px 14px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background 0.2s',
  },
  robotStatusList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  robotStatusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#a1a1aa',
  },
  robotDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#6b7280',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityItem: {
    display: 'flex',
    gap: '10px',
    fontSize: '13px',
  },
  activityIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    color: '#e4e4e7',
    lineHeight: 1.4,
  },
  activityTime: {
    color: '#71717a',
    fontSize: '12px',
    marginTop: '2px',
  },
};