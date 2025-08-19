console.log("game.js loaded");

// --- CONSTANTS ---
const MAX_ROUNDS = 24;

// --- GLOBAL VARIABLES ---
let validMoves = [];

// --- UI ELEMENTS ---
let turnIndicator, confirmMoveBtn, mrXLog, gameOverScreen, gameOverMessage;

// --- GAME LOGIC ---

function endGame(message) {
    if (gameState.isGameOver) return; // Prevent multiple endings

    console.log("Game Over:", message);
    gameState.isGameOver = true;

    if (gameOverScreen && gameOverMessage) {
        gameOverMessage.textContent = message;
        gameOverScreen.style.display = 'flex';
    }

    if (playerRole === 'host') {
        broadcastGameState(); // Send final state
    }
}

function checkWinConditions() {
    if (gameState.isGameOver) return;

    const mrX = gameState.players.find(p => p.role === 'Mr. X');
    const detectives = gameState.players.filter(p => p.role === 'Detective');

    // 1. Detectives win by catching Mr. X
    for (const detective of detectives) {
        if (detective.currentPosition === mrX.currentPosition) {
            endGame("Detectives Win! Mr. X has been caught.");
            return;
        }
    }

    // 2. Mr. X wins by surviving all rounds
    if (gameState.round > MAX_ROUNDS) {
        endGame("Mr. X Wins! He has escaped.");
        return;
    }

    // 3. Mr. X wins if all detectives are stranded
    const canAnyDetectiveMove = detectives.some(d => getValidMoves(d).length > 0);
    if (!canAnyDetectiveMove) {
        endGame("Mr. X Wins! The detectives are stranded.");
        return;
    }
}

function confirmMove() {
    // ... (rest of the function is the same, but with checks for isGameOver)
    if (gameState.isGameOver) {
        console.warn("Attempted to move after game over.");
        return;
    }

    const selectedId = gameState.selectedStationId;
    if (selectedId === null) { return; }

    if (playerRole === 'host') {
        const player = gameState.players[gameState.currentTurnPlayerIndex];
        const startStation = getStationById(player.currentPosition);
        const transport = getTransportForMove(startStation, selectedId, player);

        if (!transport) { return; }

        player.tickets[transport]--;
        player.currentPosition = selectedId;
        if (player.role === 'Mr. X') {
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
    // Host-only function
    if (gameState.isGameOver) return;

    gameState.currentTurnPlayerIndex++;
    const numPlayers = gameState.players.length;
    if (gameState.currentTurnPlayerIndex >= numPlayers) {
        gameState.round++;
        gameState.currentTurnPlayerIndex = 0;
    }

    // Check for win conditions after state has been updated
    checkWinConditions();
    updateUIFromGameState();
}

// --- UI AND STATE SYNC ---

function updateMrXLog() { /* ... same as before ... */ }
function getValidMoves(player) { /* ... same as before ... */ }
function handleStationClick(stationId) { /* ... same as before ... */ }
function getTransportForMove(startStation, endStationId, player) { /* ... same as before ... */ }

// Re-pasting for completeness
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
    const currentStation = getStationById(player.currentPosition);
    if (!currentStation || !currentStation.connections) return [];
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
        // Find winner message if not already displayed
        const mrX = gameState.players.find(p => p.role === 'Mr. X');
        const detectives = gameState.players.filter(p => p.role === 'Detective');
        let winnerMsg = '';
        const detectiveAtMrX = detectives.find(d => d.currentPosition === mrX.currentPosition);
        if (detectiveAtMrX) winnerMsg = "Detectives Win!";
        else if (gameState.round > MAX_ROUNDS) winnerMsg = "Mr. X Wins!";

        if(gameOverScreen.style.display === 'none' && winnerMsg) {
             endGame(winnerMsg);
        }
        return;
    }

    gameState.selectedStationId = null;
    validMoves = [];
    resetStationHighlights();
    if (confirmMoveBtn) confirmMoveBtn.disabled = true;

    drawPlayerMarkers();
    updateMrXLog();

    const currentPlayer = gameState.players[gameState.currentTurnPlayerIndex];
    if (turnIndicator) {
        turnIndicator.textContent = `Turn: ${currentPlayer.role} (${currentPlayer.id})`;
        turnIndicator.style.color = 'white';
        turnIndicator.style.backgroundColor = currentPlayer.color;
        turnIndicator.style.padding = '5px';
        turnIndicator.style.borderRadius = '5px';
    }

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
