<script lang="ts">
	interface Props {
		visible: boolean;
	}

	let { visible }: Props = $props();

	const shortcuts = [
		{ key: '[[...]]', desc: 'Create link' },
		{ key: '[', desc: 'Link selection' },
		{ key: 'Ctrl+K', desc: 'Link selection' },
		{ key: 'Tab', desc: 'Enter link mode' },
		{ key: 'Tab/Shift+Tab', desc: 'Cycle links' },
		{ key: 'Enter/Right', desc: 'Follow link' },
		{ key: 'Esc', desc: 'Back/Close' },
		{ key: 'Left', desc: 'Go back (close)' },
		{ key: 'Ctrl+Left', desc: 'Go back (keep)' },
		{ key: 'Up/Down', desc: 'Scroll' },
		{ key: 'e', desc: 'Edit' },
		{ key: 'l', desc: 'Toggle lines' },
		{ key: 'Ctrl +/-/0', desc: 'Zoom' },
		{ key: '?', desc: 'Toggle help' }
	];
</script>

{#if visible}
	<div class="help-bar">
		{#each shortcuts as { key, desc }}
			<span class="shortcut">
				<kbd>{key}</kbd>
				<span class="desc">{desc}</span>
			</span>
		{/each}
	</div>
{/if}

<style>
	.help-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 12px 24px;
		padding: 12px 24px;
		background: var(--bg-canvas);
		border-top: 1px solid var(--border-link);
		z-index: 100;
		font-size: 0.85rem;
	}

	.shortcut {
		display: flex;
		align-items: center;
		gap: 6px;
		white-space: nowrap;
	}

	kbd {
		padding: 2px 6px;
		background: var(--bg-code);
		border: 1px solid var(--border-link);
		border-radius: 3px;
		font-family: inherit;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.desc {
		color: var(--text-muted);
	}
</style>
