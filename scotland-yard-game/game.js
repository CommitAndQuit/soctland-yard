document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const appContainer = document.getElementById('app-container');
    const gameSetup = document.getElementById('game-setup');
    const gameBoard = document.getElementById('game-board');
    const startGameButton = document.getElementById('start-game');
    const canvas = document.getElementById('map');
    const ctx = canvas.getContext('2d');
    const tokenContainer = document.getElementById('token-container');
    const turnIndicator = document.getElementById('turn-indicator');
    const ticketsDiv = document.getElementById('tickets');
    const moveLogDiv = document.getElementById('move-log');
    const specialMovesDiv = document.getElementById('special-moves');
    const gameOverModal = document.getElementById('game-over-modal');
    const gameOverMessage = document.getElementById('game-over-message');
    const restartGameButton = document.getElementById('restart-game');
    const passDeviceModal = document.getElementById('pass-device-modal');
    const passDeviceMessage = document.getElementById('pass-device-message');
    const playerReadyButton = document.getElementById('player-ready-btn');
    const debugModeCheckbox = document.getElementById('debug-mode');

    const player1NameInput = document.getElementById('player1-name');
    const player2NameInput = document.getElementById('player2-name');
    const player3NameInput = document.getElementById('player3-name');
    const player4NameInput = document.getElementById('player4-name');

    // Game Constants
    const REVEAL_TURNS = [3, 8, 13, 18, 24];
    const MRX_START_STATIONS = [13, 26, 29, 34, 50, 53, 91, 94, 103, 112, 117, 132, 138, 141, 155, 174, 197, 198];
    const DETECTIVE_START_STATIONS = [1, 8, 14, 20, 30, 36, 42, 45, 51, 56, 58, 63, 67, 71, 79, 86, 90, 95, 104, 113, 123, 127, 133, 142, 156, 166, 172, 178, 185, 194];

    // Game State
    let gameState = {};

    // Event Listeners
    startGameButton.addEventListener('click', startGame);
    canvas.addEventListener('click', handleCanvasClick);
    restartGameButton.addEventListener('click', restartGame);
    window.addEventListener('resize', handleResize);

    handleResize(); // Initial call

    function handleResize() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const scale = Math.min(screenWidth / 1000, screenHeight / 1000);
        appContainer.style.transform = `scale(${scale})`;
    }

    function startGame() {
        initializeGameState();
        createPlayerTokens();
        gameSetup.classList.add('hidden');
        gameBoard.classList.remove('hidden');
        gameOverModal.classList.add('hidden');
        drawBoard();
        updateUI();
    }

    function restartGame() {
        tokenContainer.innerHTML = '';
        gameSetup.classList.remove('hidden');
        gameBoard.classList.add('hidden');
        gameOverModal.classList.add('hidden');
    }

    function initializeGameState() {
        const playerNames = [
            player1NameInput.value || 'Mr. X',
            player2NameInput.value || 'Detective Riya',
            player3NameInput.value || 'Detective Arjun',
            player4NameInput.value || 'Detective Meera'
        ];

        const debugMode = debugModeCheckbox.checked;

        let availableDetectiveStarts = [...DETECTIVE_START_STATIONS].sort(() => 0.5 - Math.random());
        let availableMrXStarts = [...MRX_START_STATIONS].sort(() => 0.5 - Math.random());

        gameState = {
            players: [
                { id: 1, name: playerNames[0], role: "MrX", position: availableMrXStarts.pop(), tickets: { taxi: 4, bus: 3, underground: 3, black: 5, double: 2 }, isVisible: debugMode },
                { id: 2, name: playerNames[1], role: "Detective", position: availableDetectiveStarts.pop(), tickets: { taxi: 10, bus: 8, underground: 4 }, isVisible: true },
                { id: 3, name: playerNames[2], role: "Detective", position: availableDetectiveStarts.pop(), tickets: { taxi: 10, bus: 8, underground: 4 }, isVisible: true },
                { id: 4, name: playerNames[3], role: "Detective", position: availableDetectiveStarts.pop(), tickets: { taxi: 10, bus: 8, underground: 4 }, isVisible: true },
            ],
            currentPlayerIndex: 0,
            turn: 1,
            log: [],
            maxTurns: 24,
            mrXLastKnownLocation: null,
            gameOver: false,
            winner: null,
            isDoubleMove: false,
            doubleMoveFirstTurnLog: null,
            debugMode: debugMode,
        };
    }

    function createPlayerTokens() {
        tokenContainer.innerHTML = '';
        gameState.players.forEach(player => {
            const token = document.createElement('div');
            token.id = `token-${player.id}`;
            token.className = 'token';
            tokenContainer.appendChild(token);
        });
    }

    function updateTokenPositions() {
        gameState.players.forEach(player => {
            const token = document.getElementById(`token-${player.id}`);
            if (player.isVisible) {
                const station = stations[player.position];
                token.style.left = `${station.x}px`;
                token.style.top = `${station.y}px`;
                token.classList.remove('hidden');
            } else {
                token.classList.add('hidden');
            }
        });
    }

    function handleCanvasClick(e) {
        if (gameState.gameOver) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX / parseFloat(appContainer.style.transform.replace('scale(', '')) - rect.left;
        const y = e.clientY / parseFloat(appContainer.style.transform.replace('scale(', '')) - rect.top;
        const clickedStationId = getClickedStation(x, y);
        if (clickedStationId) handleMove(parseInt(clickedStationId));
    }

    function getClickedStation(x, y) {
        for (const id in stations) {
            const station = stations[id];
            const distance = Math.sqrt((x - station.x) ** 2 + (y - station.y) ** 2);
            if (distance < 12) return id;
        }
        return null;
    }

    function handleMove(targetStationId) {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const currentStation = stations[currentPlayer.position];
        let moveType = null;
        for (const type in currentStation.connections) {
            if (currentPlayer.tickets[type] > 0 && currentStation.connections[type].includes(targetStationId)) {
                moveType = type;
                break;
            }
        }
        if (!moveType && currentPlayer.role === 'MrX' && currentPlayer.tickets.black > 0) {
             for (const type in currentStation.connections) {
                if (currentStation.connections[type].includes(targetStationId)) {
                    moveType = 'black';
                    break;
                }
            }
        }
        if (!moveType) return;
        currentPlayer.position = targetStationId;
        currentPlayer.tickets[moveType]--;
        if (gameState.isDoubleMove) {
            if (!gameState.doubleMoveFirstTurnLog) {
                gameState.doubleMoveFirstTurnLog = `used a ${moveType} ticket`;
                updateUI();
            } else {
                const secondMoveLog = `then used a ${moveType} ticket.`;
                gameState.log.unshift(`Turn ${gameState.turn}: Mr. X ${gameState.doubleMoveFirstTurnLog}, ${secondMoveLog}`);
                gameState.isDoubleMove = false;
                gameState.doubleMoveFirstTurnLog = null;
                advanceTurn();
            }
            return;
        }
        const isMrX = currentPlayer.role === 'MrX';
        if (isMrX) {
            currentPlayer.isVisible = gameState.debugMode || REVEAL_TURNS.includes(gameState.turn);
            if (currentPlayer.isVisible) gameState.mrXLastKnownLocation = currentPlayer.position;
        }
        let logMessage = isMrX ? `Mr. X used a ${moveType} ticket.` : `${currentPlayer.name} moved to station ${targetStationId} via ${moveType}.`;
        if (isMrX && REVEAL_TURNS.includes(gameState.turn)) {
            logMessage += ` (Revealed at Station ${targetStationId})`;
        }
        gameState.log.unshift(`Turn ${gameState.turn}: ${logMessage}`);
        advanceTurn();
    }

    function advanceTurn() {
        updateTokenPositions();
        setTimeout(() => {
            if (checkWinCondition()) {
                endGame('Detectives');
                return;
            }
            const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
            const nextPlayer = gameState.players[nextPlayerIndex];
            showPassDeviceScreen(nextPlayer.name, () => {
                gameState.currentPlayerIndex = nextPlayerIndex;
                if (gameState.currentPlayerIndex === 0) gameState.turn++;
                if (gameState.turn > gameState.maxTurns) {
                    endGame('Mr. X');
                    return;
                }
                drawBoard();
                updateUI();
            });
        }, 500);
    }

    function showPassDeviceScreen(nextPlayerName, onReady) {
        passDeviceMessage.textContent = `Pass the device to ${nextPlayerName}`;
        passDeviceModal.classList.remove('hidden');

        const readyHandler = () => {
            passDeviceModal.classList.add('hidden');
            playerReadyButton.removeEventListener('click', readyHandler);
            onReady();
        };
        playerReadyButton.addEventListener('click', readyHandler);
    }

    function checkWinCondition() {
        const mrX = gameState.players[0];
        for (let i = 1; i < gameState.players.length; i++) {
            if (gameState.players[i].position === mrX.position) return true;
        }
        return false;
    }

    function endGame(winner) {
        gameState.gameOver = true;
        gameState.winner = winner;
        const mrX = gameState.players[0];
        mrX.isVisible = true;
        updateTokenPositions();
        drawBoard();
        updateUI();
        let message = `${winner} Win!`;
        if (winner === 'Detectives') {
            message += ` Mr. X was caught at Station ${mrX.position}!`;
        } else {
            message += ` Mr. X escaped!`;
        }
        gameOverMessage.textContent = message;
        gameOverModal.classList.remove('hidden');
    }

    function activateDoubleMove() {
        const mrX = gameState.players[0];
        if (mrX.tickets.double > 0) {
            mrX.tickets.double--;
            gameState.isDoubleMove = true;
            updateUI();
        }
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw connections with different colors for transport types
        const lineColors = {
            taxi: 'rgba(200, 200, 0, 0.4)',
            bus: 'rgba(0, 100, 200, 0.4)',
            underground: 'rgba(200, 0, 0, 0.5)'
        };

        ctx.lineWidth = 3;
        for (const id in stations) {
            const s1 = stations[id];
            for (const type in s1.connections) {
                ctx.strokeStyle = lineColors[type] || 'rgba(0, 0, 0, 0.2)';
                s1.connections[type].forEach(neighborId => {
                    const s2 = stations[neighborId];
                    if (id < neighborId) {
                        ctx.beginPath();
                        ctx.moveTo(s1.x, s1.y);
                        ctx.lineTo(s2.x, s2.y);
                        ctx.stroke();
                    }
                });
            }
        }

        // Draw stations
        for (const id in stations) {
            const s1 = stations[id];
            for (const type in s1.connections) {
                s1.connections[type].forEach(neighborId => {
                    const s2 = stations[neighborId];
                    if (id < neighborId) {
                        ctx.beginPath();
                        ctx.moveTo(s1.x, s1.y);
                        ctx.lineTo(s2.x, s2.y);
                        ctx.stroke();
                    }
                });
            }
        }
        for (const id in stations) {
            const station = stations[id];
            ctx.beginPath();
            ctx.arc(station.x, station.y, 10, 0, 2 * Math.PI);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(id, station.x, station.y);
        }
        if (!gameState.gameOver) {
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            const currentStation = stations[currentPlayer.position];
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'gold';
            for (const type in currentStation.connections) {
                if (currentPlayer.tickets[type] > 0 || (currentPlayer.role === 'MrX' && currentPlayer.tickets.black > 0)) {
                    currentStation.connections[type].forEach(neighborId => {
                        const neighbor = stations[neighborId];
                        ctx.beginPath();
                        ctx.arc(neighbor.x, neighbor.y, 12, 0, 2 * Math.PI);
                        ctx.stroke();
                    });
                }
            }
        }
    }

    function updateUI() {
        updateTokenPositions();
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (gameState.gameOver) {
            turnIndicator.textContent = `Game Over!`;
        } else {
            let turnText = `Turn ${gameState.turn}: ${currentPlayer.name}'s Move (${currentPlayer.role})`;
            if (gameState.isDoubleMove) turnText += ' (Double Move: 2nd half)';
            turnIndicator.textContent = turnText;
        }
        ticketsDiv.innerHTML = `<h3>${currentPlayer.name}'s Tickets</h3>`;
        const ul = document.createElement('ul');
        for (const type in currentPlayer.tickets) {
            const li = document.createElement('li');
            li.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${currentPlayer.tickets[type]}`;
            ul.appendChild(li);
        }
        ticketsDiv.appendChild(ul);
        moveLogDiv.innerHTML = '<h3>Move Log</h3>';
        const logUl = document.createElement('ul');
        gameState.log.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = entry;
            logUl.appendChild(li);
        });
        moveLogDiv.appendChild(logUl);
        specialMovesDiv.innerHTML = '';
        if (!gameState.gameOver && currentPlayer.role === 'MrX' && currentPlayer.tickets.double > 0 && !gameState.isDoubleMove) {
            const doubleMoveButton = document.createElement('button');
            doubleMoveButton.textContent = 'Use Double Move';
            doubleMoveButton.addEventListener('click', activateDoubleMove);
            specialMovesDiv.appendChild(doubleMoveButton);
        }
    }
});
