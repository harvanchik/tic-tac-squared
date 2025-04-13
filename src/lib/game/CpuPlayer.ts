import type { CellValue, GameRules, Player } from './GameState';

// Type definition for difficulty levels
export type CpuDifficulty = 'easy' | 'moderate' | 'expert';

// Interface for a valid move
export interface Move {
	boardIndex: number;
	cellIndex: number;
	score?: number; // For minimax algorithm scoring
}

// Board state representation for AI evaluation
interface BoardState {
	smallBoards: CellValue[][][]; // 3D array of all boards
	boardWinners: CellValue[]; // Winner state of each small board
	currentPlayer: Player;
	activeBoard: number | null; // Which board is active (null means any)
	gameRules: GameRules;
}

/**
 * CpuPlayer class handles AI moves at different difficulty levels
 */
export class CpuPlayer {
	/**
	 * Get the best move for the CPU based on the selected difficulty
	 */
	static getBestMove(
		smallBoards: CellValue[][][],
		boardWinners: CellValue[],
		activeBoard: number | null,
		currentPlayer: Player,
		gameRules: GameRules,
		difficulty: CpuDifficulty
	): Move | null {
		const state: BoardState = {
			smallBoards,
			boardWinners,
			currentPlayer,
			activeBoard,
			gameRules
		};

		// Call appropriate algorithm based on difficulty
		switch (difficulty) {
			case 'easy':
				return this.getEasyMove(state);
			case 'moderate':
				return this.getModerateMove(state);
			case 'expert':
				return this.getExpertMove(state);
			default:
				return this.getEasyMove(state);
		}
	}

	/**
	 * Easy difficulty - Mostly random with slight intention to win
	 * Will occasionally make smart moves but mostly plays randomly
	 */
	private static getEasyMove(state: BoardState): Move | null {
		// Get all valid moves
		const validMoves = this.getValidMoves(state);
		if (validMoves.length === 0) return null;

		// 20% chance to make a winning move if available
		if (Math.random() < 0.2) {
			const winningMove = this.findWinningMove(state, validMoves);
			if (winningMove) return winningMove;
		}

		// 15% chance to block opponent's winning move
		if (Math.random() < 0.15) {
			const blockingMove = this.findBlockingMove(state, validMoves);
			if (blockingMove) return blockingMove;
		}

		// Otherwise make a random move
		return validMoves[Math.floor(Math.random() * validMoves.length)];
	}

	/**
	 * Moderate difficulty - Balanced strategy
	 * Will make smart moves most of the time but occasionally makes suboptimal choices
	 */
	private static getModerateMove(state: BoardState): Move | null {
		// Get all valid moves
		const validMoves = this.getValidMoves(state);
		if (validMoves.length === 0) return null;

		// 75% chance to make a winning move if available
		if (Math.random() < 0.75) {
			const winningMove = this.findWinningMove(state, validMoves);
			if (winningMove) return winningMove;
		}

		// 65% chance to block opponent's winning move
		if (Math.random() < 0.65) {
			const blockingMove = this.findBlockingMove(state, validMoves);
			if (blockingMove) return blockingMove;
		}

		// 50% chance to make a strategic move (center or corners)
		if (Math.random() < 0.5) {
			const strategicMove = this.findStrategicMove(state, validMoves);
			if (strategicMove) return strategicMove;
		}

		// 25% chance to use a simplified minimax for a good move
		if (Math.random() < 0.25) {
			const minMaxMove = this.findMinimaxMove(state, validMoves, 2); // Limited depth
			if (minMaxMove) return minMaxMove;
		}

		// Otherwise make a random move
		return validMoves[Math.floor(Math.random() * validMoves.length)];
	}

	/**
	 * Expert difficulty - Optimal strategy
	 * Always makes the best possible move using minimax algorithm with look-ahead
	 */
	private static getExpertMove(state: BoardState): Move | null {
		// Get all valid moves
		const validMoves = this.getValidMoves(state);
		if (validMoves.length === 0) return null;

		// HIGHEST PRIORITY: Check for moves that would win the entire game
		const gameWinningMove = this.findGameWinningMove(state, validMoves);
		if (gameWinningMove) return gameWinningMove;

		// SECOND PRIORITY: Block opponent from making a game-winning move
		const gameBlockingMove = this.findGameBlockingMove(state, validMoves);
		if (gameBlockingMove) return gameBlockingMove;

		// THIRD PRIORITY: Find moves that win a small board (prioritizing strategic boards)
		const strategicWinningMove = this.findStrategicWinningMove(state, validMoves);
		if (strategicWinningMove) return strategicWinningMove;

		// FOURTH PRIORITY: Block opponent from winning a small board
		const blockingMove = this.findBlockingMove(state, validMoves);
		if (blockingMove) return blockingMove;

		// Use full minimax with alpha-beta pruning for optimal moves
		const bestMove = this.findMinimaxMove(state, validMoves, 4); // Deeper look-ahead
		if (bestMove) return bestMove;

		// If minimax fails (rare), use strategic move as fallback
		const strategicMove = this.findStrategicMove(state, validMoves);
		if (strategicMove) return strategicMove;

		// Last resort: random valid move (should rarely happen)
		return validMoves[Math.floor(Math.random() * validMoves.length)];
	}

	/**
	 * Find a move that would win the entire game (meta-board win)
	 */
	private static findGameWinningMove(state: BoardState, validMoves: Move[]): Move | null {
		const { smallBoards, boardWinners, currentPlayer } = state;

		// For each valid move
		for (const move of validMoves) {
			// Skip if this small board is already decided
			if (boardWinners[move.boardIndex] !== null) continue;

			// Extract row and column from cell index
			const row = Math.floor(move.cellIndex / 3);
			const col = move.cellIndex % 3;

			// Make a deep copy of the board
			const boardCopy = smallBoards[move.boardIndex].map((row) => [...row]);
			boardCopy[row][col] = currentPlayer;

			// Check if this move wins the small board
			if (!this.checkWinOnBoard(boardCopy, currentPlayer)) continue;

			// If it wins the small board, check if that creates a meta-board win
			const metaBoardCopy = [...boardWinners];
			metaBoardCopy[move.boardIndex] = currentPlayer;

			// Check each win pattern for the meta-board
			for (const pattern of [
				[0, 1, 2],
				[3, 4, 5],
				[6, 7, 8], // rows
				[0, 3, 6],
				[1, 4, 7],
				[2, 5, 8], // columns
				[0, 4, 8],
				[2, 4, 6] // diagonals
			]) {
				const [a, b, c] = pattern;
				// If this win pattern contains our move's board index
				if ([a, b, c].includes(move.boardIndex)) {
					// Check if placing our mark would complete a winning pattern
					const values = [metaBoardCopy[a], metaBoardCopy[b], metaBoardCopy[c]];
					if (values.filter((v) => v === currentPlayer).length === 3) {
						// This move would win the entire game!
						return move;
					}
				}
			}
		}

		return null;
	}

	/**
	 * Find a move that would block the opponent from winning the entire game
	 */
	private static findGameBlockingMove(state: BoardState, validMoves: Move[]): Move | null {
		const { smallBoards, boardWinners, currentPlayer } = state;
		const opponent = currentPlayer === 'X' ? 'O' : 'X';

		// For each valid move
		for (const move of validMoves) {
			// If this move could win a small board
			const row = Math.floor(move.cellIndex / 3);
			const col = move.cellIndex % 3;

			// Check if this small board is critical for blocking an opponent's meta-win
			// First, see if opponent has two boards in any winning pattern
			const potentialBlockingBoards = new Set<number>();

			// Check each win pattern for the meta-board
			for (const pattern of [
				[0, 1, 2],
				[3, 4, 5],
				[6, 7, 8], // rows
				[0, 3, 6],
				[1, 4, 7],
				[2, 5, 8], // columns
				[0, 4, 8],
				[2, 4, 6] // diagonals
			]) {
				const [a, b, c] = pattern;
				const values = [boardWinners[a], boardWinners[b], boardWinners[c]];

				// If opponent has two boards and the third is empty
				if (
					values.filter((v) => v === opponent).length === 2 &&
					values.filter((v) => v === null).length === 1
				) {
					// Find the empty board in this pattern
					if (boardWinners[a] === null) potentialBlockingBoards.add(a);
					if (boardWinners[b] === null) potentialBlockingBoards.add(b);
					if (boardWinners[c] === null) potentialBlockingBoards.add(c);
				}
			}

			// If this move is on a board that needs to be blocked
			if (potentialBlockingBoards.has(move.boardIndex)) {
				// Make a deep copy of the board
				const boardCopy = smallBoards[move.boardIndex].map((row) => [...row]);
				boardCopy[row][col] = currentPlayer;

				// If this move prevents opponent from winning this board
				// Check all possible moves the opponent could make on this board
				let canOpponentWinBoard = false;

				for (let r = 0; r < 3; r++) {
					for (let c = 0; c < 3; c++) {
						// Skip cells that are already filled
						if (boardCopy[r][c] !== null) continue;

						// Try opponent move here
						const testBoardCopy = boardCopy.map((row) => [...row]);
						testBoardCopy[r][c] = opponent;

						// If opponent can win with this move
						if (this.checkWinOnBoard(testBoardCopy, opponent)) {
							canOpponentWinBoard = true;
							break;
						}
					}
					if (canOpponentWinBoard) break;
				}

				// If this move prevents opponent from winning a critical board
				if (!canOpponentWinBoard) {
					return move;
				}
			}
		}

		return null;
	}

	/**
	 * Get all valid moves in the current board state
	 */
	private static getValidMoves(state: BoardState): Move[] {
		const validMoves: Move[] = [];
		const { smallBoards, boardWinners, activeBoard, gameRules } = state;

		// Determine which boards we can play on
		const playableBoards: number[] = [];

		if (activeBoard !== null && gameRules === 'standard') {
			// If board is active and not won, we can only play there
			if (!boardWinners[activeBoard]) {
				playableBoards.push(activeBoard);
			} else {
				// If the active board is won, we can play on any unwon board
				for (let i = 0; i < 9; i++) {
					if (!boardWinners[i]) {
						playableBoards.push(i);
					}
				}
			}
		} else {
			// In free-play mode or when activeBoard is null, we can play on any unwon board
			for (let i = 0; i < 9; i++) {
				if (!boardWinners[i]) {
					playableBoards.push(i);
				}
			}
		}

		// For each playable board, find empty cells
		for (const boardIndex of playableBoards) {
			const board = smallBoards[boardIndex];
			for (let row = 0; row < 3; row++) {
				for (let col = 0; col < 3; col++) {
					if (board[row][col] === null) {
						const cellIndex = row * 3 + col;
						validMoves.push({ boardIndex, cellIndex });
					}
				}
			}
		}

		return validMoves;
	}

	/**
	 * Find a move that would win a small board
	 */
	private static findWinningMove(state: BoardState, validMoves: Move[]): Move | null {
		const { smallBoards, currentPlayer } = state;

		// Check each valid move to see if it creates a win on its small board
		for (const move of validMoves) {
			const board = smallBoards[move.boardIndex];
			const row = Math.floor(move.cellIndex / 3);
			const col = move.cellIndex % 3;

			// Skip if cell is already taken
			if (board[row][col] !== null) continue;

			// Create a copy of the board to simulate the move
			const boardCopy = board.map((row) => [...row]);
			boardCopy[row][col] = currentPlayer;

			// Check if this move would win the board
			if (this.checkWinOnBoard(boardCopy, currentPlayer)) {
				return move;
			}
		}

		return null;
	}

	/**
	 * Find a move that blocks the opponent from winning a small board
	 */
	private static findBlockingMove(state: BoardState, validMoves: Move[]): Move | null {
		const { smallBoards, currentPlayer } = state;
		const opponent = currentPlayer === 'X' ? 'O' : 'X';

		// Check each valid move to see if the opponent could win on the next turn
		for (const move of validMoves) {
			const board = smallBoards[move.boardIndex];

			// For each cell in this board, check if opponent can win by placing there
			for (let row = 0; row < 3; row++) {
				for (let col = 0; col < 3; col++) {
					const cellIndex = row * 3 + col;

					// Skip if cell is not empty
					if (board[row][col] !== null) continue;

					// Create a copy of the board and simulate opponent's move
					const boardCopy = board.map((row) => [...row]);
					boardCopy[row][col] = opponent;

					// If opponent would win, block this cell
					if (this.checkWinOnBoard(boardCopy, opponent)) {
						return { boardIndex: move.boardIndex, cellIndex };
					}
				}
			}
		}

		return null;
	}

	/**
	 * Find a strategic move (center or corners if available)
	 * Priorities:
	 * 1. Center board (highest priority)
	 * 2. Corner boards (second priority)
	 * 3. Other boards (lowest priority)
	 * Within each board, prioritize the center cell, then corners
	 */
	private static findStrategicMove(state: BoardState, validMoves: Move[]): Move | null {
		// Strategic cells in order of priority (center, corners, then edges)
		const strategicCells = [4, 0, 2, 6, 8, 1, 3, 5, 7];

		// Board priority (center board, corner boards, then edge boards)
		const boardPriority = [4, 0, 2, 6, 8, 1, 3, 5, 7];

		// First try to play in the center board if possible (highest priority)
		const centerBoardMoves = validMoves.filter((move) => move.boardIndex === 4);

		if (centerBoardMoves.length > 0) {
			// In the center board, try to play in strategic cells
			for (const cellIndex of strategicCells) {
				const move = centerBoardMoves.find((m) => m.cellIndex === cellIndex);
				if (move) return move;
			}
		}

		// If center board isn't available, try to play in corner boards
		const cornerBoardMoves = validMoves.filter((move) => [0, 2, 6, 8].includes(move.boardIndex));

		if (cornerBoardMoves.length > 0) {
			// In corner boards, prioritize the center cell
			const centerCellMove = cornerBoardMoves.find((move) => move.cellIndex === 4);
			if (centerCellMove) return centerCellMove;

			// Then try other strategic cells
			for (const cellIndex of strategicCells) {
				const move = cornerBoardMoves.find((m) => m.cellIndex === cellIndex);
				if (move) return move;
			}
		}

		// If no strategic moves in preferred boards, try any board
		// following the board priority order
		for (const boardIndex of boardPriority) {
			const boardMoves = validMoves.filter((move) => move.boardIndex === boardIndex);
			if (boardMoves.length > 0) {
				for (const cellIndex of strategicCells) {
					const move = boardMoves.find((m) => m.cellIndex === cellIndex);
					if (move) return move;
				}
			}
		}

		return null;
	}

	/**
	 * Find a move that would win a small board, prioritizing strategically important boards
	 * Priorities: center board > corner boards > edge boards
	 */
	private static findStrategicWinningMove(state: BoardState, validMoves: Move[]): Move | null {
		const { smallBoards, currentPlayer } = state;

		// Board priority (center board, corner boards, then edge boards)
		const boardPriority = [
			4, // Center board (highest priority)
			0,
			2,
			6,
			8, // Corner boards (second priority)
			1,
			3,
			5,
			7 // Edge boards (lowest priority)
		];

		// For each board in priority order
		for (const boardIndex of boardPriority) {
			// Filter moves for this board
			const boardMoves = validMoves.filter((move) => move.boardIndex === boardIndex);
			if (boardMoves.length === 0) continue;

			// Check if any move can win this board
			for (const move of boardMoves) {
				const board = smallBoards[move.boardIndex];
				const row = Math.floor(move.cellIndex / 3);
				const col = move.cellIndex % 3;

				// Skip if cell is already taken
				if (board[row][col] !== null) continue;

				// Create a copy of the board to simulate the move
				const boardCopy = board.map((row) => [...row]);
				boardCopy[row][col] = currentPlayer;

				// Check if this move would win the board
				if (this.checkWinOnBoard(boardCopy, currentPlayer)) {
					return move;
				}
			}
		}

		// If no strategic winning move found, fallback to any winning move
		return this.findWinningMove(state, validMoves);
	}

	/**
	 * Use minimax algorithm to find best move with limited depth
	 */
	private static findMinimaxMove(
		state: BoardState,
		validMoves: Move[],
		depth: number
	): Move | null {
		if (validMoves.length === 0) return null;

		let bestScore = -Infinity;
		let bestMove: Move | null = null;

		for (const move of validMoves) {
			// Create a deep copy of the state to simulate moves
			const newState = this.simulateMove(state, move);

			// Evaluate this move
			const score = this.minimax(newState, depth - 1, false, -Infinity, Infinity);

			// Update best move if this is better
			if (score > bestScore) {
				bestScore = score;
				bestMove = move;
			}
		}

		return bestMove;
	}

	/**
	 * Minimax algorithm with alpha-beta pruning
	 */
	private static minimax(
		state: BoardState,
		depth: number,
		isMaximizing: boolean,
		alpha: number,
		beta: number
	): number {
		// Terminal conditions: depth reached or game over
		if (depth === 0) {
			return this.evaluateBoard(state);
		}

		const validMoves = this.getValidMoves(state);

		// No more valid moves
		if (validMoves.length === 0) {
			return this.evaluateBoard(state);
		}

		if (isMaximizing) {
			let maxScore = -Infinity;

			// Simulate each move and find the best score
			for (const move of validMoves) {
				const newState = this.simulateMove(state, move);
				const score = this.minimax(newState, depth - 1, false, alpha, beta);
				maxScore = Math.max(maxScore, score);

				// Alpha-beta pruning
				alpha = Math.max(alpha, score);
				if (beta <= alpha) break;
			}

			return maxScore;
		} else {
			let minScore = Infinity;

			// Simulate each move and find the worst score
			for (const move of validMoves) {
				const newState = this.simulateMove(state, move);
				const score = this.minimax(newState, depth - 1, true, alpha, beta);
				minScore = Math.min(minScore, score);

				// Alpha-beta pruning
				beta = Math.min(beta, score);
				if (beta <= alpha) break;
			}

			return minScore;
		}
	}

	/**
	 * Evaluate the current board state and return a score
	 * Higher score is better for the current player
	 */
	private static evaluateBoard(state: BoardState): number {
		const { boardWinners, smallBoards, currentPlayer } = state;
		const opponent = currentPlayer === 'X' ? 'O' : 'X';
		let score = 0;

		// Highest priority - Check for game-winning patterns on the meta-board
		for (const pattern of [
			[0, 1, 2],
			[3, 4, 5],
			[6, 7, 8], // rows
			[0, 3, 6],
			[1, 4, 7],
			[2, 5, 8], // columns
			[0, 4, 8],
			[2, 4, 6] // diagonals
		]) {
			const [a, b, c] = pattern;
			const patternValues = [boardWinners[a], boardWinners[b], boardWinners[c]];

			// Count player's and opponent's positions in this pattern
			const playerCount = patternValues.filter((v) => v === currentPlayer).length;
			const opponentCount = patternValues.filter((v) => v === opponent).length;

			// Add score based on pattern control
			if (playerCount === 3) {
				// Player has won the game - highest possible score
				return 10000;
			} else if (opponentCount === 3) {
				// Opponent has won the game - lowest possible score
				return -10000;
			} else if (playerCount === 2 && opponentCount === 0) {
				// Player has a winning opportunity
				score += 500;

				// Extra points if the pattern includes the center board
				if ([a, b, c].includes(4)) {
					score += 100;
				}
			} else if (opponentCount === 2 && playerCount === 0) {
				// Opponent has a winning opportunity - critical to block
				score -= 700;

				// Even more critical if the pattern includes the center board
				if ([a, b, c].includes(4)) {
					score -= 200;
				}
			} else if (playerCount === 1 && opponentCount === 0) {
				// Player has started a pattern
				score += 50;

				// Extra points if the pattern includes the center board
				if ([a, b, c].includes(4)) {
					score += 25;
				}
			} else if (opponentCount === 1 && playerCount === 0) {
				// Opponent has started a pattern
				score -= 40;

				// Extra penalty if the pattern includes the center board
				if ([a, b, c].includes(4)) {
					score -= 20;
				}
			}
		}

		// Board value weights by position (center > corners > edges)
		const boardValueWeights = {
			4: 3.0, // Center board (highest value)
			0: 2.0,
			2: 2.0,
			6: 2.0,
			8: 2.0, // Corner boards (high value)
			1: 1.0,
			3: 1.0,
			5: 1.0,
			7: 1.0 // Edge boards (lowest value)
		};

		// Evaluate each small board
		for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
			// Apply board position weight
			const boardWeight = boardValueWeights[boardIndex as keyof typeof boardValueWeights];

			// Check if board is already won
			if (boardWinners[boardIndex]) {
				// Adjust score based on who won this board and its strategic value
				if (boardWinners[boardIndex] === currentPlayer) {
					score += 100 * boardWeight;
				} else {
					score -= 100 * boardWeight;
				}
				continue;
			}

			const board = smallBoards[boardIndex];
			let boardScore = 0;

			// Check each win pattern in this small board
			for (const pattern of [
				[0, 1, 2],
				[3, 4, 5],
				[6, 7, 8], // rows
				[0, 3, 6],
				[1, 4, 7],
				[2, 5, 8], // columns
				[0, 4, 8],
				[2, 4, 6] // diagonals
			]) {
				const [a, b, c] = pattern;
				const [aRow, aCol] = [Math.floor(a / 3), a % 3];
				const [bRow, bCol] = [Math.floor(b / 3), b % 3];
				const [cRow, cCol] = [Math.floor(c / 3), c % 3];

				const patternValues = [board[aRow][aCol], board[bRow][bCol], board[cRow][cCol]];

				// Count player's and opponent's positions in this pattern
				const playerCount = patternValues.filter((v) => v === currentPlayer).length;
				const opponentCount = patternValues.filter((v) => v === opponent).length;

				// Add score based on small board pattern control
				if (playerCount === 2 && opponentCount === 0) {
					// Player has a winning opportunity in this board
					boardScore += 10;
				} else if (opponentCount === 2 && playerCount === 0) {
					// Block opponent's winning opportunity in this board
					boardScore -= 12; // Slightly higher priority for blocking
				} else if (playerCount === 1 && opponentCount === 0) {
					// Player has started a pattern in this board
					boardScore += 3;
				} else if (opponentCount === 1 && playerCount === 0) {
					// Opponent has started a pattern in this board
					boardScore -= 2;
				}
			}

			// Apply the board's strategic weight to its score
			score += boardScore * boardWeight;

			// Additional points for controlling the center cell (index 4) of any board
			const centerCellRow = 1;
			const centerCellCol = 1;
			if (board[centerCellRow][centerCellCol] === currentPlayer) {
				score += 5 * boardWeight;
			} else if (board[centerCellRow][centerCellCol] === opponent) {
				score -= 5 * boardWeight;
			}
		}

		// Special bonus for the center board's center cell (most strategic position)
		const centerOfCenter = smallBoards[4][1][1];
		if (centerOfCenter === currentPlayer) {
			score += 15;
		} else if (centerOfCenter === opponent) {
			score -= 15;
		}

		return score;
	}

	/**
	 * Simulate a move and return the new state
	 */
	private static simulateMove(state: BoardState, move: Move): BoardState {
		const { smallBoards, boardWinners, currentPlayer, gameRules } = state;

		// Deep copy the state
		const newSmallBoards = smallBoards.map((board) => board.map((row) => [...row]));
		const newBoardWinners = [...boardWinners];

		// Apply the move
		const { boardIndex, cellIndex } = move;
		const row = Math.floor(cellIndex / 3);
		const col = cellIndex % 3;

		newSmallBoards[boardIndex][row][col] = currentPlayer;

		// Check if this move wins the small board
		if (this.checkWinOnBoard(newSmallBoards[boardIndex], currentPlayer)) {
			newBoardWinners[boardIndex] = currentPlayer;
		}

		// Calculate new active board
		let newActiveBoard: number | null = null;

		if (gameRules === 'standard') {
			// In standard mode, next active board is determined by cell index
			if (newBoardWinners[cellIndex] !== null || this.isBoardFull(newSmallBoards[cellIndex])) {
				// If the target board is already won or full, any board is valid
				newActiveBoard = null;
			} else {
				newActiveBoard = cellIndex;
			}
		} else {
			// In free-play mode, any board is valid
			newActiveBoard = null;
		}

		// Switch player
		const newCurrentPlayer = currentPlayer === 'X' ? 'O' : 'X';

		return {
			smallBoards: newSmallBoards,
			boardWinners: newBoardWinners,
			currentPlayer: newCurrentPlayer,
			activeBoard: newActiveBoard,
			gameRules
		};
	}

	/**
	 * Check if a player has won on a specific board
	 */
	private static checkWinOnBoard(board: CellValue[][], player: Player): boolean {
		// Check rows, columns, and diagonals
		const winPatterns = [
			// Rows
			[
				[0, 0],
				[0, 1],
				[0, 2]
			],
			[
				[1, 0],
				[1, 1],
				[1, 2]
			],
			[
				[2, 0],
				[2, 1],
				[2, 2]
			],
			// Columns
			[
				[0, 0],
				[1, 0],
				[2, 0]
			],
			[
				[0, 1],
				[1, 1],
				[2, 1]
			],
			[
				[0, 2],
				[1, 2],
				[2, 2]
			],
			// Diagonals
			[
				[0, 0],
				[1, 1],
				[2, 2]
			],
			[
				[0, 2],
				[1, 1],
				[2, 0]
			]
		];

		for (const pattern of winPatterns) {
			const [a, b, c] = pattern;
			if (
				board[a[0]][a[1]] === player &&
				board[b[0]][b[1]] === player &&
				board[c[0]][c[1]] === player
			) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if a board is full (all cells filled)
	 */
	private static isBoardFull(board: CellValue[][]): boolean {
		for (let row = 0; row < 3; row++) {
			for (let col = 0; col < 3; col++) {
				if (board[row][col] === null) {
					return false;
				}
			}
		}
		return true;
	}
}
