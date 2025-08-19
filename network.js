console.log("network.js loaded");

// --- Constants ---
const SIGNALING_SERVER_URL = 'ws://localhost:8080';
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const PLAYER_ROLES = ['Mr. X', 'Detective Blue', 'Detective Green', 'Detective Red', 'Detective Yellow'];
const STARTING_POSITIONS = { /* Pre-defined starting locations */
    'Mr. X': [35, 51, 67, 103, 142],
    'Detective': [13, 29, 53, 91, 138, 155, 174, 198]
};
const TICKET_ALLOCATIONS = {
    'Mr. X': { taxi: 24, bus: 24, underground: 24 },
    'Detective': { taxi: 10, bus: 8, underground: 4 }
};

// --- Global Variables ---
let playerRole = null;
let peers = new Map();
let hostConnection = null;
let myPeerId = null; // The ID assigned by the signaling server

// --- Signaling Client ---
// ... (The signaling object is unchanged, so I will omit it for brevity but it's still here)
const signaling = { ws: null, onMessageCallback: null, connect: function() { /* ... */ }, send: function(message) { /* ... */ }, setOnMessageCallback: function(callback) { /* ... */ }};
signaling.connect = function() { return new Promise((resolve, reject) => { if (this.ws && this.ws.readyState === WebSocket.OPEN) { resolve(); return; } this.ws = new WebSocket(SIGNALING_SERVER_URL); this.ws.onopen = () => { console.log("Connected to signaling server."); resolve(); }; this.ws.onmessage = (event) => { try { const message = JSON.parse(event.data); if (this.onMessageCallback) this.onMessageCallback(message); } catch (e) { console.error("Failed to parse message", e); } }; this.ws.onclose = () => { console.log("Disconnected from signaling server."); this.ws = null; }; this.ws.onerror = (error) => { console.error("Signaling error:", error); reject(error); }; }); };
signaling.send = function(message) { if (this.ws && this.ws.readyState === WebSocket.OPEN) { this.ws.send(JSON.stringify(message)); } else { console.error("WebSocket is not open."); } };
signaling.setOnMessageCallback = function(callback) { this.onMessageCallback = callback; };


// --- Data Channel Communication ---
function broadcastGameState() { /* ... same as before ... */ }
function sendMoveToHost(move) { /* ... same as before ... */ }
function handleHostDataChannelMessage(event, peerId) { /* ... same as before ... */ }
function handlePeerDataChannelMessage(event) { /* ... same as before ... */ }
// Re-pasting for completeness
function broadcastGameState() { if (playerRole !== 'host') return; const message = JSON.stringify({ type: 'game-state-update', payload: gameState }); for (const peer of peers.values()) { if (peer.dataChannel && peer.dataChannel.readyState === 'open') { peer.dataChannel.send(message); } } }
function sendMoveToHost(move) { if (playerRole !== 'peer' || !hostConnection?.dataChannel) return; const message = JSON.stringify({ type: 'player-move', payload: move }); hostConnection.dataChannel.send(message); }
function handleHostDataChannelMessage(event, peerId) { const message = JSON.parse(event.data); if (message.type === 'player-move') { confirmMove(message.payload.stationId); } }
function handlePeerDataChannelMessage(event) { const message = JSON.parse(event.data); if (message.type === 'game-state-update') { Object.assign(gameState, message.payload); updateUIFromGameState(); } }


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
    for (const peerId of peers.keys()) {
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

        if (assignedRoles.has(role)) {
            alert(`Role "${role}" has been assigned more than once!`);
            return null;
        }
        if (role === 'Mr. X') mrXCount++;

        assignedRoles.add(role);

        const isMrX = role === 'Mr. X';
        const tickets = isMrX ? TICKET_ALLOCATIONS['Mr. X'] : TICKET_ALLOCATIONS['Detective'];
        const startPos = isMrX
            ? STARTING_POSITIONS['Mr. X'][Math.floor(Math.random() * STARTING_POSITIONS['Mr. X'].length)]
            : STARTING_POSITIONS['Detective'][Math.floor(Math.random() * STARTING_POSITIONS['Detective'].length)];

        newPlayers.push({
            id: playerId,
            role: role,
            isMrX: isMrX,
            currentPosition: startPos,
            tickets: { ...tickets },
            color: role.split(' ')[1]?.toLowerCase() || 'black'
        });
    }

    if (mrXCount !== 1) {
        alert('Exactly one player must be assigned the role of Mr. X.');
        return null;
    }

    // Sort players so Mr. X is last for turn order
    newPlayers.sort((a, b) => a.isMrX - b.isMrX);

    gameState.players = newPlayers;
    return true;
}


// --- WebRTC Host Logic ---

function createPeerConnection(peerId) {
    console.log(`Creating peer connection for peer: ${peerId}`);
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) signaling.send({ type: 'ice-candidate', target: peerId, payload: event.candidate });
    };

    peerConnection.oniceconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(peerConnection.iceConnectionState)) {
            console.log(`Peer ${peerId} has disconnected.`);
            peers.delete(peerId);
            updateLobbyUI(); // Update lobby if game hasn't started
            endGame(`Player ${peerId} disconnected. Game over.`);
        }
    };

    const dataChannel = peerConnection.createDataChannel('game-data');
    dataChannel.onopen = () => { console.log(`Data channel with ${peerId} is open.`); };
    dataChannel.onmessage = (event) => handleHostDataChannelMessage(event, peerId);

    peers.set(peerId, { peerConnection, dataChannel });

    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            signaling.send({ type: 'offer', target: peerId, payload: peerConnection.localDescription });
        })
        .catch(e => console.error("Error creating offer:", e));
}
function handleHostMessages(message) {
    const { type, peerId, payload } = message;
    switch (type) {
        case 'my-id-is': myPeerId = peerId; break; // Server tells us our own ID
        case 'room-created':
            document.getElementById('room-code-display').textContent = payload.roomCode;
            document.getElementById('host-lobby').style.display = 'block';
            document.querySelector('.start-options').style.display = 'none';
            updateLobbyUI();
            break;
        case 'peer-joined':
            createPeerConnection(peerId);
            updateLobbyUI();
            break;
        case 'answer': peers.get(peerId)?.peerConnection.setRemoteDescription(new RTCSessionDescription(payload)); break;
        case 'ice-candidate': peers.get(peerId)?.peerConnection.addIceCandidate(new RTCIceCandidate(payload)); break;
    }
}
async function hostGame() {
    playerRole = 'host';
    try {
        await signaling.connect();
        signaling.setOnMessageCallback(handleHostMessages);
        signaling.send({ type: 'create-room' });
    } catch (error) { alert("Failed to connect to signaling server."); }
}
// Re-pasting createPeerConnection for completeness
function createPeerConnection(peerId) { const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS }); peerConnection.onicecandidate = (event) => { if (event.candidate) signaling.send({ type: 'ice-candidate', target: peerId, payload: event.candidate }); }; const dataChannel = peerConnection.createDataChannel('game-data'); dataChannel.onopen = () => { console.log(`Data channel with ${peerId} is open.`); }; dataChannel.onmessage = (event) => handleHostDataChannelMessage(event, peerId); peers.set(peerId, { peerConnection, dataChannel }); peerConnection.createOffer().then(offer => peerConnection.setLocalDescription(offer)).then(() => { signaling.send({ type: 'offer', target: peerId, payload: peerConnection.localDescription }); }).catch(e => console.error("Error creating offer:", e)); }


// --- WebRTC Peer Logic ---
function handlePeerMessages(message) { /* ... same as before ... */ }
async function joinGame(roomCode) { /* ... same as before ... */ }
// Re-pasting for completeness
function handlePeerMessages(message) {
    const { type, from, payload } = message;
    switch (type) {
        case 'offer':
            const hostId = from;
            const offer = payload;
            const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            hostConnection = { peerConnection, dataChannel: null };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) signaling.send({ type: 'ice-candidate', target: hostId, payload: event.candidate });
            };

            peerConnection.oniceconnectionstatechange = () => {
                if (['disconnected', 'failed', 'closed'].includes(peerConnection.iceConnectionState)) {
                    console.log("Disconnected from host.");
                    endGame("Connection to host lost. Game over.");
                }
            };

            peerConnection.ondatachannel = (event) => {
                hostConnection.dataChannel = event.channel;
                hostConnection.dataChannel.onopen = () => {
                    console.log("Data channel with host is open.");
                };
                hostConnection.dataChannel.onmessage = handlePeerDataChannelMessage;
            };

            peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
                .then(() => peerConnection.createAnswer())
                .then(answer => peerConnection.setLocalDescription(answer))
                .then(() => {
                    signaling.send({ type: 'answer', target: hostId, payload: peerConnection.localDescription });
                })
                .catch(e => console.error("Error handling offer:", e));
            break;
        case 'ice-candidate':
            if (hostConnection?.peerConnection) hostConnection.peerConnection.addIceCandidate(new RTCIceCandidate(payload));
            break;
        case 'room-not-found':
            alert("Error: Room not found.");
            break;
    }
}
async function joinGame(roomCode) { playerRole = 'peer'; try { await signaling.connect(); signaling.setOnMessageCallback(handlePeerMessages); signaling.send({ type: 'join-room', payload: { roomCode } }); } catch (error) { alert("Failed to connect to signaling server."); } }


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
