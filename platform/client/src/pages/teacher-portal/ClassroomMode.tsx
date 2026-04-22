/**
 * ClassroomModePage - Teacher-controlled classroom mode
 * Features:
 * - Teacher broadcasts instructions
 * - Lock/unlock activities
 * - Real-time student progress view
 * - Chat moderation controls
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useClassroomStore, type ClassroomStudent } from '../../stores/classroomStore';
import { pocketbase, isPocketBaseConfigured } from '../../services/pocketbase';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './ClassroomMode.module.css';

interface ClassInfo {
  id: string;
  name: string;
  grade_level: number;
}

interface ActivityOption {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const ACTIVITIES: ActivityOption[] = [
  { id: 'coding', label: 'Coding', icon: '💻', description: 'Blockly IDE' },
  { id: 'reading', label: 'Reading', icon: '📖', description: 'Lessons' },
  { id: 'quiz', label: 'Quiz', icon: '❓', description: 'Quiz mode' },
  { id: 'break', label: 'Break', icon: '☕', description: 'Break time' },
];

const LOCK_REASONS = [
  'Focus time',
  'Transition',
  'Assessment',
  'Discussion',
  'Other',
];

export default function ClassroomModePage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const {
    classroomId,
    className,
    teacherName,
    isActive,
    students,
    currentActivity,
    activityLockStatus,
    lockedActivities,
    lockReason,
    broadcastMessage,
    chatMessages,
    isChatModerationEnabled,
    flaggedMessages,
    setClassroom,
    setStudents,
    setCurrentActivity,
    lockActivity,
    unlockActivity,
    lockAllActivities,
    unlockAllActivities,
    broadcast,
    clearBroadcast,
    addChatMessage,
    flagMessage,
    unflagMessage,
    muteStudent,
    unmuteStudent,
    toggleChatModeration,
    clearChat,
    resetClassroom,
  } = useClassroomStore();

  // Local state
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [lockAllReason, setLockAllReason] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [showLockModal, setShowLockModal] = useState(false);
  const [showBroadcastPanel, setShowBroadcastPanel] = useState(true);
  const [showChatPanel, setShowChatPanel] = useState(true);

  // Fetch teacher's classes
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
      if (classList.length > 0 && !selectedClassId) {
        setSelectedClassId(classList[0].id);
      }
    } catch (err) {
      console.warn('Failed to fetch classes:', err);
    }
  }, [user?.school_id, token, selectedClassId]);

  // Fetch students for classroom
  const fetchStudents = useCallback(async () => {
    if (!selectedClassId || !user?.school_id) return;

    setIsLoading(true);
    try {
      let studentsData: any[] = [];

      if (isPocketBaseConfigured() && pocketbase) {
        try {
          const result = await pocketbase.collection('users').getList(1, 100, {
            filter: `role='student' && class_id='${selectedClassId}'`,
          });
          studentsData = result.items;
        } catch (e) {
          const restData = await schoolsApi.listStudents(
            user.school_id!,
            { class_id: selectedClassId },
            { token }
          );
          studentsData = restData.students || [];
        }
      } else {
        const restData = await schoolsApi.listStudents(
          user.school_id!,
          { class_id: selectedClassId },
          { token }
        );
        studentsData = restData.students || [];
      }

      const classroomStudents: ClassroomStudent[] = studentsData.map((s: any) => ({
        id: s.id,
        name: s.name || s.email || 'Unknown',
        email: s.email || '',
        avatar: (s.name || s.email || 'U').charAt(0).toUpperCase(),
        status: 'offline',
        currentActivity: null,
        progressPercent: 0,
        lastActivityAt: null,
        isLocked: false,
        lockReason: null,
        lockExpiresAt: null,
      }));

      setStudents(classroomStudents);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, user?.school_id, token, setStudents]);

  // Initialize classroom when class is selected
  useEffect(() => {
    if (selectedClassId && user) {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (selectedClass) {
        setClassroom(selectedClassId, selectedClass.name, user.name || user.email || 'Teacher');
      }
    }
  }, [selectedClassId, user, classes, setClassroom]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      await fetchClasses();
    };
    init();
  }, [fetchClasses]);

  // Fetch students when class changes
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents();
    }
  }, [selectedClassId, fetchStudents]);

  // Simulated student status updates (in real app, use WebSocket)
  useEffect(() => {
    if (!isActive || students.length === 0) return;

    const interval = setInterval(() => {
      // Randomly update student statuses for demo
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      if (randomStudent) {
        const statuses: ClassroomStudent['status'][] = ['online', 'idle', 'coding', 'offline'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        // updateStudentStatus(randomStudent.id, randomStatus);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isActive, students]);

  // Broadcast message to all students
  const handleBroadcast = () => {
    if (!broadcastText.trim()) return;
    broadcast(broadcastText, broadcastPriority);
    setBroadcastText('');
  };

  // Lock all students with reason
  const handleLockAll = () => {
    if (!lockAllReason.trim()) return;
    lockAllActivities(lockAllReason);
    setLockAllReason('');
    setShowLockModal(false);
  };

  // Send chat message (teacher to students)
  const handleSendChat = () => {
    if (!newChatMessage.trim()) return;
    addChatMessage({
      studentId: user?.id || 'teacher',
      studentName: user?.name || user?.email || 'Giáo viên',
      content: newChatMessage,
    });
    setNewChatMessage('');
  };

  // Get status color
  const getStatusColor = (status: ClassroomStudent['status']): string => {
    switch (status) {
      case 'online': return '#10b981';
      case 'coding': return '#3b82f6';
      case 'idle': return '#f59e0b';
      case 'offline': return '#94a3b8';
    }
  };

  // Get status icon
  const getStatusIcon = (status: ClassroomStudent['status']): string => {
    switch (status) {
      case 'online': return '🟢';
      case 'coding': return '🔵';
      case 'idle': return '🟡';
      case 'offline': return '⚪';
    }
  };

  // Format time
  const formatTime = (dateStr: string | null): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className={styles.loading}>
        <p>Vui lòng đăng nhập để sử dụng Classroom Mode.</p>
        <button onClick={() => navigate('/login')}>Đăng nhập</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => navigate('/teacher/dashboard')} className={styles.backBtn}>
            ← Quay lại
          </button>
          <div className={styles.headerTitle}>
            <h1>📚 Classroom Mode</h1>
            <span className={styles.classLabel}>{className || 'Chọn lớp'}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.controls}>
            <button
              className={`${styles.toggleBtn} ${showBroadcastPanel ? styles.active : ''}`}
              onClick={() => setShowBroadcastPanel(!showBroadcastPanel)}
              title="Broadcast Panel"
            >
              📢 Điều khiển
            </button>
            <button
              className={`${styles.toggleBtn} ${showChatPanel ? styles.active : ''}`}
              onClick={() => setShowChatPanel(!showChatPanel)}
              title="Chat Panel"
            >
              💬 Chat
            </button>
            <button
              className={`${styles.toggleBtn} ${activityLockStatus === 'locked' ? styles.locked : ''}`}
              onClick={() => setShowLockModal(true)}
            >
              {activityLockStatus === 'locked' ? '🔒 Mở khóa' : '🔓 Khóa'}
            </button>
          </div>
          <div className={styles.teacherBadge}>
            👨‍🏫 {teacherName || user.name || 'Giáo viên'}
          </div>
        </div>
      </header>

      {/* Class Selector */}
      <div className={styles.classSelector}>
        <label>Chọn lớp học:</label>
        <select
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
          className={styles.classSelect}
        >
          <option value="">-- Chọn lớp --</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>
              {cls.name} - Lớp {cls.grade_level}
            </option>
          ))}
        </select>
        <div className={styles.studentCount}>
          👨‍🎓 {students.length} học sinh
        </div>
      </div>

      {/* Active Broadcast Banner */}
      {broadcastMessage && (
        <div className={`${styles.broadcastBanner} ${styles[broadcastMessage.priority]}`}>
          <div className={styles.broadcastContent}>
            <span className={styles.broadcastLabel}>
              {broadcastMessage.priority === 'urgent' ? '🚨' : broadcastMessage.priority === 'high' ? '⚠️' : '📢'}
              Tin nhắn từ Teacher:
            </span>
            <span className={styles.broadcastText}>{broadcastMessage.content}</span>
            <span className={styles.broadcastTime}>{formatTime(broadcastMessage.timestamp)}</span>
          </div>
          <button onClick={clearBroadcast} className={styles.dismissBtn}>×</button>
        </div>
      )}

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Panel: Activity Controls & Student Grid */}
        <div className={styles.leftPanel}>
          {/* Activity Selector */}
          <div className={styles.activityPanel}>
            <h3>Hoạt động hiện tại</h3>
            <div className={styles.activityGrid}>
              {ACTIVITIES.map(activity => (
                <button
                  key={activity.id}
                  className={`${styles.activityBtn} ${currentActivity === activity.id ? styles.active : ''}`}
                  onClick={() => setCurrentActivity(activity.id as any)}
                >
                  <span className={styles.activityIcon}>{activity.icon}</span>
                  <span className={styles.activityLabel}>{activity.label}</span>
                  <span className={styles.activityDesc}>{activity.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Student Grid */}
          <div className={styles.studentPanel}>
            <h3>Danh sách học sinh ({students.length})</h3>
            {isLoading ? (
              <div className={styles.loadingStudents}>
                <span>⏳ Đang tải...</span>
              </div>
            ) : students.length === 0 ? (
              <div className={styles.emptyStudents}>
                <span>👨‍🎓 Chưa có học sinh nào trong lớp</span>
              </div>
            ) : (
              <div className={styles.studentGrid}>
                {students.map(student => (
                  <div
                    key={student.id}
                    className={`${styles.studentCard} ${student.isLocked ? styles.locked : ''}`}
                  >
                    <div className={styles.studentHeader}>
                      <div className={styles.studentAvatar}>
                        {student.avatar}
                      </div>
                      <div className={styles.studentInfo}>
                        <span className={styles.studentName}>{student.name}</span>
                        <span
                          className={styles.studentStatus}
                          style={{ color: getStatusColor(student.status) }}
                        >
                          {getStatusIcon(student.status)} {student.status}
                        </span>
                      </div>
                      {student.isLocked && (
                        <span className={styles.lockBadge} title={student.lockReason || 'Đã khóa'}>
                          🔒
                        </span>
                      )}
                    </div>
                    <div className={styles.studentProgress}>
                      <div className={styles.progressLabel}>
                        <span>Tiến độ</span>
                        <span>{student.progressPercent}%</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${student.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    {student.currentActivity && (
                      <div className={styles.studentActivity}>
                        📍 {student.currentActivity}
                      </div>
                    )}
                    <div className={styles.studentActions}>
                      {student.isLocked ? (
                        <button
                          onClick={() => unlockActivity(student.id)}
                          className={styles.unlockBtn}
                        >
                          Mở khóa
                        </button>
                      ) : (
                        <button
                          onClick={() => lockActivity(student.id, 'Teacher locked')}
                          className={styles.lockBtn}
                        >
                          Khóa
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Broadcast & Chat */}
        {showBroadcastPanel && (
          <div className={styles.rightPanel}>
            {/* Broadcast Control */}
            <div className={styles.broadcastPanel}>
              <h3>📢 Gửi thông báo</h3>
              <div className={styles.broadcastForm}>
                <textarea
                  value={broadcastText}
                  onChange={e => setBroadcastText(e.target.value)}
                  placeholder="Nhập thông báo cho học sinh..."
                  className={styles.broadcastInput}
                  rows={3}
                />
                <div className={styles.prioritySelector}>
                  <label>Độ ưu tiên:</label>
                  <div className={styles.priorityBtns}>
                    <button
                      className={`${styles.priorityBtn} ${broadcastPriority === 'normal' ? styles.active : ''}`}
                      onClick={() => setBroadcastPriority('normal')}
                    >
                      Bình thường
                    </button>
                    <button
                      className={`${styles.priorityBtn} ${broadcastPriority === 'high' ? styles.active : ''}`}
                      onClick={() => setBroadcastPriority('high')}
                    >
                      Quan trọng
                    </button>
                    <button
                      className={`${styles.priorityBtn} ${broadcastPriority === 'urgent' ? styles.active : ''}`}
                      onClick={() => setBroadcastPriority('urgent')}
                    >
                      Khẩn cấp
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleBroadcast}
                  disabled={!broadcastText.trim()}
                  className={styles.sendBroadcastBtn}
                >
                  📢 Gửi thông báo
                </button>
              </div>
            </div>
          </div>
        )}

        {showChatPanel && (
          <div className={styles.chatPanel}>
            {/* Chat Moderation */}
            <div className={styles.chatSection}>
              <div className={styles.chatHeader}>
                <h3>💬 Chat</h3>
                <button
                  className={`${styles.moderationToggle} ${isChatModerationEnabled ? styles.active : ''}`}
                  onClick={() => toggleChatModeration(!isChatModerationEnabled)}
                >
                  {isChatModerationEnabled ? '🔒 Bật kiểm duyệt' : '🔓 Tắt kiểm duyệt'}
                </button>
              </div>

              {/* Chat Messages */}
              <div className={styles.chatMessages}>
                {chatMessages.length === 0 ? (
                  <div className={styles.emptyChat}>
                    <span>Chưa có tin nhắn</span>
                  </div>
                ) : (
                  chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`${styles.chatMessage} ${msg.isFlagged ? styles.flagged : ''} ${msg.isMuted ? styles.muted : ''}`}
                    >
                      <div className={styles.messageHeader}>
                        <span className={styles.messageSender}>{msg.studentName}</span>
                        <span className={styles.messageTime}>{formatTime(msg.timestamp)}</span>
                      </div>
                      <div className={styles.messageContent}>{msg.content}</div>
                      <div className={styles.messageActions}>
                        {msg.isFlagged ? (
                          <button onClick={() => unflagMessage(msg.id)} title="Bỏ báo cáo">
                            ✅ Bỏ
                          </button>
                        ) : (
                          <button onClick={() => flagMessage(msg.id)} title="Báo cáo">
                            🚩 Báo cáo
                          </button>
                        )}
                        <button
                          onClick={() => msg.isMuted ? unmuteStudent(msg.studentId) : muteStudent(msg.studentId)}
                          title={msg.isMuted ? 'Bỏ mute' : 'Mute'}
                        >
                          {msg.isMuted ? '🔊' : '🔇'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className={styles.chatInputArea}>
                <input
                  type="text"
                  value={newChatMessage}
                  onChange={e => setNewChatMessage(e.target.value)}
                  placeholder="Nhắn tin cho học sinh..."
                  className={styles.chatInput}
                  onKeyPress={e => e.key === 'Enter' && handleSendChat()}
                />
                <button onClick={handleSendChat} className={styles.sendChatBtn}>
                  Gửi
                </button>
              </div>

              {/* Flagged Messages */}
              {flaggedMessages.length > 0 && (
                <div className={styles.flaggedSection}>
                  <h4>🚩 Tin nhắn bị báo cáo ({flaggedMessages.length})</h4>
                  <button onClick={clearChat} className={styles.clearChatBtn}>
                    Xóa tất cả tin nhắn
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lock All Modal */}
      {showLockModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLockModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>🔒 Khóa tất cả học sinh</h3>
            <div className={styles.modalContent}>
              <p>Chọn lý do khóa:</p>
              <select
                value={lockAllReason}
                onChange={e => setLockAllReason(e.target.value)}
                className={styles.reasonSelect}
              >
                <option value="">-- Chọn lý do --</option>
                {LOCK_REASONS.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
              {lockAllReason === 'Other' && (
                <input
                  type="text"
                  placeholder="Nhập lý do..."
                  className={styles.otherReasonInput}
                  onChange={e => setLockAllReason(e.target.value)}
                />
              )}
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowLockModal(false)} className={styles.cancelBtn}>
                Hủy
              </button>
              {activityLockStatus === 'locked' ? (
                <button onClick={unlockAllActivities} className={styles.unlockAllBtn}>
                  🔓 Mở khóa tất cả
                </button>
              ) : (
                <button
                  onClick={handleLockAll}
                  disabled={!lockAllReason.trim()}
                  className={styles.lockAllBtn}
                >
                  🔒 Khóa tất cả
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}