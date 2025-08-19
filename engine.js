class GameEngine {
    constructor() {
        this.gameState = {};
        this.map = stationData;
        this.startLocations = [13, 26, 29, 34, 50, 53, 91, 94, 103, 112, 117, 132, 138, 141, 155, 174, 197, 198];
    }

    initGame(playerIds) { // playerIds is an array of peer IDs, host is first
        if (playerIds.length < 2 || playerIds.length > 6) {
            throw new Error("Invalid number of players.");
        }

        const players = {};
        const shuffledStarts = this.shuffleArray([...this.startLocations]);
        const hostId = playerIds[0];

        // Mr. X setup
        players[hostId] = {
            id: hostId,
            isMrX: true,
            position: shuffledStarts.pop(),
            tickets: { taxi: 24, bus: 24, underground: 24, black: 5, double: 2 },
            moveLog: [],
        };

        // Detectives setup
        const detectives = playerIds.slice(1);
        detectives.forEach(peerId => {
            players[peerId] = {
                id: peerId,
                isMrX: false,
                position: shuffledStarts.pop(),
                tickets: { taxi: 10, bus: 8, underground: 4 },
            };
        });

        this.gameState = {
            players: players,
            turn: 1,
            currentPlayerIndex: 0,
            playerOrder: playerIds,
            gameover: false,
            winner: null,
            doubleMoveActive: false,
            doubleMoveTurn: 0,
        };
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    activateDoubleMove() {
        const mrX = this.gameState.players[this.gameState.playerOrder[0]];
        if (mrX.tickets.double > 0 && !this.gameState.doubleMoveActive) {
            mrX.tickets.double--;
            this.gameState.doubleMoveActive = true;
            this.gameState.doubleMoveTurn = 1;
            return true;
        }
        return false;
    }

    getValidMoves(playerId) {
        const player = this.gameState.players[playerId];
        if (!player) return {};
        const currentPos = player.position;
        const station = this.map.find(s => s.id === currentPos);
        if (!station) return {};
        const validMoves = {};
        for (const type in station.connections) {
            if (type === 'ferry' && !player.isMrX) continue;
            if (player.tickets[type] > 0 || (player.isMrX && player.tickets.black > 0)) {
                station.connections[type].forEach(destId => {
                    if (!validMoves[destId]) validMoves[destId] = [];
                    if (!validMoves[destId].includes(type)) validMoves[destId].push(type);
                });
            }
        }
        return validMoves;
    }

    handleMove(playerId, locationId, ticketType) {
        if (this.gameState.gameover) return false;
        const player = this.gameState.players[playerId];
        if (!player) return false;
        const validMoves = this.getValidMoves(playerId);
        if (!validMoves[locationId] || !validMoves[locationId].includes(ticketType)) {
            return false;
        }
        let ticketToUse = ticketType;
        if (player.tickets[ticketType] <= 0) {
            if (player.isMrX && player.tickets.black > 0) {
                ticketToUse = 'black';
            } else {
                return false;
            }
        }
        player.position = locationId;
        player.tickets[ticketToUse]--;
        if (player.isMrX) {
            const move = { turn: this.gameState.turn, ticket: ticketType };
            if ([3, 8, 13, 18, 24].includes(this.gameState.turn)) {
                move.position = locationId;
            }
            player.moveLog.push(move);
        } else {
            const mrX = this.gameState.players[this.gameState.playerOrder[0]];
            mrX.tickets[ticketType]++;
        }
        this.advanceTurn();
        this.checkWinCondition();
        return true;
    }

    advanceTurn() {
        const currentPlayerId = this.gameState.playerOrder[this.gameState.currentPlayerIndex];
        const player = this.gameState.players[currentPlayerId];
        if (player.isMrX && this.gameState.doubleMoveActive) {
            if (this.gameState.doubleMoveTurn === 1) {
                this.gameState.doubleMoveTurn = 2;
            } else {
                this.gameState.doubleMoveActive = false;
                this.gameState.doubleMoveTurn = 0;
                this.nextPlayer();
            }
        } else {
            this.nextPlayer();
        }
    }

    nextPlayer() {
        this.gameState.currentPlayerIndex++;
        if (this.gameState.currentPlayerIndex >= this.gameState.playerOrder.length) {
            this.gameState.currentPlayerIndex = 0;
            this.gameState.turn++;
        }
    }

    areDetectivesBlocked() {
        for (const playerId of this.gameState.playerOrder) {
            const player = this.gameState.players[playerId];
            if (!player.isMrX) {
                if (Object.keys(this.getValidMoves(playerId)).length > 0) {
                    return false;
                }
            }
        }
        return true;
    }

    checkWinCondition() {
        if (this.gameState.gameover) return;
        const mrX = this.gameState.players[this.gameState.playerOrder[0]];
        for (const playerId of this.gameState.playerOrder) {
            if (playerId !== mrX.id) {
                if (this.gameState.players[playerId].position === mrX.position) {
                    this.gameState.gameover = true;
                    this.gameState.winner = 'Detectives';
                    return;
                }
            }
        }
        if (this.gameState.turn > 24) {
            this.gameState.gameover = true;
            this.gameState.winner = 'Mr. X';
            return;
        }
        if (this.areDetectivesBlocked()) {
            this.gameState.gameover = true;
            this.gameState.winner = 'Mr. X';
            return;
        }
    }
}
