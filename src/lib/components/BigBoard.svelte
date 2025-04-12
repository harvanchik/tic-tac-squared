<script lang="ts">
	import SmallBoard from './SmallBoard.svelte';
	import { createGameState, loadGameState, type GameState } from '../game/GameState';
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
		faRobot
	} from '@fortawesome/free-solid-svg-icons';

	// Constants for localStorage keys
	const GAME_STORAGE_KEY = 'tic-tac-squared-game-state'; // This matches the key in GameState.ts
	const SETTINGS_MODAL_KEY = 'tic-tac-squared-settings-modal';
	const HOW_TO_PLAY_MODAL_KEY = 'tic-tac-squared-how-to-play-modal';

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

	// Settings state variables
	let showSettingsModal = $state(false);
	let showHowToPlayModal = $state(false);
	let gameMode = $state<'human-vs-human' | 'human-vs-cpu'>('human-vs-human');
	let gameRules = $state<'standard' | 'free-play'>('standard');

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

	// Handle cell click
	function handleCellClick(boardIndex: number, cellIndex: number) {
		if (!isInitialized) return;
		game.makeMove(boardIndex, cellIndex);
		gameState = game.getState();

		// check if the game was just won
		if (gameState.winner) {
			showVictoryOverlay = true;
		}
	}

	// Apply settings without resetting the game
	function applySettings() {
		if (!isInitialized) return;

		// Update game settings
		game.setGameRules(gameRules);
		game.setGameMode(gameMode);

		// Save the updated state with new settings
		game.saveState();

		// Update the UI state
		gameState = game.getState();
	}

	// Reset game
	function resetGame() {
		if (!isInitialized) return;

		// Pass current settings to the reset function
		game.resetGame({
			rules: gameRules,
			mode: gameMode
		});

		gameState = game.getState();
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

	// Initialize game
	onMount(() => {
		// Try to load saved game state from localStorage
		const savedState = loadGameState();

		// Initialize game with saved state or create a new game
		game = createGameState(savedState || undefined);
		gameState = game.getState();

		// Initialize settings from game state
		if (gameState.gameRules) {
			gameRules = gameState.gameRules;
		}
		if (gameState.gameMode) {
			gameMode = gameState.gameMode;
		}

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
	});
</script>

<div class="flex flex-col items-center gap-4 w-full max-w-[550px] mx-auto relative">
	<!-- Game status bar -->
	<div class="w-full">
		<!-- Player indicators -->
		<div class="flex justify-between items-center w-full">
			<!-- Player X -->
			<div
				class="flex items-center gap-2 py-2 px-4 rounded-md transition-all duration-200 text-red-500 drop-shadow-red-700 drop-shadow-lg/60 ring-2 ring-inset ring-red-500"
				class:bg-red-900={gameState.currentPlayer === 'X'}
				class:!text-red-50={gameState.currentPlayer === 'X'}
			>
				<Fa icon={faUser} class="text-xl" />
				<Fa icon={faXmark} class="text-2xl" />
			</div>

			<!-- Player O -->
			<div
				class="flex items-center gap-2 py-2 px-4 rounded-md transition-all duration-200 text-sky-500 drop-shadow-sky-700 drop-shadow-lg/60 ring-2 ring-inset ring-sky-500"
				class:bg-sky-900={gameState.currentPlayer === 'O'}
				class:!text-sky-50={gameState.currentPlayer === 'O'}
			>
				<Fa icon={gameState.gameMode === 'human-vs-cpu' ? faRobot : faUser} class="text-xl" />
				<Fa icon={faO} class="text-2xl" />
			</div>
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
				/>
			{/each}
		{/each}
	</div>

	<!-- Game controls -->
	<div class="flex gap-4 mt-4 w-full justify-center select-none">
		<button
			class="px-6 py-2 bg-zinc-800 outline-zinc-600 outline-2 hover:bg-zinc-600 text-white rounded-sm transition-colors flex items-center gap-2 font-semibold cursor-pointer"
			onclick={() => (showHowToPlayModal = true)}
		>
			<Fa icon={faCircleInfo} class="" />
			How to Play
		</button>

		<button
			class="px-6 py-2 bg-zinc-800 outline-zinc-600 outline-2 hover:bg-zinc-600 text-white rounded-sm transition-colors flex items-center gap-2 font-semibold cursor-pointer"
			onclick={() => (showSettingsModal = true)}
		>
			<Fa icon={faGear} class="" />
			Settings
		</button>

		<button
			class="px-6 py-2 bg-zinc-800 outline-zinc-600 outline-2 hover:bg-zinc-600 text-white rounded-sm transition-colors flex items-center gap-2 font-semibold cursor-pointer"
			onclick={resetGame}
		>
			<Fa icon={faRotate} class="" />
			New Game
		</button>
	</div>

	<!-- Victory overlay - shown when a player wins -->
	{#if showVictoryOverlay}
		<div
			class="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50"
		>
			<div class=" p-8 rounded-xl shadow-2xl flex flex-col items-center w-full">
				<div class="mb-10 flex flex-row space-x-4 items-center text-6xl">
					<Fa icon={faTrophy} class="text-amber-500" />
					<h2
						class="font-bold"
						class:text-rose-500={gameState.winner === 'X'}
						class:text-sky-500={gameState.winner === 'O'}
					>
						Player {gameState.winner} Wins!
					</h2>
					<Fa icon={faTrophy} class="text-amber-500" />
				</div>
				<div class="flex gap-4 w-full justify-center">
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
				class="bg-zinc-900/95 p-8 rounded-xl shadow-2xl flex flex-col items-center w-full max-w-md"
			>
				<div class="w-full flex justify-between items-center mb-6">
					<h2 class="text-2xl font-bold text-white flex items-center gap-2">
						<Fa icon={faGear} />
						Game Settings
					</h2>
					<button
						class="text-gray-400 hover:text-white transition-colors"
						onclick={() => (showSettingsModal = false)}
					>
						<Fa icon={faTimes} size="lg" />
					</button>
				</div>

				<div class="w-full space-y-6 mb-6">
					<!-- Game Rules Options -->
					<div class="flex flex-col gap-2">
						<h3 class="text-lg font-semibold text-white">Game Rules</h3>
						<div class="grid grid-cols-2 gap-2">
							<!-- Standard Rules Option -->
							<div
								class="flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2"
								class:border-blue-500={gameRules === 'standard'}
								class:border-transparent={gameRules !== 'standard'}
								class:ring-2={gameRules === 'standard'}
								class:ring-blue-500={gameRules === 'standard'}
								role="menu"
								aria-hidden="true"
								onclick={() => (gameRules = 'standard')}
							>
								<div
									class="w-6 h-6 rounded-full border-2 border-zinc-500 mb-3 flex items-center justify-center"
								>
									{#if gameRules === 'standard'}
										<div class="w-3 h-3 rounded-full bg-blue-500"></div>
									{/if}
								</div>
								<p class="font-medium text-white text-center">Standard</p>
								<p class="text-xs text-gray-400 text-center mt-1">
									Next board determined by last move
								</p>
							</div>

							<!-- Free Play Option -->
							<div
								class="flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2"
								class:border-blue-500={gameRules === 'free-play'}
								class:border-transparent={gameRules !== 'free-play'}
								class:ring-2={gameRules === 'free-play'}
								class:ring-blue-500={gameRules === 'free-play'}
								role="menu"
								aria-hidden="true"
								onclick={() => (gameRules = 'free-play')}
							>
								<div
									class="w-6 h-6 rounded-full border-2 border-zinc-500 mb-3 flex items-center justify-center"
								>
									{#if gameRules === 'free-play'}
										<div class="w-3 h-3 rounded-full bg-blue-500"></div>
									{/if}
								</div>
								<p class="font-medium text-white text-center">Free Play</p>
								<p class="text-xs text-gray-400 text-center mt-1">Play in any board at any time</p>
							</div>
						</div>
					</div>

					<!-- Game Mode Options -->
					<div class="flex flex-col gap-2">
						<h3 class="text-lg font-semibold text-white">Game Mode</h3>
						<div class="grid grid-cols-2 gap-2">
							<!-- Human vs Human Option -->
							<div
								class="flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2"
								class:border-blue-500={gameMode === 'human-vs-human'}
								class:border-transparent={gameMode !== 'human-vs-human'}
								class:ring-2={gameMode === 'human-vs-human'}
								class:ring-blue-500={gameMode === 'human-vs-human'}
								role="menu"
								aria-hidden="true"
								onclick={() => (gameMode = 'human-vs-human')}
							>
								<div
									class="w-6 h-6 rounded-full border-2 border-zinc-500 mb-3 flex items-center justify-center"
								>
									{#if gameMode === 'human-vs-human'}
										<div class="w-3 h-3 rounded-full bg-blue-500"></div>
									{/if}
								</div>
								<div class="flex items-center gap-2 justify-center mb-1">
									<Fa icon={faUser} class="text-rose-500 text-sm" />
									<span class="font-medium text-white">vs</span>
									<Fa icon={faUser} class="text-sky-500 text-sm" />
								</div>
								<p class="text-xs text-gray-400 text-center">Play against another person</p>
							</div>

							<!-- Human vs CPU Option -->
							<div
								class="flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 border-2"
								class:border-blue-500={gameMode === 'human-vs-cpu'}
								class:border-transparent={gameMode !== 'human-vs-cpu'}
								class:ring-2={gameMode === 'human-vs-cpu'}
								class:ring-blue-500={gameMode === 'human-vs-cpu'}
								role="menu"
								aria-hidden="true"
								onclick={() => (gameMode = 'human-vs-cpu')}
							>
								<div
									class="w-6 h-6 rounded-full border-2 border-zinc-500 mb-3 flex items-center justify-center"
								>
									{#if gameMode === 'human-vs-cpu'}
										<div class="w-3 h-3 rounded-full bg-blue-500"></div>
									{/if}
								</div>
								<div class="flex items-center gap-2 justify-center mb-1">
									<Fa icon={faUser} class="text-rose-500 text-sm" />
									<span class="font-medium text-white">vs</span>
									<Fa icon={faRobot} class="text-sky-500 text-sm" />
								</div>
								<p class="text-xs text-gray-400 text-center">Play against CPU (Coming soon)</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Action buttons -->
				<div class="w-full flex flex-col gap-3">
					<button
						class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center gap-2 font-semibold cursor-pointer"
						onclick={() => {
							// Apply settings without resetting
							applySettings();
							showSettingsModal = false;
						}}
					>
						Apply Settings
					</button>

					<button
						class="w-full px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors flex items-center justify-center gap-2 font-semibold cursor-pointer"
						onclick={() => {
							// Apply settings and start a new game
							resetGame();
							showSettingsModal = false;
						}}
					>
						Apply & New Game
					</button>
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
				class="bg-zinc-900/95 p-8 rounded-xl shadow-2xl flex flex-col items-center w-full max-w-[50vw] max-h-[90vh] overflow-y-auto"
			>
				<div class="w-full flex justify-between items-center mb-6">
					<h2 class="text-3xl font-bold text-white flex items-center gap-2">
						<Fa icon={faCircleInfo} />
						<span>How to Play</span>
					</h2>
					<button
						class="text-gray-400 hover:text-white transition-colors"
						onclick={() => (showHowToPlayModal = false)}
					>
						<Fa icon={faTimes} size="lg" />
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
								<span class="font-semibold text-blue-400">Standard Mode:</span> Your move determines
								where your opponent plays next. If you play in the top-right cell of any small board,
								your opponent must play in the top-right small board.
							</li>
							<li>Active boards that can be played on have white highlighting.</li>
							<li>
								If a move would send your opponent to a completed board, they can play on any
								available board.
							</li>
							<li>
								<span class="font-semibold text-blue-400">Free Play Mode:</span> Players can move in
								any valid board at any time.
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
				</div>

				<button
					class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors mt-6 font-semibold cursor-pointer"
					onclick={() => (showHowToPlayModal = false)}
				>
					Got It!
				</button>
			</div>
		</div>
	{/if}
</div>
