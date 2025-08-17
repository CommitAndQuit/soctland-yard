import React, { useState } from 'react';
import Board from './components/Board';
import PlayerHUD from './components/PlayerHUD';
import TurnDisplay from './components/TurnDisplay';
import { initialGameState, createPlayer, updateGameState } from './game-logic/gameState';
import { isValidMove, applyMove, checkWinConditions, nextTurn } from './game-logic/gameRules';
import { nodes } from './game-logic/mapData';
import MoveLog from './components/MoveLog';
import StartScreen from './components/StartScreen';
import EndScreen from './components/EndScreen';

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [selectedNodes, setSelectedNodes] = useState([]); // For move selection
  const [selectedTicketType, setSelectedTicketType] = useState(null); // For ticket selection

  const startGame = (playerConfigs) => {
    const players = [];
    const availableNodes = [...nodes]; // Copy nodes to pick starting positions

    playerConfigs.forEach((config, index) => {
      const playerNodeIndex = Math.floor(Math.random() * availableNodes.length);
      const playerInitialNode = availableNodes.splice(playerNodeIndex, 1)[0].id;
      players.push(createPlayer(index, config.role, playerInitialNode, config.name));
    });

    const mrXPlayer = players.find(p => p.role === 'mrX');

    setGameState(updateGameState(initialGameState, {
      players,
      mrX: mrXPlayer,
      detectives: players.filter(p => p.role === 'detective'),
      currentPlayerId: mrXPlayer.id, // Mr. X starts
      gamePhase: 'gameInProgress',
    }));
  };

  const handleNodeClick = (nodeId) => {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    if (!currentPlayer) return;

    if (selectedNodes.length === 0) {
      // First click: select starting node (should be current player's node)
      if (nodeId === currentPlayer.currentNode) {
        setSelectedNodes([nodeId]);
      } else {
        alert('Please select your current location first.');
      }
    } else if (selectedNodes.length === 1) {
      // Second click: select destination node
      const fromNodeId = selectedNodes[0];
      const toNodeId = nodeId;

      if (!selectedTicketType) {
        alert('Please select a ticket type first.');
        return;
      }

      if (isValidMove(currentPlayer.id, fromNodeId, toNodeId, selectedTicketType, gameState.players)) {
        const newGameState = applyMove(gameState, currentPlayer.id, toNodeId, selectedTicketType);
        setGameState(nextTurn(newGameState));
        setSelectedNodes([]);
        setSelectedTicketType(null); // Reset ticket selection
        checkGameEnd(newGameState);
      } else {
        alert('Invalid move with selected ticket type.');
      }
    }
  };

  const handleTicketSelect = (ticketType) => {
    setSelectedTicketType(ticketType);
  };

  const checkGameEnd = (currentGameState) => {
    const winner = checkWinConditions(currentGameState);
    if (winner) {
      setGameState(updateGameState(currentGameState, { gamePhase: 'gameOver', winner }));
    }
  };

  const renderGameScreen = () => {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    const mrXPlayer = gameState.players.find(p => p.role === 'mrX');

    return (
      <div className="game-screen">
        <TurnDisplay turn={gameState.turn} currentPlayer={currentPlayer} />
        <div className="player-huds">
          {gameState.players.map(player => (
            <PlayerHUD
              key={player.id}
              player={player}
              isMrXRevealed={player.role === 'mrX' ? mrXPlayer.isMrXRevealed : false}
            />
          ))}
        </div>
        <div className="ticket-selection">
          {currentPlayer && (currentPlayer.role === 'mrX' || currentPlayer.role === 'detective') && (
            <>
              <h4>Select Ticket:</h4>
              {Object.keys(currentPlayer.tickets).map(ticketType => (
                <button
                  key={ticketType}
                  onClick={() => handleTicketSelect(ticketType)}
                  disabled={currentPlayer.tickets[ticketType] <= 0 || selectedTicketType === ticketType}
                  className={selectedTicketType === ticketType ? 'selected-ticket' : ''}
                >
                  {ticketType} ({currentPlayer.tickets[ticketType]})
                </button>
              ))}
            </>
          )}
        </div>
        <Board onNodeClick={handleNodeClick} players={gameState.players} />
        <MoveLog mrXMoves={gameState.mrXLocations} />
        {gameState.winner && (
          <div className="game-over-overlay">
            <h2>Game Over!</h2>
            <p>{gameState.winner === 'mrX' ? 'Mr. X Wins!' : 'Detectives Win!'}</p>
            <button onClick={() => setGameState(initialGameState)}>Play Again</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="App">
      {gameState.gamePhase === 'startScreen' && <StartScreen onStartGame={startGame} />}
      {gameState.gamePhase === 'gameInProgress' && renderGameScreen()}
      {gameState.gamePhase === 'gameOver' && <EndScreen winner={gameState.winner} onPlayAgain={() => setGameState(initialGameState)} />}
    </div>
  );
}

export default App;
