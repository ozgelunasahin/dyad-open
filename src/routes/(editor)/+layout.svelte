<script lang="ts">
	import type { LayoutData } from './$types';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<div class="editor-app-layout">
	<Sidebar username={data.username} attentionCount={data.attentionCount} isAdmin={data.isAdmin} />

	<main class="editor-layout">
		{@render children()}
	</main>
</div>

<FeedbackModal />

<style>
	.editor-app-layout {
		display: flex;
		min-height: 100vh;
		background: var(--bg-canvas);
	}

	.editor-layout {
		flex: 1;
		min-width: 0;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 2rem 2rem;
	}

	@media (max-width: 768px) {
		.editor-layout { padding: 0 1rem 1rem; }
	}
</style>
