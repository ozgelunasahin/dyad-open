<script lang="ts">
	// Overlapping-circle avatar stack (original treatment by ozge). Restored for
	// the author's "Times you offered" cards: each circle is who's joining that
	// slot and links to that pair's meeting. No popover/heading here — the slot
	// card provides the context, and tap/hover reveals the name natively.
	export interface StackParticipant {
		/** Stable key for the row (the meeting id works). */
		id: string;
		/** Username — initial shown in the circle, full name on hover/focus. */
		name: string;
		/** Where the circle leads (the meeting detail page). */
		href: string;
	}

	interface Props {
		participants: StackParticipant[];
		maxVisible?: number;
	}

	let { participants, maxVisible = 6 }: Props = $props();

	// svelte-ignore state_referenced_locally — maxVisible is a static layout prop, not reactive
	const MAX_SHOWN = maxVisible;

	let visible = $derived(participants.slice(0, MAX_SHOWN));
	let overflow = $derived(Math.max(0, participants.length - MAX_SHOWN));

	// Warm, desaturated palette — feels like handmade paper, not brand swatches.
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

	// Hash by name so a member keeps the same colour wherever they appear.
	function avatarBg(name: string): string {
		let h = 0;
		for (let i = 0; i < name.length; i++) {
			h = name.charCodeAt(i) + ((h << 5) - h);
		}
		return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
	}

	function initials(name: string): string {
		return name[0]?.toUpperCase() ?? '?';
	}
</script>

<div class="avatar-row" role="list">
	{#each visible as p, i (p.id)}
		<a
			class="participant-avatar"
			role="listitem"
			href={p.href}
			title="@{p.name}"
			aria-label="@{p.name}"
			style="--avatar-bg: {avatarBg(p.name)}; --stagger: {i * 60}ms; z-index: {MAX_SHOWN - i};"
		>
			<span class="avatar-initials" aria-hidden="true">{initials(p.name)}</span>
		</a>
	{/each}

	{#if overflow > 0}
		<div
			class="avatar-overflow"
			style="z-index: 0; --stagger: {visible.length * 60}ms;"
			aria-label="{overflow} more joining"
		>
			<span>+{overflow}</span>
		</div>
	{/if}
</div>

<style>
	.avatar-row {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.participant-avatar {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--avatar-bg);
		outline: 2px solid var(--bg-canvas);
		outline-offset: 0;
		text-decoration: none;
		/* Overlap: each avatar slides 10px under the previous */
		margin-left: -10px;
		animation: avatar-appear var(--duration-slow) var(--ease-ink) both;
		animation-delay: var(--stagger);
		transition:
			transform var(--duration-fast) var(--ease-ink),
			opacity var(--duration-fast) var(--ease-ink);
	}

	.participant-avatar:first-child {
		margin-left: 0;
	}

	.participant-avatar:hover {
		transform: translateY(-2px);
		opacity: var(--opacity-hover-btn);
	}

	.participant-avatar:focus-visible {
		outline: 2px solid var(--text-muted);
		outline-offset: 2px;
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
</style>
