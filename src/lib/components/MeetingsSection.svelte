<script lang="ts">
	import { onMount } from 'svelte';

	interface Meeting {
		id: string;
		canvas_id: string;
		inviter_id: string;
		invitee_id: string;
		inviter_username: string;
		invitee_username: string;
		canvas_name: string;
		canvas_slug: string;
		location: string | null;
		proposed_time: string | null;
		message: string | null;
		status: 'pending' | 'accepted' | 'declined';
		created_at: string;
		updated_at: string;
	}

	let { currentUserId }: { currentUserId: string } = $props();

	let meetings = $state<Meeting[]>([]);
	let loading = $state(true);
	let responding = $state<string | null>(null);

	onMount(async () => {
		try {
			const res = await fetch('/api/meetings');
			if (res.ok) {
				meetings = await res.json();
			}
		} finally {
			loading = false;
		}
	});

	async function respond(meetingId: string, status: 'accepted' | 'declined') {
		responding = meetingId;
		try {
			const res = await fetch('/api/meetings', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: meetingId, status })
			});

			if (res.ok) {
				// Refetch meetings to get any newly revealed location
				const refreshRes = await fetch('/api/meetings');
				if (refreshRes.ok) {
					meetings = await refreshRes.json();
				} else {
					meetings = meetings.map((m) =>
						m.id === meetingId ? { ...m, status } : m
					);
				}
			}
		} finally {
			responding = null;
		}
	}

	function formatDate(dateStr: string): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric'
		}).format(new Date(dateStr));
	}

	let pendingMeetings = $derived(meetings.filter((m) => m.status === 'pending'));
	let acceptedMeetings = $derived(meetings.filter((m) => m.status === 'accepted'));
	let declinedMeetings = $derived(meetings.filter((m) => m.status === 'declined'));
</script>

{#if loading}
	<p class="loading-text">Loading meetings...</p>
{:else if meetings.length === 0}
	<div class="empty-state">
		<p>No meeting invitations yet. Comment on a conversation to unlock meeting invites.</p>
	</div>
{:else}
	{#if pendingMeetings.length > 0}
		<div class="meeting-group">
			<h3 class="group-label">Pending</h3>
			{#each pendingMeetings as meeting (meeting.id)}
				{@const isInvitee = meeting.invitee_id === currentUserId}
				<div class="meeting-card pending">
					<div class="meeting-header">
						<span class="meeting-with">
							{isInvitee ? `From @${meeting.inviter_username}` : `To @${meeting.invitee_username}`}
						</span>
						<span class="meeting-date">{formatDate(meeting.created_at)}</span>
					</div>
					<p class="meeting-canvas">Re: {meeting.canvas_name}</p>
					{#if meeting.proposed_time}
						<p class="meeting-detail">Time: {meeting.proposed_time}</p>
					{/if}
					{#if meeting.message}
						<p class="meeting-message">{meeting.message}</p>
					{/if}
					{#if isInvitee}
						<div class="meeting-actions">
							<button
								class="accept-btn"
								onclick={() => respond(meeting.id, 'accepted')}
								disabled={responding === meeting.id}
							>
								Accept
							</button>
							<button
								class="decline-btn"
								onclick={() => respond(meeting.id, 'declined')}
								disabled={responding === meeting.id}
							>
								Decline
							</button>
						</div>
					{:else}
						<p class="meeting-status-text">Waiting for response...</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if acceptedMeetings.length > 0}
		<div class="meeting-group">
			<h3 class="group-label">Confirmed</h3>
			{#each acceptedMeetings as meeting (meeting.id)}
				{@const isInvitee = meeting.invitee_id === currentUserId}
				<div class="meeting-card confirmed">
					<div class="meeting-header">
						<span class="meeting-with">
							With @{isInvitee ? meeting.inviter_username : meeting.invitee_username}
						</span>
						<span class="confirmed-badge">Confirmed</span>
					</div>
					<p class="meeting-canvas">Re: {meeting.canvas_name}</p>
					{#if meeting.location}
						<p class="meeting-detail">Location: {meeting.location}</p>
					{/if}
					{#if meeting.proposed_time}
						<p class="meeting-detail">Time: {meeting.proposed_time}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if declinedMeetings.length > 0}
		<div class="meeting-group">
			<h3 class="group-label">Declined</h3>
			{#each declinedMeetings as meeting (meeting.id)}
				{@const isInvitee = meeting.invitee_id === currentUserId}
				<div class="meeting-card declined">
					<div class="meeting-header">
						<span class="meeting-with">
							{isInvitee ? `From @${meeting.inviter_username}` : `To @${meeting.invitee_username}`}
						</span>
						<span class="declined-badge">Declined</span>
					</div>
					<p class="meeting-canvas">Re: {meeting.canvas_name}</p>
				</div>
			{/each}
		</div>
	{/if}
{/if}

<style>
	.loading-text {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--text-muted);
	}

	.empty-state p {
		margin: 0.5rem 0;
		font-size: 0.9rem;
	}

	.meeting-group {
		margin-bottom: 1.5rem;
	}

	.group-label {
		font-size: 0.85rem;
		font-weight: normal;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.75rem;
	}

	.meeting-card {
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 8px;
		padding: 1.25rem;
		margin-bottom: 0.75rem;
	}

	.meeting-card.confirmed {
		border-color: rgba(40, 167, 69, 0.3);
	}

	.meeting-card.declined {
		opacity: 0.6;
	}

	.meeting-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.meeting-with {
		font-size: 0.95rem;
		color: var(--text-primary);
	}

	.meeting-date {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.confirmed-badge {
		background: rgba(40, 167, 69, 0.15);
		color: #28a745;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
	}

	.declined-badge {
		background: var(--bg-control);
		color: var(--text-muted);
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
	}

	.meeting-canvas {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.meeting-detail {
		margin: 0.25rem 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.meeting-message {
		margin: 0.5rem 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
		font-style: italic;
		line-height: 1.5;
	}

	.meeting-status-text {
		margin: 0.5rem 0 0;
		font-size: 0.85rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.meeting-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.accept-btn {
		padding: 0.4rem 0.75rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.accept-btn:hover:not(:disabled) {
		opacity: 0.85;
	}

	.decline-btn {
		padding: 0.4rem 0.75rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		color: var(--text-secondary);
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.2s;
	}

	.decline-btn:hover:not(:disabled) {
		border-color: #dc3545;
		color: #dc3545;
	}

	.accept-btn:disabled,
	.decline-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
