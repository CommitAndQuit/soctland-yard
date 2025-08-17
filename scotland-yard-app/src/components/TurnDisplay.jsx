import React from 'react';

const TurnDisplay = ({ turn, currentPlayer }) => {
    return (
        <div className="turn-display">
            <h2>Turn: {turn}</h2>
            <h3>Current Player: {currentPlayer ? (currentPlayer.role === 'mrX' ? 'Mr. X' : `Detective ${currentPlayer.id}`) : 'N/A'}</h3>
        </div>
    );
};

export default TurnDisplay;
