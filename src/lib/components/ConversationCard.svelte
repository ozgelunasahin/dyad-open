<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Unified card for a conversation preview. One component used across:
	 *
	 * - Landing + discover feed (`variant="full"`, default) — 88x96 thumb,
	 *   meta row above title (neighbourhood · date), 3-line snippet.
	 * - Profile conversation list (`variant="profile"`) — 72x72 thumb, title
	 *   + status pill, optional `meeting` slot underneath for MeetingCard.
	 * - Map BottomSheet (`variant="compact"`) — 64x64 thumb, title + snippet
	 *   + author, no meta row.
	 *
	 * Visual spec: see `docs/design/design-system.md` → "ConversationCard".
	 */
	interface Props {
		title: string;
		coverUrl?: string | null;
		href?: string;
		onclick?: () => void;
		snippet?: string | null;
		/** Meta row (above title in full, replaces title underline in profile). */
		metaLeft?: string | null;
		metaRight?: string | null;
		/** Profile variant: shows author attribution under the title. */
		authorUsername?: string | null;
		/** If true, masks the username with bullets (landing page anonymisation). */
		anonymiseAuthor?: boolean;
		/** Profile variant: muted, monospace uppercase status pill under the title. */
		status?: 'draft' | 'published' | 'responded' | 'archived' | null;
		/** Muted the whole card — drafts, archived, expired items. */
		dimmed?: boolean;
		variant?: 'full' | 'profile' | 'compact';
		/** Slot for nested content below the row (e.g. MeetingCard). */
		children?: Snippet;
	}

	let {
		title,
		coverUrl = null,
		href,
		onclick,
		snippet = null,
		metaLeft = null,
		metaRight = null,
		authorUsername = null,
		anonymiseAuthor = false,
		status = null,
		dimmed = false,
		variant = 'full',
		children
	}: Props = $props();

	const displayedAuthor = $derived(
		authorUsername == null
			? null
			: anonymiseAuthor
				? authorUsername.replace(/./g, '•')
				: authorUsername
	);

	const statusLabel = $derived(
		status === 'draft'
			? 'Draft'
			: status === 'archived'
				? 'Archived'
				: status === 'responded'
					? 'Responded'
					: status === 'published'
						? 'Published'
						: null
	);
</script>

{#snippet inner()}
	<div class="row" class:profile={variant === 'profile'} class:compact={variant === 'compact'}>
		<div class="thumb" class:profile={variant === 'profile'} class:compact={variant === 'compact'}>
			{#if coverUrl}
				<img src={coverUrl} alt="" class="thumb-img" loading="lazy" />
			{:else}
				<div class="thumb-placeholder"></div>
			{/if}
		</div>
		<div class="body">
			{#if variant === 'full' && (metaLeft || metaRight)}
				<div class="meta-row">
					{#if metaLeft}<span class="meta-left">{metaLeft}</span>{/if}
					{#if metaRight}<span class="meta-right">{metaRight}</span>{/if}
				</div>
			{/if}
			<h3 class="title">{title}</h3>
			{#if statusLabel}
				<span class="status">{statusLabel}</span>
			{/if}
			{#if snippet}
				<p class="snippet" class:compact={variant === 'compact'}>{snippet}</p>
			{/if}
			{#if variant === 'compact' && (metaLeft || displayedAuthor)}
				<div class="compact-meta">
					{#if metaLeft}<span class="meta-left">{metaLeft}</span>{/if}
					{#if displayedAuthor}
						<span class="meta-author" class:anonymised={anonymiseAuthor}>@{displayedAuthor}</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	{#if children}
		{@render children()}
	{/if}
{/snippet}

{#if href}
	<a {href} class="card" class:dimmed class:profile={variant === 'profile'}>
		{@render inner()}
	</a>
{:else if onclick}
	<button type="button" class="card" class:dimmed class:profile={variant === 'profile'} {onclick}>
		{@render inner()}
	</button>
{:else}
	<div class="card" class:dimmed class:profile={variant === 'profile'}>
		{@render inner()}
	</div>
{/if}

<style>
	.card {
		display: block;
		width: 100%;
		text-decoration: none;
		color: inherit;
		background: none;
		border: none;
		text-align: left;
		padding: 0;
		cursor: pointer;
		font: inherit;
		transition: opacity 0.15s;
	}
	.card.profile {
		border-bottom: 1px solid var(--border-link);
	}
	.card.profile:last-child { border-bottom: none; }
	a.card:hover,
	button.card:hover { opacity: var(--opacity-hover-card); }
	.card.dimmed { opacity: var(--opacity-hover-card); }
	.card.dimmed:hover { opacity: 1; }

	.row {
		display: flex;
		gap: var(--space-5);
		padding: var(--space-6) var(--space-5);
		align-items: stretch;
	}
	.row.profile {
		gap: var(--space-4);
		padding: var(--space-4) 0;
	}
	.row.compact {
		gap: var(--space-3);
		padding: var(--space-3) 0;
		align-items: flex-start;
	}

	.thumb {
		width: 88px;
		min-height: 96px;
		flex-shrink: 0;
		border-radius: var(--radius-input);
		overflow: hidden;
		position: relative;
	}
	.thumb.profile {
		width: 72px;
		min-height: 72px;
	}
	.thumb.compact {
		width: 64px;
		min-height: 64px;
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

	.body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }

	.meta-row {
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
		margin-bottom: var(--space-1);
	}

	.meta-left,
	.meta-right {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.meta-right {
		margin-left: auto;
	}

	.title {
		font-size: var(--text-lg);
		font-weight: 500;
		margin: 0 0 var(--space-1);
		line-height: var(--leading-tight);
	}

	.row.profile .title {
		font-size: var(--text-md);
	}

	.status {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
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
	.snippet.compact {
		font-size: var(--text-sm);
		color: var(--text-muted);
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.compact-meta {
		display: flex;
		gap: var(--space-2);
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin-top: var(--space-1);
	}

	.meta-author {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.meta-author.anonymised {
		filter: blur(4px);
		user-select: none;
	}
</style>
