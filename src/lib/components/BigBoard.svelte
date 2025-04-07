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
		faRotate
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

	// Handle cell click
	function handleCellClick(boardIndex: number, cellIndex: number) {
		if (!isInitialized) return;
		game.makeMove(boardIndex, cellIndex);
		gameState = game.getState();
	}

	// Reset game
	function resetGame() {
		if (!isInitialized) return;
		game.resetGame();
		gameState = game.getState();
	}

	// Initialize game
	onMount(() => {
		// Try to load saved game state from localStorage
		const savedState = loadGameState();

		// Initialize game with saved state or create a new game
		game = createGameState(savedState || undefined);
		gameState = game.getState();

		// Save initial state if it's a new game
		if (!savedState) {
			game.saveState();
		}

		isInitialized = true;
	});
</script>

<div class="flex flex-col items-center gap-4 w-full max-w-[550px] mx-auto">
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
				<Fa icon={faUser} class="text-xl" />
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
</div>
