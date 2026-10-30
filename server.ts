import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { Chess } from 'chess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

interface Player {
  id: string; // Session ID
  name: string;
  color: 'w' | 'b' | null;
  connected: boolean;
  timeLeftMs: number;
}

interface Room {
  code: string;
  chess: Chess;
  timeControl: {
    initialMinutes: number;
    incrementSeconds: number;
  };
  whitePlayer: Player | null;
  blackPlayer: Player | null;
  spectators: Player[];
  status: 'waiting' | 'in_progress' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout';
  winner: 'w' | 'b' | 'draw' | null;
  activeTimerColor: 'w' | 'b' | null;
  lastTimerTick: number;
  timerInterval?: NodeJS.Timeout | null;
  drawOffer: 'w' | 'b' | null;
  rematchOffer: 'w' | 'b' | null;
  messages: Array<{
    id: string;
    sender: string;
    color?: 'w' | 'b';
    text: string;
    timestamp: number;
    isSystem?: boolean;
  }>;
  history: Array<{
    from: string;
    to: string;
    san: string;
    piece: string;
    color: 'w' | 'b';
    captured?: string;
    fen: string;
    timestamp: number;
  }>;
  createdAt: number;
  lastActivity: number;
}

const rooms = new Map<string, Room>();
// Map WebSocket instance to metadata: { roomCode, playerId }
const clientMeta = new WeakMap<WebSocket, { roomCode: string; playerId: string; isAlive: boolean }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastRoom(room: Room) {
  const payload = JSON.stringify({
    type: 'ROOM_STATE',
    data: sanitizeRoomState(room)
  });

  wss.clients.forEach((ws) => {
    const meta = clientMeta.get(ws);
    if (meta && meta.roomCode === room.code && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

function broadcastToRoom(roomCode: string, message: object) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((ws) => {
    const meta = clientMeta.get(ws);
    if (meta && meta.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

function sanitizeRoomState(room: Room) {
  return {
    code: room.code,
    fen: room.chess.fen(),
    isCheck: room.chess.inCheck(),
    isGameOver: room.status !== 'waiting' && room.status !== 'in_progress',
    status: room.status,
    winner: room.winner,
    turn: room.chess.turn(),
    timeControl: room.timeControl,
    whitePlayer: room.whitePlayer,
    blackPlayer: room.blackPlayer,
    spectatorsCount: room.spectators.length,
    activeTimerColor: room.activeTimerColor,
    drawOffer: room.drawOffer,
    rematchOffer: room.rematchOffer,
    messages: room.messages.slice(-50),
    history: room.history,
  };
}

function stopRoomTimer(room: Room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  room.activeTimerColor = null;
}

function startRoomTimer(room: Room) {
  if (room.timeControl.initialMinutes <= 0) return; // Unlimited time

  stopRoomTimer(room);
  room.lastTimerTick = Date.now();
  room.activeTimerColor = room.chess.turn();

  room.timerInterval = setInterval(() => {
    if (room.status !== 'in_progress' || !room.activeTimerColor) {
      stopRoomTimer(room);
      return;
    }

    const now = Date.now();
    const elapsed = now - room.lastTimerTick;
    room.lastTimerTick = now;

    if (room.activeTimerColor === 'w' && room.whitePlayer) {
      room.whitePlayer.timeLeftMs = Math.max(0, room.whitePlayer.timeLeftMs - elapsed);
      if (room.whitePlayer.timeLeftMs <= 0) {
        room.status = 'timeout';
        room.winner = 'b';
        stopRoomTimer(room);
        room.messages.push({
          id: Math.random().toString(36).substring(2, 9),
          sender: 'Referee',
          text: `${room.whitePlayer.name} ran out of time! Black wins.`,
          timestamp: Date.now(),
          isSystem: true
        });
        broadcastRoom(room);
        return;
      }
    } else if (room.activeTimerColor === 'b' && room.blackPlayer) {
      room.blackPlayer.timeLeftMs = Math.max(0, room.blackPlayer.timeLeftMs - elapsed);
      if (room.blackPlayer.timeLeftMs <= 0) {
        room.status = 'timeout';
        room.winner = 'w';
        stopRoomTimer(room);
        room.messages.push({
          id: Math.random().toString(36).substring(2, 9),
          sender: 'Referee',
          text: `${room.blackPlayer.name} ran out of time! White wins.`,
          timestamp: Date.now(),
          isSystem: true
        });
        broadcastRoom(room);
        return;
      }
    }

    // Broadcast subtle timer sync every second
    broadcastToRoom(room.code, {
      type: 'TIMER_SYNC',
      data: {
        whiteTimeLeftMs: room.whitePlayer ? room.whitePlayer.timeLeftMs : 0,
        blackTimeLeftMs: room.blackPlayer ? room.blackPlayer.timeLeftMs : 0,
        activeTimerColor: room.activeTimerColor
      }
    });
  }, 1000);
}

// WebSocket Connection handling
wss.on('connection', (ws) => {
  clientMeta.set(ws, { roomCode: '', playerId: '', isAlive: true });

  ws.on('pong', () => {
    const meta = clientMeta.get(ws);
    if (meta) meta.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleClientMessage(ws, msg);
    } catch (err) {
      console.error('Invalid WS message payload:', err);
    }
  });

  ws.on('close', () => {
    handleClientDisconnect(ws);
  });
});

// Keep-alive heartbeat ping
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const meta = clientMeta.get(ws);
    if (!meta) return;
    if (!meta.isAlive) {
      ws.terminate();
      return;
    }
    meta.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

function handleClientDisconnect(ws: WebSocket) {
  const meta = clientMeta.get(ws);
  if (!meta || !meta.roomCode) return;

  const room = rooms.get(meta.roomCode);
  if (!room) return;

  let playerLeaving: Player | null = null;
  if (room.whitePlayer && room.whitePlayer.id === meta.playerId) {
    room.whitePlayer.connected = false;
    playerLeaving = room.whitePlayer;
  } else if (room.blackPlayer && room.blackPlayer.id === meta.playerId) {
    room.blackPlayer.connected = false;
    playerLeaving = room.blackPlayer;
  } else {
    room.spectators = room.spectators.filter(s => s.id !== meta.playerId);
  }

  if (playerLeaving) {
    room.messages.push({
      id: Math.random().toString(36).substring(2, 9),
      sender: 'System',
      text: `${playerLeaving.name} disconnected. (Reconnecting...)`,
      timestamp: Date.now(),
      isSystem: true
    });
  }

  room.lastActivity = Date.now();
  broadcastRoom(room);
}

function handleClientMessage(ws: WebSocket, msg: any) {
  const { type, data } = msg;

  if (type === 'CREATE_ROOM') {
    const code = generateRoomCode();
    const timeMinutes = typeof data?.initialMinutes === 'number' ? data.initialMinutes : 10;
    const increment = typeof data?.incrementSeconds === 'number' ? data.incrementSeconds : 0;
    const playerName = (data?.playerName || 'Player 1').trim().slice(0, 20);
    const preferredColor = data?.preferredColor || 'w'; // 'w', 'b', 'random'
    const playerId = data?.playerId || Math.random().toString(36).substring(2, 12);

    let assignedColor: 'w' | 'b' = 'w';
    if (preferredColor === 'b') assignedColor = 'b';
    else if (preferredColor === 'random') assignedColor = Math.random() > 0.5 ? 'w' : 'b';

    const player: Player = {
      id: playerId,
      name: playerName,
      color: assignedColor,
      connected: true,
      timeLeftMs: timeMinutes * 60 * 1000
    };

    const room: Room = {
      code,
      chess: new Chess(),
      timeControl: { initialMinutes: timeMinutes, incrementSeconds: increment },
      whitePlayer: assignedColor === 'w' ? player : null,
      blackPlayer: assignedColor === 'b' ? player : null,
      spectators: [],
      status: 'waiting',
      winner: null,
      activeTimerColor: null,
      lastTimerTick: 0,
      drawOffer: null,
      rematchOffer: null,
      messages: [{
        id: Math.random().toString(36).substring(2, 9),
        sender: 'System',
        text: `Room created with ${timeMinutes > 0 ? timeMinutes + ' min' : 'unlimited'} clock. Share the room code or invite link to play!`,
        timestamp: Date.now(),
        isSystem: true
      }],
      history: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    rooms.set(code, room);
    clientMeta.set(ws, { roomCode: code, playerId, isAlive: true });

    ws.send(JSON.stringify({
      type: 'ROOM_CREATED',
      data: { roomCode: code, yourPlayerId: playerId, yourColor: assignedColor }
    }));
    broadcastRoom(room);
    return;
  }

  if (type === 'JOIN_ROOM') {
    const code = (data?.roomCode || '').toUpperCase().trim();
    const playerName = (data?.playerName || 'Player 2').trim().slice(0, 20);
    const playerId = data?.playerId || Math.random().toString(36).substring(2, 12);

    const room = rooms.get(code);
    if (!room) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: `Game room "${code}" not found. Please verify the code.`
      }));
      return;
    }

    clientMeta.set(ws, { roomCode: code, playerId, isAlive: true });

    // Check if player is reconnecting
    let yourColor: 'w' | 'b' | null = null;
    if (room.whitePlayer && room.whitePlayer.id === playerId) {
      room.whitePlayer.connected = true;
      room.whitePlayer.name = playerName || room.whitePlayer.name;
      yourColor = 'w';
    } else if (room.blackPlayer && room.blackPlayer.id === playerId) {
      room.blackPlayer.connected = true;
      room.blackPlayer.name = playerName || room.blackPlayer.name;
      yourColor = 'b';
    } else if (!room.whitePlayer) {
      // Seat available as White
      room.whitePlayer = {
        id: playerId,
        name: playerName,
        color: 'w',
        connected: true,
        timeLeftMs: room.timeControl.initialMinutes * 60 * 1000
      };
      yourColor = 'w';
    } else if (!room.blackPlayer) {
      // Seat available as Black
      room.blackPlayer = {
        id: playerId,
        name: playerName,
        color: 'b',
        connected: true,
        timeLeftMs: room.timeControl.initialMinutes * 60 * 1000
      };
      yourColor = 'b';
    } else {
      // Both seats filled -> Join as spectator
      const existingSpec = room.spectators.find(s => s.id === playerId);
      if (existingSpec) {
        existingSpec.connected = true;
      } else {
        room.spectators.push({
          id: playerId,
          name: playerName,
          color: null,
          connected: true,
          timeLeftMs: 0
        });
      }
    }

    // If both players are seated and status was waiting, start the match!
    if (room.status === 'waiting' && room.whitePlayer && room.blackPlayer) {
      room.status = 'in_progress';
      room.messages.push({
        id: Math.random().toString(36).substring(2, 9),
        sender: 'System',
        text: `Match started! ${room.whitePlayer.name} (White) vs ${room.blackPlayer.name} (Black).`,
        timestamp: Date.now(),
        isSystem: true
      });
      startRoomTimer(room);
    } else {
      room.messages.push({
        id: Math.random().toString(36).substring(2, 9),
        sender: 'System',
        text: `${playerName} joined the room ${yourColor ? `as ${yourColor === 'w' ? 'White' : 'Black'}` : 'as Spectator'}.`,
        timestamp: Date.now(),
        isSystem: true
      });
    }

    ws.send(JSON.stringify({
      type: 'ROOM_JOINED',
      data: { roomCode: code, yourPlayerId: playerId, yourColor }
    }));
    broadcastRoom(room);
    return;
  }

  // All other events require an active room
  const meta = clientMeta.get(ws);
  if (!meta || !meta.roomCode) return;
  const room = rooms.get(meta.roomCode);
  if (!room) return;

  if (type === 'MOVE') {
    if (room.status !== 'in_progress') {
      ws.send(JSON.stringify({ type: 'MOVE_REJECTED', message: 'Game is not currently active' }));
      return;
    }

    const currentTurn = room.chess.turn();
    const isSenderWhite = room.whitePlayer && room.whitePlayer.id === meta.playerId;
    const isSenderBlack = room.blackPlayer && room.blackPlayer.id === meta.playerId;

    if ((currentTurn === 'w' && !isSenderWhite) || (currentTurn === 'b' && !isSenderBlack)) {
      ws.send(JSON.stringify({ type: 'MOVE_REJECTED', message: 'Not your turn' }));
      return;
    }

    const { from, to, promotion } = data;

    try {
      const moveResult = room.chess.move({
        from,
        to,
        promotion: promotion || 'q'
      });

      if (!moveResult) {
        ws.send(JSON.stringify({ type: 'MOVE_REJECTED', message: 'Illegal move' }));
        return;
      }

      // Add increment to the player who just moved
      if (room.timeControl.incrementSeconds > 0) {
        const incrementMs = room.timeControl.incrementSeconds * 1000;
        if (currentTurn === 'w' && room.whitePlayer) {
          room.whitePlayer.timeLeftMs += incrementMs;
        } else if (currentTurn === 'b' && room.blackPlayer) {
          room.blackPlayer.timeLeftMs += incrementMs;
        }
      }

      // Record move in history
      room.history.push({
        from: moveResult.from,
        to: moveResult.to,
        san: moveResult.san,
        piece: moveResult.piece,
        color: moveResult.color,
        captured: moveResult.captured,
        fen: room.chess.fen(),
        timestamp: Date.now()
      });

      // Clear any pending draw offer on move
      room.drawOffer = null;

      // Check game termination conditions
      if (room.chess.isCheckmate()) {
        room.status = 'checkmate';
        room.winner = currentTurn;
        stopRoomTimer(room);
        const winnerName = currentTurn === 'w' ? room.whitePlayer?.name : room.blackPlayer?.name;
        room.messages.push({
          id: Math.random().toString(36).substring(2, 9),
          sender: 'Referee',
          text: `Checkmate! ${winnerName} wins the game!`,
          timestamp: Date.now(),
          isSystem: true
        });
      } else if (room.chess.isDraw()) {
        room.status = 'draw';
        room.winner = 'draw';
        stopRoomTimer(room);
        let reason = 'Draw';
        if (room.chess.isStalemate()) reason = 'Stalemate';
        else if (room.chess.isThreefoldRepetition()) reason = 'Threefold repetition';
        else if (room.chess.isInsufficientMaterial()) reason = 'Insufficient material';
        room.messages.push({
          id: Math.random().toString(36).substring(2, 9),
          sender: 'Referee',
          text: `Game drawn by ${reason}.`,
          timestamp: Date.now(),
          isSystem: true
        });
      } else {
        // Switch clock to opponent
        room.activeTimerColor = room.chess.turn();
        room.lastTimerTick = Date.now();
      }

      broadcastRoom(room);
    } catch (e: any) {
      ws.send(JSON.stringify({ type: 'MOVE_REJECTED', message: e.message || 'Illegal move' }));
    }
    return;
  }

  if (type === 'RESIGN') {
    if (room.status !== 'in_progress') return;
    const isWhite = room.whitePlayer && room.whitePlayer.id === meta.playerId;
    const isBlack = room.blackPlayer && room.blackPlayer.id === meta.playerId;

    if (!isWhite && !isBlack) return;

    room.status = 'resigned';
    room.winner = isWhite ? 'b' : 'w';
    stopRoomTimer(room);

    const resigningName = isWhite ? room.whitePlayer?.name : room.blackPlayer?.name;
    const winningName = isWhite ? room.blackPlayer?.name : room.whitePlayer?.name;

    room.messages.push({
      id: Math.random().toString(36).substring(2, 9),
      sender: 'Referee',
      text: `${resigningName} resigned. ${winningName} wins!`,
      timestamp: Date.now(),
      isSystem: true
    });
    broadcastRoom(room);
    return;
  }

  if (type === 'OFFER_DRAW') {
    if (room.status !== 'in_progress') return;
    const isWhite = room.whitePlayer && room.whitePlayer.id === meta.playerId;
    const isBlack = room.blackPlayer && room.blackPlayer.id === meta.playerId;
    if (!isWhite && !isBlack) return;

    const offererColor: 'w' | 'b' = isWhite ? 'w' : 'b';
    room.drawOffer = offererColor;
    const offererName = isWhite ? room.whitePlayer?.name : room.blackPlayer?.name;

    room.messages.push({
      id: Math.random().toString(36).substring(2, 9),
      sender: 'Referee',
      text: `${offererName} offered a draw.`,
      timestamp: Date.now(),
      isSystem: true
    });
    broadcastRoom(room);
    return;
  }

  if (type === 'ACCEPT_DRAW') {
    if (room.status !== 'in_progress' || !room.drawOffer) return;
    const isWhite = room.whitePlayer && room.whitePlayer.id === meta.playerId;
    const isBlack = room.blackPlayer && room.blackPlayer.id === meta.playerId;
    const acceptorColor: 'w' | 'b' = isWhite ? 'w' : 'b';

    if (acceptorColor === room.drawOffer) return; // Cannot accept your own offer

    room.status = 'draw';
    room.winner = 'draw';
    room.drawOffer = null;
    stopRoomTimer(room);

    room.messages.push({
      id: Math.random().toString(36).substring(2, 9),
      sender: 'Referee',
      text: `Draw offer accepted. Game drawn by mutual agreement.`,
      timestamp: Date.now(),
      isSystem: true
    });
    broadcastRoom(room);
    return;
  }

  if (type === 'DECLINE_DRAW') {
    if (!room.drawOffer) return;
    room.drawOffer = null;
    room.messages.push({
      id: Math.random().toString(36).substring(2, 9),
      sender: 'Referee',
      text: `Draw offer was declined.`,
      timestamp: Date.now(),
      isSystem: true
    });
    broadcastRoom(room);
    return;
  }

  if (type === 'OFFER_REMATCH') {
    const isWhite = room.whitePlayer && room.whitePlayer.id === meta.playerId;
    const isBlack = room.blackPlayer && room.blackPlayer.id === meta.playerId;
    if (!isWhite && !isBlack) return;

    const offererColor: 'w' | 'b' = isWhite ? 'w' : 'b';
    const offererName = isWhite ? room.whitePlayer?.name : room.blackPlayer?.name;

    if (room.rematchOffer && room.rematchOffer !== offererColor) {
      // Both agreed -> Start rematch! Swap colors for fair play
      const oldWhite = room.whitePlayer;
      const oldBlack = room.blackPlayer;

      room.whitePlayer = oldBlack ? { ...oldBlack, color: 'w', timeLeftMs: room.timeControl.initialMinutes * 60 * 1000 } : null;
      room.blackPlayer = oldWhite ? { ...oldWhite, color: 'b', timeLeftMs: room.timeControl.initialMinutes * 60 * 1000 } : null;

      room.chess = new Chess();
      room.status = 'in_progress';
      room.winner = null;
      room.drawOffer = null;
      room.rematchOffer = null;
      room.history = [];
      room.messages.push({
        id: Math.random().toString(36).substring(2, 9),
        sender: 'Referee',
        text: `Rematch started! Colors swapped: ${room.whitePlayer?.name} is White, ${room.blackPlayer?.name} is Black.`,
        timestamp: Date.now(),
        isSystem: true
      });
      startRoomTimer(room);
      broadcastRoom(room);
      return;
    }

    room.rematchOffer = offererColor;
    room.messages.push({
      id: Math.random().toString(36).substring(2, 9),
      sender: 'Referee',
      text: `${offererName} requested a rematch.`,
      timestamp: Date.now(),
      isSystem: true
    });
    broadcastRoom(room);
    return;
  }

  if (type === 'CHAT_MESSAGE') {
    const text = (data?.text || '').trim().slice(0, 200);
    if (!text) return;

    let sender = 'Spectator';
    let color: 'w' | 'b' | undefined = undefined;

    if (room.whitePlayer && room.whitePlayer.id === meta.playerId) {
      sender = room.whitePlayer.name;
      color = 'w';
    } else if (room.blackPlayer && room.blackPlayer.id === meta.playerId) {
      sender = room.blackPlayer.name;
      color = 'b';
    } else {
      const spec = room.spectators.find(s => s.id === meta.playerId);
      if (spec) sender = spec.name;
    }

    room.messages.push({
      id: Math.random().toString(36).substring(2, 9),
      sender,
      color,
      text,
      timestamp: Date.now()
    });
    broadcastRoom(room);
  }
}

// REST endpoints for room queries if needed
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

app.get('/api/room/:code', (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(sanitizeRoomState(room));
});

// Clean up dead rooms every hour
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, code) => {
    // Delete rooms inactive for more than 4 hours
    if (now - room.lastActivity > 4 * 60 * 60 * 1000) {
      stopRoomTimer(room);
      rooms.delete(code);
    }
  });
}, 30 * 60 * 1000);

async function startServer() {
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Classic Chess server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
