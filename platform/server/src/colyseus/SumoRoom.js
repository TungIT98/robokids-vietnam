import { Room } from 'colyseus';

// Express API base URL (main server on 3200)
const API_BASE = process.env.EXPRESS_URL || 'http://localhost:3200';

export class SumoRoom extends Room {
  onInit(options) {
    this.roomId = options.roomId || null;
    this.startTime = null;

    this.setState({
      players: {},
      gamePhase: 'waiting', // waiting | countdown | playing | ended
      countdownTimer: 3,
      winner: null,
      arenaCenter: { x: 0, z: 0 },
      arenaRadius: 5
    });

    this.maxClients = 2;
    this.autoDispose = true;

    // Game loop for countdown and sync
    this.gameLoop = null;
    this.countdownInterval = null;
  }

  onJoin(client, options) {
    console.log(`[SumoRoom] ${client.id} joined (sessionId: ${client.sessionId})`);

    if (this.state.players[client.sessionId]) {
      console.log(`[SumoRoom] ${client.id} already in room, ignoring duplicate`);
      return;
    }

    // Initialize player state
    this.state.players[client.sessionId] = {
      sessionId: client.sessionId,
      position: { x: client.sessionId === Object.keys(this.state.players)[0] ? -3 : 3, z: 0 },
      rotation: { y: client.sessionId === Object.keys(this.state.players)[0] ? Math.PI / 2 : -Math.PI / 2 },
      velocity: { x: 0, z: 0 },
      health: 100,
      isReady: false,
      joinedAt: Date.now()
    };

    console.log(`[SumoRoom] Player count: ${Object.keys(this.state.players).length}/${this.maxClients}`);

    // Check if room is full
    if (Object.keys(this.state.players).length >= 2) {
      this.startCountdown();
    }
  }

  onLeave(client, consented) {
    console.log(`[SumoRoom] ${client.id} left (consented: ${consented})`);

    const wasPlaying = this.state.gamePhase === 'playing';
    const leftSessionId = client.sessionId;

    if (this.state.players[client.sessionId]) {
      delete this.state.players[client.sessionId];
    }

    // If game was in progress, other player wins by default
    if (wasPlaying) {
      const remainingPlayers = Object.keys(this.state.players);
      if (remainingPlayers.length === 1) {
        this.state.winner = remainingPlayers[0];
        this.state.gamePhase = 'ended';
        this.broadcast('gameEnded', { winner: remainingPlayers[0], reason: 'opponent_left' });
        this.stopGame();
        this.handleGameEnd(remainingPlayers[0], 'opponent_left', leftSessionId);
      }
    }

    // Clear any running intervals
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  onMessage(message, client) {
    switch (message.type) {
      case 'playerInput':
        // Receive player input commands from Blockly-generated code
        this.handlePlayerInput(client, message);
        break;

      case 'setReady':
        // Player signals they're ready to start
        if (this.state.players[client.sessionId]) {
          this.state.players[client.sessionId].isReady = true;
        }
        break;

      case 'requestRestart':
        // Either player requests restart after game ends
        this.handleRestartRequest(client);
        break;

      case 'ping':
        // Handle latency ping
        client.send('pong', { timestamp: message.timestamp });
        break;
    }
  }

  handlePlayerInput(client, message) {
    if (this.state.gamePhase !== 'playing') return;
    if (!this.state.players[client.sessionId]) return;

    const player = this.state.players[client.sessionId];

    // Parse commands from Blockly
    const { commands } = message;
    if (!commands || !Array.isArray(commands)) return;

    for (const cmd of commands) {
      switch (cmd.action) {
        case 'move_forward':
          player.position.x += Math.sin(player.rotation.y) * cmd.speed * 0.1;
          player.position.z += Math.cos(player.rotation.y) * cmd.speed * 0.1;
          break;

        case 'move_backward':
          player.position.x -= Math.sin(player.rotation.y) * cmd.speed * 0.1;
          player.position.z -= Math.cos(player.rotation.y) * cmd.speed * 0.1;
          break;

        case 'turn_left':
          player.rotation.y += cmd.degrees * (Math.PI / 180);
          break;

        case 'turn_right':
          player.rotation.y -= cmd.degrees * (Math.PI / 180);
          break;

        case 'boost':
          // Boost is 2x speed
          player.position.x += Math.sin(player.rotation.y) * cmd.speed * 0.2;
          player.position.z += Math.cos(player.rotation.y) * cmd.speed * 0.2;
          break;
      }
    }

    // Apply arena bounds check
    const distFromCenter = Math.sqrt(
      player.position.x ** 2 + player.position.z ** 2
    );

    if (distFromCenter > this.state.arenaRadius) {
      // Player fell out of arena
      const winnerSessionId = client.sessionId === Object.keys(this.state.players)[0]
        ? Object.keys(this.state.players)[1]
        : Object.keys(this.state.players)[0];
      this.state.winner = winnerSessionId;
      this.state.gamePhase = 'ended';
      this.broadcast('gameEnded', {
        winner: this.state.winner,
        reason: 'fell_out'
      });
      this.stopGame();
      this.handleGameEnd(winnerSessionId, 'fell_out');
    }

    // Broadcast state update at 60Hz (every ~16ms, but we throttle to save bandwidth)
    this.pulseStateUpdate();
  }

  pulseStateUpdate() {
    // Broadcast updated positions to all clients
    this.broadcast('stateUpdate', {
      players: this.state.players,
      gamePhase: this.state.gamePhase
    });
  }

  startCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.state.gamePhase = 'countdown';
    this.state.countdownTimer = 3;

    this.broadcast('countdownStart', { countdown: this.state.countdownTimer });

    this.countdownInterval = setInterval(() => {
      this.state.countdownTimer--;

      if (this.state.countdownTimer > 0) {
        this.broadcast('countdownTick', { countdown: this.state.countdownTimer });
      } else {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.startGame();
      }
    }, 1000);
  }

  async startGame() {
    this.state.gamePhase = 'playing';
    this.state.winner = null;
    this.startTime = Date.now();

    // Reset player positions
    const sessionIds = Object.keys(this.state.players);
    if (sessionIds.length === 2) {
      this.state.players[sessionIds[0]].position = { x: -3, z: 0 };
      this.state.players[sessionIds[0]].rotation = { y: Math.PI / 2 };
      this.state.players[sessionIds[1]].position = { x: 3, z: 0 };
      this.state.players[sessionIds[1]].rotation = { y: -Math.PI / 2 };
    }

    // Sync room state to Express
    if (this.roomId) {
      this.syncRoomState('playing').catch(err => {
        console.error('[SumoRoom] Failed to sync room state:', err);
      });
    }

    this.broadcast('gameStart', {
      players: this.state.players,
      arenaRadius: this.state.arenaRadius
    });

    console.log('[SumoRoom] Game started!');
  }

  stopGame() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  handleRestartRequest(client) {
    // Game must be ended to request restart
    if (this.state.gamePhase !== 'ended') return;

    // Reset game state
    this.state.gamePhase = 'waiting';
    this.state.winner = null;
    this.state.countdownTimer = 3;

    // Reset player ready states
    for (const sessionId in this.state.players) {
      this.state.players[sessionId].isReady = false;
    }

    this.broadcast('restartRequested', { requestedBy: client.sessionId });

    // Auto-start countdown when both ready (or after 5 seconds)
    setTimeout(() => {
      if (this.state.gamePhase === 'waiting') {
        const readyPlayers = Object.values(this.state.players).filter(p => p.isReady);
        if (readyPlayers.length >= 2 || Object.keys(this.state.players).length >= 2) {
          this.startCountdown();
        }
      }
    }, 5000);
  }

  handleGameEnd(winnerSessionId, reason, loserSessionId = null) {
    if (!this.roomId) return;

    const duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : null;
    const players = Object.keys(this.state.players);
    const loser = loserSessionId || players.find(id => id !== winnerSessionId);

    // Sync room state to Express
    this.syncRoomState('ended').catch(err => {
      console.error('[SumoRoom] Failed to sync room state:', err);
    });

    // Get user IDs from clients (they should be passed as options when room is created)
    // For now, we use sessionIds directly - the Express API will need to resolve these
    const winnerId = winnerSessionId; // This should be userId, not sessionId
    const loserId = loser || winnerSessionId;

    // Call Express API to record game result
    this.callGameResultApi(winnerId, loserId, 'sumo_battle', this.roomId, duration, reason)
      .catch(err => {
        console.error('[SumoRoom] Failed to call game result API:', err);
      });
  }

  async syncRoomState(state) {
    if (!this.roomId) return;

    try {
      await fetch(`${API_BASE}/api/game/rooms/${this.roomId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      });
      console.log(`[SumoRoom] Room ${this.roomId} state synced to: ${state}`);
    } catch (err) {
      console.error('[SumoRoom] Failed to sync room state:', err);
    }
  }

  async callGameResultApi(winnerId, loserId, gameType, roomId, duration, reason) {
    try {
      // Note: This endpoint requires authentication
      // For game server calls, we should use a service key or skip auth
      // The Express route will need to be updated to allow game server calls
      const response = await fetch(`${API_BASE}/api/gamification/game-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In production, this should be a proper service API key
          'X-Game-Server': 'true'
        },
        body: JSON.stringify({
          winnerId,
          loserId,
          gameType,
          roomId,
          duration,
          reason
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[SumoRoom] Game result API error:', error);
        return;
      }

      const result = await response.json();
      console.log('[SumoRoom] Game result recorded:', result);
    } catch (err) {
      console.error('[SumoRoom] Failed to call game result API:', err);
    }
  }

  onDispose() {
    console.log('[SumoRoom] Room disposed');
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
}
