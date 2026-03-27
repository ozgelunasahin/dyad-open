<script lang="ts">
	let { children } = $props();
</script>

<main class="editor-layout">
	{@render children()}
</main>

<style>
	.editor-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 2rem 2rem;
	}

	@media (max-width: 430px) {
		.editor-layout {
			padding: 0 1rem 1rem;
		}
	}
</style>
