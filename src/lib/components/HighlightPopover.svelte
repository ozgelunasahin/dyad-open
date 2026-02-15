<script lang="ts">
	let {
		x,
		y,
		onHighlight
	}: {
		x: number;
		y: number;
		onHighlight: () => void;
	} = $props();
</script>

<div class="highlight-popover" style="left: {x}px; top: {y}px;">
	<button class="highlight-btn" onclick={onHighlight}>
		Highlight & Comment
	</button>
</div>

<style>
	.highlight-popover {
		position: fixed;
		z-index: 1000;
		transform: translate(-50%, -100%);
		margin-top: -8px;
	}

	.highlight-btn {
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		border: none;
		border-radius: 6px;
		padding: 6px 14px;
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
		transition: opacity 0.15s;
	}

	.highlight-btn:hover {
		opacity: 0.85;
	}
</style>
