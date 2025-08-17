import React, { useState } from 'react';

const StartScreen = ({ onStartGame }) => {
  const [numDetectives, setNumDetectives] = useState(3);
  const [mrXName, setMrXName] = useState('Mr. X');
  const [detectiveNames, setDetectiveNames] = useState(Array(numDetectives).fill('').map((_, i) => `Detective ${i + 1}`));

  const handleNumDetectivesChange = (num) => {
    setNumDetectives(num);
    setDetectiveNames(Array(num).fill('').map((_, i) => `Detective ${i + 1}`));
  };

  const handleDetectiveNameChange = (index, name) => {
    const newNames = [...detectiveNames];
    newNames[index] = name;
    setDetectiveNames(newNames);
  };

  const handleStartClick = () => {
    const playerConfigs = [
      { role: 'mrX', name: mrXName },
      ...detectiveNames.map(name => ({ role: 'detective', name }))
    ];
    onStartGame(playerConfigs);
  };

  return (
    <div className="start-screen">
      <h1>Scotland Yard</h1>
      <h2>Local Multiplayer Web App</h2>

      <div className="player-setup">
        <h3>Mr. X</h3>
        <input
          type="text"
          placeholder="Mr. X's Name"
          value={mrXName}
          onChange={(e) => setMrXName(e.target.value)}
        />

        <h3>Detectives ({numDetectives})</h3>
        <p>Select number of detectives (1-5):</p>
        <div className="detective-selection">
          {[1, 2, 3, 4, 5].map(num => (
            <button
              key={num}
              onClick={() => handleNumDetectivesChange(num)}
              className={numDetectives === num ? 'selected' : ''}
            >
              {num}
            </button>
          ))}
        </div>
        {detectiveNames.map((name, index) => (
          <input
            key={index}
            type="text"
            placeholder={`Detective ${index + 1} Name`}
            value={name}
            onChange={(e) => handleDetectiveNameChange(index, e.target.value)}
          />
        ))}
      </div>

      <button onClick={handleStartClick} className="start-game-button">
        Start Game
      </button>
    </div>
  );
};

export default StartScreen;
