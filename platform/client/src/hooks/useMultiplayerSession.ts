import { useState, useEffect, useCallback, useRef } from 'react';
import Colyseus from 'colyseus.js';

export type GamePhase = 'waiting' | 'countdown' | 'playing' | 'ended';

export interface PlayerState {
  sessionId: string;
  position: { x: number; z: number };
  rotation: { y: number };
  velocity: { x: number; z: number };
  health: number;
  isReady: boolean;
  joinedAt: number;
}

export interface MultiplayerState {
  gamePhase: GamePhase;
  players: Record<string, PlayerState>;
  countdownTimer: number;
  winner: string | null;
  arenaRadius: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseMultiplayerSessionReturn {
  // Connection state
  connectionState: ConnectionState;
  error: string | null;

  // Game state
  gamePhase: GamePhase;
  players: Record<string, PlayerState>;
  opponentState: PlayerState | null;
  mySessionId: string | null;
  countdownTimer: number;
  winner: string | null;
  arenaRadius: number;

  // Actions
  joinRoom: (roomId?: string) => Promise<void>;
  leaveRoom: () => void;
  sendInput: (commands: Array<{ action: string; speed?: number; degrees?: number }>) => void;
  setReady: () => void;
  requestRestart: () => void;
}

const COLYSEUS_URL = import.meta.env.VITE_COLYSEUS_URL || 'ws://localhost:3101';

export function useMultiplayerSession(): UseMultiplayerSessionReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [mySessionId, setMySessionId] = useState<string | null>(null);
  const [countdownTimer, setCountdownTimer] = useState(3);
  const [winner, setWinner] = useState<string | null>(null);
  const [arenaRadius, setArenaRadius] = useState(5);

  const roomRef = useRef<Colyseus.Room<MultiplayerState> | null>(null);

  // Derive opponent state
  const opponentState = mySessionId && players
    ? Object.values(players).find(p => p.sessionId !== mySessionId) || null
    : null;

  const joinRoom = useCallback(async (roomId?: string) => {
    try {
      setConnectionState('connecting');
      setError(null);

      const client = new Colyseus.Client(COLYSEUS_URL);

      // Join or create a sumo room
      const room = roomId
        ? await client.joinById<MultiplayerState>(roomId)
        : await client.joinOrCreate<MultiplayerState>('sumo_battle');

      roomRef.current = room;

      // Set session ID
      setMySessionId(room.sessionId);

      // Handle state changes
      room.onStateChange((state) => {
        setGamePhase(state.gamePhase as GamePhase);
        setPlayers(state.players as Record<string, PlayerState>);
        setCountdownTimer(state.countdownTimer);
        setWinner(state.winner);
        if (state.arenaRadius) {
          setArenaRadius(state.arenaRadius);
        }
      });

      // Handle messages
      room.onMessage('stateUpdate', (data) => {
        // Already handled by onStateChange
      });

      room.onMessage('countdownStart', (data) => {
        setGamePhase('countdown');
        setCountdownTimer(data.countdown || 3);
      });

      room.onMessage('countdownTick', (data) => {
        setCountdownTimer(data.countdown);
      });

      room.onMessage('gameStart', (data) => {
        setGamePhase('playing');
        setWinner(null);
        if (data.arenaRadius) {
          setArenaRadius(data.arenaRadius);
        }
      });

      room.onMessage('gameEnded', (data) => {
        setGamePhase('ended');
        setWinner(data.winner);
      });

      room.onMessage('restartRequested', (data) => {
        // Restart was requested, waiting for countdown
      });

      // Handle connection - use onStateChange as proxy for connection established
      room.onStateChange.once(() => {
        setConnectionState('connected');
      });

      room.onError((code, message) => {
        console.error('Colyseus room error:', code, message);
        setError(`Connection error: ${message}`);
        setConnectionState('error');
      });

      room.onLeave((code) => {
        console.log('Left room:', code);
        setConnectionState('disconnected');
        setMySessionId(null);
      });

      setConnectionState('connected');
    } catch (err) {
      console.error('Failed to join room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setConnectionState('error');
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.leave();
      roomRef.current = null;
    }
    setConnectionState('disconnected');
    setMySessionId(null);
    setGamePhase('waiting');
    setPlayers({});
    setWinner(null);
  }, []);

  const sendInput = useCallback((commands: Array<{ action: string; speed?: number; degrees?: number }>) => {
    if (roomRef.current && gamePhase === 'playing') {
      roomRef.current.send('playerInput', { commands });
    }
  }, [gamePhase]);

  const setReady = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.send('setReady');
    }
  }, []);

  const requestRestart = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.send('requestRestart');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.leave();
        roomRef.current = null;
      }
    };
  }, []);

  return {
    connectionState,
    error,
    gamePhase,
    players,
    opponentState,
    mySessionId,
    countdownTimer,
    winner,
    arenaRadius,
    joinRoom,
    leaveRoom,
    sendInput,
    setReady,
    requestRestart,
  };
}
