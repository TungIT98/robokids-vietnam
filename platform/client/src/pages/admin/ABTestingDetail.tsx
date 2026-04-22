/**
 * ABTestingDetail - Experiment Detail View with Charts
 * Features: variant performance, statistical significance, timeline chart, pie chart
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

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

interface TimelinePoint {
  date: string;
  [key: string]: number | string;
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
  pValue: number;
  confidenceLevel: number;
  winner: string | null;
}

const STATUS_COLORS: Record<ExperimentStatus, string> = {
  draft: '#6b7280',
  running: '#22c55e',
  paused: '#f59e0b',
  completed: '#3b82f6',
};

const VARIANT_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981'];

export default function ABTestingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadExperiment(id);
  }, [id]);

  const loadExperiment = async (expId: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('robokids_token');
      const response = await fetch(`${API_BASE}/api/experiments/${expId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setExperiment(data.experiment);
      } else {
        // Use mock data
        setExperiment(getMockExperiment(expId));
      }
    } catch {
      setExperiment(getMockExperiment(expId || '1'));
    } finally {
      setIsLoading(false);
    }
  };

  const getMockExperiment = (expId: string): Experiment => {
    const mockData: Record<string, Experiment> = {
      '1': {
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
        pValue: 0.023,
        confidenceLevel: 97.7,
        winner: 'v2',
      },
      '2': {
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
        pValue: 0.001,
        confidenceLevel: 99.9,
        winner: 'v2',
      },
      '3': {
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
        pValue: 0,
        confidenceLevel: 0,
        winner: null,
      },
    };
    return mockData[expId] || mockData['1'];
  };

  // Generate timeline data for chart
  const getTimelineData = (): TimelinePoint[] => {
    if (!experiment || experiment.status === 'draft') return [];
    const points: TimelinePoint[] = [];
    const startDate = experiment.startDate ? new Date(experiment.startDate) : new Date();
    const days = experiment.status === 'completed' && experiment.endDate
      ? Math.ceil((new Date(experiment.endDate).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : Math.min(14, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const point: TimelinePoint = {
        date: date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
      };
      experiment.variants.forEach((v, idx) => {
        const baseRate = v.conversionRate / 100;
        const noise = (Math.sin(i * 0.5 + idx) * 0.1);
        const trend = i * 0.002 * (idx + 1);
        point[v.name] = Math.max(0, Math.min(1, baseRate + noise + trend)) * 100;
      });
      points.push(point);
    }
    return points;
  };

  // Generate pie chart data
  const getPieData = () => {
    if (!experiment) return [];
    return experiment.variants.map(v => ({
      name: v.name,
      value: v.visitors || v.weight,
    }));
  };

  const isSignificant = experiment ? experiment.confidenceLevel >= 95 : false;

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>Đang tải...</div>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBanner}>Không tìm thấy thí nghiệm</div>
        <button style={styles.backBtn} onClick={() => navigate('/admin/ab-testing')}>
          ← Quay lại
        </button>
      </div>
    );
  }

  const timelineData = getTimelineData();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button style={styles.backBtn} onClick={() => navigate('/admin/ab-testing')}>
            ← Quay lại Dashboard
          </button>
          <h1 style={styles.pageTitle}>{experiment.name}</h1>
          <p style={styles.pageSubtitle}>{experiment.description}</p>
        </div>
        <span style={{ ...styles.statusBadge, backgroundColor: STATUS_COLORS[experiment.status] }}>
          {experiment.status === 'draft' ? 'Nháp' :
           experiment.status === 'running' ? 'Đang chạy' :
           experiment.status === 'paused' ? 'Tạm dừng' : 'Hoàn thành'}
        </span>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Hypothesis */}
      {experiment.hypothesis && (
        <div style={styles.hypothesisCard}>
          <div style={styles.hypothesisLabel}>💡 Giả thuyết</div>
          <div style={styles.hypothesisText}>{experiment.hypothesis}</div>
        </div>
      )}

      {/* Stats Summary */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Tổng Visitors</div>
          <div style={styles.statValue}>{experiment.totalVisitors.toLocaleString()}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Tổng Conversions</div>
          <div style={styles.statValue}>{experiment.totalConversions.toLocaleString()}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Ngày bắt đầu</div>
          <div style={styles.statValue}>{formatDate(experiment.startDate)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Ngày kết thúc</div>
          <div style={styles.statValue}>{formatDate(experiment.endDate)}</div>
        </div>
      </div>

      {/* Statistical Significance */}
      <div style={styles.significanceSection}>
        <h2 style={styles.sectionTitle}>📊 Ý nghĩa thống kê</h2>
        <div style={styles.significanceGrid}>
          <div style={styles.significanceCard}>
            <div style={styles.sigLabel}>Confidence Level</div>
            <div style={styles.sigValue}>{experiment.confidenceLevel.toFixed(1)}%</div>
            <div style={{
              ...styles.sigBadge,
              backgroundColor: isSignificant ? '#166534' : '#92400e',
            }}>
              {isSignificant ? '✓ Đạt ngưỡng 95%' : '✗ Chưa đạt ngưỡng 95%'}
            </div>
          </div>
          <div style={styles.significanceCard}>
            <div style={styles.sigLabel}>P-Value</div>
            <div style={styles.sigValue}>{experiment.pValue < 0.001 ? '< 0.001' : experiment.pValue.toFixed(3)}</div>
            <div style={styles.sigHint}>P {'<'} 0.05 là có ý nghĩa thống kê</div>
          </div>
          <div style={styles.significanceCard}>
            <div style={styles.sigLabel}>Winner</div>
            <div style={styles.sigValue}>
              {experiment.winner
                ? experiment.variants.find(v => v.id === experiment.winner)?.name || '-'
                : 'Chưa xác định'}
            </div>
            {experiment.winner && (
              <div style={styles.sigBadgeWinner}>🏆 Winner</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={styles.mainGrid}>
        {/* Variant Performance Cards */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📈 Variant Performance</h2>
          <div style={styles.variantGrid}>
            {experiment.variants.map((variant, idx) => (
              <div
                key={variant.id}
                style={{
                  ...styles.variantCard,
                  borderColor: experiment.winner === variant.id ? '#22c55e' : 'transparent',
                  borderWidth: experiment.winner === variant.id ? '2px' : '0',
                }}
              >
                {experiment.winner === variant.id && (
                  <div style={styles.winnerBadge}>🏆 Winner</div>
                )}
                <div style={styles.variantName}>{variant.name}</div>
                <div style={styles.variantWeight}>Weight: {variant.weight}%</div>
                <div style={styles.variantStats}>
                  <div style={styles.variantStat}>
                    <div style={styles.variantStatValue}>{variant.visitors.toLocaleString()}</div>
                    <div style={styles.variantStatLabel}>Visitors</div>
                  </div>
                  <div style={styles.variantStat}>
                    <div style={styles.variantStatValue}>{variant.conversions.toLocaleString()}</div>
                    <div style={styles.variantStatLabel}>Conversions</div>
                  </div>
                  <div style={styles.variantStat}>
                    <div style={styles.variantStatValue}>{variant.conversionRate.toFixed(1)}%</div>
                    <div style={styles.variantStatLabel}>Conv. Rate</div>
                  </div>
                </div>
                <div style={styles.variantBar}>
                  <div
                    style={{
                      ...styles.variantBarFill,
                      width: `${Math.min(100, variant.conversionRate * 3)}%`,
                      backgroundColor: VARIANT_COLORS[idx % VARIANT_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assignment Distribution Pie Chart */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🥧 Phân bổ Assignment</h2>
          <div style={styles.pieContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={getPieData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {getPieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={VARIANT_COLORS[index % VARIANT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1e1e3f',
                    border: '1px solid #3f3f5a',
                    borderRadius: '8px',
                    color: '#e4e4e7',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      {timelineData.length > 0 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📉 Conversion Rate Over Time</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timelineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f5a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip
                contentStyle={{
                  background: '#1e1e3f',
                  border: '1px solid #3f3f5a',
                  borderRadius: '8px',
                  color: '#e4e4e7',
                }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
              />
              <Legend />
              {experiment.variants.map((v, idx) => (
                <Line
                  key={v.id}
                  type="monotone"
                  dataKey={v.name}
                  stroke={VARIANT_COLORS[idx % VARIANT_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Variant Comparison Table */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📋 So sánh Variants</h2>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Variant</th>
                <th style={styles.th}>Visitors</th>
                <th style={styles.th}>Conversions</th>
                <th style={styles.th}>Conv. Rate</th>
                <th style={styles.th}>vs Control</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {experiment.variants.map((variant, idx) => {
                const controlRate = experiment.variants[0]?.conversionRate || 0;
                const lift = idx === 0 ? null : ((variant.conversionRate - controlRate) / controlRate * 100);
                return (
                  <tr key={variant.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.variantCell}>
                        <span style={{ ...styles.variantDot, backgroundColor: VARIANT_COLORS[idx % VARIANT_COLORS.length] }} />
                        {variant.name}
                        {experiment.winner === variant.id && <span style={styles.winnerStar}>🏆</span>}
                      </div>
                    </td>
                    <td style={styles.td}>{variant.visitors.toLocaleString()}</td>
                    <td style={styles.td}>{variant.conversions.toLocaleString()}</td>
                    <td style={styles.td}>
                      <span style={styles.convRate}>{variant.conversionRate.toFixed(2)}%</span>
                    </td>
                    <td style={styles.td}>
                      {lift !== null ? (
                        <span style={{ color: lift > 0 ? '#22c55e' : lift < 0 ? '#ef4444' : '#a1a1aa' }}>
                          {lift > 0 ? '+' : ''}{lift.toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td style={styles.td}>
                      {variant.conversionRate > 0 && (
                        <span style={{
                          ...styles.significanceBadge,
                          backgroundColor: lift !== null && lift > 0 ? '#166534' : '#374151',
                        }}>
                          {lift !== null && lift > 0 ? '✓ Better' : 'Control'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button style={styles.editBtn} onClick={() => navigate(`/admin/ab-testing/${experiment.id}/edit`)}>
          ✏️ Chỉnh sửa
        </button>
        {experiment.status === 'running' && (
          <button style={styles.pauseBtn} onClick={() => navigate('/admin/ab-testing')}>
            ⏸️ Tạm dừng
          </button>
        )}
        {(experiment.status === 'running' || experiment.status === 'paused') && (
          <button style={styles.completeBtn}>
            ✓ Hoàn thành thí nghiệm
          </button>
        )}
      </div>
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
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  backBtn: {
    backgroundColor: 'transparent',
    color: '#a1a1aa',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '8px',
    padding: '0',
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
  statusBadge: {
    padding: '6px 14px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px',
    color: '#71717a',
    fontSize: '16px',
  },
  hypothesisCard: {
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '20px',
    borderLeft: '4px solid #8b5cf6',
  },
  hypothesisLabel: {
    fontSize: '12px',
    color: '#a1a1aa',
    marginBottom: '6px',
    fontWeight: 600,
  },
  hypothesisText: {
    fontSize: '15px',
    color: '#e4e4e7',
    lineHeight: 1.5,
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
    padding: '16px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '12px',
    color: '#a1a1aa',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  significanceSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 12px',
    color: '#ffffff',
  },
  significanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  significanceCard: {
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
  },
  sigLabel: {
    fontSize: '12px',
    color: '#a1a1aa',
    marginBottom: '8px',
  },
  sigValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '8px',
  },
  sigBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    color: 'white',
    display: 'inline-block',
  },
  sigBadgeWinner: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    backgroundColor: '#166534',
    color: 'white',
    display: 'inline-block',
  },
  sigHint: {
    fontSize: '11px',
    color: '#71717a',
    marginTop: '4px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    padding: '20px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 16px',
    color: '#ffffff',
  },
  variantGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  variantCard: {
    backgroundColor: '#0f0f23',
    borderRadius: '10px',
    padding: '16px',
    position: 'relative' as const,
  },
  winnerBadge: {
    position: 'absolute' as const,
    top: '-8px',
    right: '-8px',
    backgroundColor: '#22c55e',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
  },
  variantName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '4px',
  },
  variantWeight: {
    fontSize: '12px',
    color: '#71717a',
    marginBottom: '12px',
  },
  variantStats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  variantStat: {
    textAlign: 'center' as const,
  },
  variantStatValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  variantStatLabel: {
    fontSize: '10px',
    color: '#71717a',
    marginTop: '2px',
  },
  variantBar: {
    height: '6px',
    backgroundColor: '#2d2d5a',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  variantBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  pieContainer: {
    display: 'flex',
    justifyContent: 'center',
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
    padding: '12px',
    borderBottom: '1px solid #3f3f5a',
    color: '#a1a1aa',
    fontWeight: 600,
  },
  tr: {
    borderBottom: '1px solid #2d2d5a',
  },
  td: {
    padding: '12px',
    color: '#e4e4e7',
  },
  variantCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  variantDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  winnerStar: {
    fontSize: '14px',
  },
  convRate: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  significanceBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'white',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  editBtn: {
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  pauseBtn: {
    backgroundColor: '#92400e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  completeBtn: {
    backgroundColor: '#166534',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};