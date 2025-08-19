console.log("network.js loaded");

// --- Constants ---
const SIGNALING_SERVER_URL = 'ws://localhost:8080';
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// --- Global Variables ---
let playerRole = null; // 'host' or 'peer'
let peers = new Map(); // For host: Map of peerId -> { peerConnection, dataChannel }
let hostConnection = null; // For peer: { peerConnection, dataChannel }

// --- Signaling Client (same as before) ---
const signaling = {
    ws: null,
    onMessageCallback: null,
    connect: function() { /* ... same as before ... */ },
    send: function(message) { /* ... same as before ... */ },
    setOnMessageCallback: function(callback) { this.onMessageCallback = callback; }
};
// Re-pasting the full signaling object for completeness
signaling.connect = function() {
    return new Promise((resolve, reject) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) { resolve(); return; }
        this.ws = new WebSocket(SIGNALING_SERVER_URL);
        this.ws.onopen = () => { console.log("Connected to signaling server."); resolve(); };
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (this.onMessageCallback) this.onMessageCallback(message);
            } catch (e) { console.error("Failed to parse message", e); }
        };
        this.ws.onclose = () => { console.log("Disconnected from signaling server."); this.ws = null; };
        this.ws.onerror = (error) => { console.error("Signaling error:", error); reject(error); };
    });
};
signaling.send = function(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
    } else { console.error("WebSocket is not open."); }
};
signaling.setOnMessageCallback = function(callback) { this.onMessageCallback = callback; };


// --- Data Channel Communication ---

function broadcastGameState() {
    if (playerRole !== 'host') return;
    console.log("Broadcasting game state to all peers.");
    const message = JSON.stringify({ type: 'game-state-update', payload: gameState });
    for (const peer of peers.values()) {
        if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
            peer.dataChannel.send(message);
        }
    }
}

function sendMoveToHost(move) {
    if (playerRole !== 'peer' || !hostConnection?.dataChannel) return;
    const message = JSON.stringify({ type: 'player-move', payload: move });
    hostConnection.dataChannel.send(message);
}

function handleHostDataChannelMessage(event, peerId) {
    const message = JSON.parse(event.data);
    if (message.type === 'player-move') {
        console.log(`Host received move from ${peerId}:`, message.payload);
        // TODO: Validate move and player turn
        // For now, assume valid and execute
        // This is a simplified version. A real implementation needs more checks.
        confirmMove(message.payload.stationId, false); // `false` to prevent peer from re-broadcasting
    }
}

function handlePeerDataChannelMessage(event) {
    const message = JSON.parse(event.data);
    if (message.type === 'game-state-update') {
        console.log("Peer received new game state.");
        // Overwrite local state with the authoritative state from the host
        Object.assign(gameState, message.payload);
        // Update the entire UI based on the new state
        updateUIFromGameState();
    }
}


// --- WebRTC Host Logic ---

function createPeerConnection(peerId) {
    // ... (same as before, but with updated onmessage/onopen)
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) signaling.send({ type: 'ice-candidate', target: peerId, payload: event.candidate });
    };
    const dataChannel = peerConnection.createDataChannel('game-data');
    dataChannel.onopen = () => {
        console.log(`Data channel with ${peerId} is open.`);
        // Send the initial state to the new peer
        const message = JSON.stringify({ type: 'game-state-update', payload: gameState });
        dataChannel.send(message);
    };
    dataChannel.onmessage = (event) => handleHostDataChannelMessage(event, peerId);
    peers.set(peerId, { peerConnection, dataChannel });
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            signaling.send({ type: 'offer', target: peerId, payload: peerConnection.localDescription });
        })
        .catch(e => console.error("Error creating offer:", e));
}

function handleHostMessages(message) { /* ... same as before ... */ }
// Re-pasting for completeness
function handleHostMessages(message) {
    const { type, peerId, payload } = message;
    switch (type) {
        case 'room-created':
            document.getElementById('room-code-display').textContent = payload.roomCode;
            document.getElementById('room-info').style.display = 'block';
            document.querySelector('.start-options').style.display = 'none';
            // Don't show the game board for the host until they start it
            break;
        case 'peer-joined': createPeerConnection(peerId); break;
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
        // Add a "Start Game" button for the host
        const startOptions = document.querySelector('.start-options');
        const startGameBtn = document.createElement('button');
        startGameBtn.textContent = 'Start Game';
        startGameBtn.onclick = () => {
            document.getElementById('start-screen').style.display = 'none';
            document.getElementById('game-container').style.display = 'flex';
            startGame(); // From game.js
            broadcastGameState(); // Send initial state to all connected peers
        };
        startOptions.innerHTML = ''; // Clear create/join buttons
        startOptions.appendChild(startGameBtn);

    } catch (error) { alert("Failed to connect to signaling server."); }
}

// --- WebRTC Peer Logic ---

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
            peerConnection.ondatachannel = (event) => {
                hostConnection.dataChannel = event.channel;
                hostConnection.dataChannel.onopen = () => {
                    console.log("Data channel with host is open.");
                    // The host will send the initial state, which will trigger the UI update
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
        case 'room-not-found': alert("Error: Room not found."); break;
    }
}

async function joinGame(roomCode) {
    playerRole = 'peer';
    try {
        await signaling.connect();
        signaling.setOnMessageCallback(handlePeerMessages);
        signaling.send({ type: 'join-room', payload: { roomCode } });
    } catch (error) { alert("Failed to connect to signaling server."); }
}

// --- UI Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const roomCodeInput = document.getElementById('room-code-input');
    if (createGameBtn) createGameBtn.addEventListener('click', hostGame);
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', () => {
            const roomCode = roomCodeInput.value.trim();
            if (roomCode) joinGame(roomCode);
            else alert("Please enter a room code.");
        });
    }
});
