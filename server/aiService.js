async function askAI(state, playerId) {
  const me = state.players.find(p => p.id === playerId);
  const nextIdx = (state.players.findIndex(p => p.id === playerId) + 1) % state.players.length;
  const nextPlayer = state.players[nextIdx];

  try {
    const res = await fetch('http://127.0.0.1:5001/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hand: me.hand,
        topCard: state.topCard,
        currentColor: state.currentColor,
        nextPlayerHandCount: nextPlayer.handCount
      })
    });
    return await res.json();
  } catch (error) {
    console.error("Gagal menghubungi AI Python. Pastikan python menyala.", error.message);
    return { action: 'draw' }; // Fallback jika Python mati
  }
}

module.exports = { askAI };