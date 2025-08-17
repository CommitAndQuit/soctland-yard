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

    // UI Elements
    const detective1Element = document.getElementById('detective-1');
    const mrXElement = document.getElementById('mr-x');
    const currentTurnEl = document.getElementById('current-turn');
    const currentPlayerEl = document.getElementById('current-player');
    const detectiveTaxiEl = document.getElementById('detective-taxi');
    const mrxTaxiEl = document.getElementById('mrx-taxi');
    const locationElements = document.querySelectorAll('.location');
    const newGameBtn = document.getElementById('new-game-btn');

    function handleLocationClick(event) {
        if (gameState.gameover) return;

        const locationId = parseInt(event.currentTarget.id.split('-')[1]);
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

    // Add event listeners
    locationElements.forEach(loc => loc.addEventListener('click', handleLocationClick));
    newGameBtn.addEventListener('click', initGame);

    initGame();
});
