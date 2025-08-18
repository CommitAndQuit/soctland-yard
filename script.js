document.addEventListener('DOMContentLoaded', () => {
    const engine = new GameEngine();
    const ui = new UI(engine);

    function handleLocationClick(event) {
        if (engine.gameState.gameover) return;

        const locationId = parseInt(event.currentTarget.id.split('-')[1]);
        const currentPlayerId = engine.gameState.playerOrder[engine.gameState.currentPlayerIndex];
        const validMoves = engine.getValidMoves(currentPlayerId);

        if (validMoves[locationId]) {
            const ticketOptions = validMoves[locationId];
            let ticketToUse;

            if (ticketOptions.length === 1) {
                ticketToUse = ticketOptions[0];
            } else {
                ticketToUse = prompt(`Choose ticket to move to station ${locationId}:\n${ticketOptions.join(', ')}`);
                if (!ticketToUse || !ticketOptions.includes(ticketToUse.toLowerCase())) {
                    alert('Invalid ticket choice.');
                    return;
                }
                ticketToUse = ticketToUse.toLowerCase();
            }

            const moveSuccessful = engine.handleMove(locationId, ticketToUse);

            if (moveSuccessful) {
                ui.update();
                ui.showTurnOverlay();
            } else {
                alert('Move failed! Check if you have the right tickets.');
            }
        }
    }

    function handleDoubleMoveClick() {
        if (engine.activateDoubleMove()) {
            ui.update();
            alert("Double move activated. Make your first move.");
        }
    }

    function handleReadyClick() {
        ui.hideTurnOverlay();
    }

    function newGame() {
        engine.initGame(3);
        ui.renderBoard();

        ui.locationElements.forEach(loc => loc.addEventListener('click', handleLocationClick));

        ui.update();
        ui.showTurnOverlay();
    }

    ui.newGameBtn.addEventListener('click', newGame);
    ui.doubleMoveBtn.addEventListener('click', handleDoubleMoveClick);
    ui.readyBtn.addEventListener('click', handleReadyClick);

    newGame();
});
