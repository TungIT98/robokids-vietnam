/**
 * LiveCodingSession - Real-time collaborative Blockly coding session
 * Uses Colyseus for real-time workspace sync and presence indicators
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { Client, Room } from 'colyseus.js';
import { robotBlockDefinitions, robotToolboxCategory } from './blocks/robotBlocks';
import './generators/robotGenerator';
import { useAuth } from '../context/AuthContext';

const COLYSEUS_URL = import.meta.env.VITE_COLYSEUS_URL || 'ws://localhost:3101';

interface Participant {
  sessionId: string;
  name: string;
  avatar: string;
  cursor: { x: number; y: number } | null;
  color: string;
  isHost: boolean;
}

interface BlockChange {
  type: 'block' | 'cursor' | 'sync';
  userId: string;
  userName: string;
  xml?: string;
  cursorX?: number;
  cursorY?: number;
  timestamp: number;
}

interface RecordingEntry {
  type: 'block_change' | 'chat' | 'participant_join' | 'participant_leave';
  userId: string;
  userName: string;
  data: any;
  timestamp: number;
}

// Cursor colors for participants
const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

function getColorForIndex(index: number): string {
  return CURSOR_COLORS[index % CURSOR_COLORS.length];
}

interface LiveCodingSessionProps {
  sessionId: string;
  roomName: string;
  onSessionEnd?: () => void;
}

export default function LiveCodingSession({
  sessionId,
  roomName,
  onSessionEnd
}: LiveCodingSessionProps) {
  const { user, token } = useAuth();
  const blocklyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const colyseusClientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room | null>(null);
  const isRemoteChangeRef = useRef(false);
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedData, setRecordedData] = useState<RecordingEntry[]>([]);
  const [showParticipantList, setShowParticipantList] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const userName = user?.full_name || user?.email || 'Học sinh';
  const userAvatar = '🤖';
  const mySessionId = useRef<string>('');

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Initialize Colyseus connection
  useEffect(() => {
    const connectToSession = async () => {
      try {
        colyseusClientRef.current = new Client(COLYSEUS_URL);
        const room = await colyseusClientRef.current.joinOrCreate('live_coding', {
          sessionId,
          roomName,
          userName,
          avatar: userAvatar
        });
        roomRef.current = room;
        mySessionId.current = room.sessionId;
        setConnectionStatus('connected');

        // Handle state changes
        room.onStateChange((state: any) => {
          if (state.participants) {
            const participantList: Participant[] = [];
            let index = 0;
            state.participants.forEach((p: any, sid: string) => {
              participantList.push({
                sessionId: sid,
                name: p.name || 'Unknown',
                avatar: p.avatar || '🤖',
                cursor: p.cursor || null,
                color: getColorForIndex(index),
                isHost: p.isHost || false
              });
              index++;
            });
            setParticipants(participantList);
          }

          // Sync Blockly workspace if XML changed remotely
          if (state.xml !== undefined && workspaceRef.current) {
            const currentXml = getWorkspaceXml();
            if (currentXml !== state.xml) {
              isRemoteChangeRef.current = true;
              loadXmlToWorkspace(state.xml);
              setTimeout(() => {
                isRemoteChangeRef.current = false;
              }, 100);
            }
          }
        });

        // Handle messages
        room.onMessage('block_change', (data: BlockChange) => {
          if (data.userId !== mySessionId.current) {
            if (data.xml !== undefined) {
              isRemoteChangeRef.current = true;
              loadXmlToWorkspace(data.xml);
              setTimeout(() => {
                isRemoteChangeRef.current = false;
              }, 100);
            }
          }
        });

        room.onMessage('cursor_update', (data: BlockChange) => {
          // Cursor updates handled via state change
        });

        room.onMessage('participant_joined', (data: any) => {
          const entry: RecordingEntry = {
            type: 'participant_join',
            userId: data.sessionId,
            userName: data.name,
            data: { avatar: data.avatar },
            timestamp: Date.now()
          };
          if (isRecording) {
            setRecordedData(prev => [...prev, entry]);
          }
        });

        room.onMessage('participant_left', (data: any) => {
          const entry: RecordingEntry = {
            type: 'participant_leave',
            userId: data.sessionId,
            userName: data.name,
            data: {},
            timestamp: Date.now()
          };
          if (isRecording) {
            setRecordedData(prev => [...prev, entry]);
          }
        });

        room.onLeave((code) => {
          setConnectionStatus('disconnected');
        });

      } catch (error) {
        console.error('Failed to connect to live coding session:', error);
        setConnectionStatus('disconnected');
      }
    };

    connectToSession();

    return () => {
      if (roomRef.current) {
        roomRef.current.leave();
      }
    };
  }, [sessionId, roomName, userName, userAvatar]);

  // Initialize Blockly workspace
  useEffect(() => {
    if (!blocklyRef.current || workspaceRef.current) return;

    // Register robot block definitions
    Blockly.defineBlocksWithJsonArray(robotBlockDefinitions as any[]);

    const workspace = Blockly.inject(blocklyRef.current, {
      toolbox: robotToolboxCategory,
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true,
      },
      trashcan: true,
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
    });

    workspaceRef.current = workspace;

    // Listen for block changes
    workspace.addChangeListener((event: any) => {
      if (isRemoteChangeRef.current) return;

      // Only send if it's a user change (not load/clear)
      if (event.type === 'create' || event.type === 'delete' ||
          event.type === 'change' || event.type === 'move') {
        const xml = getWorkspaceXml();
        broadcastBlockChange(xml);

        if (isRecording) {
          const entry: RecordingEntry = {
            type: 'block_change',
            userId: mySessionId.current,
            userName,
            data: { xml },
            timestamp: Date.now()
          };
          setRecordedData(prev => [...prev, entry]);
        }
      }
    });

    // Track cursor position
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, []);

  const getWorkspaceXml = useCallback((): string => {
    if (!workspaceRef.current) return '';
    const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
    return Blockly.Xml.domToText(xml);
  }, []);

  const loadXmlToWorkspace = useCallback((xmlText: string) => {
    if (!workspaceRef.current || !xmlText) return;
    try {
      const dom = Blockly.utils.xml.textToDom(xmlText);
      Blockly.Xml.clearWorkspaceAndLoadFromDom(dom, workspaceRef.current);
    } catch (e) {
      console.error('Failed to load XML:', e);
    }
  }, []);

  const broadcastBlockChange = useCallback((xml: string) => {
    if (roomRef.current) {
      roomRef.current.send('block_change', {
        type: 'block',
        userId: mySessionId.current,
        userName,
        xml,
        timestamp: Date.now()
      });
    }
  }, [userName]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (cursorThrottleRef.current) return;

    cursorThrottleRef.current = setTimeout(() => {
      cursorThrottleRef.current = null;
    }, 50); // Throttle cursor updates

    if (roomRef.current && workspaceRef.current) {
      const blocklyCanvas = blocklyRef.current?.querySelector('.blocklyMainBackground');
      if (blocklyCanvas) {
        const rect = blocklyCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        roomRef.current.send('cursor_update', {
          type: 'cursor',
          userId: mySessionId.current,
          userName,
          cursorX: x,
          cursorY: y,
          timestamp: Date.now()
        });
      }
    }
  }, [userName]);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    setRecordedData([]);
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Save recording to localStorage for now (can be uploaded to server)
    const recording = {
      sessionId,
      roomName,
      duration: recordingTime,
      entries: recordedData,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(`live_coding_recording_${sessionId}_${Date.now()}`, JSON.stringify(recording));
    alert(`Đã lưu recording! (${recordingTime} giây)`);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <span style={styles.sessionBadge}>🔴 LIVE</span>
          <span style={styles.sessionName}>{roomName}</span>
          <span style={{
            ...styles.connectionDot,
            backgroundColor: connectionStatus === 'connected' ? '#4CAF50' :
                             connectionStatus === 'connecting' ? '#FFC107' : '#F44336'
          }} />
        </div>

        <div style={styles.toolbarCenter}>
          {/* Recording controls */}
          {isRecording && (
            <div style={styles.recordingIndicator}>
              <span style={styles.recordingDot}>●</span>
              <span style={styles.recordingTime}>{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>

        <div style={styles.toolbarRight}>
          <button
            onClick={() => setShowParticipantList(!showParticipantList)}
            style={styles.participantBtn}
          >
            👥 {participants.length}
          </button>

          {!isRecording ? (
            <button onClick={startRecording} style={styles.recordBtn}>
              ⏺ Record
            </button>
          ) : (
            <button onClick={stopRecording} style={styles.stopRecordBtn}>
              ⏹ Stop
            </button>
          )}

          {onSessionEnd && (
            <button onClick={onSessionEnd} style={styles.endBtn}>
              ✕ End
            </button>
          )}
        </div>
      </div>

      {/* Participant list overlay */}
      {showParticipantList && (
        <div style={styles.participantOverlay}>
          <div style={styles.participantHeader}>
            <h3 style={styles.participantTitle}>👥 Participants ({participants.length})</h3>
            <button onClick={() => setShowParticipantList(false)} style={styles.closeOverlay}>✕</button>
          </div>
          <div style={styles.participantList}>
            {participants.map((p) => (
              <div key={p.sessionId} style={styles.participantItem}>
                <span style={{...styles.participantAvatar, backgroundColor: p.color}}>
                  {p.avatar}
                </span>
                <span style={styles.participantName}>
                  {p.name} {p.isHost ? '👑' : ''} {p.sessionId === mySessionId.current ? '(you)' : ''}
                </span>
                <span style={{
                  ...styles.participantStatus,
                  backgroundColor: p.cursor ? '#4CAF50' : '#9E9E9E'
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cursor overlays */}
      {participants.filter(p => p.sessionId !== mySessionId.current && p.cursor).map((p) => (
        <div
          key={p.sessionId}
          style={{
            ...styles.remoteCursor,
            left: p.cursor!.x,
            top: p.cursor!.y,
            borderColor: p.color
          }}
        >
          <div style={{...styles.cursorLabel, backgroundColor: p.color}}>
            {p.name}
          </div>
        </div>
      ))}

      {/* Blockly workspace */}
      <div style={styles.workspaceContainer}>
        <div ref={blocklyRef} style={styles.blocklyWorkspace} />
      </div>

      {/* Connection status banner */}
      {connectionStatus === 'disconnected' && (
        <div style={styles.disconnectedBanner}>
          ⚠️ Mất kết nối với server. Đang thử kết nối lại...
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#1e1e1e',
    position: 'relative',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: '#252526',
    borderBottom: '1px solid #3e3e42',
    minHeight: '48px',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  toolbarCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sessionBadge: {
    backgroundColor: '#F44336',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  sessionName: {
    color: '#cccccc',
    fontSize: '14px',
  },
  connectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  recordingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#d32f2f',
    padding: '4px 12px',
    borderRadius: '4px',
  },
  recordingDot: {
    color: 'white',
    fontSize: '12px',
    animation: 'pulse 1s infinite',
  },
  recordingTime: {
    color: 'white',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  participantBtn: {
    backgroundColor: '#3e3e42',
    border: 'none',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  recordBtn: {
    backgroundColor: '#4CAF50',
    border: 'none',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  stopRecordBtn: {
    backgroundColor: '#F44336',
    border: 'none',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  endBtn: {
    backgroundColor: '#757575',
    border: 'none',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  participantOverlay: {
    position: 'absolute',
    top: '56px',
    right: '16px',
    backgroundColor: '#2d2d30',
    border: '1px solid #3e3e42',
    borderRadius: '8px',
    padding: '12px',
    minWidth: '220px',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  participantHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  participantTitle: {
    color: 'white',
    fontSize: '14px',
    margin: 0,
  },
  closeOverlay: {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '16px',
  },
  participantList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  participantItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px',
    borderRadius: '6px',
    backgroundColor: '#1e1e1e',
  },
  participantAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  participantName: {
    color: '#cccccc',
    fontSize: '13px',
    flex: 1,
  },
  participantStatus: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  remoteCursor: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    border: '2px solid',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 50,
    transform: 'translate(-50%, -50%)',
  },
  cursorLabel: {
    position: 'absolute',
    top: '-24px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'white',
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  workspaceContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  blocklyWorkspace: {
    width: '100%',
    height: '100%',
  },
  disconnectedBanner: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#F44336',
    color: 'white',
    padding: '8px 24px',
    borderRadius: '8px',
    fontSize: '14px',
  },
};
