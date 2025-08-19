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
const playersGroup = document.createElementNS(SVG_NS, 'g'); // New group for players
board.appendChild(connectionsGroup);
board.appendChild(stationsGroup);
board.appendChild(playersGroup); // Appended last to be on top


function getStationById(id) {
    return stations.find(station => station.id === id);
}

function drawPlayerMarkers() {
    // Clear previous markers
    playersGroup.innerHTML = '';

    for (const player of gameState.players) {
        const station = getStationById(player.currentPosition);
        if (station) {
            const marker = document.createElementNS(SVG_NS, 'circle');
            marker.setAttribute('cx', station.x);
            marker.setAttribute('cy', station.y);
            marker.setAttribute('r', 8); // Slightly smaller than stations
            marker.setAttribute('fill', player.color);
            marker.setAttribute('stroke', 'white');
            marker.setAttribute('stroke-width', 2);
            marker.setAttribute('id', `player-${player.id}`);
            playersGroup.appendChild(marker);
        }
    }
}

function drawConnections() {
    for (const station of stations) {
        if (station.connections) {
            for (const transport in station.connections) {
                const color = transportColors[transport] || 'black';
                for (const destinationId of station.connections[transport]) {
                    // Only draw connection if my ID is smaller to avoid duplicates
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
        stationsGroup.appendChild(circle); // Append to stations group

        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', station.x);
        text.setAttribute('y', station.y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dy', '.3em');
        text.setAttribute('font-size', '10px');
        text.textContent = station.id;
        stationsGroup.appendChild(text); // Append to stations group
    }
}

async function loadStations() {
    try {
        const response = await fetch('stations.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        stations = await response.json();
        console.log('Stations loaded:', stations);
        drawConnections(); // Draw connections first
        drawStations(); // Then draw stations on top
        drawPlayerMarkers();
    } catch (error) {
        console.error('Could not load stations:', error);
    }
}

loadStations();
