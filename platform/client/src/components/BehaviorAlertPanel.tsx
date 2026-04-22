import { useState, useEffect } from 'react';
import { behaviorApi, BehaviorAlert } from '../services/messagingApi';
import { useAuth } from '../context/AuthContext';
import './BehaviorAlertPanel.css';

interface BehaviorAlertPanelProps {
  studentId?: string;
  compact?: boolean;
  onClose?: () => void;
}

const ALERT_CONFIG: Record<BehaviorAlert['alert_type'], { icon: string; color: string; bgColor: string }> = {
  positive: { icon: '🌟', color: '#a6e3a1', bgColor: 'rgba(166, 227, 161, 0.15)' },
  negative: { icon: '⚠️', color: '#f38ba8', bgColor: 'rgba(243, 139, 168, 0.15)' },
  warning: { icon: '🚨', color: '#f9e2af', bgColor: 'rgba(249, 226, 175, 0.15)' },
};

const CATEGORY_LABELS: Record<BehaviorAlert['category'], { label: string; icon: string }> = {
  participation: { label: 'Tham gia', icon: '🙋' },
  homework: { label: 'Bài tập về nhà', icon: '📚' },
  behavior: { label: 'Hành vi', icon: '👋' },
  achievement: { label: 'Thành tích', icon: '🏆' },
  attendance: { label: 'Điểm danh', icon: '✅' },
  other: { label: 'Khác', icon: '📌' },
};

function formatAlertTime(dateStr: string): string {
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
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function BehaviorAlertPanel({ studentId, compact = false, onClose }: BehaviorAlertPanelProps) {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<BehaviorAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<BehaviorAlert | null>(null);
  const [filterUnread, setFilterUnread] = useState(false);

  useEffect(() => {
    if (token) loadAlerts();
  }, [token, studentId, filterUnread]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const { alerts: alertList, unread_count } = await behaviorApi.getAlerts(token!, studentId, filterUnread);
      setAlerts(alertList);
      setUnreadCount(unread_count);
    } catch (err: any) {
      console.error('Failed to load behavior alerts:', err);
      // Demo data
      setAlerts([
        {
          id: 'alert-demo-1',
          teacher_id: 'demo-teacher',
          parent_id: 'demo-parent',
          student_id: studentId || 'demo-student',
          alert_type: 'positive',
          category: 'participation',
          title: 'Tham gia tích cực',
          description: 'Học sinh đã tham gia rất tích cực trong buổi học hôm nay. Đặt câu hỏi hay và giúp đỡ bạn bè cùng nhóm.',
          severity: 'low',
          is_read: false,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          teacher: { id: 'demo-teacher', full_name: 'Cô Minh' },
          student: { id: 'demo-student', full_name: 'Nguyễn Văn A' },
        },
        {
          id: 'alert-demo-2',
          teacher_id: 'demo-teacher',
          parent_id: 'demo-parent',
          student_id: studentId || 'demo-student',
          alert_type: 'warning',
          category: 'homework',
          title: 'Chưa hoàn thành bài tập',
          description: 'Bài tập lập trình robot tuần này chưa được nộp. Vui lòng kiểm tra và nhắc nhở con hoàn thành.',
          severity: 'medium',
          is_read: false,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          teacher: { id: 'demo-teacher', full_name: 'Cô Minh' },
          student: { id: 'demo-student', full_name: 'Nguyễn Văn A' },
        },
        {
          id: 'alert-demo-3',
          teacher_id: 'demo-teacher',
          parent_id: 'demo-parent',
          student_id: studentId || 'demo-student',
          alert_type: 'positive',
          category: 'achievement',
          title: 'Hoàn thành dự án đầu tiên',
          description: 'Con đã hoàn thành xuất sắc dự án robot đầu tiên! Rất tự hào về sự tiến bộ của con.',
          severity: 'low',
          is_read: true,
          read_at: new Date(Date.now() - 43200000).toISOString(),
          created_at: new Date(Date.now() - 172800000).toISOString(),
          teacher: { id: 'demo-teacher', full_name: 'Cô Minh' },
          student: { id: 'demo-student', full_name: 'Nguyễn Văn A' },
        },
      ]);
      setUnreadCount(2);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await behaviorApi.markAsRead(token!, alertId);
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, is_read: true, read_at: new Date().toISOString() } : alert
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await behaviorApi.markAllAsRead(token!, studentId);
      setAlerts(prev => prev.map(alert => ({ ...alert, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleAlertClick = (alert: BehaviorAlert) => {
    if (!alert.is_read) {
      handleMarkAsRead(alert.id);
    }
    setSelectedAlert(alert);
  };

  if (compact) {
    return (
      <div className="bap-container bap-compact">
        <div className="bap-header">
          <h3>🔔 Thông báo</h3>
          <div className="bap-header-actions">
            {unreadCount > 0 && (
              <button className="bap-btn-text" onClick={handleMarkAllAsRead}>
                Đánh dấu đã đọc
              </button>
            )}
            {onClose && <button className="bap-close" onClick={onClose}>×</button>}
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="bap-unread-banner">
            🔔 Bạn có {unreadCount} thông báo chưa đọc
          </div>
        )}

        {loading ? (
          <div className="bap-loading">Đang tải...</div>
        ) : alerts.length === 0 ? (
          <div className="bap-empty">
            <span className="bap-empty-icon">🔔</span>
            <p>Không có thông báo nào</p>
          </div>
        ) : (
          <div className="bap-list">
            {alerts.slice(0, 5).map(alert => (
              <div
                key={alert.id}
                className={`bap-item ${alert.is_read ? 'bap-read' : 'bap-unread'}`}
                onClick={() => handleAlertClick(alert)}
              >
                <div
                  className="bap-item-icon"
                  style={{ background: ALERT_CONFIG[alert.alert_type].bgColor }}
                >
                  {ALERT_CONFIG[alert.alert_type].icon}
                </div>
                <div className="bap-item-content">
                  <div className="bap-item-header">
                    <span className="bap-item-title">{alert.title}</span>
                    <span className="bap-item-time">{formatAlertTime(alert.created_at)}</span>
                  </div>
                  <div className="bap-item-category">
                    {CATEGORY_LABELS[alert.category].icon} {CATEGORY_LABELS[alert.category].label}
                  </div>
                </div>
                {!alert.is_read && <span className="bap-unread-dot"></span>}
              </div>
            ))}
          </div>
        )}

        {selectedAlert && (
          <div className="bap-modal-overlay" onClick={() => setSelectedAlert(null)}>
            <div className="bap-modal" onClick={e => e.stopPropagation()}>
              <div className="bap-modal-header">
                <div
                  className="bap-modal-icon"
                  style={{ background: ALERT_CONFIG[selectedAlert.alert_type].bgColor }}
                >
                  {ALERT_CONFIG[selectedAlert.alert_type].icon}
                </div>
                <div className="bap-modal-title">
                  <h3>{selectedAlert.title}</h3>
                  <span className="bap-modal-meta">
                    {CATEGORY_LABELS[selectedAlert.category].icon} {CATEGORY_LABELS[selectedAlert.category].label}
                    {' • '}
                    {selectedAlert.teacher?.full_name}
                  </span>
                </div>
                <button className="bap-modal-close" onClick={() => setSelectedAlert(null)}>×</button>
              </div>
              <div className="bap-modal-body">
                <p>{selectedAlert.description}</p>
                <div className="bap-modal-info">
                  <span>👤 Học sinh: {selectedAlert.student?.full_name}</span>
                  <span>⏰ {formatAlertTime(selectedAlert.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className="bap-container bap-full">
      <div className="bap-header">
        <h2>🔔 Thông báo từ giáo viên</h2>
        <div className="bap-header-actions">
          <label className="bap-checkbox">
            <input
              type="checkbox"
              checked={filterUnread}
              onChange={e => setFilterUnread(e.target.checked)}
            />
            <span>Chỉ hiển thị chưa đọc</span>
          </label>
          {unreadCount > 0 && (
            <button className="bap-btn-text" onClick={handleMarkAllAsRead}>
              Đánh dấu đã đọc tất cả
            </button>
          )}
        </div>
      </div>

      {unreadCount > 0 && !filterUnread && (
        <div className="bap-unread-banner">
          🔔 Bạn có {unreadCount} thông báo chưa đọc
        </div>
      )}

      {error && <div className="bap-error">{error}</div>}

      {loading ? (
        <div className="bap-loading">Đang tải thông báo...</div>
      ) : alerts.length === 0 ? (
        <div className="bap-empty">
          <span className="bap-empty-icon">🔔</span>
          <p>
            {filterUnread
              ? 'Không có thông báo chưa đọc'
              : 'Chưa có thông báo nào từ giáo viên'}
          </p>
        </div>
      ) : (
        <div className="bap-list">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`bap-card ${alert.is_read ? 'bap-read' : 'bap-unread'}`}
              onClick={() => handleAlertClick(alert)}
            >
              <div className="bap-card-left">
                <div
                  className="bap-card-icon"
                  style={{ background: ALERT_CONFIG[alert.alert_type].bgColor }}
                >
                  {ALERT_CONFIG[alert.alert_type].icon}
                </div>
              </div>
              <div className="bap-card-content">
                <div className="bap-card-header">
                  <h4 className="bap-card-title">{alert.title}</h4>
                  <span className="bap-card-time">{formatAlertTime(alert.created_at)}</span>
                </div>
                <p className="bap-card-description">{alert.description}</p>
                <div className="bap-card-footer">
                  <span className="bap-card-category">
                    {CATEGORY_LABELS[alert.category].icon} {CATEGORY_LABELS[alert.category].label}
                  </span>
                  <span className="bap-card-teacher">
                    👩‍🏫 {alert.teacher?.full_name}
                  </span>
                  <span className="bap-card-student">
                    👤 {alert.student?.full_name}
                  </span>
                </div>
              </div>
              {!alert.is_read && <span className="bap-unread-indicator"></span>}
            </div>
          ))}
        </div>
      )}

      {selectedAlert && (
        <div className="bap-modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="bap-modal" onClick={e => e.stopPropagation()}>
            <div className="bap-modal-header">
              <div
                className="bap-modal-icon"
                style={{ background: ALERT_CONFIG[selectedAlert.alert_type].bgColor }}
              >
                {ALERT_CONFIG[selectedAlert.alert_type].icon}
              </div>
              <div className="bap-modal-title">
                <h3>{selectedAlert.title}</h3>
                <span className="bap-modal-meta">
                  {CATEGORY_LABELS[selectedAlert.category].icon} {CATEGORY_LABELS[selectedAlert.category].label}
                </span>
              </div>
              <button className="bap-modal-close" onClick={() => setSelectedAlert(null)}>×</button>
            </div>
            <div className="bap-modal-body">
              <p>{selectedAlert.description}</p>
              <div className="bap-modal-info">
                <div>👩‍🏫 Giáo viên: {selectedAlert.teacher?.full_name}</div>
                <div>👤 Học sinh: {selectedAlert.student?.full_name}</div>
                <div>⏰ Thời gian: {formatAlertTime(selectedAlert.created_at)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
