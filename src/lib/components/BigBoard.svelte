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
	let gameMode = $state<'human-vs-human' | 'human-vs-cpu'>('human-vs-human');
	let gameRules = $state<'standard' | 'free-play'>('standard');

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

		isInitialized = true;
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
		>
			<div class="bg-zinc-900 p-8 rounded-xl shadow-2xl flex flex-col items-center w-full max-w-md">
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
					<!-- Game Rules Toggle -->
					<div class="flex flex-col gap-2">
						<h3 class="text-lg font-semibold text-white">Game Rules</h3>
						<div class="flex items-center bg-zinc-800 p-4 rounded-lg justify-between">
							<div>
								<p class="text-white">
									{gameRules === 'standard' ? 'Standard' : 'Free Play'}
								</p>
								<p class="text-sm text-gray-400">
									{gameRules === 'standard'
										? 'Next board determined by last move'
										: 'Move in any board at any time'}
								</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									class="sr-only peer"
									checked={gameRules === 'free-play'}
									onchange={() => {
										gameRules = gameRules === 'standard' ? 'free-play' : 'standard';
									}}
								/>
								<div
									class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
								></div>
							</label>
						</div>
					</div>

					<!-- Game Mode Toggle -->
					<div class="flex flex-col gap-2">
						<h3 class="text-lg font-semibold text-white">Game Mode</h3>
						<div class="flex items-center bg-zinc-800 p-4 rounded-lg justify-between">
							<div>
								<p class="text-white">
									{gameMode === 'human-vs-human' ? 'Human vs Human' : 'Human vs CPU'}
								</p>
								<p class="text-sm text-gray-400">
									{gameMode === 'human-vs-human'
										? 'Play against another person'
										: 'Play against the computer (Coming soon)'}
								</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									class="sr-only peer"
									checked={gameMode === 'human-vs-cpu'}
									onchange={() => {
										gameMode = gameMode === 'human-vs-human' ? 'human-vs-cpu' : 'human-vs-human';
									}}
								/>
								<div
									class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
								></div>
							</label>
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
</div>
