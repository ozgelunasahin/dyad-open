<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { PromptSummary } from '$lib/domain/types';

	interface Props {
		prompts: PromptSummary[];
		area: string;
		onClose: () => void;
	}

	let { prompts, area, onClose }: Props = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="backdrop" onclick={onClose}>
	<div
		class="sheet"
		onclick={(e) => e.stopPropagation()}
		transition:fly={{ y: 120, duration: 240 }}
	>
		<div class="sheet-header">
			<h3 class="sheet-title">{area}</h3>
			<span class="sheet-count">{prompts.length} conversation{prompts.length !== 1 ? 's' : ''}</span>
			<button class="sheet-close" onclick={onClose} aria-label="Close">&times;</button>
		</div>

		<div class="sheet-body">
			{#each prompts as prompt}
				<a href="/prompts/{prompt.id}" class="sheet-card">
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
							<span class="meta-author">@{prompt.author_username}</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 600;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.sheet {
		background: var(--bg-canvas, #f5f3f0);
		border-radius: 16px 16px 0 0;
		box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.18);
		width: 100%;
		max-width: 480px;
		max-height: 50vh;
		overflow-y: auto;
		padding: 20px;
		box-sizing: border-box;
	}

	.sheet-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 16px;
	}

	.sheet-title {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0;
	}

	.sheet-count {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted, #999);
	}

	.sheet-close {
		margin-left: auto;
		font-size: 20px;
		background: none;
		border: none;
		color: var(--text-muted, #999);
		cursor: pointer;
		padding: 4px;
	}

	.sheet-close:hover { color: var(--text-primary); }

	.sheet-body {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.sheet-card {
		display: flex;
		gap: 12px;
		padding: 12px 0;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.08));
		text-decoration: none;
		color: inherit;
		transition: opacity 0.15s;
	}

	.sheet-card:last-child { border-bottom: none; }
	.sheet-card:hover { opacity: 0.72; }

	.card-thumb {
		width: 64px;
		height: 64px;
		object-fit: cover;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.card-content { flex: 1; min-width: 0; }

	.card-title {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 4px;
		line-height: 1.3;
	}

	.card-snippet {
		font-size: 0.8rem;
		color: var(--text-muted, #666);
		margin: 0 0 6px;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-meta {
		display: flex;
		gap: 8px;
		font-size: 0.7rem;
		color: var(--text-muted, #999);
	}

	.meta-date {
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
	}

	@media (min-width: 768px) {
		.backdrop {
			align-items: flex-end;
			justify-content: flex-end;
			padding: 24px;
		}

		.sheet {
			border-radius: 12px;
			max-width: 400px;
			max-height: 60vh;
		}
	}
</style>
