document.addEventListener('DOMContentLoaded', () => {
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
        const validMoves = engine.getValidMoves(currentPlayerId);
        if (validMoves[locationId]) {
            const ticketOptions = validMoves[locationId];
            let ticketToUse = ticketOptions.length === 1 ? ticketOptions[0] : prompt(`Choose ticket for station ${locationId}:\n${ticketOptions.join(', ')}`);
            if (!ticketToUse || !ticketOptions.includes(ticketToUse.toLowerCase())) return;
            ticketToUse = ticketToUse.toLowerCase();
            const moveData = { type: 'MAKE_MOVE', payload: { playerId: myPeerId, locationId, ticketToUse } };
            if (isHost) {
                handleIncomingData(moveData, myPeerId);
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

    function checkSession() {
        const sessionData = JSON.parse(sessionStorage.getItem('scotlandYardSession'));
        if (!sessionData) return;

        console.log("Found existing session. Re-initializing.", sessionData);
        isHost = sessionData.isHost;
        myPeerId = sessionData.myPeerId;
        network.hostId = sessionData.hostId;
        createGameBtn.disabled = true;
        joinGameBtn.disabled = true;

        if (isHost) {
            engine = new GameEngine();
            engine.gameState = sessionData.gameState;
            network.setEngine(engine);
            network.reinitialize(myPeerId);
            startGameForAll(sessionData.gameState);
            updatePlayerList(sessionData.playerList || [myPeerId]);
        } else {
            network.reinitialize(myPeerId, sessionData.hostId);
        }
    }

    checkSession();
});
