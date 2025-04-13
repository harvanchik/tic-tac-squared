<script lang="ts">
	import Fa from 'svelte-fa';
	import { faXmark, faO } from '@fortawesome/free-solid-svg-icons';

	// Props
	let {
		value,
		onClick,
		isActive,
		isLastMove,
		isLocalPlayerTurn = true
	} = $props<{
		row?: number; // Not used directly in the component
		col?: number; // Not used directly in the component
		value: string | null;
		onClick: () => void;
		isActive: boolean;
		isLastMove?: boolean; // Whether this cell was the last move played
		isLocalPlayerTurn?: boolean; // Whether it's the local player's turn in online multiplayer
	}>();
</script>

<button
	class="w-full h-full flex items-center justify-center text-xl font-bold transition-all duration-200 aspect-square rounded-md bg-zinc-800"
	class:hover:bg-zinc-700={isActive && !value && isLocalPlayerTurn}
	class:hover:cursor-pointer={isActive && !value && isLocalPlayerTurn}
	class:hover:cursor-default={isActive && !value && !isLocalPlayerTurn}
	class:red-tint={isLastMove && value === 'X'}
	class:blue-tint={isLastMove && value === 'O'}
	class:!cursor-default={!isActive || value}
	onclick={onClick}
	disabled={!isActive || value !== null}
>
	{#if value === 'X'}
		<Fa icon={faXmark} class="text-rose-500 text-3xl md:text-[2.6rem]" />
	{:else if value === 'O'}
		<Fa icon={faO} class="text-sky-500 text-3xl md:text-[2.6rem]" />
	{/if}
</button>
