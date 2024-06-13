const socket = io(); // Ensure this is initialized correctly

let selectedCard = null;
let selectedPlayer = null;
let selectedCardData = null; // Added to store card data
let selectedPlayerData = null; // Added to store player data
let gameStarted = false;
let currentTurn = null;
let challengedPlayer = null;
let voteTimerInterval = null;
let hasVoted = false;
let challenger = null;

// Ensure DOM is loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('start-game-btn').addEventListener('click', startGame);
  document.getElementById('challenge-btn').addEventListener('click', challengePlayer);
  document.getElementById('card-list').addEventListener('click', function(e) {
    if (e.target.tagName === 'LI' && gameStarted) {
      selectCard(e.target, { text: e.target.textContent }); // Ensure card data is passed
    }
  });
  document.getElementById('player-list').addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON' && gameStarted) {
      selectPlayer(e.target);
    }
  });
});

function startGame() {
  const roomCode = sessionStorage.getItem('roomCode');
  socket.emit('startGame', roomCode);
  gameStarted = true; // Set game as started
  document.getElementById('start-game-btn').style.display = 'none'; // Optionally hide the start button
}

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

socket.on('joinedRoom', ({ roomCode, players, cards, scores }) => {
  const nickname = sessionStorage.getItem('nickname'); // Retrieve nickname from session storage
  alert(`Joined room: ${roomCode}`);
  sessionStorage.setItem('roomCode', roomCode); // Store room code in session storage
  document.getElementById('home-page').style.display = 'none';
  document.getElementById('game-area').style.display = 'block';
  document.getElementById('welcome-message').textContent = `Room Code: ${roomCode}`;
  updatePlayerList(players, scores);
  updateCardList(cards); // Use the cards from the server
});

socket.on('updatePlayerList', (players, scores) => {
  updatePlayerList(players, scores);
});

socket.on('startTurn', ({ currentTurn }) => {
  const nickname = sessionStorage.getItem('nickname');
  document.getElementById('start-game-section').style.display = 'none';
  if (nickname === currentTurn) {
    document.getElementById('current-turn').textContent = 'It is your turn';
  } else {
    document.getElementById('current-turn').textContent = `It is ${currentTurn}'s turn`;
  }
  gameStarted = true; // Enable selecting cards and players
});

socket.on('challenge', ({ challenger, challenged, card }) => {
  challengedPlayer = challenged;
  challenger = challenger;
  const challengeDiv = document.getElementById('challenge-area');
  challengeDiv.innerHTML = `
    <p>${challenger} has challenged ${challenged} with the card: ${card.text}</p>
    <p>Player ${challenged}, can you prove them wrong?</p>
  `;
  startTimer(challenged); // Pass the challenged player to the timer function
});

socket.on('voteResult', ({ result, scores }) => {
  const resultMessage = result === 'success' ? 'Challenge succeeded!' : 'Challenge failed!';
  document.getElementById('challenge-area').innerHTML += `<p>${resultMessage}</p>`;
  closeVotingModal(); // Close voting modal after showing result
  updatePlayerList(Object.keys(scores).map(nickname => ({ nickname })), scores); // Update player list with scores
  setTimeout(() => {
    socket.emit('startNextTurn', sessionStorage.getItem('roomCode')); // Start the next turn
  }, 3000); // Wait for 3 seconds before starting the next turn
});

function updatePlayerList(players, scores = {}) {
  const playerList = document.getElementById('player-list');
  playerList.innerHTML = '';

  players.forEach(player => {
    const playerButton = document.createElement('button');
    playerButton.textContent = `${player.nickname} (${scores[player.nickname] || 0})`;
    playerButton.className = 'player-button';
    playerList.appendChild(playerButton);
    playerButton.addEventListener('click', () => selectPlayer(playerButton));
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
    selectedCard.classList.remove('selected-card');
  }
  selectedCard = element;
  selectedCard.classList.add('selected-card');
  selectedCardData = card; // Store the card data
  checkChallengeReady();
}

function selectPlayer(element) {
  if (selectedPlayer) {
    selectedPlayer.classList.remove('selected-player');
  }
  selectedPlayer = element;
  selectedPlayer.classList.add('selected-player');
  selectedPlayerData = element.textContent.split(' ')[0]; // Store the player data
  checkChallengeReady();
}

function checkChallengeReady() {
  const challengeButton = document.getElementById('challenge-btn');
  if (selectedCard && selectedPlayer) {
    challengeButton.disabled = false; // Enable the challenge button
  } else {
    challengeButton.disabled = true; // Disable the challenge button
  }
}

function challengePlayer() {
  if (selectedCard && selectedPlayer) {
    const roomCode = document.getElementById('welcome-message').textContent.split(': ')[1];
    const challenger = sessionStorage.getItem('nickname');
    const challenged = selectedPlayerData; // Use the stored player data
    if (selectedCardData && selectedCardData.text) {
      socket.emit('challengePlayer', {
        roomCode,
        challenger,
        challenged,
        card: selectedCardData
      });
      resetSelections();
    } else {
      console.error("Selected card data is invalid:", selectedCardData);
    }
  } else {
    alert('Please select a card and a player first.');
  }
}

function resetSelections() {
  if (selectedCard) {
    selectedCard.classList.remove('selected-card');
    selectedCard = null;
  }
  if (selectedPlayer) {
    selectedPlayer.classList.remove('selected-player');
    selectedPlayer = null;
  }
  document.getElementById('challenge-btn').disabled = true; // Disable the challenge button again
}

function startTimer(challengedPlayer) {
  const timerDiv = document.getElementById('timer') || document.createElement('div');
  timerDiv.id = 'timer';
  timerDiv.textContent = '30';
  document.getElementById('challenge-area').appendChild(timerDiv);

  let timeLeft = 3;
  const timerInterval = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      showVotingModal(); // Enable voting after the challenge timer ends
    }
  }, 1000);
}

function showVotingModal() {
  const votingModal = document.getElementById('voting-modal');
  const votingTimer = document.getElementById('voting-timer');
  votingModal.style.display = 'block';

  document.getElementById('vote-success').disabled = false;
  document.getElementById('vote-fail').disabled = false;
  hasVoted = false; // Reset voting status

  let timeLeft = 10;
  votingTimer.textContent = timeLeft;

  voteTimerInterval = setInterval(() => {
    timeLeft--;
    votingTimer.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(voteTimerInterval);
      submitVotes(); // Submit votes automatically when time is up
    }
  }, 1000);
}

function addVote(success) {
  if (!hasVoted) { // Ensure the player can only vote once
    document.getElementById('vote-success').disabled = true;
    document.getElementById('vote-fail').disabled = true;
    hasVoted = true;

    if (success) {
      document.getElementById('vote-success').classList.add('selected-vote');
    } else {
      document.getElementById('vote-fail').classList.add('selected-vote');
    }
    submitVotes(); // Automatically submit the vote once selected
  } else {
    alert("You have already voted.");
  }
}

function closeVotingModal() {
  clearInterval(voteTimerInterval);
  document.getElementById('voting-modal').style.display = 'none';
  document.getElementById('vote-success').classList.remove('selected-vote');
  document.getElementById('vote-fail').classList.remove('selected-vote');
}

function submitVotes() {
  const roomCode = document.getElementById('welcome-message').textContent.split(': ')[1];
  const success = document.getElementById('vote-success').classList.contains('selected-vote') ? 'success' : 'fail';
  socket.emit('submitVotes', { roomCode, success, challenger, challenged: challengedPlayer });
  closeVotingModal();
}

document.getElementById('vote-success').addEventListener('click', () => addVote(true));
document.getElementById('vote-fail').addEventListener('click', () => addVote(false));
