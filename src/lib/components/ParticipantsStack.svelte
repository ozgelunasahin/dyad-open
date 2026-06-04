<script lang="ts">
	import { copy } from '$lib/copy';
	// Overlapping-circle avatar stack (original treatment by ozge). One stack,
	// two pin modes decided by the data the viewer's RLS could load:
	//   identified — name + initial, hover handle, optional link to a meeting
	//                (what the author sees: who's joining their time);
	//   anonymised — neutral circles derived from a bare count (what an attendee
	//                sees of someone else's gathering: how many, never who),
	//                with the viewer's own seat shown as their identified pin.
	// No heading here — the surrounding card provides the context.
	export interface StackParticipant {
		/** Stable key for the row (a meeting id works). */
		id: string;
		/** Username — initial shown in the circle, full name on hover/focus. */
		name: string;
		/** Optional link target (e.g. the meeting detail page). */
		href?: string;
		/** The viewer's own pin — handle reads "me" instead of the username. */
		isSelf?: boolean;
	}

	interface Props {
		/** Identified pins — only ever passed when RLS yielded identities. */
		participants?: StackParticipant[];
		/** The viewer's own seat, rendered as their identified (non-link) pin. */
		self?: { name: string } | null;
		/** Anonymised seats beyond the identified ones — count only, no identity. */
		anonymousCount?: number;
		maxVisible?: number;
	}

	let { participants = [], self = null, anonymousCount = 0, maxVisible = 6 }: Props = $props();

	// svelte-ignore state_referenced_locally — maxVisible is a static layout prop, not reactive
	const MAX_SHOWN = maxVisible;

	// Identified pins fill first — the viewer's own pin leftmost, then the named
	// others; anonymous circles take whatever room remains; everything else
	// folds into the "+N" overflow.
	let identified = $derived(
		self ? [{ id: 'self', name: self.name, isSelf: true }, ...participants] : participants
	);
	let visible = $derived(identified.slice(0, MAX_SHOWN));
	let anonShown = $derived(Math.min(anonymousCount, Math.max(0, MAX_SHOWN - visible.length)));
	let overflow = $derived(identified.length + anonymousCount - visible.length - anonShown);

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

<div
	class="avatar-row"
	role="list"
	aria-label={self
		? `you and ${identified.length + anonymousCount - 1} other${identified.length + anonymousCount - 1 === 1 ? '' : 's'} joining`
		: `${identified.length + anonymousCount} joining`}
>
	{#each visible as p, i (p.id)}
		<!-- The self pin's circle says "you"; its hover handle shows the member's
		     own @handle (the one piece of identity the circle no longer carries). -->
		{@const handle = `@${p.name}`}
		{#if p.href}
			<a
				class="participant-avatar"
				role="listitem"
				href={p.href}
				aria-label={handle}
				style="--avatar-bg: {avatarBg(p.name)}; --stagger: {i * 60}ms; z-index: {visible.length + anonShown - i};"
			>
				<span class="avatar-initials" class:avatar-initials--you={p.isSelf} aria-hidden="true">{p.isSelf ? copy.common.you : initials(p.name)}</span>
				<span class="participant-card" role="tooltip" aria-hidden="true">{handle}</span>
			</a>
		{:else}
			<span
				class="participant-avatar"
				role="listitem"
				aria-label={handle}
				style="--avatar-bg: {avatarBg(p.name)}; --stagger: {i * 60}ms; z-index: {visible.length + anonShown - i};"
			>
				<span class="avatar-initials" class:avatar-initials--you={p.isSelf} aria-hidden="true">{p.isSelf ? copy.common.you : initials(p.name)}</span>
				<span class="participant-card" role="tooltip" aria-hidden="true">{handle}</span>
			</span>
		{/if}
	{/each}

	<!-- Anonymised seats: how many, never who. One shared hover handle for the
	     whole group — the circles are interchangeable, so sweeping across them
	     answers the count once instead of re-opening per circle. -->
	{#if anonShown > 0}
		<span class="anon-group" aria-hidden="true">
			{#each Array(anonShown) as _, j (j)}
				<span
					class="participant-avatar participant-avatar--anon"
					style="--stagger: {(visible.length + j) * 60}ms; z-index: {anonShown - j};"
				></span>
			{/each}
			<span class="participant-card" role="tooltip">{copy.common.nOthers(anonymousCount)}</span>
		</span>
	{/if}

	{#if overflow > 0}
		<div
			class="avatar-overflow"
			style="z-index: 0; --stagger: {(visible.length + anonShown) * 60}ms;"
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

	.participant-avatar:hover,
	.participant-avatar:focus-visible {
		transform: translateY(-2px);
		opacity: var(--opacity-hover-btn);
		/* Lift above neighbouring circles so the handle card isn't clipped. */
		z-index: 50;
	}

	.participant-avatar:focus-visible {
		outline: 2px solid var(--text-muted);
		outline-offset: 2px;
	}

	/* Hover/focus handle display — the original glass card, shown without a
	   click since the circle itself now navigates to the meeting. */
	.participant-card {
		display: none;
		position: absolute;
		bottom: calc(100% + var(--space-2));
		left: 50%;
		transform: translateX(-50%);
		background: var(--bg-glass);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-card);
		padding: var(--space-2) var(--space-3);
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-primary);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
		z-index: 100;
		pointer-events: none;
	}

	.participant-avatar:hover .participant-card,
	.participant-avatar:focus-visible .participant-card {
		display: block;
		animation: card-appear 150ms var(--ease-ink) both;
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

	/* The viewer's own pin says "you" in place of an initial — smaller so the
	   word sits comfortably in the circle. */
	.avatar-initials--you {
		font-size: 0.5625rem; /* 9px — below the token scale; fits the 36px pin */
		letter-spacing: 0.02em;
	}

	/* Anonymised seat — neutral fill, no initial. Opaque (mixed onto canvas) —
	   a translucent fill would double up where the overlapping circles
	   intersect. No cursor override: the cursor follows context, same as the
	   named circles (pointer inside a linked card, arrow otherwise). */
	.participant-avatar--anon {
		background: color-mix(in srgb, var(--text-primary) 6%, var(--bg-canvas));
	}

	/* The anonymous circles act as one unit: a single hover target with one
	   shared handle, so sweeping across them doesn't re-open it per circle. */
	.anon-group {
		position: relative;
		display: flex;
		align-items: center;
	}
	.anon-group > .participant-avatar--anon:first-child {
		margin-left: -10px; /* continue the row's overlap into the group */
	}
	.avatar-row > .anon-group:first-child > .participant-avatar--anon:first-child {
		margin-left: 0;
	}
	/* No z-index lift on hover — the group keeps its place in the row's overlap
	   order (the shared handle paints above pins via its own z-index). */
	.anon-group:hover .participant-avatar--anon {
		transform: translateY(-2px);
	}
	/* The group moves as one — suppress the per-circle hover fade. */
	.participant-avatar--anon:hover {
		opacity: 1;
	}
	.anon-group:hover > .participant-card {
		display: block;
		animation: card-appear 150ms var(--ease-ink) both;
	}

	.avatar-overflow {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		/* Opaque for the same reason as the anon pin — translucent fills
		   double up where overlapping circles intersect. */
		background: color-mix(in srgb, var(--text-primary) 6%, var(--bg-canvas));
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
