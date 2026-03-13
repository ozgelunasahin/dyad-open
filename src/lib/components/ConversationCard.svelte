<script lang="ts">
	import type { ConversationData } from '$lib/types';

	interface Props {
		conversation: ConversationData;
		onopen: () => void;
	}

	let { conversation, onopen }: Props = $props();

	// Strip HTML tags to plain text
	function stripHtml(html: string): string {
		return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
	}

	const plainExcerpt = $derived(stripHtml(conversation.bodyHtml));

	const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	function ordinal(n: number): string {
		if (n >= 11 && n <= 13) return `${n}th`;
		const s = ['th', 'st', 'nd', 'rd'];
		return `${n}${s[n % 10] ?? 'th'}`;
	}

	function formatDate(iso: string): string {
		const d = new Date(iso);
		const month = MONTHS[d.getMonth()];
		const day = ordinal(d.getDate());
		const hh = d.getHours().toString().padStart(2, '0');
		const mm = d.getMinutes().toString().padStart(2, '0');
		return `${month} ${day}, ${hh}:${mm}`;
	}

	const upcomingDates = $derived.by(() => {
		const dates: string[] = [];
		if (conversation.proposed_date_1) dates.push(conversation.proposed_date_1);
		if (conversation.proposed_date_2) dates.push(conversation.proposed_date_2);
		return dates;
	});
</script>

<button class="row" onclick={onopen} type="button">
	<div class="thumb">
		{#if conversation.image_url}
			{#if /\.(mp4|webm|mov)(\?|$)/i.test(conversation.image_url)}
				<video src={conversation.image_url} autoplay loop muted playsinline class="thumb-media"></video>
			{:else}
				<img src={conversation.image_url} alt="" class="thumb-media" />
			{/if}
		{:else}
			<div class="thumb-placeholder"></div>
		{/if}
	</div>

	<div class="body">
		<div class="meta-row">
			{#if conversation.neighborhood}
				<span class="neighborhood">{conversation.neighborhood}</span>
			{/if}

			<div class="dates">
				{#if upcomingDates.length > 0}
					{#each upcomingDates as d}
						<span class="date-item">{formatDate(d)}</span>
					{/each}
				{:else}
					<span class="date-tbd">availability not set</span>
				{/if}
			</div>
		</div>

		<h3 class="title">{conversation.title}</h3>

		{#if plainExcerpt}
			<p class="snippet">{plainExcerpt}</p>
		{/if}
	</div>
</button>

<style>
	.row {
		display: flex;
		gap: 16px;
		padding: 18px 0;
		border: none;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.08));
		width: 100%;
		text-align: left;
		background: none;
		cursor: pointer;
		align-items: flex-start;
		transition: opacity 0.15s;
	}

	.row:hover {
		opacity: 0.72;
	}

	/* Thumbnail */
	.thumb {
		flex-shrink: 0;
		width: 80px;
		height: 80px;
		border-radius: 6px;
		overflow: hidden;
	}

	.thumb-media {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.thumb-placeholder {
		width: 100%;
		height: 100%;
		background: var(--bg-control, rgba(0, 0, 0, 0.05));
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.08));
		border-radius: 6px;
	}

	/* Body */
	.body {
		flex: 1;
		min-width: 0;
	}

	.title {
		margin: 4px 0 5px;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1rem;
		font-weight: normal;
		color: var(--text-primary, #1a1a1a);
		line-height: 1.3;
	}

	/* Neighborhood + dates row */
	.meta-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 5px;
	}

	.neighborhood {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 10px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted, #aaa);
		flex-shrink: 0;
	}

	/* Dates — right-aligned */
	.dates {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 1px;
	}

	.date-item {
		font-family: 'SF Mono', 'Fira Code', Menlo, Consolas, monospace;
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.04em;
		color: var(--control-color, #8b7355);
		white-space: nowrap;
	}

	.date-tbd {
		font-family: 'SF Mono', 'Fira Code', Menlo, Consolas, monospace;
		font-size: 10px;
		letter-spacing: 0.04em;
		color: var(--border-link, rgba(0,0,0,0.2));
		font-style: italic;
	}

	/* Excerpt */
	.snippet {
		margin: 0;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-muted, #888);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
