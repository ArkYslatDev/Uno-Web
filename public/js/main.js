const lobbyEl = document.getElementById('lobby');
const gameEl = document.getElementById('game');
const opponentEl = document.getElementById('opponents');
const handEl = document.getElementById('playerHand');
const discardEl = document.getElementById('discardPile');
const deckEl = document.getElementById('deckPile');
const deckCountEl = document.getElementById('deckCount');
const colorIndicator = document.getElementById('colorIndicator');
const turnLabel = document.getElementById('turnLabel');
const roomLabel = document.getElementById('roomLabel');
const colorModal = document.getElementById('colorModal');
const winModal = document.getElementById('winModal');
const winTitle = document.getElementById('winTitle');

let pendingWildCardId = null;

document.getElementById('btnVsAI').onclick = async () => {
  const name = document.getElementById('playerName').value.trim() || 'Player';
  try {
    const r = await createRoom(name, true);
    startGame();
    lobbyEl.classList.remove('active');
    gameEl.classList.add('active');
    roomLabel.textContent = 'Room: ' + r.roomId;
  } catch (e) { document.getElementById('lobbyStatus').textContent = e; }
};

document.getElementById('btnCreate').onclick = async () => {
  const name = document.getElementById('playerName').value.trim() || 'Player';
  try {
    const r = await createRoom(name, false);
    document.getElementById('lobbyStatus').textContent = `Room: ${r.roomId} — tunggu pemain lain, lalu tekan tombol lagi untuk mulai.`;
    document.getElementById('btnCreate').textContent = '▶ Mulai Game';
    document.getElementById('btnCreate').onclick = () => {
      startGame();
      lobbyEl.classList.remove('active');
      gameEl.classList.add('active');
      roomLabel.textContent = 'Room: ' + r.roomId;
    };
  } catch (e) { document.getElementById('lobbyStatus').textContent = e; }
};

document.getElementById('btnJoin').onclick = async () => {
  const name = document.getElementById('playerName').value.trim() || 'Player';
  const roomId = document.getElementById('roomCode').value.trim().toUpperCase();
  try {
    await joinRoom(name, roomId);
    lobbyEl.classList.remove('active');
    gameEl.classList.add('active');
    roomLabel.textContent = 'Room: ' + roomId;
  } catch (e) { document.getElementById('lobbyStatus').textContent = e; }
};

function renderGame(state) {
  colorIndicator.style.background = state.currentColor;
  colorIndicator.style.color = state.currentColor;

  const current = state.players.find(p => p.id === state.currentPlayer);
  turnLabel.textContent = state.winner
    ? '🏆 ' + state.players.find(p => p.id === state.winner).name + ' menang!'
    : current.id === myId ? '👉 Giliranmu!' : '⏳ Menunggu ' + current.name;

  opponentEl.innerHTML = '';
  for (const p of state.players) {
    if (p.id === myId) continue;
    const div = document.createElement('div');
    div.className = 'opponent' + (p.id === state.currentPlayer ? ' active' : '');
    div.innerHTML = `<div>${p.name}${p.isAI ? ' 🤖' : ''}</div>
      <div class="cards-mini">${'<div class="mini-card"></div>'.repeat(Math.min(p.handCount, 8))}</div>
      <div style="font-size:12px;opacity:0.7">${p.handCount} kartu</div>`;
    opponentEl.appendChild(div);
  }

  discardEl.innerHTML = '';
  discardEl.appendChild(renderCard(state.topCard));

  deckCountEl.textContent = state.deckCount;

  const me = state.players.find(p => p.id === myId);
  handEl.innerHTML = '';
  if (me && me.hand) {
    me.hand.forEach(card => {
      const cardEl = renderCard(card, true);
      const playable = canPlayClient(card, state.topCard, state.currentColor);
      if (playable && me.id === state.currentPlayer && !state.winner) {
        cardEl.classList.add('playable');
        cardEl.onclick = () => handleCardClick(card); // <-- Bug fixed
      } else {
        cardEl.style.cursor = 'default';
      }
      handEl.appendChild(cardEl);
    });
  }

  if (state.winner) {
    const winner = state.players.find(p => p.id === state.winner);
    winTitle.textContent = winner.id === myId ? '🎉 Kamu Menang!' : `😢 ${winner.name} menang`;
    winModal.classList.add('active');
  }
}

function canPlayClient(card, top, currentColor) {
  if (card.value === 'wild' || card.value === 'wild4') return true;
  if (card.color === currentColor) return true;
  if (card.value === top.value) return true;
  return false;
}

function renderCard(card) {
  const el = document.createElement('div');
  el.className = 'card ' + card.color;
  const inner = document.createElement('div');
  inner.className = 'card-inner';
  const symbolMap = { skip: '🚫', reverse: '🔄', draw2: '+2', wild: '🎨', wild4: '+4' };
  inner.textContent = symbolMap[card.value] || card.value;
  el.appendChild(inner);
  return el;
}

async function handleCardClick(card) {
  if (card.value === 'wild' || card.value === 'wild4') {
    pendingWildCardId = card.id;
    colorModal.classList.add('active');
    return;
  }
  await playCard(card.id);
}

document.querySelectorAll('.color-btn').forEach(btn => {
  btn.onclick = async () => {
    colorModal.classList.remove('active');
    if (pendingWildCardId) {
      await playCard(pendingWildCardId, btn.dataset.color);
      pendingWildCardId = null;
    }
  };
});

deckEl.onclick = async () => {
  if (!myState || myState.winner) return;
  if (myState.currentPlayer !== myId) return;
  await drawCard();
};