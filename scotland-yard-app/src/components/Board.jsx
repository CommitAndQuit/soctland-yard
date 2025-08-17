import React from 'react';
import { nodes, paths } from '../game-logic/mapData';

const Board = ({ onNodeClick, players }) => {
    const boardWidth = 400; // Example width, adjust as needed
    const boardHeight = 300; // Example height, adjust as needed

    return (
        <svg className="game-board" width={boardWidth} height={boardHeight}>
            {/* Render paths */}
            {paths.map((path, index) => {
                const fromNode = nodes.find(node => node.id === path.from);
                const toNode = nodes.find(node => node.id === path.to);

                if (!fromNode || !toNode) return null;

                return (
                    <line
                        key={index}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        className={`path ${path.type}`}
                    />
                );
            })}

            {/* Render nodes */}
            {nodes.map(node => {
                const playersOnNode = players.filter(p => p.currentNode === node.id);
                const mrXOnNode = playersOnNode.find(p => p.role === 'mrX');
                const detectivesOnNode = playersOnNode.filter(p => p.role === 'detective');

                return (
                    <g
                        key={node.id}
                        className="node-group"
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => onNodeClick(node.id)}
                    >
                        <circle className="node-circle" r="10" />
                        <text className="node-id" textAnchor="middle" dominantBaseline="middle">
                            {node.id}
                        </text>
                        {mrXOnNode && mrXOnNode.isMrXRevealed && (
                            <circle className="player-piece mr-x-piece" r="8" cx="15" cy="0" />
                        )}
                        {detectivesOnNode.map((detective, index) => (
                            <circle key={detective.id} className="player-piece detective-piece" r="8" cx={-15 + index * 5} cy="0" />
                        ))}
                    </g>
                );
            })}
        </svg>
    );
};

export default Board;
