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
	class="w-full h-full flex items-center justify-center text-xl font-bold transition-all duration-200 aspect-square rounded-md bg-zinc-800"
	class:hover:bg-zinc-700={isActive && !value}
	class:red-tint={isLastMove && value === 'X'}
	class:blue-tint={isLastMove && value === 'O'}
	onclick={onClick}
	disabled={!isActive || value !== null}
>
	{#if value === 'X'}
		<Fa icon={faXmark} class="text-red-500 text-5xl" />
	{:else if value === 'O'}
		<Fa icon={faO} class="text-sky-500 text-5xl" />
	{/if}
</button>
