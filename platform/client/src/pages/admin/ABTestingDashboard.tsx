/**
 * ABTestingDashboard - Admin A/B Testing Experiment Management
 * Features: experiment list, status filters, quick actions, create new experiment
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

interface Variant {
  id: string;
  name: string;
  weight: number;
  conversions: number;
  visitors: number;
  conversionRate: number;
}

interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  status: ExperimentStatus;
  variants: Variant[];
  startDate: string | null;
  endDate: string | null;
  totalVisitors: number;
  totalConversions: number;
  createdAt: string;
}

const STATUS_LABELS: Record<ExperimentStatus, string> = {
  draft: 'Nháp',
  running: 'Đang chạy',
  paused: 'Tạm dừng',
  completed: 'Hoàn thành',
};

const STATUS_COLORS: Record<ExperimentStatus, string> = {
  draft: '#6b7280',
  running: '#22c55e',
  paused: '#f59e0b',
  completed: '#3b82f6',
};

export default function ABTestingDashboard() {
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ExperimentStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadExperiments();
  }, []);

  const loadExperiments = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('robokids_token');
      const response = await fetch(`${API_BASE}/api/experiments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setExperiments(data.experiments || []);
      } else if (response.status === 404) {
        // API not yet implemented - use mock data
        setExperiments(getMockExperiments());
      } else {
        setError('Không thể tải danh sách thí nghiệm');
      }
    } catch (err) {
      // API not available - use mock data
      setExperiments(getMockExperiments());
    } finally {
      setIsLoading(false);
    }
  };

  const getMockExperiments = (): Experiment[] => [
    {
      id: '1',
      name: 'Onboarding Flow v2',
      description: 'Thử nghiệm quy trình đăng ký mới với fewer steps',
      hypothesis: 'Giảm số bước đăng ký sẽ tăng tỷ lệ hoàn thành',
      status: 'running',
      variants: [
        { id: 'v1', name: 'Control', weight: 50, conversions: 234, visitors: 1200, conversionRate: 19.5 },
        { id: 'v2', name: 'Variant A', weight: 50, conversions: 312, visitors: 1180, conversionRate: 26.4 },
      ],
      startDate: '2026-04-01',
      endDate: null,
      totalVisitors: 2380,
      totalConversions: 546,
      createdAt: '2026-04-01T10:00:00Z',
    },
    {
      id: '2',
      name: 'Badge Design 2026',
      description: 'Thử nghiệm thiết kế badge mới',
      hypothesis: 'Badge mới với animation sẽ tăng engagement',
      status: 'completed',
      variants: [
        { id: 'v1', name: 'Control', weight: 50, conversions: 890, visitors: 5000, conversionRate: 17.8 },
        { id: 'v2', name: 'Variant B', weight: 50, conversions: 1105, visitors: 4950, conversionRate: 22.3 },
      ],
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      totalVisitors: 9950,
      totalConversions: 1995,
      createdAt: '2026-03-01T08:00:00Z',
    },
    {
      id: '3',
      name: 'AI Tutor Personality',
      description: 'Thử nghiệm personality styles cho RoboBuddy',
      hypothesis: 'Friendly personality sẽ tăng lesson completion',
      status: 'draft',
      variants: [
        { id: 'v1', name: 'Professional', weight: 34, conversions: 0, visitors: 0, conversionRate: 0 },
        { id: 'v2', name: 'Friendly', weight: 33, conversions: 0, visitors: 0, conversionRate: 0 },
        { id: 'v3', name: 'Gamified', weight: 33, conversions: 0, visitors: 0, conversionRate: 0 },
      ],
      startDate: null,
      endDate: null,
      totalVisitors: 0,
      totalConversions: 0,
      createdAt: '2026-04-10T14:00:00Z',
    },
    {
      id: '4',
      name: 'Pricing Page Layout',
      description: 'So sánh layout pricing page',
      hypothesis: 'Layout với comparison table sẽ tăng conversion',
      status: 'paused',
      variants: [
        { id: 'v1', name: 'Current', weight: 50, conversions: 45, visitors: 800, conversionRate: 5.6 },
        { id: 'v2', name: 'New Layout', weight: 50, conversions: 52, visitors: 780, conversionRate: 6.7 },
      ],
      startDate: '2026-04-05',
      endDate: null,
      totalVisitors: 1580,
      totalConversions: 97,
      createdAt: '2026-04-05T09:00:00Z',
    },
  ];

  const filteredExperiments = experiments.filter(exp => {
    if (statusFilter && exp.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        exp.name.toLowerCase().includes(q) ||
        exp.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStartExperiment = async (id: string) => {
    try {
      const token = localStorage.getItem('robokids_token');
      await fetch(`${API_BASE}/api/experiments/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadExperiments();
    } catch {
      // Update local state for mock
      setExperiments(exps =>
        exps.map(e => e.id === id ? { ...e, status: 'running' as ExperimentStatus, startDate: new Date().toISOString().split('T')[0] } : e)
      );
    }
  };

  const handlePauseExperiment = async (id: string) => {
    try {
      const token = localStorage.getItem('robokids_token');
      await fetch(`${API_BASE}/api/experiments/${id}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadExperiments();
    } catch {
      setExperiments(exps =>
        exps.map(e => e.id === id ? { ...e, status: 'paused' as ExperimentStatus } : e)
      );
    }
  };

  const handleCompleteExperiment = async (id: string) => {
    try {
      const token = localStorage.getItem('robokids_token');
      await fetch(`${API_BASE}/api/experiments/${id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadExperiments();
    } catch {
      setExperiments(exps =>
        exps.map(e => e.id === id ? { ...e, status: 'completed' as ExperimentStatus, endDate: new Date().toISOString().split('T')[0] } : e)
      );
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>🧪 A/B Testing Dashboard</h1>
          <p style={styles.pageSubtitle}>Quản lý thí nghiệm A/B testing</p>
        </div>
        <button style={styles.createBtn} onClick={() => navigate('/admin/ab-testing/new')}>
          + Tạo thí nghiệm mới
        </button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Filters */}
      <div style={styles.filters}>
        <input
          style={styles.searchInput}
          placeholder="Tìm kiếm thí nghiệm..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div style={styles.statusTabs}>
          <button
            style={{ ...styles.tab, ...(statusFilter === '' ? styles.tabActive : {}) }}
            onClick={() => setStatusFilter('')}
          >
            Tất cả ({experiments.length})
          </button>
          {(['draft', 'running', 'paused', 'completed'] as ExperimentStatus[]).map(status => (
            <button
              key={status}
              style={{ ...styles.tab, ...(statusFilter === status ? styles.tabActive : {}) }}
              onClick={() => setStatusFilter(status)}
            >
              {STATUS_LABELS[status]} ({experiments.filter(e => e.status === status).length})
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statValue}>{experiments.length}</div>
          <div style={styles.statLabel}>Tổng thí nghiệm</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>▶️</div>
          <div style={styles.statValue}>{experiments.filter(e => e.status === 'running').length}</div>
          <div style={styles.statLabel}>Đang chạy</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statValue}>{experiments.reduce((sum, e) => sum + e.totalVisitors, 0).toLocaleString()}</div>
          <div style={styles.statLabel}>Tổng visitors</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🎯</div>
          <div style={styles.statValue}>{experiments.reduce((sum, e) => sum + e.totalConversions, 0).toLocaleString()}</div>
          <div style={styles.statLabel}>Tổng conversions</div>
        </div>
      </div>

      {/* Experiments Table */}
      {isLoading ? (
        <div style={styles.loadingState}>Đang tải...</div>
      ) : filteredExperiments.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🧪</div>
          <p>Chưa có thí nghiệm nào</p>
          <button style={styles.createBtn} onClick={() => navigate('/admin/ab-testing/new')}>
            Tạo thí nghiệm đầu tiên
          </button>
        </div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <div style={{ ...styles.col, flex: 2 }}>Tên thí nghiệm</div>
            <div style={{ ...styles.col, flex: 1 }}>Trạng thái</div>
            <div style={{ ...styles.col, flex: 1 }}>Variants</div>
            <div style={{ ...styles.col, flex: 1 }}>Visitors</div>
            <div style={{ ...styles.col, flex: 1 }}>Conv. Rate</div>
            <div style={{ ...styles.col, flex: 1 }}>Ngày bắt đầu</div>
            <div style={{ ...styles.col, flex: 1.5 }}>Hành động</div>
          </div>
          {filteredExperiments.map(exp => (
            <div key={exp.id} style={styles.tableRow} onClick={() => navigate(`/admin/ab-testing/${exp.id}`)}>
              <div style={{ ...styles.col, flex: 2 }}>
                <div style={styles.expName}>{exp.name}</div>
                <div style={styles.expDesc}>{exp.description}</div>
              </div>
              <div style={{ ...styles.col, flex: 1 }}>
                <span style={{ ...styles.statusBadge, backgroundColor: STATUS_COLORS[exp.status] }}>
                  {STATUS_LABELS[exp.status]}
                </span>
              </div>
              <div style={{ ...styles.col, flex: 1 }}>
                <div style={styles.variantCount}>{exp.variants.length} variants</div>
              </div>
              <div style={{ ...styles.col, flex: 1 }}>
                {exp.totalVisitors.toLocaleString()}
              </div>
              <div style={{ ...styles.col, flex: 1 }}>
                {exp.totalVisitors > 0
                  ? `${((exp.totalConversions / exp.totalVisitors) * 100).toFixed(1)}%`
                  : '-'}
              </div>
              <div style={{ ...styles.col, flex: 1 }}>
                {formatDate(exp.startDate)}
              </div>
              <div style={{ ...styles.col, flex: 1.5 }} onClick={e => e.stopPropagation()}>
                <div style={styles.actionButtons}>
                  {exp.status === 'draft' && (
                    <button style={styles.actionBtn} onClick={() => handleStartExperiment(exp.id)}>
                      ▶️ Bắt đầu
                    </button>
                  )}
                  {exp.status === 'running' && (
                    <button style={styles.actionBtn} onClick={() => handlePauseExperiment(exp.id)}>
                      ⏸️ Tạm dừng
                    </button>
                  )}
                  {exp.status === 'paused' && (
                    <button style={styles.actionBtn} onClick={() => handleStartExperiment(exp.id)}>
                      ▶️ Tiếp tục
                    </button>
                  )}
                  {(exp.status === 'running' || exp.status === 'paused') && (
                    <button style={{ ...styles.actionBtn, ...styles.completeBtn }} onClick={() => handleCompleteExperiment(exp.id)}>
                      ✓ Hoàn thành
                    </button>
                  )}
                  <button style={styles.actionBtn} onClick={() => navigate(`/admin/ab-testing/${exp.id}`)}>
                    📊 Chi tiết
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f0f23',
    color: '#e4e4e7',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  createBtn: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    backgroundColor: '#1e1e3f',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e4e4e7',
    fontSize: '14px',
  },
  statusTabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  tab: {
    backgroundColor: '#1e1e3f',
    color: '#a1a1aa',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    borderColor: '#8b5cf6',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
  },
  statIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: '12px',
    color: '#a1a1aa',
    marginTop: '4px',
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px',
    color: '#71717a',
    fontSize: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#71717a',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  table: {
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    backgroundColor: '#16162e',
    padding: '12px 16px',
    fontWeight: 600,
    fontSize: '13px',
    color: '#a1a1aa',
  },
  tableRow: {
    display: 'flex',
    padding: '14px 16px',
    borderBottom: '1px solid #2d2d5a',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  col: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    fontSize: '14px',
  },
  expName: {
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '4px',
  },
  expDesc: {
    fontSize: '12px',
    color: '#71717a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: '250px',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'white',
  },
  variantCount: {
    color: '#a1a1aa',
  },
  actionButtons: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  actionBtn: {
    backgroundColor: '#2d2d5a',
    color: '#e4e4e7',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  completeBtn: {
    backgroundColor: '#166534',
  },
};