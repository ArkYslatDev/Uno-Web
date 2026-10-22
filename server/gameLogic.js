const crypto = require('crypto');

const COLORS = ['red', 'yellow', 'green', 'blue'];
const VALUES = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
const WILD_VALUES = ['wild', 'wild4'];

// Update: Mendukung multiple deck
function createDeck(numSets = 1) {
  const deck = [];
  for (let s = 0; s < numSets; s++) {
    for (const color of COLORS) {
      deck.push({ color, value: '0', id: crypto.randomUUID() });
      for (const v of VALUES.slice(1)) {
        deck.push({ color, value: v, id: crypto.randomUUID() });
        deck.push({ color, value: v, id: crypto.randomUUID() });
      }
    }
    for (const wv of WILD_VALUES) {
      for (let i = 0; i < 4; i++) {
        deck.push({ color: 'wild', value: wv, id: crypto.randomUUID() });
      }
    }
  }
  return shuffle(deck);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function canPlay(card, topCard, currentColor) {
  if (card.value === 'wild' || card.value === 'wild4') return true;
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

class Game {
  constructor(roomId, players) {
    this.roomId = roomId;
    this.players = players;
    this.deck = createDeck(1); // Default 1 deck
    this.discard = [];
    this.currentColor = null;
    this.currentPlayer = 0;
    this.direction = 1;
    this.started = false;
    this.winner = null;
  }

  start() {
    // Update: Jika pemain lebih dari 4, gunakan 2 set deck UNO
    if (this.players.length > 4) {
      this.deck = createDeck(2);
    }

    for (const p of this.players) {
      p.hand = this.deck.splice(0, 7);
    }
    
    let firstIdx = this.deck.findIndex(c => c.value !== 'wild4' && c.value !== 'wild');
    if (firstIdx === -1) firstIdx = 0;
    const firstCard = this.deck.splice(firstIdx, 1)[0];
    this.discard.push(firstCard);
    this.currentColor = firstCard.color === 'wild' ? COLORS[Math.floor(Math.random()*4)] : firstCard.color;

    if (firstCard.value === 'skip') this.advanceTurn();
    if (firstCard.value === 'reverse') {
      if (this.players.length === 2) this.advanceTurn();
      else this.direction *= -1;
    }
    if (firstCard.value === 'draw2') {
      const target = this.players[this.currentPlayer];
      this.drawCards(target, 2);
      this.advanceTurn();
    }

    this.started = true;
    return this.getState();
  }

  drawCards(player, n) {
    for (let i = 0; i < n; i++) {
      if (this.deck.length === 0) this.reshuffle();
      if (this.deck.length > 0) player.hand.push(this.deck.pop());
    }
  }

  reshuffle() {
    const top = this.discard.pop();
    this.deck = shuffle(this.discard);
    this.discard = [top];
  }

  advanceTurn() {
    this.currentPlayer = (this.currentPlayer + this.direction + this.players.length) % this.players.length;
  }

  playCard(playerId, cardId, chosenColor = null) {
    const player = this.players[this.currentPlayer];
    if (player.id !== playerId) throw new Error('Bukan giliranmu');
    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) throw new Error('Kartu tidak ada');
    const card = player.hand[cardIdx];
    const top = this.discard[this.discard.length - 1];

    if (!canPlay(card, top, this.currentColor)) throw new Error('Kartu tidak valid');

    player.hand.splice(cardIdx, 1);
    this.discard.push(card);

    if (card.color === 'wild') {
      this.currentColor = chosenColor || COLORS[Math.floor(Math.random()*4)];
    } else {
      this.currentColor = card.color;
    }

    switch (card.value) {
      case 'skip': this.advanceTurn(); break;
      case 'reverse':
        if (this.players.length === 2) this.advanceTurn();
        else this.direction *= -1;
        break;
      case 'draw2': {
        this.advanceTurn();
        this.drawCards(this.players[this.currentPlayer], 2);
        break;
      }
      case 'wild4': {
        this.advanceTurn();
        this.drawCards(this.players[this.currentPlayer], 4);
        break;
      }
    }

    if (player.hand.length === 0) {
      this.winner = player.id;
      return this.getState();
    }

    this.advanceTurn();
    return this.getState();
  }

  drawForPlayer(playerId) {
    const player = this.players[this.currentPlayer];
    if (player.id !== playerId) throw new Error('Bukan giliranmu');
    this.drawCards(player, 1);
    this.advanceTurn();
    return this.getState();
  }

  getState(forPlayerId = null) {
    return {
      roomId: this.roomId,
      currentPlayer: this.players[this.currentPlayer].id,
      currentColor: this.currentColor,
      topCard: this.discard[this.discard.length - 1],
      deckCount: this.deck.length,
      winner: this.winner,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isAI: p.isAI,
        handCount: p.hand.length,
        hand: (forPlayerId === p.id || !forPlayerId) ? p.hand : undefined
      }))
    };
  }
}

module.exports = { Game, canPlay, createDeck, COLORS };