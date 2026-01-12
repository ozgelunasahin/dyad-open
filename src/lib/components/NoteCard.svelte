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

			// Check if link is broken
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
	class="card-container"
>
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		xmlns="http://www.w3.org/1999/xhtml"
		class="card"
		class:dimmed={!isActive}
		onclick={handleClick}
	>
		<header class="card-header">
			<h2>{card.note.title}</h2>
		</header>
		<div class="card-content" bind:this={contentEl}>
			{@html html}
		</div>
	</div>
</foreignObject>

<style>
	.card-container {
		overflow: visible;
	}

	.card {
		background: white;
		border-radius: 12px;
		box-shadow:
			0 4px 6px -1px rgb(0 0 0 / 0.1),
			0 2px 4px -2px rgb(0 0 0 / 0.1);
		overflow: hidden;
		height: 100%;
		display: flex;
		flex-direction: column;
		transition:
			opacity 0.2s ease,
			filter 0.2s ease,
			box-shadow 0.2s ease;
		border: 1px solid #e2e8f0;
	}

	.card:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.card.dimmed {
		opacity: 0.5;
		filter: saturate(0.7);
	}

	.card:not(.dimmed) {
		box-shadow:
			0 10px 15px -3px rgb(0 0 0 / 0.1),
			0 4px 6px -4px rgb(0 0 0 / 0.1);
	}

	.card-header {
		padding: 12px 16px;
		border-bottom: 1px solid #e2e8f0;
		background: #f8fafc;
		flex-shrink: 0;
	}

	.card-header h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #1e293b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-content {
		padding: 16px;
		overflow-y: auto;
		flex: 1;
		font-size: 13px;
		line-height: 1.6;
		color: #334155;
	}

	.card-content :global(h1) {
		font-size: 16px;
		margin: 0 0 12px 0;
		color: #1e293b;
	}

	.card-content :global(h2) {
		font-size: 14px;
		margin: 16px 0 8px 0;
		color: #1e293b;
	}

	.card-content :global(h3) {
		font-size: 13px;
		margin: 12px 0 6px 0;
		color: #1e293b;
	}

	.card-content :global(p) {
		margin: 0 0 12px 0;
	}

	.card-content :global(ul),
	.card-content :global(ol) {
		margin: 0 0 12px 0;
		padding-left: 20px;
	}

	.card-content :global(li) {
		margin-bottom: 4px;
	}

	.card-content :global(code) {
		background: #f1f5f9;
		padding: 2px 4px;
		border-radius: 4px;
		font-size: 12px;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
	}

	.card-content :global(pre) {
		background: #f1f5f9;
		padding: 12px;
		border-radius: 6px;
		overflow-x: auto;
		margin: 0 0 12px 0;
	}

	.card-content :global(pre code) {
		background: none;
		padding: 0;
	}

	.card-content :global(strong) {
		font-weight: 600;
		color: #1e293b;
	}

	.card-content :global(.wikilink) {
		background: none;
		border: none;
		color: #3b82f6;
		text-decoration: underline;
		text-decoration-color: #93c5fd;
		text-underline-offset: 2px;
		cursor: pointer;
		padding: 0;
		font: inherit;
		transition: all 0.15s ease;
	}

	.card-content :global(.wikilink:hover) {
		color: #2563eb;
		text-decoration-color: #3b82f6;
	}

	.card-content :global(.wikilink.broken) {
		color: #94a3b8;
		text-decoration-color: #cbd5e1;
		cursor: not-allowed;
	}

	.card-content :global(.wikilink.broken:hover) {
		color: #94a3b8;
	}
</style>
