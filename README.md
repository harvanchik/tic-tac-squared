# Tic Tac Squared

[![Maintenance](https://img.shields.io/badge/maintained%3F-yes-green.svg)](https://github.com/yourusername/tic-tac-squared/graphs/commit-activity)
![GitHub license](https://img.shields.io/github/license/yourusername/tic-tac-squared)

A strategic twist on the classic Tic Tac Toe game! Tic Tac Squared (also known as Ultimate Tic Tac Toe or Meta Tic Tac Toe) features a 3x3 grid of smaller Tic Tac Toe boards, creating a deeper level of strategy and gameplay.

![Tic Tac Squared Game](assets/images/game-preview.png)

## Features

- **Multiple Game Modes**: Play against another person or challenge the AI with adjustable difficulty levels
- **Customizable Rules**: Choose between standard rules (next move determined by opponent's last move) or free play mode
- **Custom Player Colors**: Personalize your X and O colors
- **Responsive Design**: Play on any device - desktop, tablet, or mobile
- **Game State Saving**: Games are automatically saved in your browser's local storage

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Optional: Local web server for development

### Running the Game Locally

There are several ways to run the game locally on your machine:

#### Method 1: Directly Opening the HTML File

The simplest way to play the game is to open the `index.html` file directly in your browser:

1. Download or clone the repository
   ```
   git clone https://github.com/harvanchik/tic-tac-squared.git
   ```
2. Navigate to the project folder
3. Double-click on `index.html` to open it in your default web browser

Note: Some browsers may restrict certain features when running HTML files directly from your file system.

#### Method 2: Using Live Server in VS Code (Recommended for Development)

1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. Open the project folder in VS Code
3. Install the "Live Server" extension:
   - Click the Extensions icon in the sidebar (or press `Ctrl+Shift+X`)
   - Search for "Live Server"
   - Install the extension by Ritwick Dey
4. Start the server by clicking "Go Live" in the bottom right corner of VS Code
5. Your default browser will automatically open with the game running

#### Method 3: Using a Local Web Server

You can use any local web server solution, such as:

- **Node.js with http-server**:

  ```
  npm install -g http-server
  cd /path/to/tic-tac-squared
  http-server
  ```

- **Python's built-in HTTP server**:
  ```
  cd /path/to/tic-tac-squared
  # For Python 3
  python -m http.server
  # For Python 2
  python -m SimpleHTTPServer
  ```

Then open your browser and navigate to `http://localhost:8080` (or whatever port your server is using).

## How to Play

### Basic Rules

1. **Objective**: Win three small boards in a row (horizontally, vertically, or diagonally) on the super board
2. **Gameplay**: Players take turns marking spaces with X or O
3. **Small Board Wins**: Win a small board by getting three marks in a row within that board
4. **Board Selection**:
   - **Standard Rules**: Your move sends your opponent to the corresponding board. For example, if you play in the top-right cell of any small board, your opponent must play in the top-right board of the super board
   - **Free Play**: Players can play in any non-completed board on their turn

### Special Situations

- If a player is sent to a board that's already won or tied, they can play in any available board
- A tied board (filled with no winner) doesn't count for either player

## Game Settings

Access the settings by clicking the "Settings" button at the bottom of the screen:

- **Game Mode**: Choose between Human vs Human or Human vs AI
- **AI Difficulty**: When playing against AI, select Easy, Medium, or Hard
- **Rules**: Select Standard or Free Play rules
- **Player Colors**: Customize the colors for X and O
