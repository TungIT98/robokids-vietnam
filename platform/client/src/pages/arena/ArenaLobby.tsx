/**
 * ArenaLobby - Multiplayer game room browser and creator
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { colyseusService, GameRoom } from '../../services/colyseusService';

export default function ArenaLobby() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const availableRooms = await colyseusService.getAvailableRooms();
      setRooms(availableRooms);
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [loadRooms]);

  async function handleCreateRoom() {
    setIsCreating(true);
    setError(null);
    try {
      const { roomId } = await colyseusService.createRoom();
      navigate(`/arena/${roomId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinRoom(roomId: string) {
    try {
      await colyseusService.joinRoom(roomId);
      navigate(`/arena/${roomId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    }
  }

  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      await colyseusService.joinRoom(joinCode.trim());
      navigate(`/arena/${joinCode.trim()}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    }
  }

  function getStatusBadge(status: GameRoom['status']) {
    const config: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
      waiting: { label: 'Đợi người chơi', emoji: '⏳', color: '#22c55e', bgColor: '#dcfce7' },
      countdown: { label: 'Sắp bắt đầu', emoji: '🔢', color: '#eab308', bgColor: '#fef9c3' },
      playing: { label: 'Đang chơi', emoji: '🎮', color: '#ef4444', bgColor: '#fef2f2' },
      ended: { label: 'Đã kết thúc', emoji: '✅', color: '#6b7280', bgColor: '#f3f4f6' },
    };
    return config[status] || config.waiting;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.pageTitle}>🎮 Sumo Battle Arena</h1>
          <p style={styles.pageSubtitle}>Thử thách robot đối kháng 2 người chơi</p>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <button
          onClick={handleCreateRoom}
          disabled={isCreating}
          style={styles.createButton}
        >
          {isCreating ? '⏳ Đang tạo...' : '➕ Tạo phòng mới'}
        </button>

        <form onSubmit={handleJoinByCode} style={styles.joinCodeForm}>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Nhập mã phòng..."
            style={styles.joinCodeInput}
          />
          <button type="submit" style={styles.joinCodeButton}>
            🚀 Vào phòng
          </button>
        </form>
      </div>

      {/* Room List */}
      <div style={styles.content}>
        {error && (
          <div style={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} style={styles.errorDismiss}>×</button>
          </div>
        )}

        {isLoading ? (
          <div style={styles.loading}>
            <span style={styles.loadingEmoji}>🤖</span>
            <p>Đang tải phòng...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🎮</span>
            <h2>Chưa có phòng nào</h2>
            <p>Tạo phòng mới để bắt đầu thi đấu!</p>
            <button onClick={handleCreateRoom} style={styles.emptyCreateButton}>
              ➕ Tạo phòng đầu tiên
            </button>
          </div>
        ) : (
          <div style={styles.roomList}>
            {rooms.map((room) => {
              const statusBadge = getStatusBadge(room.status);
              return (
                <div key={room.roomId} style={styles.roomCard}>
                  <div style={styles.roomHeader}>
                    <h3 style={styles.roomName}>{room.roomName || `Phòng ${room.roomId.slice(0, 8)}`}</h3>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: statusBadge.bgColor,
                      color: statusBadge.color,
                    }}>
                      {statusBadge.emoji} {statusBadge.label}
                    </span>
                  </div>

                  <div style={styles.roomInfo}>
                    <span style={styles.roomInfoItem}>👤 Host: {room.hostName || 'Không rõ'}</span>
                    <span style={styles.roomInfoItem}>👥 {room.players}/{room.maxPlayers} người chơi</span>
                  </div>

                  <div style={styles.roomActions}>
                    <button
                      onClick={() => handleJoinRoom(room.roomId)}
                      disabled={room.status !== 'waiting' || room.players >= room.maxPlayers}
                      style={{
                        ...styles.joinButton,
                        opacity: (room.status !== 'waiting' || room.players >= room.maxPlayers) ? 0.5 : 1,
                      }}
                    >
                      {room.status === 'waiting' ? '🚀 Vào phòng' : '🔒 Không thể vào'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Refresh hint */}
      <div style={styles.refreshHint}>
        <button onClick={loadRooms} style={styles.refreshButton}>
          🔄 Làm mới danh sách
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  header: {
    background: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
    color: 'white',
    padding: '32px 24px',
  },
  headerContent: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    marginBottom: '4px',
  },
  pageSubtitle: {
    fontSize: '16px',
    opacity: 0.9,
    margin: 0,
  },
  controls: {
    padding: '16px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
  },
  createButton: {
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  joinCodeForm: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    minWidth: '280px',
  },
  joinCodeInput: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '12px',
    border: '2px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
  },
  joinCodeButton: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#f97316',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  content: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  errorBanner: {
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#ef4444',
  },
  loading: {
    textAlign: 'center',
    padding: '48px 24px',
    color: '#666',
  },
  loadingEmoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  emptyIcon: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyCreateButton: {
    marginTop: '16px',
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  roomCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  roomHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    color: '#1f2937',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  roomInfo: {
    display: 'flex',
    gap: '16px',
    color: '#666',
    fontSize: '14px',
  },
  roomInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  roomActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  joinButton: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#f97316',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  refreshHint: {
    padding: '16px 24px',
    textAlign: 'center',
  },
  refreshButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
  },
};
