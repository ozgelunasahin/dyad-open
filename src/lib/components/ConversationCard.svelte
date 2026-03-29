<script lang="ts">
	import type { PromptSummary } from '$lib/domain/types';

	interface Props {
		prompt: PromptSummary;
		onclick?: () => void;
	}

	let { prompt, onclick }: Props = $props();

	function formatDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<button class="card" {onclick} type="button">
	<div class="thumb">
		{#if prompt.cover_image_url}
			<img src={prompt.cover_image_url} alt="" class="thumb-img" loading="lazy" />
		{:else}
			<div class="thumb-placeholder"></div>
		{/if}
	</div>
	<div class="body">
		<div class="meta-row">
			{#if prompt.available_slots[0]?.general_area}
				<span class="neighbourhood">{prompt.available_slots[0].general_area}</span>
			{/if}
			{#if prompt.soonest_slot}
				<span class="date">{formatDate(prompt.soonest_slot)}</span>
			{/if}
		</div>
		<h3 class="title">{prompt.title}</h3>
		{#if prompt.body_snippet}
			<p class="snippet">{prompt.body_snippet}</p>
		{/if}
	</div>
</button>

<style>
	.card {
		display: flex;
		gap: var(--space-5);
		padding: var(--space-6) var(--space-5);
		border-bottom: 1px solid var(--border-link);
		background: none;
		border-left: none;
		border-right: none;
		border-top: none;
		text-align: left;
		width: 100%;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.card:hover { opacity: 0.72; }

	.thumb {
		width: 88px;
		min-height: 96px;
		flex-shrink: 0;
		border-radius: var(--radius-input);
		overflow: hidden;
		position: relative;
	}

	.thumb-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumb-placeholder {
		position: absolute;
		inset: 0;
		background: var(--bg-control);
	}

	.body { flex: 1; min-width: 0; }

	.meta-row {
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
		margin-bottom: var(--space-1);
	}

	.neighbourhood {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.date {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.title {
		font-size: var(--text-lg);
		font-weight: 500;
		margin: 0 0 var(--space-1);
		line-height: var(--leading-tight);
	}

	.snippet {
		font-size: var(--text-md);
		color: var(--text-secondary);
		margin: 0;
		line-height: var(--leading-normal);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
