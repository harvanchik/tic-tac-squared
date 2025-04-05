type Player = 'X' | 'O';
type CellValue = Player | null;
type BoardPosition = number | null; // Index from 0-8 for the active board

// Simplified data structure
interface GameState {
	// 9 small boards (3x3 grid), each with 9 cells (3x3 grid)
	boards: CellValue[][][]; // [boardIndex][row][col]
	boardWinners: CellValue[]; // Winner of each small board
	currentPlayer: Player;
	activeBoard: BoardPosition; // Which small board is active
	winner: CellValue; // Overall winner
	isDraw: boolean;
	lastMove: {
		boardIndex: number; // Index from 0-8 for the board
		cellIndex: number; // Index from 0-8 for the cell within the board
		player: Player;
	} | null; // Track the last move made
}

export function createGameState() {
	// Initialize empty boards (9 small boards, each with a 3x3 grid of cells)
	const createEmptyBoards = (): CellValue[][][] => {
		// Create 9 small boards
		return Array(9)
			.fill(null)
			.map(() =>
				// Each small board is a 3x3 grid
				Array(3)
					.fill(null)
					.map(() => Array(3).fill(null))
			);
	};

	// Initialize empty array for tracking board winners
	const createEmptyBoardWinners = (): CellValue[] => {
		// 9 small boards
		return Array(9).fill(null);
	};

	// Game state
	let boards = createEmptyBoards();
	let boardWinners = createEmptyBoardWinners();
	let currentPlayer: Player = 'X';
	let activeBoard: BoardPosition = null; // null means any board can be played
	let winner: CellValue = null;
	let isDraw = false;
	let lastMove: {
		boardIndex: number; // Index from 0-8 for the board
		cellIndex: number; // Index from 0-8 for the cell within the board
		player: Player;
	} | null = null;

	// Check if a small board has a winner
	const checkBoardWinner = (board: CellValue[][]): CellValue => {
		// Check rows
		for (let i = 0; i < 3; i++) {
			if (board[i][0] && board[i][0] === board[i][1] && board[i][0] === board[i][2]) {
				return board[i][0];
			}
		}

		// Check columns
		for (let i = 0; i < 3; i++) {
			if (board[0][i] && board[0][i] === board[1][i] && board[0][i] === board[2][i]) {
				return board[0][i];
			}
		}

		// Check diagonals
		if (board[0][0] && board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
			return board[0][0];
		}

		if (board[0][2] && board[0][2] === board[1][1] && board[0][2] === board[2][0]) {
			return board[0][2];
		}

		return null;
	};

	// Check if a board is full (draw)
	const isBoardFull = (board: CellValue[][]): boolean => {
		return board.every((row: CellValue[]) => row.every((cell: CellValue) => cell !== null));
	};

	// Check if the game has a winner
	const checkGameWinner = (): CellValue => {
		// Check rows
		for (let row = 0; row < 3; row++) {
			const startIdx = row * 3;
			if (
				boardWinners[startIdx] &&
				boardWinners[startIdx] === boardWinners[startIdx + 1] &&
				boardWinners[startIdx] === boardWinners[startIdx + 2]
			) {
				return boardWinners[startIdx];
			}
		}

		// Check columns
		for (let col = 0; col < 3; col++) {
			if (
				boardWinners[col] &&
				boardWinners[col] === boardWinners[col + 3] &&
				boardWinners[col] === boardWinners[col + 6]
			) {
				return boardWinners[col];
			}
		}

		// Check diagonals
		if (
			boardWinners[0] &&
			boardWinners[0] === boardWinners[4] &&
			boardWinners[0] === boardWinners[8]
		) {
			return boardWinners[0];
		}

		if (
			boardWinners[2] &&
			boardWinners[2] === boardWinners[4] &&
			boardWinners[2] === boardWinners[6]
		) {
			return boardWinners[2];
		}

		return null;
	};

	// Check if the game is a draw
	const checkGameDraw = (): boolean => {
		// Game is a draw if all boards have a winner or are full, and there's no overall winner
		for (let i = 0; i < 9; i++) {
			if (boardWinners[i] === null && !isBoardFull(boards[i])) {
				return false;
			}
		}
		return !winner;
	};

	// Make a move
	const makeMove = (boardIndex: number, cellIndex: number): void => {
		// If game is over, do nothing
		if (winner || isDraw) return;

		// If an active board is set, only allow moves in that board
		if (activeBoard !== null && activeBoard !== boardIndex) {
			return;
		}

		// Convert 1D index to 2D coordinates for the cell
		const row = Math.floor(cellIndex / 3);
		const col = cellIndex % 3;

		// If the cell is already taken, do nothing
		if (boards[boardIndex][row][col] !== null) {
			return;
		}

		// Make the move
		boards[boardIndex][row][col] = currentPlayer;

		console.log('Move made: ' + boardIndex + ', ' + cellIndex + ', ' + currentPlayer);

		// Track the last move
		lastMove = {
			boardIndex,
			cellIndex,
			player: currentPlayer
		};

		console.log('last move', lastMove);

		// Check if the small board has a winner
		const boardWinner = checkBoardWinner(boards[boardIndex]);
		if (boardWinner) {
			boardWinners[boardIndex] = boardWinner;
		} else if (isBoardFull(boards[boardIndex])) {
			// Mark as draw (null remains)
			boardWinners[boardIndex] = null;
		}

		// Check if the game has a winner
		winner = checkGameWinner();

		// Check if the game is a draw
		if (!winner) {
			isDraw = checkGameDraw();
		}

		// Set the next active board based on the last move
		// The next board is determined by the cell position in the current board
		// If the target board already has a winner or is full, allow any board
		const nextBoardIndex = cellIndex; // The cell index becomes the next board index

		if (boardWinners[nextBoardIndex] !== null || isBoardFull(boards[nextBoardIndex])) {
			activeBoard = null;
		} else {
			activeBoard = nextBoardIndex;
		}

		// Switch player
		currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
	};

	// Reset the game
	const resetGame = (): void => {
		boards = createEmptyBoards();
		boardWinners = createEmptyBoardWinners();
		currentPlayer = 'X';
		activeBoard = null;
		winner = null;
		isDraw = false;
		lastMove = null;
	};

	// Get the current game state
	const getState = (): GameState => {
		return {
			boards,
			boardWinners,
			currentPlayer,
			activeBoard,
			winner,
			isDraw,
			lastMove
		};
	};

	return {
		makeMove,
		resetGame,
		getState
	};
}
