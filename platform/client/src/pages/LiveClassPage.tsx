/**
 * LiveClassPage - Schedule and join live sessions with teachers
 * MVP: Schedule + link to video meeting (Zoom/Meet/Jitsi)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { liveClassApi } from '../services/liveClassApi';
import { useAuth } from '../context/AuthContext';

interface LiveClass {
  id: string;
  title: string;
  teacherName: string;
  teacherAvatar: string;
  scheduledAt: string;
  duration: number; // minutes
  maxStudents: number;
  currentStudents: number;
  meetingLink: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  price: number;
  description: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'short' });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getTimeRemaining(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) return 'Đã bắt đầu';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 24) {
    const days = Math.floor(diffHours / 24);
    return `Còn ${days} ngày`;
  }
  if (diffHours > 0) return `Còn ${diffHours}h ${diffMins}p`;
  return `Còn ${diffMins} phút`;
}

export default function LiveClassPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [myClasses, setMyClasses] = useState<LiveClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<LiveClass | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    Promise.all([
      liveClassApi.getSessions(),
      liveClassApi.getEnrollments()
    ])
      .then(([sessionsResp, enrollmentsResp]) => {
        const allSessions: LiveClass[] = (sessionsResp.sessions || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          teacherName: s.teacherName || s.teacher_name || 'Teacher',
          teacherAvatar: s.teacherAvatar || s.teacher_avatar || '👨‍🏫',
          scheduledAt: s.scheduledAt || s.scheduled_at || s.scheduledAt,
          duration: s.duration || 45,
          maxStudents: s.maxStudents || s.max_students || 6,
          currentStudents: s.currentStudents || s.current_students || 0,
          meetingLink: s.meetingLink || s.meeting_link || '',
          status: s.status || 'upcoming',
          price: s.price || 15,
          description: s.description || '',
        }));

        const mySessionIds = new Set((enrollmentsResp.enrollments || []).map((e: any) => e.sessionId || e.session_id));
        setMyClasses(allSessions.filter(s => mySessionIds.has(s.id)));
        setClasses(allSessions.filter(s => s.status === 'upcoming'));
      })
      .catch((err: any) => setError(err.message || 'Failed to load classes'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleJoinClass = (liveClass: LiveClass) => {
    setSelectedClass(liveClass);
    setShowJoinModal(true);
  };

  const openMeetingLink = () => {
    if (selectedClass?.meetingLink) {
      window.open(selectedClass.meetingLink, '_blank');
      setShowJoinModal(false);
    }
  };

  const joinWithEmbeddedVideo = () => {
    if (selectedClass) {
      navigate(`/live-class/${selectedClass.id}`);
      setShowJoinModal(false);
    }
  };

  const handleEnroll = async (classId: string) => {
    if (!token) return;
    setEnrollingId(classId);
    try {
      await liveClassApi.enroll(classId);
      // Refresh data
      const [sessionsResp, enrollmentsResp] = await Promise.all([
        liveClassApi.getSessions(),
        liveClassApi.getEnrollments()
      ]);
      const allSessions: LiveClass[] = (sessionsResp.sessions || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        teacherName: s.teacherName || s.teacher_name || 'Teacher',
        teacherAvatar: s.teacherAvatar || s.teacher_avatar || '👨‍🏫',
        scheduledAt: s.scheduledAt || s.scheduled_at,
        duration: s.duration || 45,
        maxStudents: s.maxStudents || s.max_students || 6,
        currentStudents: s.currentStudents || s.current_students || 0,
        meetingLink: s.meetingLink || s.meeting_link || '',
        status: s.status || 'upcoming',
        price: s.price || 15,
        description: s.description || '',
      }));
      const mySessionIds = new Set((enrollmentsResp.enrollments || []).map((e: any) => e.sessionId || e.session_id));
      setMyClasses(allSessions.filter(s => mySessionIds.has(s.id)));
      setClasses(allSessions.filter(s => s.status === 'upcoming'));
    } catch (err: any) {
      setError(err.message || 'Failed to enroll');
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/')} style={styles.backBtn}>
          ← Trang chủ
        </button>
        <h1 style={styles.title}>📹 Lớp học Live</h1>
        <div style={styles.headerRight}>
          <span style={styles.priceNote}>Giá: $10-20/class</span>
        </div>
      </div>

      <div style={styles.container}>
        {/* Loading / Error states */}
        {isLoading ? (
          <div style={styles.loading}>
            <span style={styles.loadingIcon}>🤖</span>
            <p>Đang tải lớp học...</p>
          </div>
        ) : error ? (
          <div style={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} style={styles.errorDismiss}>×</button>
          </div>
        ) : (
          <>
        {/* Hero banner */}
        <div style={styles.hero}>
          <div style={styles.heroIcon}>🎥</div>
          <h2 style={styles.heroTitle}>Học với Teacher thật!</h2>
          <p style={styles.heroDesc}>
            Kết hợp RoboBuddy AI và live teacher để học hiệu quả nhất.
            Đặt lịch 1-on-1 hoặc group (tối đa 6 học sinh).
          </p>
        </div>

        {/* My scheduled classes */}
        {myClasses.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>📅 Lớp của tôi</h2>
            <div style={styles.classGrid}>
              {myClasses.map(liveClass => (
                <div key={liveClass.id} style={styles.classCard}>
                  <div style={styles.classHeader}>
                    <span style={styles.statusBadge}>⏰ {getTimeRemaining(liveClass.scheduledAt)}</span>
                    <span style={styles.spotsLeft}>{liveClass.maxStudents - liveClass.currentStudents} chỗ trống</span>
                  </div>
                  <h3 style={styles.classTitle}>{liveClass.title}</h3>
                  <div style={styles.teacherRow}>
                    <span style={styles.teacherAvatar}>{liveClass.teacherAvatar}</span>
                    <span style={styles.teacherName}>{liveClass.teacherName}</span>
                  </div>
                  <div style={styles.classMeta}>
                    <span>📅 {formatDate(liveClass.scheduledAt)}</span>
                    <span>🕐 {formatTime(liveClass.scheduledAt)}</span>
                    <span>⏱ {liveClass.duration} phút</span>
                  </div>
                  <button onClick={() => handleJoinClass(liveClass)} style={styles.joinBtn}>
                    🎮 Vào lớp
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All upcoming classes */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Lớp học sắp tới</h2>
          {classes.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📅</span>
              <p>Không có lớp học nào sắp tới. Hãy quay lại sau!</p>
            </div>
          ) : (
            <div style={styles.classGrid}>
              {classes.map(liveClass => (
              <div key={liveClass.id} style={styles.classCard}>
                <div style={styles.classHeader}>
                  <span style={styles.ageGroup}>6-12 tuổi</span>
                  <span style={styles.priceTag}>${liveClass.price}/class</span>
                </div>
                <h3 style={styles.classTitle}>{liveClass.title}</h3>
                <p style={styles.classDesc}>{liveClass.description}</p>
                <div style={styles.teacherRow}>
                  <span style={styles.teacherAvatar}>{liveClass.teacherAvatar}</span>
                  <span style={styles.teacherName}>{liveClass.teacherName}</span>
                </div>
                <div style={styles.classMeta}>
                  <span>📅 {formatDate(liveClass.scheduledAt)}</span>
                  <span>🕐 {formatTime(liveClass.scheduledAt)}</span>
                  <span>👥 {liveClass.currentStudents}/{liveClass.maxStudents}</span>
                </div>
                <button
                  onClick={() => handleEnroll(liveClass.id)}
                  style={{
                    ...styles.joinBtn,
                    ...(liveClass.currentStudents >= liveClass.maxStudents ? styles.joinBtnDisabled : {}),
                  }}
                  disabled={liveClass.currentStudents >= liveClass.maxStudents || enrollingId === liveClass.id}
                >
                  {enrollingId === liveClass.id ? '⏳ Đang đặt...' : liveClass.currentStudents >= liveClass.maxStudents ? '❌ Hết chỗ' : '📅 Đặt lịch'}
                </button>
              </div>
            ))}
          </div>
          )}
        </section>
          </>
        )}
        {/* Info section */}
        <section style={styles.infoSection}>
          <h2 style={styles.infoTitle}>💡 Thông tin Live Class</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoCard}>
              <span style={styles.infoIcon}>💰</span>
              <h4>Giá cả</h4>
              <p>$10-20/class tùy độ khó</p>
              <p>Teacher được $5-10/class</p>
            </div>
            <div style={styles.infoCard}>
              <span style={styles.infoIcon}>👥</span>
              <h4>Quy mô</h4>
              <p>1-on-1 hoặc nhóm (max 6)</p>
              <p>Đủ students sẽ mở class</p>
            </div>
            <div style={styles.infoCard}>
              <span style={styles.infoIcon}>🎥</span>
              <h4>Nền tảng</h4>
              <p>Zoom, Google Meet, Jitsi</p>
              <p>Dùng link để join</p>
            </div>
          </div>
        </section>
      </div>

      {/* Join modal */}
      {showJoinModal && selectedClass && (
        <div style={styles.modalOverlay} onClick={() => setShowJoinModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{selectedClass.title}</h2>
            <div style={styles.modalTeacher}>
              <span style={styles.modalAvatar}>{selectedClass.teacherAvatar}</span>
              <span>Giáo viên: {selectedClass.teacherName}</span>
            </div>
            <div style={styles.modalInfo}>
              <p>📅 {formatDate(selectedClass.scheduledAt)} lúc {formatTime(selectedClass.scheduledAt)}</p>
              <p>⏱ Thời lượng: {selectedClass.duration} phút</p>
              <p>💵 Phí: ${selectedClass.price}</p>
            </div>
            <p style={styles.modalNote}>
              Chọn cách tham gia video call. Đảm bảo camera và microphone đã sẵn sàng!
            </p>
            <div style={styles.modalBtns}>
              <button onClick={() => setShowJoinModal(false)} style={styles.cancelBtn}>
                Hủy
              </button>
              <button onClick={openMeetingLink} style={styles.externalBtn}>
                🔗 Zoom/Meet
              </button>
              <button onClick={joinWithEmbeddedVideo} style={styles.embeddedBtn}>
                🎥 Jitsi (embedded)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f0f4ff',
  },
  header: {
    backgroundColor: '#667eea',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    opacity: 0.9,
  },
  title: {
    flex: 1,
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  priceNote: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '12px',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
  },
  hero: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '20px',
    padding: '24px',
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  heroIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  heroTitle: {
    color: 'white',
    fontSize: '22px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '14px',
    margin: 0,
    lineHeight: 1.5,
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
  },
  classGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  classCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  classHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  statusBadge: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  spotsLeft: {
    color: '#4CAF50',
    fontSize: '12px',
    fontWeight: 600,
  },
  ageGroup: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  priceTag: {
    color: '#667eea',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  classTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
  },
  classDesc: {
    fontSize: '13px',
    color: '#666',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  teacherRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  teacherAvatar: {
    fontSize: '24px',
  },
  teacherName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#555',
  },
  classMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#888',
    marginBottom: '14px',
    flexWrap: 'wrap' as const,
  },
  joinBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  joinBtnDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  infoSection: {
    marginTop: '32px',
    marginBottom: '40px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#666',
  },
  loadingIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  infoTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
  },
  infoIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '8px',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 12px 0',
  },
  modalTeacher: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: '14px',
    color: '#555',
  },
  modalAvatar: {
    fontSize: '24px',
  },
  modalInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '12px',
  },
  modalNote: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '16px',
    lineHeight: 1.5,
  },
  modalBtns: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#e0e0e0',
    color: '#555',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmBtn: {
    flex: 2,
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  externalBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  embeddedBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};