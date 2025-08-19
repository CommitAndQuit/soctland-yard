console.log("game.js loaded");

// --- CONSTANTS ---
const MAX_ROUNDS = 24;

// --- GLOBAL TURN STATE ---
let turnState = {
    validMoves: [],
    selectedStationId: null,
    useBlackTicket: false,
    isDoubleMove: false,
    isSecondMove: false,
    filterTransport: null, // NEW: To filter moves by transport type
};

// --- UI ELEMENTS ---
let ui = {};

// --- GAME LOGIC ---
function endGame(message) { /* ... */ }
function checkWinConditions() { /* ... */ }
function confirmMove(moveData) { /* ... */ }
function advanceTurn() { /* ... */ }
function getTransportForMove(startStation, endStationId, player, useBlack = false) { /* ... */ }
function handleStationClick(stationId) { /* ... */ }
// Re-pasting for completeness
function endGame(message) { if (gameState.isGameOver) return; console.log("Game Over:", message); gameState.isGameOver = true; if (ui.gameOverScreen && ui.gameOverMessage) { ui.gameOverMessage.textContent = message; ui.gameOverScreen.style.display = 'flex'; } if (playerRole === 'host') { broadcastGameState(); } }
function checkWinConditions() { if (gameState.isGameOver) return; const mrX = gameState.players.find(p => p.role === 'Mr. X'); if (!mrX) return; const detectives = gameState.players.filter(p => p.role !== 'Mr. X'); for (const detective of detectives) { if (detective.currentPosition === mrX.currentPosition) { endGame("Detectives Win! Mr. X has been caught."); return; } } if (gameState.round > MAX_ROUNDS) { endGame("Mr. X Wins! He has escaped."); return; } const canAnyDetectiveMove = detectives.some(d => getValidMoves(d).length > 0); if (detectives.length > 0 && !canAnyDetectiveMove) { endGame("Mr. X Wins! The detectives are stranded."); return; } }
function confirmMove(moveData) { if (gameState.isGameOver) return; const move = moveData || { stationId: turnState.selectedStationId, useBlackTicket: turnState.useBlackTicket, isDoubleMove: turnState.isDoubleMove }; if (move.stationId === null) return; if (playerRole === 'peer') { sendMoveToHost(move); ui.confirmMoveBtn.disabled = true; return; } const player = gameState.players[gameState.currentTurnPlayerIndex]; const startStation = getStationById(player.currentPosition); const transport = getTransportForMove(startStation, move.stationId, player, move.useBlackTicket); if (!transport) { console.error("Host validation failed for move."); return; } player.tickets[transport]--; player.currentPosition = move.stationId; gameState.mrXHistory.push(move.useBlackTicket ? 'black' : transport); if (move.isDoubleMove && !turnState.isSecondMove) { player.tickets.double--; turnState.isSecondMove = true; updateUIFromGameState(); } else { if(turnState.isSecondMove) turnState.isSecondMove = false; advanceTurn(); } broadcastGameState(); }
function advanceTurn() { if (gameState.isGameOver) return; gameState.currentTurnPlayerIndex++; if (gameState.currentTurnPlayerIndex >= gameState.players.length) { gameState.round++; gameState.currentTurnPlayerIndex = 0; } checkWinConditions(); updateUIFromGameState(); }
function getTransportForMove(startStation, endStationId, player, useBlack = false) { if (useBlack) return 'black'; const transportPriority = ['taxi', 'bus', 'underground']; for (const transport of transportPriority) { if (player.tickets[transport] > 0 && startStation.connections[transport]?.includes(endStationId)) { return transport; } } return null; }
function handleStationClick(stationId) { if (gameState.isGameOver || !turnState.validMoves.includes(stationId)) return; turnState.selectedStationId = stationId; selectStationHighlight(stationId); ui.confirmMoveBtn.disabled = false; }


// --- MOVE CALCULATION & DISPLAY ---

function getValidMoves(player, { useBlack = false, filter = null } = {}) {
    const moves = [];
    if (!player) return moves;
    const currentStation = getStationById(player.currentPosition);
    if (!currentStation?.connections) return moves;

    const transportTypes = filter ? [filter] : (useBlack ? ['taxi', 'bus', 'underground'] : Object.keys(player.tickets));

    for (const transport of transportTypes) {
        if (player.tickets[transport] > 0 || (useBlack && player.tickets.black > 0)) {
            const destinations = currentStation.connections[transport] || [];
            destinations.forEach(destId => moves.push(destId));
        }
    }
    return [...new Set(moves)];
}

function rerenderMoveHighlights() {
    const currentPlayer = gameState.players[gameState.currentTurnPlayerIndex];
    turnState.validMoves = getValidMoves(currentPlayer, { useBlack: turnState.useBlackTicket, filter: turnState.filterTransport });
    resetStationHighlights();
    highlightValidMoves(turnState.validMoves);
}

// --- UI UPDATE FUNCTIONS ---

function updatePlayerInfoUI(player) {
    if (!ui.playerTickets) return;
    ui.playerTickets.innerHTML = '<h4>Your Tickets:</h4>';
    for(const [ticket, count] of Object.entries(player.tickets)) {
        const ticketEl = document.createElement('div');
        ticketEl.className = 'ticket-display';
        ticketEl.textContent = `${ticket}: ${count}`;
        ticketEl.style.backgroundColor = transportColors[ticket] || 'gray';
        ticketEl.onclick = () => {
            // Toggle filter
            turnState.filterTransport = turnState.filterTransport === ticket ? null : ticket;
            rerenderMoveHighlights();
            // Add a visual indicator for the active filter
            document.querySelectorAll('.ticket-display').forEach(t => t.style.border = '1px solid black');
            if(turnState.filterTransport === ticket) {
                ticketEl.style.border = '2px solid cyan';
            }
        };
        ui.playerTickets.appendChild(ticketEl);
    }
}

function updateUIFromGameState() {
    if (gameState.isGameOver) { /* ... */ return; }
    if (!gameState.players || gameState.players.length === 0) return;

    if (!turnState.isSecondMove) {
        turnState.isDoubleMove = false;
        turnState.filterTransport = null;
    }
    turnState.useBlackTicket = false;
    turnState.selectedStationId = null;

    resetStationHighlights();
    if (ui.confirmMoveBtn) ui.confirmMoveBtn.disabled = true;

    drawPlayerMarkers();
    updateMrXLog();

    const currentPlayer = gameState.players[gameState.currentTurnPlayerIndex];
    if (ui.turnIndicator && currentPlayer) {
        let turnText = `Turn: ${currentPlayer.role} (${currentPlayer.id})`;
        if(turnState.isSecondMove) turnText += " (Double Move - 2nd)";
        ui.turnIndicator.textContent = turnText;
    }

    if (ui.specialMoves) {
        const canUseSpecial = currentPlayer.isMrX && !turnState.isSecondMove;
        ui.specialMoves.style.display = canUseSpecial ? 'block' : 'none';
        if(canUseSpecial) {
            ui.doubleMoveBtn.disabled = currentPlayer.tickets.double <= 0;
            ui.blackTicketBtn.disabled = currentPlayer.tickets.black <= 0;
        }
    }

    updatePlayerInfoUI(currentPlayer);
    rerenderMoveHighlights();
}

function startGame() { /* ... */ }
function updateMrXLog() { /* ... */ }
// Re-pasting for completeness
function startGame() { console.log("Game starting..."); updateUIFromGameState(); }
function updateMrXLog() { if (!ui.mrXLog) return; ui.mrXLog.innerHTML = ''; gameState.mrXHistory.forEach((transport, index) => { const logEntry = document.createElement('div'); logEntry.textContent = `Turn ${index + 1}: ${transport}`; logEntry.style.backgroundColor = transportColors[transport] || 'gray'; logEntry.style.color = 'black'; logEntry.style.padding = '2px 5px'; logEntry.style.margin = '2px'; logEntry.style.borderRadius = '3px'; ui.mrXLog.appendChild(logEntry); }); }


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    ui = {
        playerTickets: document.getElementById('player-tickets'),
        turnIndicator: document.getElementById('turn-indicator'),
        confirmMoveBtn: document.getElementById('confirm-move-btn'),
        mrXLog: document.getElementById('mr-x-log'),
        gameOverScreen: document.getElementById('game-over-screen'),
        gameOverMessage: document.getElementById('game-over-message'),
        specialMoves: document.getElementById('special-moves'),
        doubleMoveBtn: document.getElementById('double-move-btn'),
        blackTicketBtn: document.getElementById('black-ticket-btn')
    };

    if (ui.confirmMoveBtn) { ui.confirmMoveBtn.addEventListener('click', () => confirmMove()); }
    if (ui.doubleMoveBtn) { ui.doubleMoveBtn.addEventListener('click', () => { turnState.isDoubleMove = true; ui.doubleMoveBtn.disabled = true; }); }
    if (ui.blackTicketBtn) { ui.blackTicketBtn.addEventListener('click', () => { turnState.useBlackTicket = true; rerenderMoveHighlights(); ui.blackTicketBtn.disabled = true; }); }
});
