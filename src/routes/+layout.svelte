<script lang="ts">
	import '../app.css';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';

	let { children } = $props();
</script>

<div class="app">
	<main>
		{@render children()}
		{injectAnalytics()}
	</main>
</div>
