// Define the nodes (locations) on the map
export const nodes = [
    { id: 1, x: 100, y: 50 },
    { id: 2, x: 200, y: 50 },
    { id: 3, x: 300, y: 50 },
    { id: 4, x: 150, y: 100 },
    { id: 5, x: 250, y: 100 },
    { id: 6, x: 100, y: 150 },
    { id: 7, x: 200, y: 150 },
    { id: 8, x: 300, y: 150 },
    { id: 9, x: 150, y: 200 },
    { id: 10, x: 250, y: 200 },
];

// Define the paths (connections) between nodes with ticket types
export const paths = [
    { from: 1, to: 2, type: 'taxi' },
    { from: 1, to: 4, type: 'bus' },
    { from: 2, to: 3, type: 'taxi' },
    { from: 2, to: 5, type: 'underground' },
    { from: 3, to: 8, type: 'bus' },
    { from: 4, to: 5, type: 'taxi' },
    { from: 4, to: 6, type: 'taxi' },
    { from: 5, to: 7, type: 'bus' },
    { from: 6, to: 7, type: 'taxi' },
    { from: 6, to: 9, type: 'underground' },
    { from: 7, to: 8, type: 'taxi' },
    { from: 7, to: 10, type: 'bus' },
    { from: 8, to: 10, type: 'taxi' },
    { from: 9, to: 10, type: 'taxi' },
];
