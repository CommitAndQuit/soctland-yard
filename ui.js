class UI {
    constructor(engine) {
        this.engine = engine;
        this.currentTurnEl = document.getElementById('current-turn');
        this.currentPlayerEl = document.getElementById('current-player');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.doubleMoveBtn = document.getElementById('double-move-btn');
        this.gameBoard = document.getElementById('game-board');
        this.stationsContainer = document.getElementById('stations-container');
        this.connectionsSVG = document.getElementById('connections');
        this.playerInfoContainer = document.getElementById('player-info-container');

        // Turn Overlay elements
        this.turnOverlay = document.getElementById('turn-overlay');
        this.overlayPlayerName = document.getElementById('overlay-player-name');
        this.overlayInstruction = document.getElementById('overlay-instruction');
        this.readyBtn = document.getElementById('ready-btn');

        this.locationElements = [];
        this.playerElements = {};
    }

    renderBoard() {
        this.stationsContainer.innerHTML = '';
        this.connectionsSVG.innerHTML = '';
        const stations = this.engine.map;
        stations.forEach(station => {
            const stationEl = document.createElement('div');
            stationEl.className = 'location';
            stationEl.id = `loc-${station.id}`;
            stationEl.textContent = station.id;
            stationEl.style.left = `${station.x}px`;
            stationEl.style.top = `${station.y}px`;
            this.stationsContainer.appendChild(stationEl);
            this.locationElements.push(stationEl);
            for (const type in station.connections) {
                station.connections[type].forEach(connectedStationId => {
                    if (station.id < connectedStationId) {
                        const connectedStation = stations.find(s => s.id === connectedStationId);
                        if (connectedStation) {
                            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                            line.setAttribute('x1', station.x + 20);
                            line.setAttribute('y1', station.y + 20);
                            line.setAttribute('x2', connectedStation.x + 20);
                            line.setAttribute('y2', connectedStation.y + 20);
                            line.setAttribute('stroke', this.getTransportColor(type));
                            line.setAttribute('stroke-width', '2');
                            this.connectionsSVG.appendChild(line);
                        }
                    }
                });
            }
        });
    }

    getTransportColor(type) {
        switch (type) {
            case 'taxi': return 'orange';
            case 'bus': return 'green';
            case 'underground': return 'blue';
            case 'ferry': return 'cyan';
            default: return 'gray';
        }
    }

    renderPlayers() {
        const gameState = this.engine.gameState;
        for (const playerId in this.playerElements) {
            if (!gameState.players[playerId]) {
                this.playerElements[playerId].remove();
                delete this.playerElements[playerId];
            }
        }
        for (const playerId in gameState.players) {
            const player = gameState.players[playerId];
            let playerEl = this.playerElements[playerId];
            if (!playerEl) {
                playerEl = document.createElement('div');
                playerEl.id = playerId;
                playerEl.className = 'player';
                if (player.isMrX) {
                    playerEl.classList.add('mr-x');
                } else {
                    playerEl.classList.add('detective', `detective-${playerId.replace('detective', '')}`);
                    playerEl.textContent = playerId.replace('detective', '');
                }
                this.gameBoard.appendChild(playerEl);
                this.playerElements[playerId] = playerEl;
            }
            const station = this.engine.map.find(s => s.id === player.position);
            if (station) {
                playerEl.style.left = `${station.x + 5}px`;
                playerEl.style.top = `${station.y + 5}px`;
            }
            if (player.isMrX) {
                let positionToShow = player.position;
                let showPawn = false;
                if (gameState.gameover) {
                    showPawn = true;
                } else {
                    const lastRevealedMove = [...player.moveLog].reverse().find(move => move.position);
                    if (lastRevealedMove) {
                        positionToShow = lastRevealedMove.position;
                        showPawn = true;
                    }
                }
                const station = this.engine.map.find(s => s.id === positionToShow);
                if (station) {
                    playerEl.style.left = `${station.x + 5}px`;
                    playerEl.style.top = `${station.y + 5}px`;
                }
                playerEl.style.display = showPawn ? 'block' : 'none';
            }
        }
    }

    renderPlayerInfo() {
        this.playerInfoContainer.innerHTML = '';
        const gameState = this.engine.gameState;
        for (const playerId of gameState.playerOrder) {
            const player = gameState.players[playerId];
            const playerInfoEl = document.createElement('div');
            playerInfoEl.className = 'player-info-card';
            if (playerId === gameState.playerOrder[gameState.currentPlayerIndex]) {
                playerInfoEl.classList.add('active');
            }
            const title = player.isMrX ? 'Mr. X' : `Detective ${playerId.replace('detective', '')}`;
            let ticketsHTML = '<ul>';
            for (const ticket in player.tickets) {
                ticketsHTML += `<li>${ticket}: ${player.tickets[ticket]}</li>`;
            }
            ticketsHTML += '</ul>';
            playerInfoEl.innerHTML = `<h3>${title}</h3>${ticketsHTML}`;
            this.playerInfoContainer.appendChild(playerInfoEl);
        }
    }

    highlightValidMoves() {
        this.locationElements.forEach(el => el.classList.remove('valid-move'));
        const currentPlayerId = this.engine.gameState.playerOrder[this.engine.gameState.currentPlayerIndex];
        const validMoves = this.engine.getValidMoves(currentPlayerId);
        for (const destId in validMoves) {
            const stationEl = document.getElementById(`loc-${destId}`);
            if (stationEl) {
                stationEl.classList.add('valid-move');
            }
        }
    }

    showTurnOverlay() {
        const gameState = this.engine.gameState;
        if (gameState.gameover) return;
        const currentPlayerId = gameState.playerOrder[gameState.currentPlayerIndex];
        const currentPlayer = gameState.players[currentPlayerId];
        const playerName = currentPlayer.isMrX ? 'Mr. X' : `Detective ${currentPlayerId.replace('detective', '')}`;
        this.overlayPlayerName.textContent = playerName;
        if (currentPlayer.isMrX) {
            this.overlayInstruction.textContent = "Detectives, please look away!";
        } else {
            this.overlayInstruction.textContent = "Mr. X, please look away.";
        }
        this.turnOverlay.classList.remove('hidden');
    }

    hideTurnOverlay() {
        this.turnOverlay.classList.add('hidden');
    }

    update() {
        const gameState = this.engine.gameState;
        this.renderPlayers();
        this.renderPlayerInfo();
        this.currentTurnEl.textContent = gameState.turn;
        if (gameState.gameover) {
            this.currentPlayerEl.textContent = `${gameState.winner} WINS!`;
            this.locationElements.forEach(el => el.classList.remove('valid-move'));
            this.doubleMoveBtn.style.display = 'none';
            setTimeout(() => {
                alert(`Game Over: ${gameState.winner} WINS!`);
            }, 10);
        } else {
            const currentPlayerId = gameState.playerOrder[gameState.currentPlayerIndex];
            const currentPlayer = gameState.players[currentPlayerId];
            this.currentPlayerEl.textContent = currentPlayer.isMrX ? 'Mr. X' : `Detective ${currentPlayerId.replace('detective', '')}`;
            this.highlightValidMoves();
            if (currentPlayer.isMrX && currentPlayer.tickets.double > 0 && !gameState.doubleMoveActive) {
                this.doubleMoveBtn.style.display = 'inline-block';
            } else {
                this.doubleMoveBtn.style.display = 'none';
            }
        }
    }
}
