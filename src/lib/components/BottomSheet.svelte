<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { PromptSummary } from '$lib/domain/types';

	interface Props {
		prompts: PromptSummary[];
		onCardClick?: (promptId: string) => void;
		hideAuthor?: boolean;
	}

	let { prompts, onCardClick, hideAuthor = false }: Props = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

<div
	class="sheet"
	transition:fly={{ y: 120, duration: 240 }}
>
	<div class="sheet-body">
			{#each prompts as prompt}
				{#snippet cardContent()}
					{#if prompt.cover_image_url}
						<img src={prompt.cover_image_url} alt="" class="card-thumb" loading="lazy" />
					{/if}
					<div class="card-content">
						<h4 class="card-title">{prompt.title}</h4>
						{#if prompt.body_snippet}
							<p class="card-snippet">{prompt.body_snippet}</p>
						{/if}
						<div class="card-meta">
							{#if prompt.soonest_slot}
								<span class="meta-date">{formatDate(prompt.soonest_slot)}</span>
							{/if}
							<span class="meta-author" class:anonymised={hideAuthor}>
								@{hideAuthor ? prompt.author_username.replace(/./g, '•') : prompt.author_username}
							</span>
						</div>
					</div>
				{/snippet}

				{#if onCardClick}
					<button class="sheet-card" onclick={() => onCardClick(prompt.id)}>
						{@render cardContent()}
					</button>
				{:else}
					<a href="/conversations/{prompt.id}" class="sheet-card">
						{@render cardContent()}
					</a>
				{/if}
			{/each}
		</div>
</div>

<style>
	.sheet {
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		background: var(--bg-canvas);
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.18);
		width: 100%;
		max-width: 480px;
		max-height: 50vh;
		overflow-y: auto;
		padding: var(--space-5);
		padding-bottom: var(--nav-clearance);
		box-sizing: border-box;
		z-index: 600;
	}

	.sheet-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.sheet-card {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3) 0;
		border: none;
		border-bottom: 1px solid var(--border-link);
		background: none;
		text-decoration: none;
		text-align: left;
		color: inherit;
		width: 100%;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.sheet-card:last-child { border-bottom: none; }
	.sheet-card:hover { opacity: var(--opacity-hover-card); }

	.card-thumb {
		width: 64px;
		height: 64px;
		object-fit: cover;
		border-radius: var(--radius-input);
		flex-shrink: 0;
	}

	.card-content { flex: 1; min-width: 0; }

	.card-title {
		font-size: var(--text-md);
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 var(--space-1);
		line-height: 1.3;
	}

	.card-snippet {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin: 0 0 var(--space-1);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-meta {
		display: flex;
		gap: var(--space-2);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.meta-date {
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
	}

	.meta-author.anonymised {
		filter: blur(4px);
		user-select: none;
	}

	@media (min-width: 769px) {
		.sheet {
			bottom: 0;
			border-radius: var(--radius-card) var(--radius-card) 0 0;
			max-width: 680px;
			max-height: 60vh;
		}
	}
</style>
