<script lang="ts">
	import BigBoard from '$lib/components/BigBoard.svelte';
</script>

<svelte:head>
	<title>Tic Tac Squared</title>
	<meta name="description" content="Ultimate Tic Tac Toe Game" />
</svelte:head>

<section>
	<div
		class="min-h-screen flex flex-col items-center justify-center relative bg-zinc-800 text-white p-4"
	>
		<div class="text-center relative z-10 px-4 mb-4">
			<h1
				class="text-4xl md:text-7xl font-bold bg-linear-to-r/oklch from-red-500 to-sky-500 inline-block text-transparent bg-clip-text mb-2"
			>
				Tic Tac Squared
			</h1>
		</div>

		<div class="w-full max-w-[800px] mx-auto">
			<BigBoard />
		</div>
	</div>
</section>
