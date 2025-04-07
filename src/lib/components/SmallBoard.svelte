<script lang="ts">
	import Cell from './Cell.svelte';

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
	class="w-full h-full relative rounded-xl transition-all duration-300 ease-in-out aspect-square overflow-hidden p-[3px] bg-zinc-600 border-2 border-zinc-600"
	class:!border-rose-500={winner === 'X'}
	class:!border-sky-500={winner === 'O'}
	class:!border-7={winner}
	class:red-tint={winner === 'X'}
	class:blue-tint={winner === 'O'}
	class:animate-ring-pulse={isActive && !winner}
	class:ring-white={isActive && !winner}
	class:opacity-60={winner}
>
	<div
		class="w-full h-full grid grid-cols-3 grid-rows-3 gap-1.5 p-0.5 relative overflow-hidden"
		class:!red-tint={winner === 'X'}
		class:!blue-tint={winner === 'O'}
	>
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
			box-shadow: 0 0 0 2px #fff;
		}
		50% {
			box-shadow: 0 0 0 4px #fff;
		}
	}

	.red-tint {
		background-color: rgba(239, 68, 68, 0.08) !important; /* red-500 with opacity */
	}

	.blue-tint {
		background-color: rgba(59, 130, 246, 0.08) !important; /* blue-500 with opacity */
	}
</style>
