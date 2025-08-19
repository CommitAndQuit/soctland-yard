console.log("board.js loaded");

const board = document.getElementById('game-board');
const SVG_NS = "http://www.w3.org/2000/svg";
let stations = [];

const transportColors = {
    taxi: 'yellow',
    bus: 'green',
    underground: 'red',
    ferry: 'blue'
};

// Create groups for organization
const connectionsGroup = document.createElementNS(SVG_NS, 'g');
const stationsGroup = document.createElementNS(SVG_NS, 'g');
const playersGroup = document.createElementNS(SVG_NS, 'g');
board.appendChild(connectionsGroup);
board.appendChild(stationsGroup);
board.appendChild(playersGroup);


const REVEAL_ROUNDS = [3, 8, 13, 18, 24];

function getStationById(id) {
    return stations.find(station => station.id === id);
}

function drawPlayerMarkers() {
    playersGroup.innerHTML = '';
    const isRevealRound = REVEAL_ROUNDS.includes(gameState.round);

    for (const player of gameState.players) {
        const shouldDraw = player.role !== 'Mr. X' || isRevealRound;

        if (shouldDraw) {
            const station = getStationById(player.currentPosition);
            if (station) {
                const marker = document.createElementNS(SVG_NS, 'circle');
                marker.setAttribute('cx', station.x);
                marker.setAttribute('cy', station.y);
                marker.setAttribute('r', 8);
                marker.setAttribute('fill', player.color);
                marker.setAttribute('stroke', 'white');
                marker.setAttribute('stroke-width', 2);
                marker.setAttribute('id', `player-${player.id}`);
                playersGroup.appendChild(marker);
            }
        }
    }
}

function drawConnections() {
    for (const station of stations) {
        if (station.connections) {
            for (const transport in station.connections) {
                const color = transportColors[transport] || 'black';
                for (const destinationId of station.connections[transport]) {
                    if (station.id < destinationId) {
                        const destinationStation = getStationById(destinationId);
                        if (destinationStation) {
                            const line = document.createElementNS(SVG_NS, 'line');
                            line.setAttribute('x1', station.x);
                            line.setAttribute('y1', station.y);
                            line.setAttribute('x2', destinationStation.x);
                            line.setAttribute('y2', destinationStation.y);
                            line.setAttribute('stroke', color);
                            line.setAttribute('stroke-width', 2);
                            connectionsGroup.appendChild(line);
                        }
                    }
                }
            }
        }
    }
}

function drawStations() {
    for (const station of stations) {
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', station.x);
        circle.setAttribute('cy', station.y);
        circle.setAttribute('r', 10);
        circle.setAttribute('fill', 'lightgray');
        circle.setAttribute('stroke', 'black');
        circle.setAttribute('stroke-width', 1);
        circle.setAttribute('id', `station-${station.id}`);
        circle.classList.add('station-circle');
        stationsGroup.appendChild(circle);

        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', station.x);
        text.setAttribute('y', station.y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dy', '.3em');
        text.setAttribute('font-size', '10px');
        text.textContent = station.id;
        text.style.pointerEvents = 'none';
        stationsGroup.appendChild(text);
    }
}

// --- New Highlighting Functions ---

function resetStationHighlights() {
    document.querySelectorAll('.station-circle').forEach(circle => {
        circle.classList.remove('valid-move', 'selected-move');
    });
}

function highlightValidMoves(stationIds) {
    stationIds.forEach(id => {
        const circle = document.getElementById(`station-${id}`);
        if (circle) {
            circle.classList.add('valid-move');
        }
    });
}

function selectStationHighlight(stationId) {
    resetStationHighlights(); // Clear previous highlights first
    const circle = document.getElementById(`station-${stationId}`);
    if (circle) {
        circle.classList.add('selected-move');
    }
}

async function loadBoard() {
    try {
        const response = await fetch('stations.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        stations = await response.json();
        console.log('Stations loaded:', stations);
        drawConnections();
        drawStations();
        drawPlayerMarkers();

        // Now that the board is ready, start the game
        if (typeof startGame === 'function') {
            startGame();
        }
    } catch (error) {
        console.error('Could not load stations:', error);
    }
}

// Event listener for station clicks
document.addEventListener('DOMContentLoaded', () => {
    stationsGroup.addEventListener('click', (e) => {
        if (e.target.classList.contains('station-circle')) {
            const stationId = parseInt(e.target.id.split('-')[1], 10);
            if (typeof handleStationClick === 'function') {
                handleStationClick(stationId);
            }
        }
    });

    // Rename loadStations to loadBoard and call it
    loadBoard();
});
