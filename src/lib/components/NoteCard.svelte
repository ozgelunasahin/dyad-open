<script lang="ts">
	import type { Card, Point } from '$lib/types';
	import { parseMarkdown } from '$lib/utils/markdown';
	import { canvasStore } from '$lib/stores/canvas.svelte';

	interface Props {
		card: Card;
		isActive: boolean;
		onLinkClick: (noteId: string, fromCardId: string, linkPosition: Point) => void;
	}

	let { card, isActive, onLinkClick }: Props = $props();

	let html = $derived(parseMarkdown(card.note.content));

	function handleInteraction(target: HTMLElement) {
		if (!target.classList.contains('wikilink')) return;

		const noteId = target.dataset.target;
		if (!noteId) return;

		if (canvasStore.isLinkBroken(noteId)) return;

		const rect = target.getBoundingClientRect();
		const linkPosition: Point = {
			x: rect.left, // Start of link text (left edge) - line replaces underline
			y: rect.bottom // Bottom of link (underline level)
		};

		onLinkClick(noteId, card.id, linkPosition);

		// Mark link as active (connection line replaces underline)
		target.classList.add('has-connection');
	}

	function handleClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.classList.contains('wikilink')) {
			event.preventDefault();
			event.stopPropagation();
			handleInteraction(target);
		} else {
			// Click on card body - focus this card for scrolling
			canvasStore.focusCard(card.id);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			const target = event.target as HTMLElement;
			if (target.classList.contains('wikilink')) {
				event.preventDefault();
				handleInteraction(target);
			}
		}
	}

	function processBrokenLinks(container: HTMLElement) {
		const wikilinks = container.querySelectorAll('.wikilink');
		wikilinks.forEach((link) => {
			const target = (link as HTMLElement).dataset.target;
			if (target && canvasStore.isLinkBroken(target)) {
				link.classList.add('broken');
			}
		});
	}

	let contentEl: HTMLDivElement;

	$effect(() => {
		if (contentEl && html) {
			processBrokenLinks(contentEl);
		}
	});
</script>

<foreignObject
	x={card.position.x}
	y={card.position.y}
	width={card.dimensions.width}
	height={card.dimensions.height}
	class="text-block-container"
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		xmlns="http://www.w3.org/1999/xhtml"
		class="text-block"
		class:dimmed={!isActive}
		onclick={handleClick}
		onkeydown={handleKeyDown}
		bind:this={contentEl}
	>
		{@html html}
	</div>
</foreignObject>

<style>
	.text-block-container {
		overflow: visible;
	}

	.text-block {
		height: 100%;
		overflow: hidden;
		font-family: 'Georgia', 'Times New Roman', 'Noto Serif', serif;
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
		transition: opacity 0.3s ease, color 0.3s ease;
		padding: 8px 0;
	}

	.text-block.dimmed {
		opacity: var(--dimmed-opacity);
	}

	.text-block :global(h1) {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 16px 0;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.text-block :global(h2) {
		font-size: 15px;
		font-weight: 600;
		margin: 20px 0 10px 0;
		color: var(--text-primary);
	}

	.text-block :global(h3) {
		font-size: 14px;
		font-weight: 600;
		margin: 16px 0 8px 0;
		color: var(--text-secondary);
	}

	.text-block :global(p) {
		margin: 0 0 14px 0;
		text-align: justify;
		hyphens: auto;
	}

	.text-block :global(ul),
	.text-block :global(ol) {
		margin: 0 0 14px 0;
		padding-left: 18px;
	}

	.text-block :global(li) {
		margin-bottom: 6px;
	}

	.text-block :global(code) {
		background: var(--bg-code);
		padding: 2px 5px;
		border-radius: 3px;
		font-size: 12px;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
		color: var(--text-muted);
	}

	.text-block :global(pre) {
		background: var(--bg-code-block);
		padding: 12px;
		border-radius: 4px;
		overflow-x: auto;
		margin: 0 0 14px 0;
		border-left: 2px solid var(--border-code);
	}

	.text-block :global(pre code) {
		background: none;
		padding: 0;
	}

	.text-block :global(strong) {
		font-weight: 600;
		color: var(--text-primary);
	}

	.text-block :global(em) {
		font-style: italic;
	}

	.text-block :global(.wikilink) {
		background: none;
		border: none;
		color: var(--text-link);
		text-decoration: none;
		border-bottom: 1px solid var(--border-link);
		cursor: pointer;
		padding: 0;
		font: inherit;
		transition: all 0.15s ease;
	}

	.text-block :global(.wikilink:hover) {
		color: var(--text-link-hover);
		border-bottom-color: var(--border-link-hover);
	}

	.text-block :global(.wikilink.broken) {
		color: var(--text-muted);
		border-bottom-color: var(--border-code);
		cursor: not-allowed;
		opacity: 0.5;
	}

	.text-block :global(.wikilink.broken:hover) {
		color: var(--text-muted);
		border-bottom-color: var(--border-code);
	}

	/* Hide underline when connection line replaces it */
	.text-block :global(.wikilink.has-connection) {
		border-bottom-color: transparent;
	}

	/* Scrollbar styling - hidden since we use full height */
	.text-block::-webkit-scrollbar {
		width: 0;
		display: none;
	}
</style>
