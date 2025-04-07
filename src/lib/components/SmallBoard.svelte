<script lang="ts">
	import Cell from './Cell.svelte';
	import Fa from 'svelte-fa';
	import { faXmark, faO } from '@fortawesome/free-solid-svg-icons';

	// Props
	let { boardIndex, board, isActive, onCellClick, winner, lastMove } = $props<{
		boardIndex: number; // Index from 0-8 for the board
		board: (string | null)[][];
		isActive: boolean;
		onCellClick: (boardIndex: number, cellIndex: number) => void;
		winner: string | null;
		lastMove: {
			boardIndex: number; // Index from 0-8 for the board
			cellIndex: number; // Index from 0-8 for the cell within the board
			player: string;
		} | null;
	}>();
</script>

<div
	class="w-full h-full relative rounded-lg border-2 transition-all duration-300 ease-in-out aspect-square overflow-hidden p-[3px] bg-zinc-600"
	class:border-white={isActive && !winner}
	class:border-zinc-600={!isActive || winner}
	class:opacity-60={!isActive}
	class:ring-white={isActive && !winner}
	class:animate-ring-pulse={isActive && !winner}
	class:ring-2={isActive && !winner}
>
	<div
		class="w-full h-full grid grid-cols-3 grid-rows-3 gap-1.5 relative overflow-hidden bg-zinc-600"
	>
		{#if winner}
			<div class="absolute inset-0 flex items-center justify-center bg-zinc-800 bg-opacity-70 z-10">
				{#if winner === 'X'}
					<Fa icon={faXmark} class="text-red-500 text-5xl" />
				{:else if winner === 'O'}
					<Fa icon={faO} class="text-blue-500 text-5xl" />
				{/if}
			</div>
		{/if}

		{#each Array(3) as _, row}
			{#each Array(3) as _, col}
				{@const cellIndex = row * 3 + col}
				<Cell
					{row}
					{col}
					value={board[row][col]}
					isActive={isActive && !winner}
					onClick={() => onCellClick(boardIndex, cellIndex)}
					isLastMove={lastMove !== null &&
						lastMove.boardIndex === boardIndex &&
						lastMove.cellIndex === cellIndex}
				/>
			{/each}
		{/each}
	</div>
</div>

<style>
	.animate-ring-pulse {
		animation: ring-pulse 1.5s ease-in-out infinite;
	}

	@keyframes ring-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 1px #fff;
		}
		50% {
			box-shadow: 0 0 0 3px #fff;
		}
	}
</style>
