/**
 * ArenaCanvas - 2D arena visualization for the game
 */

import { PlayerState } from '../../services/colyseusService';
import RobotSprite from './RobotSprite';

type GamePhase = 'waiting' | 'countdown' | 'playing' | 'ended';

interface ArenaCanvasProps {
  players: Map<string, PlayerState>;
  mySessionId: string | null;
  phase: GamePhase;
}

export default function ArenaCanvas({ players, mySessionId, phase }: ArenaCanvasProps) {
  // Get arena background based on phase
  function getArenaStyle() {
    switch (phase) {
      case 'countdown':
        return styles.arenaCountdown;
      case 'playing':
        return styles.arenaPlaying;
      case 'ended':
        return styles.arenaEnded;
      default:
        return styles.arenaWaiting;
    }
  }

  return (
    <div style={{ ...styles.container, ...getArenaStyle() }}>
      {/* Arena floor */}
      <div style={styles.arenaFloor}>
        {/* Center circle */}
        <div style={styles.centerCircle} />

        {/* Ring lines */}
        <div style={styles.ringOuter} />
        <div style={styles.ringMiddle} />
        <div style={styles.ringInner} />

        {/* Center dot */}
        <div style={styles.centerDot} />
      </div>

      {/* Robots */}
      {Array.from(players.values()).map((player) => (
        <RobotSprite
          key={player.sessionId}
          player={player}
          isMe={player.sessionId === mySessionId}
        />
      ))}

      {/* Phase overlay */}
      {phase === 'waiting' && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <span style={styles.overlayEmoji}>⏳</span>
            <p style={styles.overlayText}>Đợi người chơi khác tham gia...</p>
          </div>
        </div>
      )}

      {phase === 'countdown' && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <span style={styles.overlayEmoji}>3-2-1-GO!</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '500px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  arenaWaiting: {
    backgroundColor: '#1a1a2e',
  },
  arenaCountdown: {
    backgroundColor: '#2d1b4e',
  },
  arenaPlaying: {
    backgroundColor: '#1a1a2e',
  },
  arenaEnded: {
    backgroundColor: '#1f2937',
  },
  arenaFloor: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    borderRadius: '50%',
    border: '4px dashed #4b5563',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    position: 'absolute',
    width: '20%',
    height: '20%',
    borderRadius: '50%',
    border: '3px solid #fbbf24',
    opacity: 0.5,
  },
  ringOuter: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    borderRadius: '50%',
    border: '2px solid #374151',
    opacity: 0.3,
  },
  ringMiddle: {
    position: 'absolute',
    width: '60%',
    height: '60%',
    borderRadius: '50%',
    border: '2px solid #374151',
    opacity: 0.3,
  },
  ringInner: {
    position: 'absolute',
    width: '30%',
    height: '30%',
    borderRadius: '50%',
    border: '2px solid #374151',
    opacity: 0.3,
  },
  centerDot: {
    position: 'absolute',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#fbbf24',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContent: {
    textAlign: 'center',
  },
  overlayEmoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  overlayText: {
    fontSize: '18px',
    color: 'white',
    margin: 0,
  },
};
