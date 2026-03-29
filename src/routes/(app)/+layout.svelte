<script lang="ts">
	import type { LayoutData } from './$types';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<div class="app-layout">
	<Sidebar username={data.username} attentionCount={data.attentionCount} isAdmin={data.isAdmin} />

	<main class="main-content">
		{@render children()}
	</main>
</div>

<FeedbackModal />

<style>
	.app-layout {
		display: flex;
		min-height: 100vh;
		background: var(--bg-canvas);
	}

	.main-content { flex: 1; min-width: 0; padding: 2rem; display: flex; flex-direction: column; align-items: center; }

	@media (max-width: 768px) {
		.main-content { padding: 1rem; }
	}
</style>
