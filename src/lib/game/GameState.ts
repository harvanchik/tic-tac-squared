export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type BoardPosition = number | null; // Index from 0-8 for the active board
export type GameRules = 'standard' | 'free-play';
export type GameMode = 'human-vs-human' | 'human-vs-cpu' | 'online-multiplayer';
export type CpuDifficulty = 'easy' | 'moderate' | 'expert';
export type OnlineStatus = 'host' | 'guest' | null;

// Import the CPU player logic
import { CpuPlayer } from './CpuPlayer';

// win patterns for both small boards and the main board
const WIN_PATTERNS = [
	// rows
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	// columns
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	// diagonals
	[0, 4, 8],
	[2, 4, 6]
];

// represents a single 3x3 tic-tac-toe board
class Board {
	// the cells of the board in a flat array for simpler operations
	cells: CellValue[] = Array(9).fill(null);

	// convert from flat index to row/col coordinates
	static indexToCoordinates(index: number): [number, number] {
		return [Math.floor(index / 3), index % 3];
	}

	// convert from row/col to flat index
	static coordinatesToIndex(row: number, col: number): number {
		return row * 3 + col;
	}

	// get cell value using row/col coordinates
	getCell(row: number, col: number): CellValue {
		return this.cells[Board.coordinatesToIndex(row, col)];
	}

	// set cell value using flat index
	setCell(index: number, value: CellValue): void {
		this.cells[index] = value;
	}

	// check if this board has a winner
	checkWinner(): CellValue {
		for (const pattern of WIN_PATTERNS) {
			const [a, b, c] = pattern;
			if (this.cells[a] && this.cells[a] === this.cells[b] && this.cells[a] === this.cells[c]) {
				return this.cells[a];
			}
		}
		return null;
	}

	// check if board is full (all cells filled)
	isFull(): boolean {
		return this.cells.every((cell) => cell !== null);
	}

	// create a 2D representation of the board for UI rendering
	to2DArray(): CellValue[][] {
		return [
			[this.cells[0], this.cells[1], this.cells[2]],
			[this.cells[3], this.cells[4], this.cells[5]],
			[this.cells[6], this.cells[7], this.cells[8]]
		];
	}

	// reset the board to empty state
	reset(): void {
		this.cells = Array(9).fill(null);
	}
}

// move record to keep track of played moves
interface Move {
	boardIndex: number;
	cellIndex: number;
	player: Player;
}

// complete game state interface
export interface GameState {
	boards: CellValue[][][]; // [boardIndex][row][col] - 2D representation for UI
	boardWinners: CellValue[]; // Winner of each small board
	currentPlayer: Player;
	activeBoard: BoardPosition; // Which small board is active
	winner: CellValue; // Overall winner
	isDraw: boolean;
	lastMove: Move | null; // Track the last move made
	gameRules?: GameRules; // Standard or free-play
	gameMode?: GameMode; // Human vs human or human vs CPU
	cpuDifficulty?: CpuDifficulty; // Difficulty level for CPU player
	onlineStatus?: OnlineStatus; // Online status for multiplayer
}

// local storage key for saving game state
const STORAGE_KEY = 'tic-tac-squared-game-state';

// save game state to localStorage
export function saveGameState(state: GameState): void {
	if (typeof window !== 'undefined') {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch (error) {
			console.error('failed to save game state:', error);
		}
	}
}

// load game state from localStorage
export function loadGameState(): GameState | null {
	if (typeof window !== 'undefined') {
		try {
			const savedState = localStorage.getItem(STORAGE_KEY);
			if (savedState) {
				return JSON.parse(savedState);
			}
		} catch (error) {
			console.error('failed to load game state:', error);
		}
	}
	return null;
}

// clear saved game state from localStorage
export function clearSavedGameState(): void {
	if (typeof window !== 'undefined') {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (error) {
			console.error('failed to clear game state:', error);
		}
	}
}

export function createGameState(initialState?: GameState) {
	// the 9 small boards
	const smallBoards: Board[] = Array(9)
		.fill(null)
		.map(() => new Board());

	// the meta-board tracking winners of small boards
	const metaBoard = new Board();

	let currentPlayer: Player = 'X';
	let activeBoard: BoardPosition = null; // null means any board can be played
	let winner: CellValue = null;
	let isDraw: boolean = false;
	let lastMove: Move | null = null;
	let gameRules: GameRules = 'standard';
	let gameMode: GameMode = 'human-vs-human';
	let cpuDifficulty: CpuDifficulty = 'moderate'; // Default CPU difficulty
	let onlineStatus: OnlineStatus = null; // Default online status

	// initialize from existing state if provided
	if (initialState) {
		// load board states
		initialState.boards.forEach((boardData, boardIndex) => {
			boardData.forEach((row, rowIndex) => {
				row.forEach((cell, colIndex) => {
					if (cell) {
						smallBoards[boardIndex].setCell(Board.coordinatesToIndex(rowIndex, colIndex), cell);
					}
				});
			});
		});

		// load winners into meta-board
		initialState.boardWinners.forEach((winner, index) => {
			if (winner) metaBoard.setCell(index, winner);
		});

		currentPlayer = initialState.currentPlayer;
		activeBoard = initialState.activeBoard;
		winner = initialState.winner;
		isDraw = initialState.isDraw;
		lastMove = initialState.lastMove;

		// Load game settings if available
		if (initialState.gameRules) gameRules = initialState.gameRules;
		if (initialState.gameMode) gameMode = initialState.gameMode;
		if (initialState.cpuDifficulty) cpuDifficulty = initialState.cpuDifficulty;
		if (initialState.onlineStatus) onlineStatus = initialState.onlineStatus;
	}

	// check if the game is a draw
	const checkGameDraw = (): boolean => {
		// if we have a winner, it's not a draw
		if (winner) return false;

		// check if all small boards are either won or full
		for (let i = 0; i < 9; i++) {
			const boardWinner = metaBoard.cells[i];
			if (!boardWinner && !smallBoards[i].isFull()) {
				return false; // found a playable board
			}
		}

		return true; // all boards are either won or full, and no overall winner
	};

	// make a move on the specified board and cell
	const makeMove = (boardIndex: number, cellIndex: number): void => {
		// if game is over or move is invalid, do nothing
		if (winner || isDraw) return;

		// In standard mode, we enforce the active board rule
		// In free-play mode, players can move on any board at any time
		if (gameRules === 'standard' && activeBoard !== null && activeBoard !== boardIndex) return;

		const targetBoard = smallBoards[boardIndex];

		// if cell is already taken or board is won, do nothing
		if (targetBoard.cells[cellIndex] !== null || metaBoard.cells[boardIndex] !== null) return;

		// make the move
		targetBoard.setCell(cellIndex, currentPlayer);

		// track the last move
		lastMove = {
			boardIndex,
			cellIndex,
			player: currentPlayer
		};

		// check if the small board now has a winner
		const boardWinner = targetBoard.checkWinner();
		if (boardWinner) {
			metaBoard.setCell(boardIndex, boardWinner);

			// check if the overall game has a winner
			winner = metaBoard.checkWinner();
		}

		// check for draw if no winner
		if (!winner) {
			isDraw = checkGameDraw();
		}

		// Only update the active board in standard mode
		if (gameRules === 'standard') {
			// set the next active board based on the current move
			const nextBoardIndex = cellIndex;

			// if target board is won or full, allow play on any open board
			if (metaBoard.cells[nextBoardIndex] !== null || smallBoards[nextBoardIndex].isFull()) {
				activeBoard = null;
			} else {
				activeBoard = nextBoardIndex;
			}
		} else {
			// In free-play mode, players can always play on any valid board
			activeBoard = null;
		}

		// switch player
		currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
	};

	// check if a move is valid without making it
	const checkValidMove = (boardIndex: number, cellIndex: number): boolean => {
		// if game is over, move is invalid
		if (winner || isDraw) return false;

		// In standard mode, we enforce the active board rule
		// In free-play mode, players can move on any board at any time
		if (gameRules === 'standard' && activeBoard !== null && activeBoard !== boardIndex)
			return false;

		const targetBoard = smallBoards[boardIndex];

		// if cell is already taken or board is won, move is invalid
		if (targetBoard.cells[cellIndex] !== null || metaBoard.cells[boardIndex] !== null) return false;

		return true;
	};

	// Set game rules
	const setGameRules = (rules: GameRules): void => {
		gameRules = rules;
	};

	// Set game mode
	const setGameMode = (mode: GameMode): void => {
		gameMode = mode;
	};

	// Set CPU difficulty
	const setCpuDifficulty = (difficulty: CpuDifficulty): void => {
		cpuDifficulty = difficulty;
	};

	// Get CPU's move based on current board state and difficulty
	const getCpuMove = (): { boardIndex: number; cellIndex: number } | null => {
		if (winner || isDraw) return null;

		// Convert board format for CPU player
		const boardsFor3DArray = smallBoards.map((board) => board.to2DArray());

		// Get best move from CPU player algorithm
		const cpuMove = CpuPlayer.getBestMove(
			boardsFor3DArray,
			metaBoard.cells,
			activeBoard,
			currentPlayer,
			gameRules,
			cpuDifficulty
		);

		return cpuMove;
	};

	// Make CPU move if it's the CPU's turn
	const makeCpuMoveIfNeeded = (
		onThinkingStart?: () => void,
		onMoveComplete?: () => void
	): boolean => {
		// Only make CPU move if:
		// 1. Game mode is human-vs-cpu
		// 2. Current player is O (CPU plays as O)
		// 3. Game is not over
		if (gameMode === 'human-vs-cpu' && currentPlayer === 'O' && !winner && !isDraw) {
			// Signal that CPU is starting to think
			if (onThinkingStart) onThinkingStart();

			// Get the CPU's move
			const cpuMove = getCpuMove();

			if (cpuMove) {
				makeMove(cpuMove.boardIndex, cpuMove.cellIndex);

				// Signal that CPU has completed its move
				if (onMoveComplete) onMoveComplete();

				return true; // CPU made a move
			}
		}
		return false; // CPU did not make a move
	};

	// reset the game state
	const resetGame = (options?: { rules?: GameRules; mode?: GameMode }): void => {
		smallBoards.forEach((board) => board.reset());
		metaBoard.reset();
		currentPlayer = 'X';
		activeBoard = null;
		winner = null;
		isDraw = false;
		lastMove = null;

		// Update game settings if provided
		if (options?.rules) {
			gameRules = options.rules;
		}
		if (options?.mode) {
			gameMode = options.mode;
		}

		// clear saved game
		clearSavedGameState();
	};

	// construct the current game state for UI
	const getState = (): GameState => {
		return {
			// convert each small board to 2D array for UI
			boards: smallBoards.map((board) => board.to2DArray()),
			boardWinners: metaBoard.cells,
			currentPlayer,
			activeBoard,
			winner,
			isDraw,
			lastMove,
			gameRules,
			gameMode,
			cpuDifficulty,
			onlineStatus
		};
	};

	// save current state to localStorage
	const saveState = (): void => {
		saveGameState(getState());
	};

	// update internal state after a move and save to localStorage
	const makeMoveAndSave = (boardIndex: number, cellIndex: number): void => {
		makeMove(boardIndex, cellIndex);
		saveState();

		// NOTE: We're removing the automatic CPU move from here
		// CPU moves are now explicitly handled in BigBoard.svelte with the thinking delay
	};

	return {
		makeMove: makeMoveAndSave,
		resetGame,
		getState,
		saveState,
		setGameRules,
		setGameMode,
		setCpuDifficulty,
		makeCpuMoveIfNeeded,
		checkValidMove
	};
}
