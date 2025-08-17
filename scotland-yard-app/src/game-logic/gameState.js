// Initial game state
export const initialGameState = {
    players: [], // Array of player objects
    mrX: null, // Mr. X's player object
    detectives: [], // Array of detective player objects
    currentPlayerId: null, // ID of the player whose turn it is
    turn: 1, // Current turn number
    mrXLocations: [], // Log of Mr. X's moves (ticket type only)
    gamePhase: 'startScreen', // 'startScreen', 'gameInProgress', 'gameOver'
    winner: null, // 'mrX' or 'detectives'
};

// Player structure
export const createPlayer = (id, role, initialNode) => ({
    id,
    role, // 'mrX' or 'detective'
    currentNode: initialNode,
    tickets: {
        taxi: role === 'mrX' ? 4 : 10, // Example initial tickets
        bus: role === 'mrX' ? 3 : 8,
        underground: role === 'mrX' ? 3 : 4,
        black: role === 'mrX' ? 5 : 0, // Mr. X only
    },
    isMrXRevealed: false, // Only for Mr. X
});

// Function to update game state (simplified for now)
export const updateGameState = (currentState, updates) => {
    return { ...currentState, ...updates };
};
