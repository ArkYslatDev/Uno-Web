const socket = io();
let myState = null;
let myId = null;

function createRoom(name, vsAI) {
  return new Promise((res, rej) => {
    socket.emit('createRoom', { name, vsAI }, (r) => r.ok ? res(r) : rej(r.error));
  });
}
function joinRoom(name, roomId) {
  return new Promise((res, rej) => {
    socket.emit('joinRoom', { name, roomId }, (r) => r.ok ? res(r) : rej(r.error));
  });
}
function startGame() { socket.emit('startGame'); }
function playCard(cardId, chosenColor) {
  return new Promise((res) => {
    socket.emit('playCard', { cardId, chosenColor }, (r) => res(r));
  });
}
function drawCard() {
  return new Promise((res) => socket.emit('drawCard', (r) => res(r)));
}

socket.on('gameState', (state) => {
  myState = state;
  myId = state.forYou;
  if (typeof renderGame === 'function') renderGame(state);
});