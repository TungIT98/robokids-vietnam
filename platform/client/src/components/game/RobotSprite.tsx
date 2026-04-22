/**
 * RobotSprite - Renders a robot in the arena
 */

import { PlayerState } from '../../services/colyseusService';

interface RobotSpriteProps {
  player: PlayerState;
  isMe: boolean;
}

export default function RobotSprite({ player, isMe }: RobotSpriteProps) {
  const { position, rotation } = player;

  return (
    <div
      style={{
        ...styles.container,
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      {/* Robot body */}
      <div
        style={{
          ...styles.body,
          backgroundColor: isMe ? '#22c55e' : '#ef4444',
          boxShadow: isMe
            ? '0 0 20px rgba(34, 197, 94, 0.6)'
            : '0 0 20px rgba(239, 68, 68, 0.6)',
        }}
      >
        {/* Robot "eyes" */}
        <div style={styles.eyes}>
          <div style={styles.eye} />
          <div style={styles.eye} />
        </div>
      </div>

      {/* Direction indicator */}
      <div style={styles.direction}>
        <svg width="12" height="12" viewBox="0 0 12 12">
          <polygon
            points="6,0 12,12 6,9 0,12"
            fill={isMe ? '#22c55e' : '#ef4444'}
          />
        </svg>
      </div>

      {/* Name tag */}
      <div style={styles.nameTag}>
        {isMe ? '🤖 Bạn' : '🤖 Đối thủ'}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'left 0.3s, top 0.3s',
  },
  body: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyes: {
    display: 'flex',
    gap: '8px',
  },
  eye: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'white',
  },
  direction: {
    marginTop: '-4px',
  },
  nameTag: {
    marginTop: '4px',
    padding: '2px 6px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: '4px',
    fontSize: '10px',
    whiteSpace: 'nowrap',
  },
};
