import React from 'react';

const ticketIcons = {
  taxi: '🚕',
  bus: '🚌',
  underground: '🚇',
  black: '⚫',
};

const MoveLog = ({ mrXMoves }) => {
  return (
    <div className="move-log">
      <h3>Mr. X's Moves</h3>
      <ul>
        {mrXMoves.map((move, index) => (
          <li key={index}>
            Turn {move.turn}: {ticketIcons[move.ticketType] || move.ticketType}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MoveLog;
