import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Health check for game server
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'robokids-game-server',
    gamePort: process.env.GAME_PORT || 3101,
    rooms: rooms.size
  });
});

// In-memory room registry for matchmaking
// Format: { roomId: { id, name, hostSessionId, state, createdAt, maxPlayers } }
const rooms = new Map();

// Create a new Sumo Battle room
router.post('/rooms/sumo', (req, res) => {
  const { userId, userName } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const roomId = crypto.randomUUID().slice(0, 8).toUpperCase();
  const room = {
    id: roomId,
    name: `Sumo Battle #${roomId}`,
    type: 'sumo_battle',
    hostId: userId,
    hostName: userName || 'Host',
    state: 'waiting', // waiting | full | playing | ended
    players: [{
      id: userId,
      name: userName || 'Host',
      isReady: false,
      joinedAt: Date.now()
    }],
    maxPlayers: 2,
    createdAt: Date.now()
  };

  rooms.set(roomId, room);

  res.json({
    roomId,
    room,
    wsUrl: `ws://localhost:${process.env.GAME_PORT || 3101}`
  });
});

// Get room info
router.get('/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({ room });
});

// List available rooms
router.get('/rooms', (req, res) => {
  const { type } = req.query;
  let roomList = Array.from(rooms.values());

  // Filter by type if specified
  if (type) {
    roomList = roomList.filter(r => r.type === type);
  }

  // Only return waiting rooms
  roomList = roomList.filter(r => r.state === 'waiting');

  res.json({
    rooms: roomList.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      hostName: r.hostName,
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers,
      createdAt: r.createdAt
    }))
  });
});

// Join a room
router.post('/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { userId, userName } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.state !== 'waiting') {
    return res.status(400).json({ error: 'Room is not accepting players' });
  }

  if (room.players.length >= room.maxPlayers) {
    return res.status(400).json({ error: 'Room is full' });
  }

  // Check if user already in room
  if (room.players.find(p => p.id === userId)) {
    return res.json({
      room,
      wsUrl: `ws://localhost:${process.env.GAME_PORT || 3101}`,
      alreadyInRoom: true
    });
  }

  room.players.push({
    id: userId,
    name: userName || 'Player',
    isReady: false,
    joinedAt: Date.now()
  });

  if (room.players.length >= room.maxPlayers) {
    room.state = 'full';
  }

  res.json({
    room,
    wsUrl: `ws://localhost:${process.env.GAME_PORT || 3101}`
  });
});

// Leave a room
router.post('/rooms/:roomId/leave', (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  room.players = room.players.filter(p => p.id !== userId);

  // If room empty, delete it
  if (room.players.length === 0) {
    rooms.delete(roomId);
    return res.json({ success: true, roomDeleted: true });
  }

  // If host left, assign new host
  if (room.hostId === userId && room.players.length > 0) {
    room.hostId = room.players[0].id;
    room.hostName = room.players[0].name;
  }

  // If game was full, set back to waiting
  if (room.state === 'full') {
    room.state = 'waiting';
  }

  res.json({ success: true, room });
});

// Update room state (called by game server)
router.patch('/rooms/:roomId/state', (req, res) => {
  const { roomId } = req.params;
  const { state } = req.body;

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (state) {
    room.state = state;
  }

  res.json({ success: true, room });
});

export default router;
