const socket = io(); // Ensure this is initialized correctly

let selectedCard = null;
let selectedPlayer = null;
let currentTurn = null;

// Function to generate a unique identifier for the session
function generateSessionId() {
  return 'session_' + Math.random().toString(36).substr(2, 9);
}

// Check if a user is already logged in
window.addEventListener('load', () => {
  let sessionId = sessionStorage.getItem('sessionId');
  const nickname = sessionStorage.getItem('nickname');
  const roomCode = sessionStorage.getItem('roomCode');

  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('sessionId', sessionId);
  }

  if (nickname && roomCode) {
    document.getElementById('home-page').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
    document.getElementById('welcome-message').textContent = `Room Code: ${roomCode}`;
    socket.emit('joinRoom', { roomCode, nickname });
  }
});

document.getElementById('create-room-btn').addEventListener('click', () => {
  const nickname = document.getElementById('nickname').value;
  if (nickname) {
    sessionStorage.setItem('nickname', nickname); // Store nickname in session storage
    socket.emit('createRoom');
  } else {
    alert('Please enter a nickname.');
  }
});

document.getElementById('join-room-btn').addEventListener('click', () => {
  const roomCode = document.getElementById('room-code').value;
  const nickname = document.getElementById('nickname').value;
  if (nickname && roomCode) {
    sessionStorage.setItem('nickname', nickname); // Store nickname in session storage
    sessionStorage.setItem('roomCode', roomCode); // Store room code in session storage
    socket.emit('joinRoom', { roomCode, nickname });
  } else {
    alert('Please enter a room code and a nickname.');
  }
});

document.getElementById('start-game-btn').addEventListener('click', () => {
  const roomCode = sessionStorage.getItem('roomCode');
  socket.emit('startGame', roomCode);
});

document.getElementById('exit-btn').addEventListener('click', () => {
  sessionStorage.removeItem('nickname');
  sessionStorage.removeItem('roomCode');
  document.getElementById('game-area').style.display = 'none';
  document.getElementById('home-page').style.display = 'block';
});

socket.on('roomCreated', ({ roomCode }) => {
  const nickname = sessionStorage.getItem('nickname'); // Retrieve nickname from session storage
  alert(`Room created! Your room code is: ${roomCode}`);
  sessionStorage.setItem('roomCode', roomCode); // Store room code in session storage
  document.getElementById('home-page').style.display = 'none';
  document.getElementById('game-area').style.display = 'block';
  document.getElementById('welcome-message').textContent = `Room Code: ${roomCode}`;
});

socket.on('joinedRoom', ({ roomCode, players, cards }) => {
  const nickname = sessionStorage.getItem('nickname'); // Retrieve nickname from session storage
  alert(`Joined room: ${roomCode}`);
  sessionStorage.setItem('roomCode', roomCode); // Store room code in session storage
  document.getElementById('home-page').style.display = 'none';
  document.getElementById('game-area').style.display = 'block';
  document.getElementById('welcome-message').textContent = `Room Code: ${roomCode}`;
  updatePlayerList(players, nickname);
  updateCardList(cards); // Use the cards from the server
});

socket.on('updatePlayerList', (players) => {
  const nickname = sessionStorage.getItem('nickname'); // Retrieve nickname from session storage
  updatePlayerList(players, nickname);
});

socket.on('startTurn', ({ currentTurn }) => {
  const nickname = sessionStorage.getItem('nickname');
  document.getElementById('start-game-section').style.display = 'none';
  if (nickname === currentTurn) {
    document.getElementById('current-turn').textContent = 'It is your turn';
  } else {
    document.getElementById('current-turn').textContent = `It is ${currentTurn}'s turn`;
  }
});

socket.on('challenge', ({ challenger, challenged, card }) => {
  const challengeDiv = document.getElementById('challenge-area');
  challengeDiv.innerHTML = `
    <p>${challenger} has challenged ${challenged} with the card: ${card.text}</p>
    <p>Player ${challenged}, can you prove them wrong?</p>
  `;
  startTimer();
});

function updatePlayerList(players, currentNickname) {
  const playerList = document.getElementById('player-list');
  playerList.innerHTML = '';

  players.forEach(player => {
    const playerButton = document.createElement('button');
    playerButton.textContent = player.nickname;
    playerButton.className = 'player-button';
    playerList.appendChild(playerButton);
  });
}

function updateCardList(cards) {
  const cardList = document.getElementById('card-list');
  cardList.innerHTML = '';
  cards.forEach(card => {
    const li = document.createElement('li');
    li.textContent = card.text;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => selectCard(li, card));
    cardList.appendChild(li);
  });
}

function selectCard(element, card) {
  if (selectedCard) {
    selectedCard.style.backgroundColor = '';
  }
  selectedCard = element;
  selectedCard.style.backgroundColor = 'lightblue';
}

function selectPlayer(playerButton) {
  if (selectedPlayer) {
    selectedPlayer.style.backgroundColor = '';
  }
  selectedPlayer = playerButton;
  selectedPlayer.style.backgroundColor = 'lightgreen';
}

function challengePlayer() {
  if (selectedCard && selectedPlayer) {
    const roomCode = document.getElementById('welcome-message').textContent.split(': ')[1];
    socket.emit('challengePlayer', {
      roomCode,
      challenger: sessionStorage.getItem('nickname'),
      challenged: selectedPlayer.textContent,
      card: selectedCard.textContent
    });
    selectedCard = null; // Clear the selected card
    selectedPlayer = null; // Clear the selected player
  } else {
    alert('Please select a card and a player first.');
  }
}

function startTimer() {
  const timerDiv = document.createElement('div');
  timerDiv.id = 'timer';
  timerDiv.textContent = '30';
  document.getElementById('challenge-area').appendChild(timerDiv);

  let timeLeft = 30;
  const timerInterval = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      document.getElementById('challenge-area').innerHTML += '<p>Time is up! Voting starts now.</p>';
      startVoting();
    }
  }, 1000);
}

function startVoting() {
  // Logic to start voting on whether the challenged player completed the challenge satisfactorily
}
