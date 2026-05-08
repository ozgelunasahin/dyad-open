<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { PromptSummary } from '$lib/domain/types';
	import ConversationCard from './ConversationCard.svelte';

	interface Props {
		prompts: PromptSummary[];
		onCardClick?: (promptId: string) => void;
		onClose?: () => void;
		hideAuthor?: boolean;
		navClearance?: boolean;
	}

	let { prompts, onCardClick, onClose, hideAuthor = false, navClearance = true }: Props = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

{#if onClose}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sheet-backdrop" onclick={onClose} transition:fly={{ y: 0, duration: 200 }}></div>
{/if}
<div
	class="sheet"
	class:no-nav={!navClearance}
	transition:fly={{ y: 160, duration: 480, opacity: 0 }}
>
	{#if onClose}
		<button class="sheet-close" onclick={onClose} aria-label="Close">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			</svg>
		</button>
	{/if}
	<div class="sheet-body">
		{#each prompts as prompt}
			<ConversationCard
				variant="compact"
				title={prompt.title ?? 'Untitled'}
				coverUrl={prompt.cover_image_url}
				snippet={prompt.body_snippet}
				metaLeft={prompt.soonest_slot ? formatDate(prompt.soonest_slot) : null}
				authorUsername={prompt.author_username}
				anonymiseAuthor={hideAuthor}
				audienceScopeName={prompt.audience_scope_name}
				href={onCardClick ? undefined : `/conversations/${prompt.id}`}
				onclick={onCardClick ? () => onCardClick(prompt.id) : undefined}
			/>
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
		max-height: 60vh;
		overflow-y: auto;
		padding: var(--space-5);
		padding-bottom: var(--nav-clearance);
	}

	.sheet.no-nav {
		padding-bottom: var(--space-5);
		box-sizing: border-box;
		z-index: 600;
	}

	.sheet-backdrop {
		position: fixed;
		inset: 0;
		z-index: 599;
	}

	.sheet-close {
		position: absolute;
		top: var(--space-3);
		right: var(--space-3);
		width: 32px;
		height: 32px;
		border: none;
		background: var(--bg-control);
		border-radius: 50%;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}
	.sheet-close:hover {
		background: var(--bg-control-hover);
	}

	.sheet-body {
		display: flex;
		flex-direction: column;
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
