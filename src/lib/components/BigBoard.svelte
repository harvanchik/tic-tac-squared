<script lang="ts">
	import SmallBoard from './SmallBoard.svelte';
	import { createGameState } from '../game/GameState';
	import { onMount } from 'svelte';
	import Fa from 'svelte-fa';
	import { faXmark, faO, faUser } from '@fortawesome/free-solid-svg-icons';

	// Game state
	const game = createGameState();
	let gameState = $state(game.getState());

	// Handle cell click
	function handleCellClick(boardIndex: number, cellIndex: number) {
		game.makeMove(boardIndex, cellIndex);
		gameState = game.getState();
	}

	// Reset game
	function resetGame() {
		game.resetGame();
		gameState = game.getState();
	}

	// Initialize game
	onMount(() => {
		gameState = game.getState();
	});
</script>

<div class="flex flex-col items-center gap-4 w-full max-w-[800px] mx-auto">
	<!-- Game status bar -->
	<div class="w-full mb-4">
		<!-- Player indicators -->
		<div class="flex justify-between items-center w-full">
			<!-- Player X -->
			<div
				class="flex items-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 text-red-500 shadow-red-700/30 shadow-lg"
				class:bg-red-900={gameState.currentPlayer === 'X'}
				class:bg-opacity-30={gameState.currentPlayer === 'X'}
				class:shadow-lg={gameState.currentPlayer === 'X'}
			>
				<Fa icon={faUser} class="text-xl" />
				<Fa icon={faXmark} class="text-2xl" />
			</div>

			<!-- Player O -->
			<div
				class="flex items-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 text-blue-500 shadow-blue-800/30 shadow-lg ring-blue-600"
				class:bg-blue-900={gameState.currentPlayer === 'O'}
				class:bg-opacity-30={gameState.currentPlayer === 'O'}
				class:shadow-lg={gameState.currentPlayer === 'O'}
			>
				<Fa icon={faUser} class="text-xl" />
				<Fa icon={faO} class="text-2xl" />
			</div>
		</div>
	</div>

	<!-- Main game board -->
	<div class="grid grid-cols-3 grid-rows-3 gap-1 bg-zinc-800 p-1 rounded-lg w-full aspect-square">
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
	<div class="flex gap-4 mt-4 w-full justify-center">
		<button
			class="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors flex items-center gap-2"
		>
			<i class="fa-solid fa-circle-info"></i>
			How to Play
		</button>

		<button
			class="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors flex items-center gap-2"
		>
			<i class="fa-solid fa-gear"></i>
			Settings
		</button>

		<button
			class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center gap-2"
			onclick={resetGame}
		>
			<i class="fa-solid fa-rotate"></i>
			New Game
		</button>
	</div>
</div>
