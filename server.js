import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rooms = {};

const dareCards = [
  { id: 1, text: 'Do 10 push-ups' },
  { id: 2, text: 'Sing a song' },
  { id: 3, text: 'Dance for 30 seconds' },
  { id: 4, text: 'Tell a joke' },
  { id: 5, text: 'Imitate an animal' },
  { id: 6, text: 'Do a silly walk' },
  { id: 7, text: 'Recite a poem' },
  { id: 8, text: 'Act like a chicken' },
  { id: 9, text: 'Do 15 jumping jacks' },
  { id: 10, text: 'Pretend to be a robot' },
  { id: 11, text: 'Make an animal sound' },
  { id: 12, text: 'Do a funny dance' },
  { id: 13, text: 'Say a tongue twister' },
  { id: 14, text: 'Pretend to be a superhero' },
  { id: 15, text: 'Tell an embarrassing story' }
];

function getRandomCards() {
  const shuffled = dareCards.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

function getNextPlayer(room) {
  if (!room.currentPlayerIndex) {
    room.currentPlayerIndex = 0;
  } else {
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  }
  return room.players[room.currentPlayerIndex];
}

app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('createRoom', () => {
    const roomCode = Math.random().toString(36).substring(2, 8);
    rooms[roomCode] = {
      players: [],
    };
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode });
  });

  socket.on('joinRoom', ({ roomCode, nickname }) => {
    if (rooms[roomCode]) {
      const playerExists = rooms[roomCode].players.find(player => player.nickname === nickname);
      if (!playerExists) {
        const playerCards = getRandomCards();
        rooms[roomCode].players.push({ id: socket.id, nickname, cards: playerCards });
      }
      socket.join(roomCode);
      const player = rooms[roomCode].players.find(player => player.id === socket.id);
      socket.emit('joinedRoom', { roomCode, players: rooms[roomCode].players, cards: player.cards });
      io.to(roomCode).emit('updatePlayerList', rooms[roomCode].players);
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('startGame', (roomCode) => {
    const room = rooms[roomCode];
    if (room) {
      const currentPlayerIndex = Math.floor(Math.random() * room.players.length);
      room.currentPlayerIndex = currentPlayerIndex;
      const currentPlayer = room.players[currentPlayerIndex];
      io.to(roomCode).emit('startTurn', { currentTurn: currentPlayer.nickname });
    }
  });

  socket.on('startNextTurn', (roomCode) => {
    const room = rooms[roomCode];
    if (room) {
      const currentPlayer = getNextPlayer(room);
      io.to(roomCode).emit('startTurn', { currentTurn: currentPlayer.nickname });
    }
  });

  socket.on('challengePlayer', ({ roomCode, challenger, challenged, card }) => {
    io.to(roomCode).emit('challenge', { challenger, challenged, card });
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
