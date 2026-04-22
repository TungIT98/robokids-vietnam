/**
 * LiveClassRoom - Combined video + Blockly workspace for live classes
 * Kids can see their teacher on video while coding in Blockly together
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import JitsiMeetEmbed from '../components/JitsiMeetEmbed';
import LiveCodingSession from '../components/LiveCodingSession';

interface LiveClassSession {
  id: string;
  title: string;
  teacherName: string;
  teacherAvatar: string;
  scheduledAt: string;
  duration: number;
  maxStudents: number;
  currentStudents: number;
  meetingLink: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  price: number;
  description: string;
  jitsiRoom?: string;
}

function generateJitsiRoom(sessionId: string, teacherName: string): string {
  // Generate a consistent room name based on session and teacher
  const sanitizedTeacher = teacherName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const sanitizedSession = sessionId.slice(0, 8);
  return `robokids-${sanitizedTeacher}-${sanitizedSession}`;
}

export default function LiveClassRoom() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { token, user } = useAuth();
  const [session, setSession] = useState<LiveClassSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch session details
  useEffect(() => {
    if (!token || !sessionId) return;

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';
    fetch(`${API_BASE}/api/live-classes/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.session) {
          const s = data.session;
          setSession({
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
            jitsiRoom: s.jitsiRoom || generateJitsiRoom(s.id, s.teacherName || 'teacher'),
          });
        }
      })
      .catch((err: any) => setError(err.message || 'Failed to load session'))
      .finally(() => setIsLoading(false));
  }, [token, sessionId]);

  // Handle Jitsi events
  const handleConferenceJoined = useCallback(() => {
    console.log('Conference joined');
  }, []);

  const handleConferenceLeft = useCallback(() => {
    console.log('Conference left');
  }, []);

  // Handle Blockly XML sharing
  const handleShareBlockly = () => {
    // In collaborative mode, workspace is shared automatically via Colyseus
    // Just copy the session link
    const shareUrl = `${window.location.origin}/live-class/${session?.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open external meeting link
  const openExternalMeeting = () => {
    if (session?.meetingLink) {
      window.open(session.meetingLink, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingIcon}>🤖</div>
        <p style={styles.loadingText}>Đang kết nối lớp học...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <p style={styles.errorText}>{error || 'Không tìm thấy lớp học'}</p>
        <button onClick={() => navigate('/live-classes')} style={styles.backBtn}>
          ← Quay lại Live Classes
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/live-classes')} style={styles.closeBtn}>
          ✕
        </button>
        <div style={styles.headerInfo}>
          <span style={styles.sessionTitle}>{session.title}</span>
          <span style={styles.teacherInfo}>
            {session.teacherAvatar} với {session.teacherName}
          </span>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={() => setShowVideo(!showVideo)}
            style={styles.toggleVideoBtn}
          >
            {showVideo ? '🎥 Đang bật' : '🎥 Bật video'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={styles.mainContent}>
        {/* Video section */}
        {showVideo && (
          <div style={styles.videoSection}>
            <div style={styles.videoHeader}>
              <span style={styles.videoTitle}>📹 Video Call</span>
              <div style={styles.videoControls}>
                {session.meetingLink && (
                  <button onClick={openExternalMeeting} style={styles.externalLinkBtn}>
                    🔗 Mở trong Zoom/Meet
                  </button>
                )}
              </div>
            </div>
            <div style={styles.videoContainer}>
              {session.jitsiRoom && (
                <JitsiMeetEmbed
                  roomName={session.jitsiRoom}
                  displayName={user?.full_name || user?.email || 'Học sinh'}
                  height={showVideo ? 450 : 0}
                  onConferenceJoined={handleConferenceJoined}
                  onConferenceLeft={handleConferenceLeft}
                />
              )}
            </div>
          </div>
        )}

        {/* Blockly workspace section */}
        <div style={styles.blocklySection}>
          <div style={styles.blocklyHeader}>
            <span style={styles.blocklyTitle}>🤖 RoboKids Blockly</span>
            <button onClick={() => setShowShareModal(true)} style={styles.shareBtn}>
              🔗 Chia sẻ workspace
            </button>
          </div>
          <div style={styles.blocklyWorkspace}>
            {session.jitsiRoom && (
              <LiveCodingSession
                sessionId={session.id}
                roomName={session.jitsiRoom}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div style={styles.footer}>
        <span style={styles.duration}>
          ⏱ Thời gian: {session.duration} phút
        </span>
        <span style={styles.price}>
          💵 Phí: ${session.price}
        </span>
      </div>

      {/* Share Blockly Modal */}
      {showShareModal && (
        <div style={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>🔗 Chia sẻ Session</h2>
            <p style={styles.modalDesc}>
              Mời bạn bè tham gia session Blockly cùng lập trình robot!
            </p>
            <div style={styles.shareUrlBox}>
              <code style={styles.shareUrl}>
                {`${window.location.origin}/live-class/${session.id}`}
              </code>
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowShareModal(false)} style={styles.cancelBtn}>
                Đóng
              </button>
              <button
                onClick={handleShareBlockly}
                style={styles.copyBtn}
              >
                {copied ? '✓ Đã copy!' : '📋 Copy link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f0f4ff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#667eea',
    gap: '16px',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  sessionTitle: {
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  teacherInfo: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '12px',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  toggleVideoBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    padding: '16px',
    overflow: 'hidden',
  },
  videoSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  videoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #eee',
  },
  videoTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  videoControls: {
    display: 'flex',
    gap: '8px',
  },
  externalLinkBtn: {
    background: '#667eea',
    border: 'none',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    overflow: 'hidden',
  },
  blocklySection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1e1e1e',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  blocklyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #eee',
  },
  blocklyTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  shareBtn: {
    background: '#4CAF50',
    border: 'none',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  blocklyWorkspace: {
    flex: 1,
    overflow: 'hidden',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    padding: '12px',
    backgroundColor: 'white',
    borderTop: '1px solid #eee',
  },
  duration: {
    fontSize: '13px',
    color: '#666',
  },
  price: {
    fontSize: '13px',
    color: '#667eea',
    fontWeight: 'bold',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f0f4ff',
  },
  loadingIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  loadingText: {
    fontSize: '18px',
    color: '#666',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f0f4ff',
    gap: '16px',
  },
  errorIcon: {
    fontSize: '64px',
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
  },
  backBtn: {
    background: '#667eea',
    border: 'none',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
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
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
  },
  modalDesc: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 16px 0',
  },
  shareUrlBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    overflow: 'hidden',
  },
  shareUrl: {
    fontSize: '11px',
    color: '#333',
    wordBreak: 'break-all' as const,
  },
  noBlockly: {
    fontSize: '13px',
    color: '#999',
    fontStyle: 'italic' as const,
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#e0e0e0',
    color: '#555',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  copyBtn: {
    flex: 2,
    padding: '10px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};