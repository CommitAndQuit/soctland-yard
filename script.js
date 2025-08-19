document.addEventListener('DOMContentLoaded', () => {

    // Game board data
    const locations = {
        1: { top: 100, left: 100 },
        2: { top: 50, left: 200 },
        3: { top: 100, left: 300 },
        4: { top: 200, left: 150 },
        5: { top: 200, left: 250 },
    };

    const map = {
        1: { taxi: [2, 4] },
        2: { taxi: [1, 3, 4] },
        3: { taxi: [2, 5] },
        4: { taxi: [1, 2, 5] },
        5: { taxi: [3, 4] }
    };

    // Game state
    let gameState = {};
    let peer;
    let conn;
    let isHost = false;
    let playerRole; // 'detective1' or 'mrX'

    // UI Elements
    const detective1Element = document.getElementById('detective-1');
    const mrXElement = document.getElementById('mr-x');
    const currentTurnEl = document.getElementById('current-turn');
    const currentPlayerEl = document.getElementById('current-player');
    const detectiveTaxiEl = document.getElementById('detective-taxi');
    const mrxTaxiEl = document.getElementById('mrx-taxi');
    const locationElements = document.querySelectorAll('.location');
    const newLocalGameBtn = document.getElementById('new-local-game-btn');
    const hostBtn = document.getElementById('host-btn');
    const joinBtn = document.getElementById('join-btn');
    const gameIdDisplay = document.getElementById('game-id');
    const joinIdInput = document.getElementById('join-id-input');

    let engine = null;
    let ui = null;
    const network = new Network();
    let isHost = false;
    let myPeerId = null;

    const lobbyContainer = document.getElementById('lobby-container');
    const gameContainer = document.getElementById('game-container');
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const gameIdInput = document.getElementById('game-id-input');
    const gameIdDisplay = document.getElementById('game-id-display');
    const gameIdText = document.getElementById('game-id-text');
    const playerList = document.getElementById('player-list');
    const startGameBtn = document.getElementById('start-game-btn');

    document.getElementById('player-name').parentElement.style.display = 'none';

    createGameBtn.addEventListener('click', () => {
        isHost = true;
        createGameBtn.disabled = true;
        joinGameBtn.disabled = true;
        network.createGame();
    });

    joinGameBtn.addEventListener('click', () => {
        const hostId = gameIdInput.value.trim();
        if (!hostId) {
            alert('Please enter a valid Game ID.');
            return;
        }
        isHost = false;
        createGameBtn.disabled = true;
        joinGameBtn.disabled = true;
        network.joinGame(hostId);
    });

    startGameBtn.addEventListener('click', () => {
        if (isHost) {
            engine = new GameEngine();
            engine.initGame(network.playerList);
            network.setEngine(engine);
            const gameStateMessage = { type: 'GAME_START', gameState: engine.gameState };
            network.broadcast(gameStateMessage);
            handleIncomingData(gameStateMessage);
        }
    });

    network.dataHandler = handleIncomingData;

    function startGameForAll(initialGameState) {
        lobbyContainer.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        engine = isHost ? engine : { gameState: initialGameState, map: stationData, getValidMoves: () => ({}) };
        myPeerId = network.myId;
        ui = new UI(engine);
        ui.renderBoard();
        ui.update();
        ui.locationElements.forEach(loc => loc.addEventListener('click', handleLocationClick));

        const sessionData = {
            isHost: isHost,
            myPeerId: myPeerId,
            hostId: network.hostId,
            gameState: isHost ? engine.gameState : null
        };
        sessionStorage.setItem('scotlandYardSession', JSON.stringify(sessionData));
    }

    function handleLocationClick(event) {
        if (!engine || engine.gameState.gameover) return;
        const currentPlayerId = engine.gameState.playerOrder[engine.gameState.currentPlayerIndex];
        if (currentPlayerId !== myPeerId) {
            alert("It's not your turn!");
            return;
        }
        const locationId = parseInt(event.currentTarget.id.split('-')[1]);

        // In a multiplayer game, only the current player can move
        if (playerRole !== gameState.currentPlayer) return;

        const currentPlayerId = gameState.currentPlayer;
        const currentPlayer = gameState.players[currentPlayerId];
        const currentPos = currentPlayer.position;

        const validMoves = map[currentPos].taxi || [];

        if (validMoves.includes(locationId)) {
            if (currentPlayer.tickets.taxi > 0) {
                currentPlayer.position = locationId;
                currentPlayer.tickets.taxi--;

                if (currentPlayerId === 'detective1') {
                    checkWinCondition();
                    if (gameState.gameover) {
                        updateUI();
                        sendGameState();
                        return;
                    }
                    gameState.currentPlayer = 'mrX';
                } else {
                    // Mr. X just moved
                    gameState.currentPlayer = 'detective1';
                    gameState.turn++;
                    checkWinCondition();
                }

                updateUI();
                sendGameState();
            } else {
                network.sendTo(network.hostId, moveData);
            }
        }
    }

    function updatePlayerList(players) {
        playerList.innerHTML = '';
        players.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p;
            if (p === myPeerId) li.textContent += " (You)";
            if (p === network.hostId) li.textContent += " (Host)";
            playerList.appendChild(li);
        });
    }

    function handleIncomingData(data, peerId) {
        console.log('Data received:', data.type, 'from', peerId);
        switch (data.type) {
            case 'HOST_ID_GENERATED':
                myPeerId = data.hostId;
                network.hostId = data.hostId;
                if (!engine) {
                    network.playerList = [myPeerId];
                    gameIdText.textContent = data.hostId;
                    gameIdDisplay.classList.remove('hidden');
                    startGameBtn.classList.remove('hidden');
                    updatePlayerList(network.playerList);
                }
                break;
            case 'REQUEST_GAME_STATE':
                if (isHost) {
                    if (engine && engine.gameState) {
                        if (engine.gameState.players[data.peerId]) {
                            network.sendTo(peerId, { type: 'GAME_STATE_UPDATE', gameState: engine.gameState });
                        }
                    } else {
                        if (!network.playerList.includes(data.peerId)) {
                            network.playerList.push(data.peerId);
                        }
                        const updateMessage = { type: 'PLAYER_LIST_UPDATE', players: network.playerList, hostId: network.hostId };
                        network.broadcast(updateMessage);
                        handleIncomingData(updateMessage);
                    }
                }
                break;
            case 'PLAYER_LIST_UPDATE':
                network.playerList = data.players;
                network.hostId = data.hostId;
                myPeerId = network.myId;
                updatePlayerList(data.players);
                break;
            case 'GAME_START':
                startGameForAll(data.gameState);
                break;
            case 'MAKE_MOVE':
                if (isHost) {
                    const { playerId, locationId, ticketToUse } = data.payload;
                    const moveSuccessful = engine.handleMove(playerId, locationId, ticketToUse);
                    if (moveSuccessful) {
                        const updateMessage = { type: 'GAME_STATE_UPDATE', gameState: engine.gameState };
                        sessionStorage.setItem('scotlandYardSession', JSON.stringify({isHost: true, myPeerId: myPeerId, hostId: network.hostId, gameState: engine.gameState, playerList: network.playerList}));
                        network.broadcast(updateMessage);
                        handleIncomingData(updateMessage);
                    }
                }
                break;
            case 'GAME_STATE_UPDATE':
                if (!engine) {
                    engine = {};
                }
                engine.gameState = data.gameState;
                if (!isHost) {
                     sessionStorage.setItem('scotlandYardSession', JSON.stringify({isHost: false, myPeerId: myPeerId, hostId: network.hostId}));
                }
                if (ui) {
                    ui.update();
                } else {
                    startGameForAll(data.gameState);
                }
                break;
            case 'PEER_DISCONNECTED':
                 if (isHost) {
                    network.playerList = network.playerList.filter(p => p !== peerId);
                    const updateMessage = { type: 'PLAYER_LIST_UPDATE', players: network.playerList, hostId: network.hostId };
                    network.broadcast(updateMessage);
                    handleIncomingData(updateMessage);
                 }
                 break;
        }
    }

    function updateUI() {
        if (!gameState.players) return;
        renderPlayers();
        currentTurnEl.textContent = gameState.turn;
        if (gameState.gameover) {
            currentPlayerEl.textContent = `${gameState.winner} WINS!`;
        } else {
            network.reinitialize(myPeerId, sessionData.hostId);
        }
    }


    function initializePeer() {
        peer = new Peer();

        peer.on('open', (id) => {
            if (isHost) {
                gameIdDisplay.textContent = id;
            }
            console.log('My peer ID is: ' + id);
        });

        peer.on('connection', (connection) => {
            conn = connection;
            conn.on('data', (data) => {
                gameState = data;
                updateUI();
            });
            conn.on('open', () => {
                console.log("Connection established");
                sendGameState(); // Send initial game state to the client
            });
        });

        peer.on('error', (err) => {
            alert('An error occurred: ' + err.message);
            console.error(err);
        });
    }

    function sendGameState() {
        if (conn && conn.open) {
            conn.send(gameState);
        }
    }

    hostBtn.addEventListener('click', () => {
        isHost = true;
        playerRole = 'detective1';
        initializePeer();
        initGame();
    });

    joinBtn.addEventListener('click', () => {
        const joinId = joinIdInput.value;
        if (joinId) {
            isHost = false;
            playerRole = 'mrX';
            initializePeer();
            peer.on('open', () => {
                conn = peer.connect(joinId);
                conn.on('data', (data) => {
                    gameState = data;
                    updateUI();
                });
                conn.on('open', () => {
                    console.log("Connection established with host");
                });
            });
        }
    });

    // Add event listeners
    locationElements.forEach(loc => loc.addEventListener('click', handleLocationClick));
    newLocalGameBtn.addEventListener('click', initGame);

    initGame();

});
