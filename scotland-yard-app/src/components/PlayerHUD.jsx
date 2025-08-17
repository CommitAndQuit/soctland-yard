import React from 'react';

const PlayerHUD = ({ player, isMrXRevealed }) => {
    if (!player) return null;

    return (
        <div className="player-hud">
            <h2>{player.role === 'mrX' ? 'Mr. X' : `Detective ${player.id}`}</h2>
            <p>Current Node: {player.role === 'mrX' && !isMrXRevealed ? 'Hidden' : player.currentNode}</p>
            <h3>Tickets:</h3>
            <ul>
                <li>Taxi: {player.tickets.taxi}</li>
                <li>Bus: {player.tickets.bus}</li>
                <li>Underground: {player.tickets.underground}</li>
                {player.role === 'mrX' && <li>Black: {player.tickets.black}</li>}
            </ul>
        </div>
    );
};

export default PlayerHUD;
