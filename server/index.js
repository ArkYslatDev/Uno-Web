const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Game } = require('./gameLogic');
const { askAI } = require('./aiService');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '..', 'public')));

const rooms = new Map();

function makeRoomId() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name, vsAI }, cb) => {
    const roomId = makeRoomId();
    const players = [{ id: socket.id, name, isAI: false, hand: [] }];
    
    if (vsAI) {
      players.push({ id: 'AI_1', name: 'AI Merah', isAI: true, hand: [] });
      players.push({ id: 'AI_2', name: 'AI Biru', isAI: true, hand: [] });
      players.push({ id: 'AI_3', name: 'AI Hijau', isAI: true, hand: [] });
    }

    const game = new Game(roomId, players);
    rooms.set(roomId, { game, sockets: [socket.id] });
    socket.join(roomId);
    socket.data.roomId = roomId;

    cb({ ok: true, roomId, players: players.map(p => ({ id: p.id, name: p.name })) });
  });

  socket.on('joinRoom', ({ name, roomId }, cb) => {
    const room = rooms.get(roomId);
    if (!room) return cb({ ok: false, error: 'Room tidak ditemukan' });
    
    if (room.game.players.length >= 8) return cb({ ok: false, error: 'Room penuh (Maksimal 8 orang)' });

    const player = { id: socket.id, name, isAI: false, hand: [] };
    room.game.players.push(player);
    room.sockets.push(socket.id);
    socket.join(roomId);
    socket.data.roomId = roomId;

    cb({ ok: true, roomId, players: room.game.players.map(p => ({ id: p.id, name: p.name })) });
  });

  socket.on('startGame', () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;
    if (room.game.players.length < 2) return socket.emit('error', 'Butuh minimal 2 pemain');
    room.game.start();
    broadcastState(room.game);
    maybeAITurn(socket.data.roomId);
  });

  socket.on('playCard', ({ cardId, chosenColor }, cb) => {
    try {
      const room = rooms.get(socket.data.roomId);
      room.game.playCard(socket.id, cardId, chosenColor);
      broadcastState(room.game);
      maybeAITurn(socket.data.roomId);
      if (cb) cb({ ok: true });
    } catch (e) {
      if (cb) cb({ ok: false, error: e.message });
    }
  });

  socket.on('drawCard', (cb) => {
    try {
      const room = rooms.get(socket.data.roomId);
      room.game.drawForPlayer(socket.id);
      broadcastState(room.game);
      maybeAITurn(socket.data.roomId);
      if (cb) cb({ ok: true });
    } catch (e) {
      if (cb) cb({ ok: false, error: e.message });
    }
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.game.players = room.game.players.filter(p => p.id !== socket.id);
    room.sockets = room.sockets.filter(id => id !== socket.id);
    if (room.game.players.filter(p => !p.isAI).length === 0) rooms.delete(roomId);
    else broadcastState(room.game);
  });
});

function broadcastState(game) {
  for (const p of game.players) {
    if (p.isAI) continue;
    io.to(p.id).emit('gameState', { ...game.getState(p.id), forYou: p.id });
  }
}

async function maybeAITurn(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const game = room.game;
  if (game.winner) return;
  const current = game.players[game.currentPlayer];
  if (!current || !current.isAI) return;

  await new Promise(r => setTimeout(r, 1500));

  try {
    const state = game.getState();
    const decision = await askAI(state, current.id);
    if (decision.action === 'draw') {
      game.drawForPlayer(current.id);
    } else {
      game.playCard(current.id, decision.cardId, decision.chosenColor);
    }
    broadcastState(game);
    maybeAITurn(roomId);
  } catch (e) {
    console.error('AI error:', e);
  }
}

const PORT = process.env.PORT || 3000;

// UPDATE: Tambahkan '0.0.0.0' agar bisa diakses dari HP / Wi-Fi
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=================================`);
  console.log(`✅ SERVER UNO BERJALAN!`);
  console.log(`=================================`);
  console.log(`👉 Di PC ini     : http://localhost:${PORT}`);
  console.log(`👉 Di HP / Lain  : http://<IP-KOMPUTER>:${PORT}`);
  console.log(`=================================\n`);
});