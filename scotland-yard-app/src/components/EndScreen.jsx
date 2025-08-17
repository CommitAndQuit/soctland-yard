import React from 'react';

const EndScreen = ({ winner, onPlayAgain }) => {
  return (
    <div className="game-over-overlay">
      <h2>Game Over!</h2>
      <p>{winner === 'mrX' ? 'Mr. X Wins!' : 'Detectives Win!'}</p>
      <button onClick={onPlayAgain}>Play Again</button>
    </div>
  );
};

export default EndScreen;
