console.log("network.js loaded");

// --- Constants ---
const PLAYER_ROLES = ['Mr. X', 'Detective Blue', 'Detective Green', 'Detective Red', 'Detective Yellow'];
const STARTING_POSITIONS = {
    'Mr. X': [35, 51, 67, 103, 142],
    'Detective': [13, 29, 53, 91, 138, 155, 174, 198]
};
const TICKET_ALLOCATIONS = {
    'Mr. X': { taxi: 24, bus: 24, underground: 24, black: 5, double: 2 },
    'Detective': { taxi: 10, bus: 8, underground: 4 }
};

// --- Global Variables ---
let playerRole = null;
let peer = null;
let myPeerId = null;
let connections = new Map();

// --- Data Synchronization ---
function broadcastGameState() {
    if (playerRole !== 'host') return;
    const message = { type: 'game-state-update', payload: gameState };
    console.log("Host broadcasting state:", message);
    for (const conn of connections.values()) {
        conn.send(message);
    }
}

function sendMoveToHost(move) {
    if (playerRole !== 'peer') return;
    const hostConn = connections.values().next().value;
    if (hostConn) {
        const message = { type: 'player-move', payload: move };
        console.log("Peer sending move:", message);
        hostConn.send(message);
    }
}

function handleHostData(data, peerId) {
    if (data.type === 'player-move') {
        const currentPlayer = gameState.players[gameState.currentTurnPlayerIndex];
        if (currentPlayer.id === peerId) {
            console.log(`Host processing valid move from ${peerId}:`, data.payload);
            // The host calls confirmMove with the data received from the peer
            confirmMove(data.payload);
        } else {
            console.warn(`Host received move from ${peerId}, but it is ${currentPlayer.id}'s turn.`);
        }
    }
}

function handlePeerData(data) {
    if (data.type === 'game-state-update') {
        console.log("Peer received new game state.");
        Object.assign(gameState, data.payload);
        updateUIFromGameState();
    }
}

// --- LOBBY AND ROLE ASSIGNMENT ---
function updateLobbyUI() {
    const playerListDiv = document.getElementById('player-list');
    playerListDiv.innerHTML = '';
    const createPlayerRow = (id, isHost = false) => {
        const row = document.createElement('div');
        const select = document.createElement('select');
        select.dataset.playerId = id;
        PLAYER_ROLES.forEach(role => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role;
            select.appendChild(option);
        });
        row.innerHTML = `<span>${id} ${isHost ? '(Host)' : ''}</span>`;
        row.appendChild(select);
        playerListDiv.appendChild(row);
    };
    if (myPeerId) createPlayerRow(myPeerId, true);
    for (const peerId of connections.keys()) {
        createPlayerRow(peerId, false);
    }
}

function buildGameStateFromLobby() {
    const playerElements = document.querySelectorAll('#player-list select');
    const assignedRoles = new Set();
    const newPlayers = [];
    let mrXCount = 0;

    for (const select of playerElements) {
        const playerId = select.dataset.playerId;
        const role = select.value;
        if (assignedRoles.has(role)) { alert(`Role "${role}" assigned twice!`); return null; }
        if (role === 'Mr. X') mrXCount++;
        assignedRoles.add(role);
        const isMrX = role === 'Mr. X';
        const tickets = isMrX ? TICKET_ALLOCATIONS['Mr. X'] : TICKET_ALLOCATIONS['Detective'];
        const startPos = isMrX ? STARTING_POSITIONS['Mr. X'][Math.floor(Math.random() * STARTING_POSITIONS['Mr. X'].length)] : STARTING_POSITIONS['Detective'][Math.floor(Math.random() * STARTING_POSITIONS['Detective'].length)];
        newPlayers.push({ id: playerId, role: role, isMrX: isMrX, currentPosition: startPos, tickets: { ...tickets }, color: role.split(' ')[1]?.toLowerCase() || 'black' });
    }
    if (mrXCount !== 1) { alert('Exactly one player must be Mr. X.'); return null; }
    newPlayers.sort((a, b) => a.isMrX - b.isMrX);
    gameState.players = newPlayers;
    return true;
}

// --- PeerJS Host Logic ---
function hostGame() {
    playerRole = 'host';
    peer = new Peer();
    peer.on('open', (id) => {
        myPeerId = id;
        document.getElementById('room-code-display').textContent = id;
        document.getElementById('host-lobby').style.display = 'block';
        document.querySelector('.start-options').style.display = 'none';
        updateLobbyUI();
    });
    peer.on('connection', (conn) => {
        console.log(`Peer ${conn.peer} has connected.`);
        connections.set(conn.peer, conn);
        updateLobbyUI();
        conn.on('data', (data) => handleHostData(data, conn.peer));
        conn.on('close', () => {
            connections.delete(conn.peer);
            updateLobbyUI();
            endGame(`Player ${conn.peer} disconnected. Game over.`);
        });
    });
    peer.on('error', (err) => { alert(`An error occurred: ${err.message}`); });
}

// --- PeerJS Peer Logic ---
function joinGame(hostId) {
    playerRole = 'peer';
    peer = new Peer();
    peer.on('open', (id) => {
        myPeerId = id;
        const conn = peer.connect(hostId);
        connections.set(hostId, conn);
        conn.on('open', () => {
            console.log("Connection to host established.");
            document.getElementById('start-screen').style.display = 'none';
            document.getElementById('game-container').style.display = 'flex';
        });
        conn.on('data', handlePeerData);
        conn.on('close', () => { endGame("Disconnected from host. Game over."); });
    });
    peer.on('error', (err) => { alert(`An error occurred: ${err.message}`); });
}

// --- UI Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const roomCodeInput = document.getElementById('room-code-input');
    const startGameBtn = document.getElementById('start-game-btn');

    if (createGameBtn) createGameBtn.addEventListener('click', hostGame);
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', () => {
            const roomCode = roomCodeInput.value.trim();
            if (roomCode) joinGame(roomCode);
            else alert("Please enter a room code.");
        });
    }
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            if (buildGameStateFromLobby()) {
                document.getElementById('start-screen').style.display = 'none';
                document.getElementById('game-container').style.display = 'flex';
                startGame();
                broadcastGameState();
            }
        });
    }
});
