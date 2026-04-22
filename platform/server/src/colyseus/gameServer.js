import { Server } from 'colyseus';
import { createServer } from 'http';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { SumoRoom } from './SumoRoom.js';

const app = express();
const PORT = process.env.GAME_PORT || 3101;

// Trust proxy
app.set('trust proxy', 1);

// Security
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8000'],
  credentials: true
}));
app.use(express.json());

// Rate limiting for API routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests' }
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'robokids-game-server' });
});

// Create HTTP server
const httpServer = createServer(app);

// Create Colyseus server with WebSocket transport
const gameServer = new Server({
  transport: new WebSocketTransport({
    // Allow server to send messages at high frequency (60Hz for game sync)
    server: httpServer
  })
});

// Register Sumo Battle room
gameServer.define('sumo_battle', SumoRoom);

console.log('[GameServer] Colyseus game server initializing...');

// Attach to existing HTTP server
httpServer.listen(PORT, () => {
  console.log(`[GameServer] RoboKids game server running on port ${PORT}`);
  console.log('[GameServer] Rooms available: sumo_battle');
});

export default gameServer;
