console.log("state.js loaded");

const gameState = {
    round: 1,
    // Start with the first detective
    currentTurnPlayerIndex: 0,
    mrXHistory: [], // Will store transport types used by Mr. X

    players: [
        {
            id: 'det-1',
            role: 'Detective',
            color: 'cyan',
            currentPosition: 1,
            tickets: {
                taxi: 10,
                bus: 8,
                underground: 4,
            }
        },
        {
            id: 'det-2',
            role: 'Detective',
            color: 'orange',
            currentPosition: 4,
            tickets: {
                taxi: 10,
                bus: 8,
                underground: 4,
            }
        },
        {
            id: 'mr-x',
            role: 'Mr. X',
            color: 'black',
            currentPosition: 3,
            tickets: {
                // Mr. X has a large supply of tickets.
                // The key is that the type of ticket used is revealed.
                taxi: 24,
                bus: 24,
                underground: 24,
            }
        },
    ]
};
