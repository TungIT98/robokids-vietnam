/**
 * GameArena - In-game arena component with real-time gameplay
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { colyseusService, GameState, PlayerState, ArenaRoom } from '../../services/colyseusService';
import { generateRobotCommands } from '../../components/generators/robotGenerator';
import ArenaCanvas from './ArenaCanvas';
import RobotSprite from './RobotSprite';

type GamePhase = 'waiting' | 'countdown' | 'playing' | 'ended';

interface GameContext {
  phase: GamePhase;
  countdown: number;
  players: Map<string, PlayerState>;
  mySessionId: string | null;
  room: ArenaRoom | null;
  winner: string | null;
}

export default function GameArena() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const blocklyWorkspaceRef = useRef<any>(null);

  const [gameContext, setGameContext] = useState<GameContext>({
    phase: 'waiting',
    countdown: 3,
    players: new Map(),
    mySessionId: null,
    room: null,
    winner: null,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commands, setCommands] = useState<string>('');

  // Set blockly workspace for command generation
  const setWorkspaceRef = useCallback((workspace: any) => {
    blocklyWorkspaceRef.current = workspace;
  }, []);

  // Connect to room on mount
  useEffect(() => {
    if (!roomId) {
      setError('Không có mã phòng');
      return;
    }

    async function connectToRoom() {
      try {
        const room = await colyseusService.joinRoom(roomId);
        setGameContext((prev) => ({
          ...prev,
          mySessionId: room.sessionId,
          room: room as ArenaRoom,
        }));
        setIsConnected(true);
      } catch (err: any) {
        setError(err.message || 'Không thể kết nối đến phòng');
      }
    }

    connectToRoom();

    return () => {
      colyseusService.leaveRoom();
    };
  }, [roomId]);

  // Set up Colyseus event listeners
  useEffect(() => {
    if (!isConnected) return;

    const handleStateChange = (state: GameState) => {
      setGameContext((prev) => ({
        ...prev,
        phase: state.phase as GamePhase,
        countdown: state.countdown || 3,
        players: state.players || new Map(),
        winner: state.winner,
      }));
    };

    const handleCountdown = (data: { count: number }) => {
      setGameContext((prev) => ({
        ...prev,
        phase: 'countdown',
        countdown: data.count,
      }));
    };

    const handleGameStart = () => {
      setGameContext((prev) => ({
        ...prev,
        phase: 'playing',
      }));
    };

    const handleGameEnd = (data: { winner: string }) => {
      setGameContext((prev) => ({
        ...prev,
        phase: 'ended',
        winner: data.winner,
      }));
    };

    colyseusService.on('stateChange', handleStateChange);
    colyseusService.on('countdown', handleCountdown);
    colyseusService.on('gameStart', handleGameStart);
    colyseusService.on('gameEnd', handleGameEnd);

    return () => {
      colyseusService.off('stateChange', handleStateChange);
      colyseusService.off('countdown', handleCountdown);
      colyseusService.off('gameStart', handleGameStart);
      colyseusService.off('gameEnd', handleGameEnd);
    };
  }, [isConnected]);

  // Send commands when user clicks "Run"
  function handleSendCommands() {
    if (!blocklyWorkspaceRef.current) {
      setError('Workspace chưa sẵn sàng');
      return;
    }

    try {
      const commandJson = generateRobotCommands(blocklyWorkspaceRef.current);
      setCommands(commandJson);
      colyseusService.sendPlayerInput(commandJson);
    } catch (err: any) {
      setError('Lỗi khi tạo lệnh: ' + err.message);
    }
  }

  function handleLeave() {
    colyseusService.leaveRoom();
    navigate('/arena');
  }

  // Get my player info
  const myPlayer = gameContext.mySessionId
    ? gameContext.players.get(gameContext.mySessionId)
    : null;

  // Get opponent info
  const opponent = gameContext.mySessionId
    ? Array.from(gameContext.players.values()).find((p) => p.sessionId !== gameContext.mySessionId)
    : null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>🎮 Sumo Battle</h1>
          <span style={styles.roomCode}>Mã phòng: {roomId?.slice(0, 8)}</span>
        </div>
        <div style={styles.headerRight}>
          <button onClick={handleLeave} style={styles.leaveButton}>
            ← Thoát
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={styles.errorDismiss}>×</button>
        </div>
      )}

      {/* Main game area */}
      <div style={styles.gameArea}>
        {/* Arena visualization */}
        <div style={styles.arenaContainer}>
          <ArenaCanvas
            players={gameContext.players}
            mySessionId={gameContext.mySessionId}
            phase={gameContext.phase}
          />
        </div>

        {/* Side panel */}
        <div style={styles.sidePanel}>
          {/* Game status */}
          <div style={styles.statusPanel}>
            <h3 style={styles.statusTitle}>Trạng thái trận đấu</h3>
            {gameContext.phase === 'waiting' && (
              <div style={styles.statusWaiting}>
                <span style={styles.waitingEmoji}>⏳</span>
                <p>Đang đợi người chơi khác...</p>
                <p style={styles.waitingHint}>Chia sẻ mã phòng để mời bạn bè!</p>
              </div>
            )}
            {gameContext.phase === 'countdown' && (
              <div style={styles.statusCountdown}>
                <span style={styles.countdownNumber}>{gameContext.countdown}</span>
                <p>Trận đấu sắp bắt đầu!</p>
              </div>
            )}
            {gameContext.phase === 'playing' && (
              <div style={styles.statusPlaying}>
                <span style={styles.playingEmoji}>🎮</span>
                <p>Trận đấu đang diễn ra!</p>
              </div>
            )}
            {gameContext.phase === 'ended' && (
              <div style={styles.statusEnded}>
                {gameContext.winner === gameContext.mySessionId ? (
                  <>
                    <span style={styles.winnerEmoji}>🏆</span>
                    <p style={styles.winnerText}>Chúc mừng! Bạn thắng!</p>
                  </>
                ) : (
                  <>
                    <span style={styles.loserEmoji}>😢</span>
                    <p style={styles.loserText}>Lần sau cố gắng hơn nhé!</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Players info */}
          <div style={styles.playersPanel}>
            <h3 style={styles.playersTitle}>Người chơi</h3>
            <div style={styles.playerList}>
              {Array.from(gameContext.players.values()).map((player) => (
                <div
                  key={player.sessionId}
                  style={{
                    ...styles.playerCard,
                    borderColor: player.sessionId === gameContext.mySessionId ? '#22c55e' : '#e0e0e0',
                  }}
                >
                  <span style={styles.playerName}>
                    {player.sessionId === gameContext.mySessionId ? '🤖 Bạn' : '🤖 Đối thủ'}
                  </span>
                  <span style={styles.playerStatus}>
                    {player.isReady ? '✅ Sẵn sàng' : '⏳ Chờ'}
                  </span>
                </div>
              ))}
              {gameContext.players.size === 0 && (
                <p style={styles.noPlayers}>Chưa có người chơi nào</p>
              )}
            </div>
          </div>

          {/* Command panel */}
          {gameContext.phase === 'playing' && (
            <div style={styles.commandPanel}>
              <h3 style={styles.commandTitle}>Điều khiển Robot</h3>
              <p style={styles.commandHint}>
                Sử dụng Blockly để lập trình robot của bạn, sau đó nhấn gửi lệnh!
              </p>
              <button onClick={handleSendCommands} style={styles.sendButton}>
                🚀 Gửi lệnh
              </button>
              {commands && (
                <div style={styles.commandsPreview}>
                  <h4 style={styles.previewTitle}>Lệnh đã gửi:</h4>
                  <pre style={styles.previewCode}>{commands}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1f2937',
    color: 'white',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#111827',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  roomCode: {
    fontSize: '14px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  headerRight: {
    display: 'flex',
    gap: '12px',
  },
  leaveButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '2px solid #4b5563',
    backgroundColor: 'transparent',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
  },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '16px 24px',
    borderRadius: '8px',
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#ef4444',
  },
  gameArea: {
    flex: 1,
    display: 'flex',
    gap: '16px',
    padding: '16px 24px',
  },
  arenaContainer: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: '16px',
    overflow: 'hidden',
    minHeight: '500px',
  },
  sidePanel: {
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  statusPanel: {
    backgroundColor: '#374151',
    borderRadius: '12px',
    padding: '20px',
  },
  statusTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 16px 0',
  },
  statusWaiting: {
    textAlign: 'center',
    padding: '24px 0',
  },
  waitingEmoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  waitingHint: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '8px',
  },
  statusCountdown: {
    textAlign: 'center',
    padding: '24px 0',
  },
  countdownNumber: {
    fontSize: '72px',
    fontWeight: 'bold',
    color: '#fbbf24',
    display: 'block',
    marginBottom: '12px',
  },
  statusPlaying: {
    textAlign: 'center',
    padding: '24px 0',
  },
  playingEmoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  statusEnded: {
    textAlign: 'center',
    padding: '24px 0',
  },
  winnerEmoji: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '12px',
  },
  winnerText: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#22c55e',
  },
  loserEmoji: {
    fontSize: '64px',
    display: 'block',
    marginBottom: '12px',
  },
  loserText: {
    fontSize: '16px',
    color: '#9ca3af',
  },
  playersPanel: {
    backgroundColor: '#374151',
    borderRadius: '12px',
    padding: '20px',
  },
  playersTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 16px 0',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  playerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#4b5563',
    borderRadius: '8px',
    border: '2px solid',
  },
  playerName: {
    fontWeight: 'bold',
  },
  playerStatus: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  noPlayers: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
  commandPanel: {
    backgroundColor: '#374151',
    borderRadius: '12px',
    padding: '20px',
    flex: 1,
  },
  commandTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 12px 0',
  },
  commandHint: {
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '16px',
  },
  sendButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#22c55e',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  commandsPreview: {
    marginTop: '16px',
  },
  previewTitle: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0 0 8px 0',
  },
  previewCode: {
    fontSize: '10px',
    backgroundColor: '#1f2937',
    padding: '8px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '100px',
  },
};
