import { nodes, paths } from './mapData';

// Helper to get valid moves from a node for a given ticket type
export const getValidMoves = (currentNodeId, ticketType, occupiedNodes = []) => {
    const possibleMoves = paths.filter(path =>
        path.from === currentNodeId && path.type === ticketType
    ).map(path => path.to);

    // Filter out occupied nodes for detectives
    if (ticketType !== 'black') { // Mr. X can move to occupied nodes
        return possibleMoves.filter(nodeId => !occupiedNodes.includes(nodeId));
    }
    return possibleMoves;
};

// Check if a move is valid
export const isValidMove = (playerId, fromNodeId, toNodeId, ticketType, players) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return false;

    // Check if player has the ticket
    if (player.tickets[ticketType] <= 0) return false;

    const occupiedNodes = players
        .filter(p => p.id !== playerId && p.role !== 'mrX') // Detectives cannot occupy same node
        .map(p => p.currentNode);

    const validMoves = getValidMoves(fromNodeId, ticketType, occupiedNodes);
    return validMoves.includes(toNodeId);
};

// Apply a move and update game state
export const applyMove = (gameState, playerId, toNodeId, ticketType) => {
    const newGameState = { ...gameState };
    const playerIndex = newGameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return newGameState;

    const player = { ...newGameState.players[playerIndex] };

    // Deduct ticket
    player.tickets[ticketType]--;

    // Update current node
    player.currentNode = toNodeId;

    // If Mr. X, log the move and update reveal status
    if (player.role === 'mrX') {
        newGameState.mrXLocations.push({ turn: newGameState.turn, ticket: ticketType });
        player.isMrXRevealed = [3, 8, 13, 18, 24].includes(newGameState.turn);
    } else {
        // Detectives give ticket to Mr. X
        const mrXPlayer = newGameState.players.find(p => p.role === 'mrX');
        if (mrXPlayer) {
            mrXPlayer.tickets[ticketType]++;
        }
    }

    newGameState.players[playerIndex] = player;
    return newGameState;
};

// Check win conditions
export const checkWinConditions = (gameState) => {
    const mrX = gameState.players.find(p => p.role === 'mrX');
    const detectives = gameState.players.filter(p => p.role === 'detective');

    // Detectives win if any detective lands on Mr. X's node
    if (mrX.isMrXRevealed) { // Only check if Mr. X is revealed
        for (const detective of detectives) {
            if (detective.currentNode === mrX.currentNode) {
                return 'detectives';
            }
        }
    }

    // Mr. X wins if all turns are completed
    if (gameState.turn >= 24) { // Assuming 24 turns
        return 'mrX';
    }

    // Mr. X wins if all detectives run out of moves (simplified check)
    const allDetectivesStuck = detectives.every(d => {
        const availableMoves = ['taxi', 'bus', 'underground'].some(ticket =>
            getValidMoves(d.currentNode, ticket, detectives.map(det => det.currentNode)).length > 0
        );
        return !availableMoves;
    });

    if (allDetectivesStuck) {
        return 'mrX';
    }

    return null; // No winner yet
};

// Advance to next turn/player
export const nextTurn = (gameState) => {
    const newGameState = { ...gameState };
    const currentPlayerIndex = newGameState.players.findIndex(p => p.id === newGameState.currentPlayerId);
    let nextPlayerIndex = (currentPlayerIndex + 1) % newGameState.players.length;

    // If all players have taken their turn, increment turn number
    if (nextPlayerIndex === 0) {
        newGameState.turn++;
    }

    newGameState.currentPlayerId = newGameState.players[nextPlayerIndex].id;
    return newGameState;
};
