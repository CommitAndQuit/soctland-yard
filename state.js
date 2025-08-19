console.log("state.js loaded");

const gameState = {
    isGameOver: false,
    winnerMessage: null,
    round: 1,
    currentTurnPlayerIndex: 0,
    mrXHistory: [],
    players: [], // This will be populated by the host
};
