<script lang="ts">
	export type ConversationMode = 'comfort' | 'stretch' | 'sparring';

	export interface Participant {
		id: string;
		firstName: string;
		conversationMode?: ConversationMode;
		intention?: string | null;
	}

	interface Props {
		participants: Participant[];
		maxVisible?: number;
	}

	let { participants, maxVisible = 6 }: Props = $props();

	// svelte-ignore state_referenced_locally — maxVisible is a static layout prop, not reactive
	const MAX_SHOWN = maxVisible;

	let visible = $derived(participants.slice(0, MAX_SHOWN));
	let overflow = $derived(Math.max(0, participants.length - MAX_SHOWN));

	let headingText = $derived(
		participants.length === 1
			? '1 joining the conversation'
			: `${participants.length} joining the conversation`
	);

	let namesSummary = $derived(buildNamesSummary(participants));

	function buildNamesSummary(ps: Participant[]): string {
		if (ps.length === 0) return '';
		if (ps.length === 1) return ps[0].firstName;
		if (ps.length === 2) return `${ps[0].firstName} and ${ps[1].firstName}`;
		const others = ps.length - 2;
		return `${ps[0].firstName}, ${ps[1].firstName} and ${others} other${others === 1 ? '' : 's'}`;
	}

	// Warm, desaturated palette — feels like handmade paper, not brand swatches
	const AVATAR_PALETTE = [
		'#c9bfb5', // warm stone
		'#b5bfc9', // slate
		'#b5c9be', // sage
		'#c9b5bd', // dusty rose
		'#beb5c9', // lavender
		'#c9c5b5', // straw
		'#b5c4c9', // sky
		'#c9bcb5', // peach
	];

	function avatarBg(id: string): string {
		let h = 0;
		for (let i = 0; i < id.length; i++) {
			h = id.charCodeAt(i) + ((h << 5) - h);
		}
		return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
	}

	const MODE_RING: Record<ConversationMode, string> = {
		comfort: '#7a9e7e',  // muted green
		stretch: '#c9923a',  // amber
		sparring: '#5e6b9e', // indigo
	};

	function ringColor(mode?: ConversationMode): string | null {
		return mode ? MODE_RING[mode] : null;
	}

	function initials(firstName: string): string {
		return firstName[0]?.toUpperCase() ?? '?';
	}

	// Popover state
	let openId = $state<string | null>(null);

	function toggleCard(id: string) {
		openId = openId === id ? null : id;
	}

	function closeAll() {
		openId = null;
	}
</script>

<!-- Close popover on outside click -->
<svelte:window onclick={(e) => {
	const target = e.target as HTMLElement;
	if (!target.closest('.participant-avatar')) closeAll();
}} />

<section class="participants" aria-label={headingText}>
	<p class="participants-heading">{headingText}</p>

	<div class="avatar-row" role="list">
		{#each visible as p, i (p.id)}
			<div
				class="participant-avatar"
				role="listitem"
				style="
					--avatar-bg: {avatarBg(p.id)};
					--ring-color: {ringColor(p.conversationMode) ?? 'transparent'};
					--stagger: {i * 60}ms;
					z-index: {MAX_SHOWN - i};
				"
				aria-label={p.firstName}
			>
				<button
					class="avatar-btn"
					onclick={() => toggleCard(p.id)}
					aria-expanded={openId === p.id}
					aria-haspopup="true"
				>
					<span class="avatar-initials" aria-hidden="true">{initials(p.firstName)}</span>
				</button>

				{#if openId === p.id}
					<div class="participant-card" role="tooltip">
						<p class="card-name">{p.firstName}</p>
						{#if p.intention}
							<p class="card-intention">"{p.intention}"</p>
						{/if}
					</div>
				{/if}
			</div>
		{/each}

		{#if overflow > 0}
			<div
				class="avatar-overflow"
				style="z-index: 0; --stagger: {visible.length * 60}ms;"
				aria-label="{overflow} more participants"
			>
				<span>+{overflow}</span>
			</div>
		{/if}
	</div>

	{#if namesSummary}
		<p class="participants-names">{namesSummary}</p>
	{/if}
</section>

<style>
	.participants {
		margin-bottom: var(--space-8);
	}

	.participants-heading {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0 0 var(--space-3);
		letter-spacing: 0.01em;
	}

	.avatar-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: var(--space-3);
	}

	.participant-avatar {
		position: relative;
		/* Overlap: each avatar slides 10px under the previous */
		margin-left: -10px;
		animation: avatar-appear var(--duration-slow) var(--ease-ink) both;
		animation-delay: var(--stagger);
	}

	/* First avatar has no negative margin */
	.participant-avatar:first-child {
		margin-left: 0;
	}

	@keyframes avatar-appear {
		from {
			opacity: 0;
			transform: scale(0.8) translateY(4px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.avatar-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--avatar-bg);
		border: 2px solid var(--ring-color, transparent);
		outline: 2px solid var(--bg-canvas);
		outline-offset: 0;
		cursor: pointer;
		transition:
			transform var(--duration-fast) var(--ease-ink),
			opacity var(--duration-fast) var(--ease-ink);
		padding: 0;
	}

	.avatar-btn:hover {
		transform: translateY(-2px);
		opacity: var(--opacity-hover-btn);
	}

	.avatar-btn:focus-visible {
		outline: 2px solid var(--text-muted);
		outline-offset: 2px;
	}

	.avatar-initials {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-secondary);
		user-select: none;
		pointer-events: none;
	}

	.avatar-overflow {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--bg-control);
		outline: 2px solid var(--bg-canvas);
		outline-offset: 0;
		margin-left: -10px;
		animation: avatar-appear var(--duration-slow) var(--ease-ink) both;
		animation-delay: var(--stagger);
		flex-shrink: 0;
	}

	.avatar-overflow span {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		user-select: none;
	}

	/* Participant popover card */
	.participant-card {
		position: absolute;
		bottom: calc(100% + var(--space-2));
		left: 50%;
		transform: translateX(-50%);
		background: var(--bg-glass);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-card);
		padding: var(--space-3) var(--space-4);
		min-width: 140px;
		max-width: 220px;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
		animation: card-appear 150ms var(--ease-ink) both;
		z-index: 100;
		pointer-events: none;
	}

	@keyframes card-appear {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.card-name {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 var(--space-1);
	}

	.card-intention {
		font-size: var(--text-xs);
		color: var(--text-muted);
		line-height: var(--leading-relaxed);
		font-style: italic;
		margin: 0;
	}

	.participants-names {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		margin: 0;
		line-height: var(--leading-normal);
	}
</style>
