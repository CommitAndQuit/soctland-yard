console.log("game.js loaded");

// --- CONSTANTS ---
const MAX_ROUNDS = 24;

// --- GLOBAL VARIABLES ---
let validMoves = [];

// --- UI ELEMENTS ---
let turnIndicator, confirmMoveBtn, mrXLog, gameOverScreen, gameOverMessage;

// --- GAME LOGIC ---

function endGame(message) {
    if (gameState.isGameOver) return;
    console.log("Game Over:", message);
    gameState.isGameOver = true;

    if (gameOverScreen && gameOverMessage) {
        gameOverMessage.textContent = message;
        gameOverScreen.style.display = 'flex';
    }

    if (playerRole === 'host') {
        broadcastGameState();
    }
}

function checkWinConditions() {
    if (gameState.isGameOver) return;
    const mrX = gameState.players.find(p => p.role === 'Mr. X');
    if (!mrX) return; // Game hasn't started or Mr. X is missing
    const detectives = gameState.players.filter(p => p.role !== 'Mr. X');

    for (const detective of detectives) {
        if (detective.currentPosition === mrX.currentPosition) {
            endGame("Detectives Win! Mr. X has been caught.");
            return;
        }
    }

    if (gameState.round > MAX_ROUNDS) {
        endGame("Mr. X Wins! He has escaped.");
        return;
    }

    const canAnyDetectiveMove = detectives.some(d => getValidMoves(d).length > 0);
    if (detectives.length > 0 && !canAnyDetectiveMove) {
        endGame("Mr. X Wins! The detectives are stranded.");
        return;
    }
}

function confirmMove() {
    if (gameState.isGameOver) return;
    const selectedId = gameState.selectedStationId;
    if (selectedId === null) return;

    if (playerRole === 'host') {
        const player = gameState.players[gameState.currentTurnPlayerIndex];
        const startStation = getStationById(player.currentPosition);
        const transport = getTransportForMove(startStation, selectedId, player);
        if (!transport) return;

        player.tickets[transport]--;
        player.currentPosition = selectedId;
        if (player.isMrX) {
            gameState.mrXHistory.push(transport);
        }

        advanceTurn();
        broadcastGameState();

    } else if (playerRole === 'peer') {
        sendMoveToHost({ stationId: selectedId });
        confirmMoveBtn.disabled = true;
    }
}

function advanceTurn() {
    if (gameState.isGameOver) return;
    gameState.currentTurnPlayerIndex++;
    if (gameState.currentTurnPlayerIndex >= gameState.players.length) {
        gameState.round++;
        gameState.currentTurnPlayerIndex = 0;
    }
    checkWinConditions();
    updateUIFromGameState();
}

function updateMrXLog() {
    if (!mrXLog) return;
    mrXLog.innerHTML = '';
    gameState.mrXHistory.forEach((transport, index) => {
        const logEntry = document.createElement('div');
        logEntry.textContent = `Turn ${index + 1}: ${transport}`;
        logEntry.style.backgroundColor = transportColors[transport] || 'gray';
        logEntry.style.color = 'black';
        logEntry.style.padding = '2px 5px';
        logEntry.style.margin = '2px';
        logEntry.style.borderRadius = '3px';
        mrXLog.appendChild(logEntry);
    });
}

function getValidMoves(player) {
    const moves = [];
    if (!player) return moves;
    const currentStation = getStationById(player.currentPosition);
    if (!currentStation || !currentStation.connections) return moves;
    for (const transport in player.tickets) {
        if (player.tickets[transport] > 0) {
            const destinations = currentStation.connections[transport] || [];
            destinations.forEach(destId => moves.push(destId));
        }
    }
    return [...new Set(moves)];
}

function handleStationClick(stationId) {
    if (gameState.isGameOver || !validMoves.includes(stationId)) return;
    // TODO: Add check to only allow moves for this client's player
    gameState.selectedStationId = stationId;
    selectStationHighlight(stationId);
    confirmMoveBtn.disabled = false;
}

function getTransportForMove(startStation, endStationId, player) {
    const transportPriority = ['taxi', 'bus', 'underground'];
    for (const transport of transportPriority) {
        if (player.tickets[transport] > 0 && startStation.connections[transport]?.includes(endStationId)) {
            return transport;
        }
    }
    return null;
}

function updateUIFromGameState() {
    if (gameState.isGameOver) {
        if (gameOverScreen.style.display === 'none' && gameState.winnerMessage) {
            endGame(gameState.winnerMessage);
        }
        return;
    }

    if (!gameState.players || gameState.players.length === 0) return;

    gameState.selectedStationId = null;
    validMoves = [];
    resetStationHighlights();
    if (confirmMoveBtn) confirmMoveBtn.disabled = true;

    drawPlayerMarkers();
    updateMrXLog();

    const currentPlayer = gameState.players[gameState.currentTurnPlayerIndex];
    if (turnIndicator && currentPlayer) {
        turnIndicator.textContent = `Turn: ${currentPlayer.role} (${currentPlayer.id})`;
        turnIndicator.style.color = 'white';
        turnIndicator.style.backgroundColor = currentPlayer.color;
        turnIndicator.style.padding = '5px';
        turnIndicator.style.borderRadius = '5px';
    }

    // TODO: Only calculate and highlight moves if it's this client's turn
    validMoves = getValidMoves(currentPlayer);
    highlightValidMoves(validMoves);
}

function startGame() {
    console.log("Game starting...");
    updateUIFromGameState();
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    turnIndicator = document.getElementById('turn-indicator');
    confirmMoveBtn = document.getElementById('confirm-move-btn');
    mrXLog = document.getElementById('mr-x-log');
    gameOverScreen = document.getElementById('game-over-screen');
    gameOverMessage = document.getElementById('game-over-message');

    if (confirmMoveBtn) {
        confirmMoveBtn.addEventListener('click', confirmMove);
    }
});
