<script lang="ts">
	import type { PromptSummary } from '$lib/domain/types';
	import { copy } from '$lib/copy';

	interface Props {
		prompt: PromptSummary;
		href?: string;
		onclick?: () => void;
		hideAuthor?: boolean;
	}

	let { prompt, href, onclick, hideAuthor = false }: Props = $props();

	function formatSlotDates(slots: { start_time: string }[]): string {
		const dates = new Set<string>();
		for (const s of slots) {
			const d = new Date(s.start_time);
			dates.add(d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
		}
		return [...dates].join(' · ');
	}

	function uniqueAreas(slots: { general_area: string }[]): string {
		return slots.map(s => s.general_area).filter((v, i, a) => a.indexOf(v) === i).join(', ');
	}
</script>

{#snippet content()}
	<div class="prompt-row">
		<div class="row-thumb">
			{#if prompt.cover_image_url}
				<img src={prompt.cover_image_url} alt="" class="thumb-img" />
			{:else}
				<div class="thumb-placeholder"></div>
			{/if}
		</div>
		<div class="row-body">
			<div class="row-top">
				<h3 class="row-title">{prompt.title ?? copy.common.untitled}</h3>
				<span class="date">{formatSlotDates(prompt.available_slots)}</span>
			</div>
			{#if prompt.body_snippet}
				<p class="row-snippet">{prompt.body_snippet}</p>
			{/if}
			<div class="row-meta">
				<span class="area">{uniqueAreas(prompt.available_slots)}</span>
				<span class="author" class:anonymised={hideAuthor}>
					@{hideAuthor ? prompt.author_username.replace(/./g, '•') : prompt.author_username}
				</span>
			</div>
		</div>
	</div>
{/snippet}

{#if href}
	<a {href} class="prompt-item">
		{@render content()}
	</a>
{:else}
	<button class="prompt-item" {onclick}>
		{@render content()}
	</button>
{/if}

<style>
	.prompt-item {
		border-bottom: 1px solid var(--border-link);
		text-decoration: none;
		color: inherit;
		display: block;
		width: 100%;
		background: none;
		border-left: none;
		border-right: none;
		border-top: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.prompt-item:last-child { border-bottom: none; }
	.prompt-item:hover { opacity: var(--opacity-hover-card); }

	.prompt-row {
		display: flex;
		gap: var(--space-5);
		padding: var(--space-6) 0;
		align-items: stretch;
	}

	.prompt-row:hover {
		background: var(--bg-control);
		margin: 0 calc(-1 * var(--space-3));
		padding-left: var(--space-3);
		padding-right: var(--space-3);
		border-radius: var(--radius-input);
	}

	.row-thumb {
		position: relative;
		flex-shrink: 0;
		width: 88px;
		min-height: 96px;
		border-radius: var(--radius-input);
		overflow: hidden;
		align-self: stretch;
	}

	.thumb-placeholder {
		position: absolute;
		inset: 0;
		background: var(--bg-control);
		border: 1px solid var(--border-link);
		border-radius: inherit;
	}

	.row-body { flex: 1; min-width: 0; }

	.row-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-3);
	}

	.row-title {
		margin: 0;
		font-size: var(--text-lg);
		font-weight: 500;
		color: var(--text-primary);
		line-height: 1.3;
		min-width: 0;
	}

	.date {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: var(--text-sm);
		white-space: nowrap;
	}

	.row-snippet {
		margin: var(--space-1) 0 0;
		color: var(--text-secondary);
		font-size: var(--text-base);
		line-height: 1.55;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.row-meta {
		display: flex;
		justify-content: space-between;
		gap: var(--space-3);
		align-items: center;
		margin-top: var(--space-1);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	.thumb-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

	.author { font-family: var(--font-mono); font-size: var(--text-sm); }
	.author.anonymised { filter: blur(4px); user-select: none; }
	.area { font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 0.03em; }

	@media (max-width: 430px) {
		.row-thumb { width: 88px; }
		.row-top { flex-direction: column; align-items: flex-start; gap: var(--space-1); }
		.date { font-size: var(--text-xs); }
	}
</style>
