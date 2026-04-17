<script lang="ts">
	import type { LayoutData } from './$types';

	let { children }: { data: LayoutData; children: any } = $props();
</script>

<main class="editor-layout">
	{@render children()}
</main>

<!-- FeedbackModal is on the root layout. -->

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
