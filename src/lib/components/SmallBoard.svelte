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
	class="w-full h-full grid grid-cols-3 grid-rows-3 gap-[1px] p-[2px] relative rounded-sm transition-all duration-200 aspect-square"
	class:border-2={isActive && !winner}
	class:border-white={isActive && !winner}
	class:border-0={!isActive || winner}
	class:opacity-90={winner !== null}
	class:animate-pulse={isActive && !winner}
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
