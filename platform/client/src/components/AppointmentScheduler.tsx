import { useState, useEffect } from 'react';
import { appointmentsApi, Appointment } from '../services/messagingApi';
import { useAuth } from '../context/AuthContext';
import './AppointmentScheduler.css';

interface AppointmentSchedulerProps {
  teacherId?: string;
  studentId?: string;
  compact?: boolean;
  onAppointmentCreated?: (appointment: Appointment) => void;
  onClose?: () => void;
}

const APPOINTMENT_TYPES: Record<Appointment['appointment_type'], { label: string; icon: string }> = {
  parent_teacher_meeting: { label: 'Họp phụ huynh', icon: '👨‍👩‍👧' },
  progress_review: { label: 'Xem tiến độ học tập', icon: '📊' },
  behavior_discussion: { label: 'Trao đổi về hành vi', icon: '💬' },
  enrollment_inquiry: { label: 'Tư vấn ghi danh', icon: '📝' },
  other: { label: 'Khác', icon: '📌' },
};

const STATUS_CONFIG: Record<Appointment['status'], { label: string; icon: string; color: string }> = {
  pending: { label: 'Đang chờ', icon: '⏳', color: '#f9e2af' },
  confirmed: { label: 'Đã xác nhận', icon: '✅', color: '#a6e3a1' },
  cancelled: { label: 'Đã hủy', icon: '❌', color: '#f38ba8' },
  completed: { label: 'Hoàn thành', icon: '🎉', color: '#cba6f7' },
  no_show: { label: 'Không đến', icon: '😢', color: '#6c7086' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5);
}

export default function AppointmentScheduler({ teacherId, studentId, compact = false, onAppointmentCreated, onClose }: AppointmentSchedulerProps) {
  const { token, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedType, setSelectedType] = useState<Appointment['appointment_type']>('parent_teacher_meeting');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (token) loadAppointments();
  }, [token]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const { appointments: appts } = await appointmentsApi.getAppointments(token!);
      setAppointments(appts);
    } catch (err: any) {
      console.error('Failed to load appointments:', err);
      // Demo data
      setAppointments([
        {
          id: 'apt-demo-1',
          parent_id: 'demo-parent',
          teacher_id: teacherId || 'demo-teacher',
          student_id: studentId || 'demo-student',
          scheduled_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          scheduled_time: '10:00',
          duration_minutes: 30,
          appointment_type: 'progress_review',
          status: 'confirmed',
          notes: 'Xem tiến độ học tập tháng 4',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          teacher: { id: 'demo-teacher', full_name: 'Cô Minh' },
          student: { id: 'demo-student', full_name: 'Nguyễn Văn A' },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async () => {
    if (!selectedDate || !selectedTime || !teacherId) return;

    try {
      setSubmitting(true);
      const { appointment } = await appointmentsApi.createAppointment(token!, {
        teacher_id: teacherId,
        student_id: studentId,
        scheduled_date: selectedDate,
        scheduled_time: selectedTime,
        duration_minutes: 30,
        appointment_type: selectedType,
        notes: notes.trim() || undefined,
      });
      setAppointments(prev => [appointment, ...prev]);
      setShowCreateForm(false);
      resetForm();
      onAppointmentCreated?.(appointment);
    } catch (err: any) {
      setError('Không thể tạo lịch hẹn. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await appointmentsApi.cancelAppointment(token!, appointmentId);
      setAppointments(prev =>
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'cancelled' as const } : apt)
      );
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    }
  };

  const resetForm = () => {
    setSelectedDate('');
    setSelectedTime('');
    setSelectedType('parent_teacher_meeting');
    setNotes('');
    setError(null);
  };

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Get available time slots
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  ];

  const now = new Date();
  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(`${apt.scheduled_date}T${apt.scheduled_time}`);
    return aptDate >= now && apt.status !== 'cancelled' && apt.status !== 'completed';
  });
  const pastAppointments = appointments.filter(apt => {
    const aptDate = new Date(`${apt.scheduled_date}T${apt.scheduled_time}`);
    return aptDate < now || apt.status === 'completed' || apt.status === 'cancelled';
  });

  if (compact) {
    return (
      <div className="aps-container aps-compact">
        <div className="aps-header">
          <h3>📅 Lịch hẹn</h3>
          {onClose && <button className="aps-close" onClick={onClose}>×</button>}
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="aps-empty">
            <span className="aps-empty-icon">📅</span>
            <p>Chưa có lịch hẹn nào</p>
            {!showCreateForm && (
              <button className="aps-btn aps-btn-primary" onClick={() => setShowCreateForm(true)}>
                + Đặt lịch hẹn
              </button>
            )}
          </div>
        ) : (
          <div className="aps-list">
            {upcomingAppointments.slice(0, 3).map(apt => (
              <div key={apt.id} className="aps-card">
                <div className="aps-card-header">
                  <span className="aps-type-icon">{APPOINTMENT_TYPES[apt.appointment_type].icon}</span>
                  <span className="aps-type-label">{APPOINTMENT_TYPES[apt.appointment_type].label}</span>
                </div>
                <div className="aps-card-datetime">
                  📆 {formatDate(apt.scheduled_date)} lúc {formatTime(apt.scheduled_time)}
                </div>
                <div className={`aps-status aps-status-${apt.status}`}>
                  {STATUS_CONFIG[apt.status].icon} {STATUS_CONFIG[apt.status].label}
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateForm && (
          <div className="aps-form">
            <h4>Đặt lịch hẹn mới</h4>
            <div className="aps-form-group">
              <label>Loại lịch hẹn</label>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value as Appointment['appointment_type'])}>
                {Object.entries(APPOINTMENT_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>
            </div>
            <div className="aps-form-row">
              <div className="aps-form-group">
                <label>Ngày</label>
                <input type="date" value={selectedDate} min={getMinDate()} onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div className="aps-form-group">
                <label>Giờ</label>
                <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)}>
                  <option value="">Chọn giờ</option>
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="aps-form-group">
              <label>Ghi chú (tùy chọn)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nội dung muốn trao đổi..." rows={3} />
            </div>
            <div className="aps-form-actions">
              <button className="aps-btn aps-btn-secondary" onClick={() => { setShowCreateForm(false); resetForm(); }}>Hủy</button>
              <button className="aps-btn aps-btn-primary" onClick={handleCreateAppointment} disabled={!selectedDate || !selectedTime || submitting}>
                {submitting ? 'Đang gửi...' : 'Xác nhận đặt lịch'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className="aps-container aps-full">
      <div className="aps-header">
        <h2>📅 Lịch hẹn với giáo viên</h2>
        <button className="aps-btn aps-btn-primary" onClick={() => setShowCreateForm(true)}>
          + Đặt lịch hẹn mới
        </button>
      </div>

      <div className="aps-tabs">
        <button
          className={`aps-tab ${activeTab === 'upcoming' ? 'aps-tab-active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Sắp tới ({upcomingAppointments.length})
        </button>
        <button
          className={`aps-tab ${activeTab === 'past' ? 'aps-tab-active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Đã qua ({pastAppointments.length})
        </button>
      </div>

      {error && <div className="aps-error">{error}</div>}

      {loading ? (
        <div className="aps-loading">Đang tải lịch hẹn...</div>
      ) : (
        <div className="aps-content">
          {(activeTab === 'upcoming' ? upcomingAppointments : pastAppointments).length === 0 ? (
            <div className="aps-empty">
              <span className="aps-empty-icon">📅</span>
              <p>Chưa có lịch hẹn nào</p>
            </div>
          ) : (
            <div className="aps-list">
              {(activeTab === 'upcoming' ? upcomingAppointments : pastAppointments).map(apt => (
                <div key={apt.id} className={`aps-card aps-card-${apt.status}`}>
                  <div className="aps-card-header">
                    <div className="aps-card-title">
                      <span className="aps-type-icon">{APPOINTMENT_TYPES[apt.appointment_type].icon}</span>
                      <span className="aps-type-name">{APPOINTMENT_TYPES[apt.appointment_type].label}</span>
                    </div>
                    <div className={`aps-status aps-status-${apt.status}`}>
                      {STATUS_CONFIG[apt.status].icon} {STATUS_CONFIG[apt.status].label}
                    </div>
                  </div>

                  <div className="aps-card-body">
                    <div className="aps-card-datetime">
                      📆 {formatDate(apt.scheduled_date)} lúc {formatTime(apt.scheduled_time)}
                      <span className="aps-duration">({apt.duration_minutes} phút)</span>
                    </div>
                    {apt.teacher && (
                      <div className="aps-card-teacher">👩‍🏫 {apt.teacher.full_name}</div>
                    )}
                    {apt.student && (
                      <div className="aps-card-student">👤 Học sinh: {apt.student.full_name}</div>
                    )}
                    {apt.notes && (
                      <div className="aps-card-notes">📝 {apt.notes}</div>
                    )}
                    {apt.meeting_link && apt.status === 'confirmed' && (
                      <a href={apt.meeting_link} target="_blank" rel="noopener noreferrer" className="aps-meeting-link">
                        🔗 Tham gia cuộc họp
                      </a>
                    )}
                  </div>

                  {activeTab === 'upcoming' && apt.status === 'pending' && (
                    <div className="aps-card-actions">
                      <button
                        className="aps-btn aps-btn-danger"
                        onClick={() => handleCancelAppointment(apt.id)}
                      >
                        Hủy lịch hẹn
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateForm && (
        <div className="aps-modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="aps-modal" onClick={e => e.stopPropagation()}>
            <div className="aps-modal-header">
              <h3>📅 Đặt lịch hẹn mới</h3>
              <button className="aps-modal-close" onClick={() => { setShowCreateForm(false); resetForm(); }}>×</button>
            </div>

            <div className="aps-form">
              <div className="aps-form-group">
                <label>Loại lịch hẹn</label>
                <div className="aps-type-grid">
                  {Object.entries(APPOINTMENT_TYPES).map(([key, val]) => (
                    <button
                      key={key}
                      className={`aps-type-option ${selectedType === key ? 'aps-type-selected' : ''}`}
                      onClick={() => setSelectedType(key as Appointment['appointment_type'])}
                    >
                      <span className="aps-type-icon">{val.icon}</span>
                      <span>{val.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="aps-form-row">
                <div className="aps-form-group">
                  <label>Ngày hẹn</label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={getMinDate()}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="aps-input"
                  />
                </div>
                <div className="aps-form-group">
                  <label>Giờ hẹn</label>
                  <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="aps-input">
                    <option value="">Chọn giờ</option>
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="aps-form-group">
                <label>Ghi chú (tùy chọn)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Nội dung bạn muốn trao đổi với giáo viên..."
                  className="aps-input"
                  rows={3}
                />
              </div>

              <div className="aps-form-actions">
                <button
                  className="aps-btn aps-btn-secondary"
                  onClick={() => { setShowCreateForm(false); resetForm(); }}
                >
                  Hủy
                </button>
                <button
                  className="aps-btn aps-btn-primary"
                  onClick={handleCreateAppointment}
                  disabled={!selectedDate || !selectedTime || submitting}
                >
                  {submitting ? 'Đang gửi...' : 'Xác nhận đặt lịch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
