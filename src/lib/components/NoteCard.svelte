<script lang="ts">
	import type { Card, Point } from '$lib/types';
	import { CARD_WIDTH, CARD_HEIGHT } from '$lib/types';
	import { parseMarkdown } from '$lib/utils/markdown';
	import { canvasStore } from '$lib/stores/canvas.svelte';

	interface Props {
		card: Card;
		isActive: boolean;
		onLinkClick: (noteId: string, fromCardId: string, linkPosition: Point) => void;
	}

	let { card, isActive, onLinkClick }: Props = $props();

	let html = $derived(parseMarkdown(card.note.content));

	function handleClick(event: MouseEvent) {
		const target = event.target as HTMLElement;

		if (target.classList.contains('wikilink')) {
			event.preventDefault();
			event.stopPropagation();

			const noteId = target.dataset.target;
			if (!noteId) return;

			if (canvasStore.isLinkBroken(noteId)) {
				return;
			}

			const rect = target.getBoundingClientRect();
			const linkPosition: Point = {
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2
			};

			onLinkClick(noteId, card.id, linkPosition);
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
	width={CARD_WIDTH}
	height={CARD_HEIGHT}
	class="text-block-container"
>
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		xmlns="http://www.w3.org/1999/xhtml"
		class="text-block"
		class:dimmed={!isActive}
		onclick={handleClick}
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
		overflow-y: auto;
		font-family: 'Georgia', 'Times New Roman', 'Noto Serif', serif;
		font-size: 14px;
		line-height: 1.7;
		color: #e8e6e3;
		transition: opacity 0.3s ease;
		padding: 8px 0;
	}

	.text-block.dimmed {
		opacity: 0.35;
	}

	.text-block :global(h1) {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 16px 0;
		color: #f5f3f0;
		letter-spacing: -0.01em;
	}

	.text-block :global(h2) {
		font-size: 15px;
		font-weight: 600;
		margin: 20px 0 10px 0;
		color: #f5f3f0;
	}

	.text-block :global(h3) {
		font-size: 14px;
		font-weight: 600;
		margin: 16px 0 8px 0;
		color: #e8e6e3;
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
		background: rgba(255, 255, 255, 0.08);
		padding: 2px 5px;
		border-radius: 3px;
		font-size: 12px;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
		color: #d4d0c8;
	}

	.text-block :global(pre) {
		background: rgba(255, 255, 255, 0.05);
		padding: 12px;
		border-radius: 4px;
		overflow-x: auto;
		margin: 0 0 14px 0;
		border-left: 2px solid rgba(255, 255, 255, 0.15);
	}

	.text-block :global(pre code) {
		background: none;
		padding: 0;
	}

	.text-block :global(strong) {
		font-weight: 600;
		color: #f5f3f0;
	}

	.text-block :global(em) {
		font-style: italic;
	}

	.text-block :global(.wikilink) {
		background: none;
		border: none;
		color: #b8b4ac;
		text-decoration: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.25);
		cursor: pointer;
		padding: 0;
		font: inherit;
		transition: all 0.15s ease;
	}

	.text-block :global(.wikilink:hover) {
		color: #f5f3f0;
		border-bottom-color: rgba(255, 255, 255, 0.5);
	}

	.text-block :global(.wikilink.broken) {
		color: #666;
		border-bottom-color: rgba(255, 255, 255, 0.1);
		cursor: not-allowed;
	}

	.text-block :global(.wikilink.broken:hover) {
		color: #666;
		border-bottom-color: rgba(255, 255, 255, 0.1);
	}

	/* Scrollbar styling for dark theme */
	.text-block::-webkit-scrollbar {
		width: 4px;
	}

	.text-block::-webkit-scrollbar-track {
		background: transparent;
	}

	.text-block::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 2px;
	}

	.text-block::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.25);
	}
</style>
