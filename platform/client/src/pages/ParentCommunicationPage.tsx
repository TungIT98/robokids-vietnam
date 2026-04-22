import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { parentApi, ParentStudent } from '../services/parentApi';
import ParentTeacherChat from '../components/ParentTeacherChat';
import AppointmentScheduler from '../components/AppointmentScheduler';
import BehaviorAlertPanel from '../components/BehaviorAlertPanel';
import './ParentCommunicationPage.css';

export default function ParentCommunicationPage() {
  const { token, user } = useAuth();
  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'appointments' | 'alerts'>('chat');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) loadStudents();
  }, [token]);

  const loadStudents = async () => {
    try {
      const parent = await parentApi.getMe(token!);
      const { students: studentList } = await parentApi.getStudents(token!, parent.id);
      setStudents(studentList);
      if (studentList.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentList[0].student.id);
        // For demo, use a default teacher ID
        setSelectedTeacherId('demo-teacher');
      }
    } catch (err) {
      console.error('Failed to load students:', err);
      // Demo data
      setStudents([
        {
          relationId: 'rel-1',
          relationship: 'parent',
          isPrimary: true,
          linkedAt: new Date().toISOString(),
          student: {
            id: 'demo-student',
            name: 'Nguyễn Văn A',
            email: null,
            avatarUrl: null,
            gradeLevel: 3,
            schoolName: 'RoboKids',
          },
        },
      ]);
      setSelectedStudentId('demo-student');
      setSelectedTeacherId('demo-teacher');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pcp-loading">
        <div className="pcp-spinner"></div>
        <span>Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="pcp-container">
      {/* Header */}
      <div className="pcp-header">
        <div className="pcp-header-left">
          <h1>💬 Giao tiếp với giáo viên</h1>
          <p>Nhắn tin, đặt lịch hẹn và nhận thông báo về con</p>
        </div>
        {students.length > 0 && (
          <div className="pcp-student-selector">
            <label>👤 Chọn học sinh:</label>
            <select
              value={selectedStudentId || ''}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="pcp-select"
            >
              {students.map(s => (
                <option key={s.student.id} value={s.student.id}>
                  {s.student.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="pcp-tabs">
        <button
          className={`pcp-tab ${activeTab === 'chat' ? 'pcp-tab-active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Nhắn tin
        </button>
        <button
          className={`pcp-tab ${activeTab === 'appointments' ? 'pcp-tab-active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          📅 Lịch hẹn
        </button>
        <button
          className={`pcp-tab ${activeTab === 'alerts' ? 'pcp-tab-active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          🔔 Thông báo
        </button>
      </div>

      {/* Content */}
      <div className="pcp-content">
        {activeTab === 'chat' && (
          <div className="pcp-chat-section">
            <div className="pcp-section-header">
              <h2>Nhắn tin với giáo viên</h2>
              <p>Gửi tin nhắn trực tiếp đến giáo viên của con bạn</p>
            </div>
            <div className="pcp-chat-wrapper">
              <ParentTeacherChat
                studentId={selectedStudentId || undefined}
                teacherId={selectedTeacherId || undefined}
              />
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="pcp-appointments-section">
            <div className="pcp-section-header">
              <h2>Lịch hẹn với giáo viên</h2>
              <p>Đặt lịch hẹn họp phụ huynh, xem tiến độ hoặc trao đổi về con</p>
            </div>
            <div className="pcp-appointments-wrapper">
              <AppointmentScheduler
                studentId={selectedStudentId || undefined}
                teacherId={selectedTeacherId || undefined}
              />
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="pcp-alerts-section">
            <div className="pcp-section-header">
              <h2>Thông báo từ giáo viên</h2>
              <p>Nhận thông báo về thành tích, hành vi và tiến độ học tập của con</p>
            </div>
            <div className="pcp-alerts-wrapper">
              <BehaviorAlertPanel
                studentId={selectedStudentId || undefined}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="pcp-quick-actions">
        <div className="pcp-quick-card" onClick={() => setActiveTab('chat')}>
          <span className="pcp-quick-icon">💬</span>
          <span className="pcp-quick-label">Nhắn tin</span>
        </div>
        <div className="pcp-quick-card" onClick={() => setActiveTab('appointments')}>
          <span className="pcp-quick-icon">📅</span>
          <span className="pcp-quick-label">Đặt lịch hẹn</span>
        </div>
        <div className="pcp-quick-card" onClick={() => setActiveTab('alerts')}>
          <span className="pcp-quick-icon">🔔</span>
          <span className="pcp-quick-label">Thông báo</span>
        </div>
      </div>
    </div>
  );
}
