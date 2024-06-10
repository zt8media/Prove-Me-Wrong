const socket = io();

document.getElementById('create-room-btn').addEventListener('click', () => {
  socket.emit('createRoom');
});

document.getElementById('join-room-btn').addEventListener('click', () => {
  const roomCode = document.getElementById('room-code').value;
  const nickname = document.getElementById('nickname').value;
  if (nickname && roomCode) {
    socket.emit('joinRoom', { roomCode, nickname });
  } else {
    alert('Please enter a room code and a nickname.');
  }
});

document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('game-area').style.display = 'none';
  document.getElementById('home-page').style.display = 'block';
});

socket.on('roomCreated', (roomCode) => {
  alert(`Room created! Your room code is: ${roomCode}`);
  document.getElementById('home-page').style.display = 'none';
  document.getElementById('game-area').style.display = 'block';
  document.getElementById('welcome-message').textContent = `Room Code: ${roomCode}`;
});

socket.on('joinedRoom', (roomCode, players) => {
  alert(`Joined room: ${roomCode}`);
  document.getElementById('home-page').style.display = 'none';
  document.getElementById('game-area').style.display = 'block';
  document.getElementById('welcome-message').textContent = `Room Code: ${roomCode}`;
  updatePlayerList(players);
});

socket.on('updatePlayerList', (players) => {
  updatePlayerList(players);
});

function updatePlayerList(players) {
  const playerList = document.getElementById('player-list');
  playerList.innerHTML = '';
  players.forEach(player => {
    const li = document.createElement('li');
    li.textContent = player.nickname;
    playerList.appendChild(li);
  });
}
