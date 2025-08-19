console.log("game.js loaded");

// --- GLOBAL STATE (from state.js) ---
// gameState is defined in state.js and is available globally.

// --- GLOBAL VARIABLES for turn logic ---
let validMoves = [];

// --- UI ELEMENTS ---
// These will be assigned in DOMContentLoaded
let turnIndicator;
let confirmMoveBtn;
let mrXLog;

// --- GAME LOGIC ---

function updateMrXLog() {
    if (!mrXLog) return;
    mrXLog.innerHTML = ''; // Clear previous log
    gameState.mrXHistory.forEach((transport, index) => {
        const logEntry = document.createElement('div');
        logEntry.textContent = `Turn ${index + 1}: ${transport}`;
        // You can add styling here to make it look like a ticket
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
            destinations.forEach(destId => {
                moves.push(destId);
            });
        }
    }
    return [...new Set(moves)];
}

function handleStationClick(stationId) {
    if (!validMoves.includes(stationId)) {
        console.warn("Clicked on an invalid station:", stationId);
        return;
    }
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

function confirmMove() {
    if (gameState.selectedStationId === null) {
        console.error("Confirm move called with no selected station.");
        return;
    }

    const player = gameState.players[gameState.currentTurnPlayerIndex];
    const startStation = getStationById(player.currentPosition);
    const endStationId = gameState.selectedStationId;
    const transport = getTransportForMove(startStation, endStationId, player);

    if (!transport) {
        console.error("Could not determine transport for a supposedly valid move.");
        return;
    }

    player.tickets[transport]--;
    player.currentPosition = endStationId;

    if (player.role === 'Mr. X') {
        gameState.mrXHistory.push(transport);
    }

    drawPlayerMarkers();
    console.log(`${player.id} moved to station ${endStationId} via ${transport}.`);
    advanceTurn();
}

function startGame() {
    console.log("Game starting...");
    startTurn();
}

function startTurn() {
    gameState.selectedStationId = null;
    validMoves = [];
    resetStationHighlights();
    if (confirmMoveBtn) confirmMoveBtn.disabled = true;

    const currentPlayer = gameState.players[gameState.currentTurnPlayerIndex];
    console.log(`Round ${gameState.round}, Turn of: ${currentPlayer.id}`);

    if (turnIndicator) {
        turnIndicator.textContent = `Turn: ${currentPlayer.role} (${currentPlayer.id})`;
        turnIndicator.style.color = 'white';
        turnIndicator.style.backgroundColor = currentPlayer.color;
        turnIndicator.style.padding = '5px';
        turnIndicator.style.borderRadius = '5px';
    }

    updateMrXLog(); // Update the log at the start of every turn
    validMoves = getValidMoves(currentPlayer);
    console.log("Valid moves:", validMoves);
    highlightValidMoves(validMoves);
}

function advanceTurn() {
    gameState.currentTurnPlayerIndex++;
    const numPlayers = gameState.players.length;

    if (gameState.currentTurnPlayerIndex >= numPlayers) {
        gameState.round++;
        gameState.currentTurnPlayerIndex = 0;
        console.log(`--- Starting Round ${gameState.round} ---`);
    }

    startTurn();
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    turnIndicator = document.getElementById('turn-indicator');
    confirmMoveBtn = document.getElementById('confirm-move-btn');
    mrXLog = document.getElementById('mr-x-log');

    if (confirmMoveBtn) {
        confirmMoveBtn.addEventListener('click', confirmMove);
    }
});
