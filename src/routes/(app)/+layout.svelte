<script lang="ts">
	import type { LayoutData } from './$types';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<main class="main-content">
	{@render children()}
</main>

<FeedbackModal isAdmin={data.isAdmin} />

<style>
	.main-content {
		min-height: 100vh;
		background: var(--bg-canvas);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
