const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {}; // Store room data

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('createRoom', () => {
    const roomCode = Math.random().toString(36).substring(2, 8);
    rooms[roomCode] = {
      players: [],
      cards: [], // Add card data here
    };
    socket.join(roomCode);
    socket.emit('roomCreated', roomCode);
  });

  socket.on('joinRoom', ({ roomCode, nickname }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].players.push({ id: socket.id, nickname });
      socket.join(roomCode);
      socket.emit('joinedRoom', roomCode, rooms[roomCode].players);
      io.to(roomCode).emit('updatePlayerList', rooms[roomCode].players);
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      room.players = room.players.filter(player => player.id !== socket.id);
      io.to(roomCode).emit('updatePlayerList', room.players);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
