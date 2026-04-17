<script lang="ts">
	import { copy } from '$lib/copy';
	import type { LocationRef } from '$lib/domain/types';

	/**
	 * Shared meeting context card. One component, four states:
	 *
	 *   scheduled  — upcoming (green tint)
	 *   past       — already took place (neutral record tint, italic detail line)
	 *   cancelled  — one party called it off (no fill, faded border, date strikethrough)
	 *   invited    — invitation sent, not yet accepted (no fill, dashed border)
	 *
	 * State is derived from props: if `invitedPending` is set, state is "invited";
	 * else if cancelledByMe/cancelledByUsername is set, state is "cancelled"; else
	 * scheduledTime is compared against now (+ duration) to distinguish past from
	 * scheduled. Callers don't pass state directly — props describe the facts,
	 * this card decides how to render them.
	 */
	interface Props {
		partnerUsername: string;
		scheduledTime: string; // ISO 8601
		durationMinutes: number;
		generalArea?: string | null;
		exactLocation?: LocationRef | null;
		/** Force cancelled rendering even without attribution (e.g. when the
		 *  cancellation_record is missing). Otherwise cancelled is inferred
		 *  from cancelledByMe / cancelledByUsername being set. */
		cancelled?: boolean;
		/** Username of whoever cancelled. Null when attribution is unknown. */
		cancelledByUsername?: string | null;
		/** True when the viewer is the canceller — render "You cancelled…". */
		cancelledByMe?: boolean;
		/** The reason the canceller gave, if any. Rendered quietly under the card. */
		cancellationReason?: string | null;
		/** Invitation sent but not yet accepted. Renders the dashed/empty state. */
		invitedPending?: boolean;
		/** When set on an invitedPending card, shows a withdraw button inside the
		 *  card. Design principle: withdrawing a pending invite is a free action. */
		onWithdraw?: () => void;
		/** Disable the withdraw button while the request is in flight. */
		withdrawing?: boolean;
		/** Parent already says "Meeting with @x" — skip the duplicate label. */
		hideLabel?: boolean;
	}

	let {
		partnerUsername,
		scheduledTime,
		durationMinutes,
		generalArea = null,
		exactLocation = null,
		cancelled = false,
		cancelledByUsername = null,
		cancelledByMe = false,
		cancellationReason = null,
		invitedPending = false,
		onWithdraw,
		withdrawing = false,
		hideLabel = false
	}: Props = $props();

	const isCancelled = $derived(cancelled || cancelledByMe || !!cancelledByUsername);
	const isPast = $derived.by(() => {
		if (invitedPending || isCancelled) return false;
		const endMs = new Date(scheduledTime).getTime() + durationMinutes * 60_000;
		return endMs < Date.now();
	});
	const state = $derived(
		invitedPending ? 'invited' : isCancelled ? 'cancelled' : isPast ? 'past' : 'scheduled'
	);

	const labelText = $derived(
		state === 'past'
			? copy.conversation.youMet(partnerUsername)
			: state === 'invited'
				? copy.conversation.invitationPending(partnerUsername)
				: copy.profile.meetingWith(partnerUsername)
	);

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}
	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<div class="meeting-inline" class:state-past={state === 'past'} class:state-cancelled={state === 'cancelled'} class:state-invited={state === 'invited'}>
	{#if !hideLabel}
		<span class="meeting-inline-label">{labelText}</span>
	{/if}
	<span class="meeting-inline-detail">
		{formatDate(scheduledTime)} · {formatTime(scheduledTime)} · {durationMinutes} {copy.meeting.minutes}
	</span>
	{#if generalArea || (state === 'invited' && onWithdraw)}
		<div class="meeting-inline-area-row">
			{#if generalArea}
				<span class="meeting-inline-area">{generalArea}</span>
			{/if}
			{#if state === 'invited' && onWithdraw}
				<button
					class="meeting-inline-withdraw"
					onclick={onWithdraw}
					disabled={withdrawing}
				>
					{withdrawing ? copy.conversation.withdrawing : copy.conversation.withdrawInvitation}
				</button>
			{/if}
		</div>
	{/if}
	{#if exactLocation && state !== 'invited'}
		<span class="meeting-inline-location">{exactLocation.name}</span>
		<span class="meeting-inline-address">{exactLocation.address}</span>
	{/if}
	{#if isCancelled}
		<span class="meeting-inline-status cancelled">
			{#if cancelledByMe}
				{copy.profile.meetingCancelledByYou}
			{:else if cancelledByUsername}
				{copy.profile.meetingCancelledBy(cancelledByUsername)}
			{:else}
				{copy.profile.meetingCancelled}
			{/if}
		</span>
		{#if cancellationReason}
			<blockquote class="meeting-inline-reason">{cancellationReason}</blockquote>
		{/if}
	{/if}
</div>

<style>
	/* Base layout + scheduled treatment live in shared.css .meeting-inline.
	 * The state modifiers below override the fill/border to encode the state. */

	.meeting-inline.state-past {
		background: var(--bg-meeting-past);
		border: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
	}
	.meeting-inline.state-past .meeting-inline-detail {
		font-style: italic;
	}

	.meeting-inline.state-cancelled {
		background: transparent;
		border: 1px solid color-mix(in srgb, var(--text-primary) 12%, transparent);
		color: var(--text-muted);
	}
	.meeting-inline.state-cancelled .meeting-inline-status {
		font-style: italic;
	}
	.meeting-inline-reason {
		display: block;
		font-size: var(--text-sm);
		font-style: italic;
		color: var(--text-secondary);
		line-height: var(--leading-relaxed);
		margin: var(--space-2) 0 0;
		padding: 0;
		border: none;
	}

	.meeting-inline.state-invited {
		background: transparent;
		border: 1px dashed var(--border-meeting-pending);
	}
	.meeting-inline.state-invited .meeting-inline-label {
		color: var(--text-muted);
		font-weight: 400;
		font-style: italic;
	}

	/* Area row: neighbourhood on the left, optional withdraw button on the right. */
	.meeting-inline-area-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.meeting-inline-withdraw {
		flex-shrink: 0;
		font-family: inherit;
		font-size: var(--text-xs);
		color: var(--text-muted);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-style: dotted;
	}
	.meeting-inline-withdraw:hover { color: var(--text-primary); }
	.meeting-inline-withdraw:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }
</style>
