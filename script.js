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

    function handleLocationClick(event) {
        if (gameState.gameover) return;

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
                alert('Not enough taxi tickets!');
            }
        }
    }

    function checkWinCondition() {
        // Detective wins by catching Mr. X
        if (gameState.players.detective1.position === gameState.players.mrX.position) {
            gameState.gameover = true;
            gameState.winner = 'Detective';
            setTimeout(() => {
                alert('Game Over: Detective catches Mr. X!');
            }, 10);
        }
        // Mr. X wins by evading for 5 turns
        else if (gameState.turn > 5) {
            gameState.gameover = true;
            gameState.winner = 'Mr. X';
            setTimeout(() => {
                alert('Game Over: Mr. X has escaped!');
            }, 10);
        }
    }

    function initGame() {
        gameState = {
            players: {
                detective1: { position: 1, tickets: { taxi: 10 } },
                mrX: { position: 3, tickets: { taxi: 4 } }
            },
            turn: 1,
            currentPlayer: 'detective1',
            gameover: false,
            winner: null
        };
        updateUI();
    }

    function renderPlayers() {
        const detectivePos = locations[gameState.players.detective1.position];
        detective1Element.style.top = `${detectivePos.top + 5}px`;
        detective1Element.style.left = `${detectivePos.left + 5}px`;

        const mrXPos = locations[gameState.players.mrX.position];
        mrXElement.style.top = `${mrXPos.top + 5}px`;
        mrXElement.style.left = `${mrXPos.left + 5}px`;
    }

    function updateUI() {
        if (!gameState.players) return;
        renderPlayers();
        currentTurnEl.textContent = gameState.turn;
        if (gameState.gameover) {
            currentPlayerEl.textContent = `${gameState.winner} WINS!`;
        } else {
            currentPlayerEl.textContent = gameState.currentPlayer === 'detective1' ? 'Detective' : 'Mr. X';
        }
        detectiveTaxiEl.textContent = gameState.players.detective1.tickets.taxi;
        mrxTaxiEl.textContent = gameState.players.mrX.tickets.taxi;
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
