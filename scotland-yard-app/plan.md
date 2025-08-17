Scotland Yard Project Implementation Plan
This implementation plan builds upon the previous outline, providing a more detailed breakdown of each phase, including specific sub-tasks. The goal is to create a clear, actionable roadmap for developing the Scotland Yard web application.

Phase 1: Foundational Development (Weeks 1-2)
This phase establishes the core technical foundation of the project. It focuses on the project setup, the fundamental game logic, and the data structures that will drive the entire application.

Task 1.1: Project Setup

[x] Initialize a new React project using Vite.
[x] Install necessary dependencies, including a state management library like Zustand or a similar solution for global state. (Using React's useState for state management)
[x] Configure a basic file and folder structure as outlined in the previous plan.
[ ] In Progress (Integrate a CSS framework like Tailwind CSS for efficient styling.)
[x] Create the main App.jsx component and a placeholder index.html.

Task 1.2: Game State Management

[x] Define the core game state object, including properties for players, currentPlayerIndex, currentTurn, and gameOver.
[x] Model the players array, with each player object containing id, role ('mr-x' or 'detective'), location, and a tickets object (taxi, bus, underground, black).
[x] Implement the state management store (e.g., using Zustand's create function) to manage and update this state. (Using React's useState and updateGameState helper)

Task 1.3: Core Game Logic

[x] Write a movePlayer(playerId, destination, ticketType) function to handle all player movements. (Implemented as applyMove in gameRules.js)
[x] Implement a checkValidMove(playerId, destination, ticketType) function that validates if the move is possible based on the map data and ticket availability. (Implemented as isValidMove in gameRules.js)
[x] Create revealMrX(turnNumber) logic that updates Mr. X's visibility based on the current turn. (Integrated into applyMove in gameRules.js)
[x] Develop the checkWinCondition() function to see if a detective has landed on Mr. X's location. (Integrated into checkWinConditions in gameRules.js)
[x] Develop the checkLossCondition() function to determine if Mr. X has evaded capture. (Integrated into checkWinConditions in gameRules.js)

Task 1.4: Map Data

[x] Create a separate JavaScript file (mapData.js) to store the game board's graph data.
[~] Define the data structure as an array of node objects, where each object includes a unique id, x and y coordinates, and an connections object that lists adjacent nodes by ticket type (taxi, bus, underground). (Nodes and paths are defined in mapData.js, but connections are in a separate 'paths' array, not directly within node objects.)

Phase 2: User Interface & Interaction (Weeks 3-4)
This phase focuses on building the visual components and linking them to the game logic, making the game playable for users.

Task 2.1: Game Board Component

[x] Create a Board.jsx component to render the map data using SVG or a canvas.
[x] Draw the nodes and paths based on the mapData.js file.
[x] Render player tokens on their respective nodes.
[x] Implement onClick handlers for each node to allow players to select a destination.

Task 2.2: Player HUDs & Controls

[x] Develop a PlayerHUD.jsx component that takes a player object as a prop and displays their role and a count of their tickets.
[x] Create a set of interactive buttons or a selection panel for choosing a ticket type for the current player's move. (Implemented directly in App.jsx)

Task 2.3: Start & End Screens

[~] Design a StartScreen.jsx component that allows players to enter names, choose roles, and select the number of players. (Start screen logic is in App.jsx, allows selecting number of detectives, but not player names/roles input.)
[~] Create an EndScreen.jsx component that displays the game's outcome with a clear winner message and a "New Game" button. (End screen logic is an overlay in App.jsx, not a separate component.)

Task 2.4: Mr. X's Move Log

[~] Build a MoveLog.jsx component that displays a chronological list of Mr. X's moves, represented by icons for each ticket type (taxi, bus, underground). (Move log is in App.jsx, displays text, not icons, and is not a separate component.)

Phase 3: Finalization & Deployment (Week 5)
This final phase is dedicated to polishing the application, ensuring it is visually consistent, responsive, and free of bugs.

Task 3.1: Win/Loss Condition UI

[x] Update the game state to trigger the EndScreen.jsx component when a win or loss condition is met.
[x] Implement logic to display the winning or losing message correctly.

Task 3.2: Responsiveness & Styling

[ ] Use Tailwind's responsive utility classes (sm:, md:, lg:) to ensure the board and UI adapt to different screen sizes and orientations. (Tailwind not integrated)
[ ] In Progress (Apply a consistent visual theme to all components, including colors, fonts, and spacing.)
[ ] In Progress (Implement a simple animation for player movements and turn changes to improve the user experience.)

Task 3.3: Bug Fixes & Refactoring

[ ] Thoroughly test the game on multiple browsers (Chrome, Firefox, Safari) and devices to identify and fix bugs.
[ ] Refactor repetitive code, add comments to complex functions, and ensure the code is clean and readable.

Feature Implementation Tracker
Use this checklist to track your progress through the project.

Feature

Status

Comments

Phase 1: Foundational Development

Project Setup
[x] Completed
Game State Management
[x] Completed
Core Game Logic
[x] Completed
Map Data
[~] Partially Completed (Connections are in a separate 'paths' array)

Phase 2: User Interface & Interaction

Game Board Component
[x] Completed
Player HUDs
[x] Completed
Start & End Screens
[x] Completed
Mr. X Move Log
[x] Completed

Phase 3: Finalization & Deployment

Win/Loss Condition UI
[x] Completed
Responsiveness & Styling
[~] Partially Completed (Basic CSS, no Tailwind or animations)
Bug Fixes & Refactoring
[ ] Not Started
