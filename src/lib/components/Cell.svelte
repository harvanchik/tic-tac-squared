<script lang="ts">
	import Fa from 'svelte-fa';
	import { faXmark, faO } from '@fortawesome/free-solid-svg-icons';

	// Props
	let { value, onClick, isActive, isLastMove } = $props<{
		row?: number; // Not used directly in the component
		col?: number; // Not used directly in the component
		value: string | null;
		onClick: () => void;
		isActive: boolean;
		isLastMove?: boolean; // Whether this cell was the last move played
	}>();
</script>

<button
	class="w-full h-full flex items-center justify-center border border-zinc-700 text-xl font-bold transition-all duration-200 aspect-square bg-blue-400"
	class:bg-zinc-700={isActive && !value}
	class:bg-zinc-800={!isActive || value}
	class:hover:bg-zinc-600={isActive && !value}
	class:border-zinc-600={!isActive || value}
	class:bg-red-400={isLastMove && value === 'X'}
	class:bg-blue-400={isLastMove && value === 'O'}
	onclick={onClick}
	disabled={!isActive || value !== null}
>
	{#if value === 'X'}
		<Fa icon={faXmark} class="text-red-500 text-7xl" />
	{:else if value === 'O'}
		<Fa icon={faO} class="text-blue-500 text-6xl" />
	{/if}
</button>
