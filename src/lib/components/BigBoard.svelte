<script lang="ts">
	import SmallBoard from './SmallBoard.svelte';
	import { createGameState, loadGameState, type GameState } from '../game/GameState';
	import { OnlinePlayer, type ConnectionStatus } from '../game/OnlinePlayer';
	import { onMount } from 'svelte';
	import Fa from 'svelte-fa';
	import {
		faXmark,
		faO,
		faUser,
		faCircleInfo,
		faGear,
		faRotate,
		faTrophy,
		faEye,
		faTimes,
		faRobot,
		faBrain,
		faSpinner,
		faGlobe,
		faCopy,
		faCheck,
		faAngleRight,
		faRightFromBracket,
		faClock,
		faPause
	} from '@fortawesome/free-solid-svg-icons';

	// Constants for localStorage keys
	const GAME_STORAGE_KEY = 'tic-tac-squared-game-state'; // This matches the key in GameState.ts
	const SETTINGS_MODAL_KEY = 'tic-tac-squared-settings-modal';
	const HOW_TO_PLAY_MODAL_KEY = 'tic-tac-squared-how-to-play-modal';
	const GAME_MODE_KEY = 'tic-tac-squared-game-mode';
	const CPU_DIFFICULTY_KEY = 'tic-tac-squared-cpu-difficulty';
	const GAME_RULES_KEY = 'tic-tac-squared-game-rules';

	// Create a default empty game state to avoid undefined errors during SSR
	const createEmptyBoards = () => {
		return Array(9)
			.fill(null)
			.map(() =>
				Array(3)
					.fill(null)
					.map(() => Array(3).fill(null))
			);
	};

	const createEmptyBoardWinners = () => {
		return Array(9).fill(null);
	};

	// Initialize with default empty state to prevent SSR errors
	let game = createGameState();
	let gameState = $state<GameState>({
		boards: createEmptyBoards(),
		boardWinners: createEmptyBoardWinners(),
		currentPlayer: 'X',
		activeBoard: null,
		winner: null,
		isDraw: false,
		lastMove: null
	});

	let isInitialized = $state(false);
	// track if we should show the victory overlay or not
	let showVictoryOverlay = $state(false);
	// Track when CPU is thinking
	let isCpuThinking = $state(false);
	// Track if the entire board should be disabled (game over, forfeit, disconnection)
	let boardDisabled = $state(false);
	// Track if it's the first move of the game
	let isFirstMove = $state(true);

	// Turn timer state variables
	const TURN_TIME_LIMIT = 20; // 20 seconds per turn
	let turnTimeRemaining = $state(TURN_TIME_LIMIT);
	let opponentTimeRemaining = $state(TURN_TIME_LIMIT); // Track opponent's time remaining
	let timerInterval: ReturnType<typeof setInterval> | null = $state(null);
	let isTimerActive = $state(false);

	// Settings state variables
	let showSettingsModal = $state(false);
	let showHowToPlayModal = $state(false);
	let gameMode = $state<'human-vs-human' | 'human-vs-cpu' | 'online-multiplayer'>('human-vs-human');
	let gameRules = $state<'standard' | 'free-play'>('standard');
	let cpuDifficulty = $state<'easy' | 'moderate' | 'expert'>('moderate');

	// Online multiplayer state variables
	let onlinePlayer: OnlinePlayer | null = $state(null);
	let connectionStatus = $state<ConnectionStatus>('disconnected');
	let gameCode = $state('');
	let enteredGameCode = $state('');
	let showGameCodeInput = $state(false);
	let isCodeCopied = $state(false);
	let connectionError = $state('');
	let isWaitingForOpponent = $state(false);

	// For tracking if the user intentionally forfeited to prevent showing disconnect message
	let userForfeited = $state(false);

	// For tracking when a user is attempting to join a game
	let isJoiningGame = $state(false);

	// Function to save modal states to localStorage
	function saveModalState(modalType: 'settings' | 'howToPlay', isOpen: boolean) {
		if (typeof window !== 'undefined') {
			try {
				const key = modalType === 'settings' ? SETTINGS_MODAL_KEY : HOW_TO_PLAY_MODAL_KEY;
				localStorage.setItem(key, JSON.stringify({ isOpen }));
			} catch (error) {
				console.error('Failed to save modal state:', error);
			}
		}
	}

	// Function to load modal states from localStorage
	function loadModalState(modalType: 'settings' | 'howToPlay'): boolean {
		if (typeof window !== 'undefined') {
			try {
				const key = modalType === 'settings' ? SETTINGS_MODAL_KEY : HOW_TO_PLAY_MODAL_KEY;
				const savedState = localStorage.getItem(key);
				if (savedState) {
					const parsed = JSON.parse(savedState);
					return parsed.isOpen;
				}
			} catch (error) {
				console.error('Failed to load modal state:', error);
			}
		}
		return false;
	}

	// Function to save game settings to localStorage
	function saveGameSettings() {
		if (typeof window !== 'undefined') {
			try {
				// Save game mode
				localStorage.setItem(GAME_MODE_KEY, gameMode);

				// Save CPU difficulty
				localStorage.setItem(CPU_DIFFICULTY_KEY, cpuDifficulty);

				// Save game rules
				localStorage.setItem(GAME_RULES_KEY, gameRules);

				console.log('[BigBoard] Game settings saved to localStorage');
			} catch (error) {
				console.error('Failed to save game settings:', error);
			}
		}
	}

	// Function to load game settings from localStorage
	function loadGameSettings() {
		if (typeof window !== 'undefined') {
			try {
				// Load game mode
				const savedGameMode = localStorage.getItem(GAME_MODE_KEY);
				if (savedGameMode) {
					gameMode = savedGameMode as 'human-vs-human' | 'human-vs-cpu' | 'online-multiplayer';
				}

				// Load CPU difficulty
				const savedCpuDifficulty = localStorage.getItem(CPU_DIFFICULTY_KEY);
				if (savedCpuDifficulty) {
					cpuDifficulty = savedCpuDifficulty as 'easy' | 'moderate' | 'expert';
				}

				// Load game rules
				const savedGameRules = localStorage.getItem(GAME_RULES_KEY);
				if (savedGameRules) {
					gameRules = savedGameRules as 'standard' | 'free-play';
				}

				console.log('[BigBoard] Game settings loaded from localStorage');
			} catch (error) {
				console.error('Failed to load game settings:', error);
			}
		}
	}

	// Initialize OnlinePlayer with callbacks
	function initializeOnlinePlayer() {
		onlinePlayer = new OnlinePlayer({
			onStatusChange: (status, error) => {
				console.log(
					`[BigBoard] Connection status changed: ${status}`,
					error ? `Error: ${error}` : ''
				);
				connectionStatus = status;
				if (error) {
					connectionError = error;
				}

				// Update UI based on connection status
				if (status === 'waiting') {
					isWaitingForOpponent = true;
				} else if (status === 'connected') {
					// Don't hide waiting indicator yet, wait for game-start message
					console.log('[BigBoard] Connected to peer, awaiting game start');
				} else if (status === 'disconnected' || status === 'error') {
					isWaitingForOpponent = false;
				}
			},
			onRemoteMove: (boardIndex, cellIndex) => {
				console.log(`[BigBoard] Received remote move: board ${boardIndex}, cell ${cellIndex}`);

				// Check if this is the first move of the game
				const wasFirstMove = isFirstMove;

				// If it was the first move, update the flag
				if (isFirstMove) {
					isFirstMove = false;
				}

				// Make the remote player's move on the local board
				game.makeMove(boardIndex, cellIndex);
				gameState = game.getState();

				console.log(`[BigBoard] After remote move, current player is: ${gameState.currentPlayer}`);
				console.log(`[BigBoard] Local player is: ${onlinePlayer?.getLocalPlayer()}`);
				console.log(
					`[BigBoard] Is local turn: ${onlinePlayer?.isLocalPlayerTurn(gameState.currentPlayer)}`
				);

				// Check for victory
				if (gameState.winner) {
					showVictoryOverlay = true;
				} else if (onlinePlayer?.isLocalPlayerTurn(gameState.currentPlayer)) {
					// After receiving a remote move, if it's now the local player's turn, start the timer
					console.log('[BigBoard] Starting timer after remote move');
					// If this was the first move of the game, we need to force the timer to start now
					startTurnTimer();
				}
			},
			onRemoteSettings: (rules) => {
				// Only update the game rule if this player is the guest
				if (onlinePlayer && onlinePlayer.getRole() === 'guest') {
					gameRules = rules;
					if (game) game.setGameRules(rules);
					gameState = game.getState();
				}
			},
			onGameStart: () => {
				// Game is ready to start - both players are connected
				// Always set the game rule to the current (host's) rule for both players
				if (game) game.setGameRules(gameRules);
				gameState = game.getState();
				// ...existing code...
				isWaitingForOpponent = false;
				showSettingsModal = false;
				if (onlinePlayer) {
					const role = onlinePlayer.getRole();
					const localPlayer = onlinePlayer.getLocalPlayer();
					// ...existing code...
					isFirstMove = true;
					if (onlinePlayer.isLocalPlayerTurn(gameState.currentPlayer)) {
						startTurnTimer();
					}
				}
			},
			onPlayerDisconnect: (reason) => {
				// Handle opponent disconnection (forfeit or lost connection)
				if (reason === 'forfeit') {
					console.log('[BigBoard] Opponent intentionally forfeited the game');
					game.setDisconnectReason('forfeit');
				} else {
					console.log('[BigBoard] Opponent lost connection');
					game.setDisconnectReason('connection-lost');
				}

				// Store current settings
				const previousRules = gameRules;
				const previousMode = gameMode; // Keep current game mode (online-multiplayer)
				const previousDifficulty = cpuDifficulty;

				if (connectionStatus === 'connected') {
					// Set victory for local player if game was in progress
					showVictoryOverlay = true;

					// DO NOT reset the game board for the player who wins via forfeit
					// Just update the connection state

					// Reset connection-related state
					connectionStatus = 'disconnected';
					if (onlinePlayer) {
						onlinePlayer = null;
					}

					// Clear game code and code input state to reset join interface
					gameCode = '';
					enteredGameCode = '';
					showGameCodeInput = false;

					// Update game state to reflect changes
					gameState = game.getState();
				}
			},
			onRemoteTimer: (timeRemaining, forPlayer) => {
				// Update opponent's time remaining
				console.log(`[BigBoard] Received timer update: ${timeRemaining}s for player ${forPlayer}`);
				if (onlinePlayer && !onlinePlayer.isLocalPlayerTurn(gameState.currentPlayer)) {
					opponentTimeRemaining = timeRemaining;
				}
			}
		});
	}

	// Create a new online game as host
	async function createOnlineGame() {
		if (!onlinePlayer) {
			initializeOnlinePlayer();
		}

		// Ensure the host's selected rule is set in OnlinePlayer before creating the game
		if (onlinePlayer) {
			onlinePlayer.setCurrentGameRules(gameRules);
		}

		try {
			connectionStatus = 'connecting';
			connectionError = '';

			// Create a new game and get the game code
			gameCode = await onlinePlayer!.createGame();

			// Reset game state for a fresh start
			game.resetGame({
				rules: gameRules,
				mode: 'online-multiplayer'
			});
			gameState = game.getState();

			gameRules = gameRules; // lock in the selected rule
			if (game) game.setGameRules(gameRules);
			if (onlinePlayer) {
				onlinePlayer.sendSettings(gameRules);
			}

			// Set player role as host (X)
			gameState.onlineStatus = 'host';

			// Now waiting for an opponent to join
			isWaitingForOpponent = true;
		} catch (error) {
			console.error('Failed to create online game:', error);
			connectionError = 'Failed to create game. Please try again.';
			connectionStatus = 'error';
		}
	}

	// Join an existing online game using a game code
	async function joinOnlineGame() {
		if (!enteredGameCode) {
			connectionError = 'Please enter a valid game code';
			return;
		}

		if (!onlinePlayer) {
			initializeOnlinePlayer();
		}

		try {
			// Set connection status and show spinner
			connectionStatus = 'connecting';
			connectionError = '';
			isJoiningGame = true;

			// Format entered code to uppercase
			const formattedCode = enteredGameCode.toUpperCase();

			// Join the game with the provided code
			await onlinePlayer!.joinGame(formattedCode);

			// Reset game state for a fresh start
			game.resetGame({
				rules: gameRules,
				mode: 'online-multiplayer'
			});
			gameState = game.getState();

			gameRules = gameRules; // lock in the selected rule
			if (game) game.setGameRules(gameRules);

			// Set player role as guest (O)
			gameState.onlineStatus = 'guest';

			// Reset the game code input UI to show the standard button
			showGameCodeInput = false;
		} catch (error) {
			console.error('Failed to join game:', error);
			connectionError = 'Failed to join game. Please check the game code and try again.';
			connectionStatus = 'error';
		} finally {
			// Reset the joining state
			isJoiningGame = false;
		}
	}

	// Copy game code to clipboard
	function copyGameCodeToClipboard() {
		if (typeof navigator !== 'undefined' && gameCode) {
			try {
				navigator.clipboard.writeText(gameCode);
				// Visual indication - turn the button green temporarily
				isCodeCopied = true;
				setTimeout(() => {
					isCodeCopied = false;
				}, 2000);
			} catch (error) {
				console.error('Failed to copy game code:', error);
			}
		}
	}

	// Disconnect from online game
	function disconnectOnlineGame() {
		// Preserve all current settings
		const previousRules = gameRules;
		const previousMode = gameMode; // Preserve the game mode
		const previousDifficulty = cpuDifficulty;

		// Set flag that user is intentionally forfeiting to prevent showing disconnect message
		userForfeited = true;

		if (onlinePlayer) {
			onlinePlayer.disconnect();
			onlinePlayer = null;
		}

		// Reset game board but keep settings
		game.resetGame({
			rules: previousRules,
			mode: previousMode // Keep the same game mode that was in use
		});

		// Restore CPU difficulty setting
		game.setCpuDifficulty(previousDifficulty);

		// Reset online state
		connectionStatus = 'disconnected';
		gameCode = '';
		enteredGameCode = '';
		isWaitingForOpponent = false;
		connectionError = '';

		// Update game state
		gameState = game.getState();

		// Keep settings menu open for the user who forfeited
		showSettingsModal = true;
	}

	// Function to cancel a game being hosted
	function cancelHostedGame() {
		if (onlinePlayer) {
			// Disconnect the player
			onlinePlayer.disconnect();
			onlinePlayer = null;
		}

		// Reset connection states
		connectionStatus = 'disconnected';
		gameCode = '';
		isWaitingForOpponent = false;
		connectionError = '';

		// Keep the settings modal open
		showSettingsModal = true;
	}

	// Handle cell click
	function handleCellClick(boardIndex: number, cellIndex: number) {
		if (!isInitialized) return;

		// Don't allow clicks while CPU is thinking
		if (isCpuThinking) return;

		// Clear any disconnect reason when making a move in a new game
		if (gameState.disconnectReason) {
			game.setDisconnectReason(undefined);
			gameState = game.getState();
		}

		// For online multiplayer, only allow moves on your turn
		if (gameMode === 'online-multiplayer' && onlinePlayer) {
			// Check if it's the local player's turn
			if (!onlinePlayer.isLocalPlayerTurn(gameState.currentPlayer)) {
				console.log('[BigBoard] Not your turn, waiting for opponent');
				return; // Not your turn
			}

			// Verify the move is valid before sending
			const validMove = game.checkValidMove(boardIndex, cellIndex);
			if (!validMove) {
				console.log('[BigBoard] Invalid move attempted');
				return; // Invalid move
			}

			console.log(`[BigBoard] Making online move: board ${boardIndex}, cell ${cellIndex}`);

			// Stop the timer since the player just made a move
			clearTurnTimer();

			// Reset both timers to 20 seconds for the next turn
			turnTimeRemaining = TURN_TIME_LIMIT;
			opponentTimeRemaining = TURN_TIME_LIMIT;

			// Check if this is the first move of the game
			const wasFirstMove = isFirstMove;

			// Update isFirstMove flag after the first move
			if (isFirstMove) {
				isFirstMove = false;
			}

			// Make move locally
			game.makeMove(boardIndex, cellIndex);
			gameState = game.getState();

			// Send move to remote player
			onlinePlayer.sendMove(boardIndex, cellIndex, onlinePlayer.getLocalPlayer()!);

			// Check if the game was just won
			if (gameState.winner) {
				showVictoryOverlay = true;
				return;
			}
		} else {
			// Standard local play

			// Stop the timer since the player just made a move
			clearTurnTimer();

			// Reset timer to 20 seconds for the next turn
			turnTimeRemaining = TURN_TIME_LIMIT;

			// Check if this is the first move of the game
			const wasFirstMove = isFirstMove;

			// Update isFirstMove flag after the first move
			if (isFirstMove) {
				isFirstMove = false;
			}

			// Make the move
			game.makeMove(boardIndex, cellIndex);
			gameState = game.getState();

			// check if the game was just won
			if (gameState.winner) {
				showVictoryOverlay = true;
				return;
			}

			// Start timer for next player in human vs human mode
			if (gameMode === 'human-vs-human' && !gameState.winner && !gameState.isDraw) {
				// If this was the first move, we need to start the timer now for the second player
				if (wasFirstMove) {
					console.log('[BigBoard] Starting timer after first move (for second player)');
					startTurnTimer();
				} else {
					startTurnTimer();
				}
			}
		}

		// After human's move, make CPU move with "thinking" animation if needed
		if (gameState.gameMode === 'human-vs-cpu' && gameState.currentPlayer === 'O') {
			// Handle CPU turn (this already deals with timer)
			handleCpuTurn();
		}
	}

	// Apply settings without resetting the game
	function applySettings() {
		if (!isInitialized) return;

		// Update game settings
		game.setGameRules(gameRules);
		game.setGameMode(gameMode);

		if (gameMode === 'human-vs-cpu') {
			game.setCpuDifficulty(cpuDifficulty);
		}

		// Save the updated state with new settings
		game.saveState();

		// Update the UI state
		gameState = game.getState();
	}

	// Reset game
	function resetGame() {
		if (!isInitialized) return;

		console.log('[BigBoard] Resetting game, current game mode:', gameMode);

		// First, make sure to clean up any online game state
		if (gameMode === 'online-multiplayer' && onlinePlayer) {
			// If in an online game, properly disconnect
			if (onlinePlayer) {
				onlinePlayer.disconnect();
				onlinePlayer = null;
			}

			// Reset online-related state
			connectionStatus = 'disconnected';
			gameCode = '';
			enteredGameCode = '';
			showGameCodeInput = false;
			isWaitingForOpponent = false;
			connectionError = '';
		}

		// Change game mode to human-vs-human if currently in online multiplayer
		if (gameMode === 'online-multiplayer') {
			gameMode = 'human-vs-human';
		}

		// Explicitly reset any victory/disconnection state
		game.setDisconnectReason(undefined);

		// Reset the game with current settings (which now has gameMode properly set)
		game.resetGame({
			rules: gameRules,
			mode: gameMode
		});

		// Clear user forfeit flag
		userForfeited = false;

		// Reset first move flag to ensure timer doesn't start counting down immediately
		isFirstMove = true;

		// Make sure to re-enable the board for the new game
		boardDisabled = false;

		// Clear any existing timer and reset timer state
		clearTurnTimer();
		turnTimeRemaining = TURN_TIME_LIMIT;
		opponentTimeRemaining = TURN_TIME_LIMIT;

		// Get updated state
		gameState = game.getState();

		console.log('[BigBoard] After reset, disconnect reason:', gameState.disconnectReason);

		// Hide victory overlay
		showVictoryOverlay = false;
	}

	// Hide the victory overlay but keep the game state
	function hideVictoryOverlay() {
		showVictoryOverlay = false;
	}

	// Watch for changes to modal states and save them
	$effect(() => {
		if (isInitialized) {
			saveModalState('settings', showSettingsModal);
		}
	});

	$effect(() => {
		if (isInitialized) {
			saveModalState('howToPlay', showHowToPlayModal);
		}
	});

	// Watch for changes to game settings and save them
	$effect(() => {
		if (isInitialized) {
			saveGameSettings();
		}
	});

	// Update boardDisabled flag when game ends (win, draw, disconnect)
	$effect(() => {
		// In local modes, only disable when there's a winner or draw
		if (gameMode !== 'online-multiplayer') {
			boardDisabled = gameState.winner !== null || gameState.isDraw === true;
			return;
		}

		// In online mode, also disable when there's a disconnect reason
		if (gameState.winner || gameState.isDraw || gameState.disconnectReason) {
			boardDisabled = true;
		} else {
			boardDisabled = false;
		}

		console.log(
			'[BigBoard] Board disabled state:',
			boardDisabled,
			'Winner:',
			gameState.winner,
			'Draw:',
			gameState.isDraw,
			'Disconnect:',
			gameState.disconnectReason
		);
	});

	// Start or reset the turn timer
	function startTurnTimer() {
		// Clear any existing timer
		clearTurnTimer();

		// Reset time remaining to full amount
		turnTimeRemaining = TURN_TIME_LIMIT;

		// Set timer as active immediately to show the timer
		isTimerActive = true;

		// Skip starting the actual countdown for the first move of the game
		if (isFirstMove) {
			console.log('[BigBoard] First move of the game, not starting timer countdown');
			return;
		}

		// Use a timestamp to track when the timer started
		const startTime = Date.now();

		// Create a new timer with a frequent check interval for smoother countdown
		timerInterval = setInterval(() => {
			// Calculate how many seconds have elapsed
			const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

			// If less than 1 second has elapsed, keep showing 20
			if (elapsedSeconds < 1) {
				// Just keep showing initial timer value (20) for the first second
				turnTimeRemaining = TURN_TIME_LIMIT;

				// Send initial timer value in online mode
				if (
					gameMode === 'online-multiplayer' &&
					onlinePlayer &&
					onlinePlayer.isLocalPlayerTurn(gameState.currentPlayer)
				) {
					onlinePlayer.sendTimer(TURN_TIME_LIMIT, gameState.currentPlayer);
				}
			} else {
				// Update timer value based on elapsed time
				// This ensures we count down exactly when each second passes
				turnTimeRemaining = TURN_TIME_LIMIT - elapsedSeconds;

				// Send timer updates in online mode
				if (
					gameMode === 'online-multiplayer' &&
					onlinePlayer &&
					onlinePlayer.isLocalPlayerTurn(gameState.currentPlayer)
				) {
					onlinePlayer.sendTimer(turnTimeRemaining, gameState.currentPlayer);
				}

				// Check if time has run out
				if (turnTimeRemaining <= 0) {
					// Time's up - handle skipping the current player's turn
					handleTimeUp();
				}
			}
		}, 100); // Check frequently for smoother timing
	}

	// Clear the turn timer
	function clearTurnTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		isTimerActive = false;
	}

	// Handle when the timer runs out
	function handleTimeUp() {
		console.log('[BigBoard] Turn timer expired, skipping player:', gameState.currentPlayer);

		// Clear the timer
		clearTurnTimer();

		// Disable the board temporarily while switching turns
		boardDisabled = true;

		// Wait 0.5 seconds before switching players
		setTimeout(() => {
			// In human vs CPU mode, only skip human's turn (X)
			if (gameMode === 'human-vs-cpu' && gameState.currentPlayer === 'X') {
				// Switch player to CPU's turn (O) without making a move
				game.makeMove(-1, -1); // Special move code that just switches players
				gameState = game.getState();

				// Start CPU's turn
				handleCpuTurn();
			}
			// In online multiplayer, only handle skipping if it's the local player's turn
			else if (gameMode === 'online-multiplayer' && onlinePlayer) {
				if (onlinePlayer.isLocalPlayerTurn(gameState.currentPlayer)) {
					// Send "time up" forfeit move to opponent
					onlinePlayer.sendMove(-1, -1, onlinePlayer.getLocalPlayer()!);

					// Switch to opponent's turn locally
					game.makeMove(-1, -1);
					gameState = game.getState();
				}
			}
			// In human vs human mode, just switch players
			else if (gameMode === 'human-vs-human') {
				// Switch players without making a move
				game.makeMove(-1, -1);
				gameState = game.getState();

				// Start the timer for the next player
				startTurnTimer();
			}

			// Re-enable the board
			boardDisabled = false;
		}, 500); // 0.5 seconds delay
	}

	// Handle starting the CPU's turn
	function handleCpuTurn() {
		// Skip timer for CPU's turn and just show thinking animation
		isCpuThinking = true;

		// Generate a random thinking time between 0.5 and 1.5 seconds
		const thinkingTime = Math.floor(Math.random() * 1000) + 500; // 500-1500ms

		// Wait for the "thinking" time before making the CPU move
		setTimeout(() => {
			// Get the CPU's move and apply it
			game.makeCpuMoveIfNeeded();

			// Update game state
			gameState = game.getState();

			// Clear the thinking flag
			isCpuThinking = false;

			// Check if CPU won with its move
			if (gameState.winner) {
				showVictoryOverlay = true;
			} else if (!gameState.isDraw) {
				// Start timer for human player's turn
				startTurnTimer();
			}

			// Save the updated state
			game.saveState();
		}, thinkingTime);
	}

	// Initialize game
	onMount(() => {
		// Load saved game settings from localStorage
		loadGameSettings();

		// Try to load saved game state from localStorage
		const savedState = loadGameState();

		// Initialize game with saved state or create a new game
		game = createGameState(savedState || undefined);
		gameState = game.getState();

		// Override game state settings with any stored user preferences
		if (gameMode) {
			game.setGameMode(gameMode);
		}
		if (gameRules) {
			game.setGameRules(gameRules);
		}
		if (cpuDifficulty && gameMode === 'human-vs-cpu') {
			game.setCpuDifficulty(cpuDifficulty);
		}

		// Update the game state after applying settings
		gameState = game.getState();

		// Show victory overlay if the game is already won
		if (gameState.winner) {
			showVictoryOverlay = true;
		}

		// Save initial state if it's a new game
		if (!savedState) {
			game.saveState();
		}

		// Load modal states from localStorage
		const settingsModalOpen = loadModalState('settings');
		const howToPlayModalOpen = loadModalState('howToPlay');

		// Set modal states after initialization
		isInitialized = true;

		// Apply loaded modal states
		if (settingsModalOpen) {
			showSettingsModal = true;
		}

		if (howToPlayModalOpen) {
			showHowToPlayModal = true;
		}

		// If game is in progress and not against CPU or it's human's turn, start timer
		if (!gameState.winner && !gameState.isDraw) {
			if (
				gameMode === 'human-vs-human' ||
				(gameMode === 'human-vs-cpu' && gameState.currentPlayer === 'X')
			) {
				// Start timer for the current player
				startTurnTimer();
			}
		}

		// If it's CPU's turn (O) and game mode is human-vs-cpu, make CPU move with thinking animation
		if (isInitialized && gameState.gameMode === 'human-vs-cpu' && gameState.currentPlayer === 'O') {
			// Set the thinking flag immediately
			isCpuThinking = true;

			// Generate a random thinking time between 0.5 and 1.5 seconds
			const thinkingTime = Math.floor(Math.random() * 1000) + 500; // 500-1500ms

			setTimeout(() => {
				// Make the CPU move
				game.makeCpuMoveIfNeeded();
				gameState = game.getState();

				// Clear the thinking flag
				isCpuThinking = false;

				// Check if CPU won with its move
				if (gameState.winner) {
					showVictoryOverlay = true;
				} else if (!gameState.isDraw) {
					// Start timer for human player's turn
					startTurnTimer();
				}
			}, thinkingTime);
		}
	});

	// Function to auto-focus an input element when it's mounted
	function autoFocus(node: HTMLElement) {
		// Focus the element after a small delay to ensure DOM is ready
		setTimeout(() => {
			if (node instanceof HTMLInputElement) {
				node.focus();
			}
		}, 50);
	}

	// Function to handle keydown events on the game code input
	function handleGameCodeInputKeydown(event: KeyboardEvent) {
		// Check if the Enter key was pressed and we're not already joining
		if (event.key === 'Enter' && !isJoiningGame) {
			// Prevent default form submission behavior
			event.preventDefault();
			// Trigger the joinOnlineGame function
			joinOnlineGame();
		}
		// if key is backspace, delete, arrows, or home/end, allow it
		else if (
			/^(Backspace|Delete|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End)$/.test(event.key)
		) {
			return;
		}
		// if key is non-alphanumeric, prevent it
		else if (!/^[a-zA-Z0-9]$/.test(event.key)) {
			event.preventDefault();
			return;
		}
	}

	// Check if game code is valid for joining (currently requires 5 characters)
	function isValidGameCode(code: string): boolean {
		// First convert code to uppercase to allow for both uppercase and lowercase input
		const upperCode = code.toUpperCase();
		// Valid if 5 characters alphanumeric
		return !!upperCode && /^[A-Z0-9]{5}$/.test(upperCode);
	}
</script>

<div class="flex flex-col items-center gap-4 w-full max-w-[550px] mx-auto relative">
	<!-- Game status bar -->
	<div class="w-full">
		<!-- Player indicators -->
		<div class="flex justify-between items-center w-full relative px-2.5 md:px-1.5">
			<!-- Player X -->
			<div
				class="flex items-center gap-2 py-2 px-4 rounded-md transition-all duration-200 text-red-500 drop-shadow-red-700 drop-shadow-lg/60 ring-2 ring-inset ring-red-500"
				class:bg-red-900={gameState.currentPlayer === 'X'}
				class:!text-red-50={gameState.currentPlayer === 'X'}
			>
				<Fa icon={faUser} class="text-lg md:text-xl" />
				<Fa icon={faXmark} class="text-xl md:text-2xl" />
			</div>

			<!-- Turn Timer - Centered between players, always visible -->
			{#if (gameMode === 'online-multiplayer' && connectionStatus === 'connected') || gameMode === 'human-vs-cpu' || gameMode === 'human-vs-human'}
				<div
					class="absolute text-2xl md:text-3xl animate font-semibold flex items-center gap-2 whitespace-nowrap font-mono text-white/80"
					class:text-rose-500={gameMode === 'online-multiplayer' && onlinePlayer
						? onlinePlayer.isLocalPlayerTurn(gameState.currentPlayer)
							? turnTimeRemaining <= 5
							: opponentTimeRemaining <= 5
						: turnTimeRemaining <= 5}
					class:left-24={gameState.currentPlayer === 'X'}
					class:right-24={gameState.currentPlayer === 'O'}
				>
					{#if gameMode === 'online-multiplayer' && onlinePlayer && !onlinePlayer.isLocalPlayerTurn(gameState.currentPlayer)}
						<span
							class:text-rose-500={gameState.currentPlayer === 'X'}
							class:text-sky-500={gameState.currentPlayer === 'O'}
							class:ml-auto={gameState.currentPlayer === 'X'}
							>0:{opponentTimeRemaining < 10 ? '0' : ''}{opponentTimeRemaining}</span
						>
					{:else}
						<span
							class:text-rose-500={gameState.currentPlayer === 'X'}
							class:text-sky-500={gameState.currentPlayer === 'O'}
							class:ml-auto={gameState.currentPlayer === 'X'}
							>0:{turnTimeRemaining < 10 ? '0' : ''}{turnTimeRemaining}</span
						>
					{/if}
				</div>
			{/if}
			{#if gameMode === 'online-multiplayer' && connectionStatus === 'waiting'}
				<!-- Waiting for opponent message - shown when hosting a game -->
				<div
					class="absolute left-1/2 -translate-x-1/2 text-sm text-gray-300 flex items-center gap-2 whitespace-nowrap"
				>
					<span>Waiting for opponent...</span>
					<Fa icon={faSpinner} class="animate-spin" />
				</div>
			{/if}
			<!-- Message to generate a code if in multiplayer but no code created yet -->
			{#if gameMode === 'online-multiplayer' && !gameCode && connectionStatus !== 'connected'}
				<div
					class="absolute left-1/2 -translate-x-1/2 text-sm text-gray-300 flex items-center gap-2 text-center wrap-normal"
				>
					<span>Create a game to invite a friend!</span>
				</div>
			{/if}

			<!-- Player O -->
			<div
				class="flex items-center gap-2 py-2 px-4 rounded-md transition-all duration-200 text-sky-500 drop-shadow-sky-700 drop-shadow-lg/60 ring-2 ring-inset ring-sky-500"
				class:bg-sky-900={gameState.currentPlayer === 'O'}
				class:!text-sky-50={gameState.currentPlayer === 'O'}
			>
				<Fa
					icon={gameState.gameMode === 'human-vs-cpu' ? faRobot : faUser}
					class="text-lg md:text-xl"
				/>
				<Fa icon={faO} class="text-xl md:text-2xl" />
			</div>

			<!-- CPU Thinking Message -->
			{#if gameState.gameMode === 'human-vs-cpu' && isCpuThinking}
				<div
					class="absolute right-0 -bottom-5 text-xs italic text-gray-400 flex items-center gap-1"
				>
					<span>thinking...</span>
					<Fa icon={faSpinner} class="animate-spin" />
				</div>
			{/if}
		</div>
	</div>

	<!-- Main game board -->
	<div class="grid grid-cols-3 grid-rows-3 gap-3 bg-zinc-800 p-1.5 rounded-lg w-full aspect-square">
		{#each Array(3) as _, boardRow}
			{#each Array(3) as _, boardCol}
				{@const boardIndex = boardRow * 3 + boardCol}
				<SmallBoard
					{boardIndex}
					board={gameState.boards[boardIndex]}
					isActive={gameState.activeBoard === null || gameState.activeBoard === boardIndex}
					winner={gameState.boardWinners[boardIndex]}
					onCellClick={handleCellClick}
					lastMove={gameState.lastMove}
					gameWinner={gameState.winner}
					isLocalPlayerTurn={// For human vs human mode, it's always the local player's turn
					gameMode === 'human-vs-human' ||
						// For human vs CPU mode, it's only the local player's turn when the current player is X (human)
						(gameMode === 'human-vs-cpu' && gameState.currentPlayer === 'X') ||
						// For online multiplayer, use the existing logic
						(gameMode === 'online-multiplayer' &&
							(!onlinePlayer || onlinePlayer.isLocalPlayerTurn(gameState.currentPlayer)))}
					{boardDisabled}
				/>
			{/each}
		{/each}
	</div>

	<!-- Game controls -->
	<div class="flex gap-6 mt-4 w-full justify-center select-none">
		<button
			class="px-3 md:px-6 py-2 bg-zinc-800 outline-zinc-600 outline-2 hover:bg-zinc-600 text-white rounded-sm transition-colors flex items-center gap-2 font-semibold cursor-pointer md:text-md text-sm"
			onclick={() => (showHowToPlayModal = true)}
		>
			<Fa icon={faCircleInfo} class="" />
			How to Play
		</button>

		<button
			class="px-3 md:px-6 py-2 bg-zinc-800 outline-zinc-600 outline-2 hover:bg-zinc-600 text-white rounded-sm transition-colors flex items-center gap-2 font-semibold cursor-pointer md:text-md text-sm"
			onclick={() => (showSettingsModal = true)}
		>
			<Fa icon={faGear} class="" />
			Settings
		</button>

		{#if gameMode === 'online-multiplayer' && connectionStatus === 'connected'}
			<button
				class="px-3 md:px-6 py-2 bg-zinc-800 outline-zinc-600 outline-2 hover:bg-zinc-600 text-white rounded-sm transition-colors flex items-center gap-2 font-semibold cursor-pointer md:text-md text-sm"
				onclick={disconnectOnlineGame}
			>
				<Fa icon={faRightFromBracket} class="text-rose-500/80" />
				Leave Game
			</button>
		{:else}
			<button
				class="px-3 md:px-6 py-2 bg-zinc-800 outline-zinc-600 outline-2 hover:bg-zinc-600 text-white rounded-sm transition-colors flex items-center gap-2 font-semibold cursor-pointer md:text-md text-sm"
				onclick={resetGame}
			>
				<Fa icon={faRotate} class="" />
				New Game
			</button>
		{/if}
	</div>

	<!-- Victory overlay - shown when a player wins -->
	{#if showVictoryOverlay && !userForfeited}
		<div
			class="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50"
		>
			<div
				class="p-4 md:p-8 rounded-none md:rounded-xl shadow-2xl flex flex-col items-center w-full h-full md:h-auto md:w-auto m-0 md:m-4"
			>
				<div class="mb-10 flex flex-row space-x-4 items-center text-6xl">
					<Fa icon={faTrophy} class="text-amber-500" />
					{#if gameState.disconnectReason === 'forfeit'}
						<h2 class="font-bold text-amber-500">Opponent Forfeited!</h2>
					{:else if gameState.disconnectReason === 'connection-lost'}
						<h2 class="font-bold text-amber-500">Opponent Lost Connection!</h2>
					{:else}
						<h2
							class="font-bold"
							class:text-rose-500={gameState.winner === 'X'}
							class:text-sky-500={gameState.winner === 'O'}
						>
							Player {gameState.winner} Wins!
						</h2>
					{/if}
					<Fa icon={faTrophy} class="text-amber-500" />
				</div>
				<div class="flex gap-4 w-full justify-center">
					{#if gameState.disconnectReason === 'forfeit' || gameState.disconnectReason === 'connection-lost'}
						<!-- For forfeit/disconnection wins, show Settings and View Board buttons -->
						<button
							class="px-6 py-2 bg-zinc-800/70 outline-zinc-600 outline-2 hover:bg-zinc-600/70 text-white rounded-sm transition-colors flex items-center gap-2 font-semibold cursor-pointer"
							onclick={() => {
								hideVictoryOverlay();
								showSettingsModal = true;
							}}
						>
							<Fa icon={faGear} />
							Settings
						</button>
						<button
							class="px-6 py-2 bg-zinc-800/70 outline-zinc-600 outline-2 hover:bg-zinc-600/70 text-white rounded-sm transition-colors flex items-center gap-2 font-semibold cursor-pointer"
							onclick={hideVictoryOverlay}
						>
							<Fa icon={faEye} />
							View Board
						</button>
					{:else}
						<!-- For normal wins, show Play Again and View Board buttons -->
						<button
							class="px-6 py-2 bg-zinc-800/70 outline-zinc-600 outline-2 hover:bg-zinc-600/70 text-white rounded-sm transition-colors flex items-center gap-2 font-semibold cursor-pointer"
							onclick={resetGame}
						>
							<Fa icon={faRotate} />
							Play Again
						</button>
						<button
							class="px-6 py-2 bg-zinc-800/70 outline-zinc-600 outline-2 hover:bg-zinc-600/70 text-white rounded-sm transition-colors flex items-center gap-2 font-semibold cursor-pointer"
							onclick={hideVictoryOverlay}
						>
							<Fa icon={faEye} />
							View Board
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Settings Modal -->
	{#if showSettingsModal}
		<div
			class="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50"
			role="menu"
			aria-hidden="true"
			onclick={(e) => {
				// Only close if clicking the backdrop, not the modal content
				if (e.target === e.currentTarget) {
					showSettingsModal = false;
					// No need to call saveModalState here as the $effect will handle it
				}
			}}
		>
			<div
				class="bg-zinc-900/95 p-8 rounded-xl shadow-2xl flex flex-col items-center w-full max-w-md md:max-w-md md:rounded-xl md:p-8 md:w-auto md:h-auto h-full md:max-h-[90vh] overflow-y-auto m-0 md:m-4"
			>
				<div class="w-full flex justify-between items-center mb-6">
					<h2 class="text-2xl font-bold text-white flex items-center gap-2">
						<Fa icon={faGear} />
						Game Settings
					</h2>
					<button
						class="text-gray-400 hover:text-white transition-colors hover:cursor-pointer"
						onclick={() => (showSettingsModal = false)}
					>
						<Fa icon={faTimes} class="text-2xl" />
					</button>
				</div>

				<div class="w-full space-y-4">
					<!-- Game Mode Options -->
					<div class="flex flex-col gap-2">
						<h3 class="text-lg font-semibold text-white">Game Mode</h3>
						<div class="grid grid-cols-3 gap-2">
							<!-- Human vs Human Option -->
							<button
								class="flex flex-col items-center p-3 rounded-lg transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2 select-none"
								class:border-sky-500={gameMode === 'human-vs-human'}
								class:border-transparent={gameMode !== 'human-vs-human'}
								class:ring-2={gameMode === 'human-vs-human'}
								class:ring-sky-500={gameMode === 'human-vs-human'}
								class:opacity-50={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:hover:bg-zinc-800={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:cursor-not-allowed={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:cursor-pointer={!(
									gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')
								)}
								onclick={() => {
									if (
										!(
											gameMode === 'online-multiplayer' &&
											(connectionStatus === 'connected' || connectionStatus === 'waiting')
										)
									) {
										gameMode = 'human-vs-human';
									}
								}}
							>
								<div
									class="w-5 h-5 rounded-full border-2 border-zinc-500 mb-2 flex items-center justify-center"
								>
									{#if gameMode === 'human-vs-human'}
										<div class="w-2 h-2 rounded-full bg-sky-500"></div>
									{/if}
								</div>
								<div class="flex items-center gap-1 justify-center mb-1">
									<Fa icon={faUser} class="text-rose-500 text-sm" />
									<span class="font-medium text-white text-xs">vs</span>
									<Fa icon={faUser} class="text-sky-500 text-sm" />
								</div>
								<p class="text-xs text-gray-400 text-center">Local</p>
							</button>

							<!-- Human vs CPU Option -->
							<button
								class="flex flex-col items-center p-3 rounded-lg transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2 select-none"
								class:border-sky-500={gameMode === 'human-vs-cpu'}
								class:border-transparent={gameMode !== 'human-vs-cpu'}
								class:ring-2={gameMode === 'human-vs-cpu'}
								class:ring-sky-500={gameMode === 'human-vs-cpu'}
								class:opacity-50={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:hover:bg-zinc-800={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:cursor-not-allowed={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:cursor-pointer={!(
									gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')
								)}
								onclick={() => {
									if (
										!(
											gameMode === 'online-multiplayer' &&
											(connectionStatus === 'connected' || connectionStatus === 'waiting')
										)
									) {
										gameMode = 'human-vs-cpu';
									}
								}}
							>
								<div
									class="w-5 h-5 rounded-full border-2 border-zinc-500 mb-2 flex items-center justify-center"
								>
									{#if gameMode === 'human-vs-cpu'}
										<div class="w-2 h-2 rounded-full bg-sky-500"></div>
									{/if}
								</div>
								<div class="flex items-center gap-1 justify-center mb-1">
									<Fa icon={faUser} class="text-rose-500 text-sm" />
									<span class="font-medium text-white text-xs">vs</span>
									<Fa icon={faRobot} class="text-sky-500 text-sm" />
								</div>
								<p class="text-xs text-gray-400 text-center">CPU</p>
							</button>

							<!-- Online Multiplayer Option -->
							<button
								class="flex flex-col items-center p-3 rounded-lg transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2 select-none"
								class:border-sky-500={gameMode === 'online-multiplayer'}
								class:border-transparent={gameMode !== 'online-multiplayer'}
								class:ring-2={gameMode === 'online-multiplayer'}
								class:ring-sky-500={gameMode === 'online-multiplayer'}
								onclick={() => (gameMode = 'online-multiplayer')}
							>
								<div
									class="w-5 h-5 rounded-full border-2 border-zinc-500 mb-2 flex items-center justify-center"
								>
									{#if gameMode === 'online-multiplayer'}
										<div class="w-2 h-2 rounded-full bg-sky-500"></div>
									{/if}
								</div>
								<div class="flex items-center gap-1 justify-center mb-1">
									<Fa icon={faUser} class="text-rose-500 text-sm" />
									<span class="font-medium text-white text-xs">vs</span>
									<Fa icon={faGlobe} class="text-sky-500 text-sm" />
								</div>
								<p class="text-xs text-gray-400 text-center">Online</p>
							</button>
						</div>
					</div>

					<!-- CPU Difficulty Options - Only shown when human-vs-cpu is selected -->
					{#if gameMode === 'human-vs-cpu'}
						<div class="flex flex-col gap-2 border-t-2 border-zinc-700 pt-4 mt-2">
							<h3 class="text-lg font-semibold text-white">CPU Difficulty</h3>
							<div class="grid grid-cols-3 gap-2">
								<!-- Easy Difficulty Option -->
								<button
									class="flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2 select-none"
									class:border-sky-500={cpuDifficulty === 'easy'}
									class:border-transparent={cpuDifficulty !== 'easy'}
									class:ring-2={cpuDifficulty === 'easy'}
									class:ring-sky-500={cpuDifficulty === 'easy'}
									onclick={() => (cpuDifficulty = 'easy')}
								>
									<div
										class="w-5 h-5 rounded-full border-2 border-zinc-500 mb-2 flex items-center justify-center"
									>
										{#if cpuDifficulty === 'easy'}
											<div class="w-2 h-2 rounded-full bg-sky-500"></div>
										{/if}
									</div>
									<p class="font-medium text-white text-center text-sm">Easy</p>
									<p class="text-xs text-gray-400 text-center mt-1">Mostly random moves</p>
								</button>

								<!-- Moderate Difficulty Option -->
								<button
									class="flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2 select-none"
									class:border-sky-500={cpuDifficulty === 'moderate'}
									class:border-transparent={cpuDifficulty !== 'moderate'}
									class:ring-2={cpuDifficulty === 'moderate'}
									class:ring-sky-500={cpuDifficulty === 'moderate'}
									onclick={() => (cpuDifficulty = 'moderate')}
								>
									<div
										class="w-5 h-5 rounded-full border-2 border-zinc-500 mb-2 flex items-center justify-center"
									>
										{#if cpuDifficulty === 'moderate'}
											<div class="w-2 h-2 rounded-full bg-sky-500"></div>
										{/if}
									</div>
									<p class="font-medium text-white text-center text-sm">Moderate</p>
									<p class="text-xs text-gray-400 text-center mt-1">Balanced challenge</p>
								</button>

								<!-- Expert Difficulty Option -->
								<button
									class="flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2 select-none"
									class:border-sky-500={cpuDifficulty === 'expert'}
									class:border-transparent={cpuDifficulty !== 'expert'}
									class:ring-2={cpuDifficulty === 'expert'}
									class:ring-sky-500={cpuDifficulty === 'expert'}
									onclick={() => (cpuDifficulty = 'expert')}
								>
									<div
										class="w-5 h-5 rounded-full border-2 border-zinc-500 mb-2 flex items-center justify-center"
									>
										{#if cpuDifficulty === 'expert'}
											<div class="w-2 h-2 rounded-full bg-sky-500"></div>
										{/if}
									</div>
									<p class="font-medium text-white text-center text-sm">Expert</p>
									<p class="text-xs text-gray-400 text-center mt-1">Strategic & optimal</p>
								</button>
							</div>
						</div>
					{/if}

					<!-- Online Multiplayer Options - Only shown when online-multiplayer is selected -->
					{#if gameMode === 'online-multiplayer'}
						<div class="flex flex-col gap-2 border-t-2 border-zinc-700 pt-4 mt-2">
							<h3 class="text-lg font-semibold text-white">Online Multiplayer</h3>
							<div class="flex flex-col gap-2">
								<!-- Create Game Section -->
								{#if connectionStatus === 'waiting'}
									<!-- Game Code Display - Shown when game is created and waiting for opponent -->
									<div class="flex items-center justify-between rounded-lg overflow-hidden">
										<input
											type="text"
											class="w-full py-2.5 px-3 bg-zinc-800 text-white focus:outline-none font-medium cursor-default rounded-l-lg border-2 border-r-0 border-sky-500 !font-mono text-center text-lg pl-10"
											class:!tracking-[1em]={gameCode?.length > 0}
											class:font-semibold={gameCode?.length > 0}
											value={gameCode}
											readonly
										/>
										<button
											class="py-3 px-3 h-full transition-colors duration-200 rounded-l-none rounded-r-lg border-2 border-l-0 border-sky-500 min-h-[3.25rem] text-white"
											class:bg-sky-600={!isCodeCopied}
											class:hover:bg-sky-700={!isCodeCopied}
											class:bg-green-600={isCodeCopied}
											class:cursor-pointer={!isCodeCopied}
											disabled={isCodeCopied}
											onclick={copyGameCodeToClipboard}
										>
											<Fa icon={isCodeCopied ? faCheck : faCopy} />
										</button>
									</div>
								{:else if connectionStatus === 'connected'}
									<!-- Leave Game Button - Shown when connected to a game -->
									<button
										class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 select-none w-full border-2 border-transparent"
										onclick={disconnectOnlineGame}
									>
										<div class="flex items-center">
											<Fa icon={faRightFromBracket} class="text-lg mr-2 text-rose-500/80" />
											<span class="font-medium">Leave Current Game</span>
										</div>
									</button>
								{:else}
									<!-- Create Game Button -->
									<button
										class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2 select-none w-full"
										class:border-sky-500={connectionStatus === 'connecting'}
										class:border-transparent={connectionStatus !== 'connecting'}
										onclick={() => {
											// Reset join game input if active
											showGameCodeInput = false;
											enteredGameCode = '';
											connectionError = '';
											// Create new game
											createOnlineGame();
										}}
									>
										<div class="flex items-center">
											<Fa icon={faGlobe} class="text-sky-500 text-lg mr-2" />
											<span class="font-medium text-white">Create Game</span>
										</div>
									</button>
								{/if}

								<!-- Join Game or Cancel Game Section -->
								{#if showGameCodeInput}
									<!-- Game Code Input - Shown when joining a game -->
									<div class="flex items-center justify-between rounded-lg overflow-hidden">
										<input
											type="text"
											class="w-full p-3 bg-zinc-800 text-white focus:outline-none font-medium rounded-l-lg border-2 border-r-0 border-sky-500 uppercase placeholder:normal-case text-center pl-10 selection:bg-sky-500"
											class:font-mono={enteredGameCode?.length > 0}
											class:font-semibold={enteredGameCode?.length > 0}
											class:!tracking-[1em]={enteredGameCode?.length > 0}
											class:caret-transparent={enteredGameCode?.length >= 5}
											autocomplete="off"
											autocorrect="off"
											placeholder="Enter Game Code (e.g., RT123)"
											bind:value={enteredGameCode}
											use:autoFocus
											onkeydown={handleGameCodeInputKeydown}
											disabled={isJoiningGame}
											maxlength="5"
											pattern="[A-Z0-9]{5}"
										/>
										<button
											class="p-3 text-white transition-colors h-full rounded-l-none rounded-r-lg border-2 border-l-0 border-sky-500 min-h-[3.25rem] cursor-disabled w-10"
											class:bg-sky-600={!isJoiningGame && isValidGameCode(enteredGameCode)}
											class:hover:bg-sky-700={!isJoiningGame && isValidGameCode(enteredGameCode)}
											class:cursor-pointer={!isJoiningGame && isValidGameCode(enteredGameCode)}
											class:bg-zinc-600={isJoiningGame || !isValidGameCode(enteredGameCode)}
											class:hover:bg-zinc-600={!isValidGameCode(enteredGameCode)}
											class:cursor-not-allowed={!isValidGameCode(enteredGameCode)}
											onclick={joinOnlineGame}
											disabled={isJoiningGame || !isValidGameCode(enteredGameCode)}
										>
											{#if isJoiningGame}
												<Fa icon={faSpinner} class="animate-spin" />
											{:else}
												<Fa icon={faAngleRight} />
											{/if}
										</button>
									</div>
									{#if connectionError}
										<p class="text-rose-500 text-xs text-center mt-1">{connectionError}</p>
									{/if}
								{:else if connectionStatus === 'waiting'}
									<!-- Cancel Game Button - Shown only when hosting and waiting for an opponent -->
									<button
										class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 select-none w-full border-2 border-rose-500"
										onclick={cancelHostedGame}
									>
										<div class="flex items-center">
											<Fa icon={faTimes} class="text-lg mr-2 text-rose-500 mt-[3px]" />
											<span class="font-medium text-white">Cancel Game</span>
										</div>
									</button>
								{:else}
									<!-- Join Game Button - Shown in normal state (not hosting, not joining) -->
									<button
										class="flex items-center justify-between p-3 rounded-lg transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2 select-none w-full"
										class:border-sky-500={connectionStatus === 'connecting'}
										class:border-transparent={connectionStatus !== 'connecting'}
										class:opacity-50={connectionStatus === 'connected'}
										class:hover:bg-zinc-800={connectionStatus === 'connected'}
										class:cursor-not-allowed={connectionStatus === 'connected'}
										class:cursor-pointer={connectionStatus !== 'connected'}
										onclick={() => {
											if (connectionStatus !== 'connected') {
												// Show the game code input
												showGameCodeInput = true;
											}
										}}
									>
										<div class="flex items-center">
											<Fa icon={faAngleRight} class="text-sky-500 text-lg mr-2" />
											<span class="font-medium text-white">Join Game</span>
										</div>
									</button>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Game Rules Options -->
					<div class="flex flex-col gap-2 mb-6">
						<h3 class="text-lg font-semibold text-white">Game Rules</h3>
						<div class="grid grid-cols-2 gap-2">
							<!-- Standard Rules Option -->
							<button
								class="flex flex-col items-center p-4 rounded-lg transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2 select-none"
								class:border-sky-500={gameRules === 'standard'}
								class:border-transparent={gameRules !== 'standard'}
								class:ring-2={gameRules === 'standard'}
								class:ring-sky-500={gameRules === 'standard'}
								class:opacity-50={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:hover:bg-zinc-800={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:cursor-not-allowed={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:cursor-pointer={!(
									gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')
								)}
								onclick={() => {
									if (
										!(
											gameMode === 'online-multiplayer' &&
											(connectionStatus === 'connected' || connectionStatus === 'waiting')
										)
									) {
										gameRules = 'standard';
									}
								}}
							>
								<div
									class="w-6 h-6 rounded-full border-2 border-zinc-500 mb-3 flex items-center justify-center"
								>
									{#if gameRules === 'standard'}
										<div class="w-3 h-3 rounded-full bg-sky-500"></div>
									{/if}
								</div>
								<p class="font-medium text-white text-center">Standard</p>
								<p class="text-xs text-gray-400 text-center mt-1">
									Next board determined by last move
								</p>
							</button>

							<!-- Free Play Option -->
							<button
								class="flex flex-col items-center p-4 rounded-lg transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2 select-none"
								class:border-sky-500={gameRules === 'free-play'}
								class:border-transparent={gameRules !== 'free-play'}
								class:ring-2={gameRules === 'free-play'}
								class:ring-sky-500={gameRules === 'free-play'}
								class:opacity-50={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:hover:bg-zinc-800={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:cursor-not-allowed={gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')}
								class:cursor-pointer={!(
									gameMode === 'online-multiplayer' &&
									(connectionStatus === 'connected' || connectionStatus === 'waiting')
								)}
								onclick={() => {
									if (
										!(
											gameMode === 'online-multiplayer' &&
											(connectionStatus === 'connected' || connectionStatus === 'waiting')
										)
									) {
										gameRules = 'free-play';
									}
								}}
							>
								<div
									class="w-6 h-6 rounded-full border-2 border-zinc-500 mb-3 flex items-center justify-center"
								>
									{#if gameRules === 'free-play'}
										<div class="w-3 h-3 rounded-full bg-sky-500"></div>
									{/if}
								</div>
								<p class="font-medium text-white text-center">Free Play</p>
								<p class="text-xs text-gray-400 text-center mt-1">Play in any board at any time</p>
							</button>
						</div>
					</div>
				</div>

				<!-- Action buttons -->
				<div class="w-full flex flex-row gap-3">
					{#if gameMode === 'online-multiplayer' && connectionStatus === 'connected'}
						<!-- Just show Resume Game button when in an active online game -->
						<button
							class="w-full px-3 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors flex items-center justify-center gap-2 font-semibold cursor-pointer"
							onclick={() => {
								showSettingsModal = false;
							}}
						>
							Resume Game
						</button>
					{:else}
						<!-- Regular buttons for non-online games or when not connected -->
						<button
							class="w-full px-3 py-3 border-2 border-zinc-600 hover:bg-zinc-600 text-white rounded-md transition-colors flex items-center justify-center gap-2 font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
							disabled={connectionStatus === 'waiting'}
							onclick={() => {
								// Apply settings and start a new game
								resetGame();
								showSettingsModal = false;
							}}
						>
							Apply & New Game
						</button>
						<button
							class="w-full px-3 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors flex items-center justify-center gap-2 font-semibold cursor-pointer"
							onclick={() => {
								// Apply settings without resetting
								applySettings();
								showSettingsModal = false;
							}}
						>
							Apply Settings
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- How to Play Modal -->
	{#if showHowToPlayModal}
		<div
			class="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50"
			role="menu"
			aria-hidden="true"
			onclick={(e) => {
				// Only close if clicking the backdrop, not the modal content
				if (e.target === e.currentTarget) {
					showHowToPlayModal = false;
					// No need to call saveModalState here as the $effect will handle it
				}
			}}
		>
			<div
				class="bg-zinc-900/95 p-4 md:p-8 rounded-none md:rounded-xl shadow-2xl flex flex-col items-center w-full h-full md:max-w-[50vw] md:h-auto md:max-h-[90vh] overflow-y-auto m-0 md:m-4"
			>
				<div class="w-full flex justify-between items-center mb-6 pt-8 md:pt-0">
					<h2 class="text-3xl font-bold text-white flex items-center gap-2">
						<Fa icon={faCircleInfo} />
						<span>How to Play</span>
					</h2>
					<button
						class="text-gray-400 hover:text-white transition-colors hover:cursor-pointer"
						onclick={() => (showHowToPlayModal = false)}
					>
						<Fa icon={faTimes} class="text-2xl" />
					</button>
				</div>

				<div class="w-full space-y-6 text-white">
					<div>
						<h3 class="text-lg font-semibold mb-2">Tic Tac Squared</h3>
						<p class="text-gray-300 mb-4">
							A strategic twist on the classic game, played on 9 small tic-tac-toe boards arranged
							in a 3×3 grid.
						</p>
					</div>

					<div>
						<h3 class="text-lg font-semibold mb-2">How Moves Work</h3>
						<ul class="list-disc list-inside space-y-2 text-gray-300">
							<li>
								<span class="font-semibold text-sky-400">Standard Mode:</span> Your move determines where
								your opponent plays next. If you play in the top-right cell of any small board, your
								opponent must play in the top-right small board.
							</li>
							<li>Active boards that can be played on have white highlighting.</li>
							<li>
								If a move would send your opponent to a completed board, they can play on any
								available board.
							</li>
							<li>
								<span class="font-semibold text-sky-400">Free Play Mode:</span> Players can move in any
								valid board at any time.
							</li>
						</ul>
					</div>

					<div>
						<h3 class="text-lg font-semibold mb-2">Strategy Tips</h3>
						<ul class="list-disc list-inside space-y-2 text-gray-300">
							<li>Think ahead about where your move will send your opponent.</li>
							<li>
								Sometimes it's strategic to sacrifice a small board to force your opponent into a
								disadvantageous position.
							</li>
							<li>Try to control the center board, as it connects to every other board.</li>
						</ul>
					</div>

					<!-- Button to close modal -->
					<button
						class="w-full px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors mt-6 font-semibold cursor-pointer"
						onclick={() => (showHowToPlayModal = false)}
					>
						Got It!
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
