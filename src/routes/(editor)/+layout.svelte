<script lang="ts">
	import type { LayoutData } from './$types';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<main class="editor-layout">
	{@render children()}
</main>

<FeedbackModal isAdmin={data.isAdmin} />

<style>
	.editor-layout {
		min-height: 100vh;
		background: var(--bg-canvas);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 var(--space-4) var(--space-4);
	}
</style>
