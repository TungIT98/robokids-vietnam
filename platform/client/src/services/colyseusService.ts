import { Client, Room } from 'colyseus.js';

const COLYSEUS_URL = import.meta.env.VITE_COLYSEUS_URL || 'ws://localhost:3101';

export interface GameRoom {
  roomId: string;
  roomName: string;
  hostName: string;
  players: number;
  maxPlayers: number;
  status: 'waiting' | 'countdown' | 'playing' | 'ended';
}

export interface PlayerState {
  sessionId: string;
  name: string;
  position: { x: number; y: number };
  rotation: number;
  isReady: boolean;
}

export interface GameState {
  players: Map<string, PlayerState>;
  phase: 'waiting' | 'countdown' | 'playing' | 'ended';
  countdown: number;
  winner?: string;
}

export interface ArenaRoom extends Room {
  state: GameState;
}

class ColyseusService {
  private client: Client | null = null;
  private currentRoom: ArenaRoom | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(): Client {
    if (!this.client) {
      this.client = new Client(COLYSEUS_URL);
    }
    return this.client;
  }

  async getAvailableRooms(): Promise<GameRoom[]> {
    try {
      const response = await fetch('http://localhost:3100/api/game/rooms');
      if (!response.ok) {
        console.warn('Failed to fetch rooms, returning empty list');
        return [];
      }
      const data = await response.json();
      return data.rooms || [];
    } catch (error) {
      console.warn('Error fetching rooms:', error);
      return [];
    }
  }

  async createRoom(): Promise<{ roomId: string }> {
    const response = await fetch('http://localhost:3100/api/game/rooms/sumo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to create room');
    }
    return response.json();
  }

  async joinRoom(roomId: string): Promise<ArenaRoom> {
    const client = this.connect();
    const room = await client.joinById(roomId);
    this.currentRoom = room as ArenaRoom;
    this.setupRoomListeners(room);
    return this.currentRoom;
  }

  async joinOrCreate(): Promise<ArenaRoom> {
    const client = this.connect();
    const room = await client.joinOrCreate('sumo_battle');
    this.currentRoom = room as ArenaRoom;
    this.setupRoomListeners(room);
    return this.currentRoom;
  }

  private setupRoomListeners(room: Room) {
    room.onStateChange((state) => {
      this.emit('stateChange', state);
    });

    room.onMessage('playerJoined', (data) => {
      this.emit('playerJoined', data);
    });

    room.onMessage('playerLeft', (data) => {
      this.emit('playerLeft', data);
    });

    room.onMessage('countdown', (data) => {
      this.emit('countdown', data);
    });

    room.onMessage('gameStart', () => {
      this.emit('gameStart', {});
    });

    room.onMessage('gameEnd', (data) => {
      this.emit('gameEnd', data);
    });

    room.onMessage('positionUpdate', (data) => {
      this.emit('positionUpdate', data);
    });
  }

  sendPlayerInput(commands: string) {
    if (this.currentRoom) {
      this.currentRoom.send('playerInput', { commands });
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  getCurrentRoom(): ArenaRoom | null {
    return this.currentRoom;
  }

  async leaveRoom() {
    if (this.currentRoom) {
      await this.currentRoom.leave();
      this.currentRoom = null;
    }
  }
}

export const colyseusService = new ColyseusService();
export default colyseusService;
