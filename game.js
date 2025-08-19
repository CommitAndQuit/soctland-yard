console.log("game.js loaded");

// --- GLOBAL VARIABLES for turn logic ---
let validMoves = [];

// --- UI ELEMENTS ---
let turnIndicator, confirmMoveBtn, mrXLog;

// --- GAME LOGIC ---

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
    // Only the current player on their machine can select a move
    // TODO: Add check to see if it's this client's player's turn
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
    const selectedId = gameState.selectedStationId;
    if (selectedId === null) {
        console.error("Confirm move called with no selected station.");
        return;
    }

    if (playerRole === 'host') {
        const player = gameState.players[gameState.currentTurnPlayerIndex];
        const startStation = getStationById(player.currentPosition);
        const transport = getTransportForMove(startStation, selectedId, player);

        if (!transport) {
            console.error("Host validation failed for a move.");
            return;
        }

        // --- Update Game State ---
        player.tickets[transport]--;
        player.currentPosition = selectedId;
        if (player.role === 'Mr. X') {
            gameState.mrXHistory.push(transport);
        }

        console.log(`${player.id} moved to station ${selectedId} via ${transport}.`);

        // --- Advance turn and broadcast ---
        advanceTurn(); // This will update the UI locally for the host
        broadcastGameState(); // And send the new state to all peers

    } else if (playerRole === 'peer') {
        // Peers don't update state directly. They send their move to the host.
        console.log(`Peer sending move to station ${selectedId} to host.`);
        sendMoveToHost({ stationId: selectedId });
        // The peer's UI will be updated when it receives the new game state from the host.
        // Disable the button to prevent multiple submissions
        confirmMoveBtn.disabled = true;
    }
}

function advanceTurn() {
    gameState.currentTurnPlayerIndex++;
    const numPlayers = gameState.players.length;
    if (gameState.currentTurnPlayerIndex >= numPlayers) {
        gameState.round++;
        gameState.currentTurnPlayerIndex = 0;
    }
    updateUIFromGameState();
}

// Centralized UI update function
function updateUIFromGameState() {
    console.log("Updating UI from game state");

    // Reset highlights and selections
    gameState.selectedStationId = null;
    validMoves = [];
    resetStationHighlights();
    if (confirmMoveBtn) confirmMoveBtn.disabled = true;

    // Redraw player markers
    drawPlayerMarkers();

    // Update Mr. X log
    updateMrXLog();

    // Update turn indicator
    const currentPlayer = gameState.players[gameState.currentTurnPlayerIndex];
    if (turnIndicator) {
        turnIndicator.textContent = `Turn: ${currentPlayer.role} (${currentPlayer.id})`;
        turnIndicator.style.color = 'white';
        turnIndicator.style.backgroundColor = currentPlayer.color;
        turnIndicator.style.padding = '5px';
        turnIndicator.style.borderRadius = '5px';
    }

    // Determine and highlight valid moves for the current player on this client
    // TODO: This should only happen if the current turn belongs to this client
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

    if (confirmMoveBtn) {
        confirmMoveBtn.addEventListener('click', confirmMove);
    }
    // startGame() is now called from network.js after the board and connection are ready.
});
