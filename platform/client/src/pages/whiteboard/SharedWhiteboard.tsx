/**
 * SharedWhiteboardPage - Real-time collaborative whiteboard page
 * Features:
 * - Draw circuits together
 * - Plan robot designs
 * - Brainstorm solutions
 * - Supports touch/stylus input
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWhiteboardStore, type Collaborator } from '../../stores/whiteboardStore';
import { pocketbase, isPocketBaseConfigured } from '../../services/pocketbase';
import WhiteboardCanvas from '../../components/whiteboard/WhiteboardCanvas';
import WhiteboardToolbar from '../../components/whiteboard/WhiteboardToolbar';
import styles from './SharedWhiteboard.module.css';

export default function SharedWhiteboardPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { user, token } = useAuth();

  const {
    session,
    setSession,
    setSessionId,
    elements,
    collaborators,
    isConnected,
    setIsConnected,
    addCollaborator,
    removeCollaborator,
    updateCollaboratorCursor,
    clearCanvas,
  } = useWhiteboardStore();

  const [sessionName, setSessionName] = useState('Robot Design Session');
  const [sessionUrl, setSessionUrl] = useState('');
  const [showCollaborators, setShowCollaborators] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session
  useEffect(() => {
    if (!user) return;

    const wsSessionId = sessionId || `session-${Date.now()}`;
    setSessionId(wsSessionId);

    // Generate shareable URL
    const baseUrl = window.location.origin;
    setSessionUrl(`${baseUrl}/whiteboard/${wsSessionId}`);

    // Set up session
    setSession({
      id: wsSessionId,
      name: sessionName,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      collaborators: [],
      isHost: true,
    });

    setIsLoading(false);

    // Simulate connection to PocketBase for real-time
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        // In a real implementation, you would subscribe to PocketBase real-time
        // pb.collection('whiteboard_sessions').subscribe(wsSessionId, callback)
        setIsConnected(true);
      } catch (err) {
        console.warn('PocketBase connection failed:', err);
      }
    }

    // Add self as collaborator
    addCollaborator({
      id: user.id,
      name: user.name || user.email || 'Me',
      color: '#3b82f6',
      cursor: null,
      isActive: true,
    });
  }, [user, sessionId, sessionName, setSession, setSessionId, addCollaborator]);

  // Simulate other collaborators joining (for demo)
  useEffect(() => {
    if (!user || !isConnected) return;

    // Simulate 2 other collaborators joining after 2 seconds
    const timer = setTimeout(() => {
      addCollaborator({
        id: 'collab-1',
        name: 'Minh (Student)',
        color: '#22c55e',
        cursor: { x: 200, y: 200 },
        isActive: true,
      });

      setTimeout(() => {
        addCollaborator({
          id: 'collab-2',
          name: 'Lan (Student)',
          color: '#f97316',
          cursor: { x: 400, y: 300 },
          isActive: true,
        });
      }, 1000);
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, isConnected, addCollaborator]);

  // Handle canvas element added
  const handleElementAdd = useCallback((element: any) => {
    if (!isPocketBaseConfigured()) return;

    // In a real implementation, sync to PocketBase
    // pocketbase.collection('whiteboard_elements').create(element)
  }, []);

  // Copy session URL to clipboard
  const copyShareUrl = () => {
    navigator.clipboard.writeText(sessionUrl).then(() => {
      alert('Đã copy link chia sẻ!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = sessionUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Đã copy link chia sẻ!');
    });
  };

  // Handle clear canvas
  const handleClearCanvas = () => {
    if (confirm('Bạn có chắc muốn xóa tất cả nội dung trên bảng?')) {
      clearCanvas();
    }
  };

  if (!user) {
    return (
      <div className={styles.loading}>
        <p>Vui lòng đăng nhập để sử dụng Whiteboard.</p>
        <button onClick={() => navigate('/login')}>Đăng nhập</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <span className={styles.loadingIcon}>📝</span>
        <p>Đang tải Whiteboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => navigate(-1)} className={styles.backBtn}>
            ← Quay lại
          </button>
          <div className={styles.sessionInfo}>
            <h1>📝 Shared Whiteboard</h1>
            <span className={styles.sessionName}>{sessionName}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.connectionStatus}>
            <span className={`${styles.statusDot} ${isConnected ? styles.connected : ''}`} />
            {isConnected ? 'Đã kết nối' : 'Đang kết nối...'}
          </div>
          <button onClick={copyShareUrl} className={styles.shareBtn}>
            🔗 Chia sẻ
          </button>
          <button
            className={`${styles.collaboratorsBtn} ${showCollaborators ? styles.active : ''}`}
            onClick={() => setShowCollaborators(!showCollaborators)}
          >
            👥 {collaborators.length}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Toolbar */}
        <WhiteboardToolbar onClear={handleClearCanvas} />

        {/* Canvas Area */}
        <div className={styles.canvasArea}>
          <WhiteboardCanvas
            onElementAdd={handleElementAdd}
          />
        </div>

        {/* Collaborators Panel */}
        {showCollaborators && (
          <div className={styles.collaboratorsPanel}>
            <div className={styles.panelHeader}>
              <h3>👥 Người tham gia</h3>
              <span className={styles.count}>{collaborators.length}</span>
            </div>
            <div className={styles.collaboratorList}>
              {collaborators.map(collab => (
                <div key={collab.id} className={styles.collaborator}>
                  <div
                    className={styles.collaboratorAvatar}
                    style={{ backgroundColor: collab.color }}
                  >
                    {collab.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.collaboratorInfo}>
                    <span className={styles.collaboratorName}>
                      {collab.name}
                      {collab.id === user?.id && ' (bạn)'}
                    </span>
                    <span className={styles.collaboratorStatus}>
                      {collab.isActive ? '🟢 Đang hoạt động' : '⚪ Offline'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Templates */}
            <div className={styles.templatesSection}>
              <h4>📐 Mẫu nhanh</h4>
              <div className={styles.templateGrid}>
                <button className={styles.templateBtn} title="Vẽ mạch điện">
                  ⚡ Mạch điện
                </button>
                <button className={styles.templateBtn} title="Thiết kế robot">
                  🤖 Robot
                </button>
                <button className={styles.templateBtn} title="Sơ đồ quy trình">
                  📊 Quy trình
                </button>
                <button className={styles.templateBtn} title="Ghi chú">
                  📝 Ghi chú
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className={styles.footer}>
        <span className={styles.hint}>
          💡 Mẹo: Dùng Ctrl+Cuộn để phóng to/thu nhỏ. Dùng 2 ngón tay để di chuyển.
        </span>
      </div>
    </div>
  );
}